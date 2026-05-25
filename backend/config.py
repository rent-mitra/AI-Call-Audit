import os
from dotenv import load_dotenv

load_dotenv()

# JWT Config
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "prod-super-secret-key-1234567890-abcdefghijklmnopqrstuvwxyz")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))  # 7 days

# Cookie Config
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "False").lower() in ("true", "1", "yes")
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
COOKIE_PATH = os.getenv("COOKIE_PATH", "/")
ACCESS_TOKEN_COOKIE_NAME = "access_token"
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"

# SMTP Config
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@callauditsystem.com")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "yes")

# CORS Config
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
