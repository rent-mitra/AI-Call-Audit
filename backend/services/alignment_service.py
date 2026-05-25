import os
import sys

# Ensure we can import transcription_service
from services.transcription_service import apply_spelling_corrections

def align_transcript_and_speakers(words, speaker_segments):
    """
    Merges transcription words with speaker diarization based on overlapping timestamps.
    Builds segments dynamically by grouping consecutive words by the same speaker.
    """
    final_transcript = []
    
    current_speaker = None
    current_text = []
    current_start = None
    current_end = None
    
    for w in words:
        w_start = w["start"]
        w_end = w["end"]
        w_word = w["word"]
        w_mid = (w_start + w_end) / 2.0
        
        assigned_speaker = None
        # 1. Try to find exact overlap first
        for s_seg in speaker_segments:
            if s_seg["start"] <= w_mid <= s_seg["end"]:
                assigned_speaker = s_seg["speaker"]
                break
                
        # 2. If no exact overlap, find the closest speaker segment in time
        if not assigned_speaker and speaker_segments:
            min_dist = float('inf')
            closest_spk = "UNKNOWN"
            for s_seg in speaker_segments:
                if w_mid < s_seg["start"]:
                    dist = s_seg["start"] - w_mid
                elif w_mid > s_seg["end"]:
                    dist = w_mid - s_seg["end"]
                else:
                    dist = 0
                
                if dist < min_dist:
                    min_dist = dist
                    closest_spk = s_seg["speaker"]
            assigned_speaker = closest_spk
            
        # Fallback if speaker_segments is empty
        if not assigned_speaker:
            assigned_speaker = "Agent"
                
        if assigned_speaker != current_speaker:
            # Speaker changed, flush the previous grouped text
            if current_speaker is not None and current_text:
                joined_text = " ".join(current_text).strip()
                # Apply spelling corrections to the complete sentence
                corrected_text = apply_spelling_corrections(joined_text)
                # Remove extra spaces created by Whisper word outputs
                import re
                corrected_text = re.sub(r'\s+', ' ', corrected_text).strip()
                
                final_transcript.append({
                    "timestamp": f"{format_time(current_start)} - {format_time(current_end)}",
                    "speaker": current_speaker,
                    "text": corrected_text
                })
            
            # Start new speaker group
            current_speaker = assigned_speaker
            current_text = [w_word.strip()]
            current_start = w_start
            current_end = w_end
        else:
            # Same speaker, add word to current group
            current_text.append(w_word.strip())
            current_end = w_end
            
    # Flush the last group
    if current_speaker is not None and current_text:
        joined_text = " ".join(current_text).strip()
        corrected_text = apply_spelling_corrections(joined_text)
        import re
        corrected_text = re.sub(r'\s+', ' ', corrected_text).strip()
        
        final_transcript.append({
            "timestamp": f"{format_time(current_start)} - {format_time(current_end)}",
            "speaker": current_speaker,
            "text": corrected_text
        })
        
    return final_transcript

def format_time(seconds: float) -> str:
    """Formats seconds into MM:SS format"""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"
