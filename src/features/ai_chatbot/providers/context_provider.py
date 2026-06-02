from string import punctuation
from collections.abc import Set, Sequence
from abc import ABC, abstractmethod
from typing import Protocol
from ..types import ChatMessage


class ContextProvider(Protocol):
    """Protocol for conditionally providing context based on user prompts
    and optionally the chat history.
    """

    @property
    def name(self) -> str: ...

    def is_relevant(
        self, user_prompt: str, chat_history: Sequence[ChatMessage] | None = None
    ) -> bool:
        """Checks if this context is relevant to the user prompt."""
        ...

    def get_context(self) -> str:
        """Returns the contextual data for prompt use."""
        ...


class IntentContextProvider(ABC):
    """Abstract base class for intent context providers."""

    # Initialize once, translation table for punctuations into spaces, keep '%'
    _CHARS_TO_REMOVE = punctuation.replace("%", "")
    _PUNCTUATION_TABLE = str.maketrans(_CHARS_TO_REMOVE, " " * len(_CHARS_TO_REMOVE))

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def intent_signals(self) -> Set[str]: ...

    @property
    def affirmative_terms(self) -> Set[str]:
        return {
            # short
            "y",
            "ye",
            "yes",
            "yep",
            "yup",
            "yeah",
            "ya",
            "yah",
            # polite
            "please",
            "pls",
            "yes please",
            # agree
            "sure",
            "for sure",
            "absolutely",
            "definitely",
            # okay
            "ok",
            "okay",
            "kk",
            "okey dokey",
            # actionable
            "show me",
            "do it",
            "let's do it",
            "lets do it",
            "go ahead",
            "send it",
        }

    def _normalize(self, text: str) -> str:
        """Replaces punctuations with spaces and removes excess whitespace."""
        clean = text.lower().translate(self._PUNCTUATION_TABLE)
        return " ".join(clean.split())

    # extracted to be reusable when you need to check multiple sets.
    def _contains_any_signal(self, user_prompt: str, intent_signals: Set[str]):
        # Adding padding to prevent a signal matching a part of a user prompt.
        # eg. " pass " in " password "
        clean_prompt = f" {self._normalize(user_prompt)} "

        return any(
            f" {self._normalize(signal)} " in clean_prompt for signal in intent_signals
        )

    def _history_contains_signal(
        self,
        signals: Set[str],
        chat_history: Sequence[ChatMessage] | None = None,
        max_message_count: int = 6,
    ) -> bool:
        if not chat_history:
            return False

        recent_history = chat_history[-max_message_count:]

        for message in reversed(recent_history):
            if message["role"] == "assistant":
                if self._contains_any_signal(message["content"], signals):
                    return True

        return False

    def is_relevant(
        self, user_prompt: str, chat_history: Sequence[ChatMessage] | None = None
    ) -> bool:
        """Checks if this context is relevant to the user prompt."""
        if self._contains_any_signal(user_prompt, self.intent_signals):
            return True

        if self._normalize(user_prompt) in self.affirmative_terms:
            return self._history_contains_signal(self.intent_signals, chat_history)

        return False

    @abstractmethod
    def get_context(str): ...
