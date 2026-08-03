from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/program-templates", tags=["program_templates"])


@router.get("", response_model=list[schemas.ProgramTemplateOut])
def list_program_templates(db: Session = Depends(get_db)):
    return (
        db.query(models.ProgramTemplate)
        .options(joinedload(models.ProgramTemplate.exercises).joinedload(models.ProgramTemplateExercise.template))
        .order_by(models.ProgramTemplate.title)
        .all()
    )


@router.get("/{template_id}", response_model=schemas.ProgramTemplateOut)
def get_program_template(template_id: str, db: Session = Depends(get_db)):
    template = (
        db.query(models.ProgramTemplate)
        .options(joinedload(models.ProgramTemplate.exercises).joinedload(models.ProgramTemplateExercise.template))
        .filter(models.ProgramTemplate.id == template_id)
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Program template not found")
    return template


@router.post("", response_model=schemas.ProgramTemplateOut, status_code=201)
def create_program_template(body: schemas.ProgramTemplateCreate, db: Session = Depends(get_db)):
    template = models.ProgramTemplate(
        title=body.title,
        description=body.description,
        category=body.category,
        body_region=body.body_region,
        injury_type=body.injury_type,
        functional_focus=body.functional_focus,
        recovery_phase=body.recovery_phase,
        goals=body.goals,
        ergonomic_recommendations=body.ergonomic_recommendations,
        precautions=body.precautions,
        equipment_needed=body.equipment_needed,
        progression_criteria=body.progression_criteria,
        frequency_per_week=body.frequency_per_week,
        schedule_days=body.schedule_days,
    )
    db.add(template)
    db.flush()

    for index, template_id in enumerate(body.template_ids):
        db.add(
            models.ProgramTemplateExercise(
                program_template_id=template.id,
                template_id=template_id,
                order=index,
            )
        )

    db.commit()
    db.refresh(template)
    return template


@router.patch("/{template_id}", response_model=schemas.ProgramTemplateOut)
def update_program_template(template_id: str, body: schemas.ProgramTemplateUpdate, db: Session = Depends(get_db)):
    template = db.query(models.ProgramTemplate).filter(models.ProgramTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Program template not found")

    data = body.model_dump(exclude_unset=True)
    template_ids = data.pop("template_ids", None)
    for field, value in data.items():
        setattr(template, field, value)

    if template_ids is not None:
        db.query(models.ProgramTemplateExercise).filter(models.ProgramTemplateExercise.program_template_id == template.id).delete()
        db.flush()
        for index, exercise_template_id in enumerate(template_ids):
            db.add(
                models.ProgramTemplateExercise(
                    program_template_id=template.id,
                    template_id=exercise_template_id,
                    order=index,
                )
            )

    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_program_template(template_id: str, db: Session = Depends(get_db)):
    template = db.query(models.ProgramTemplate).filter(models.ProgramTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Program template not found")
    db.delete(template)
    db.commit()
