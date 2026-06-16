from collections.abc import Set
from features.ai_chatbot import IntentContextProvider
from ..models import PlayerProfile


class PlayerScoutingReportProvider(IntentContextProvider):
    def __init__(self, player_profile: PlayerProfile):
        self._player_profile = player_profile

    @property
    def name(self):
        return "player_profile_scouting_report"

    @property
    def intent_signals(self) -> Set[str]:
        return {
            # common terms
            "strength",
            "strengths",
            "weak",
            "weakness",
            "weaknesses",
            "flaw",
            "flaws",
            # scouting jargon
            "scouting",
            "report",
            "scout",
            "evaluation",
            "analysis",
            "profile",
            "breakdown",
            # coaching terms
            "good at",
            "bad at",
            "improve",
            "improvement",
            "excel",
            "excels",
            "struggle",
            "struggles",
            "skill",
            "skills",
            "upside",
            "downside",
        }

    def get_context(self) -> str:
        strengths_as_str = ", ".join(
            [s.description for s in self._player_profile.strengths]
        )
        weaknesses_as_str = ", ".join(
            [w.description for w in self._player_profile.weaknesses]
        )

        return f"""
            IDENTIFIED STRENGTHS: {strengths_as_str or "None specifically identified"}
            IDENTIFIED WEAKNESSES: {weaknesses_as_str or "None specifically identified"}
        """
