import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

client = None
if AI_PROVIDER == "ollama":
    print(f"Using local OLLAMA as AI Provider (Model: {OLLAMA_MODEL})")
    client = OpenAI(
        base_url="http://localhost:11434/v1",
        api_key="ollama", # placeholder
        timeout=300.0, # 5 minute timeout for local LLM
    )
elif OPENAI_API_KEY:
    print("Using OPENAI as AI Provider")
    client = OpenAI(api_key=OPENAI_API_KEY)
else:
    print("WARNING: No AI Provider configured correctly. AI Evaluation will run in MOCK mode.")

SYSTEM_PROMPT = """
You are an expert Quality Assurance Auditor for customer support calls. 
Your task is to strictly evaluate the provided call transcript against the QA Checklist.

Rules:
1. Rely ONLY on the explicit evidence found in the transcript. Do not paraphrase, summarize, or hallucinate. The "evidence" field MUST be a verbatim, word-for-word copy-pasted quote from the transcript.
2. IMPORTANT: Be highly lenient and forgiving of poor grammar, broken language, accents, and transcription spelling errors. Focus on the INTENT and MEANING of what the agent or customer is trying to say, rather than the exact literal wording.
3. For each parameter, determine the status: "Passed", "Failed", or "Needs Review" (if the transcript is unclear).
4. If a parameter is failed, marks_obtained MUST be 0. If Passed, it should equal the max marks of that parameter.
5. The "evidence" field MUST contain an exact verbatim quote (word-for-word substring) copied directly from the transcript. Under no circumstances should you paraphrase, summarize, clean up grammar, or make up quotes. If the parameter failed due to omission, state "No evidence found".
6. Read and analyze the entire transcript. Do not make a decision based only on the beginning of the call or a single word match. Ensure you scan the entire dialogue to find the exact place where the checklist parameter is actually addressed, satisfied, or discussed, and quote that specific section.
7. Provide a brief explanation in "feedback".

You must output a strictly valid JSON object matching this schema exactly.
{
  "call_id": "<call_id_from_input>",
  "results": [
    {
      "parameter": "<category>",
      "status": "Passed|Failed|Needs Review",
      "marks_obtained": <number>,
      "evidence": "<exact verbatim quote>",
      "feedback": "<brief reasoning>"
    }
  ],
  "ai_feedback": "<1-2 sentences overall summary>"
}
"""

def evaluate_call(call_id: str, transcript_text: str, qa_parameters: list) -> dict:
    """
    Sends the transcript and QA parameters to the LLM for evaluation.
    Returns the parsed JSON dictionary.
    """
    
    # Prepare the payload for the LLM
    qa_checklist_json = json.dumps([
        {
            "category": p.category, 
            "question": p.question, 
            "mandatory": p.mandatory, 
            "marks": p.marks
        } for p in qa_parameters
    ], indent=2)
    
    user_prompt = f"""
    Call ID: {call_id}
    
    QA Checklist:
    {qa_checklist_json}
    
    Transcript:
    {transcript_text}
    """

    if not client:
        # Mock mode
        print(f"MOCKING AI EVALUATION for call_id: {call_id}")
        mock_results = []
        for p in qa_parameters:
            mock_results.append({
                "parameter": p.category,
                "status": "Passed",
                "marks_obtained": p.marks,
                "evidence": "[MOCK] Agent said something appropriate.",
                "feedback": "[MOCK] Passed parameter."
            })
        return {
            "call_id": call_id,
            "results": mock_results,
            "ai_feedback": "[MOCK] Overall a good call."
        }

    # Real AI call
    model_name = OLLAMA_MODEL if AI_PROVIDER == "ollama" else "gpt-4o-mini"
    print(f"Sending Call {call_id} to {AI_PROVIDER.upper()} for evaluation...")
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        response_format={ "type": "json_object" },
        temperature=0.0 # strict adherence
    )

    try:
        result_json = json.loads(response.choices[0].message.content)
        return result_json
    except Exception as e:
        print(f"Failed to parse LLM JSON: {e}")
        raise ValueError("LLM returned invalid JSON structure.")


def identify_speaker_roles(transcript: list) -> dict:
    """
    Analyzes the first few turns of a transcript to map raw speaker IDs (e.g., SPEAKER_00)
    to roles ('Agent' and 'Customer').
    """
    if not client:
        # Mock mode fallback
        return {"SPEAKER_00": "Agent", "SPEAKER_01": "Customer"}

    # Take the first 8 dialogue turns to identify roles
    sample_text = ""
    for entry in transcript[:8]:
        sample_text += f"{entry['speaker']}: {entry['text']}\n"

    system_prompt = (
        "You are an assistant that analyzes customer service call transcripts.\n"
        "Your task is to identify which raw speaker ID represents the 'Agent' "
        "(the support representative greeting or helping the customer) "
        "and which represents the 'Customer' (the person calling in with a problem).\n"
        "Return a strictly valid JSON object in this format:\n"
        '{"agent": "<speaker_id>", "customer": "<speaker_id>"}'
    )

    try:
        model_name = OLLAMA_MODEL if AI_PROVIDER == "ollama" else "gpt-4o-mini"
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the dialogue sample:\n{sample_text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        result = json.loads(response.choices[0].message.content)
        
        # Build the mapping
        mapping = {}
        if "agent" in result:
            mapping[result["agent"]] = "Agent"
        if "customer" in result:
            mapping[result["customer"]] = "Customer"
        
        return mapping
    except Exception as e:
        print(f"Error identifying speaker roles: {e}")
        # Default safe fallback
        return {"SPEAKER_00": "Agent", "SPEAKER_01": "Customer"}

