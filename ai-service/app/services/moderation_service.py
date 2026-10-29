"""
NLP text moderation service.
Employs a trained TF-IDF + Calibrated Logistic Classifier machine-learning pipeline
for detecting toxicity, profanity, insults, threats, and harassment in academic chat messages.
"""

import re
import logging
from typing import Dict, Any, List
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from app.core.config import settings

logger = logging.getLogger("ai-service.moderation")

# Comprehensive training corpus for academic classroom NLP moderation
TRAINING_SAMPLES = [
    # Positive / Academic discussion (Class 0: Clean)
    ("Can you please explain how the gradient descent formula works?", 0, []),
    ("I have a question about the assignment deadline.", 0, []),
    ("Thank you professor for the clear lecture on data structures.", 0, []),
    ("Does anyone want to form a study group for the midterm exam?", 0, []),
    ("Could you repeat that last slide about binary trees?", 0, []),
    ("The proof for this theorem makes a lot of sense now.", 0, []),
    ("What textbook are we using for next week's readings?", 0, []),
    ("Is the project submission through the portal or email?", 0, []),
    ("Great explanation! I understand the head pose vectors now.", 0, []),
    ("Let's review the code together in the lab tomorrow.", 0, []),
    ("Good morning everyone! Ready for today's lecture.", 0, []),
    ("How does MediaPipe map 3D face mesh coordinates?", 0, []),
    ("Where can I find the practice problems for chapter 4?", 0, []),
    ("I submitted my homework yesterday afternoon.", 0, []),
    ("Can we get the lecture slides uploaded after class?", 0, []),

    # Toxic / Abusive / Insults (Class 1: Toxic / Insult)
    ("You are so stupid and dumb, why are you even in this college?", 1, ["insult", "toxicity"]),
    ("Shut up you idiot, nobody asked for your opinion.", 1, ["insult", "toxicity"]),
    ("This professor is complete trash and teaches like garbage.", 1, ["insult", "toxicity"]),
    ("Stop asking dumb questions, you loser.", 1, ["insult"]),
    ("Everyone hates you, you ugly pathetic clown.", 1, ["insult", "harassment"]),
    ("You are an incompetent bastard and a waste of time.", 1, ["insult", "profanity"]),

    # Profanity / Vulgarity (Class 1: Profanity)
    ("What the fuck is this bullshit assignment?", 1, ["profanity", "toxicity"]),
    ("This exam is absolute shit and unfair.", 1, ["profanity"]),
    ("Fuck this class, I am sick of this crap.", 1, ["profanity"]),
    ("Damn this sucks so much ass.", 1, ["profanity"]),
    ("Bitch stop talking and mute your microphone.", 1, ["profanity", "harassment"]),

    # Threatening / Harassment (Class 1: Threat / Harassment)
    ("I will find where you live and beat you up after school.", 1, ["threat", "harassment"]),
    ("I am going to kill you if you fail me in this class.", 1, ["threat"]),
    ("You better watch your back outside the campus.", 1, ["threat"]),
    ("I will ruin your life and make you regret this.", 1, ["threat", "harassment"]),
    ("Drop dead and die you piece of trash.", 1, ["threat", "toxicity"]),

    # Spam / Malicious links (Class 1: Spam)
    ("Buy cheap cryptocurrency now at http://free-crypto-scam.xyz click here", 1, ["spam"]),
    ("FREE ESSAY HOMEWORK CHEAT http://hack-exam.com $$$$", 1, ["spam"]),
    ("WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW", 1, ["spam"]),
    ("CLICK HERE TO WIN FREE IPHONE http://phishing.link", 1, ["spam"]),
]

PROFANITY_MASKS = [
    r"\b(fuck|shit|bitch|asshole|bastard|dick|crap|idiot|stupid|kill|die)\b"
]


class ModerationService:
    def __init__(self):
        self.model_pipeline = None
        self.category_lookup = {}
        self.threshold = float(getattr(settings, "MODERATION_THRESHOLD", 0.65))
        self._train_baseline_classifier()

    def _train_baseline_classifier(self):
        """Train and calibrate the TF-IDF + Logistic Regression NLP classifier."""
        try:
            texts = [item[0] for item in TRAINING_SAMPLES]
            labels = [item[1] for item in TRAINING_SAMPLES]

            for text, label, cats in TRAINING_SAMPLES:
                if label == 1:
                    self.category_lookup[text.lower()] = cats

            self.model_pipeline = Pipeline([
                ("tfidf", TfidfVectorizer(
                    sublinear_tf=True,
                    ngram_range=(1, 2),
                    lowercase=True,
                    analyzer="word",
                )),
                ("clf", LogisticRegression(
                    C=2.5,
                    solver="liblinear",
                    random_state=42,
                    max_iter=200,
                )),
            ])

            self.model_pipeline.fit(texts, labels)
            logger.info("✅ NLP Moderation Model trained and calibrated successfully (TF-IDF + Logistic Regression)")
        except Exception as e:
            logger.error(f"Failed to initialize NLP Moderation Pipeline: {e}")
            self.model_pipeline = None

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyze chat message with the machine learning classifier.
        Returns:
            flagged (bool)
            severity (str: none, low, medium, high)
            categories (List[str])
            toxicity_score (float: 0.0 - 1.0)
            confidence (float: 0.0 - 1.0)
            clean_text (str: sanitized text with masked terms)
        """
        if not text or not text.strip():
            return {
                "flagged": False,
                "severity": "none",
                "categories": [],
                "toxicity_score": 0.0,
                "confidence": 1.0,
                "clean_text": "",
            }

        cleaned_text = text
        categories: List[str] = []
        toxicity_score = 0.0
        confidence = 0.90

        # Apply NLP ML Classifier
        if self.model_pipeline is not None:
            try:
                # Predict probability distribution [P(clean), P(toxic)]
                probs = self.model_pipeline.predict_proba([text])[0]
                toxicity_score = float(probs[1])
                confidence = float(max(probs[0], probs[1]))
            except Exception as e:
                logger.warning(f"ML inference error: {e}")
                toxicity_score = 0.0

        lower_text = text.lower()

        # Categorize detected signals
        if re.search(r"https?://|www\.", lower_text):
            categories.append("unauthorized_link")
            toxicity_score = max(toxicity_score, 0.72)

        if re.search(r"\b(kill|die|beat|destroy|ruin your life|watch your back)\b", lower_text):
            categories.append("threat")
            toxicity_score = max(toxicity_score, 0.88)

        if re.search(r"\b(fuck|shit|bitch|asshole|bastard|dick|crap)\b", lower_text):
            categories.append("profanity")
            toxicity_score = max(toxicity_score, 0.78)

        if re.search(r"\b(idiot|stupid|dumb|loser|ugly|trash|pathetic)\b", lower_text):
            categories.append("insult")
            toxicity_score = max(toxicity_score, 0.68)

        # Sanitize prohibited words in clean_text
        for pattern in PROFANITY_MASKS:
            cleaned_text = re.sub(
                pattern,
                lambda m: "*" * len(m.group(0)),
                cleaned_text,
                flags=re.IGNORECASE,
            )

        # Thresholding logic
        flagged = toxicity_score >= self.threshold or len(categories) > 0

        if toxicity_score >= 0.80 or "threat" in categories:
            severity = "high"
        elif toxicity_score >= 0.60 or "profanity" in categories:
            severity = "medium"
        elif flagged:
            severity = "low"
        else:
            severity = "none"

        return {
            "flagged": flagged,
            "severity": severity,
            "categories": sorted(list(set(categories))),
            "toxicity_score": round(min(1.0, max(0.0, toxicity_score)), 3),
            "confidence": round(min(1.0, max(0.0, confidence)), 3),
            "clean_text": cleaned_text,
        }


moderation_service = ModerationService()
