from typing import TypedDict, Literal, Protocol, Iterator
from .context_builder import ContextBuilder


class ChatMessage(TypedDict):
    role: Literal["assistant", "system", "user"]
    content: str


class AIAssistant(Protocol):
    name: str

    def stream_response(
        self,
        user_prompt: str,
        context_builder: ContextBuilder,
        chat_history: list[ChatMessage],
    ) -> Iterator[str]: ...
