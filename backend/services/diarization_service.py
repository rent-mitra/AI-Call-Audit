import os
import torch
from torch import device as torch_device
from huggingface_hub import login
from pyannote.audio import Pipeline
from dotenv import load_dotenv, find_dotenv

# Load .env file automatically by searching parent directories
load_dotenv(find_dotenv())

HF_TOKEN = os.getenv("HF_TOKEN")

# Fix for Mac Segfaults: Limit threads and use MPS (Apple Silicon) if available
torch.set_num_threads(1)

if torch.backends.mps.is_available():
    DEVICE = torch_device("mps")
    print("Using Apple Silicon (MPS) for Diarization")
else:
    DEVICE = torch_device("cpu")
    print("Using CPU for Diarization")

pipeline = None
if HF_TOKEN:
    try:
        print("Authenticating with Hugging Face...")
        login(token=HF_TOKEN)

        print(f"Loading pyannote diarization pipeline on {DEVICE}...")
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=HF_TOKEN
        )
        if pipeline is not None:
            pipeline.to(DEVICE)
    except Exception as e:  # noqa: BLE001
        print(f"Failed to load pyannote pipeline: {e}. Check HF_TOKEN.")
else:
    print("WARNING: HF_TOKEN not found. Diarization will be mocked.")


def diarize_audio(file_path: str, num_speakers: int = 2):
    """
    Returns a list of speaker segments.
    """
    if not pipeline:
        # Mock diarization if no token (useful for local dev without a token)
        print("MOCKING DIARIZATION...")
        return [{"start": 0.0, "end": 9999.0, "speaker": "SPEAKER_00"}]

    print(f"Diarizing {file_path} with num_speakers={num_speakers}...")
    diarization = pipeline(file_path, num_speakers=num_speakers)

    speaker_segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        speaker_segments.append({
            "start": turn.start,
            "end": turn.end,
            "speaker": speaker
        })

    return speaker_segments

