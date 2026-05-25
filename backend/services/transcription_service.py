import os
import subprocess
import tempfile
import json
import re
from faster_whisper import WhisperModel

# Use base model for local testing to save RAM/Time. Switch to 'small' or 'medium' for production.
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
# Use CPU by default, switch to "cuda" if available
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = "int8" if DEVICE == "cpu" else "float16"
INITIAL_PROMPT = os.getenv("WHISPER_INITIAL_PROMPT", "Chirag, customer support, audit, quality assurance")

# Load spelling corrections
SPELLING_CORRECTIONS = {}
corrections_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "spelling_corrections.json")
try:
    if os.path.exists(corrections_path):
        with open(corrections_path, "r", encoding="utf-8") as f:
            SPELLING_CORRECTIONS = json.load(f)
        print(f"Loaded {len(SPELLING_CORRECTIONS)} spelling corrections.")
except Exception as e:
    print(f"Failed to load spelling corrections from {corrections_path}: {e}")

def apply_spelling_corrections(text: str) -> str:
    """Applies case-insensitive spelling corrections with word boundaries."""
    if not SPELLING_CORRECTIONS:
        return text
    for word, correction in SPELLING_CORRECTIONS.items():
        pattern = re.compile(rf"\b{re.escape(word)}\b", re.IGNORECASE)
        text = pattern.sub(correction, text)
    return text

print(f"Loading Whisper model '{MODEL_SIZE}' on {DEVICE}...")
try:
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
except Exception as e:
    print(f"Failed to load Whisper model: {e}")
    model = None

def transcribe_audio(file_path: str):
    """
    Transcribes audio and returns a list of segments with start, end, and text.
    """
    if not model:
        raise RuntimeError("Whisper model not loaded.")

    print(f"Transcribing {file_path}...")
    # Use initial_prompt to improve spelling accuracy, and enable word_timestamps
    segments, info = model.transcribe(file_path, beam_size=5, initial_prompt=INITIAL_PROMPT, word_timestamps=True)

    all_words = []
    for segment in segments:
        if getattr(segment, 'words', None):
            for w in segment.words:
                all_words.append({
                    "start": w.start,
                    "end": w.end,
                    "word": w.word
                })
        else:
            all_words.append({
                "start": segment.start,
                "end": segment.end,
                "word": segment.text
            })
    
    return all_words
