from .protocol import AIAssistant
from .openai_assistant import OpenAIAssistant

# when assistants module is imported expose classes below
__all__ = ["AIAssistant", "OpenAIAssistant"]
