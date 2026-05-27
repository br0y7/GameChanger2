from dataclasses import dataclass
from team.models import Team


@dataclass(frozen=True)
class Statistic:
    total: int | None = None
    average: float | None = None
    min: int | None = None
    max: int | None = None


@dataclass(frozen=True)
class ShootingStatistic:
    fg_pct: float
    three_pct: float
    ft_pct: float


@dataclass(frozen=True)
class PlayerStatistics:
    points: Statistic
    rebounds: Statistic
    assists: Statistic
    turnovers: Statistic
    steals: Statistic
    blocks: Statistic
    efficiency: Statistic
    shooting: ShootingStatistic


@dataclass(frozen=True)
class PlayerStrength:
    description: str


@dataclass(frozen=True)
class PlayerWeakness:
    description: str


@dataclass(frozen=True)
class AdvancedStatistics:
    ast_tov_ratio: float
    ts_percentage: float
    reb_percentage: float
    ws: float
    vorp: float


@dataclass(frozen=True)
class PlayerProfile:
    # id: str # TODO: Maybe add this when loading data
    player_no: int
    team: Team
    total_games: int
    stats: PlayerStatistics
    strengths: list[PlayerStrength]
    weaknesses: list[PlayerWeakness]
    advanced_stats: AdvancedStatistics | None = None


@dataclass(frozen=True)
class PlayerIdentity:
    player_no: int
    team: Team
    label: str
