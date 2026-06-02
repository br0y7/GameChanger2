from collections.abc import Set
from features.ai_chatbot import IntentContextProvider
from ..models import PlayerStatistics


class PlayerStatsProvider(IntentContextProvider):
    def __init__(self, player_stats: PlayerStatistics):
        self._stats = player_stats

    @property
    def name(self):
        return "player_profile_stats"

    @property
    def intent_signals(self) -> Set[str]:
        return {
            # stat terms
            "stat",
            "stats",
            "statistics",
            "average",
            "averages",
            "performance",
            "record",
            # box score metrics
            "point",
            "points",
            "ppg",
            "rebound",
            "rebounds",
            "rpg",
            "assist",
            "assists",
            "apg",
            "turnover",
            "turnovers",
            "tpg",
            "steal",
            "steals",
            "spg",
            "block",
            "blocks",
            "bpg",
            # common phrases
            "scoring",
            "how many",
            "numbers",
        }

    def get_context(self) -> str:
        return f"""
            PERFORMANCE STATISTICS:
            - Points: {(self._stats.points.average or 0):.1f} PPG (Max: {(self._stats.points.max or 0)})
            - Rebounds: {(self._stats.rebounds.average or 0):.1f} RPG (Max: {(self._stats.rebounds.max or 0)})
            - Assists: {(self._stats.assists.average or 0):.1f} APG (Max: {(self._stats.assists.max or 0)})
            - Turnovers: {(self._stats.turnovers.average or 0):.1f} TPG
            - Steals: {(self._stats.steals.average or 0):.1f} SPG
            - Blocks: {(self._stats.blocks.average or 0):.1f} BPG   
        """
