# MyTherapyPath — API Documentation

**Base URL:** `http://localhost:8000`  
**API Version Prefix:** `/v1`  
**Format:** All requests and responses use `Content-Type: application/json`

---

## Health Check

### `GET /health`
Confirms the server is running.

**Response:**
```json
{ "status": "ok" }
```

---

## Clients

### `GET /v1/clients?therapist_id={id}`
Returns all clients belonging to a therapist.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| therapist_id | string | Yes | The therapist's ID |

**Sample Response:**
```json
[
  {
    "id": "1",
    "therapist_id": "therapist-1",
    "name": "Emma Thompson",
    "age": 8,
    "condition": "Fine Motor Skills",
    "status": "active",
    "color": "bg-purple-100 text-purple-700",
    "frequency": 3,
    "completed_this_week": 2,
    "next_session": "2026-07-01",
    "created_at": "2026-07-20T10:00:00",
    "program": {
      "id": "uuid-here",
      "name": "Pediatric Fine Motor Program",
      "frequency_per_week": 3
    }
  }
]
```

---

### `GET /v1/clients/{id}`
Returns a single client by ID.

**Sample Response:**
```json
{
  "id": "1",
  "therapist_id": "therapist-1",
  "name": "Emma Thompson",
  "age": 8,
  "condition": "Fine Motor Skills",
  "status": "active",
  "color": "bg-purple-100 text-purple-700",
  "frequency": 3,
  "completed_this_week": 2,
  "next_session": "2026-07-01",
  "created_at": "2026-07-20T10:00:00",
  "program": {
    "id": "uuid-here",
    "name": "Pediatric Fine Motor Program",
    "frequency_per_week": 3
  }
}
```

---

### `POST /v1/clients`
Creates a new client.

**Request Body:**
```json
{
  "therapist_id": "therapist-1",
  "name": "Sarah Johnson",
  "age": 10,
  "condition": "Handwriting Development",
  "color": "bg-green-100 text-green-700",
  "frequency": 3,
  "next_session": "2026-07-28",
  "status": "active"
}
```

**Response (201 Created):**
```json
{
  "id": "new-uuid",
  "therapist_id": "therapist-1",
  "name": "Sarah Johnson",
  "age": 10,
  "condition": "Handwriting Development",
  "status": "active",
  "color": "bg-green-100 text-green-700",
  "frequency": 3,
  "completed_this_week": 0,
  "next_session": "2026-07-28",
  "created_at": "2026-07-24T14:00:00",
  "program": null
}
```

---

### `PATCH /v1/clients/{id}`
Updates one or more fields on an existing client.

**Request Body (all fields optional):**
```json
{
  "status": "inactive"
}
```

**Sample Response:**
```json
{
  "id": "1",
  "name": "Emma Thompson",
  "status": "inactive"
}
```

---

### `DELETE /v1/clients/{id}`
Deletes a client and all associated records.

**Response (204 No Content):** empty body

---

### `GET /v1/clients/{id}/notes`
Returns all therapist notes for a client.

**Sample Response:**
```json
[
  {
    "id": "uuid",
    "client_id": "1",
    "therapist_id": "therapist-1",
    "text": "Emma is making great progress on pinching exercises.",
    "created_at": "2026-07-10T09:00:00"
  }
]
```

---

### `POST /v1/clients/{id}/notes`
Adds a new note to a client's record.

**Request Body:**
```json
{
  "therapist_id": "therapist-1",
  "text": "Emma showed improved grip strength today."
}
```

**Response (201 Created):**
```json
{
  "id": "new-uuid",
  "client_id": "1",
  "therapist_id": "therapist-1",
  "text": "Emma showed improved grip strength today.",
  "created_at": "2026-07-24T14:30:00"
}
```

---

## Submissions

### `GET /v1/submissions?therapist_id={id}`
Returns all exercise submissions for a therapist's clients. Supports optional filters.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| therapist_id | string | Yes | Filter by therapist |
| status | string | No | Filter by status: `pending`, `approved`, `rejected` |
| client_id | string | No | Filter by client |

**Sample Response:**
```json
[
  {
    "id": "uuid",
    "client_id": "1",
    "exercise_name": "Pinch and Release",
    "media_type": "video",
    "media_url": null,
    "status": "pending",
    "therapist_note": null,
    "duration": null,
    "submitted_at": "2026-07-24T13:45:00",
    "revision_of_id": null,
    "revision_number": null
  }
]
```

---

### `PATCH /v1/submissions/{id}/approve`
Approves a submission and records the therapist's note.

**Request Body:**
```json
{
  "note": "Excellent form! Your pinching technique has really improved."
}
```

**Sample Response:**
```json
{
  "id": "uuid",
  "status": "approved",
  "therapist_note": "Excellent form! Your pinching technique has really improved.",
  "submitted_at": "2026-07-24T13:45:00"
}
```

---

### `PATCH /v1/submissions/{id}/reject`
Rejects a submission with feedback for the client.

**Request Body:**
```json
{
  "note": "Good effort! Please make sure the camera captures your full hand next time."
}
```

**Sample Response:**
```json
{
  "id": "uuid",
  "status": "rejected",
  "therapist_note": "Good effort! Please make sure the camera captures your full hand next time.",
  "submitted_at": "2026-07-24T13:45:00"
}
```

---

## Exercise Templates

### `GET /v1/templates`
Returns all available exercise templates.

**Sample Response:**
```json
[
  {
    "id": "uuid",
    "title": "Pinch and Release",
    "description": null,
    "instructions": "Pick up small objects using a pinch grip and release into a container.",
    "video_url": null,
    "category": null,
    "duration_minutes": 5,
    "created_at": "2026-07-20T10:00:00"
  }
]
```

---

### `POST /v1/templates`
Creates a new exercise template.

**Request Body:**
```json
{
  "title": "Finger Tapping",
  "instructions": "Tap each finger to thumb in sequence, both hands, 3 sets of 10.",
  "duration_minutes": 5
}
```

---

### `DELETE /v1/templates/{id}`
Deletes an exercise template.

**Response (204 No Content):** empty body

---

## Programs

### `GET /v1/programs/{client_id}`
Returns the exercise program assigned to a client.

**Sample Response:**
```json
{
  "id": "uuid",
  "client_id": "1",
  "name": "Pediatric Fine Motor Program",
  "frequency_per_week": 3,
  "created_at": "2026-07-20T10:00:00",
  "updated_at": "2026-07-20T10:00:00",
  "exercises": [
    {
      "id": "uuid",
      "order": 1,
      "template": {
        "id": "uuid",
        "title": "Pinch and Release",
        "duration_minutes": 5
      }
    }
  ]
}
```

---

### `POST /v1/programs`
Creates or replaces a client's exercise program.

**Request Body:**
```json
{
  "client_id": "1",
  "name": "Pediatric Fine Motor Program",
  "frequency_per_week": 3,
  "exercise_template_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

---

## Dashboard

### `GET /v1/dashboard?therapist_id={id}`
Returns summary statistics for the therapist's dashboard.

**Sample Response:**
```json
{
  "active_clients": 4,
  "pending_reviews": 3,
  "completed_this_week": 10,
  "total_submissions": 7
}
```

---

## Mobile (Client-Facing)

### `GET /v1/mobile/{client_id}`
Returns everything the mobile app needs in a single call: client info, assigned exercises, and message history.

**Sample Response:**
```json
{
  "client": {
    "name": "Emma",
    "full_name": "Emma Thompson",
    "age": 8
  },
  "exercises": [
    { "id": "uuid", "title": "Pinch and Release", "duration_minutes": 5 },
    { "id": "uuid", "title": "Bead Threading", "duration_minutes": 5 },
    { "id": "uuid", "title": "Playdough Squeeze", "duration_minutes": 5 },
    { "id": "uuid", "title": "Scissors Practice", "duration_minutes": 5 }
  ],
  "messages": [
    {
      "kind": "approved",
      "id": "uuid",
      "exercise_name": "Playdough Squeeze",
      "therapist_note": "Great job! Your grip strength is really improving.",
      "date": "July 9, 2026"
    },
    {
      "kind": "rejected",
      "id": "uuid",
      "exercise_name": "Bead Threading",
      "rejection_note": "Please keep the camera steady so we can see your full hand.",
      "date": "July 10, 2026",
      "has_revision": true
    }
  ]
}
```

---

### `POST /v1/mobile/{client_id}/submit`
Records a new exercise submission from the client.

**Request Body:**
```json
{
  "exercise_name": "Pinch and Release",
  "media_type": "video"
}
```

**Response (201 Created):**
```json
{
  "id": "new-uuid",
  "status": "pending"
}
```

---

### `POST /v1/mobile/submissions/{original_id}/resubmit`
Records a revised submission in response to a rejection.

**Request Body:**
```json
{
  "exercise_name": "Bead Threading",
  "media_type": "video"
}
```

**Response (201 Created):**
```json
{
  "id": "new-uuid",
  "status": "pending",
  "revision_number": 2
}
```
