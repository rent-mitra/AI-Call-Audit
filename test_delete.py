import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from database import SessionLocal
from models import Call, QAResult, QAResultDetail, CallTranscript
import requests

db = SessionLocal()
call = Call(original_filename="dummy.mp3", status="COMPLETED")
db.add(call)
db.commit()
db.refresh(call)
call_id = call.id

qa = QAResult(call_id=call_id, final_status="PASSED", total_score=100)
db.add(qa)
db.commit()

trans = CallTranscript(call_id=call_id, full_text="Hello")
db.add(trans)
db.commit()

resp = requests.delete(f"http://localhost:8000/api/v1/calls/{call_id}")
print("Status:", resp.status_code)
print("Response:", resp.text)
