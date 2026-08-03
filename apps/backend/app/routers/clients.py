from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[schemas.ClientOut])
def list_clients(therapist_id: str, db: Session = Depends(get_db)):
    return (
        db.query(models.Client)
        .options(joinedload(models.Client.program))
        .filter(models.Client.therapist_id == therapist_id)
        .order_by(models.Client.created_at.desc())
        .all()
    )


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
