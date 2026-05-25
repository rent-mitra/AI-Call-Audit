import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from database import SessionLocal
from models import Call, QAResult, QAResultDetail

db = SessionLocal()
calls = db.query(Call).count()
qas = db.query(QAResult).count()
failed_qas = db.query(QAResult).filter(QAResult.final_status == "FAILED").count()

print(f"Total Calls: {calls}")
print(f"Total QAResults: {qas}")
print(f"Failed QAResults: {failed_qas}")

# Let's find any orphaned QAResults
orphans = db.query(QAResult).filter(~QAResult.call_id.in_(db.query(Call.id))).all()
print(f"Orphaned QAResults: {len(orphans)}")
