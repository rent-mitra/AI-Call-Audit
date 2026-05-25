import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
from database import SessionLocal
from models import Call, QAResult

db = SessionLocal()
# find all QA results with NULL call_id
orphans = db.query(QAResult).filter(QAResult.call_id == None).all()
print(f"QA Results with NULL call_id: {len(orphans)}")
for o in orphans:
    print(o.id, o.final_status)
