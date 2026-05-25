import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    ACCESS_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME,
    COOKIE_SECURE,
    COOKIE_SAMESITE,
    COOKIE_PATH
)
from fastapi import Response

# ----------------- Password Hashing (BCrypt) -----------------

def hash_password(password: str) -> str:
    """Hashes a password using BCrypt."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against its hashed value using BCrypt."""
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False

# ----------------- JWT Token Management -----------------

def create_access_token(user_id: str, email: str, role: str, tenant_id: Optional[str] = None, tenant_name: Optional[str] = None) -> str:
    """Generates a stateless access JWT valid for 24 hours."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    claims = {
        "userId": str(user_id),
        "role": str(role),
        "sub": str(email),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    if tenant_id:
        claims["tenantId"] = str(tenant_id)
    if tenant_name:
        claims["tenantName"] = str(tenant_name)
    
    return jwt.encode(claims, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str, email: str, role: str, tenant_id: Optional[str] = None, tenant_name: Optional[str] = None) -> str:
    """Generates a stateless refresh JWT valid for 7 days."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    claims = {
        "userId": str(user_id),
        "role": str(role),
        "sub": str(email),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    if tenant_id:
        claims["tenantId"] = str(tenant_id)
    if tenant_name:
        claims["tenantName"] = str(tenant_name)
    
    return jwt.encode(claims, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT signature and expiration. Returns claims if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token has expired
    except jwt.InvalidTokenError:
        return None  # Signature verification or other validation failed

# ----------------- Cookie Helpers -----------------

def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Sets both access and refresh tokens in HttpOnly secure Lax cookies."""
    # Set access token cookie
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path=COOKIE_PATH,
        domain=None,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=COOKIE_SAMESITE
    )
    
    # Set refresh token cookie
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path=COOKIE_PATH,
        domain=None,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=COOKIE_SAMESITE
    )

def clear_auth_cookies(response: Response) -> None:
    """Clears both access and refresh token cookies from the browser."""
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        path=COOKIE_PATH,
        domain=None,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=COOKIE_SAMESITE
    )
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        path=COOKIE_PATH,
        domain=None,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=COOKIE_SAMESITE
    )
