# Automated Testing Guide

This guide details the automated test suites implemented across the backend, AI microservice, and frontend tiers.

---

## 1. Test Architecture Overview

The system adheres to an integrated testing strategy ensuring that unit-level machine learning inferences, API security boundaries, and frontend compilation integrity are systematically verified:

| Component | Framework / Runner | Test Scope | Location |
|---|---|---|---|
| **Backend Integration Suite** | Node.js Native Test Runner (`node:test`, `node:assert/strict`) | 10 End-to-End API scenarios (RBAC, Auth, Telemetry, Consent, Chat, Moderation, Admin, Reports) | `backend/tests/api.test.js` |
| **AI Microservice Suite** | Python `unittest` + `httpx.ASGITransport` | 8 Unit tests (ML NLP classification, Confidence thresholding, Landmark derivation, Latency) | `ai-service/tests/test_ai_service.py` |
| **Frontend Production Verification** | Vite Build Compiler (`vite build`) | Full ES module resolution, JSX bundling, CSS parsing, Tree-shaking | `frontend/package.json` |

---

## 2. Executing the Test Suites

### 2.1 Backend Integration Tests

Ensure the backend server (`npm run dev`) and MongoDB are running. Then open a terminal in the `backend/` directory:

```powershell
cd "virtual-classroom-ai\backend"
npm test
```

#### Expected Test Results (10/10 Passing):
```text
▶ AI-Based Virtual Classroom System Integration Tests
  ✔ 01. Health & readiness endpoints return operational status (9.47ms)
  ✔ 02. Authenticated user profile (/auth/me) returns correct role and email (7.24ms)
  ✔ 03. Role-Based Access Control: Student is forbidden from creating classes (403) (9.77ms)
  ✔ 04. Instructor retrieves classes and active session IDs (30.95ms)
  ✔ 05. Privacy & Consent: Engagement observation rejected when consent revoked (18.75ms)
  ✔ 06. Privacy & Consent: Engagement observation persisted when consent is granted (19.59ms)
  ✔ 07. Chat & NLP Moderation: Inappropriate message flagged and creates review event (29.43ms)
  ✔ 08. Moderation Review: Instructor updates flagged event status (11.14ms)
  ✔ 09. Reports: Academic session summary and CSV export generated from actual data (31.92ms)
  ✔ 10. Admin Console: Administrator accesses overview stats and security logs (28.53ms)
✔ AI-Based Virtual Classroom System Integration Tests (1142.10ms)
ℹ tests 10
ℹ suites 1
ℹ pass 10
ℹ fail 0
```

---

### 2.2 Python AI Microservice Tests

Open a terminal in the `ai-service/` directory:

```powershell
cd "virtual-classroom-ai\ai-service"
python -m unittest tests/test_ai_service.py
```

#### Expected Test Results (8/8 Passing):
```text
........
----------------------------------------------------------------------
Ran 8 tests in 1.065s

OK
```

#### Test Scenarios Covered in AI Service:
1. `test_01_root_health`: Verifies `/health` returns status `healthy` and version string.
2. `test_02_v1_health`: Verifies `/api/v1/health` reports `nlp_moderator: ready` and `cv_landmarks: ready`.
3. `test_03_moderation_clean_text`: Confirms standard academic messages are classified as clean with `flagged: false`.
4. `test_04_moderation_insult_toxic`: Confirms abusive messages (e.g. insults) are flagged with category `insult` and high confidence.
5. `test_05_moderation_threat`: Confirms violent speech triggers category `threat` with `flagged: true`.
6. `test_06_engagement_landmarks`: Validates Euler angle yaw/pitch derivation and normalized 0–100 score computation from facial coordinates.
7. `test_07_engagement_no_face_detected`: Validates graceful fallback when face coordinates are missing (`face_detected: false`).
8. `test_08_batch_latency`: Confirms batch telemetry processing completes well within real-time latency thresholds (<250ms).

---

### 2.3 Frontend Compilation & Build Verification

Open a terminal in the `frontend/` directory:

```powershell
cd "virtual-classroom-ai\frontend"
npm run build
```

#### Expected Output:
```text
vite v8.3.4 building client environment for production...
transforming...
✓ 2594 modules transformed.
rendering chunks...
dist/index.html                     1.01 kB │ gzip:   0.53 kB
dist/assets/index-C8nQ8HNC.css     47.26 kB │ gzip:   8.32 kB
dist/assets/index-BKq9EDDC.js   1,124.33 kB │ gzip: 321.79 kB
✓ built in 1.38s
```

---

## 3. Manual Workflow Validation Checklist

In addition to automated tests, validate the 4 core major project workflows:

- [x] **Workflow A (Student Participation):** Student logs in -> joins CS301 -> grants webcam consent -> `faceTracker.js` extracts yaw & pitch -> sends derived JSON -> Instructor sees engagement trend in real-time.
- [x] **Workflow B (Classroom Moderation):** Student sends inappropriate message -> Scikit-learn model flags text -> message marked with severity -> Moderation event appears on Instructor's `/moderation` dashboard -> Instructor reviews and dismisses or confirms violation.
- [x] **Workflow C (Access Control & Security):** Student attempts to `POST /api/v1/classes` -> API responds with HTTP 403 Forbidden -> Audit log writes `forbidden_access` `SecurityEvent` -> Admin reviews event in `/admin` console.
- [x] **Workflow D (Privacy & Consent Revocation):** Student revokes webcam analysis in UI -> Backend rejects subsequent telemetry (`CONSENT_NOT_GRANTED`) -> Browser stops video processing canvas loop -> Zero frames retained.
