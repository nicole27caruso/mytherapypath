from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardStats)
def get_dashboard(therapist_id: str, db: Session = Depends(get_db)):
    clients = db.query(models.Client).filter(models.Client.therapist_id == therapist_id).all()
    active = [c for c in clients if c.status == "active"]
    inactive = [c for c in clients if c.status == "inactive"]

    submission_statuses = (
        db.query(models.Submission.status)
        .join(models.Client, models.Submission.client_id == models.Client.id)
        .filter(models.Client.therapist_id == therapist_id)
        .all()
    )
    statuses = [s[0] for s in submission_statuses]

    avg_completion = 0.0
    if active:
        total = sum(
            min((c.completed_this_week / max(c.frequency, 1)) * 100, 100)
            for c in active
        )
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
