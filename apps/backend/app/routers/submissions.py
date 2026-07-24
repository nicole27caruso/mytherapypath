from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("", response_model=list[schemas.SubmissionOut])
def list_submissions(
    therapist_id: str,
    status: Optional[str] = Query(None, description="pending | approved | rejected"),
    client_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.Submission)
        .join(models.Client, models.Submission.client_id == models.Client.id)
        .filter(models.Client.therapist_id == therapist_id)
        .options(joinedload(models.Submission.client))
        .order_by(models.Submission.submitted_at.desc())
    )
    if status:
        q = q.filter(models.Submission.status == status)
    if client_id:
        q = q.filter(models.Submission.client_id == client_id)
    return q.all()


@router.get("/{submission_id}", response_model=schemas.SubmissionOut)
def get_submission(submission_id: str, db: Session = Depends(get_db)):
    sub = (
        db.query(models.Submission)
        .options(joinedload(models.Submission.client), joinedload(models.Submission.revision_of))
        .filter(models.Submission.id == submission_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


@router.post("", response_model=schemas.SubmissionOut, status_code=201)
def create_submission(body: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    sub = models.Submission(**body.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.patch("/{submission_id}/approve", response_model=schemas.SubmissionOut)
def approve_submission(submission_id: str, body: schemas.SubmissionApprove, db: Session = Depends(get_db)):
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.status = "approved"
    if body.note:
        sub.therapist_note = body.note
    db.commit()
    db.refresh(sub)
    return sub


@router.patch("/{submission_id}/reject", response_model=schemas.SubmissionOut)
def reject_submission(submission_id: str, body: schemas.SubmissionReject, db: Session = Depends(get_db)):
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.status = "rejected"
    sub.therapist_note = body.note
    db.commit()
    db.refresh(sub)
    return sub
