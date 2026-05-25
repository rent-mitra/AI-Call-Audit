import os
import csv
import io
import uuid
import shutil
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Call, QAResult, QAResultDetail, User, AgentProfile, QAProfile
from security.dependencies import require_qa, require_agent, require_qa_or_agent
from services.rabbitmq_publisher import publish_audio_task
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger("audits_router")

router = APIRouter(
    prefix="/api/audits",
    tags=["Audit Management"]
)

STORAGE_DIR = "storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

# ----------------- Pydantic Schemas -----------------

class QAResultDetailSchema(BaseModel):
    parameter_id: str
    status: str
    marks_obtained: int
    feedback: Optional[str] = None

class AuditUpdateSchema(BaseModel):
    final_status: str
    total_score: int
    ai_feedback: Optional[str] = None
    details: Optional[List[QAResultDetailSchema]] = None

# ----------------- Helper functions -----------------

def get_audit_details(c: Call):
    """Formats Call models into consistent audit response JSONs."""
    score = c.qa_result.total_score if c.qa_result else None
    final_status = c.qa_result.final_status if c.qa_result else None
    
    agent_name = "Unknown Agent"
    if c.agent:
        profile = c.agent.agent_profile
        if profile:
            agent_name = f"{profile.first_name} {profile.last_name}"
            
    qa_name = "System"
    if c.qa_user:
        profile = c.qa_user.qa_profile
        if profile:
            qa_name = f"{profile.first_name} {profile.last_name}"

    return {
        "id": str(c.id),
        "filename": c.original_filename,
        "status": c.status,
        "date": c.created_at.strftime("%Y-%m-%d"),
        "score": score,
        "final_status": final_status,
        "agentId": str(c.agent_id) if c.agent_id else None,
        "agentName": agent_name,
        "qaId": str(c.qa_id) if c.qa_id else None,
        "qaName": qa_name
    }

def generate_csv_response(calls: List[Call], filename: str) -> StreamingResponse:
    """Utility to generate CSV file stream from call records."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Audit ID", "Filename", "Date", "Status", "Quality Score", "Evaluation Status", "Agent Name", "Audited By"])
    
    for c in calls:
        score = c.qa_result.total_score if c.qa_result else "N/A"
        final_status = c.qa_result.final_status if c.qa_result else "N/A"
        
        agent_name = "N/A"
        if c.agent and c.agent.agent_profile:
            agent_name = f"{c.agent.agent_profile.first_name} {c.agent.agent_profile.last_name}"
            
        qa_name = "System"
        if c.qa_user and c.qa_user.qa_profile:
            qa_name = f"{c.qa_user.qa_profile.first_name} {c.qa_user.qa_profile.last_name}"
            
        writer.writerow([
            str(c.id),
            c.original_filename,
            c.created_at.strftime("%Y-%m-%d"),
            c.status,
            score,
            final_status,
            agent_name,
            qa_name
        ])
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ----------------- QA Endpoints -----------------

@router.post("")
async def create_audit(
    agent_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_qa)
):
    """QA ONLY: Create a new audit by uploading an audio recording and associating it with an agent."""
    # 1. Validate agent exists
    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id format. Must be a UUID.")
        
    agent = db.query(User).filter(User.user_id == agent_uuid, User.role == "AGENT").first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent user not found.")

    # 2. Validate file type
    if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a', '.aac')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only mp3, wav, m4a, and aac are supported.")

    # 3. Save file locally
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(STORAGE_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded audio: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded audio file.")

    # 4. Create DB Call entry
    qa_user_uuid = uuid.UUID(current_user["user_id"])
    new_call = Call(
        original_filename=file.filename,
        storage_url=file_path,
        status="PROCESSING",
        agent_id=agent_uuid,
        qa_id=qa_user_uuid
    )
    db.add(new_call)
    db.commit()
    db.refresh(new_call)

    # 5. Publish to RabbitMQ
    success = publish_audio_task(str(new_call.id), file_path)
    if not success:
        new_call.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to dispatch audio processing task to the queue.")

    return {"message": "Audit created successfully, processing started.", "auditId": str(new_call.id)}


@router.get("")
def get_all_audits(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_qa)):
    """QA ONLY: List all audit records scoped to this tenant."""
    tenant_uuid = uuid.UUID(current_user["tenant_id"])
    calls = (
        db.query(Call)
        .filter(Call.tenant_id == tenant_uuid)
        .order_by(Call.created_at.desc())
        .all()
    )
    return [get_audit_details(c) for c in calls]


@router.put("/{auditId}")
def update_audit(
    auditId: str,
    payload: AuditUpdateSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_qa)
):
    """QA ONLY: Manually update/override the QA score and status for a specific audit."""
    try:
        audit_uuid = uuid.UUID(auditId)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid auditId format.")

    tenant_uuid = uuid.UUID(current_user["tenant_id"])
    call = db.query(Call).filter(Call.id == audit_uuid, Call.tenant_id == tenant_uuid).first()
    if not call:
        raise HTTPException(status_code=404, detail="Audit record not found.")

    # Stamp the QA who audited this call
    qa_uuid = uuid.UUID(current_user["user_id"])
    call.qa_id = qa_uuid

    qa_result = call.qa_result
    if not qa_result:
        qa_result = QAResult(call_id=call.id)
        db.add(qa_result)

    qa_result.final_status = payload.final_status
    qa_result.total_score = payload.total_score
    if payload.ai_feedback is not None:
        qa_result.ai_feedback = payload.ai_feedback

    if payload.details is not None:
        for existing in qa_result.details:
            db.delete(existing)
        db.commit()
        
        for d in payload.details:
            try:
                param_uuid = uuid.UUID(d.parameter_id)
                new_detail = QAResultDetail(
                    qa_result_id=qa_result.id,
                    qa_parameter_id=param_uuid,
                    status=d.status,
                    marks_obtained=d.marks_obtained,
                    feedback=d.feedback
                )
                db.add(new_detail)
            except ValueError:
                pass

    call.status = "COMPLETED"
    db.commit()

    return {"message": "Audit updated successfully."}


@router.get("/export")
def export_all_audits(db: Session = Depends(get_db), current_user: dict = Depends(require_qa)):
    """QA ONLY: Export all audits in the system to a CSV file."""
    calls = db.query(Call).order_by(Call.created_at.desc()).all()
    return generate_csv_response(calls, "all_audits_report.csv")

# ----------------- QA & AGENT Endpoints -----------------

@router.get("/{auditId}/export")
def export_single_audit(
    auditId: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_qa_or_agent)
):
    """QA OR AGENT: Export a single audit's details. Agents can only export their own audits."""
    try:
        audit_uuid = uuid.UUID(auditId)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid auditId format.")

    call = db.query(Call).filter(Call.id == audit_uuid).first()
    if not call:
        raise HTTPException(status_code=404, detail="Audit record not found.")

    # Ownership check for agents
    if current_user["role"] == "AGENT" and str(call.agent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied. You do not own this audit record.")

    return generate_csv_response([call], f"audit_report_{auditId}.csv")

# ----------------- AGENT Endpoints -----------------

@router.get("/me")
def get_own_audits(db: Session = Depends(get_db), current_user: dict = Depends(require_agent)):
    """AGENT ONLY: Retrieve own audits only."""
    agent_uuid = uuid.UUID(current_user["user_id"])
    calls = db.query(Call).filter(Call.agent_id == agent_uuid).order_by(Call.created_at.desc()).all()
    return [get_audit_details(c) for c in calls]


@router.get("/me/export")
def export_own_audits(db: Session = Depends(get_db), current_user: dict = Depends(require_agent)):
    """AGENT ONLY: Export own audits only."""
    agent_uuid = uuid.UUID(current_user["user_id"])
    calls = db.query(Call).filter(Call.agent_id == agent_uuid).order_by(Call.created_at.desc()).all()
    return generate_csv_response(calls, "my_audits_report.csv")
