from ..types import ChatMessage
from .. import SystemPromptEngine
from typing import Protocol
from collections.abc import Iterator


class AIAssistant(Protocol):
    """Generic interface to represent an AI assistant, as long as
    an object has the field and methods below, it is an `AIAssistant`.
    """

    name: str

    def stream_response(
        self,
        user_prompt: str,
        system_prompt_engine: SystemPromptEngine,
        chat_history: list[ChatMessage],
    ) -> Iterator[str]: ...
