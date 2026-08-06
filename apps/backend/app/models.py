from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, date
import uuid

from app.database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class Therapist(Base):
    __tablename__ = "therapists"

    id   = Column(String, primary_key=True)
    name = Column(String(200), nullable=False)


class Client(Base):
    __tablename__ = "clients"

    id              = Column(String, primary_key=True, default=new_uuid)
    therapist_id    = Column(String, nullable=False, index=True)
    name            = Column(String(200), nullable=False)
    age             = Column(Integer)
    dob             = Column(Date, nullable=True)
    condition       = Column(String(200))
    diagnosis       = Column(String(200))
    status          = Column(String(20), nullable=False, default="active")  # active | inactive
    color           = Column(String(80))                                    # tailwind bg class
    frequency       = Column(Integer, default=3)                            # sessions per week
    completed_this_week = Column(Integer, default=0)
    next_session    = Column(String(50))
    access_code     = Column(String(20), unique=True, index=True)           # code the family enters in the mobile app to log in
    created_at      = Column(DateTime, default=datetime.utcnow)

    submissions     = relationship("Submission", back_populates="client", cascade="all, delete-orphan")
    program         = relationship("Program", back_populates="client", uselist=False, cascade="all, delete-orphan")
    notes           = relationship("TherapistNote", back_populates="client", cascade="all, delete-orphan")
    sessions        = relationship("ClientSession", back_populates="client", cascade="all, delete-orphan")


class ClientSession(Base):
    __tablename__ = "client_sessions"

    id          = Column(String, primary_key=True, default=new_uuid)
    client_id   = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    token       = Column(String(64), unique=True, nullable=False, index=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="sessions")


class ExerciseTemplate(Base):
    __tablename__ = "exercise_templates"

    id                 = Column(String, primary_key=True, default=new_uuid)
    title              = Column(String(200), nullable=False)
    description        = Column(Text)
    instructions       = Column(Text)
    typically_used_for = Column(Text)                                       # clinical-use note, e.g. "Subacute carpal tunnel syndrome"
    video_url          = Column(String(500))
    video_source       = Column(String(20))                                 # youtube | upload
    category           = Column(String(100))
    duration_minutes   = Column(Integer)
    therapist_id       = Column(String, nullable=True, index=True)          # null = shared library item; set = that therapist's private addition
    created_at         = Column(DateTime, default=datetime.utcnow)

    program_exercises = relationship("ProgramExercise", back_populates="template")


class Program(Base):
    __tablename__ = "programs"

    id                  = Column(String, primary_key=True, default=new_uuid)
    client_id           = Column(String, ForeignKey("clients.id"), nullable=False, unique=True)
    name                = Column(String(200))
    frequency_per_week  = Column(Integer, default=3)
    notes               = Column(Text)
    schedule_days       = Column(String(100))                               # comma-separated day abbreviations, e.g. "Mon,Wed,Fri"
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client    = relationship("Client", back_populates="program")
    exercises = relationship("ProgramExercise", back_populates="program", cascade="all, delete-orphan", order_by="ProgramExercise.order")


class ProgramExercise(Base):
    __tablename__ = "program_exercises"

    id          = Column(String, primary_key=True, default=new_uuid)
    program_id  = Column(String, ForeignKey("programs.id"), nullable=False)
    template_id = Column(String, ForeignKey("exercise_templates.id"), nullable=False)
    order       = Column(Integer, default=0)

    program  = relationship("Program", back_populates="exercises")
    template = relationship("ExerciseTemplate", back_populates="program_exercises")


class Submission(Base):
    __tablename__ = "submissions"

    id              = Column(String, primary_key=True, default=new_uuid)
    client_id       = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    exercise_name   = Column(String(200), nullable=False)
    media_type      = Column(String(10))          # video | photo
    media_url       = Column(String(500))
    status          = Column(String(20), nullable=False, default="pending")  # pending | approved | rejected
    therapist_note  = Column(Text)
    duration        = Column(String(20))
    submitted_at    = Column(DateTime, default=datetime.utcnow)
    revision_of_id  = Column(String, ForeignKey("submissions.id"), nullable=True)
    revision_number = Column(Integer, default=1)

    client          = relationship("Client", back_populates="submissions")
    revision_of     = relationship("Submission", remote_side="Submission.id", foreign_keys=[revision_of_id])


class ClinicSession(Base):
    __tablename__ = "clinic_sessions"

    id            = Column(String, primary_key=True, default=new_uuid)
    client_id     = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    exercise_name = Column(String(200), nullable=False)
    note          = Column(Text)
    session_date  = Column(Date, nullable=False, default=date.today)
    created_at    = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client")


class TherapistNote(Base):
    __tablename__ = "therapist_notes"

    id           = Column(String, primary_key=True, default=new_uuid)
    client_id    = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    therapist_id = Column(String, nullable=False)
    text         = Column(Text, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="notes")
