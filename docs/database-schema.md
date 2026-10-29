# Database Schema Documentation

## 1. Overview

The system uses MongoDB with Mongoose ODM. The database schema encompasses **10 specialized collections** enforcing referential integrity, unique constraints, compound indexes for rapid query execution, and privacy-preserving data isolation.

---

## 2. Entity-Relationship Model

```mermaid
erDiagram
    USER ||--o{ CLASS : "instructs"
    USER ||--o{ ENROLLMENT : "enrolled_in"
    USER ||--o{ ATTENDANCE : "attends"
    USER ||--o{ ENGAGEMENT_RECORD : "generates"
    USER ||--o{ CONSENT_RECORD : "controls"
    USER ||--o{ CHAT_MESSAGE : "sends"
    USER ||--o{ MODERATION_EVENT : "reviewed_by"
    USER ||--o{ SECURITY_EVENT : "originates"

    CLASS ||--o{ ENROLLMENT : "has"
    CLASS ||--o{ CLASSROOM_SESSION : "schedules"

    CLASSROOM_SESSION ||--o{ ATTENDANCE : "tracks"
    CLASSROOM_SESSION ||--o{ ENGAGEMENT_RECORD : "contains"
    CLASSROOM_SESSION ||--o{ CONSENT_RECORD : "governs"
    CLASSROOM_SESSION ||--o{ CHAT_MESSAGE : "receives"
    CLASSROOM_SESSION ||--o{ MODERATION_EVENT : "flags"
```

---

## 3. Detailed Collection Specifications

### 3.1 User (`users`)
Stores account credentials, profile details, and role assignments.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique user identifier |
| `name` | String | Yes | - | Full display name (trimmed, 2-100 chars) |
| `email` | String | Yes | - | Lowercase unique email address |
| `password` | String | Yes | - | Bcrypt hash (cost factor: 12) |
| `role` | String | Yes | `'student'` | Enum: `['student', 'instructor', 'admin']` |
| `status` | String | Yes | `'active'` | Enum: `['active', 'suspended', 'pending']` |
| `avatar` | String | No | `null` | URL or base64 placeholder |
| `lastLogin` | Date | No | `null` | Timestamp of most recent authentication |
| `createdAt` | Date | Auto | `now` | Record creation timestamp |
| `updatedAt` | Date | Auto | `now` | Record last modification timestamp |

- **Indexes:**
  - `{ email: 1 }` (Unique)
  - `{ role: 1 }`
  - `{ status: 1 }`

---

### 3.2 Class (`classes`)
Represents an academic course created and administered by an instructor.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique class identifier |
| `name` | String | Yes | - | Title of the course (e.g. "Data Structures") |
| `code` | String | Yes | - | Course code (e.g. "CS301", uppercase) |
| `description` | String | No | `""` | Detailed curriculum summary |
| `instructorId` | ObjectId | Yes | - | Reference -> `User._id` |
| `semester` | String | No | `'Fall 2026'` | Academic term |
| `schedule` | String | No | `""` | Weekly meeting pattern |
| `status` | String | Yes | `'active'` | Enum: `['active', 'archived']` |

- **Indexes:**
  - `{ code: 1 }` (Unique)
  - `{ instructorId: 1 }`

---

### 3.3 Enrollment (`enrollments`)
Tracks student membership and enrollment approvals within a course.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique enrollment record |
| `classId` | ObjectId | Yes | - | Reference -> `Class._id` |
| `studentId` | ObjectId | Yes | - | Reference -> `User._id` |
| `status` | String | Yes | `'active'` | Enum: `['active', 'pending', 'dropped']` |
| `enrolledAt` | Date | Yes | `now` | Timestamp of enrollment |

- **Indexes:**
  - `{ classId: 1, studentId: 1 }` (Compound Unique — Prevents duplicate enrollments)
  - `{ studentId: 1 }`

---

### 3.4 ClassroomSession (`classroomsessions`)
Represents a scheduled or live interactive virtual lecture session.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique session identifier |
| `classId` | ObjectId | Yes | - | Reference -> `Class._id` |
| `instructorId` | ObjectId | Yes | - | Reference -> `User._id` |
| `title` | String | Yes | - | Lecture title (e.g., "Lecture 04: Tree Traversal") |
| `status` | String | Yes | `'scheduled'` | Enum: `['scheduled', 'active', 'ended', 'cancelled']` |
| `startTime` | Date | Yes | - | Scheduled commencement time |
| `endTime` | Date | No | `null` | Scheduled or actual conclusion time |
| `actualStart` | Date | No | `null` | Instant instructor clicked 'Start Session' |
| `actualEnd` | Date | No | `null` | Instant session was terminated |
| `settings` | Object | Yes | Defaults | Configuration for chat, recording, telemetry |
| `settings.allowChat` | Boolean | Yes | `true` | Classroom text chat permission |
| `settings.analyticsEnabled` | Boolean | Yes | `true` | Allows telemetry ingestion |
| `settings.requireConsent` | Boolean | Yes | `true` | Enforces explicit student opt-in |

- **Indexes:**
  - `{ classId: 1, status: 1 }`
  - `{ instructorId: 1 }`

---

### 3.5 Attendance (`attendances`)
Maintains formal presence records, entry timestamps, exit timestamps, and accumulated duration.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique attendance entry |
| `sessionId` | ObjectId | Yes | - | Reference -> `ClassroomSession._id` |
| `studentId` | ObjectId | Yes | - | Reference -> `User._id` |
| `joinedAt` | Date | Yes | `now` | First session join instant |
| `leftAt` | Date | No | `null` | Final disconnect instant |
| `durationMinutes`| Number | Yes | `0` | Cumulative minutes actively present |
| `status` | String | Yes | `'present'` | Enum: `['present', 'late', 'absent', 'left_early']` |

- **Indexes:**
  - `{ sessionId: 1, studentId: 1 }` (Compound Unique — Prevents duplicate attendance rows)
  - `{ studentId: 1 }`

---

### 3.6 EngagementRecord (`engagementrecords`)
Time-series of derived visual and behavioural indicators submitted during a lecture.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique metric entry |
| `sessionId` | ObjectId | Yes | - | Reference -> `ClassroomSession._id` |
| `studentId` | ObjectId | Yes | - | Reference -> `User._id` |
| `timestamp` | Date | Yes | `now` | Instant telemetry was sampled |
| `overallScore` | Number | Yes | - | Bounded 0–100 derived engagement indicator |
| `facialState` | String | Yes | `'attentive'`| Enum: `['attentive', 'distracted', 'absent', 'fatigued']` |
| `attentionScore`| Number | Yes | - | Mathematical attention estimate (0–100) |
| `headPoseState` | String | Yes | `'facing_camera'` | Enum: `['facing_camera', 'looking_away', 'head_down', 'head_tilted']` |
| `eyeGazeScore` | Number | Yes | - | Eye Aspect Ratio / Gaze indicator (0–100) |
| `distractionFlag`| Boolean | Yes | `false` | True when head orientation exceeds ±28° |
| `notes` | String | No | `""` | Contextual notes (e.g. low-light condition) |

> **Privacy Guarantee:** This collection NEVER stores raw base64 frames, binary images, or video blobs.

- **Indexes:**
  - `{ sessionId: 1, timestamp: -1 }`
  - `{ studentId: 1, timestamp: -1 }`
  - `{ sessionId: 1, studentId: 1 }`

---

### 3.7 ConsentRecord (`consentrecords`)
Auditable record of user consent for optional computer vision analysis.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique consent log |
| `studentId` | ObjectId | Yes | - | Reference -> `User._id` |
| `sessionId` | ObjectId | Yes | - | Reference -> `ClassroomSession._id` |
| `analysisType` | String | Yes | `'face_landmarks'` | Enum: `['webcam', 'audio', 'screen', 'face_landmarks']` |
| `consentGiven` | Boolean | Yes | `true` | Current consent authorization state |
| `grantedAt` | Date | Yes | `now` | Instant consent was granted |
| `withdrawnAt` | Date | No | `null` | Instant consent was revoked |

- **Indexes:**
  - `{ studentId: 1, sessionId: 1, analysisType: 1 }` (Compound Unique)

---

### 3.8 ChatMessage (`chatmessages`)
Classroom chat messages exchanged during active sessions.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique message ID |
| `sessionId` | ObjectId | Yes | - | Reference -> `ClassroomSession._id` |
| `senderId` | ObjectId | Yes | - | Reference -> `User._id` |
| `message` | String | Yes | - | Text content (trimmed, max 1000 chars) |
| `isFlagged` | Boolean | Yes | `false` | Set to true if flagged by ML moderation |
| `moderationCategory` | String | No | `null` | Category e.g. `'insult'`, `'profanity'` |
| `moderationConfidence` | Number | No | `null` | Model confidence probability (0.00–1.00) |
| `createdAt` | Date | Auto | `now` | Broadcast timestamp |

- **Indexes:**
  - `{ sessionId: 1, createdAt: 1 }`
  - `{ senderId: 1 }`

---

### 3.9 ModerationEvent (`moderationevents`)
Reviewable audit trail of messages flagged for inappropriate language or harassment.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique event identifier |
| `sessionId` | ObjectId | Yes | - | Reference -> `ClassroomSession._id` |
| `messageId` | ObjectId | Yes | - | Reference -> `ChatMessage._id` |
| `senderId` | ObjectId | Yes | - | Reference -> `User._id` |
| `category` | String | Yes | `'profanity'` | Enum: `['profanity', 'harassment', 'threat', 'insult', 'toxic', 'other']` |
| `severity` | String | Yes | `'medium'` | Enum: `['low', 'medium', 'high', 'critical']` |
| `confidence` | Number | Yes | `0` | Model confidence score (0.00–1.00) |
| `flaggedContent` | String | Yes | - | Snapshot of the flagged text |
| `reviewStatus` | String | Yes | `'pending'` | Enum: `['pending', 'reviewed', 'dismissed', 'confirmed']` |
| `reviewedBy` | ObjectId | No | `null` | Reference -> `User._id` (Instructor/Admin) |
| `reviewedAt` | Date | No | `null` | Timestamp of moderation resolution |
| `actionTaken` | String | Yes | `'none'` | Enum: `['none', 'warning_sent', 'message_deleted', 'student_muted']` |
| `instructorNotes` | String | No | `""` | Instructor's remarks regarding the event |

- **Indexes:**
  - `{ sessionId: 1, reviewStatus: 1 }`
  - `{ senderId: 1 }`

---

### 3.10 SecurityEvent (`securityevents`)
System-level security and access control audit log.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto | Unique log entry |
| `eventType` | String | Yes | - | e.g. `'login_failure'`, `'forbidden_access'`, `'unauthorized_join'` |
| `userId` | ObjectId | No | `null` | Reference -> `User._id` if identifiable |
| `email` | String | No | `null` | Email submitted during authentication attempt |
| `ipAddress` | String | No | `null` | Client network origin |
| `userAgent` | String | No | `null` | Client device user-agent |
| `resource` | String | No | `null` | Target URI or resource requested |
| `outcome` | String | Yes | `'denied'` | Enum: `['denied', 'allowed', 'flagged']` |
| `metadata` | Object | No | `{}` | Contextual details (role attempted, class ID) |
| `timestamp` | Date | Auto | `now` | Event occurrence timestamp |

- **Indexes:**
  - `{ eventType: 1, timestamp: -1 }`
  - `{ userId: 1 }`
  - `{ timestamp: -1 }`
