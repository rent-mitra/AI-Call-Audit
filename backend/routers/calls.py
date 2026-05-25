import os
import shutil
import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Call, QAResult, CallTranscript, QAResultDetail, User, AgentProfile, QAProfile, QAParameter
from services.rabbitmq_publisher import publish_audio_task, publish_eval_task
from pydantic import BaseModel

class AgentReviewPayload(BaseModel):
    status: str
    comments: Optional[str] = None

class QAReviewPayload(BaseModel):
    action: str
    comments: Optional[str] = None

router = APIRouter(
    prefix="/calls",
    tags=["Calls"]
)

STORAGE_DIR = "storage"
os.makedirs(STORAGE_DIR, exist_ok=True)


def _agent_name(call: Call) -> str:
    if call.agent and call.agent.agent_profile:
        p = call.agent.agent_profile
        return f"{p.first_name} {p.last_name}"
    return "Unknown Agent"


def _qa_name(call: Call) -> str:
    if call.qa_user and call.qa_user.qa_profile:
        p = call.qa_user.qa_profile
        return f"{p.first_name} {p.last_name}"
    return None


# ─── Stats ───────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_call_stats(request: Request, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    tenant_uuid = uuid.UUID(user["tenant_id"])

    calls_query = db.query(Call).filter(Call.tenant_id == tenant_uuid)
    results_query = db.query(QAResult).join(Call).filter(Call.tenant_id == tenant_uuid)

    if user.get("role") == "AGENT":
        agent_uuid = uuid.UUID(user["user_id"])
        calls_query = calls_query.filter(Call.agent_id == agent_uuid)
        results_query = results_query.filter(Call.agent_id == agent_uuid)

    total_calls = calls_query.count()
    avg_score = results_query.with_entities(func.avg(QAResult.total_score)).scalar() or 0
    needs_review = results_query.filter(QAResult.final_status == "NEEDS_REVIEW").distinct().count()
    critical_failures = results_query.filter(QAResult.final_status == "FAILED").distinct().count()

    return {
        "total_calls": total_calls,
        "avg_score": round(float(avg_score), 1),
        "needs_review": needs_review,
        "critical_failures": critical_failures
    }


# ─── Upload (Agent only) ──────────────────────────────────────────────────────

@router.post("/upload")
async def upload_call(
    request: Request,
    file: UploadFile = File(...),
    agent_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """QA: Upload a call recording and assign to an agent in their department. Triggers auto-audit."""
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    if user.get("role") != "QA":
        raise HTTPException(status_code=403, detail="Only QA can upload call recordings.")

    tenant_uuid = uuid.UUID(user["tenant_id"])
    qa_uuid = uuid.UUID(user["user_id"])
    
    qa_db_user = db.query(User).filter(User.user_id == qa_uuid).first()
    if not qa_db_user or not qa_db_user.department_id:
        raise HTTPException(status_code=400, detail="QA user has no department assigned.")

    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id format.")

    # Verify agent belongs to the same department
    agent_db_user = db.query(User).filter(User.user_id == agent_uuid, User.department_id == qa_db_user.department_id).first()
    if not agent_db_user:
        raise HTTPException(status_code=404, detail="Agent not found or not in your department.")

    if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a', '.aac')):
        raise HTTPException(status_code=400, detail="Invalid file type. Supported: mp3, wav, m4a, aac.")

    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(STORAGE_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    new_call = Call(
        original_filename=file.filename,
        storage_url=file_path,
        status="PENDING",
        tenant_id=tenant_uuid,
        department_id=qa_db_user.department_id,
        agent_id=agent_uuid,
        qa_id=qa_uuid
    )
    db.add(new_call)
    db.commit()
    db.refresh(new_call)

    # Publish task to RabbitMQ for real AI transcription and evaluation
    publish_audio_task(str(new_call.id), file_path)

    return {"message": "Upload successful and queued for auditing.", "call_id": str(new_call.id)}


# Start Audit removed because it is now automated within /upload

# Available calls removed because QA uploads directly

@router.get("")
def get_all_calls(request: Request, db: Session = Depends(get_db)):
    """All roles: filtered by role and department. AGENT sees own calls, QA sees all in department."""
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    tenant_uuid = uuid.UUID(user["tenant_id"])
    user_uuid = uuid.UUID(user["user_id"])

    db_user = db.query(User).filter(User.user_id == user_uuid).first()
    if not db_user or not db_user.department_id:
        return []

    query = db.query(Call).filter(Call.tenant_id == tenant_uuid, Call.department_id == db_user.department_id)
    
    if user.get("role") == "AGENT":
        query = query.filter(Call.agent_id == user_uuid)

    calls = query.order_by(Call.created_at.desc()).all()

    result = []
    for c in calls:
        score = c.qa_result.total_score if c.qa_result else None
        final_status = c.qa_result.final_status if c.qa_result else None
        result.append({
            "id": str(c.id),
            "filename": c.original_filename,
            "status": c.status,
            "date": c.created_at.strftime("%Y-%m-%d"),
            "score": score,
            "final_status": final_status,
            "agentId": str(c.agent_id) if c.agent_id else None,
            "agentName": _agent_name(c),
            "qaId": str(c.qa_id) if c.qa_id else None,
            "qaName": _qa_name(c),
            "agentReviewStatus": c.agent_review_status,
            "agentReviewComments": c.agent_review_comments,
            "qaReviewComments": c.qa_review_comments,
        })
    return result


# ─── Tracking endpoints ────────────────────────────────────────────────────────

@router.get("/tracking/by-agent")
def tracking_by_agent(request: Request, db: Session = Depends(get_db)):
    """QA: For each agent, count total calls and how many this QA has audited."""
    user = getattr(request.state, "user", None)
    if not user or user.get("role") != "QA":
        raise HTTPException(status_code=403, detail="QA access only.")

    tenant_uuid = uuid.UUID(user["tenant_id"])
    qa_uuid = uuid.UUID(user["user_id"])
    
    qa_db_user = db.query(User).filter(User.user_id == qa_uuid).first()
    if not qa_db_user or not qa_db_user.department_id:
        return []

    # All agents in this QA's department
    agents = (
        db.query(User)
        .filter(User.tenant_id == tenant_uuid, User.role == "AGENT", User.department_id == qa_db_user.department_id)
        .all()
    )

    result = []
    for agent in agents:
        total = db.query(Call).filter(
            Call.tenant_id == tenant_uuid,
            Call.agent_id == agent.user_id
        ).count()

        audited_by_me = db.query(Call).join(QAResult, QAResult.call_id == Call.id).filter(
            Call.tenant_id == tenant_uuid,
            Call.agent_id == agent.user_id,
            Call.qa_id == qa_uuid
        ).count()

        avg_score = db.query(func.avg(QAResult.total_score)).join(Call, Call.id == QAResult.call_id).filter(
            Call.agent_id == agent.user_id,
            Call.qa_id == qa_uuid
        ).scalar()

        profile = agent.agent_profile
        agent_name = f"{profile.first_name} {profile.last_name}" if profile else agent.email

        result.append({
            "agentId": str(agent.user_id),
            "agentName": agent_name,
            "totalCalls": total,
            "auditedByMe": audited_by_me,
            "avgScore": round(float(avg_score), 1) if avg_score else None
        })

    return result


@router.get("/tracking/by-qa")
def tracking_by_qa(request: Request, db: Session = Depends(get_db)):
    """AGENT: For each QA, count how many of my calls they have audited."""
    user = getattr(request.state, "user", None)
    if not user or user.get("role") != "AGENT":
        raise HTTPException(status_code=403, detail="Agent access only.")

    tenant_uuid = uuid.UUID(user["tenant_id"])
    agent_uuid = uuid.UUID(user["user_id"])

    # All calls by this agent that have been audited
    audited_calls = (
        db.query(Call)
        .join(QAResult, QAResult.call_id == Call.id)
        .filter(Call.tenant_id == tenant_uuid, Call.agent_id == agent_uuid, Call.qa_id != None)
        .all()
    )

    # Group by qa_id
    qa_counts: dict = {}
    for c in audited_calls:
        qa_id_str = str(c.qa_id)
        if qa_id_str not in qa_counts:
            qa_counts[qa_id_str] = {"count": 0, "qa_user": c.qa_user}
        qa_counts[qa_id_str]["count"] += 1

    result = []
    for qa_id_str, data in qa_counts.items():
        qa_user = data["qa_user"]
        qa_name = qa_user.email
        if qa_user and qa_user.qa_profile:
            p = qa_user.qa_profile
            qa_name = f"{p.first_name} {p.last_name}"

        result.append({
            "qaId": qa_id_str,
            "qaName": qa_name,
            "auditedCount": data["count"]
        })

    return result


# ─── Call Detail ──────────────────────────────────────────────────────────────

@router.get("/{call_id}")
def get_call_detail(call_id: str, request: Request, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    tenant_uuid = uuid.UUID(user["tenant_id"])

    call = db.query(Call).filter(Call.id == call_id, Call.tenant_id == tenant_uuid).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found.")

    if user.get("role") == "AGENT":
        agent_uuid = uuid.UUID(user["user_id"])
        if call.agent_id != agent_uuid:
            raise HTTPException(status_code=403, detail="Access denied.")

    transcript_data = []
    if call.transcripts:
        transcript_data = call.transcripts[0].transcript_data

    qa_details = []
    if call.qa_result:
        for detail in call.qa_result.details:
            qa_details.append({
                "category": detail.parameter.category if detail.parameter else "Unknown",
                "question": detail.parameter.question if detail.parameter else "Unknown",
                "status": detail.status,
                "marks_obtained": detail.marks_obtained,
                "evidence": detail.evidence,
                "feedback": detail.feedback
            })

    return {
        "id": str(call.id),
        "filename": call.original_filename,
        "status": call.status,
        "date": call.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "final_status": call.qa_result.final_status if call.qa_result else None,
        "score": call.qa_result.total_score if call.qa_result else None,
        "ai_feedback": call.qa_result.ai_feedback if call.qa_result else None,
        "transcript": transcript_data,
        "results": qa_details,
        "agentId": str(call.agent_id) if call.agent_id else None,
        "agentName": _agent_name(call),
        "qaId": str(call.qa_id) if call.qa_id else None,
        "qaName": _qa_name(call),
        "agentReviewStatus": call.agent_review_status,
        "agentReviewComments": call.agent_review_comments,
        "qaReviewComments": call.qa_review_comments,
    }


@router.get("/{call_id}/audio")
def get_call_audio(call_id: str, request: Request, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    tenant_uuid = uuid.UUID(user["tenant_id"])

    try:
        valid_uuid = uuid.UUID(call_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid call_id format.")

    call = db.query(Call).filter(Call.id == valid_uuid, Call.tenant_id == tenant_uuid).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found.")

    if user.get("role") == "AGENT":
        agent_uuid = uuid.UUID(user["user_id"])
        if call.agent_id != agent_uuid:
            raise HTTPException(status_code=403, detail="Access denied.")

    if not call.storage_url or not os.path.exists(call.storage_url):
        raise HTTPException(status_code=404, detail="Audio file not found on disk.")

    return FileResponse(call.storage_url, media_type="audio/mpeg", filename=call.original_filename)


# ─── Delete call ──────────────────────────────────────────────────────────────

@router.delete("/{call_id}")
def delete_call(call_id: str, request: Request, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    tenant_uuid = uuid.UUID(user["tenant_id"])

    try:
        valid_uuid = uuid.UUID(call_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid call_id format.")

    call = db.query(Call).filter(Call.id == valid_uuid, Call.tenant_id == tenant_uuid).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found.")

    if call.storage_url and os.path.exists(call.storage_url):
        try:
            os.remove(call.storage_url)
        except Exception as e:
            print(f"Warning: Could not delete audio file: {e}")

    qa_results = db.query(QAResult).filter(QAResult.call_id == valid_uuid).all()
    for qa in qa_results:
        db.delete(qa)

    db.delete(call)
    db.commit()
    return {"message": "Call deleted successfully."}


@router.post("/{call_id}/agent-review")
def submit_agent_review(
    call_id: str,
    payload: AgentReviewPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    if user.get("role") != "AGENT":
        raise HTTPException(status_code=403, detail="Only agents can review their audited calls.")
        
    try:
        call_uuid = uuid.UUID(call_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid call_id format.")

    tenant_uuid = uuid.UUID(user["tenant_id"])
    agent_uuid = uuid.UUID(user["user_id"])
    
    call = db.query(Call).filter(Call.id == call_uuid, Call.tenant_id == tenant_uuid, Call.agent_id == agent_uuid).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found or access denied.")

    # Only audited calls can be reviewed
    if not call.qa_result:
        raise HTTPException(status_code=400, detail="Call has not been audited yet.")

    status_upper = payload.status.upper()
    if status_upper not in ["SATISFIED", "DISPUTED"]:
        raise HTTPException(status_code=400, detail="Invalid review status. Must be SATISFIED or DISPUTED.")

    call.agent_review_status = status_upper
    call.agent_review_comments = payload.comments
    
    db.commit()
    return {"message": f"Review submitted successfully as {status_upper}."}


@router.post("/{call_id}/qa-review")
def submit_qa_review(
    call_id: str,
    payload: QAReviewPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required.")
    if user.get("role") != "QA":
        raise HTTPException(status_code=403, detail="Only QA users can manage agent reviews.")
        
    try:
        call_uuid = uuid.UUID(call_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid call_id format.")

    tenant_uuid = uuid.UUID(user["tenant_id"])
    
    call = db.query(Call).filter(Call.id == call_uuid, Call.tenant_id == tenant_uuid).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found.")

    if call.agent_review_status != "DISPUTED":
        raise HTTPException(status_code=400, detail="This call has not been disputed by the agent.")

    action_upper = payload.action.upper()
    if action_upper == "REJECT":
        call.agent_review_status = "DISPUTE_REJECTED"
        call.qa_review_comments = payload.comments
    elif action_upper == "RE_AUDIT":
        call.agent_review_status = "RE_AUDITED"
        call.qa_review_comments = payload.comments
        call.status = "PENDING"
        publish_audio_task(str(call.id), call.storage_url)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be RE_AUDIT or REJECT.")

    db.commit()
    return {"message": f"QA review completed with action: {action_upper}."}
