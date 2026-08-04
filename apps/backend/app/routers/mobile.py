from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database import get_db
from app import models
from app.storage import save_submission_media

router = APIRouter(prefix="/mobile", tags=["mobile"])


def _fmt_date(dt) -> str:
    if not dt:
        return ""
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"


def _persist_media(request: Request, file: UploadFile | None) -> str | None:
    if file is None or not file.filename:
        return None
    try:
        media_path = save_submission_media(file)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    return f"{str(request.base_url).rstrip('/')}{media_path}"


@router.get("/{client_id}")
def get_dashboard(client_id: str, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    program = (
        db.query(models.Program)
        .options(
            joinedload(models.Program.exercises).joinedload(models.ProgramExercise.template)
        )
        .filter(models.Program.client_id == client_id)
        .first()
    )

    reviewed_subs = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.status.in_(["approved", "rejected"]))
        .order_by(desc(models.Submission.submitted_at))
        .all()
    )

    notes = (
        db.query(models.TherapistNote)
        .filter(models.TherapistNote.client_id == client_id)
        .order_by(desc(models.TherapistNote.created_at))
        .all()
    )

    # IDs of rejected submissions that already have a revision
    revised_ids = {
        s.revision_of_id
        for s in db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.revision_of_id.isnot(None))
        .all()
    }

    messages = []
    for sub in reviewed_subs:
        if sub.status == "approved":
            messages.append({
                "kind": "approved",
                "id": sub.id,
                "exercise_name": sub.exercise_name,
                "therapist_note": sub.therapist_note or "",
                "date": _fmt_date(sub.submitted_at),
                "_sort": sub.submitted_at.isoformat() if sub.submitted_at else "",
            })
        elif sub.status == "rejected":
            messages.append({
                "kind": "rejected",
                "id": sub.id,
                "exercise_name": sub.exercise_name,
                "rejection_note": sub.therapist_note or "",
                "date": _fmt_date(sub.submitted_at),
                "has_revision": sub.id in revised_ids,
                "_sort": sub.submitted_at.isoformat() if sub.submitted_at else "",
            })

    for note in notes:
        messages.append({
            "kind": "note",
            "id": note.id,
            "text": note.text,
            "date": _fmt_date(note.created_at),
            "_sort": note.created_at.isoformat() if note.created_at else "",
        })

    messages.sort(key=lambda x: x.pop("_sort", ""), reverse=True)

    exercises = []
    if program:
        for pe in sorted(program.exercises, key=lambda x: x.order):
            exercises.append({
                "id": pe.template.id,
                "title": pe.template.title,
                "description": pe.template.description,
                "instructions": pe.template.instructions,
                "video_url": pe.template.video_url,
                "category": pe.template.category,
                "duration_minutes": pe.template.duration_minutes,
            })

    latest_submissions = {}
    for sub in (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .order_by(desc(models.Submission.submitted_at))
        .all()
    ):
        if sub.exercise_name not in latest_submissions:
            latest_submissions[sub.exercise_name] = sub

    submitted_exercises = [
        {
            "exercise_name": sub.exercise_name,
            "status": sub.status,
            "media_type": sub.media_type,
            "media_url": sub.media_url,
            "submitted_at": _fmt_date(sub.submitted_at),
        }
        for sub in latest_submissions.values()
    ]

    return {
        "client": {
            "name": client.name.split()[0],
            "full_name": client.name,
            "age": client.age,
            "dob": _fmt_date(client.dob) if hasattr(client, 'dob') and client.dob else None,
            "condition": client.condition,
            "diagnosis": client.diagnosis,
            "frequency": client.frequency,
            "completed_this_week": client.completed_this_week,
            "next_session": client.next_session,
            "stars_total": (client.completed_this_week or 0) * 5,
            "program": {
                "name": program.name if program else None,
                "frequency_per_week": program.frequency_per_week if program else None,
                "schedule_days": program.schedule_days if program else None,
                "created_at": _fmt_date(program.created_at) if program and program.created_at else None,
            },
            "program_started": _fmt_date(program.created_at) if program and program.created_at else None,
        },
        "exercises": exercises,
        "submitted_exercises": submitted_exercises,
        "messages": messages,
    }


@router.post("/{client_id}/submit", status_code=201)
def submit_exercise(
    client_id: str,
    request: Request,
    exercise_name: str = Form(...),
    media_type: str = Form("video"),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    media_url = _persist_media(request, file)
    sub = models.Submission(
        client_id=client_id,
        exercise_name=exercise_name,
        media_type=media_type,
        media_url=media_url,
        status="pending",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "status": sub.status, "media_url": sub.media_url}


@router.post("/submissions/{original_id}/resubmit", status_code=201)
def resubmit_exercise(
    original_id: str,
    request: Request,
    exercise_name: str = Form(...),
    media_type: str = Form("video"),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    original = db.query(models.Submission).filter(models.Submission.id == original_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original submission not found")

    media_url = _persist_media(request, file)
    sub = models.Submission(
        client_id=original.client_id,
        exercise_name=exercise_name or original.exercise_name,
        media_type=media_type,
        media_url=media_url,
        status="pending",
        revision_of_id=original_id,
        revision_number=(original.revision_number or 1) + 1,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "status": sub.status, "revision_number": sub.revision_number, "media_url": sub.media_url}
