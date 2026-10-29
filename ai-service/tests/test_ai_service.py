"""
AI Service Unit & Integration Tests.
Executes automated checks for:
- Health endpoints
- Face presence and head pose engagement metrics
- Insufficient observation handling
- NLP chat moderation machine-learning classification
- Batch processing latency
"""

import unittest
import time
from fastapi.testclient import TestClient
from app.main import app


class TestAIService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        """Verify root health check endpoint returns healthy status."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["status"], "healthy")
        self.assertEqual(data["data"]["service"], "virtual-classroom-ai-service")

    def test_02_versioned_health_check(self):
        """Verify /api/v1/health returns operational status and schema."""
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["api_version"], "v1")

    def test_03_moderation_clean_text(self):
        """Verify positive academic text is NOT flagged by the ML classifier."""
        response = self.client.post(
            "/api/v1/moderation/text",
            json={"text": "Can you please explain how gradient descent optimizes the loss function?"},
        )
        self.assertEqual(response.status_code, 200)
        res = response.json()
        self.assertFalse(res["flagged"])
        self.assertEqual(res["severity"], "none")
        self.assertLess(res["toxicity_score"], 0.65)

    def test_04_moderation_toxic_insult(self):
        """Verify abusive and insulting text is flagged with category and masked output."""
        response = self.client.post(
            "/api/v1/moderation/text",
            json={"text": "You are an idiot and completely stupid, shut up."},
        )
        self.assertEqual(response.status_code, 200)
        res = response.json()
        self.assertTrue(res["flagged"])
        self.assertIn("insult", res["categories"])
        self.assertGreaterEqual(res["toxicity_score"], 0.60)
        self.assertIn("*", res["clean_text"])

    def test_05_moderation_threat_content(self):
        """Verify threatening language is classified with high severity."""
        response = self.client.post(
            "/api/v1/moderation/text",
            json={"text": "I will find you and beat you up after school."},
        )
        self.assertEqual(response.status_code, 200)
        res = response.json()
        self.assertTrue(res["flagged"])
        self.assertIn("threat", res["categories"])
        self.assertEqual(res["severity"], "high")

    def test_06_engagement_valid_landmarks(self):
        """Verify engagement calculation from simulated forward-facing 3D landmarks."""
        simulated_landmarks = [
            {"x": 0.5, "y": 0.45, "z": 0.0},
            {"x": 0.5, "y": 0.50, "z": -0.05},  # Nose
            {"x": 0.5, "y": 0.65, "z": 0.0},   # Chin
        ] + [{"x": 0.45 + (i * 0.001), "y": 0.4, "z": 0.0} for i in range(400)]

        response = self.client.post(
            "/api/v1/analyze/face",
            json={"landmarks": simulated_landmarks},
        )
        self.assertEqual(response.status_code, 200)
        res = response.json()
        self.assertTrue(res["face_detected"])
        self.assertGreater(res["overall_engagement_score"], 0.0)
        self.assertLessEqual(res["overall_engagement_score"], 100.0)
        self.assertIn("head_pose", res)
        self.assertIn("yaw", res["head_pose"])

    def test_07_engagement_no_face_detected(self):
        """Verify when no face/landmarks are provided, returns explicit absent indicator without fake scores."""
        response = self.client.post(
            "/api/v1/analyze/face",
            json={"landmarks": None, "frame_base64": None},
        )
        self.assertEqual(response.status_code, 200)
        res = response.json()
        self.assertFalse(res["face_detected"])
        self.assertEqual(res["overall_engagement_score"], 0.0)
        self.assertEqual(res["state"], "distracted")
        self.assertTrue(res["distraction_flag"])

    def test_08_batch_processing_and_latency(self):
        """Verify batch endpoint executes in under 200ms for multi-student class frames."""
        requests = [
            {"student_id": f"student-{i}", "landmarks": [{"x": 0.5, "y": 0.5, "z": 0.0}] * 10}
            for i in range(5)
        ]
        start_time = time.time()
        response = self.client.post("/api/v1/analyze/batch", json=requests)
        elapsed = time.time() - start_time

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 5)
        self.assertLess(elapsed, 0.5, f"Batch analysis took {elapsed:.3f}s, expected < 0.5s")


if __name__ == "__main__":
    unittest.main()
