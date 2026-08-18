from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas, scheduling

router = APIRouter(prefix="/programs", tags=["programs"])


@router.get("/{client_id}", response_model=schemas.ProgramOut)
def get_program(client_id: str, db: Session = Depends(get_db)):
    prog = (
        db.query(models.Program)
        .options(
            joinedload(models.Program.exercises).joinedload(models.ProgramExercise.template)
        )
        .filter(models.Program.client_id == client_id)
        .first()
    )
    if not prog:
        raise HTTPException(status_code=404, detail="No program for this client")

    now = datetime.utcnow()
    week_start = scheduling.week_start_utc(now)
    week_subs = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.submitted_at >= week_start)
        .filter(models.Submission.status != "rejected")
        .all()
    )
    week_sessions = (
        db.query(models.ClinicSession)
        .filter(models.ClinicSession.client_id == client_id)
        .filter(models.ClinicSession.session_date >= week_start.date())
        .all()
    )
    weekly_counts_by_name = scheduling.bucket_submissions_by_exercise(week_subs)
    for name, count in scheduling.bucket_submissions_by_exercise(week_sessions).items():
        weekly_counts_by_name[name] = weekly_counts_by_name.get(name, 0) + count
    iso_weekday = now.isoweekday()

    all_nonrejected_subs = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.status != "rejected")
        .all()
    )
    last_submission_date_by_name = scheduling.latest_submission_date_by_exercise(all_nonrejected_subs)

    for pe in prog.exercises:
        target = scheduling.effective_target(pe.frequency_per_week, prog.frequency_per_week)
        count = weekly_counts_by_name.get(pe.template.title, 0)
        pe.weekly_target = target
        pe.weekly_count = count
        pe.due_status = scheduling.compute_due_status(count, target, iso_weekday)
        pe.days_until_available = scheduling.days_until_available(
            last_submission_date_by_name.get(pe.template.title),
            pe.min_days_between,
            now.date(),
        )

    return prog


@router.post("", response_model=schemas.ProgramOut, status_code=201)
def create_or_replace_program(body: schemas.ProgramCreate, db: Session = Depends(get_db)):
    if body.exercise_frequencies is not None and len(body.exercise_frequencies) != len(body.template_ids):
        raise HTTPException(
            status_code=400,
            detail="exercise_frequencies must be the same length as template_ids",
        )
    if body.exercise_min_days is not None and len(body.exercise_min_days) != len(body.template_ids):
        raise HTTPException(
            status_code=400,
            detail="exercise_min_days must be the same length as template_ids",
        )

    # Delete existing program for this client (replace model)
    existing = db.query(models.Program).filter(models.Program.client_id == body.client_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    prog = models.Program(
        client_id=body.client_id,
        name=body.name,
        frequency_per_week=body.frequency_per_week,
        notes=body.notes,
        schedule_days=body.schedule_days,
    )
    db.add(prog)
    db.flush()

    for i, template_id in enumerate(body.template_ids):
        frequency = body.exercise_frequencies[i] if body.exercise_frequencies else None
        min_days = body.exercise_min_days[i] if body.exercise_min_days else None
        pe = models.ProgramExercise(
            program_id=prog.id, template_id=template_id, order=i,
            frequency_per_week=frequency, min_days_between=min_days,
        )
        db.add(pe)

    # Keep client.frequency in sync
    client = db.query(models.Client).filter(models.Client.id == body.client_id).first()
    if client:
        client.frequency = body.frequency_per_week

    db.commit()
    db.refresh(prog)
    return prog


@router.patch("/exercises/{program_exercise_id}", response_model=schemas.ProgramExerciseOut)
def update_program_exercise_frequency(
    program_exercise_id: str,
    body: schemas.ProgramExerciseFrequencyUpdate,
    db: Session = Depends(get_db),
):
    """Adjust a single assigned exercise's weekly target in place — does not touch the
    parent Program row, so Program.created_at (and the rest of the program) is untouched."""
    pe = (
        db.query(models.ProgramExercise)
        .options(joinedload(models.ProgramExercise.template))
        .filter(models.ProgramExercise.id == program_exercise_id)
        .first()
    )
    if not pe:
        raise HTTPException(status_code=404, detail="Program exercise not found")

    pe.frequency_per_week = body.frequency_per_week
    pe.min_days_between = body.min_days_between
    db.commit()
    db.refresh(pe)

    prog = db.query(models.Program).filter(models.Program.id == pe.program_id).first()
    now = datetime.utcnow()
    week_subs = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == prog.client_id)
        .filter(models.Submission.submitted_at >= scheduling.week_start_utc(now))
        .filter(models.Submission.status != "rejected")
        .filter(models.Submission.exercise_name == pe.template.title)
        .all()
    )
    week_sessions = (
        db.query(models.ClinicSession)
        .filter(models.ClinicSession.client_id == prog.client_id)
        .filter(models.ClinicSession.session_date >= scheduling.week_start_utc(now).date())
        .filter(models.ClinicSession.exercise_name == pe.template.title)
        .all()
    )
    target = scheduling.effective_target(pe.frequency_per_week, prog.frequency_per_week)
    count = len(week_subs) + len(week_sessions)
    pe.weekly_target = target
    pe.weekly_count = count
    pe.due_status = scheduling.compute_due_status(count, target, now.isoweekday())

    last_sub = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == prog.client_id)
        .filter(models.Submission.status != "rejected")
        .filter(models.Submission.exercise_name == pe.template.title)
        .order_by(models.Submission.submitted_at.desc())
        .first()
    )
    last_date = last_sub.submitted_at.date() if last_sub and last_sub.submitted_at else None
    pe.days_until_available = scheduling.days_until_available(last_date, pe.min_days_between, now.date())
    return pe
