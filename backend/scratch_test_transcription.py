import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.transcription_service import transcribe_audio
import json

file_path = "storage/26a23244-def0-4ade-aca4-9d352b270988.wav"
if os.path.exists(file_path):
    print(f"Testing transcription for {file_path}...")
    try:
        results = transcribe_audio(file_path)
        print(f"Successfully transcribed. Found {len(results)} segments.")
        print(json.dumps(results[:2], indent=2))
    except Exception as e:
        print(f"Transcription failed: {e}")
else:
    print(f"File {file_path} not found.")
