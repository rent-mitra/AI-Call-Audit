import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User, AgentProfile, QAProfile, AdminProfile, PasswordResetToken
from security.dependencies import require_admin
from services.email_service import send_activation_email
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger("users_router")

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"]
)


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class CreateUserSchema(BaseModel):
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    department_id: str


class UserOutSchema(BaseModel):
    user_id: str
    email: str
    role: str
    firstName: str
    lastName: str
    phone: Optional[str] = None
    isActive: bool
    isAccountActivated: bool
    department_id: Optional[str] = None
    activation_token: Optional[str] = None


# ─── Helper ──────────────────────────────────────────────────────────────────

def _create_user_with_role(
    payload: CreateUserSchema,
    role: str,
    tenant_uuid: uuid.UUID,
    db: Session,
    background_tasks: BackgroundTasks
):
    """Shared logic to create a QA or Agent account and dispatch an activation email."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"A user with email '{payload.email}' already exists.")

    try:
        dept_uuid = uuid.UUID(payload.department_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid department ID.")

    new_user = User(
        email=payload.email,
        password=None,          # null — user sets password on activation
        role=role,
        is_active=True,
        is_account_activated=False,
        tenant_id=tenant_uuid,
        department_id=dept_uuid
    )
    db.add(new_user)
    db.flush()

    if role == "QA":
        profile = QAProfile(
            user_id=new_user.user_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone
        )
    else:  # AGENT
        profile = AgentProfile(
            user_id=new_user.user_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone
        )

    db.add(profile)

    # Dispatch email
    activation_token = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(hours=48)
    db_token = PasswordResetToken(
        user_id=new_user.user_id,
        token=activation_token,
        expires_at=expiry
    )
    db.add(db_token)
    db.commit()

    background_tasks.add_task(
        send_activation_email,
        to_email=payload.email,
        token=activation_token,
        first_name=payload.first_name
    )

    return new_user, activation_token


def _build_user_out(u: User, token: str = None) -> dict:
    first_name, last_name, phone = "", "", None
    if u.role == "ADMIN" and u.admin_profile:
        first_name = u.admin_profile.first_name
        last_name = u.admin_profile.last_name
        phone = u.admin_profile.phone
    elif u.role == "QA" and u.qa_profile:
        first_name = u.qa_profile.first_name
        last_name = u.qa_profile.last_name
        phone = u.qa_profile.phone
    elif u.role == "AGENT" and u.agent_profile:
        first_name = u.agent_profile.first_name
        last_name = u.agent_profile.last_name
        phone = u.agent_profile.phone

    return UserOutSchema(
        user_id=str(u.user_id),
        email=u.email,
        role=u.role,
        firstName=first_name,
        lastName=last_name,
        phone=phone,
        isActive=u.is_active,
        isAccountActivated=u.is_account_activated,
        department_id=str(u.department_id) if u.department_id else None,
        activation_token=token
    )


# ─── Admin Endpoints ─────────────────────────────────────────────────────────

@router.post("/create-qa", response_model=UserOutSchema)
def create_qa(
    payload: CreateUserSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """ADMIN: Create a new QA user and send them an activation email."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Missing business context.")
    tenant_uuid = uuid.UUID(tenant_id)

    new_user, token = _create_user_with_role(payload, "QA", tenant_uuid, db, background_tasks)
    return _build_user_out(new_user, token)


@router.post("/create-agent", response_model=UserOutSchema)
def create_agent(
    payload: CreateUserSchema,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """ADMIN: Create a new Agent user and send them an activation email."""
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Missing business context.")
    tenant_uuid = uuid.UUID(tenant_id)

    new_user, token = _create_user_with_role(payload, "AGENT", tenant_uuid, db, background_tasks)
    return _build_user_out(new_user, token)


@router.get("", response_model=List[UserOutSchema])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """ADMIN: List all users under this tenant."""
    tenant_uuid = uuid.UUID(current_user["tenant_id"])
    users = db.query(User).filter(User.tenant_id == tenant_uuid).order_by(User.created_at.desc()).all()
    return [_build_user_out(u) for u in users]


@router.get("/agents", response_model=List[UserOutSchema])
def get_all_agents(
    request: Request,
    db: Session = Depends(get_db)
):
    """ADMIN or QA: List agents under this tenant. QA sees only their own department."""
    user = getattr(request.state, "user", None)
    if not user or user.get("role") not in ("ADMIN", "QA"):
        raise HTTPException(status_code=403, detail="Access denied.")
    tenant_uuid = uuid.UUID(user["tenant_id"])

    query = db.query(User).filter(User.tenant_id == tenant_uuid, User.role == "AGENT")

    if user.get("role") == "QA":
        # We need the QA's department_id
        qa_db_user = db.query(User).filter(User.user_id == uuid.UUID(user["user_id"])).first()
        if not qa_db_user or not qa_db_user.department_id:
            return [] # No department assigned, see no agents
        query = query.filter(User.department_id == qa_db_user.department_id)

    agents = query.order_by(User.created_at.desc()).all()
    return [_build_user_out(u) for u in agents]


@router.get("/qas", response_model=List[UserOutSchema])
def get_all_qas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """ADMIN: List all QA users under this tenant."""
    tenant_uuid = uuid.UUID(current_user["tenant_id"])
    qas = (
        db.query(User)
        .filter(User.tenant_id == tenant_uuid, User.role == "QA")
        .order_by(User.created_at.desc())
        .all()
    )
    return [_build_user_out(u) for u in qas]
