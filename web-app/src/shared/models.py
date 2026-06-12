from dataclasses import dataclass


@dataclass(frozen=True)
class Statistic:
    total: int | None = None
    average: float | None = None
    min: int | None = None
    max: int | None = None
