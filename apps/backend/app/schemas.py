from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date


# ── Exercise Template ─────────────────────────────────────────────────────────

class TemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    video_url: Optional[str] = None
    category: Optional[str] = None
    duration_minutes: Optional[int] = None

class TemplateCreate(TemplateBase):
    pass

class TemplateOut(TemplateBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


# ── Program ───────────────────────────────────────────────────────────────────

class ProgramExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    order: int
    template: TemplateOut

class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: Optional[str] = None
    frequency_per_week: int

class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    client_id: str
    name: Optional[str] = None
    frequency_per_week: int
    notes: Optional[str] = None
    schedule_days: Optional[str] = None
    created_at: datetime
    exercises: list[ProgramExerciseOut] = []

class ProgramCreate(BaseModel):
    client_id: str
    name: Optional[str] = None
    frequency_per_week: int = 3
    notes: Optional[str] = None
    schedule_days: Optional[str] = None
    template_ids: list[str] = []


class ProgramTemplateExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    order: int
    template: TemplateOut


class ProgramTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    body_region: Optional[str] = None
    injury_type: Optional[str] = None
    functional_focus: Optional[str] = None
    recovery_phase: Optional[str] = None
    goals: Optional[str] = None
    ergonomic_recommendations: Optional[str] = None
    precautions: Optional[str] = None
    equipment_needed: Optional[str] = None
    progression_criteria: Optional[str] = None
    frequency_per_week: int = 3
    schedule_days: Optional[str] = None
    created_at: datetime
    exercises: list[ProgramTemplateExerciseOut] = []


class ProgramTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    body_region: Optional[str] = None
    injury_type: Optional[str] = None
    functional_focus: Optional[str] = None
    recovery_phase: Optional[str] = None
    goals: Optional[str] = None
    ergonomic_recommendations: Optional[str] = None
    precautions: Optional[str] = None
    equipment_needed: Optional[str] = None
    progression_criteria: Optional[str] = None
    frequency_per_week: int = 3
    schedule_days: Optional[str] = None
    template_ids: list[str] = []

class ProgramTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    body_region: Optional[str] = None
    injury_type: Optional[str] = None
    functional_focus: Optional[str] = None
    recovery_phase: Optional[str] = None
    goals: Optional[str] = None
    ergonomic_recommendations: Optional[str] = None
    precautions: Optional[str] = None
    equipment_needed: Optional[str] = None
    progression_criteria: Optional[str] = None
    frequency_per_week: Optional[int] = None
    schedule_days: Optional[str] = None
    template_ids: Optional[list[str]] = None


# ── Submission ────────────────────────────────────────────────────────────────

class SubmissionBase(BaseModel):
    exercise_name: str
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    duration: Optional[str] = None
    revision_of_id: Optional[str] = None
    revision_number: Optional[int] = 1

class SubmissionCreate(SubmissionBase):
    client_id: str

class SubmissionOut(SubmissionBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    client_id: str
    status: str
    therapist_note: Optional[str] = None
    submitted_at: datetime

class SubmissionApprove(BaseModel):
    note: Optional[str] = None

class SubmissionReject(BaseModel):
    note: str


# ── Client ────────────────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    name: str
    age: Optional[int] = None
    dob: Optional[date] = None
    condition: Optional[str] = None
    diagnosis: Optional[str] = None
    color: Optional[str] = "bg-blue-100 text-blue-700"
    frequency: int = 3
    next_session: Optional[str] = None

class ClientCreate(ClientBase):
    therapist_id: str
    status: str = "active"

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[date] = None
    condition: Optional[str] = None
    diagnosis: Optional[str] = None
    status: Optional[str] = None
    frequency: Optional[int] = None
    completed_this_week: Optional[int] = None
    next_session: Optional[str] = None
    color: Optional[str] = None

class ClientOut(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    therapist_id: str
    status: str
    completed_this_week: int
    created_at: datetime
    program: Optional[ProgramSummary] = None

# ── Therapist Note ────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    text: str
    therapist_id: str

class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    client_id: str
    therapist_id: str
    text: str
    created_at: datetime


class ClientDetail(ClientOut):
    model_config = ConfigDict(from_attributes=True)
    submissions: list[SubmissionOut] = []
    notes: list[NoteOut] = []
    program: Optional[ProgramOut] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    active_clients: int
    inactive_clients: int
    total_clients: int
    pending_submissions: int
    approved_submissions: int
    rejected_submissions: int
    avg_completion_pct: float
