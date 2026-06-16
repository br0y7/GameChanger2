from contextvars import Context
from dataclasses import dataclass
from typing import Self
from collections.abc import Sequence, Iterable
from .prompts import COACH_SYSTEM_PROMPT
from .providers import ContextProvider
from .types import ChatMessage
import inspect


class SystemPromptEngine:
    """Assembles the task and conditionally adds context to save tokens
    when building the system prompt.
    """

    def __init__(self, task: str, providers: Iterable[ContextProvider]):
        self._task = self._wrap_with_tag("task", task)
        # Iterate and freeze
        self._providers = tuple(providers)

    def _clean_text(self, content: str):
        return inspect.cleandoc(content).strip()

    def _wrap_with_tag(self, tag: str, content: str) -> str:
        # cleandoc removes leading whitepace like newlines and indents
        # strip for both leading and trailing whitespace
        return f"<{tag}>\n{self._clean_text(content)}\n</{tag}>"

    def build_prompt(
        self, user_prompt: str, chat_history: Sequence[ChatMessage]
    ) -> str:
        """Builds the components into a single system prompt."""
        system_prompt = COACH_SYSTEM_PROMPT.format(app_name="Gamechanger")

        prompt_blocks = [system_prompt, self._task]

        # Conditionally add context to reduce token usage.
        relevant_providers = [
            provider
            for provider in self._providers
            if provider.is_relevant(user_prompt, chat_history)
        ]

        # TODO: Remove, for debug purposes only.
        print([p.name for p in relevant_providers])

        if relevant_providers:
            context = "\n\n".join(
                [self._clean_text(p.get_context()) for p in relevant_providers]
            )
            prompt_blocks.append(self._wrap_with_tag("context", context))

        return "\n\n".join(prompt_blocks)
