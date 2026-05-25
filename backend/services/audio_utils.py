import subprocess
import tempfile
import os

def convert_to_wav(input_path: str) -> str:
    """
    Converts any audio file to a standard WAV format (16kHz, mono) for better compatibility.
    Returns the path to the temporary WAV file.
    """
    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    print(f"Converting {input_path} to standard WAV...")
    try:
        # -y: overwrite, -i: input, -ar: sample rate, -ac: channels
        subprocess.run([
            "ffmpeg", "-y", "-i", input_path, 
            "-ar", "16000", "-ac", "1", 
            temp_wav
        ], check=True, capture_output=True)
        return temp_wav
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg conversion failed: {e.stderr.decode()}")
        # If conversion fails, try to use original file as fallback
        return input_path
