# System Usage Guide

This guide is written for people using MyTherapyPath day to day — therapists and
clients — not developers. No coding knowledge is assumed.

## Accessing the Application

MyTherapyPath has two separate apps: one for therapists (a website) and one for
clients (a phone app).

| Who | App | URL / access |
|---|---|---|
| Therapist | Web dashboard | `https://salmon-sky-01426550f.7.azurestaticapps.net` — no login currently required (single-therapist demo mode) |
| Client | Mobile app | Install **Expo Go** from the App Store / Google Play, then open the app and enter an access code (see test accounts below) |

### Test accounts (client access codes)

| Client | Access Code | Condition |
|---|---|---|
| Emma Thompson | `EMMA-2201` | Fine Motor Skills |
| James Rodriguez | `JAMES-7734` | Post-Stroke Recovery |
| Lily Chen | `LILY-4408` | Sensory Processing |
| Sophie Williams | `SOPHIE-3356` | Coordination Development |

Clients never create a password or account — the access code is the entire login.
This is a deliberate design choice for accessibility (many clients are children).

---

## For Therapists

### Navigating the dashboard

_[Screenshot: Dashboard page, showing stat cards and sidebar]_

The left sidebar has four sections:
- **Dashboard** — a quick summary: active clients, pending submission reviews,
  average completion, and total submissions
- **Clients** — your full client roster
- **Submissions** — the review queue for photo/video proof clients have submitted
- **Library** — the shared exercise catalog you assign from (this was called
  "Templates" earlier in development — see Issue Diagnosis for why it changed)

### Workflow: Assigning a home exercise program

1. Go to **Clients**, click a client to open their detail view
2. Click **Edit Program**
3. Under "Add from library," search for an exercise and add it — or type a
   one-off exercise name if it's not in the library yet
4. For each exercise, set its own **Times/week** and **Min. spacing** (rest days
   between attempts) — these are independent per exercise, not one setting for the
   whole program
5. Click **Save Changes**

_[Screenshot: Edit Program drawer, showing per-exercise Times/week and Min.
spacing controls]_

**Gotcha:** "Min. spacing" (rest days for one specific exercise) and "Schedule
Days" (which days per week the whole program generally runs) are two different
settings — hover the small info icon next to "Min. spacing" if you're unsure which
one you're changing.

### Workflow: Reviewing a submission

1. Go to **Submissions** — anything awaiting review is listed here
2. Open one, watch/view the proof
3. **Approve** (optionally with a note) or **Reject** (a note is expected, so the
   client knows what to fix)
4. If rejected, the client sees the note in their Messages tab and can resubmit

### Workflow: Logging an exercise done in-session (client doesn't need their phone)

1. Open the client's program, click an exercise
2. Choose **"Log this session only"** (counts one completion) or **"Override —
   mark full week complete"** (fills the rest of that week's target at once)
3. If the exercise is currently on a rest period, you'll see a warning that
   logging here overrides that rest rule — this is intentional (a therapist
   working with the client in person can make that call), but it's called out so
   it's never a silent override

### Workflow: Adding a video to the Library

1. Go to **Library** → **Add Exercise**
2. Either paste a YouTube link, or upload your own video file
3. **If the video shows an actual client** (not you demonstrating), check "This
   footage shows a specific client" and select which client — this hides the video
   from every other client's program automatically, and shows a privacy warning
   badge on the library card as a reminder that it needs to be re-recorded before
   it can be reused generally

_[Screenshot: Add Exercise modal, showing the client-recording checkbox and
resulting privacy badge]_

### Known limitations for therapists
- Only one therapist account exists right now (no login, no multi-therapist
  support yet)
- The dashboard does not auto-refresh — click Refresh or reload the page to see
  new client activity
- No way to permanently delete a client-recorded video's privacy flag through the
  UI other than re-uploading without the client-specific checkbox

---

## For Clients

### Logging in

Open the app, enter your access code exactly as given by your therapist (not
case-sensitive, but spelling/dashes matter).

### Workflow: Doing today's exercises

1. The **Today** tab lists everything assigned to you, with how many you've done
   this week out of your target (e.g. "1/3 this week")
2. Tap an exercise to open it — watch the instructional video, read the steps and
   your therapist's tip
3. Record or upload a photo/video of yourself doing it, then submit

_[Screenshot: Today tab, showing exercise cards with weekly progress]_

**Gotcha — "Resting" exercises:** if an exercise shows "Time to rest this one,"
your therapist set a minimum number of days between attempts and it hasn't been
long enough yet. This isn't a bug — try again once the message clears, or ask your
therapist if you think it's wrong.

### Workflow: Checking your progress

The **Progress** tab shows your stars, streaks, and a weekly activity calendar.

### Workflow: Responding to feedback

The **Messages** tab shows your therapist's notes on approved/rejected
submissions. If something was rejected, tap **Revise Now** to resubmit with a new
photo/video for the same exercise.

### Known limitations for clients
- If your submission doesn't show as reviewed after a few days, ask your
  therapist directly — there's no automatic reminder system yet
- The app needs an internet connection; there's no offline mode

---

## Support

For issues with the deployed application, contact the development team via the
project's GitHub repository issue tracker, or reach the author directly (see
repository contact information). For setup/technical issues, see
[System Setup Instructions](02-system-setup.md) and
[Production Support](01-production-support.md#common-incidents--recovery-steps)
first — many common issues are already documented there.
