"""
One-time seed script — loads mock data into the database.
Safe to re-run: skips if clients already exist.
Run from apps/backend/ with venv active:
    python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app import models
from datetime import datetime

db = SessionLocal()

if db.query(models.Client).count() > 0:
    print("Database already seeded — skipping.")
    db.close()
    sys.exit(0)

THERAPIST_ID = "therapist-1"

# ── Exercise Templates ────────────────────────────────────────────────────────

EXERCISES = {
    "Pinch and Release":   {"instructions": "Pick up small objects using a pinch grip and release into a container.", "duration": 5},
    "Bead Threading":      {"instructions": "Thread large plastic beads onto a lace or shoelace.", "duration": 5},
    "Playdough Squeeze":   {"instructions": "Roll, squeeze, and flatten playdough into balls and snakes.", "duration": 5},
    "Scissors Practice":   {"instructions": "Cut along straight and curved printed lines with child-safe scissors.", "duration": 5},
    "Mirror Therapy":      {"instructions": "Use mirror box for visual feedback — focus on symmetrical arm movements.", "duration": 10},
    "Ball Squeeze Series": {"instructions": "Squeeze therapy ball with increasing resistance, 3 sets of 15 reps.", "duration": 10},
    "Passive ROM":         {"instructions": "Passive range-of-motion for shoulder and elbow — caregiver assisted.", "duration": 15},
    "Wrist Rotation":      {"instructions": "Slow controlled wrist rotations, 3 sets of 10 reps each direction.", "duration": 10},
    "Sensory Bin Activity":{"instructions": "Explore rice, dried beans, or kinetic sand with hands; hide and find objects.", "duration": 8},
    "Tactile Cards":       {"instructions": "Match textures by touch without looking (soft, rough, bumpy, smooth).", "duration": 7},
    "Weighted Lap Pad":    {"instructions": "Calming deep pressure using weighted lap pad — seated at table.", "duration": 5},
    "Deep Pressure Input": {"instructions": "Firm hand-over-hand pressure on arms and legs for body awareness.", "duration": 5},
    "Ball Squeeze":        {"instructions": "Grip therapy ball, hold 5 seconds, release — 3 sets of 10.", "duration": 8},
    "Wrist Curls":         {"instructions": "Light resistance wrist curls, palms up and palms down alternating.", "duration": 8},
    "Finger Extensions":   {"instructions": "Extend fingers against resistance band, 3 sets of 12 reps.", "duration": 7},
    "Grip Training":       {"instructions": "Forearm grip device at 50% resistance — increase each week.", "duration": 7},
    "Balance Board Routine":{"instructions": "Stand on balance board and maintain center position for 30 seconds, 5 reps.", "duration": 8},
    "Bean Bag Toss":       {"instructions": "Toss and catch bean bags with alternating hands at increasing distance.", "duration": 7},
    "Jump Rope":           {"instructions": "Basic jump rope with two-foot landing, 3 sets of 20 jumps with rest.", "duration": 5},
    "Coordination Drills": {"instructions": "Agility ladder footwork drills for bilateral foot-eye coordination.", "duration": 5},
}

template_map = {}
for name, meta in EXERCISES.items():
    t = models.ExerciseTemplate(title=name, instructions=meta["instructions"], duration_minutes=meta["duration"])
    db.add(t)
    db.flush()
    template_map[name] = t.id

print(f"  {len(template_map)} exercise templates")

# ── Clients ───────────────────────────────────────────────────────────────────

clients_data = [
    {"id": "1", "name": "Emma Thompson",   "age": 8,  "condition": "Fine Motor Skills",        "color": "bg-purple-100 text-purple-700", "frequency": 3, "completed_this_week": 2, "next_session": "2026-07-01", "status": "active"},
    {"id": "2", "name": "James Rodriguez", "age": 35, "condition": "Post-Stroke Recovery",     "color": "bg-blue-100 text-blue-700",    "frequency": 5, "completed_this_week": 4, "next_session": "2026-06-30", "status": "active"},
    {"id": "3", "name": "Lily Chen",       "age": 6,  "condition": "Sensory Processing",       "color": "bg-pink-100 text-pink-700",    "frequency": 3, "completed_this_week": 3, "next_session": "2026-07-02", "status": "active"},
    {"id": "4", "name": "Michael Davis",   "age": 52, "condition": "Hand Rehabilitation",      "color": "bg-gray-100 text-gray-700",    "frequency": 4, "completed_this_week": 0, "next_session": "2026-07-05", "status": "inactive"},
    {"id": "5", "name": "Sophie Williams", "age": 10, "condition": "Coordination Development", "color": "bg-teal-100 text-teal-700",    "frequency": 2, "completed_this_week": 1, "next_session": "2026-07-03", "status": "active"},
]

for c in clients_data:
    db.add(models.Client(therapist_id=THERAPIST_ID, **c))
db.flush()
print(f"  {len(clients_data)} clients")

# ── Programs ──────────────────────────────────────────────────────────────────

CLIENT_PROGRAMS = {
    "1": {"name": "Pediatric Fine Motor Program",    "frequency": 3, "exercises": ["Pinch and Release", "Bead Threading", "Playdough Squeeze", "Scissors Practice"]},
    "2": {"name": "Adult Stroke Rehab Phase 2",      "frequency": 5, "exercises": ["Mirror Therapy", "Ball Squeeze Series", "Passive ROM", "Wrist Rotation"]},
    "3": {"name": "Sensory Integration Basics",      "frequency": 3, "exercises": ["Sensory Bin Activity", "Tactile Cards", "Weighted Lap Pad", "Deep Pressure Input"]},
    "4": {"name": "Post-Surgery Hand Recovery",      "frequency": 4, "exercises": ["Ball Squeeze", "Wrist Curls", "Finger Extensions", "Grip Training"]},
    "5": {"name": "Pediatric Coordination Program",  "frequency": 2, "exercises": ["Balance Board Routine", "Bean Bag Toss", "Jump Rope", "Coordination Drills"]},
}

for client_id, prog in CLIENT_PROGRAMS.items():
    p = models.Program(client_id=client_id, name=prog["name"], frequency_per_week=prog["frequency"])
    db.add(p)
    db.flush()
    for i, ex_name in enumerate(prog["exercises"]):
        db.add(models.ProgramExercise(program_id=p.id, template_id=template_map[ex_name], order=i))

print(f"  {len(CLIENT_PROGRAMS)} programs")

# ── Submissions ───────────────────────────────────────────────────────────────

non_revision = [
    {"id": "1", "client_id": "1", "exercise_name": "Pinch and Release",   "media_type": "video", "status": "pending",  "duration": "4:32", "submitted_at": datetime(2026, 6, 28)},
    {"id": "2", "client_id": "2", "exercise_name": "Ball Squeeze Series", "media_type": "video", "status": "pending",  "duration": "6:15", "submitted_at": datetime(2026, 6, 29)},
    {"id": "3", "client_id": "3", "exercise_name": "Sensory Bin Activity","media_type": "photo", "status": "pending",  "duration": None,   "submitted_at": datetime(2026, 6, 29)},
    {"id": "4", "client_id": "5", "exercise_name": "Balance Board Routine","media_type": "video","status": "approved", "therapist_note": "Great improvement in balance!", "duration": "5:48", "submitted_at": datetime(2026, 6, 27)},
    {"id": "5", "client_id": "2", "exercise_name": "Wrist Rotation",      "media_type": "photo", "status": "approved", "therapist_note": "Good form, keep it up.", "duration": None, "submitted_at": datetime(2026, 6, 27)},
    {"id": "6", "client_id": "1", "exercise_name": "Bead Threading",      "media_type": "video", "status": "rejected", "therapist_note": "Good effort! Please make sure the camera is steady so we can see your full hand. Re-record and focus on the threading motion.", "duration": "3:12", "submitted_at": datetime(2026, 7, 10), "revision_number": 1},
]

for s in non_revision:
    db.add(models.Submission(**s))
db.flush()

db.add(models.Submission(
    id="7", client_id="1", exercise_name="Bead Threading",
    media_type="video", status="pending", duration="2:47",
    submitted_at=datetime(2026, 7, 12), revision_of_id="6", revision_number=2,
))

db.commit()
print(f"  7 submissions")
print("\n✓ Seed complete!")
db.close()
