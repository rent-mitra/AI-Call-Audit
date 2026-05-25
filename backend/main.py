from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from datetime import datetime, timezone
import logging

from database import engine, Base, SessionLocal
from routers import calls, parameters, auth, users, audits, departments
from models import Tenant, User, Call, QAParameter
from middleware.jwt_middleware import JwtAuthenticationMiddleware
from config import CORS_ORIGINS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# Auto-create tables (for dev simplicity, alembic is also supported)
Base.metadata.create_all(bind=engine)

def check_and_add_columns():
    db = SessionLocal()
    try:
        from sqlalchemy import text
        # Check if columns exist in the calls table
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='calls';"))
        columns = [row[0] for row in result.fetchall()]
        
        if "agent_review_status" not in columns:
            db.execute(text("ALTER TABLE calls ADD COLUMN agent_review_status VARCHAR(50) DEFAULT NULL;"))
            logger.info("Added agent_review_status column to calls table.")
        if "agent_review_comments" not in columns:
            db.execute(text("ALTER TABLE calls ADD COLUMN agent_review_comments TEXT DEFAULT NULL;"))
            logger.info("Added agent_review_comments column to calls table.")
        if "qa_review_comments" not in columns:
            db.execute(text("ALTER TABLE calls ADD COLUMN qa_review_comments TEXT DEFAULT NULL;"))
            logger.info("Added qa_review_comments column to calls table.")
        db.commit()
    except Exception as e:
        logger.error(f"Error checking/adding calls columns: {e}")
        db.rollback()
    finally:
        db.close()

# Run database column checks
check_and_add_columns()

def initialize_default_tenant():
    db = SessionLocal()
    try:
        # Check if default tenant exists
        default_tenant = db.query(Tenant).filter(Tenant.name == "Default Business").first()
        if not default_tenant:
            default_tenant = Tenant(
                name="Default Business",
                description="Default tenant for unassigned records."
            )
            db.add(default_tenant)
            db.commit()
            db.refresh(default_tenant)
            logger.info("Default Business tenant created successfully.")

        # Update legacy users
        updated_users = db.query(User).filter(User.tenant_id == None).update({User.tenant_id: default_tenant.id})
        # Update legacy calls
        updated_calls = db.query(Call).filter(Call.tenant_id == None).update({Call.tenant_id: default_tenant.id})
        # Update legacy parameters
        updated_params = db.query(QAParameter).filter(QAParameter.tenant_id == None).update({QAParameter.tenant_id: default_tenant.id})

        if updated_users > 0 or updated_calls > 0 or updated_params > 0:
            db.commit()
            logger.info(f"Associated legacy records with default tenant: {updated_users} users, {updated_calls} calls, {updated_params} parameters.")
    except Exception as e:
        logger.error(f"Error initializing default tenant: {e}")
        db.rollback()
    finally:
        db.close()

# Run database tenant provisioning
initialize_default_tenant()

app = FastAPI(title="AI Call Audit System API")

# 1. Register JWT Authentication Middleware (Runs stateless token parsing)
app.add_middleware(JwtAuthenticationMiddleware)

# 2. Register CORS Middleware
# Credentials must be enabled, and no wildcards are allowed for cookies to work
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Register Application Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(audits.router)
app.include_router(calls.router, prefix="/api/v1")
app.include_router(calls.router, prefix="/api")
app.include_router(parameters.router, prefix="/api/v1")
app.include_router(parameters.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
# 4. Centralized Exception Handling (Replicates Java Spring Boot error payload formats)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    error_names = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        500: "Internal Server Error"
    }
    error_title = error_names.get(exc.status_code, "Error")
    
    logger.warning(f"HTTP {exc.status_code} Error: {exc.detail} on path {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": exc.status_code,
            "error": error_title,
            "message": exc.detail,
            "path": request.url.path
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled 500 Error: {exc} on path {request.url.path}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": 500,
            "error": "Internal Server Error",
            "message": str(exc),
            "path": request.url.path
        }
    )

@app.get("/")
def read_root():
    # Reload trigger comment
    return {"message": "AI Call Audit System API is running."}
