from typing import TypedDict, Literal


class ChatMessage(TypedDict):
    role: Literal["assistant", "system", "user", "error", "warning"]
    content: str
