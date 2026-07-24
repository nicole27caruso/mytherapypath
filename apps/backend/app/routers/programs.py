from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

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
    return prog


@router.post("", response_model=schemas.ProgramOut, status_code=201)
def create_or_replace_program(body: schemas.ProgramCreate, db: Session = Depends(get_db)):
    # Delete existing program for this client (replace model)
    existing = db.query(models.Program).filter(models.Program.client_id == body.client_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    prog = models.Program(
        client_id=body.client_id,
        name=body.name,
        frequency_per_week=body.frequency_per_week,
    )
    db.add(prog)
    db.flush()

    for i, template_id in enumerate(body.template_ids):
        pe = models.ProgramExercise(program_id=prog.id, template_id=template_id, order=i)
        db.add(pe)

    # Keep client.frequency in sync
    client = db.query(models.Client).filter(models.Client.id == body.client_id).first()
    if client:
        client.frequency = body.frequency_per_week

    db.commit()
    db.refresh(prog)
    return prog
