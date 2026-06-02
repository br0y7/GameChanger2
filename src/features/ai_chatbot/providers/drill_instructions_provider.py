from collections.abc import Set, Sequence
from . import IntentContextProvider
from .drill_information import DRILL_INSTRUCTIONS
from ..types import ChatMessage

EXECUTION_SIGNALS = {
    "step",
    "steps",
    "instruction",
    "instructions",
    "guide",
    "guides",
    "how",
    "how to",
    "how to do",
    "how many",
    "technique",
    "form",
    "execution",
    "breakdown",
    "explain",
}

DRILL_SIGNALS = {
    "beef",
    "crossover",
    "two-ball",
    "triple threat",
    "jab step",
    "suicide",
    "suicides",
    "close-out",
    "close out",
    "box out",
    "outlet pass",
    "skip pass",
    "bounce pass",
    "chest pass",
    "form shooting",
    "pull-up",
    "pull up",
    "dribbling",
    "shooting",
    "passing",
    "rebounding",
    "defense",
    "footwork",
    "conditioning",
    # Dribbling
    "right hand dribbling",
    "left hand dribbling",
    "between the legs",
    "behind the back",
    # Shooting
    "catch and shoot",
    "catch & shoot",
    "catch-and-shoot",
    "catch n shoot",
    "jump shot",
    "three-point",
    "three point",
    "3-point",
    "3 point",
    "free throw",
    "free throws",
    # Rebounding
    "reaction rebound",
    "reaction rebounding",
    "tip drill",
    "tipping",
    # Defense
    "defensive slide",
    "defensive slides",
    "one-on-one",
    "one on one",
    "1v1",
    "1-on-1",
    # Footwork & Conditioning
    "pivot",
    "pivoting",
    "suicide runs",
}

# TODO: Break this apart to categories


class DrillInstructionsProvider(IntentContextProvider):
    @property
    def name(self):
        return "drill_instructions"

    @property
    def intent_signals(self) -> Set[str]:
        return set()  # has two sets to check

    def is_relevant(
        self, user_prompt: str, chat_history: Sequence[ChatMessage] | None = None
    ) -> bool:
        if self._contains_any_signal(
            user_prompt, EXECUTION_SIGNALS
        ) and self._contains_any_signal(user_prompt, DRILL_SIGNALS):
            return True

        if self._normalize(user_prompt) in self.affirmative_terms:
            return self._history_contains_signal(DRILL_SIGNALS, chat_history)

        return False

    def get_context(self) -> str:
        return DRILL_INSTRUCTIONS
