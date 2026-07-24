# MyTherapyPath — Database Design

**Database:** PostgreSQL 18  
**ORM:** SQLAlchemy 2.0  
**Migration Tool:** Alembic

---

## Entity Relationship Overview

```
therapist (hardcoded ID, no table yet)
    │
    ├──< clients >──────────────────────────────────────────┐
    │       │                                               │
    │       ├──< submissions (exercise proof videos)        │
    │       ├──< therapist_notes                            │
    │       └──── programs (one per client) ──< program_exercises >── exercise_templates
    │
    └──< exercise_templates (library of exercises)
```

---

## Tables

### `clients`
Stores each client's profile and session metadata.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | VARCHAR | PK | Manually assigned (e.g. "1", "2") |
| therapist_id | VARCHAR | NOT NULL | Foreign key to therapist (hardcoded "therapist-1") |
| name | VARCHAR | NOT NULL | Full name |
| age | INTEGER | nullable | Client age |
| condition | VARCHAR | nullable | OT diagnosis or focus area |
| status | VARCHAR | NOT NULL, default "active" | "active" or "inactive" |
| color | VARCHAR | nullable | Tailwind color classes for UI |
| frequency | INTEGER | NOT NULL, default 3 | Sessions per week |
| completed_this_week | INTEGER | NOT NULL, default 0 | Exercises completed this week |
| next_session | VARCHAR | nullable | Next appointment date (YYYY-MM-DD) |
| created_at | TIMESTAMP | default now() | Record creation time |

**Relationships:**
- One client → many `submissions`
- One client → one `program`
- One client → many `therapist_notes`

---

### `exercise_templates`
A shared library of reusable exercises that can be assigned to any client.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, auto-generated | Unique identifier |
| title | VARCHAR | NOT NULL | Exercise name |
| description | TEXT | nullable | Short summary |
| instructions | TEXT | nullable | Step-by-step instructions |
| video_url | VARCHAR | nullable | Link to demo video |
| category | VARCHAR | nullable | e.g. "Fine Motor", "Grip Strength" |
| duration_minutes | INTEGER | nullable | Estimated time to complete |
| created_at | TIMESTAMP | default now() | Record creation time |

---

### `programs`
One exercise program per client — defines which exercises are assigned and how often.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, auto-generated | Unique identifier |
| client_id | VARCHAR | FK → clients.id, UNIQUE | Each client has at most one program |
| name | VARCHAR | nullable | Program display name |
| frequency_per_week | INTEGER | NOT NULL, default 3 | How many times per week to complete |
| created_at | TIMESTAMP | default now() | Created time |
| updated_at | TIMESTAMP | default now() | Last updated time |

**Relationships:**
- One program → many `program_exercises`

---

### `program_exercises`
Junction table linking a program to its ordered list of exercises.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, auto-generated | Unique identifier |
| program_id | UUID | FK → programs.id | Which program this belongs to |
| template_id | UUID | FK → exercise_templates.id | Which exercise template |
| order | INTEGER | NOT NULL, default 1 | Display order within the program |

---

### `submissions`
Records each time a client submits proof of completing an exercise (photo or video).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, auto-generated | Unique identifier |
| client_id | VARCHAR | FK → clients.id | Which client submitted |
| exercise_name | VARCHAR | NOT NULL | Name of the exercise performed |
| media_type | VARCHAR | nullable | "photo" or "video" |
| media_url | VARCHAR | nullable | URL to stored media file |
| status | VARCHAR | NOT NULL, default "pending" | "pending", "approved", or "rejected" |
| therapist_note | TEXT | nullable | Therapist's feedback after review |
| duration | VARCHAR | nullable | Reported duration of the session |
| submitted_at | TIMESTAMP | default now() | When the client submitted |
| revision_of_id | UUID | FK → submissions.id, nullable | Points to original if this is a revision |
| revision_number | INTEGER | nullable | 2 for first revision, 3 for second, etc. |

**Self-referential relationship:** A rejected submission can have a follow-up revision submission that references it via `revision_of_id`.

---

### `therapist_notes`
Freeform notes a therapist writes about a client — separate from submission feedback.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, auto-generated | Unique identifier |
| client_id | VARCHAR | FK → clients.id | Which client this note is about |
| therapist_id | VARCHAR | NOT NULL | Who wrote the note |
| text | TEXT | NOT NULL | Note content |
| created_at | TIMESTAMP | default now() | When the note was written |

---

## Key Design Decisions

**Why `clients.id` is a VARCHAR (not UUID):** The seed data uses simple string IDs ("1"–"5") so the mobile app can hardcode `CLIENT_ID = "1"` for development. In production this would be a UUID tied to an auth system.

**Why submissions store `exercise_name` instead of a FK to templates:** Clients submit against the name of the exercise they performed. Template records can be updated or deleted without breaking submission history.

**Why `programs` has a UNIQUE constraint on `client_id`:** Each client has exactly one active program. POSTing a new program replaces the existing one — simpler than versioning programs.

**Why `revision_of_id` is a self-referential FK on submissions:** This lets the therapist web app trace the full revision chain (original → revision 1 → revision 2) and prevents showing a rejection as "pending action" once a revision exists.
