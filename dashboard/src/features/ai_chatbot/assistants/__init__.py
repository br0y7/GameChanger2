from .protocol import AIAssistant
from .openai_assistant import OpenAIAssistant
import streamlit as st


@st.cache_resource
def get_assistants() -> list[AIAssistant]:
    """Returns a list of assistants. Cached by Streamlit."""
    return [OpenAIAssistant()]


# when assistants module is imported expose classes below
__all__ = ["AIAssistant", "OpenAIAssistant"]
