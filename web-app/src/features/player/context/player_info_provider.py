from collections.abc import Sequence
from ..models import PlayerProfile
from features.ai_chatbot import ChatMessage


class PlayerInfoProvider:
    """Provides player number, team, and number of games."""

    def __init__(self, player_profile: PlayerProfile):
        self._player_profile = player_profile

    @property
    def name(self) -> str:
        return "player_profile_info"

    def is_relevant(
        self, user_prompt: str, chat_history: Sequence[ChatMessage] | None = None
    ) -> bool:
        """Always include this."""
        return True

    def get_context(self) -> str:
        """Returns the formatted string for player number,
        team, and number of games.
        """
        return f"""
            PLAYER PROFILE:
            - Player Number: {self._player_profile.player_no}
            - Team: {self._player_profile.team.name}
            - Total Games Played: {self._player_profile.total_games}
        """
