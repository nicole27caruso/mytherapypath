from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


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
    created_at      = Column(DateTime, default=datetime.utcnow)

    submissions     = relationship("Submission", back_populates="client", cascade="all, delete-orphan")
    program         = relationship("Program", back_populates="client", uselist=False, cascade="all, delete-orphan")
    notes           = relationship("TherapistNote", back_populates="client", cascade="all, delete-orphan")


class ExerciseTemplate(Base):
    __tablename__ = "exercise_templates"

    id              = Column(String, primary_key=True, default=new_uuid)
    title           = Column(String(200), nullable=False)
    description     = Column(Text)
    instructions    = Column(Text)
    video_url       = Column(String(500))
    category        = Column(String(100))
    duration_minutes = Column(Integer)
    created_at      = Column(DateTime, default=datetime.utcnow)

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


class ProgramTemplate(Base):
    __tablename__ = "program_templates"

    id                         = Column(String, primary_key=True, default=new_uuid)
    title                      = Column(String(200), nullable=False)
    description                = Column(Text)
    category                   = Column(String(100))
    body_region                = Column(String(100))
    injury_type                = Column(String(100))
    functional_focus           = Column(String(200))
    recovery_phase             = Column(String(100))
    goals                      = Column(Text)
    ergonomic_recommendations  = Column(Text)
    precautions                = Column(Text)
    equipment_needed           = Column(Text)
    progression_criteria       = Column(Text)
    frequency_per_week         = Column(Integer, default=3)
    schedule_days              = Column(String(100))
    created_at                 = Column(DateTime, default=datetime.utcnow)

    exercises = relationship(
        "ProgramTemplateExercise",
        back_populates="program_template",
        cascade="all, delete-orphan",
        order_by="ProgramTemplateExercise.order",
    )


class ProgramTemplateExercise(Base):
    __tablename__ = "program_template_exercises"

    id                  = Column(String, primary_key=True, default=new_uuid)
    program_template_id = Column(String, ForeignKey("program_templates.id"), nullable=False)
    template_id         = Column(String, ForeignKey("exercise_templates.id"), nullable=False)
    order               = Column(Integer, default=0)

    program_template = relationship("ProgramTemplate", back_populates="exercises")
    template         = relationship("ExerciseTemplate")


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


class TherapistNote(Base):
    __tablename__ = "therapist_notes"

    id           = Column(String, primary_key=True, default=new_uuid)
    client_id    = Column(String, ForeignKey("clients.id"), nullable=False, index=True)
    therapist_id = Column(String, nullable=False)
    text         = Column(Text, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="notes")
