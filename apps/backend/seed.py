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

db.add(models.Therapist(id=THERAPIST_ID, name="Dr. Sarah Kim"))
db.flush()
print("  1 therapist")

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
    "Median Nerve Glide":  {"instructions": "Perform median nerve gliding motions through wrist flexion and extension while keeping the thumb relaxed.", "duration": 8},
    "Wrist Neutral Hold":  {"instructions": "Hold the wrist in a neutral position for 30 seconds, focusing on relaxed fingers and thumb.", "duration": 5},
    "Thumb Opposition Practice": {"instructions": "Oppose the thumb to each fingertip slowly, repeating 10 times on each hand.", "duration": 6},
    "Grip Pinch Progression": {"instructions": "Squeeze small objects with a precise pinch grip, gradually increasing size and resistance.", "duration": 8},
    "Scapular Retraction": {"instructions": "Pull shoulder blades gently together and down, holding for 5 seconds. Repeat 10 times.", "duration": 6},
    "Pendulum Circles":    {"instructions": "Lean forward, allow the arm to hang, and gently move it in small circular motions.", "duration": 7},
    "Gentle Shoulder ER":   {"instructions": "Perform gentle external rotation with the elbow at the side using a light band.", "duration": 7},
    "Wrist Extension Stretch": {"instructions": "Extend the wrist gently with the opposite hand, feeling a mild stretch along the forearm.", "duration": 5},
    "Pelvic Tilts":        {"instructions": "Lie on your back with knees bent and tilt the pelvis to flatten the low back against the floor.", "duration": 6},
    "Bridge Hold":         {"instructions": "Lift hips slowly into a bridge and hold for 10 seconds, focusing on glute activation.", "duration": 8},
    "Sit-to-Stand Practice": {"instructions": "Practice controlled sit-to-stand transitions with feet hip-width apart.", "duration": 7},
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

# ── Program Templates ───────────────────────────────────────────────────────────

PROGRAM_TEMPLATES = {
    "Workstation Wrist Recovery": {
        "description": "Program focused on nerve glides, wrist neutral support, and gradual grip progression for desk workers.",
        "category": "Upper extremity",
        "body_region": "Wrist / Hand",
        "injury_type": "Carpal Tunnel Syndrome",
        "functional_focus": "Nerve mobility, wrist control, grip strength",
        "recovery_phase": "Subacute",
        "goals": "Improve median nerve gliding, reduce wrist strain during keyboard use, and restore pinch function.",
        "ergonomic_recommendations": "Keep keyboard and mouse at elbow height, use a wrist-support brace in neutral alignment, and schedule frequent microbreaks.",
        "precautions": "Avoid sustained wrist flexion or forceful gripping during symptom flare-ups.",
        "equipment_needed": "Theraband, wrist splint, small therapy ball",
        "progression_criteria": "Patient reports reduced numbness and can hold neutral wrist position for 30 seconds without pain.",
        "frequency": 4,
        "exercises": ["Median Nerve Glide", "Wrist Neutral Hold", "Thumb Opposition Practice", "Grip Pinch Progression"],
    },
    "Shoulder Mobility and Scapular Control": {
        "description": "Structured progression for shoulder impingement and overhead work recovery.",
        "category": "Shoulder",
        "body_region": "Shoulder",
        "injury_type": "Rotator Cuff Tendinopathy",
        "functional_focus": "Scapular stability, overhead range, pain-free movement",
        "recovery_phase": "Subacute",
        "goals": "Restore pain-free shoulder range of motion and build scapular control for functional lifting.",
        "ergonomic_recommendations": "Avoid repeated overhead reaching, use step stools when needed, and alternate tasks to reduce shoulder strain.",
        "precautions": "Stop if sharp shoulder pain increases and avoid heavy lifting with the affected arm.",
        "equipment_needed": "Light resistance band",
        "progression_criteria": "Improved overhead reach with minimal discomfort and ability to hold scapular retraction for 10 seconds.",
        "frequency": 4,
        "exercises": ["Pendulum Circles", "Scapular Retraction", "Gentle Shoulder ER"],
    },
    "Post-Surgical Radius Rehab": {
        "description": "Early wrist recovery program emphasizing edema control, gentle motion, and grip reactivation.",
        "category": "Wrist / Hand",
        "body_region": "Wrist / Hand",
        "injury_type": "Distal Radius Fracture",
        "functional_focus": "Edema control, protected wrist ROM, grip strength",
        "recovery_phase": "Remodeling",
        "goals": "Recover safe wrist motion while managing pain and swelling, then progress to functional grip tasks.",
        "ergonomic_recommendations": "Use built-up handles and padded grips, avoid heavy lifting or pinching during early healing.",
        "precautions": "Respect surgeon-prescribed motion limits and avoid forceful wrist extension.",
        "equipment_needed": "Therapy putty, lightweight grip trainer",
        "progression_criteria": "Able to tolerate gentle wrist motion and perform controlled grip exercises without increased swelling.",
        "frequency": 4,
        "exercises": ["Wrist Rotation", "Wrist Extension Stretch", "Grip Pinch Progression"],
    },
}

template_library_map = {}
for title, meta in PROGRAM_TEMPLATES.items():
    p = models.ProgramTemplate(
        title=title,
        description=meta["description"],
        category=meta.get("category"),
        body_region=meta.get("body_region"),
        injury_type=meta.get("injury_type"),
        functional_focus=meta.get("functional_focus"),
        recovery_phase=meta.get("recovery_phase"),
        goals=meta.get("goals"),
        ergonomic_recommendations=meta.get("ergonomic_recommendations"),
        precautions=meta.get("precautions"),
        equipment_needed=meta.get("equipment_needed"),
        progression_criteria=meta.get("progression_criteria"),
        frequency_per_week=meta.get("frequency", 3),
        schedule_days=meta.get("schedule_days"),
    )
    db.add(p)
    db.flush()
    for index, exercise_name in enumerate(meta["exercises"]):
        db.add(models.ProgramTemplateExercise(program_template_id=p.id, template_id=template_map[exercise_name], order=index))
    template_library_map[title] = p.id

print(f"  {len(template_library_map)} program templates")

# ── Clients ───────────────────────────────────────────────────────────────────

clients_data = [
    {"id": "1", "name": "Emma Thompson",   "age": 8,  "dob": datetime(2018, 5, 12), "condition": "Fine Motor Skills",        "diagnosis": "Developmental fine motor delay", "color": "bg-purple-100 text-purple-700", "frequency": 3, "completed_this_week": 2, "next_session": "2026-07-01", "status": "active", "access_code": "EMMA-2201"},
    {"id": "2", "name": "James Rodriguez", "age": 35, "dob": datetime(1990, 11, 3), "condition": "Post-Stroke Recovery",     "diagnosis": "Right hemispheric ischemic stroke", "color": "bg-blue-100 text-blue-700",    "frequency": 5, "completed_this_week": 4, "next_session": "2026-06-30", "status": "active", "access_code": "JAMES-7734"},
    {"id": "3", "name": "Lily Chen",       "age": 6,  "dob": datetime(2019, 8, 22), "condition": "Sensory Processing",       "diagnosis": "Sensory modulation disorder", "color": "bg-pink-100 text-pink-700",    "frequency": 3, "completed_this_week": 3, "next_session": "2026-07-02", "status": "active", "access_code": "LILY-4408"},
    {"id": "4", "name": "Michael Davis",   "age": 52, "dob": datetime(1974, 3, 18), "condition": "Hand Rehabilitation",      "diagnosis": "Post-surgical distal radius rehab", "color": "bg-gray-100 text-gray-700",    "frequency": 4, "completed_this_week": 0, "next_session": "2026-07-05", "status": "inactive", "access_code": "MICHAEL-9012"},
    {"id": "5", "name": "Sophie Williams", "age": 10, "dob": datetime(2016, 1, 9),  "condition": "Coordination Development", "diagnosis": "Bilateral coordination delay", "color": "bg-teal-100 text-teal-700",    "frequency": 2, "completed_this_week": 1, "next_session": "2026-07-03", "status": "active", "access_code": "SOPHIE-3356"},
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
