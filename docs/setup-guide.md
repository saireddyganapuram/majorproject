# Windows Local Setup Guide

This guide provides step-by-step instructions to configure, initialize, and execute the **AI-Based Virtual Classroom Engagement Analytics System** locally on Windows.

---

## 1. System Requirements

Ensure the following tools are installed on your Windows machine:
- **Node.js:** v18.x, v20.x, or v22.x ([Download Node.js](https://nodejs.org/))
- **Python:** v3.10, v3.11, v3.12, or v3.13 ([Download Python](https://python.org/)) — *Ensure "Add Python to PATH" is checked during installation*
- **MongoDB:** MongoDB Community Server running locally on `localhost:27017` ([Download MongoDB](https://www.mongodb.com/try/download/community)) OR a free MongoDB Atlas connection string.
- **PowerShell:** Windows PowerShell 5.1 or PowerShell 7+.

---

## 2. Directory Structure

```text
virtual-classroom-ai/
  backend/          # Node.js Express ESM Server (:5000)
  frontend/         # Vite React 19 Frontend (:5173)
  ai-service/       # Python FastAPI AI Microservice (:8000)
  docs/             # Academic and Architecture Documentation
  README.md         # Master README
```

---

## 3. Step-by-Step Installation

Open three separate PowerShell terminal windows (one for each microservice).

### Terminal 1: Backend Setup & Database Seeding

```powershell
# Navigate to the backend directory
cd "virtual-classroom-ai\backend"

# 1. Install dependencies
npm install

# 2. Verify or create .env file
# Ensure the following values are in backend\.env:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/virtual-classroom
# JWT_SECRET=super_secret_jwt_key_virtual_classroom_2026_production_ready
# JWT_EXPIRES_IN=7d
# FRONTEND_URL=http://localhost:5173
# AI_SERVICE_URL=http://localhost:8000
# NODE_ENV=development

# 3. Seed the database with sample academic courses, students, and sessions
npm run seed

# 4. Start the backend server
npm run dev
# OR for production: npm start
```

*Expected output in Terminal 1:*
```text
✅ MongoDB connected: localhost
✅ Real-time Virtual Classroom Socket.IO signaling ready
🚀 Backend server running on http://localhost:5000
```

---

### Terminal 2: Python AI Microservice Setup

```powershell
# Navigate to the ai-service directory
cd "virtual-classroom-ai\ai-service"

# 1. Install Python dependencies
pip install -r requirements.txt
# Alternatively, install explicitly:
# pip install fastapi uvicorn pydantic numpy opencv-python scikit-learn httpx

# 2. Verify or create .env file
# Ensure the following values are in ai-service\.env:
# HOST=127.0.0.1
# PORT=8000
# ENVIRONMENT=development
# BACKEND_URL=http://localhost:5000

# 3. Start the FastAPI microservice
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

*Expected output in Terminal 2:*
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

---

### Terminal 3: Frontend Client Setup

```powershell
# Navigate to the frontend directory
cd "virtual-classroom-ai\frontend"

# 1. Install dependencies
npm install

# 2. Verify or create .env file
# Ensure the following values are in frontend\.env:
# VITE_API_URL=http://localhost:5000/api/v1
# VITE_SOCKET_URL=http://localhost:5000

# 3. Start the Vite React development server
npm run dev
```

*Expected output in Terminal 3:*
```text
  VITE v8.3.4  ready in 240 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 4. Default Seeded Credentials

The database seed script generates pre-configured academic profiles across all three primary roles:

| Role | Email Address | Password | Permissions & Intended Workflow |
|---|---|---|---|
| **Administrator** | `admin@classroom.ai` | `Admin@1234` | Full access to `/admin`, account toggling, security audit logs, service diagnostics |
| **Instructor** | `instructor@classroom.ai` | `Teacher@1234` | Create courses, launch live classroom sessions, monitor telemetry, review chat moderation |
| **Student 1** | `student1@classroom.ai` | `Student@1234` | Enrolled in CS301; joins live lecture, tests webcam consent, submits derived metrics |
| **Student 2** | `student2@classroom.ai` | `Student@1234` | Enrolled in CS301; classroom chat participant |
| **Student 3** | `student3@classroom.ai` | `Student@1234` | Additional enrolled peer |

---

## 5. Verification Checklist

1. **Backend Health Check:** Open `http://localhost:5000/api/health` in your browser. Verify that `mongodb` is `"connected"` and `aiService` is `"healthy"`.
2. **AI Service Health Check:** Open `http://127.0.0.1:8000/health`. Verify that it returns `{"status":"healthy"}`.
3. **Frontend Application:** Open `http://localhost:5173`. You should see the sleek, modern login portal.
4. **Log In as Instructor:** Use `instructor@classroom.ai` / `Teacher@1234`. Access courses, inspect analytics, and test session management.
5. **Log In as Student:** In a private window, log in as `student1@classroom.ai` / `Student@1234`. Join the active session, toggle camera consent, and observe local facial telemetry calculation.
