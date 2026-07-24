# MyTherapyPath — API Test Cases & Results

**Testing Tool:** FastAPI Swagger UI at `http://localhost:8000/docs`  
**Test Date:** July 24, 2026  
**Base URL:** `http://localhost:8000/v1`  
**Therapist ID used:** `therapist-1`  
**Client ID used:** `1` (Emma Thompson)

---

## TC-01: Health Check

**Endpoint:** `GET /health`  
**Input:** None  
**Expected Output:** `{"status": "ok"}`  
**Result:** ✅ PASS

```json
Response 200:
{ "status": "ok" }
```

---

## TC-02: Get All Clients

**Endpoint:** `GET /v1/clients?therapist_id=therapist-1`  
**Input:** Query param `therapist_id=therapist-1`  
**Expected Output:** Array of 5 clients with names, statuses, and program info  
**Result:** ✅ PASS

```json
Response 200:
[
  {
    "id": "1",
    "name": "Emma Thompson",
    "status": "active",
    "condition": "Fine Motor Skills",
    "frequency": 3,
    "program": { "name": "Pediatric Fine Motor Program", "frequency_per_week": 3 }
  },
  {
    "id": "2",
    "name": "James Rodriguez",
    "status": "active",
    "condition": "Post-Stroke Recovery",
    "frequency": 5,
    "program": { "name": "Adult Stroke Rehab Phase 2", "frequency_per_week": 5 }
  }
  ...3 more clients
]
```

**Database verification:** `SELECT * FROM clients WHERE therapist_id = 'therapist-1';` returns 5 rows.

---

## TC-03: Create New Client

**Endpoint:** `POST /v1/clients`  
**Input:**
```json
{
  "therapist_id": "therapist-1",
  "name": "Test Client",
  "age": 12,
  "condition": "Balance Training",
  "color": "bg-green-100 text-green-700",
  "frequency": 2,
  "next_session": "2026-07-28",
  "status": "active"
}
```
**Expected Output:** New client object with auto-generated ID  
**Result:** ✅ PASS

```json
Response 201:
{
  "id": "generated-uuid",
  "name": "Test Client",
  "age": 12,
  "status": "active",
  "created_at": "2026-07-24T..."
}
```

**Database verification:** New row appears in `clients` table with correct fields.

---

## TC-04: Update Client Status (Deactivate)

**Endpoint:** `PATCH /v1/clients/1`  
**Input:**
```json
{ "status": "inactive" }
```
**Expected Output:** Updated client with `"status": "inactive"`  
**Result:** ✅ PASS

```json
Response 200:
{
  "id": "1",
  "name": "Emma Thompson",
  "status": "inactive"
}
```

**Database verification:** `SELECT status FROM clients WHERE id = '1';` returns `inactive`.  
*Status reverted back to `active` after test.*

---

## TC-05: Get All Submissions (Pending Only)

**Endpoint:** `GET /v1/submissions?therapist_id=therapist-1&status=pending`  
**Input:** Query params `therapist_id=therapist-1`, `status=pending`  
**Expected Output:** Submissions with `"status": "pending"`  
**Result:** ✅ PASS

```json
Response 200:
[
  {
    "id": "uuid",
    "client_id": "1",
    "exercise_name": "Pinch and Release",
    "status": "pending",
    "therapist_note": null,
    "submitted_at": "2026-07-24T..."
  }
]
```

---

## TC-06: Approve a Submission

**Endpoint:** `PATCH /v1/submissions/{id}/approve`  
**Input:**
```json
{ "note": "Excellent form! Keep up the great work." }
```
**Expected Output:** Submission with `"status": "approved"` and therapist note populated  
**Result:** ✅ PASS

```json
Response 200:
{
  "id": "uuid",
  "status": "approved",
  "therapist_note": "Excellent form! Keep up the great work.",
  "submitted_at": "2026-07-24T..."
}
```

**Database verification:** `SELECT status, therapist_note FROM submissions WHERE id = 'uuid';` shows `approved` and note text.

---

## TC-07: Reject a Submission

**Endpoint:** `PATCH /v1/submissions/{id}/reject`  
**Input:**
```json
{ "note": "Please make sure the camera captures your full hand." }
```
**Expected Output:** Submission with `"status": "rejected"` and rejection note  
**Result:** ✅ PASS

```json
Response 200:
{
  "id": "uuid",
  "status": "rejected",
  "therapist_note": "Please make sure the camera captures your full hand.",
  "submitted_at": "2026-07-24T..."
}
```

**Database verification:** `SELECT status FROM submissions WHERE id = 'uuid';` returns `rejected`.

---

## TC-08: Get Mobile Dashboard

**Endpoint:** `GET /v1/mobile/1`  
**Input:** Path param `client_id=1`  
**Expected Output:** Client info, 4 exercises, and message history in one response  
**Result:** ✅ PASS

```json
Response 200:
{
  "client": { "name": "Emma", "full_name": "Emma Thompson", "age": 8 },
  "exercises": [
    { "title": "Pinch and Release", "duration_minutes": 5 },
    { "title": "Bead Threading", "duration_minutes": 5 },
    { "title": "Playdough Squeeze", "duration_minutes": 5 },
    { "title": "Scissors Practice", "duration_minutes": 5 }
  ],
  "messages": [
    {
      "kind": "rejected",
      "exercise_name": "Bead Threading",
      "rejection_note": "Good effort! Please keep the camera steady.",
      "has_revision": true
    }
  ]
}
```

---

## TC-09: Client Submits Exercise (Mobile)

**Endpoint:** `POST /v1/mobile/1/submit`  
**Input:**
```json
{
  "exercise_name": "Pinch and Release",
  "media_type": "video"
}
```
**Expected Output:** New submission created with `"status": "pending"`  
**Result:** ✅ PASS

```json
Response 201:
{
  "id": "new-uuid",
  "status": "pending"
}
```

**Database verification:** New row in `submissions` table with `client_id=1`, `status=pending`, and today's `submitted_at` timestamp.

---

## TC-10: Client Resubmits After Rejection (Mobile)

**Endpoint:** `POST /v1/mobile/submissions/{original_id}/resubmit`  
**Input:**
```json
{
  "exercise_name": "Bead Threading",
  "media_type": "video"
}
```
**Expected Output:** New submission with `revision_of_id` pointing to original, `revision_number=2`  
**Result:** ✅ PASS

```json
Response 201:
{
  "id": "new-uuid",
  "status": "pending",
  "revision_number": 2
}
```

**Database verification:** New row in `submissions` has `revision_of_id` matching the original rejected submission's ID.

---

## TC-11: Get Dashboard Stats

**Endpoint:** `GET /v1/dashboard?therapist_id=therapist-1`  
**Input:** Query param `therapist_id=therapist-1`  
**Expected Output:** Summary counts for the therapist dashboard  
**Result:** ✅ PASS

```json
Response 200:
{
  "active_clients": 4,
  "pending_reviews": 3,
  "completed_this_week": 10,
  "total_submissions": 7
}
```

---

## TC-12: Add Therapist Note to Client

**Endpoint:** `POST /v1/clients/1/notes`  
**Input:**
```json
{
  "therapist_id": "therapist-1",
  "text": "Emma showed excellent focus during today's session."
}
```
**Expected Output:** New note with timestamp  
**Result:** ✅ PASS

```json
Response 201:
{
  "id": "new-uuid",
  "client_id": "1",
  "therapist_id": "therapist-1",
  "text": "Emma showed excellent focus during today's session.",
  "created_at": "2026-07-24T..."
}
```

**Database verification:** New row in `therapist_notes` with correct `client_id` and `text`.

---

## End-to-End Round-Trip Test

**Scenario:** Client submits exercise → Therapist approves → Client sees approval in Messages

| Step | Action | Expected | Result |
|---|---|---|---|
| 1 | Mobile app: tap "Submit to Dr. Kim" | POST /v1/mobile/1/submit → 201 | ✅ |
| 2 | Therapist web: submission appears in queue | GET /v1/submissions?status=pending | ✅ |
| 3 | Therapist web: click Approve with note | PATCH /v1/submissions/{id}/approve → 200 | ✅ |
| 4 | Mobile app: refresh Messages tab | GET /v1/mobile/1 returns approved message | ✅ |

**Result: ✅ Full round-trip verified end-to-end.**
