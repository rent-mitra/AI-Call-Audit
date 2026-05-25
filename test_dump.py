import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from database import SessionLocal
from models import Call, QAResult

db = SessionLocal()
calls = db.query(Call).all()
for c in calls:
    qa = c.qa_result
    status = qa.final_status if qa else "NO QA"
    print(f"Call ID: {c.id} | Filename: {c.original_filename} | Status: {status}")
