from collections.abc import Sequence
from .context_provider import ContextProvider, IntentContextProvider
from .basketball_glossary_provider import PlayerStatsGlossaryProvider
from .drill_overview_provider import DrillOverviewProvider
from .drill_instructions_provider import DrillInstructionsProvider


def get_basketball_training_providers() -> Sequence[ContextProvider]:
    """Returns a collection of glossary, drill overview, and drill instruction providers"""
    return (
        PlayerStatsGlossaryProvider(),
        DrillOverviewProvider(),
        DrillInstructionsProvider(),
    )


__all__ = [
    "BasketballGlossaryProvider",
    "ContextProvider",
    "DrillInstructionsProvider",
    "DrillOverviewProvider",
    "IntentContextProvider",
]
