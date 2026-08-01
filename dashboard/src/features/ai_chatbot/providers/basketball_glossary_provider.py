from collections.abc import Set
from . import IntentContextProvider

PLAYER_STATS_GLOSSARY = """
STATISTICAL DEFINITIONS:

- Points Per Game (PPG) = total points ÷ games played
- Rebounds Per Game (RPG) = total rebounds ÷ games played
- Assists Per Game (APG) = total assists ÷ games played
- Field Goal % (FG%) = field goals made ÷ field goals attempted
- Three-Point % (3P%) = three-pointers made ÷ three-pointers attempted
- Free Throw % (FT%) = free throws made ÷ free throws attempted
- 3PT Made (3PTM) = total three-pointers made
- Efficiency (EFF) = a summary stat that rewards points/rebounds/assists/steals/blocks and penalizes missed shots and turnovers (per game)
- Assist/Turnover Ratio = assists ÷ turnovers (higher is better)
- True Shooting % = accounts for 2PT, 3PT, and FT shooting efficiency
- Rebound % = percentage of available rebounds a player secured
- Win Shares = estimate of wins contributed by player
- VORP = Value Over Replacement Player

STRENGTHS IDENTIFICATION:
- Scoring ability: 15+ PPG = strong, 10+ PPG = solid
- Rebounding: 8+ RPG = strong, 5+ RPG = good
- Playmaking: 5+ APG = strong, 3+ APG = good
- Shooting: 45%+ FG% = efficient, 35%+ 3P% = good three-point shooter
- Defense: 2+ SPG = strong steals, 1+ BPG = shot blocking

WEAKNESSES IDENTIFICATION:
- Turnovers: 4+ TPG = high turnover rate, 2.5+ TPG = needs improvement
- Shooting: <35% FG% = needs improvement, <25% 3P% = three-point accuracy needs work
- Rebounding: <3 RPG = needs improvement
- Playmaking: <2 APG = needs improvement
"""


class PlayerStatsGlossaryProvider(IntentContextProvider):
    @property
    def name(self):
        return "player_stats_glossary"

    @property
    def intent_signals(self) -> Set[str]:
        return {
            # common terms
            "mean",
            "means",
            "meaning",
            "definition",
            "definitions",
            "glossary",
            "define",
            "formula",
            "calculation",
            "calculate",
            "calculated",
            "math",
            "equation",
            "stat",
            "stats",
            "statistic",
            "statistics",
            # threshold/scale terms
            "threshold",
            "thresholds",
            "scale",
            "benchmark",
            "benchmarks",
            "metric",
            "metrics",
            "considered",
            "good",
            "best",
            "bad",
            "average",
            "high",
            "low",
            "strong",
            "weak",
            "weakest",
            # metrics terms
            "ppg",
            "rpg",
            "apg",
            "fg%",
            "3p%",
            "ft%",
            "eff",
            "vorp",
            "win share",
            "win shares",
        }

    def get_context(self) -> str:
        return PLAYER_STATS_GLOSSARY
