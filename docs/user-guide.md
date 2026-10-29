# Comprehensive User Guide

This user guide provides operational instructions for all three primary user roles: **Student**, **Instructor**, and **System Administrator**.

---

## 1. Initial Authentication

1. Open your browser and navigate to `http://localhost:5173`.
2. Enter your credentials on the login screen.
3. Upon successful authentication, the system automatically redirects you to your role-specific dashboard.

---

## 2. Student Workflow Guide

### 2.1 Viewing Enrolled Courses
- Click **"My Classes"** in the sidebar navigation.
- The interface displays all courses in which you are actively enrolled, including the instructor's name, course code, and scheduled meeting times.

### 2.2 Joining a Live Interactive Lecture
- On your dashboard or class view, look for sessions marked with a green **"Live"** badge.
- Click **"Join Classroom"** to enter the live room (`/classroom/:sessionId`).

### 2.3 Managing Video & Engagement Telemetry Consent
- Upon entering the live classroom, your camera is disabled by default.
- Click **"Enable Camera"** to preview your video locally.
- To participate in visual engagement telemetry, review the consent prompt and click **"Grant Consent"**.
- The interface indicates active local telemetry with indicators showing:
  - Overall Engagement Estimate (0–100)
  - Head Pose Orientation (e.g. `facing_camera`)
  - Attention State (e.g. `attentive`)
- **Withdrawing Consent:** You may click **"Revoke Consent"** at any moment. Telemetry generation and transmission cease immediately.

### 2.4 Classroom Chat
- Open the **Chat** panel on the right side of the classroom interface.
- Compose and submit messages to communicate with your instructor and peers.
- All messages are processed by automated moderation. Inappropriate language or insults are flagged for instructor review.

### 2.5 Inspecting Personal Analytics
- Click **"Attendance"** or **"My Analytics"** in the sidebar.
- Review your accumulated attendance hours, session participation consistency, and personal historical engagement trends.

---

## 3. Instructor Workflow Guide

### 3.1 Creating and Managing Courses
1. Navigate to **"My Classes"** -> Click **"Create Class"**.
2. Enter the Course Title (e.g. *"CS301: Data Structures & Algorithms"*), Course Code, Semester, and Meeting Schedule.
3. Click **"Save Class"**. The course is now available in your instructor portal.

### 3.2 Scheduling and Commencing Lectures
1. Open your course view and click **"Schedule Session"**.
2. Set the lecture title, scheduled date, and start time.
3. When ready to teach, click **"Start Session"**. This transitions the session state to `active` and allows students to join.
4. Click **"Launch Monitor"** to open the live instructor command center.

### 3.3 Live Session Monitoring
The instructor monitor provides a unified, real-time command dashboard:
- **Active Participants:** Live count of enrolled students currently in the room.
- **Attendance Tracker:** Join timestamps and active duration in minutes.
- **Engagement Telemetry:** Aggregated classroom engagement index and distribution chart powered by Recharts.
- **Moderation Notifications:** Real-time badge alerting you to flagged chat messages.

### 3.4 Chat Moderation Hub (`/moderation`)
1. Click **"Moderation"** in the sidebar.
2. Review all messages flagged by the Python NLP classification service.
3. Each event card displays:
   - Flagged message text
   - Model classification category (`insult`, `profanity`, `toxic`, `threat`)
   - Model confidence percentage (e.g. `75.7%`)
   - Sender name and timestamp
4. **Resolution Actions:**
   - Click **"Confirm Violation"** to record an academic infraction.
   - Click **"Dismiss (False Positive)"** to clear benign or misclassified text.
   - Click **"Mark Resolved"** after addressing the incident.

### 3.5 Academic Reports & CSV Export (`/reports`)
1. Navigate to **"Reports"** in the navigation bar.
2. Select any completed or active lecture session.
3. Inspect summary metrics: total attendance, average engagement score, and moderation events.
4. Click **"Export CSV"** to download the official attendance and telemetry spreadsheet for grading and institutional records.

---

## 4. System Administrator Workflow Guide

### 4.1 System Overview (`/admin`)
Log in as `admin@classroom.ai`. The administrative command center provides:
- Total Registered Users (broken down by Student, Instructor, Admin)
- Total Academic Courses and Sessions conducted
- System-wide Flagged Moderation Incidents
- Real-time Health Diagnostics for MongoDB, Node.js Backend, and FastAPI AI Service.

### 4.2 User Account Management
1. Click the **"User Accounts"** tab within the Admin console.
2. Filter accounts by role or search by name/email.
3. Click **"Suspend Account"** to temporarily restrict access for any user under investigation, or **"Reactivate"** to restore standard permissions.

### 4.3 Investigating Security Audit Logs
1. Click the **"Security Audit"** tab.
2. Review immutable system security events:
   - Failed authentication attempts (`login_failure`)
   - Role-Based Access Control violations (`forbidden_access`)
   - Unauthorized room subscription attempts (`unauthorized_join`)
3. Inspect network metadata: client IP address, user-agent string, and timestamp.
