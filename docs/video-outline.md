# MyTherapyPath — Video Walkthrough Script (6–10 min)

Run everything in this exact order. Set up all three terminals BEFORE you start recording.

---

## BEFORE YOU HIT RECORD — Terminal Setup

Open THREE separate terminal windows and run one thing in each.

### Terminal 1 — Start the backend API
```
cd "C:\Users\Nicole Caruso\OneDrive\MTP1\mytherapypath\apps\backend"
venv\Scripts\activate
python -m uvicorn app.main:app --reload --reload-dir app
```
Wait until you see: `Application startup complete.`
Leave this running. Do not close it.

### Terminal 2 — Start the mobile app
```
cd "C:\Users\Nicole Caruso\OneDrive\MTP1\mytherapypath\apps\client-mobile"
npx expo start
```
When the menu appears, press `w` to open the app in your browser.
Leave this running. Do not close it.

### Terminal 3 — Connect to the database (psql)
```
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d mytherapypath
```
When it asks for a password, type: `Cody2017!`

You will see a prompt that looks like: `mytherapypath=#`
This means you are connected to the database and can run SQL queries.
Leave this open. You will switch to it after each API call.

---

## START RECORDING

---

## Section 1 — Introduction (30 seconds, no typing needed)

Say out loud:
> "This is MyTherapyPath, an occupational therapy app with two sides — a therapist web app and a client mobile app. The backend is built with FastAPI and Python, connected to a PostgreSQL database. I'll walk through the database tables, the API code, run each API endpoint, and show the database updating after every operation."

---

## Section 2 — Show the Database Tables (1 minute)

Switch to **Terminal 3** (the psql window).

**Type this and press Enter:**
```sql
\dt
```
> What this does: `\dt` is a psql shortcut that lists all tables in the current database. You should see 6 tables: clients, exercise_templates, programs, program_exercises, submissions, therapist_notes.

Say: "These are the six tables in the database. Let me show the client data."

**Type this and press Enter:**
```sql
SELECT id, name, status, condition FROM clients;
```
> What this does: pulls every row from the clients table and shows 4 columns. You should see Emma Thompson, James Rodriguez, Lily Chen, Michael Davis, and Sophie Williams.

Say: "Five clients are pre-loaded. Now let me show the submissions table."

**Type this and press Enter:**
```sql
SELECT id, exercise_name, status FROM submissions;
```
> What this does: shows all exercise submissions — you should see approved, rejected, and pending entries.

---

## Section 3 — Code Walkthrough (1.5 minutes)

Open VS Code in the mytherapypath folder. Click through these files briefly:

1. `apps/backend/app/models.py`
   - Say: "These are the database models — each Python class maps to one table in PostgreSQL."

2. `apps/backend/app/routers/` (show the folder)
   - Say: "Each file is a group of related API endpoints. Clients, submissions, programs, dashboard, and a mobile-specific router for the client app."

3. `apps/backend/app/main.py`
   - Say: "This is the entry point — it registers all the routers and sets up CORS so the frontend apps can talk to the API."

4. `apps/backend/app/routers/mobile.py`
   - Say: "This is the mobile router — it returns everything the client app needs in one call: the client's info, their assigned exercises, and their message history."

---

## Section 4 — API Demo with Database Verification (4 minutes)

Open your browser to: `http://localhost:8000/docs`

This is the Swagger UI — FastAPI automatically generates it. You can click any endpoint and run it directly from the browser.

---

### API Test 1: Get All Clients

Click **GET /v1/clients**, then click **Try it out**.

In the `therapist_id` field type: `therapist-1`

Click **Execute**.

> You should see 5 clients returned in the response.

**Switch to Terminal 3 and type:**
```sql
SELECT id, name, status FROM clients WHERE therapist_id = 'therapist-1';
```
Say: "The API returned 5 clients and the database confirms 5 rows."

---

### API Test 2: Create a New Client

Click **POST /v1/clients**, then click **Try it out**.

Replace the request body with:
```json
{
  "therapist_id": "therapist-1",
  "name": "Test Client",
  "age": 10,
  "condition": "Balance Training",
  "color": "bg-green-100 text-green-700",
  "frequency": 2,
  "next_session": "2026-07-28",
  "status": "active"
}
```
Click **Execute**.

> You should see a 201 response with a new client object including an auto-generated ID.

**Switch to Terminal 3 and type:**
```sql
SELECT id, name, status FROM clients;
```
Say: "The new client now appears in the database — the POST operation was reflected immediately."

---

### API Test 3: Submit an Exercise (Mobile App)

Click **POST /v1/mobile/{client_id}/submit**, then click **Try it out**.

In the `client_id` field type: `1`

Replace the request body with:
```json
{
  "exercise_name": "Pinch and Release",
  "media_type": "video"
}
```
Click **Execute**.

> You should see a 201 response with `"status": "pending"`.

**Switch to Terminal 3 and type:**
```sql
SELECT id, exercise_name, status, submitted_at FROM submissions ORDER BY submitted_at DESC LIMIT 3;
```
Say: "A new pending submission just appeared in the database — this is the client uploading their exercise proof."

---

### API Test 4: Approve the Submission (Therapist)

Copy the `id` from the response in API Test 3.

Click **PATCH /v1/submissions/{id}/approve**, then click **Try it out**.

Paste the ID into the `id` field.

Replace the request body with:
```json
{
  "note": "Excellent form! Your pinching technique has really improved."
}
```
Click **Execute**.

> You should see a 200 response with `"status": "approved"` and the note filled in.

**Switch to Terminal 3 and type:**
```sql
SELECT status, therapist_note FROM submissions ORDER BY submitted_at DESC LIMIT 1;
```
Say: "The database now shows the submission is approved and the therapist's note is saved."

---

### API Test 5: Client Checks Their Messages (Mobile)

Click **GET /v1/mobile/{client_id}**, then click **Try it out**.

In the `client_id` field type: `1`

Click **Execute**.

> You should see the approved submission now showing in the `messages` array with `"kind": "approved"`.

Say: "The client's mobile app calls this one endpoint and gets their exercises and all messages — including the approval we just made — in a single response. This completes the full round-trip."

---

### API Test 6: Dashboard Stats

Click **GET /v1/dashboard**, then click **Try it out**.

In the `therapist_id` field type: `therapist-1`

Click **Execute**.

> You should see counts: active clients, pending reviews, completed this week, total submissions.

Say: "The dashboard endpoint aggregates live data from the database for the therapist's overview screen."

---

## Section 5 — Issues Encountered (1 minute, no typing needed)

Say:
> "A few issues came up during development. First, Python 3.14 was installed on my machine but psycopg2 and pydantic had no pre-built packages for it yet, so I had to switch to Python 3.11. Second, PostgreSQL wasn't persisting between reboots — I fixed this by registering it as a Windows auto-start service. Third, uvicorn's file watcher kept restarting the server every few seconds because it was scanning thousands of files inside the venv folder — I fixed this with the --reload-dir flag to limit watching to just the app code."

---

## Section 6 — Close (15 seconds)

Say:
> "All 12 test cases passed. The backend is fully integrated with the database and supports both the therapist web app and the client mobile app. The GitHub repository link is in the submission."

---

## After Recording — Exit psql

In Terminal 3, type:
```sql
\q
```
This exits the psql session.
