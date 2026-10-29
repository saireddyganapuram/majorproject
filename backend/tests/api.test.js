/**
 * Comprehensive Backend API and System Integration Test Suite
 * Powered by Node.js native test runner (node:test) and strict assertions (node:assert/strict).
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5000/api/v1';

let adminToken = '';
let instructorToken = '';
let studentToken = '';
let testClassId = '';
let testSessionId = '';
let flaggedEventId = '';

describe('AI-Based Virtual Classroom System Integration Tests', () => {
  before(async () => {
    // Authenticate Admin
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@classroom.ai', password: 'Admin@1234' }),
    });
    const adminData = await adminRes.json();
    assert.equal(adminData.success, true);
    adminToken = adminData.data.token;

    // Authenticate Instructor
    const instRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'instructor@classroom.ai', password: 'Teacher@1234' }),
    });
    const instData = await instRes.json();
    assert.equal(instData.success, true);
    instructorToken = instData.data.token;

    // Authenticate Student
    const stuRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student1@classroom.ai', password: 'Student@1234' }),
    });
    const stuData = await stuRes.json();
    assert.equal(stuData.success, true);
    studentToken = stuData.data.token;
  });

  test('01. Health & readiness endpoints return operational status', async () => {
    const res = await fetch('http://localhost:5000/api/health');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'healthy');
    assert.equal(data.data.dependencies.mongodb, 'connected');
    assert.equal(data.data.dependencies.aiService, 'healthy');
  });

  test('02. Authenticated user profile (/auth/me) returns correct role and email', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.role, 'student');
    assert.equal(data.data.email, 'student1@classroom.ai');
  });

  test('03. Role-Based Access Control: Student is forbidden from creating classes (403)', async () => {
    const res = await fetch(`${BASE_URL}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Class' }),
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.code, 'FORBIDDEN');
  });

  test('04. Instructor retrieves classes and active session IDs', async () => {
    const res = await fetch(`${BASE_URL}/classes`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.data.length >= 1);
    testClassId = data.data[0]._id;

    // Fetch class details and sessions
    const detailRes = await fetch(`${BASE_URL}/classes/${testClassId}`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert.equal(detailRes.status, 200);
    const detailData = await detailRes.json();
    assert.ok(detailData.data.sessions.length >= 1);
    testSessionId = detailData.data.sessions[0]._id;
  });

  test('05. Privacy & Consent: Engagement observation rejected when consent revoked', async () => {
    // 1. Explicitly revoke consent
    await fetch(`${BASE_URL}/analytics/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ sessionId: testSessionId, granted: false }),
    });

    // 2. Submit observation
    const res = await fetch(`${BASE_URL}/analytics/engagement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        sessionId: testSessionId,
        overallScore: 88,
        facialState: 'attentive',
      }),
    });
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, 'CONSENT_NOT_GRANTED');
  });

  test('06. Privacy & Consent: Engagement observation persisted when consent is granted', async () => {
    // 1. Grant consent
    const consentRes = await fetch(`${BASE_URL}/analytics/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ sessionId: testSessionId, granted: true }),
    });
    assert.equal(consentRes.status, 200);

    // 2. Submit valid observation
    const res = await fetch(`${BASE_URL}/analytics/engagement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        sessionId: testSessionId,
        overallScore: 92,
        facialState: 'attentive',
        attentionScore: 92,
        headPoseState: 'facing_camera',
        distractionFlag: false,
        notes: 'Integration test telemetry point',
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.overallScore, 92);
  });

  test('07. Chat & NLP Moderation: Inappropriate message flagged and creates review event', async () => {
    const res = await fetch(`${BASE_URL}/chat/session/${testSessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ message: 'You are so stupid and dumb, go away' }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.data.status, 'flagged');

    // Instructor fetches moderation events
    const modRes = await fetch(`${BASE_URL}/moderation/sessions/${testSessionId}/events`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert.equal(modRes.status, 200);
    const modData = await modRes.json();
    assert.ok(modData.data.length >= 1);
    flaggedEventId = modData.data[0]._id;
    assert.equal(modData.data[0].category, 'insult');
    assert.equal(modData.data[0].reviewStatus, 'pending');
  });

  test('08. Moderation Review: Instructor updates flagged event status', async () => {
    assert.ok(flaggedEventId);
    const res = await fetch(`${BASE_URL}/moderation/events/${flaggedEventId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        reviewStatus: 'reviewed',
        reviewNotes: 'Reviewed in automated integration test',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.reviewStatus, 'reviewed');
    assert.equal(data.data.reviewNotes, 'Reviewed in automated integration test');
  });

  test('09. Reports: Academic session summary and CSV export generated from actual data', async () => {
    // Summary JSON
    const sumRes = await fetch(`${BASE_URL}/reports/session/${testSessionId}/summary`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert.equal(sumRes.status, 200);
    const sumData = await sumRes.json();
    assert.equal(sumData.success, true);
    assert.ok(sumData.data.metrics.enrolledStudents >= 1);
    assert.ok(Array.isArray(sumData.data.students));

    // CSV Download
    const csvRes = await fetch(`${BASE_URL}/reports/session/${testSessionId}/csv`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert.equal(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('Student Name,Student Email,Attendance Status'));
  });

  test('10. Admin Console: Administrator accesses overview stats and security logs', async () => {
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.ok(statsData.data.users.total >= 4);

    const secRes = await fetch(`${BASE_URL}/admin/security-events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(secRes.status, 200);
    const secData = await secRes.json();
    assert.ok(secData.data.length >= 1);
  });
});
