import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from database import engine, SessionLocal, Base
from models import Tenant, Department, User, AdminProfile, QAProfile, AgentProfile
from security.security import hash_password


def setup_database():
    print("Dropping all existing tables (with CASCADE)...")
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS departments CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS qa_result_details CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS qa_results CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS call_transcripts CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS calls CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS qa_parameters CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS password_reset_tokens CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS agents CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS qa CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS admins CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS tenants CASCADE"))
        conn.commit()

    print("Creating fresh tables from updated models...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Tenant 1: Acme Corp ────────────────────────────────────────────────
        print("Seeding Tenant: Acme Corp...")
        tenant = Tenant(
            name="Acme Corp",
            description="A demo business tenant."
        )
        db.add(tenant)
        db.flush()

        print("Seeding Department: Customer Support...")
        dept = Department(
            name="Customer Support",
            description="Main support department",
            tenant_id=tenant.id
        )
        db.add(dept)
        db.flush()

        # Admin
        admin = User(
            email="admin@acme.com",
            password=hash_password("Admin@1234"),
            role="ADMIN",
            is_active=True,
            is_account_activated=True,
            tenant_id=tenant.id,
            department_id=dept.id
        )
        db.add(admin)
        db.flush()
        db.add(AdminProfile(user_id=admin.user_id, first_name="Alice", last_name="Admin", phone="1111111111"))

        # QA
        qa = User(
            email="qa@acme.com",
            password=hash_password("QA@12345"),
            role="QA",
            is_active=True,
            is_account_activated=True,
            tenant_id=tenant.id,
            department_id=dept.id
        )
        db.add(qa)
        db.flush()
        db.add(QAProfile(user_id=qa.user_id, first_name="Qara", last_name="Auditor", phone="2222222222"))

        # Agent
        agent = User(
            email="agent@acme.com",
            password=hash_password("Agent@123"),
            role="AGENT",
            is_active=True,
            is_account_activated=True,
            tenant_id=tenant.id,
            department_id=dept.id
        )
        db.add(agent)
        db.flush()
        db.add(AgentProfile(user_id=agent.user_id, first_name="Bob", last_name="Agent", phone="3333333333"))

        db.commit()

        print("\nDatabase reset and seeded successfully!")
        print("─" * 50)
        print(f"  Tenant:  Acme Corp")
        print(f"  ADMIN:   admin@acme.com  /  Admin@1234")
        print(f"  QA:      qa@acme.com     /  QA@12345")
        print(f"  AGENT:   agent@acme.com  /  Agent@123")
        print("─" * 50)

    except Exception as e:
        db.rollback()
        print(f"ERROR during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    setup_database()
