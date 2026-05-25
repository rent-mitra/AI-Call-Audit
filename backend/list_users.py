from database import SessionLocal
from models import User
db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f"'{u.email}'")
