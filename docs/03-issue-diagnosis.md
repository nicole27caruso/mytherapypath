# Issue Diagnosis, Research, Resolution, and Sharing

Four real issues encountered and resolved during development, documented as they
actually happened rather than idealized after the fact.

---

## Issue 1: Deployed frontend silently served stale content despite "successful" CI

### Description
The therapist-web app was missing UI (per-exercise frequency controls) that had
been in the source code for several commits. Expected: the deployed site reflects
the latest pushed commit. Actual: it reflected a much older build, with no error
anywhere in GitHub Actions.

### Environment & setup
- therapist-web deployed via Azure Static Web Apps, using Azure's zero-config
  Next.js build (Oryx), not a custom build step
- Next.js 16.2.9 with Turbopack as the default bundler
- No local reproduction attempted yet — first observed on the live deployed URL

### Steps to reproduce
1. Push a commit changing visible UI in `view-program-drawer.tsx`
2. Wait for the GitHub Actions workflow to report success (~1 minute)
3. Open the deployed URL, open the same UI — old version still showing

### Diagnosis
Initial hypothesis (wrong): browser/CDN caching. Ruled out by fetching the live
page's JS chunks directly with `curl` and grepping for the new code's marker
string — genuinely absent from the server response, not a caching artifact.

Real cause, found by running `npm run build` locally: the build was failing at
the TypeScript type-check step on an unrelated pre-existing error (a
`@base-ui/react` component typed against raw DOM props instead of the library's
own prop types). Azure's Oryx pipeline was not propagating that failure up to
GitHub Actions as a red X — it was falling back to serving a previously-cached
successful build, so CI reported success while shipping nothing.

### Research process
- Ran `npm run build` locally to reproduce the exact failure Azure's pipeline was
  hitting internally, since the GitHub Actions log for the SWA deploy step doesn't
  surface Oryx's internal build log
- Consulted Next.js's own error output directly (the TypeScript compiler error
  message pointed precisely at the mismatched prop type)
- Used Claude Code (AI pair-programming assistant) to correlate "deploy reports
  success in ~1 minute" (suspiciously fast for this project's real build time)
  with "build silently failing" as the working hypothesis, then verify it by
  diffing served JS bundle contents against source

### Resolution steps
1. Fixed the type error: changed the `Input` wrapper's prop type from
   `React.ComponentProps<"input">` to `React.ComponentProps<typeof InputPrimitive>`
   so it matched the actual base-ui component's expected prop shape
2. Forced `next build` to use webpack instead of Turbopack (`next build --webpack`
   in `package.json`), since Azure's Oryx pipeline is built against webpack
3. Verified a full local build completed with exit code 0 before pushing

### Outcome verification
- Local `npm run build`: `✓ Compiled successfully`, `✓ Generating static pages`,
  exit code 0
- After pushing: GitHub Actions run took ~4 minutes (vs. the previous suspicious
  ~1 minute) — itself a signal of a real build happening
- Fetched the live JS chunks again and confirmed the new UI's marker text was now
  present in the served bundle

---

## Issue 2: "Past due" status flagged exercises that were still fully achievable

### Description
A client at 1 of 5 completions for the week, on a Thursday, was shown as "past
due" even though 4 more opportunities (today plus 3 remaining days) remained to
hit the target of 5. Expected: "past due" should mean the target can no longer be
reached. Actual: it fired the moment the client fell behind a perfectly even
daily pace.

### Environment & setup
- `apps/backend/app/scheduling.py`, function `compute_due_status`
- Observed live on both the therapist dashboard and the client's mobile app,
  which both consume this same backend-computed field

### Steps to reproduce
1. Assign an exercise with `frequency_per_week = 5`
2. On a Thursday (`iso_weekday = 4`), have the client complete it once
3. Observe `due_status` returned as `"past_due"`

### Diagnosis
The function computed an "expected by now" value as
`ceil(weekly_target * iso_weekday / 7)` and flagged past-due if actual completions
were below that. This models a perfectly even daily pace, not true end-of-week
achievability — falling behind an idealized smooth curve isn't the same as the
target becoming unreachable.

### Research process
- Worked through the math by hand with concrete test cases (Thursday 1/5, Friday
  1/5, Sunday 4/5, Sunday 3/5) to confirm the even-pace formula's behavior didn't
  match the intended product meaning of "past due"
- No external docs needed — this was a self-contained logic bug in project-specific
  code, reasoned through directly with Claude Code and verified with a small
  Python REPL script exercising the function with those test cases before touching
  the real fix

### Resolution steps
Replaced the even-pace comparison with a true-reachability check:
```python
days_remaining_inclusive = (7 - iso_weekday) + 1  # today through Sunday
still_reachable = weekly_count + days_remaining_inclusive >= weekly_target
return "on_track" if still_reachable else "past_due"
```

### Outcome verification
Re-ran the same four test cases against the fixed function:
| Case | Before | After | Correct? |
|---|---|---|---|
| Thu, 1/5 | past_due | on_track | ✅ (4 opportunities left for 4 needed) |
| Fri, 1/5 | past_due | past_due | ✅ (only 3 opportunities left for 4 needed) |
| Sun, 4/5 | past_due | on_track | ✅ (today is enough for the last 1) |
| Sun, 3/5 | past_due | past_due | ✅ (only today left for 2 needed) |

---

## Issue 3: "Approved" status persisted indefinitely instead of resetting weekly

### Description
A client's mobile app showed exercises as "✅ Approved" while simultaneously
showing "0/2 this week" — an approval from a prior week was still displaying as
current.

### Steps to reproduce
1. Get a submission approved in week N
2. Advance to week N+1 without submitting anything new for that exercise
3. Observe the exercise still shows "Approved," despite `weekly_count` correctly
   reset to 0

### Diagnosis
Two separate code paths computed two different things that were never reconciled:
`weekly_count` was correctly scoped to the current Monday-Sunday window, but the
"Approved" badge was built from `latest_submissions` — the single most recent
submission per exercise, queried with **no date filter at all**
(`apps/backend/app/routers/mobile.py`). Same root pattern on the therapist-web
side (`proofSubmitted` in `view-program-drawer.tsx`).

### Research process
Direct source inspection with Claude Code, comparing the week-scoped query used
for `weekly_count` against the unscoped query used for submission status, in the
same file — the discrepancy was visible side-by-side once both were pulled up.

### Resolution steps
Added a week-boundary filter (`submitted_at >= week_start_utc()`) to the query
feeding the status badge, matching the same Monday-Sunday UTC boundary already
used for `weekly_count`, on both the mobile API response and the therapist-web
`proofSubmitted` set.

### Outcome verification
Manually re-checked a client with a prior-week approval: after the fix, the badge
correctly reset to unmarked at the start of the new week, while historical
approved/rejected records remained visible in the Messages/history views (which
intentionally show all-time history, unlike the current-status badge).

---

## Issue 4: Rest-day spacing rule was enforced only in the UI, not the API

### Description
An exercise's minimum-rest-between-attempts rule (`min_days_between`) was fully
enforced in the client app's UI (the submit button is replaced by a "still
resting" message), but the backend API accepted a submission regardless of
spacing if called directly.

### Steps to reproduce
1. Set an exercise's `min_days_between` to 3
2. Submit it, then immediately call `POST /v1/mobile/me/submit` again for the same
   exercise/client via a raw HTTP client (bypassing the app UI)
3. Expected: rejected. Actual (before fix): 201, accepted

### Diagnosis
`days_until_available` was computed and returned to the client purely for display.
The actual submission-creation endpoint never checked it. The UI gate is real and
correct UX, but it isn't a security/business-rule boundary — anyone who can
authenticate as the client and call the endpoint directly bypasses it entirely.

### Research process
Traced the full call path with Claude Code from the UI condition
(`isGapRestricted` in `ExerciseScreen`) back to the API layer, confirming the
`POST /mobile/me/submit` handler had no equivalent check — this was a case of
verifying an assumption ("surely the server checks this too") rather than
external research, since it was project-specific business logic.

### Resolution steps
Added a `_check_spacing()` helper in `mobile.py`, called at the top of both the
initial submit and resubmit endpoints, that looks up the exercise's
`min_days_between` and the client's most recent non-rejected submission for that
exercise, and raises `409` if the rest period hasn't elapsed — reusing the same
`scheduling.days_until_available()` function the UI's badge already relies on, so
the two can't drift out of sync again.

### Outcome verification
- Verified the new query compiled correctly against the real schema (via a
  throwaway in-memory SQLite session, without needing a live Postgres connection)
- Verified via direct backend import that the module loads without error
- Deployed and confirmed the endpoint change is live via the backend's own
  post-deploy smoke test (see Production Support)
