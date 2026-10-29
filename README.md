# AI-Based Virtual Classroom Engagement Analytics System

A comprehensive, full-stack, AI-powered virtual classroom and engagement analytics application engineered for academic transparency, non-punitive focus tracking, real-time classroom collaboration, and NLP chat moderation.

---

## 🏛️ Architecture Overview

The system is architected into three decoupled, independent microservices with strict separation of concerns and privacy boundaries:

```
┌────────────────────────────────────────────────────────┐
│               Client Browser (Frontend)                │
│  React 19 + Vite + Tailwind CSS + Lucide + Recharts    │
│  - Ephemeral Computer Vision & Facial Landmark Mesh    │
│  - Socket.IO Real-time WebRTC & Messaging              │
│  - Student & Instructor Role-Based Interactive Views  │
└───────────────────────┬────────────────────────────────┘
                        │ HTTP / WebSockets (REST & Socket.IO)
                        ▼
┌────────────────────────────────────────────────────────┐
│            Backend Server (Node.js / Express)          │
│  - JWT Authentication (HttpOnly secure cookie strategy)│
│  - MongoDB Atlas / Local MongoDB Mongoose Persistence  │
│  - Role-Based Access Control (Student/Instructor/Admin)│
│  - Socket.IO Classroom Rooms, Signaling & HUD Events   │
│  - Attendance Interval Tracking & Session Lifecycle    │
└───────────────────────┬────────────────────────────────┘
                        │ Internal HTTP Microservice API
                        ▼
┌────────────────────────────────────────────────────────┐
│            AI Service (Python 3.13 / FastAPI)          │
│  - Uvicorn Asynchronous REST Endpoints                 │
│  - Computer Vision Head-Pose (Yaw/Pitch/Roll) & EAR   │
│  - Transparent Weighted Focus & Engagement Scoring     │
│  - NLP Toxicity & Content Moderation Classifier       │
└────────────────────────────────────────────────────────┘
```

---

## 🛡️ Core Privacy Guarantee

1. **Zero Raw Video Storage**: Student webcams are never recorded, uploaded, or persisted to any server or cloud bucket.
2. **Local Feature Extraction**: Facial landmarks and attention vectors are derived ephemerally on-device.
3. **Explicit Consent Architecture**: Students must explicitly grant consent before any engagement observations are submitted. Withdrawing consent immediately stops all telemetry.
4. **Non-Punitive Analytics**: Engagement indicators are clearly documented as observable estimates, not definitive proof of attention or comprehension.

---

## 🚀 Quick Start / Local Setup (Windows)

### Prerequisites
- **Node.js**: v18+ (tested on Node v23.11.0)
- **Python**: 3.11+ (tested on Python 3.13.1)
- **MongoDB**: Community Server running locally on `localhost:27017` or MongoDB Atlas URI

---

### Step 1: Clone and Configure Environment

Navigate to the project root:
```powershell
cd "c:\Users\Public\Desktop\23J41A12D8\MAJOR PROJECT\PROJECT\virtual-classroom-ai"
```

Verify or adjust environment files in each service directory:
- `backend/.env`
- `ai-service/.env`
- `frontend/.env`

---

### Step 2: Start the Python AI Service

```powershell
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Health Check*: `http://127.0.0.1:8000/health` or `http://127.0.0.1:8000/docs`

---

### Step 3: Seed Database & Start Backend Server

```powershell
cd ../backend
npm install
npm run seed       # Populates default instructors, students, classes, and sessions
npm start          # Starts server on http://localhost:5000
```
*Health Check*: `http://localhost:5000/api/health`

---

### Step 4: Start Frontend Client

```powershell
cd ../frontend
npm install
npm run dev
```
*Access Web App*: Open `http://localhost:5173` in your browser.

---

## 🔑 Default Seeded Accounts

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@classroom.ai` | `Admin@1234` |
| **Instructor** | `instructor@classroom.ai` | `Teacher@1234` |
| **Student 1** | `student1@classroom.ai` | `Student@1234` |
| **Student 2** | `student2@classroom.ai` | `Student@1234` |
| **Student 3** | `student3@classroom.ai` | `Student@1234` |

---

## 📁 Repository Structure

```
virtual-classroom-ai/
  ├── frontend/              # React 19 + Vite + Tailwind CSS Single Page App
  │   ├── src/
  │   │   ├── components/    # Reusable UI cards, tables, modals, spinners
  │   │   ├── contexts/      # AuthContext, SessionContext
  │   │   ├── layouts/       # DashboardLayout, PublicLayout
  │   │   ├── pages/         # Login, Register, Dashboard, Classes, Live Classroom, Analytics
  │   │   ├── services/      # Centralized Axios API client
  │   │   └── routes/        # Role-based protected routes
  ├── backend/               # Express.js REST API & Socket.IO server
  │   ├── src/
  │   │   ├── config/        # Environment and MongoDB connection modules
  │   │   ├── controllers/   # Auth, Class, Session, Analytics, Chat, Report controllers
  │   │   ├── middleware/    # JWT verification, Role authorization, Error handler
  │   │   ├── models/        # Mongoose schemas (User, Class, Attendance, Moderation, etc.)
  │   │   ├── routes/        # Versioned /api/v1 endpoints
  │   │   ├── sockets/       # Socket.IO room management, chat, telemetry HUD
  │   │   └── utils/         # JWT generation, token cookies
  ├── ai-service/            # FastAPI Python Microservice
  │   ├── app/
  │   │   ├── api/           # Health, Engagement, Moderation endpoints
  │   │   ├── core/          # Configuration and settings
  │   │   ├── schemas/       # Pydantic validation models
  │   │   └── services/      # Computer vision & NLP moderation models
  ├── docs/                  # Architecture, schema, and API documentation
  └── README.md              # Project overview and setup instructions
```

---

## 📚 Comprehensive Documentation Suite

Full technical and academic documentation is available in the [`docs/`](./docs) directory:

1. [System Architecture](./docs/architecture.md) — Component topology, microservice boundaries, sequence diagrams.
2. [Database Schema](./docs/database-schema.md) — 10 Mongoose schemas, relationships, indexes, unique constraints.
3. [API Documentation](./docs/api-documentation.md) — Complete REST specifications for Auth, Classes, Sessions, Telemetry, Chat, Moderation, Reports, Admin.
4. [Windows Setup Guide](./docs/setup-guide.md) — Step-by-step local Windows installation and configuration.
5. [Automated Testing Guide](./docs/testing-guide.md) — Test suites, execution commands, and expected assertions.
6. [Privacy & Security](./docs/privacy-and-security.md) — Ephemeral video processing, consent management, RBAC, audit logging.
7. [AI & ML Methodology](./docs/ai-methodology.md) — Mathematical scoring formulas, head-pose/EAR derivations, Scikit-learn NLP pipeline.
8. [Comprehensive User Guide](./docs/user-guide.md) — Complete workflows for Student, Instructor, and Administrator roles.
9. [Troubleshooting Guide](./docs/troubleshooting.md) — Port conflict resolution, MongoDB connection fixes, camera access permissions.

---

## 🧪 Automated Testing

### Backend Integration Tests (10/10 Passing)
```powershell
cd backend
npm test
```

### Python AI Microservice Tests (8/8 Passing)
```powershell
cd ai-service
python -m unittest tests/test_ai_service.py
```

### Frontend Production Build Verification
```powershell
cd frontend
npm run build
```

---

## 🧪 Operational Status Verification

Run the following checks to verify all services:
- **Backend Health**: `GET http://localhost:5000/api/health`
- **Backend Readiness**: `GET http://localhost:5000/api/health/ready`
- **AI Service Health**: `GET http://localhost:8000/health`
- **AI API Capabilities**: `GET http://localhost:8000/api/v1/health`

