from collections.abc import Set
from . import IntentContextProvider
from .drill_information import DRILL_OVERVIEW


class DrillOverviewProvider(IntentContextProvider):
    @property
    def name(self):
        return "drill_overview"

    @property
    def intent_signals(self) -> Set[str]:
        return {
            # common terms
            "drill",
            "drills",
            "workout",
            "workouts",
            "practice",
            "routine",
            "routines",
            # improvement terms
            "improve",
            "improvement",
            "fix",
            "solutions",
            "solution",
            "solve",
            "how to",
            "train",
            "training",
            "work on",
            "better",
            "get better",
            "develop",
            "master",
            "practice",
            # action terms
            "dribble",
            "dribbling",
            "shoot",
            "shooting",
            "pass",
            "passing",
            "rebound",
            "rebounding",
            "defend",
            "defense",
            "defensive",
            "footwork",
            "pivot",
            "conditioning",
            "stamina",
            "cardio",
            "suicide",
            "suicides",
        }

    def get_context(self) -> str:
        return DRILL_OVERVIEW
