import inspect
from typing import Protocol


class ContextBuilder(Protocol):
    """Generic interface for building a context when prompting an AI assistant"""

    def build_context(self) -> str: ...


class BaseContextBuilder:
    """Base implementation of a `ContextBuilder`, highly preferred to derive
    from this when implementing your own context builder"""

    def __init__(self):
        self._blocks: list[str] = []

    def _ensure_blocks_exist(self):
        """defensive guard just in case super().__init__() is not called
        in derived classes"""
        if not hasattr(self, "_blocks"):
            self._blocks: list[str] = []

    def add_block(self, new_block: str):
        """Use this to add a block of text for the context"""
        self._ensure_blocks_exist()
        # cleandoc removes excess whitespace like leading newlines and indents
        self._blocks.append(inspect.cleandoc(new_block))

    def build_context(self) -> str:
        self._ensure_blocks_exist()
        return "\n\n".join(self._blocks)
