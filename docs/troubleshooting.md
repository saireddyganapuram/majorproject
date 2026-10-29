# Troubleshooting Guide

This guide provides practical resolutions for common technical challenges encountered during local setup, testing, and execution on Windows.

---

## 1. Port Conflicts

The platform uses three dedicated local ports:
- **Port 5000:** Node.js Express Backend
- **Port 5173:** Vite React Frontend
- **Port 8000:** Python FastAPI AI Microservice

### Symptom: `Error: listen EADDRINUSE: address already in use :::5000`
Another process or zombie Node.js instance is occupying port 5000.

#### Resolution via PowerShell:
```powershell
# 1. Locate the Process ID (PID) occupying port 5000
netstat -ano | findstr :5000

# Example output:
#   TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       12345

# 2. Terminate the process forcefully using its PID
taskkill /F /PID 12345
```
*(Repeat the same commands replacing `5000` with `8000` or `5173` if FastAPI or Vite encounter port conflicts).*

---

## 2. MongoDB Connection Failures

### Symptom: `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`
The local MongoDB Windows service is not actively running.

#### Resolution via PowerShell (Run as Administrator):
```powershell
# 1. Check status of the MongoDB service
Get-Service -Name MongoDB

# 2. Start the service
net start MongoDB
# OR
Start-Service -Name MongoDB
```

#### MongoDB Atlas Alternative:
If running MongoDB locally is not feasible, update `backend/.env`:
```ini
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/virtual-classroom?retryWrites=true&w=majority
```

---

## 3. Camera & Browser Media Access Issues

### Symptom: `NotAllowedError: Permission denied` or "Camera preview unavailable"

1. **Browser Permissions:**
   - In Google Chrome or Microsoft Edge, click the **tune / padlock icon** to the left of `http://localhost:5173` in the address bar.
   - Set **Camera** to **Allow**.
   - Reload the browser tab.
2. **Windows Operating System Privacy Settings:**
   - Open Windows **Settings** (`Win + I`) -> **Privacy & Security** -> **Camera**.
   - Verify that **"Camera access"** is turned **On**.
   - Verify that **"Let desktop apps access your camera"** is toggled to **On**.
3. **Hardware Exclusivity:**
   - Ensure other video conferencing software (Zoom, Microsoft Teams, Discord, OBS) is completely closed and not locking the webcam device exclusively.

---

## 4. Python Environment & Dependency Compatibility

### Symptom: `ModuleNotFoundError: No module named 'scikit-learn'` or `No module named 'fastapi'`

Ensure you are installing packages into the active Python environment:
```powershell
cd "virtual-classroom-ai\ai-service"

# Upgrade pip to latest version
python -m pip install --upgrade pip

# Install dependencies explicitly
pip install fastapi uvicorn pydantic numpy opencv-python scikit-learn httpx
```

### Note on Windows Python 3.13 & MediaPipe
Certain older binary packages (like MediaPipe wheels) lack official pre-built Windows wheels for Python 3.13. The system is engineered to handle this gracefully:
- The AI service and client-side tracker dynamically load robust mathematical and geometric heuristics when C-extensions are absent.
- The Scikit-learn NLP moderation pipeline runs natively across all Python versions from 3.10 to 3.13.

---

## 5. Authentication & Cookie Issues

### Symptom: User redirected to Login immediately after authenticating
1. **Cookie Configuration:** The backend sets cookies with `SameSite: Lax` and `HttpOnly: true`. If accessing frontend over an IP address rather than `localhost`, ensure URLs in `.env` match exactly:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`
2. **Bearer Token Fallback:** The frontend API client (`frontend/src/services/api.js`) automatically attaches `Authorization: Bearer <token>` from memory to prevent cookie domain mismatches.

---

## 6. Real-Time Socket.IO Disconnections

### Symptom: Chat messages or live telemetry updates are not reflecting in real time
1. Check the browser developer console (`F12` -> Console) for WebSocket connection errors.
2. Verify that `VITE_SOCKET_URL` in `frontend/.env` is set to `http://localhost:5000`.
3. Socket.IO automatically attempts WebSocket connection first, then transparently degrades to HTTP long-polling if a proxy or firewall blocks WebSocket upgrades.
