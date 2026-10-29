# API Documentation

## 1. Specification & Standards

All endpoints follow REST principles under the `/api/v1` namespace. Real-time updates occur concurrently over Socket.IO.

### 1.1 Response Envelope Contracts

#### Success Response (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Response (HTTP 400 / 401 / 403 / 404 / 409 / 429 / 500)
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "code": "ERROR_CODE_IDENTIFIER",
  "errors": []
}
```

### 1.2 Authentication Transport
The backend accepts JWT credentials via either:
1. `Cookie: token=<jwt_token>` (HttpOnly, SameSite: Lax)
2. `Authorization: Bearer <jwt_token>` header

---

## 2. Authentication APIs (`/api/v1/auth`)

### 2.1 Register New Account
- **Endpoint:** `POST /api/v1/auth/register`
- **Access:** Public (Students register directly; Instructor/Admin roles require pre-existing system permissions or invitation)
- **Request Body:**
```json
{
  "name": "Jane Student",
  "email": "jane@university.edu",
  "password": "Password@1234",
  "role": "student"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "name": "Jane Student",
      "email": "jane@university.edu",
      "role": "student",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.2 Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public (Rate-limited: 5 attempts per 15 min per IP)
- **Request Body:**
```json
{
  "email": "instructor@classroom.ai",
  "password": "Teacher@1234"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "6ae37b6c5d10f0f18a57f5ec",
      "name": "Prof. Alan Turing",
      "email": "instructor@classroom.ai",
      "role": "instructor"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.3 Get Current Authenticated Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Access:** Authenticated (Any role)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6ae37b6c5d10f0f18a57f5ec",
      "name": "Prof. Alan Turing",
      "email": "instructor@classroom.ai",
      "role": "instructor",
      "status": "active"
    }
  }
}
```

### 2.4 Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Access:** Authenticated
- **Response (200 OK):** Clears HttpOnly cookie.

---

## 3. Classroom Management APIs (`/api/v1/classes`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/classes` | Any Authenticated | Lists courses relevant to the user (enrolled courses for students; authored courses for instructors) |
| `POST` | `/api/v1/classes` | Instructor, Admin | Creates a new academic course |
| `GET` | `/api/v1/classes/:id` | Enrolled / Instructor / Admin | Fetches course details, sessions, and enrolled roster |
| `PATCH` | `/api/v1/classes/:id` | Class Owner, Admin | Updates title, schedule, or syllabus |
| `DELETE`| `/api/v1/classes/:id` | Class Owner, Admin | Archives or removes course |
| `POST` | `/api/v1/classes/:id/enroll` | Student, Admin | Enrolls a student in the specified class |

---

## 4. Session Management APIs (`/api/v1/sessions`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/sessions` | Instructor, Admin | Schedules a new classroom session |
| `GET` | `/api/v1/sessions/:id` | Enrolled / Instructor / Admin | Returns session status, settings, and start/end times |
| `PATCH` | `/api/v1/sessions/:id/start` | Instructor Owner | Transitions session from `scheduled` to `active` |
| `PATCH` | `/api/v1/sessions/:id/end` | Instructor Owner | Concludes session, locks chat, and generates summary |

---

## 5. Privacy, Consent & Telemetry APIs (`/api/v1/analytics` & `/api/v1/engagement`)

### 5.1 Update Analysis Consent
- **Endpoint:** `POST /api/v1/analytics/consent`
- **Access:** Authenticated Student
- **Request Body:**
```json
{
  "sessionId": "6ae37b6c5d10f0f18a57f5f6",
  "granted": true,
  "analysisType": "face_landmarks"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Analytics consent granted",
  "data": {
    "studentId": "6ae37b6c5d10f0f18a57f5ed",
    "sessionId": "6ae37b6c5d10f0f18a57f5f6",
    "consentGiven": true,
    "grantedAt": "2026-10-29T17:31:00.000Z"
  }
}
```

### 5.2 Submit Derived Engagement Telemetry
- **Endpoint:** `POST /api/v1/analytics/engagement` (Also available at `POST /api/v1/engagement/observations`)
- **Access:** Authenticated Student (Requires active ConsentRecord)
- **Request Body:**
```json
{
  "sessionId": "6ae37b6c5d10f0f18a57f5f6",
  "overallScore": 84,
  "facialState": "attentive",
  "attentionScore": 88,
  "headPoseState": "facing_camera",
  "eyeGazeScore": 82,
  "distractionFlag": false
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Engagement record saved",
  "data": { ... }
}
```
- **Response (When Consent Revoked - 200 OK):**
```json
{
  "success": false,
  "message": "Metrics discarded: Student has not consented to engagement analytics",
  "code": "CONSENT_NOT_GRANTED"
}
```

### 5.3 Get Student's Personal Historical Metrics
- **Endpoint:** `GET /api/v1/engagement/students/me/history`
- **Access:** Authenticated Student (Returns only the caller's own records)

---

## 6. Chat & Moderation APIs

### 6.1 Post Message to Classroom Chat
- **Endpoint:** `POST /api/v1/chat/session/:sessionId`
- **Access:** Enrolled Student / Instructor
- **Request Body:**
```json
{
  "message": "What is the amortized complexity of this tree operation?"
}
```
- **Behavior:** The message is automatically passed through the Python AI service (`/api/v1/moderation/text`). If flagged, a `ModerationEvent` is persisted with status `pending`.

### 6.2 Get Moderation Events for Session
- **Endpoint:** `GET /api/v1/moderation/sessions/:sessionId/events`
- **Access:** Instructor Owner, Admin
- **Response (200 OK):** Returns array of flagged messages, categories, confidence scores, and review statuses.

### 6.3 Review Flagged Event
- **Endpoint:** `PATCH /api/v1/moderation/events/:eventId/review`
- **Access:** Instructor Owner, Admin
- **Request Body:**
```json
{
  "status": "confirmed",
  "actionTaken": "warning_sent",
  "instructorNotes": "Confirmed inappropriate language during lecture."
}
```

---

## 7. Reports & Analytics APIs (`/api/v1/reports`)

### 7.1 Session Academic Summary
- **Endpoint:** `GET /api/v1/reports/session/:sessionId/summary`
- **Access:** Instructor Owner, Admin
- **Response (200 OK):** Detailed breakdown of total attendance, average engagement score, distribution by facial state, and moderation totals.

### 7.2 Export Session Report (CSV)
- **Endpoint:** `GET /api/v1/reports/session/:sessionId/csv`
- **Access:** Instructor Owner, Admin
- **Headers:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="session-report.csv"`

---

## 8. Administrative Console APIs (`/api/v1/admin`)

- `GET /api/v1/admin/stats` — High-level counts of Users, Classes, Active Sessions, and Flagged Events.
- `GET /api/v1/admin/users` — Roster of all accounts with role and status filters.
- `PATCH /api/v1/admin/users/:id/status` — Suspend or reactivate user accounts.
- `GET /api/v1/admin/security-events` — Full immutable security audit log.
- `GET /api/v1/admin/health` — Live diagnostic checks of MongoDB, Backend, and AI microservices.

---

## 9. Python AI Service APIs (Port 8000)

### 9.1 Service Health
- **Endpoint:** `GET /health` or `GET /api/v1/health`
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "ai-service",
  "models": {
    "cv_landmarks": "ready",
    "nlp_moderator": "ready"
  }
}
```

### 9.2 NLP Text Moderation
- **Endpoint:** `POST /api/v1/moderation/text`
- **Request Body:**
```json
{
  "text": "Hey you idiot, stop talking!",
  "threshold": 0.5
}
```
- **Response (200 OK):**
```json
{
  "flagged": true,
  "category": "insult",
  "confidence": 0.757,
  "scores": {
    "clean": 0.043,
    "toxic": 0.12,
    "insult": 0.757,
    "threat": 0.02,
    "harassment": 0.04,
    "profanity": 0.02
  },
  "sanitized_text": "Hey you ***, stop talking!"
}
```
