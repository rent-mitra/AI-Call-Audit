import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    calls = relationship("Call", back_populates="tenant", cascade="all, delete-orphan")
    qa_parameters = relationship("QAParameter", back_populates="tenant", cascade="all, delete-orphan")
    departments = relationship("Department", back_populates="tenant", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="departments")
    users = relationship("User", back_populates="department")
    calls = relationship("Call", back_populates="department")
    qa_parameters = relationship("QAParameter", back_populates="department")


class Call(Base):
    __tablename__ = "calls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename = Column(String, index=True)
    storage_url = Column(String)
    status = Column(String, default="UPLOADED")  # UPLOADED, PROCESSING, COMPLETED, FAILED, NEEDS_REVIEW
    created_at = Column(DateTime, default=datetime.utcnow)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    qa_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)

    transcripts = relationship("CallTranscript", back_populates="call", cascade="all, delete-orphan")
    qa_result = relationship("QAResult", back_populates="call", uselist=False, cascade="all, delete-orphan")
    agent = relationship("User", foreign_keys=[agent_id])
    qa_user = relationship("User", foreign_keys=[qa_id])
    tenant = relationship("Tenant", back_populates="calls")
    department = relationship("Department", back_populates="calls")


class QAParameter(Base):
    __tablename__ = "qa_parameters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String, index=True)
    question = Column(String)
    mandatory = Column(Boolean, default=False)
    marks = Column(Integer, default=0)
    failure_if_missing = Column(Boolean, default=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    result_details = relationship("QAResultDetail", back_populates="parameter")
    tenant = relationship("Tenant", back_populates="qa_parameters")
    department = relationship("Department", back_populates="qa_parameters")


class CallTranscript(Base):
    __tablename__ = "call_transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID(as_uuid=True), ForeignKey("calls.id"))
    transcript_data = Column(JSON)
    full_text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="transcripts")


class QAResult(Base):
    __tablename__ = "qa_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID(as_uuid=True), ForeignKey("calls.id"))
    final_status = Column(String)  # PASSED, FAILED, NEEDS_REVIEW
    total_score = Column(Integer)
    mandatory_failed = Column(Boolean, default=False)
    ai_feedback = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="qa_result")
    details = relationship("QAResultDetail", back_populates="qa_result", cascade="all, delete-orphan")


class QAResultDetail(Base):
    __tablename__ = "qa_result_details"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    qa_result_id = Column(UUID(as_uuid=True), ForeignKey("qa_results.id"))
    qa_parameter_id = Column(UUID(as_uuid=True), ForeignKey("qa_parameters.id"))
    status = Column(String)  # Passed, Failed, Needs Review
    marks_obtained = Column(Integer)
    evidence = Column(Text)
    feedback = Column(Text)

    qa_result = relationship("QAResult", back_populates="details")
    parameter = relationship("QAParameter", back_populates="result_details")


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)
    role = Column(String, nullable=False)  # ADMIN, QA, AGENT
    is_active = Column(Boolean, default=True)
    is_account_activated = Column(Boolean, default=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agent_profile = relationship("AgentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    qa_profile = relationship("QAProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    admin_profile = relationship("AdminProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    tenant = relationship("Tenant", back_populates="users")
    department = relationship("Department", back_populates="users")


class AgentProfile(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, unique=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    doj = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="agent_profile")


class QAProfile(Base):
    __tablename__ = "qa"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, unique=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    user = relationship("User", back_populates="qa_profile")


class AdminProfile(Base):
    __tablename__ = "admins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, unique=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    user = relationship("User", back_populates="admin_profile")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")
