# System Architecture

## 1. Executive Overview

The **AI-Based Virtual Classroom Engagement Analytics System** is a distributed, academic-grade web platform designed to provide transparent, privacy-preserving classroom engagement telemetry, real-time communication, automated chat moderation, and administrative oversight for online learning environments.

The architecture emphasizes **edge-first client-side visual telemetry** to ensure that sensitive raw biometric video feeds never leave the student's personal device, combined with a decoupled **Python microservice for NLP moderation** and an authoritative **Node.js/Express backend** managing persistence, authentication, authorization, and real-time WebSocket distribution.

---

## 2. Component Topology

```mermaid
graph TD
    subgraph Client Tier ["Client Tier (Browser / React 19)"]
        UI["React SPA & Recharts Dashboards"]
        CV["Local Computer Vision (faceTracker.js)"]
        Cam[("Student Webcam (Ephemeral)")]
        SockClient["Socket.IO Client"]
        
        Cam -->|Raw Video Frames| CV
        CV -->|Derived Indicators JSON Only| UI
    end

    subgraph Backend Tier ["Backend Tier (Node.js / Express ESM)"]
        API["Express API Gateway (:5000)"]
        AuthMiddleware["JWT & RBAC Security Middleware"]
        ChatEngine["Chat & Moderation Coordinator"]
        SocketServer["Socket.IO Server (Rooms & Signaling)"]
        ReportGen["CSV & Aggregation Engine"]
        
        UI -->|HTTPS / REST /api/v1| API
        SockClient <-->|WebSockets WSS| SocketServer
        API --> AuthMiddleware
        API --> ChatEngine
        API --> ReportGen
    end

    subgraph AI Microservice ["AI & NLP Tier (Python / FastAPI)"]
        FastAPIApp["FastAPI Service (:8000)"]
        NLPMod["ML Moderation (TF-IDF + Logistic Regression)"]
        CVEng["CV Landmarks & Geometric Scoring"]
        
        ChatEngine -->|HTTP POST /api/v1/moderation/text| NLPMod
        API -->|Diagnostic /api/v1/health| FastAPIApp
    end

    subgraph Database Tier ["Data Persistence Tier (MongoDB)"]
        MDB[("MongoDB Database (:27017)")]
        
        API <-->|Mongoose ODM| MDB
    end
```

---

## 3. Tier Responsibilities and Boundaries

### 3.1 Client Tier (Frontend)
- **Technology:** React 19, Vite, Tailwind CSS, Lucide React, Recharts, Socket.IO Client.
- **Responsibilities:**
  - Role-tailored dashboards for Students, Instructors, and System Administrators.
  - Ephemeral camera acquisition via HTML5 `navigator.mediaDevices.getUserMedia`.
  - In-browser facial orientation, Euler angle derivation (yaw, pitch, roll proxy), Eye Aspect Ratio (EAR) approximation, and local scoring.
  - Strict privacy gating: Discards frames immediately after processing. Transmits only numeric JSON metrics (`overallScore`, `facialState`, `attentionScore`, `headPoseState`, `eyeGazeScore`).
  - Real-time room synchronization for chat, attendance notifications, and live engagement heatmaps.

### 3.2 Backend Application Tier
- **Technology:** Node.js (ES Modules), Express.js, Socket.IO, Mongoose, Helmet, Morgan.
- **Responsibilities:**
  - Authoritative source of identity, session lifecycle, and role permissions (Student, Instructor, Administrator).
  - Secure credential storage using `bcryptjs` (salt rounds: 12) and dual-channel JWT verification (HttpOnly cookies + `Bearer` token header).
  - Persistence of 10 structured schemas in MongoDB.
  - Real-time Socket.IO signaling rooms scoped to `session:${sessionId}`.
  - Forwarding student chat messages to the Python AI service for NLP classification prior to public classroom broadcast.
  - In-memory rate limiting for sensitive authentication and chat endpoints.

### 3.3 AI Microservice Tier
- **Technology:** Python 3.13, FastAPI, Uvicorn, Scikit-learn (`TfidfVectorizer`, `LogisticRegression`), OpenCV, NumPy.
- **Responsibilities:**
  - Standalone, stateless HTTP microservice operating on port `8000`.
  - Multi-class NLP moderation detecting `toxic`, `insult`, `threat`, `harassment`, and `profanity` with calibrated continuous confidence probabilities.
  - Algorithmic landmark geometry processing and normalized heuristic calculation.
  - Zero coupling with backend database: accepts JSON or images via documented REST contracts and returns structured inference outputs.

### 3.4 Data Persistence Tier
- **Technology:** MongoDB Local / Atlas Compatible.
- **Responsibilities:**
  - ACID-compliant document storage for user accounts, classes, enrollments, classroom sessions, attendance logs, consent audits, chat transcripts, moderation events, and engagement time-series.
  - Compound unique indexes preventing duplicate enrollments, simultaneous active attendance logs, and contradictory consent records.

---

## 4. Key End-to-End Workflows

### 4.1 Ephemeral Engagement Telemetry Pipeline
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Browser as Browser (faceTracker.js)
    participant Backend as Node.js Backend (:5000)
    participant DB as MongoDB (:27017)
    actor Instructor

    Student->>Browser: Enters Live Session & Grants Camera + Analysis Consent
    Browser->>Backend: POST /api/v1/analytics/consent { sessionId, granted: true }
    Backend->>DB: Upsert ConsentRecord (consentGiven: true)
    
    loop Every 3.5 Seconds (Configurable Interval)
        Browser->>Browser: Capture video frame to Offscreen Canvas
        Browser->>Browser: Compute Face Presence, Euler Yaw/Pitch, EAR Proxy
        Browser->>Browser: Calculate Heuristic (0.50*Head + 0.35*Eye + 0.15*Face)
        Browser->>Backend: POST /api/v1/analytics/engagement (Derived JSON)
        Backend->>DB: Verify active ConsentRecord -> Persist EngagementRecord
        Backend-->>Instructor: Socket.IO Emit 'engagement:update'
    end

    Note over Browser,Backend: Raw video frames are discarded locally in RAM
    Student->>Browser: Revokes Consent
    Browser->>Backend: POST /api/v1/analytics/consent { sessionId, granted: false }
    Backend->>DB: Update ConsentRecord (consentGiven: false, withdrawnAt: Date)
    Browser->>Browser: Cease telemetry ingestion immediately
```

### 4.2 NLP Chat Moderation & Real-Time Review Pipeline
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Backend as Node.js Backend (:5000)
    participant AI as Python AI Service (:8000)
    participant DB as MongoDB (:27017)
    actor Instructor

    Student->>Backend: Send Chat Message via Socket.IO or POST /api/v1/chat/session/:id
    Backend->>AI: POST /api/v1/moderation/text { text: "message content" }
    AI->>AI: TfidfVectorizer -> LogisticRegression Pipeline Inference
    AI-->>Backend: { flagged: true, category: "insult", confidence: 0.757 }
    
    Backend->>DB: Save ChatMessage (flagged: true)
    Backend->>DB: Save ModerationEvent (status: "pending_review")
    Backend-->>Student: Message broadcasted or held based on session moderation policy
    Backend-->>Instructor: Socket.IO Emit 'moderation:alert'
    
    Instructor->>Backend: PATCH /api/v1/moderation/events/:id/review { status: "confirmed" }
    Backend->>DB: Update ModerationEvent with reviewer ID and timestamp
    Backend-->>Instructor: Return updated event record
```

---

## 5. Security Architecture

1. **Defense in Depth:** All HTTP routes validate token authenticity and role privileges. Route access is denied at the server layer regardless of frontend interface state.
2. **Audit Logging:** Every critical administrative change, forbidden API access attempt, and authentication failure writes an immutable record to the `SecurityEvent` collection.
3. **Data Minimization:** No biometric face images, eye crops, audio streams, or raw browser screen recordings are persisted to disk or cloud storage.
4. **Transport Security:** CORS headers explicitly restrict origins to `http://localhost:5173`. Helmet applies strict HTTP response security headers.
