import streamlit as st
import os
from typing import cast
from collections.abc import Iterator
from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam
from .. import SystemPromptEngine
from .. import ChatMessage


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
        system_prompt_engine: SystemPromptEngine,
        chat_history: list[ChatMessage],
    ) -> Iterator[str]:
        history_for_ai = [
            message
            for message in chat_history
            if message["role"] in ("user", "assistant")
        ][-6:]

        messages: list[ChatMessage] = [
            {
                "role": "system",
                "content": system_prompt_engine.build_prompt(user_prompt, chat_history),
            },
            *history_for_ai,
            {"role": "user", "content": user_prompt},
        ]

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
