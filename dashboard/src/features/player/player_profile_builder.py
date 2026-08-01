from features.team.models import Team

from .models import (
    PlayerProfile,
    PlayerStatistics,
    AdvancedStatistics,
    PlayerStrength,
    PlayerWeakness,
    Statistic,
    ShootingStatistics,
)

import pandas as pd
from typing import Self


class PlayerProfileBuilder:
    """Provides a fluent builder interface to map from a DataFrame to a PlayerProfile"""

    def __init__(self, player_data: pd.DataFrame):
        if player_data.empty:
            raise ValueError("player_data is empty, cannot build profile")

        self._player_data = player_data
        self._advanced_stats: AdvancedStatistics | None = None

    def _create_stats(self) -> PlayerStatistics:
        """Private, always called in build, a player always have stats"""
        return PlayerStatistics(
            points=Statistic(
                total=int(self._player_data["PTS"].sum()),
                average=float(self._player_data["PTS"].mean()),
                max=int(self._player_data["PTS"].max()),
                min=int(self._player_data["PTS"].min()),
            ),
            rebounds=Statistic(
                total=int(self._player_data["REB"].sum()),
                average=float(self._player_data["REB"].mean()),
                max=int(self._player_data["REB"].max()),
            ),
            assists=Statistic(
                total=int(self._player_data["AST"].sum()),
                average=float(self._player_data["AST"].mean()),
                max=int(self._player_data["AST"].max()),
            ),
            turnovers=Statistic(
                total=int(self._player_data["TOV"].sum()),
                average=float(self._player_data["TOV"].mean()),
            ),
            steals=Statistic(
                total=int(self._player_data["STL"].sum()),
                average=float(self._player_data["STL"].mean()),
            ),
            blocks=Statistic(
                total=int(self._player_data["BLK"].sum()),
                average=float(self._player_data["BLK"].mean()),
            ),
            efficiency=Statistic(
                average=float(self._player_data["Efficiency"].mean()),
                max=int(self._player_data["Efficiency"].max()),
            ),
            shooting=ShootingStatistics(
                fg_pct=float(self._player_data["FG_PCT"].mean()),
                three_pct=float(self._player_data["3P%"].mean()),
                ft_pct=float(self._player_data["FT%"].mean()),
            ),
        )

    def _create_strengths(self, stats: PlayerStatistics) -> list[PlayerStrength]:
        strengths: list[PlayerStrength] = []

        # Points strength
        if stats.points.average:
            if stats.points.average >= 15:
                strengths.append(PlayerStrength("Scoring ability"))
            elif stats.points.average >= 10:
                strengths.append(PlayerStrength("Solid scoring"))

        # Rebounding strength
        if stats.rebounds.average:
            if stats.rebounds.average >= 8:
                strengths.append(PlayerStrength("Strong rebounding"))
            elif stats.rebounds.average >= 5:
                strengths.append(PlayerStrength("Good rebounding"))

        # Assists strength
        if stats.assists.average:
            if stats.assists.average >= 5:
                strengths.append(PlayerStrength("Playmaking and ball distribution"))
            elif stats.assists.average >= 3:
                strengths.append(PlayerStrength("Good passing"))

        # Shooting strength
        if stats.shooting.fg_pct >= 0.45:
            strengths.append(PlayerStrength("Efficient field goal shooting"))
        if stats.shooting.three_pct >= 0.35:
            strengths.append(PlayerStrength("Three-point shooting"))
        if stats.shooting.ft_pct >= 0.75:
            strengths.append(PlayerStrength("Free throw shooting"))

        # Defense
        if (stats.steals.average or 0) >= 2:
            strengths.append(PlayerStrength("Defensive playmaking (steals)"))
        if (stats.blocks.average or 0) >= 1:
            strengths.append(PlayerStrength("Shot blocking"))

        return strengths or [PlayerStrength("Versatile Player")]

    def _create_weaknesses(self, stats: PlayerStatistics) -> list[PlayerWeakness]:
        weaknesses = []

        # Turnover issues
        if stats.turnovers.average:
            if stats.turnovers.average >= 4:
                weaknesses.append(PlayerWeakness(description="High turnover rate"))
            elif stats.turnovers.average >= 2.5:
                weaknesses.append(
                    PlayerWeakness(description="Ball control needs improvement")
                )

        # Shooting weaknesses
        if stats.shooting.fg_pct < 0.35:
            weaknesses.append(
                PlayerWeakness(description="Field goal percentage needs improvement")
            )
        if stats.shooting.three_pct < 0.25 and stats.shooting.three_pct > 0:
            weaknesses.append(
                PlayerWeakness(description="Three-point shooting accuracy")
            )
        if stats.shooting.ft_pct < 0.60 and stats.shooting.ft_pct > 0:
            weaknesses.append(PlayerWeakness(description="Free throw shooting"))

        # Low production areas
        if (stats.rebounds.average or 0) < 3:
            weaknesses.append(PlayerWeakness(description="Rebounding"))
        if (stats.assists.average or 0) < 2:
            weaknesses.append(PlayerWeakness(description="Playmaking and assists"))

        return weaknesses

    def add_advanced_statistics(self, advanced_stats: pd.DataFrame | None) -> Self:
        if advanced_stats is None or advanced_stats.empty:
            # maybe add 'warning' level logging
            return self

        self._advanced_stats = AdvancedStatistics(
            ast_tov_ratio=float(advanced_stats["Avg_AST_TOV_Ratio"].iloc[0]),
            ts_percentage=float(advanced_stats["Avg_TS_Percentage"].iloc[0]),
            reb_percentage=float(advanced_stats["Avg_REB_Percentage"].iloc[0]),
            ws=float(advanced_stats["Avg_WS_Simplified"].iloc[0]),
            vorp=float(advanced_stats["Avg_VORP_Simplified"].iloc[0]),
        )

        return self

    def build(self) -> PlayerProfile:
        """Returns a player profile"""
        # TODO: Reconsider this if you use ID
        player_no = int(self._player_data.values[0, 0])
        team_name = str(self._player_data.values[0, 1])

        stats = self._create_stats()

        strengths = self._create_strengths(stats)
        weaknesses = self._create_weaknesses(stats)

        return PlayerProfile(
            player_no=player_no,
            team=Team(name=team_name),
            total_games=len(self._player_data),
            stats=stats,
            strengths=strengths,
            weaknesses=weaknesses,
            advanced_stats=self._advanced_stats,
        )
