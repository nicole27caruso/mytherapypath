import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database import get_db
from app import models
from app.storage import save_submission_media
from app import scheduling

WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

router = APIRouter(prefix="/mobile", tags=["mobile"])


def _fmt_date(dt) -> str:
    if not dt:
        return ""
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"


def _persist_media(request: Request, file: UploadFile | None) -> str | None:
    if file is None or not file.filename:
        return None
    try:
        media_url = save_submission_media(file)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    # Blob Storage returns an already-absolute URL; local-disk fallback
    # returns a relative /media/... path that needs this server's host.
    if media_url.startswith("http://") or media_url.startswith("https://"):
        return media_url
    return f"{str(request.base_url).rstrip('/')}{media_url}"


def get_current_client(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.Client:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ").strip()

    session = db.query(models.ClientSession).filter(models.ClientSession.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid — please log in again")

    return session.client


class LoginBody(BaseModel):
    access_code: str


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    code = body.access_code.strip().upper()
    client = db.query(models.Client).filter(models.Client.access_code == code).first()
    if not client:
        raise HTTPException(status_code=401, detail="That access code wasn't recognized")

    session = models.ClientSession(client_id=client.id, token=secrets.token_hex(32))
    db.add(session)
    db.commit()

    return {"token": session.token, "client_id": client.id, "name": client.name.split()[0]}


@router.post("/logout", status_code=204)
def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        db.query(models.ClientSession).filter(models.ClientSession.token == token).delete()
        db.commit()
    return None


@router.get("/me")
def get_dashboard(client: models.Client = Depends(get_current_client), db: Session = Depends(get_db)):
    client_id = client.id

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

    now = datetime.utcnow()
    week_start = scheduling.week_start_utc(now)
    week_subs = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.submitted_at >= week_start)
        .filter(models.Submission.status != "rejected")
        .all()
    )
    # Exercises the therapist logged as done in-session count toward the same weekly
    # target the client sees -- otherwise a client who did it in clinic would still
    # look "behind" on their own app.
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

    # Status badge on each exercise card must reflect only THIS week's most recent
    # submission -- unlike weekly_count above, this needs every status (including
    # rejected) so an unrevised rejection from this week still shows correctly.
    week_status_by_name = {}
    for sub in (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.submitted_at >= week_start)
        .order_by(desc(models.Submission.submitted_at))
        .all()
    ):
        if sub.exercise_name not in week_status_by_name:
            week_status_by_name[sub.exercise_name] = sub.status

    # All-time, non-rejected submissions per exercise -- a rejection shouldn't
    # block an immediate revision, so it's excluded from the spacing gap the
    # same way it's already excluded from the weekly count above.
    all_nonrejected_subs = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.status != "rejected")
        .all()
    )
    last_submission_date_by_name = scheduling.latest_submission_date_by_exercise(all_nonrejected_subs)

    exercises = []
    total_weekly_target = 0
    total_weekly_count = 0
    if program:
        for pe in sorted(program.exercises, key=lambda x: x.order):
            weekly_target = scheduling.effective_target(pe.frequency_per_week, program.frequency_per_week)
            weekly_count = weekly_counts_by_name.get(pe.template.title, 0)
            total_weekly_target += weekly_target
            total_weekly_count += min(weekly_count, weekly_target)
            days_until_available = scheduling.days_until_available(
                last_submission_date_by_name.get(pe.template.title),
                pe.min_days_between,
                now.date(),
            )
            exercises.append({
                "id": pe.template.id,
                "title": pe.template.title,
                "description": pe.template.description,
                "instructions": pe.template.instructions,
                "video_url": pe.template.video_url,
                "video_source": pe.template.video_source,
                "category": pe.template.category,
                "duration_minutes": pe.template.duration_minutes,
                "weekly_target": weekly_target,
                "weekly_count": weekly_count,
                "due_status": scheduling.compute_due_status(weekly_count, weekly_target, iso_weekday),
                "min_days_between": pe.min_days_between,
                "days_until_available": days_until_available,
                "status": week_status_by_name.get(pe.template.title),
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

    # Real weekly/lifetime activity, computed from submissions rather than the
    # static seeded `completed_this_week` column (which nothing ever updates).
    completed_this_week = len({s.exercise_name for s in week_subs})
    week_activity = sorted(
        {s.submitted_at.strftime('%a') for s in week_subs if s.submitted_at},
        key=lambda d: WEEKDAY_ORDER.index(d) if d in WEEKDAY_ORDER else 99,
    )

    total_completed = (
        db.query(models.Submission)
        .filter(models.Submission.client_id == client_id)
        .filter(models.Submission.status != "rejected")
        .count()
    )

    therapist = db.query(models.Therapist).filter(models.Therapist.id == client.therapist_id).first()

    # "How did last week go" summary -- shown once per week boundary crossed, then
    # dismissed via /me/ack-weekly-summary. A brand-new client has nothing to
    # summarize yet, so the first-ever fetch just starts tracking from now instead
    # of surfacing a summary for a week that predates the feature entirely.
    today = now.date()
    weekly_summary = None
    if client.last_summary_week_start is None:
        client.last_summary_week_start = today - timedelta(days=today.weekday())
        db.commit()
    elif client.last_summary_week_start < week_start.date():
        prev_week_start = week_start - timedelta(days=7)
        prev_subs = (
            db.query(models.Submission)
            .filter(models.Submission.client_id == client_id)
            .filter(models.Submission.submitted_at >= prev_week_start)
            .filter(models.Submission.submitted_at < week_start)
            .filter(models.Submission.status != "rejected")
            .all()
        )
        prev_counts_by_name = scheduling.bucket_submissions_by_exercise(prev_subs)
        summary_exercises = []
        summary_total_target = 0
        summary_total_count = 0
        if program:
            for pe in sorted(program.exercises, key=lambda x: x.order):
                target = scheduling.effective_target(pe.frequency_per_week, program.frequency_per_week)
                count = prev_counts_by_name.get(pe.template.title, 0)
                summary_total_target += target
                summary_total_count += min(count, target)
                summary_exercises.append({
                    "title": pe.template.title,
                    "count": count,
                    "target": target,
                })
        weekly_summary = {
            "week_start": prev_week_start.date().isoformat(),
            "week_end": (week_start - timedelta(days=1)).date().isoformat(),
            "total_completed": summary_total_count,
            "total_target": summary_total_target,
            "exercises": summary_exercises,
        }

    return {
        "client": {
            "name": client.name.split()[0],
            "full_name": client.name,
            "age": client.age,
            "dob": _fmt_date(client.dob) if hasattr(client, 'dob') and client.dob else None,
            "condition": client.condition,
            "diagnosis": client.diagnosis,
            "frequency": client.frequency,
            "completed_this_week": completed_this_week,
            "week_activity": week_activity,
            "total_weekly_target": total_weekly_target,
            "total_weekly_count": total_weekly_count,
            "next_session": client.next_session,
            "stars_total": total_completed * 5,
            "therapist_name": therapist.name if therapist else None,
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
        "weekly_summary": weekly_summary,
    }


@router.post("/me/ack-weekly-summary", status_code=204)
def ack_weekly_summary(
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Dismiss the current weekly_summary so /me stops returning it until the next week boundary."""
    client.last_summary_week_start = scheduling.week_start_utc(datetime.utcnow()).date()
    db.commit()
    return None


@router.post("/me/submit", status_code=201)
def submit_exercise(
    request: Request,
    exercise_name: str = Form(...),
    media_type: str = Form("video"),
    file: UploadFile | None = File(None),
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    media_url = _persist_media(request, file)
    sub = models.Submission(
        client_id=client.id,
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
    client: models.Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    original = db.query(models.Submission).filter(models.Submission.id == original_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original submission not found")
    if original.client_id != client.id:
        raise HTTPException(status_code=404, detail="Original submission not found")

    media_url = _persist_media(request, file)
    sub = models.Submission(
        client_id=client.id,
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
