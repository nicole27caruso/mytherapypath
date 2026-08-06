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

# ── Exercise Library (shared, therapist_id=None) ─────────────────────────────

EXERCISE_LIBRARY = [
    {
        "title": "Carpal Tunnel Syndrome Rehab Exercises",
        "category": "Wrist & Hand",
        "description": "Nerve glides, stretches, and general advice for managing carpal tunnel syndrome.",
        "typically_used_for": "Subacute carpal tunnel syndrome; desk workers with median nerve irritation.",
        "video_url": "https://www.youtube.com/watch?v=noqq-QSG6w4",
    },
    {
        "title": "Best Exercises for Carpal Tunnel Syndrome",
        "category": "Wrist & Hand",
        "description": "Nerve glides, stretches, and mobility drills for carpal tunnel symptoms.",
        "typically_used_for": "Carpal tunnel syndrome — alternate progression for patients who need more mobility-focused work.",
        "video_url": "https://www.youtube.com/watch?v=TPXaQFC6xT4",
    },
    {
        "title": "Rotator Cuff Tear Rehab & Exercises",
        "category": "Shoulder",
        "description": "Rehab progression for rotator cuff tears covering shoulder pain, tendinitis, and impingement.",
        "typically_used_for": "Rotator cuff tendinopathy or partial tear, subacute phase.",
        "video_url": "https://www.youtube.com/watch?v=1Wy8jh4QQH8",
    },
    {
        "title": "10 Best Exercises for Shoulder Pain, Impingement, Bursitis & Rotator Cuff Disease",
        "category": "Shoulder",
        "description": "Ten self-treatment exercises for common shoulder pain presentations.",
        "typically_used_for": "Shoulder impingement or bursitis; overhead-work-related shoulder strain.",
        "video_url": "https://www.youtube.com/watch?v=0IkHB763nPk",
    },
    {
        "title": "Hand Grip Exercises",
        "category": "Grip Strength",
        "description": "Occupational-therapy-led hand and grip strengthening exercises.",
        "typically_used_for": "General grip weakness; hand rehabilitation following injury or disuse.",
        "video_url": "https://www.youtube.com/watch?v=QPdrr1NXyNo",
    },
    {
        "title": "Fine Motor Skills Activities (For Toddlers)",
        "category": "Pediatric — Fine Motor",
        "description": "Occupational therapy activities to build fine motor skills in young children.",
        "typically_used_for": "Developmental fine motor delay in toddlers and preschoolers.",
        "video_url": "https://www.youtube.com/watch?v=_uR0mMgYkOc",
    },
    {
        "title": "Sensory Processing Disorder: Occupational Therapy Demonstration",
        "category": "Pediatric — Sensory",
        "description": "Demonstration of occupational therapy techniques for sensory processing disorder.",
        "typically_used_for": "Sensory modulation disorder; children with sensory-seeking or sensory-avoidant behaviors.",
        "video_url": "https://www.youtube.com/watch?v=YUdsgQGHSR8",
    },
    {
        "title": "Balance and Coordination Exercises for Kids",
        "category": "Pediatric — Balance & Coordination",
        "description": "Balance and bilateral coordination activities for children.",
        "typically_used_for": "Bilateral coordination delay; pediatric balance and gross motor development.",
        "video_url": "https://www.youtube.com/watch?v=oCn2kfuIMzs",
    },
    {
        "title": "Best Hand Exercises for Stroke Patients at Home Using Mirror",
        "category": "Neuro / Post-Stroke",
        "description": "Mirror-box therapy and hand exercises for stroke recovery, performed at home.",
        "typically_used_for": "Post-stroke upper-extremity weakness; mirror therapy for motor recovery.",
        "video_url": "https://www.youtube.com/watch?v=56kk_a93fNQ",
    },
    {
        "title": "Distal Radius Fracture Therapy Exercises",
        "category": "Post-Surgical Wrist",
        "description": "Therapy exercises for recovery after a distal radius fracture.",
        "typically_used_for": "Post-surgical or post-cast distal radius fracture, once cleared for active motion.",
        "video_url": "https://www.youtube.com/watch?v=Y5uPpic3eX8",
    },
    {
        "title": "Most Important Exercise For Seniors to Master",
        "category": "Core & Functional Mobility",
        "description": "Sit-to-stand technique breakdown for building lower-body and core strength safely.",
        "typically_used_for": "General deconditioning, fall-risk reduction, and sit-to-stand training for older adults.",
        "video_url": "https://www.youtube.com/watch?v=YzuFGcIiKdw",
    },
]

for ex in EXERCISE_LIBRARY:
    db.add(models.ExerciseTemplate(
        title=ex["title"],
        description=ex["description"],
        typically_used_for=ex["typically_used_for"],
        video_url=ex["video_url"],
        video_source="youtube",
        category=ex["category"],
        therapist_id=None,
    ))

print(f"  {len(EXERCISE_LIBRARY)} exercise library entries")

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
    "1": {"name": "Pediatric Fine Motor Program",    "frequency": 3, "exercises": [("Pinch and Release", 3), ("Bead Threading", 5), ("Playdough Squeeze", 2), ("Scissors Practice", 3)]},
    "2": {"name": "Adult Stroke Rehab Phase 2",      "frequency": 5, "exercises": [("Mirror Therapy", 6), ("Ball Squeeze Series", 4), ("Passive ROM", 7), ("Wrist Rotation", 5)]},
    "3": {"name": "Sensory Integration Basics",      "frequency": 3, "exercises": [("Sensory Bin Activity", 4), ("Tactile Cards", 2), ("Weighted Lap Pad", 3), ("Deep Pressure Input", 3)]},
    "4": {"name": "Post-Surgery Hand Recovery",      "frequency": 4, "exercises": [("Ball Squeeze", 2), ("Wrist Curls", 2), ("Finger Extensions", 2), ("Grip Training", 2)]},
    "5": {"name": "Pediatric Coordination Program",  "frequency": 2, "exercises": [("Balance Board Routine", 3), ("Bean Bag Toss", 2), ("Jump Rope", 4), ("Coordination Drills", 2)]},
}

for client_id, prog in CLIENT_PROGRAMS.items():
    p = models.Program(client_id=client_id, name=prog["name"], frequency_per_week=prog["frequency"])
    db.add(p)
    db.flush()
    for i, (ex_name, ex_frequency) in enumerate(prog["exercises"]):
        db.add(models.ProgramExercise(program_id=p.id, template_id=template_map[ex_name], order=i, frequency_per_week=ex_frequency))

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
