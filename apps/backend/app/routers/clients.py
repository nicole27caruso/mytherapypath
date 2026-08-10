from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas, scheduling

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[schemas.ClientOut])
def list_clients(therapist_id: str, db: Session = Depends(get_db)):
    clients = (
        db.query(models.Client)
        .options(joinedload(models.Client.program).joinedload(models.Program.exercises).joinedload(models.ProgramExercise.template))
        .filter(models.Client.therapist_id == therapist_id)
        .order_by(models.Client.created_at.desc())
        .all()
    )
    if not clients:
        return clients

    # Same fix as /dashboard: completed_this_week on the row itself is a
    # static seeded column nothing updates -- override it per-client with the
    # real count from this week's non-rejected submissions before returning.
    week_start = scheduling.week_start_utc(datetime.utcnow())
    week_subs = (
        db.query(models.Submission)
        .filter(models.Submission.client_id.in_([c.id for c in clients]))
        .filter(models.Submission.submitted_at >= week_start)
        .filter(models.Submission.status != "rejected")
        .all()
    )
    subs_by_client: dict[str, list] = {}
    for s in week_subs:
        subs_by_client.setdefault(s.client_id, []).append(s)

    for c in clients:
        counts_by_name = scheduling.bucket_submissions_by_exercise(subs_by_client.get(c.id, []))
        if c.program and c.program.exercises:
            c.completed_this_week = sum(
                min(counts_by_name.get(pe.template.title, 0), scheduling.effective_target(pe.frequency_per_week, c.program.frequency_per_week))
                for pe in c.program.exercises
            )
        else:
            c.completed_this_week = 0

    return clients


@router.get("/{client_id}", response_model=schemas.ClientDetail)
def get_client(client_id: str, db: Session = Depends(get_db)):
    client = (
        db.query(models.Client)
        .options(
            joinedload(models.Client.program).joinedload(models.Program.exercises).joinedload(models.ProgramExercise.template),
            joinedload(models.Client.submissions),
            joinedload(models.Client.notes),
        )
        .filter(models.Client.id == client_id)
        .first()
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("", response_model=schemas.ClientOut, status_code=201)
def create_client(body: schemas.ClientCreate, db: Session = Depends(get_db)):
    client = models.Client(**body.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.patch("/{client_id}", response_model=schemas.ClientOut)
def update_client(client_id: str, body: schemas.ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: str, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()


@router.post("/{client_id}/notes", response_model=schemas.NoteOut, status_code=201)
def add_note(client_id: str, body: schemas.NoteCreate, db: Session = Depends(get_db)):
    note = models.TherapistNote(client_id=client_id, **body.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{client_id}/notes", response_model=list[schemas.NoteOut])
def list_notes(client_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.TherapistNote)
        .filter(models.TherapistNote.client_id == client_id)
        .order_by(models.TherapistNote.created_at.desc())
        .all()
    )


@router.post("/{client_id}/sessions", response_model=schemas.ClinicSessionOut, status_code=201)
def log_clinic_session(client_id: str, body: schemas.ClinicSessionCreate, db: Session = Depends(get_db)):
    """Log an exercise as completed during an in-person clinic visit (as opposed to a remote proof submission)."""
    session = models.ClinicSession(client_id=client_id, **body.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{client_id}/sessions", response_model=list[schemas.ClinicSessionOut])
def list_clinic_sessions(client_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.ClinicSession)
        .filter(models.ClinicSession.client_id == client_id)
        .order_by(models.ClinicSession.session_date.desc())
        .all()
    )


@router.get("/{client_id}/weekly-completion", response_model=list[schemas.WeeklyCompletionWeek])
def weekly_completion(client_id: str, weeks: int = 8, db: Session = Depends(get_db)):
    """Last N weeks (most recent first) of exercise-completion activity for this client.

    A day counts as "completed" if it has an approved proof submission or a
    logged in-clinic session — the two ways an exercise can be marked done.
    Target is the sum of each currently-assigned exercise's weekly frequency
    (falling back to the program/client-level frequency), applied uniformly
    across the history since frequency history isn't tracked.
    """
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    program = (
        db.query(models.Program)
        .options(joinedload(models.Program.exercises))
        .filter(models.Program.client_id == client_id)
        .first()
    )
    if program and program.exercises:
        target = sum(pe.frequency_per_week or program.frequency_per_week or 3 for pe in program.exercises)
    elif program:
        target = program.frequency_per_week
    else:
        target = client.frequency

    completed_dates: set[date] = set()
    for sub in (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id, models.Submission.status == "approved")
        .all()
    ):
        if sub.submitted_at:
            completed_dates.add(sub.submitted_at.date())
    for session in db.query(models.ClinicSession).filter(models.ClinicSession.client_id == client_id).all():
        completed_dates.add(session.session_date)

    today = date.today()
    current_week_start = today - timedelta(days=today.weekday())

    result = []
    for i in range(weeks):
        week_start = current_week_start - timedelta(weeks=i)
        week_end = week_start + timedelta(days=6)
        completed = sum(1 for d in completed_dates if week_start <= d <= week_end)
        result.append(schemas.WeeklyCompletionWeek(
            week_start=week_start, week_end=week_end, completed=completed, target=target,
        ))
    return result
