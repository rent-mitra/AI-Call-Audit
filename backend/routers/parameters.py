import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import QAParameter, User
from schemas import QAParameterCreate, QAParameterOut, QAParameterUpdate

router = APIRouter(
    prefix="/parameters",
    tags=["Parameters"]
)

@router.get("", response_model=List[QAParameterOut])
def get_parameters(request: Request, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required or business context missing.")
    tenant_uuid = uuid.UUID(user["tenant_id"])
    user_uuid = uuid.UUID(user["user_id"])
    
    db_user = db.query(User).filter(User.user_id == user_uuid).first()
    if not db_user or not db_user.department_id:
        return []
        
    return db.query(QAParameter).filter(QAParameter.tenant_id == tenant_uuid, QAParameter.department_id == db_user.department_id).all()

@router.post("", response_model=QAParameterOut)
def create_parameter(request: Request, parameter: QAParameterCreate, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required or business context missing.")
    tenant_uuid = uuid.UUID(user["tenant_id"])
    user_uuid = uuid.UUID(user["user_id"])
    
    db_user = db.query(User).filter(User.user_id == user_uuid).first()
    if not db_user or not db_user.department_id:
        raise HTTPException(status_code=400, detail="User has no department assigned.")

    new_param = QAParameter(**parameter.model_dump(), tenant_id=tenant_uuid, department_id=db_user.department_id)
    db.add(new_param)
    db.commit()
    db.refresh(new_param)
    return new_param

@router.put("/{param_id}", response_model=QAParameterOut)
def update_parameter(param_id: str, request: Request, parameter: QAParameterUpdate, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required or business context missing.")
    tenant_uuid = uuid.UUID(user["tenant_id"])
    user_uuid = uuid.UUID(user["user_id"])
    
    db_user = db.query(User).filter(User.user_id == user_uuid).first()
    if not db_user or not db_user.department_id:
        raise HTTPException(status_code=400, detail="User has no department assigned.")

    db_param = db.query(QAParameter).filter(QAParameter.id == param_id, QAParameter.tenant_id == tenant_uuid, QAParameter.department_id == db_user.department_id).first()
    if not db_param:
        raise HTTPException(status_code=404, detail="Parameter not found")
    
    update_data = parameter.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_param, key, value)
        
    db.commit()
    db.refresh(db_param)
    return db_param

@router.delete("/{param_id}")
def delete_parameter(param_id: str, request: Request, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required or business context missing.")
    tenant_uuid = uuid.UUID(user["tenant_id"])
    user_uuid = uuid.UUID(user["user_id"])
    
    db_user = db.query(User).filter(User.user_id == user_uuid).first()
    if not db_user or not db_user.department_id:
        raise HTTPException(status_code=400, detail="User has no department assigned.")

    db_param = db.query(QAParameter).filter(QAParameter.id == param_id, QAParameter.tenant_id == tenant_uuid, QAParameter.department_id == db_user.department_id).first()
    if not db_param:
        raise HTTPException(status_code=404, detail="Parameter not found")
        
    db.delete(db_param)
    db.commit()
    return {"message": "Parameter deleted successfully"}
