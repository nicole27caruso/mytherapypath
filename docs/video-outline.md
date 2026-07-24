# MyTherapyPath — Video Walkthrough Outline (6–10 min)

---

## Suggested Recording Order

### 1. Introduction (30 sec)
- "This is MyTherapyPath, a two-sided occupational therapy app. I built the backend using FastAPI, PostgreSQL, and SQLAlchemy. I'll walk through the database, the APIs, and demonstrate the full client-to-therapist loop."

---

### 2. Show the Database Tables (1 min)
Open pgAdmin or run psql and show:
```sql
\dt
```
Walk through each table:
- `clients` — "stores each patient's profile"
- `exercise_templates` — "the library of exercises a therapist can assign"
- `programs` / `program_exercises` — "links a client to their assigned exercises"
- `submissions` — "every time a client uploads proof of doing an exercise"
- `therapist_notes` — "freeform notes the therapist writes about a client"

Show a sample query:
```sql
SELECT id, name, status, condition FROM clients;
```

---

### 3. Code Walkthrough (2 min)
Open VS Code and briefly show:
- `apps/backend/app/models.py` — "these are the SQLAlchemy models, one class per database table"
- `apps/backend/app/routers/` — "each file is a group of related endpoints — clients, submissions, programs, dashboard, and the mobile-specific router"
- `apps/backend/app/main.py` — "this wires everything together with CORS and version prefixing"
- `.env` — "database credentials and allowed origins stored separately from code"

---

### 4. API Demo via Swagger UI (3 min)
Open `http://localhost:8000/docs` and run these in order, **showing the database after each one:**

**Step 1 — GET /v1/clients**
- Input: `therapist_id = therapist-1`
- Show 5 clients returned
- Switch to pgAdmin/psql: `SELECT id, name, status FROM clients;` — same 5 rows

**Step 2 — POST /v1/clients** (create a test client)
- Show the new client in the response
- Switch to database: run SELECT again — new row appears

**Step 3 — POST /v1/mobile/1/submit** (simulate client submitting)
- Input: `{ "exercise_name": "Pinch and Release", "media_type": "video" }`
- Show 201 response with `"status": "pending"`
- Switch to database: `SELECT id, exercise_name, status FROM submissions ORDER BY submitted_at DESC LIMIT 3;` — new pending row visible

**Step 4 — PATCH /v1/submissions/{id}/approve** (therapist approves it)
- Use the ID from Step 3
- Input: `{ "note": "Great job!" }`
- Show 200 response with `"status": "approved"`
- Switch to database: `SELECT status, therapist_note FROM submissions WHERE id = '...';` — shows `approved` and note

**Step 5 — GET /v1/mobile/1** (client checks their messages)
- Show the approved submission now appearing in the messages array
- This completes the full round-trip

---

### 5. Issues Encountered & Solutions (1–2 min)
Mention these real issues from development:

- **Python 3.14 wheel build failure** — psycopg2-binary and pydantic-core had no pre-built wheels for Python 3.14. Fixed by switching to Python 3.11 using the `py -3.11` launcher.

- **PostgreSQL not starting** — the server wasn't running after reboot. Fixed by registering it as a Windows auto-start service using `pg_ctl register`.

- **WatchFiles scanning the venv** — uvicorn's reloader kept detecting changes inside the venv folder and restarting constantly. Fixed by adding `--reload-dir app` to limit watching to just the app code.

- **Pydantic v2 @property not serialized** — computed properties on Pydantic models don't automatically appear in API responses in v2. Fixed by replacing `@property` with real model fields and `@computed_field`.

- **Self-referential FK in seed data** — submission revision records reference the original submission's ID. Fixed by inserting non-revision submissions first, calling `db.flush()` to get their IDs, then inserting revision records.

---

### 6. Close (15 sec)
- "All 12 test cases passed. The backend is fully integrated with the database and supports both the therapist web app and the client mobile app through separate API surfaces."
