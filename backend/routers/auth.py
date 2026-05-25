import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Tenant, User, PasswordResetToken
from security.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    decode_token
)
from services.email_service import send_password_reset_email
from config import REFRESH_TOKEN_COOKIE_NAME

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

# ----------------- Pydantic Schemas -----------------

class LoginSchema(BaseModel):
    email: str
    password: str

class ForgotPasswordSchema(BaseModel):
    email: str

class ResetPasswordSchema(BaseModel):
    token: str
    password: str

class RegisterBusinessSchema(BaseModel):
    business_name: str
    business_description: Optional[str] = None
    owner_email: str
    owner_password: str
    owner_first_name: str
    owner_last_name: str

# ----------------- Helper Profile Extractor -----------------

def get_user_profile_response(user: User):
    """Utility to extract role-specific profile name information."""
    first_name = ""
    last_name = ""
    department_name = ""
    department_id = None
    
    if user.department:
        department_name = user.department.name
        department_id = str(user.department.id)
    
    if user.role == "ADMIN" and user.admin_profile:
        first_name = user.admin_profile.first_name
        last_name = user.admin_profile.last_name
    elif user.role == "QA" and user.qa_profile:
        first_name = user.qa_profile.first_name
        last_name = user.qa_profile.last_name
    elif user.role == "AGENT" and user.agent_profile:
        first_name = user.agent_profile.first_name
        last_name = user.agent_profile.last_name
        
    return {
        "id": str(user.user_id),
        "email": user.email,
        "role": user.role,
        "firstName": first_name,
        "lastName": last_name,
        "tenantId": str(user.tenant_id) if user.tenant_id else None,
        "tenantName": user.tenant.name if user.tenant else None,
        "departmentId": department_id,
        "departmentName": department_name
    }

# ----------------- Endpoints -----------------

@router.post("/login")
def login(payload: LoginSchema, response: Response, db: Session = Depends(get_db)):
    # 1. Fetch user by email
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # 2. Check if password exists (could be null for newly uploaded users who haven't activated)
    if not user.password:
        raise HTTPException(
            status_code=400, 
            detail="Account not activated. Please activate your account using the link sent to your email."
        )
        
    # 3. Authenticate password
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # 4. Check status
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated.")
    if not user.is_account_activated:
        raise HTTPException(status_code=400, detail="Account has not been activated yet.")

    # 5. Generate Access & Refresh Tokens
    access_token = create_access_token(
        str(user.user_id), 
        user.email, 
        user.role, 
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=user.tenant.name if user.tenant else None
    )
    refresh_token = create_refresh_token(
        str(user.user_id), 
        user.email, 
        user.role,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=user.tenant.name if user.tenant else None
    )
    
    # 6. Set Cookies
    set_auth_cookies(response, access_token, refresh_token)
    
    # 7. Return User Response
    return get_user_profile_response(user)


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    # 1. Read refresh token from cookie
    refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token:
        # Clear any partial cookies to be clean
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token not found.")
        
    # 2. Decode and validate
    claims = decode_token(refresh_token)
    if not claims:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")
        
    # 3. Find User
    user_id = claims.get("userId")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.is_active:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="User account is deactivated or not found.")
        
    # 4. Generate new tokens
    new_access_token = create_access_token(
        str(user.user_id), 
        user.email, 
        user.role,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=user.tenant.name if user.tenant else None
    )
    new_refresh_token = create_refresh_token(
        str(user.user_id), 
        user.email, 
        user.role,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
        tenant_name=user.tenant.name if user.tenant else None
    )
    
    # 5. Reset Cookies
    set_auth_cookies(response, new_access_token, new_refresh_token)
    
    # 6. Return profile
    return get_user_profile_response(user)

@router.post("/register-business")
def register_business(payload: RegisterBusinessSchema, db: Session = Depends(get_db)):
    # Check if tenant exists
    existing_tenant = db.query(Tenant).filter(Tenant.name == payload.business_name).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="A business with this name is already registered.")

    # Check if user email exists
    existing_user = db.query(User).filter(User.email == payload.owner_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    # Create Tenant
    new_tenant = Tenant(
        name=payload.business_name,
        description=payload.business_description
    )
    db.add(new_tenant)
    db.flush()

    # Create Owner User
    from models import AdminProfile
    owner_user = User(
        email=payload.owner_email,
        password=hash_password(payload.owner_password),
        role="ADMIN",
        is_active=True,
        is_account_activated=True,
        tenant_id=new_tenant.id
    )
    db.add(owner_user)
    db.flush()

    # Create Owner Admin Profile
    owner_profile = AdminProfile(
        user_id=owner_user.user_id,
        first_name=payload.owner_first_name,
        last_name=payload.owner_last_name
    )
    db.add(owner_profile)
    db.commit()

    return {"message": "Business and owner account successfully registered."}


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordSchema, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # To prevent email enumeration, return a generic success message regardless of existence.
    generic_response = {"message": "If the email exists, a password reset link has been sent."}
    
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active:
        return generic_response

    # Generate secure reset token
    reset_token = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Save reset token to DB
    db_token = PasswordResetToken(
        user_id=user.user_id,
        token=reset_token,
        expires_at=expiry
    )
    db.add(db_token)
    db.commit()

    # Get first name for greeting
    first_name = "User"
    if user.role == "ADMIN" and user.admin_profile:
        first_name = user.admin_profile.first_name
    elif user.role == "QA" and user.qa_profile:
        first_name = user.qa_profile.first_name
    elif user.role == "AGENT" and user.agent_profile:
        first_name = user.agent_profile.first_name

    # Dispatch email asynchronously using FastAPI BackgroundTasks
    background_tasks.add_task(
        send_password_reset_email,
        to_email=user.email,
        token=reset_token,
        first_name=first_name
    )
    
    return generic_response


@router.get("/validate-reset-token")
def validate_reset_token(token: str, db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=400, detail="Token parameter is required.")
        
    db_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid password reset token.")
        
    # Check expiry
    # Make sure expires_at is timezone-aware if comparing against utcnow
    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if datetime.now(timezone.utc) > expires_at:
        db.delete(db_token)
        db.commit()
        raise HTTPException(status_code=400, detail="Password reset token has expired.")
        
    return {"message": "Token is valid"}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordSchema, db: Session = Depends(get_db)):
    # 1. Validate Token
    db_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).first()
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid password reset token.")
        
    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if datetime.now(timezone.utc) > expires_at:
        db.delete(db_token)
        db.commit()
        raise HTTPException(status_code=400, detail="Password reset token has expired.")

    # 2. Get User
    user = db.query(User).filter(User.user_id == db_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="User account associated with this token is invalid or deactivated.")

    # 3. Update Password & Activate
    user.password = hash_password(payload.password)
    user.is_account_activated = True
    
    # 4. Clean up all tokens for this user
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.user_id).delete()
    db.commit()

    return {"message": "Password has been reset successfully. You can now login."}
