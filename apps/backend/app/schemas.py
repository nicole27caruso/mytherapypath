from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date


# ── Exercise Template (Exercise Library) ────────────────────────────────────────

class TemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    typically_used_for: Optional[str] = None
    video_url: Optional[str] = None
    video_source: Optional[str] = None       # youtube | upload
    category: Optional[str] = None
    duration_minutes: Optional[int] = None

class TemplateCreate(TemplateBase):
    therapist_id: Optional[str] = None       # null = shared library item; set = that therapist's private addition

class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    typically_used_for: Optional[str] = None
    video_url: Optional[str] = None
    video_source: Optional[str] = None
    category: Optional[str] = None
    duration_minutes: Optional[int] = None

class TemplateOut(TemplateBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    therapist_id: Optional[str] = None
    created_at: datetime


# ── Program ───────────────────────────────────────────────────────────────────

class ProgramExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    order: int
    template: TemplateOut
    frequency_per_week: Optional[int] = None
    weekly_count: Optional[int] = None
    weekly_target: Optional[int] = None
    due_status: Optional[str] = None

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
    exercise_frequencies: Optional[list[Optional[int]]] = None  # parallel to template_ids; None per-item = inherit program frequency

class ProgramExerciseFrequencyUpdate(BaseModel):
    frequency_per_week: Optional[int] = None  # None = inherit program frequency


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


# ── Clinic Session (in-person "mark done" log) ──────────────────────────────────

class ClinicSessionCreate(BaseModel):
    exercise_name: str
    note: Optional[str] = None

class ClinicSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    client_id: str
    exercise_name: str
    note: Optional[str] = None
    session_date: date
    created_at: datetime


class WeeklyCompletionWeek(BaseModel):
    week_start: date
    week_end: date
    completed: int
    target: int


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    active_clients: int
    inactive_clients: int
    total_clients: int
    pending_submissions: int
    approved_submissions: int
    rejected_submissions: int
    avg_completion_pct: float
