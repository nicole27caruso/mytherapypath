# System Setup Instructions

These instructions take a new developer from a clean machine to all three
applications running locally against a local database. Each component is set up
independently; you do not need all three running to work on just one (e.g. you can
point a local frontend at the production backend instead — see each section's
"Alternate: point at production" note).

## Prerequisites

Install these before starting:

| Tool | Version | Used by |
|---|---|---|
| [Node.js](https://nodejs.org) | 20.x | therapist-web, client-mobile |
| [Python](https://python.org) | 3.12.x | backend |
| [PostgreSQL](https://www.postgresql.org/download/) | 16+ | backend (local dev database) |
| Git | any recent | all |
| [Expo Go](https://expo.dev/go) app (iOS/Android) | latest | testing client-mobile on a physical device |

No global npm/pip packages are required — each app manages its own dependencies
(`node_modules`, a Python `venv`).

Clone the repo once; all three apps live inside it:
```
git clone https://github.com/nicole27caruso/mytherapypath.git
cd mytherapypath
```

This is an **npm workspaces monorepo** (`apps/*`) — `npm install` from the repo root
installs and hoists dependencies for both `therapist-web` and `client-mobile` at
once. The Python backend is separate (its own `venv`, not part of npm workspaces).

---

## 1. Database (PostgreSQL)

1. Install PostgreSQL locally and make sure the server is running.
2. Create the database:
   ```
   psql -U postgres -c "CREATE DATABASE mytherapypath;"
   ```
3. Note your `postgres` user's password — you'll need it for the backend's `.env`
   in the next section.

**Validation:** `psql -U postgres -d mytherapypath -c "\dt"` connects successfully
(it will show "no relations" until migrations run in the next step — that's expected).

---

## 2. Backend (FastAPI)

All commands below run from `apps/backend/`.

### Install

```
cd apps/backend
python -m venv venv
venv\Scripts\activate          # Windows. macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

### Configure

```
copy .env.example .env         # Windows. macOS/Linux: cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:<your-password>@localhost:5432/mytherapypath` |
| `SECRET_KEY` | Yes | Any random string for local dev |
| `CORS_ORIGINS` | Yes | Comma-separated origins allowed to call the API. For local dev: `http://localhost:3000,http://localhost:8081` |
| `AZURE_STORAGE_CONNECTION_STRING` | No | Leave unset for local dev — submissions/videos save to `./uploads/` instead |
| `AZURE_STORAGE_CONTAINER` | No | Only used if the connection string above is set |

**Secrets management:** `.env` is git-ignored; never commit it. In production
(Azure App Service), the same variable names are set as Application Settings in the
Azure Portal rather than a file — see [Architecture Diagram](05-architecture-diagram.md)
for which service that is.

### Set up the schema and seed data

```
alembic upgrade head
python seed.py
```

`alembic upgrade head` creates all tables by replaying every migration in
`alembic/versions/` in order. `seed.py` populates 5 demo clients with realistic
programs, submissions, and clinic sessions so the app isn't empty on first run.

### Run

```
uvicorn app.main:app --reload --port 8000
```

**Validation:** open `http://localhost:8000/docs` — you should see the interactive
Swagger UI listing all endpoints. `GET /health` should return `{"status": "ok"}`.

### Alternate: point at production instead of running the backend locally

If you only need to work on a frontend, you don't need to run the backend or a
local database at all — both frontends can point at the live production API
(`https://api-mtp2026.azurewebsites.net/v1`) instead. See each frontend's
"Configure" section below for how.

---

## 3. Therapist Web (Next.js)

All commands below run from `apps/therapist-web/`, unless noted (npm install
happens at the repo root because this is a workspace).

### Install

```
cd mytherapypath          # repo root
npm install
```

### Configure

Create `apps/therapist-web/.env.local` (git-ignored, does not exist by default):

```
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
```

To point at the deployed production backend instead of a local one (no local
backend/database needed):
```
NEXT_PUBLIC_API_URL=https://api-mtp2026.azurewebsites.net/v1
```
If this file is absent, the app falls back to `http://localhost:8000/v1` by default
(see `src/lib/api.ts`).

### Run

```
cd apps/therapist-web
npm run dev
```

**Validation:** open `http://localhost:3000/dashboard`. You should see real client
data (not a blank/error page) — confirming both that the app started and that it
successfully reached whichever backend you configured.

### Build for production (what CI runs)

```
npm run build
```
This must complete with exit code 0 and zero TypeScript errors before deploying —
Azure's build pipeline runs the same command, and a failing build can silently
leave the live site on an old deployment (see the "stale production build"
incident in [Issue Diagnosis](03-issue-diagnosis.md)).

---

## 4. Client Mobile (Expo / React Native)

All commands below run from `apps/client-mobile/`.

### Install

Already done if you ran `npm install` at the repo root in step 3. If working on
this app in isolation:
```
cd mytherapypath
npm install
```

### Configure

The API base URL is set in `apps/client-mobile/app.json` under `expo.extra.apiBase`
(there is no `.env` file for this app — Expo bakes config into the app bundle at
build/start time via `app.json`):

```json
{
  "expo": {
    "extra": {
      "apiBase": "https://api-mtp2026.azurewebsites.net/v1"
    }
  }
}
```

By default this already points at the production backend, so client-mobile works
out of the box without running a local backend. To point it at a local backend
instead, change this to your machine's LAN IP (not `localhost` — the phone is a
separate device on the network): `http://192.168.x.x:8000/v1`.

### Run — browser (fastest, no phone needed)

```
cd apps/client-mobile
npm run dev
```
Opens the app directly in your default browser.

### Run — physical phone via Expo Go

```
npm run start
```
Scan the printed QR code with Expo Go (Camera app on iOS, in-app scanner on
Android). Requires the phone and computer to be on the same Wi-Fi network.

If they're not on the same network (e.g. presenting on venue Wi-Fi with client
devices on cellular), use the bundled tunnel script instead, which works around a
bug in Expo's own `--tunnel` flag:
```
.\start-tunnel-demo.ps1
```
This prints an `exp://...` URL — paste it into Expo Go's "Enter URL manually"
option rather than scanning a QR code.

**Validation:** log in with a seeded access code (e.g. `EMMA-2201`) and confirm
today's assigned exercises load.

---

## Summary: Validating the Full Stack Together

1. Backend running (`http://localhost:8000/docs` loads) with `seed.py` run.
2. therapist-web running, `/clients` shows 5 seeded clients.
3. client-mobile running, log in with `EMMA-2201`, submit proof for an exercise.
4. Refresh the therapist-web Submissions page — the new submission should appear
   within a few seconds (no auto-refresh/websockets — this is a manual refresh, by
   design; see [Production Support](01-production-support.md) for monitoring notes).

If step 4 fails, see the "Submission doesn't appear on the therapist dashboard"
entry in [Production Support](01-production-support.md#common-incidents--recovery-steps).
