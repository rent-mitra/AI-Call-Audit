import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from database import SessionLocal
from models import QAResult

db = SessionLocal()
results = db.query(QAResult).all()
for r in results:
    print(f"QA Result ID: {r.id} | Call ID: {r.call_id} | Status: {r.final_status}")
