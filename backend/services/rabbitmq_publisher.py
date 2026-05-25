import pika
import json
import os
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:password@localhost:5672/")

def get_rabbitmq_connection():
    parameters = pika.URLParameters(RABBITMQ_URL)
    return pika.BlockingConnection(parameters)

def publish_audio_task(call_id: str, file_path: str):
    """
    Publish a message to the audio_processing_queue.
    """
    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()

        # Ensure the queue exists
        channel.queue_declare(queue='audio_processing_queue', durable=True)

        message = {
            "call_id": call_id,
            "file_path": file_path
        }

        channel.basic_publish(
            exchange='',
            routing_key='audio_processing_queue',
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
            )
        )
        print(f" [x] Sent task for call_id: {call_id}")
        connection.close()
        return True
    except Exception as e:
        print(f"Failed to publish message: {e}")
        return False
