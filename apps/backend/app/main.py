from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routers import clients, submissions, templates, programs, dashboard, mobile

load_dotenv()

app = FastAPI(title="MyTherapyPath API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router,     prefix="/v1")
app.include_router(submissions.router, prefix="/v1")
app.include_router(templates.router,   prefix="/v1")
app.include_router(programs.router,    prefix="/v1")
app.include_router(dashboard.router,   prefix="/v1")
app.include_router(mobile.router,      prefix="/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
