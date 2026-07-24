from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from pydantic import BaseModel

from app.database import get_db
from app import models

router = APIRouter(prefix="/mobile", tags=["mobile"])


def _fmt_date(dt) -> str:
    if not dt:
        return ""
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"


class SubmitBody(BaseModel):
    exercise_name: str
    media_type: str = "video"


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
                "duration_minutes": pe.template.duration_minutes,
            })

    return {
        "client": {
            "name": client.name.split()[0],
            "full_name": client.name,
            "age": client.age,
        },
        "exercises": exercises,
        "messages": messages,
    }


@router.post("/{client_id}/submit", status_code=201)
def submit_exercise(client_id: str, body: SubmitBody, db: Session = Depends(get_db)):
    sub = models.Submission(
        client_id=client_id,
        exercise_name=body.exercise_name,
        media_type=body.media_type,
        status="pending",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "status": sub.status}


@router.post("/submissions/{original_id}/resubmit", status_code=201)
def resubmit_exercise(original_id: str, body: SubmitBody, db: Session = Depends(get_db)):
    original = db.query(models.Submission).filter(models.Submission.id == original_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original submission not found")

    sub = models.Submission(
        client_id=original.client_id,
        exercise_name=original.exercise_name,
        media_type=body.media_type,
        status="pending",
        revision_of_id=original_id,
        revision_number=(original.revision_number or 1) + 1,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "status": sub.status, "revision_number": sub.revision_number}
