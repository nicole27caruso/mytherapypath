from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas, scheduling

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardStats)
def get_dashboard(therapist_id: str, db: Session = Depends(get_db)):
    clients = (
        db.query(models.Client)
        .options(joinedload(models.Client.program).joinedload(models.Program.exercises).joinedload(models.ProgramExercise.template))
        .filter(models.Client.therapist_id == therapist_id)
        .all()
    )
    active = [c for c in clients if c.status == "active"]
    inactive = [c for c in clients if c.status == "inactive"]

    submission_statuses = (
        db.query(models.Submission.status)
        .join(models.Client, models.Submission.client_id == models.Client.id)
        .filter(models.Client.therapist_id == therapist_id)
        .all()
    )
    statuses = [s[0] for s in submission_statuses]

    # completed_this_week on the Client row is a static seeded column that
    # nothing ever updates -- compute the real figure from this week's actual
    # non-rejected submissions instead, same method mobile.py uses.
    avg_completion = 0.0
    if active:
        week_start = scheduling.week_start_utc(datetime.utcnow())
        week_subs = (
            db.query(models.Submission)
            .filter(models.Submission.client_id.in_([c.id for c in active]))
            .filter(models.Submission.submitted_at >= week_start)
            .filter(models.Submission.status != "rejected")
            .all()
        )
        subs_by_client: dict[str, list] = {}
        for s in week_subs:
            subs_by_client.setdefault(s.client_id, []).append(s)

        total = 0.0
        for c in active:
            counts_by_name = scheduling.bucket_submissions_by_exercise(subs_by_client.get(c.id, []))
            if c.program and c.program.exercises:
                count = sum(
                    min(counts_by_name.get(pe.template.title, 0), scheduling.effective_target(pe.frequency_per_week, c.program.frequency_per_week))
                    for pe in c.program.exercises
                )
                target = sum(scheduling.effective_target(pe.frequency_per_week, c.program.frequency_per_week) for pe in c.program.exercises)
            else:
                count = 0
                target = c.frequency
            total += min((count / max(target, 1)) * 100, 100)
        avg_completion = round(total / len(active), 1)

    return schemas.DashboardStats(
        active_clients=len(active),
        inactive_clients=len(inactive),
        total_clients=len(clients),
        pending_submissions=statuses.count("pending"),
        approved_submissions=statuses.count("approved"),
        rejected_submissions=statuses.count("rejected"),
        avg_completion_pct=avg_completion,
    )
