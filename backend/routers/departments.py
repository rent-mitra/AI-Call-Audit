import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import Department
from schemas import DepartmentCreate, DepartmentOut

router = APIRouter(
    prefix="/departments",
    tags=["Departments"]
)

@router.post("", response_model=DepartmentOut)
def create_department(request: Request, dept: DepartmentCreate, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required or business context missing.")
    
    # Verify role is ADMIN
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only administrators can manage departments.")
        
    tenant_uuid = uuid.UUID(user["tenant_id"])
    
    # Check if department already exists under this tenant
    existing = db.query(Department).filter(
        Department.tenant_id == tenant_uuid,
        Department.name == dept.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name already exists.")

    db_dept = Department(
        name=dept.name,
        description=dept.description,
        tenant_id=tenant_uuid
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

@router.get("", response_model=List[DepartmentOut])
def get_departments(request: Request, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required or business context missing.")
    
    tenant_uuid = uuid.UUID(user["tenant_id"])
    departments = db.query(Department).filter(Department.tenant_id == tenant_uuid).order_by(Department.name).all()
    return departments

@router.delete("/{department_id}")
def delete_department(request: Request, department_id: str, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    if not user or not user.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Authentication required or business context missing.")
    
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Only administrators can manage departments.")
        
    tenant_uuid = uuid.UUID(user["tenant_id"])
    
    try:
        dept_uuid = uuid.UUID(department_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid department ID format.")

    db_dept = db.query(Department).filter(Department.id == dept_uuid, Department.tenant_id == tenant_uuid).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    db.delete(db_dept)
    db.commit()
    return {"message": "Department deleted successfully."}
