import inspect
from typing import Self
from features.player.models import PlayerProfile, AdvancedStatistics
from features.ai_chatbot.knowledge_base import get_full_knowledge_base


class PlayerProfilePromptBuilder:
    """Provides a fluent builder for making a system prompt
    with the context of a player profile"""

    def __init__(self):
        persona = "You are a professional NBA shooting coach and basketball development specialist with access to comprehensive basketball knowledge."
        self._blocks: list[str] = [persona, inspect.cleandoc(get_full_knowledge_base())]
        self._has_player_profile = False
        self._has_instructions = False

    def with_player_profile(self, player_profile: PlayerProfile) -> Self:
        # cleandoc removes excess whitespace like newlines
        self._blocks.append(
            inspect.cleandoc(f"""
            PLAYER PROFILE:
            - Player Number: {player_profile.player_no}
            - Team: {player_profile.team}
            - Total Games Played: {player_profile.total_games}
            """)
        )

        stats = player_profile.stats

        self._blocks.append(
            inspect.cleandoc(f"""
            PERFORMANCE STATISTICS:
            - Points: {(stats.points.average or 0):.1f} PPG (Max: {(stats.points.max or 0)})
            - Rebounds: {(stats.rebounds.average or 0):.1f} RPG (Max: {(stats.rebounds.max or 0)})
            - Assists: {(stats.assists.average or 0):.1f} APG (Max: {(stats.assists.max or 0)})
            - Turnovers: {(stats.turnovers.average or 0):.1f} TPG
            - Steals: {(stats.steals.average or 0):.1f} SPG
            - Blocks: {(stats.blocks.average or 0):.1f} BPG   
            """)
        )

        self._blocks.append(
            inspect.cleandoc(f"""
            SHOOTING PERCENTAGES:
            - Field Goal %: {(stats.shooting.fg_pct or 0):.1%}
            - Three-Point %: {(stats.shooting.three_pct or 0):.1%}
            - Free Throw %: {(stats.shooting.ft_pct or 0):.1%}
            """)
        )

        strengths_as_str = ", ".join([s.description for s in player_profile.strengths])
        weaknesses_as_str = ", ".join(
            [w.description for w in player_profile.weaknesses]
        )

        self._blocks.append(
            inspect.cleandoc(f"""
            IDENTIFIED STRENGTHS: {strengths_as_str or "None specifically identified"}
            IDENTIFIED WEAKNESSES: {weaknesses_as_str or "None specifically identified"}
            """)
        )

        self._has_player_profile = True

        return self

    def with_advanced_stats(
        self, advanced_stats: AdvancedStatistics | None = None
    ) -> Self:
        if advanced_stats is None:
            return self

        self._blocks.append(
            inspect.cleandoc(f"""
            ADVANCED METRICS:
            - Assist/Turnover Ratio: {advanced_stats.ast_tov_ratio:.2f}
            - True Shooting %: {advanced_stats.ts_percentage:.1f}%
            - Rebound %: {advanced_stats.reb_percentage:.1f}%
            - Win Shares: {advanced_stats.ws:.2f}
            - VORP: {advanced_stats.vorp:.3f}
            """)
        )

        return self

    def with_instructions(self, custom_instructions: str | None = None) -> Self:
        """Adds instructions, if custom instructions are not provided default
        instructions are added instead."""

        instructions = (
            custom_instructions
            or """
        You can help with:
        - Player-specific coaching advice (when player profile is provided)
        - League-wide statistics and leaderboards
        - Team scouting reports (strengths/weaknesses)
        - Specific drill recommendations from the drill library
        - Basketball training and skill development

        Provide helpful, actionable advice using the knowledge above. Always include stat definitions when showing leaderboards. Use specific drills from the drill library when recommending training.
        """
        )

        if not custom_instructions and self._has_player_profile:
            instructions = """
            YOUR TASK: Provide personalized, actionable coaching advice using the drill library and knowledge base above. Focus on:
            1. How to leverage strengths to create advantages
            2. Specific drills from the drill library to address weaknesses (mention drill names and durations)
            3. Game strategy recommendations based on their playing style
            4. 2-3 concrete, measurable improvement goals

            Keep responses concise, practical, and encouraging. Use basketball terminology appropriately. Reference specific drills from the library when recommending training.
            """

        self._blocks.append(inspect.cleandoc(instructions))
        self._has_instructions = True

        return self

    def build_prompt(self) -> str:
        """Returns a system prompt"""
        if not self._has_instructions:
            self.with_instructions()

        return "\n\n".join(self._blocks)
