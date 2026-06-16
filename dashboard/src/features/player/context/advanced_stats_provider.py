from collections.abc import Set
from features.ai_chatbot import IntentContextProvider
from ..models import AdvancedStatistics


class AdvancedStatsProvider(IntentContextProvider):
    def __init__(self, advanced_stats: AdvancedStatistics):
        self._advanced_stats = advanced_stats

    @property
    def name(self):
        return "player_profile_advanced_stats"

    @property
    def intent_signals(self) -> Set[str]:
        return {
            # common terms
            "advanced",
            "metric",
            "metrics",
            "analytics",
            "efficiency",
            "ratio",
            "value",
            # specific terms
            "vorp",
            "win share",
            "win shares",
            "ws",
            "ts%",
            "true shooting",
            "ast/tov",
            "assist turnover",
            "rebound percentage",
            "reb%",
        }

    def get_context(self) -> str:
        return f"""
            ADVANCED METRICS:
            - Assist/Turnover Ratio: {self._advanced_stats.ast_tov_ratio:.2f}
            - True Shooting %: {self._advanced_stats.ts_percentage:.1f}%
            - Rebound %: {self._advanced_stats.reb_percentage:.1f}%
            - Win Shares: {self._advanced_stats.ws:.2f}
            - VORP: {self._advanced_stats.vorp:.3f}
        """
