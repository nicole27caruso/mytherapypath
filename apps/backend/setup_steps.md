# Backend Setup Steps

Run these commands from apps/backend/ in order.

## 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

## 2. Install packages
pip install -r requirements.txt

## 3. Copy and fill in .env
copy .env.example .env
# Then open .env and set your PostgreSQL password

## 4. Create the database (run once)
psql -U postgres -c "CREATE DATABASE mytherapypath;"

## 5. Initialize Alembic (run once)
alembic init alembic

## 6. Edit alembic/env.py — replace the two lines shown:
# Replace: target_metadata = None
# With:
#   from app.models import Base
#   target_metadata = Base.metadata

## 7. Edit alembic.ini — set your database URL:
# Find: sqlalchemy.url = driver://user:pass@localhost/dbname
# Replace with: sqlalchemy.url = postgresql://postgres:yourpassword@localhost:5432/mytherapypath

## 8. Generate and run the first migration
alembic revision --autogenerate -m "initial tables"
alembic upgrade head

## 9. Start the API server
uvicorn app.main:app --reload --port 8000

# API docs auto-generated at: http://localhost:8000/docs
