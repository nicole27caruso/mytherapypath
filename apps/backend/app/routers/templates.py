from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.storage import save_exercise_video

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[schemas.TemplateOut])
def list_templates(
    therapist_id: Optional[str] = Query(None, description="Include this therapist's private additions alongside the shared library"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Case-insensitive match against title"),
    db: Session = Depends(get_db),
):
    q = db.query(models.ExerciseTemplate)
    if therapist_id:
        q = q.filter(or_(models.ExerciseTemplate.therapist_id.is_(None), models.ExerciseTemplate.therapist_id == therapist_id))
    else:
        q = q.filter(models.ExerciseTemplate.therapist_id.is_(None))
    if category:
        q = q.filter(models.ExerciseTemplate.category == category)
    if search:
        q = q.filter(models.ExerciseTemplate.title.ilike(f"%{search}%"))
    return q.order_by(models.ExerciseTemplate.title).all()


@router.get("/{template_id}", response_model=schemas.TemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db)):
    t = db.query(models.ExerciseTemplate).filter(models.ExerciseTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t


@router.post("", response_model=schemas.TemplateOut, status_code=201)
def create_template(body: schemas.TemplateCreate, db: Session = Depends(get_db)):
    t = models.ExerciseTemplate(**body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.patch("/{template_id}", response_model=schemas.TemplateOut)
def update_template(template_id: str, body: schemas.TemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(models.ExerciseTemplate).filter(models.ExerciseTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    t = db.query(models.ExerciseTemplate).filter(models.ExerciseTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    in_use = (
        db.query(models.Client.name)
        .join(models.Program, models.Program.client_id == models.Client.id)
        .join(models.ProgramExercise, models.ProgramExercise.program_id == models.Program.id)
        .filter(models.ProgramExercise.template_id == template_id)
        .distinct()
        .all()
    )
    if in_use:
        names = ", ".join(name for (name,) in in_use)
        raise HTTPException(
            status_code=409,
            detail=f"Can't delete — this exercise is currently assigned to {names}. Remove it from their program(s) first.",
        )

    db.delete(t)
    db.commit()


@router.post("/upload-video")
def upload_template_video(request: Request, file: UploadFile = File(...)):
    """Upload a therapist's own exercise video (capped at ~100MB) and return its URL.

    Call this first, then create/update the template with the returned url
    and video_source="upload".
    """
    try:
        media_url = save_exercise_video(file)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    if media_url.startswith("http://") or media_url.startswith("https://"):
        return {"url": media_url}
    return {"url": f"{str(request.base_url).rstrip('/')}{media_url}"}
