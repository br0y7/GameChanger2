from collections.abc import Set
from features.ai_chatbot import IntentContextProvider
from ..models import ShootingStatistics


class ShootingStatsProvider(IntentContextProvider):
    def __init__(self, shooting_stats: ShootingStatistics):
        self._shooting_stats = shooting_stats

    @property
    def name(self):
        return "player_profile_shooting_stats"

    @property
    def intent_signals(self) -> Set[str]:
        return {
            # shooting terms
            "shoot",
            "shooting",
            "percentage",
            "percentages",
            "percent",
            "%",
            "efficiency",
            # field goal metrics
            "fg",
            "fg%",
            "field goal",
            "field goals",
            # three-point metrics
            "3pt",
            "3pm",
            "3pa",
            "3p%",
            "three",
            "threes",
            "pointer",
            "pointers",
            "deep",
            # free throw metrics
            "ft",
            "ft%",
            "free throw",
            "free throws",
            "stripe",
            "foul shot",
            "foul shots",
        }

    def get_context(self) -> str:
        return f"""
            SHOOTING PERCENTAGES:
            - Field Goal %: {(self._shooting_stats.fg_pct or 0):.1%}
            - Three-Point %: {(self._shooting_stats.three_pct or 0):.1%}
            - Free Throw %: {(self._shooting_stats.ft_pct or 0):.1%}
        """
