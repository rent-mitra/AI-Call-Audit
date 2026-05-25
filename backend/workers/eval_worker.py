import pika
import json
import os
import sys

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Call, CallTranscript, QAParameter, QAResult, QAResultDetail
from services.ai_service import evaluate_call
from services.scoring_service import calculate_final_score

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://admin:password@localhost:5672/")

def process_eval_task(ch, method, properties, body):
    data = json.loads(body)
    call_id = data.get("call_id")
    
    print(f" [v] Received evaluation task for call_id: {call_id}")
    
    db = SessionLocal()
    try:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            print(f"Call ID {call_id} not found in DB.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        call.status = "EVALUATING"
        db.commit()

        # Fetch Transcript
        transcript_record = db.query(CallTranscript).filter(CallTranscript.call_id == call_id).first()
        if not transcript_record or not transcript_record.full_text:
            raise ValueError("Transcript not found or empty.")

        # Fetch active QA Checklist for this call's tenant and department
        qa_parameters = db.query(QAParameter).filter(
            QAParameter.tenant_id == call.tenant_id,
            QAParameter.department_id == call.department_id
        ).all()
        if not qa_parameters:
            print(f"WARNING: No QA parameters found in DB for tenant={call.tenant_id}, department={call.department_id}. Call cannot be evaluated.")
            raise ValueError("Empty QA Checklist.")

        # 1. AI Evaluation
        ai_response = evaluate_call(str(call.id), transcript_record.full_text, qa_parameters)
        
        # 2. Apply Scoring Logic
        ai_results = ai_response.get("results", [])
        final_status, total_score, mandatory_failed = calculate_final_score(ai_results, qa_parameters)
        
        # 3. Store Results
        qa_result = QAResult(
            call_id=call.id,
            final_status=final_status,
            total_score=total_score,
            mandatory_failed=mandatory_failed,
            ai_feedback=ai_response.get("ai_feedback", "")
        )
        db.add(qa_result)
        db.flush() # flush to get qa_result.id
        
        # Store Result Details
        param_lookup = {p.category: p.id for p in qa_parameters}
        for res in ai_results:
            param_id = param_lookup.get(res.get("parameter"))
            if not param_id:
                continue
                
            detail = QAResultDetail(
                qa_result_id=qa_result.id,
                qa_parameter_id=param_id,
                status=res.get("status"),
                marks_obtained=res.get("marks_obtained", 0),
                evidence=res.get("evidence", ""),
                feedback=res.get("feedback", "")
            )
            db.add(detail)

        # Finalize Call Status
        call.status = "COMPLETED"
        db.commit()
        
        print(f" [v] Successfully evaluated call_id: {call_id}. Status: {final_status}, Score: {total_score}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f" [!] Error evaluating call {call_id}: {e}")
        call = db.query(Call).filter(Call.id == call_id).first()
        if call:
            call.status = "FAILED"
            db.commit()
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    finally:
        db.close()

def main():
    parameters = pika.URLParameters(RABBITMQ_URL)
    parameters.heartbeat = 0
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    channel.queue_declare(queue='eval_processing_queue', durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='eval_processing_queue', on_message_callback=process_eval_task)

    print(' [*] Eval Worker waiting for messages. To exit press CTRL+C')
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    connection.close()

if __name__ == '__main__':
    main()
