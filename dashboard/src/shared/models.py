from dataclasses import dataclass


@dataclass(frozen=True)
class Statistic:
    total: int | None = None
    average: float | None = None
    min: int | None = None
    max: int | None = None


@dataclass(frozen=True)
class User:
    id: str
    name: str
    email: str
