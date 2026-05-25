import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from database import SessionLocal
from models import Call, QAResult, CallTranscript

db = SessionLocal()
# Create call
call = Call(original_filename="dummy_bug.mp3", status="COMPLETED")
db.add(call)
db.commit()
db.refresh(call)
call_id = call.id

qa = QAResult(call_id=call_id, final_status="FAILED", total_score=0)
db.add(qa)
db.commit()
db.refresh(qa)
qa_id = qa.id

# close session to clear identity map
db.close()

# New session (like the API endpoint)
db2 = SessionLocal()
call_to_delete = db2.query(Call).filter(Call.id == call_id).first()
db2.delete(call_to_delete)
db2.commit()

# Check if QA result still exists
qa_exists = db2.query(QAResult).filter(QAResult.id == qa_id).first()
if qa_exists:
    print("BUG: QA Result was NOT deleted! call_id is:", qa_exists.call_id)
else:
    print("SUCCESS: QA Result was deleted.")
