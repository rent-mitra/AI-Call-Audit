from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class QAParameterBase(BaseModel):
    category: str
    question: str
    mandatory: bool = False
    marks: int = 0
    failure_if_missing: bool = False

class QAParameterCreate(QAParameterBase):
    pass

class QAParameterUpdate(QAParameterBase):
    category: Optional[str] = None
    question: Optional[str] = None
    mandatory: Optional[bool] = None
    marks: Optional[int] = None
    failure_if_missing: Optional[bool] = None

class QAParameterOut(QAParameterBase):
    id: UUID

    class Config:
        from_attributes = True


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: UUID

    class Config:
        from_attributes = True
