from database import SessionLocal
from models import User
db = SessionLocal()
user = db.query(User).filter(User.email == 'jainshanu1304@gmail.com').first()
if user:
    print(f"Email: {user.email}")
    print(f"Role: {user.role}")
    print(f"Active: {user.is_active}")
    print(f"Activated: {user.is_account_activated}")
    print(f"Has password: {bool(user.password)}")
else:
    print("User not found.")
