import streamlit as st
import os
from typing import Iterator, cast
from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam
from ..context_builder import ContextBuilder
from ..types import ChatMessage


class OpenAIAssistant:
    def __init__(self, name: str = "OpenAI", timeout=60):
        """
        timeout is in seconds
        """
        self.name = name

        api_key = os.getenv("OPENAI_API_KEY") or st.secrets.get("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL") or st.secrets.get("OPENAI_BASE_URL")
        self.model = (
            os.getenv("OPENAI_MODEL")
            or st.secrets.get("OPENAI_MODEL")
            or "gpt-3.5-turbo"
        )

        self.client = OpenAI(base_url=base_url, api_key=api_key, timeout=timeout)

    def stream_response(
        self,
        user_prompt: str,
        context_builder: ContextBuilder,
        chat_history: list[ChatMessage],
    ) -> Iterator[str]:
        messages: list[ChatMessage] = (
            [{"role": "system", "content": context_builder.build_context()}]
            + chat_history
            + [{"role": "user", "content": user_prompt}]
        )

        response_stream = self.client.chat.completions.create(
            model=self.model,
            temperature=0.7,
            messages=cast(list[ChatCompletionMessageParam], messages),
            stream=True,
        )

        for chunk in response_stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
