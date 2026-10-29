"""
NLP text moderation service.
Detects toxicity, profanity, harassment, and inappropriate content in chat messages.
"""

import re
import logging
from typing import Dict, Any, List

logger = logging.getLogger("ai-service.moderation")

PROFANITY_LIST = [
    "abuse", "stupid", "idiot", "hate", "kill", "die", "shut up",
    "scam", "trash", "cheat", "dumb", "loser", "ugly", "curse", "fuck",
    "shit", "bitch", "asshole", "bastard", "dick", "crap",
]

SPAM_PATTERNS = [
    r"https?://\S+",  # unsolicited links
    r"(.)\1{5,}",     # character spam like aaaaaaa
    r"\b[A-Z\s]{15,}\b", # ALL CAPS SHOUTING
]


class ModerationService:
    def __init__(self):
        self.banned_words = PROFANITY_LIST
        self.spam_regexes = [re.compile(p, re.IGNORECASE) for p in SPAM_PATTERNS]

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyze chat message for inappropriate content.
        """
        cleaned_text = text
        categories: List[str] = []
        toxicity_score = 0.0

        lower_text = text.lower()

        # Check profanity
        profanity_matches = []
        for word in self.banned_words:
            pattern = rf"\b{re.escape(word)}\b"
            if re.search(pattern, lower_text):
                profanity_matches.append(word)
                cleaned_text = re.sub(pattern, "*" * len(word), cleaned_text, flags=re.IGNORECASE)

        if profanity_matches:
            categories.append("profanity")
            toxicity_score += min(0.8, len(profanity_matches) * 0.4)

        # Check spam
        for regex in self.spam_regexes:
            if regex.search(text):
                categories.append("spam")
                toxicity_score += 0.2
                break

        # Categorize severity
        flagged = len(categories) > 0
        if toxicity_score >= 0.7:
            severity = "high"
        elif toxicity_score >= 0.4:
            severity = "medium"
        elif flagged:
            severity = "low"
        else:
            severity = "none"

        return {
            "flagged": flagged,
            "severity": severity,
            "categories": categories,
            "toxicity_score": round(min(1.0, toxicity_score), 2),
            "clean_text": cleaned_text,
        }


moderation_service = ModerationService()
