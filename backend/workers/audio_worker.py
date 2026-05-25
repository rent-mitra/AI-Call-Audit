import pika
import json
import os
import sys

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Call, CallTranscript
from services.audio_utils import convert_to_wav
from services.transcription_service import transcribe_audio
from services.diarization_service import diarize_audio
from services.alignment_service import align_transcript_and_speakers
from services.ai_service import identify_speaker_roles

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:password@localhost:5672/")

def publish_eval_task(channel, call_id: str):
    """Publish message to evaluation queue."""
    channel.queue_declare(queue='eval_processing_queue', durable=True)
    message = {"call_id": call_id}
    channel.basic_publish(
        exchange='',
        routing_key='eval_processing_queue',
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print(f" [x] Published eval task for call_id: {call_id}")

def process_audio_task(ch, method, properties, body):
    data = json.loads(body)
    call_id = data.get("call_id")
    file_path = data.get("file_path")
    
    print(f" [v] Received task for call_id: {call_id}, file: {file_path}")
    
    db = SessionLocal()
    working_file = file_path
    is_temp = False
    
    try:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            print(f"Call ID {call_id} not found in DB.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        call.status = "TRANSCRIBING"
        db.commit()

        # Convert to WAV first to ensure compatibility for both transcription and diarization
        if not file_path.lower().endswith('.wav'):
            working_file = convert_to_wav(file_path)
            is_temp = (working_file != file_path)

        # 1. Transcription
        print(f" [v] Starting transcription for {call_id}...")
        transcript_segments = transcribe_audio(working_file)
        print(f" [v] Transcription complete. Found {len(transcript_segments)} segments.")
        
        # 2. Diarization
        print(f" [v] Starting diarization for {call_id}...")
        speaker_segments = diarize_audio(working_file)
        
        # 3. Alignment
        print(f" [v] Starting speaker alignment for {call_id}...")
        final_transcript = align_transcript_and_speakers(transcript_segments, speaker_segments)
        print(f" [v] Alignment complete. Final transcript has {len(final_transcript)} entries.")
        
        # 3.5 Identify Speaker Roles (Agent vs Customer)
        try:
            print(f" [v] Identifying speaker roles for {call_id}...")
            role_mapping = identify_speaker_roles(final_transcript)
            print(f" [v] Speaker role mapping: {role_mapping}")
            for entry in final_transcript:
                raw_spk = entry["speaker"]
                entry["speaker"] = role_mapping.get(raw_spk, raw_spk)
        except Exception as e:
            print(f" [!] Failed to map speaker roles: {e}")
        
        # Create full text for easy reading
        full_text = "\n".join([f"[{t['timestamp']}] {t['speaker']}: {t['text']}" for t in final_transcript])
        print(f" [v] Full text length: {len(full_text)} characters.")

        # 4. Save to DB
        transcript_record = CallTranscript(
            call_id=call.id,
            transcript_data=final_transcript,
            full_text=full_text
        )
        print(f" [v] Saving transcript to database for {call_id}...")
        db.add(transcript_record)
        
        call.status = "PENDING_EVALUATION"
        db.commit()
        print(f" [v] Database commit successful for {call_id}.")

        # 5. Trigger Evaluation Worker
        print(f" [v] Publishing eval task for {call_id}...")
        publish_eval_task(ch, str(call.id))
        
        print(f" [v] Successfully processed audio for call_id: {call_id}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f" [!] Error processing call {call_id}: {e}")
        call = db.query(Call).filter(Call.id == call_id).first()
        if call:
            call.status = "FAILED"
            db.commit()
        # Nack and don't requeue to avoid infinite loops on bad files (DLQ should be configured in production)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    finally:
        # Clean up temporary file if created
        if is_temp and os.path.exists(working_file):
            print(f" [v] Cleaning up temporary file: {working_file}")
            os.remove(working_file)
        db.close()

def main():
    parameters = pika.URLParameters(RABBITMQ_URL)
    parameters.heartbeat = 0
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue='audio_processing_queue', durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='audio_processing_queue', on_message_callback=process_audio_task)

    print(' [*] Audio Worker waiting for messages. To exit press CTRL+C')
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()

if __name__ == '__main__':
    main()
