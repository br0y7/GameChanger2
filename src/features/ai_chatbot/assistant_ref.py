"""
AI Assistant Module for Basketball Analytics Dashboard
Handles AI-powered coaching advice and chat interface
Uses OpenAI API (can be switched to other providers)
"""

from openai.types.chat import ChatCompletionMessageParam
from typing import Dict, Any, Iterator, cast
from .types import ChatMessage
from features.player.models import PlayerProfile
from openai import OpenAI
import requests
import streamlit as st
import os


class AIAssistant:
    """
    AI Assistant for providing personalized basketball coaching advice
    """

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY") or st.secrets.get("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL") or st.secrets.get("OPENAI_BASE_URL")

        TIMEOUT = 60  # seconds
        self.client = OpenAI(base_url=base_url, api_key=api_key, timeout=TIMEOUT)

        self.backend_enabled = False
        # Try to get API key from environment or Streamlit secrets
        # self.api_key = os.getenv("OPENAI_API_KEY")
        # self.backend_url = os.getenv("AI_BACKEND_URL")  # e.g. http://127.0.0.1:3000
        # if st is not None:
        #     try:
        #         self.api_key = self.api_key or st.secrets.get("OPENAI_API_KEY", None)
        #         self.backend_url = self.backend_url or st.secrets.get(
        #             "AI_BACKEND_URL", None
        #         )
        #     except Exception:
        #         pass

        # if OPENAI_AVAILABLE and self.api_key:
        #     self.client = OpenAI(,api_key=self.api_key)
        #     self.enabled = True
        # else:
        #     self.enabled = False
        #     self.client = None

        # # If a backend URL is configured, prefer it (backend-only mode)
        # self.backend_enabled = bool(self.backend_url)

    def generate_coaching_prompt(self, player_profile: PlayerProfile) -> str:
        """
        Generate structured prompt for AI based on player data
        This is the key to getting personalized, actionable advice
        """
        return (
            PlayerProfileContextBuilder()
            .with_player_profile(player_profile)
            .with_advanced_stats(player_profile.advanced_stats)
            .with_instructions()
            .build_context()
        )

    def get_ai_response(
        self, user_question: str, player_profile: PlayerProfile | None = None
    ) -> Iterator[str]:
        """
        Get AI response to user question with player context
        """
        # if self.backend_enabled:
        #     try:
        #         system_prompt = None
        #         if player_profile:
        #             system_prompt = self.generate_coaching_prompt(player_profile)

        #         r = requests.post(
        #             f"{self.backend_url.rstrip('/')}/api/ask",
        #             json={"message": user_question, "system_prompt": system_prompt},
        #             timeout=30,
        #         )
        #         if r.status_code != 200:
        #             return f"Backend error ({r.status_code}): {r.text}"
        #         return r.json().get("reply", "")
        #     except Exception as e:
        #         return f"Error calling backend AI: {str(e)}"

        # if not self.enabled or self.client is None:
        #     return "⚠️ AI Assistant is not available. Configure AI_BACKEND_URL (recommended) or OPENAI_API_KEY."
        # TODO: Refactor get_ai_response
        raise NotImplementedError("To be deprecated or reimplemented")
        # try:
        # Build messages for chat
        messages: list[ChatCompletionMessageParam] = []

        # System message with player context
        if player_profile:
            system_prompt = self.generate_coaching_prompt(player_profile)
            messages.append({"role": "system", "content": system_prompt})
        else:
            # General advice mode - include full knowledge base
            messages.append(
                {
                    "role": "system",
                    "content": PlayerProfileContextBuilder()
                    .with_instructions()
                    .build_prompt(),
                }
            )

        # Add conversation history if available
        if st is not None and "chat_history" in st.session_state:
            for msg in st.session_state.chat_history[
                -6:
            ]:  # Last 6 messages for context
                messages.append(msg)

        # Add current question
        messages.append({"role": "user", "content": user_question})

        # Call OpenAI API
        response_stream = self.client.chat.completions.create(
            # model="gpt-3.5-turbo",  # Can be upgraded to gpt-4
            temperature=0.7,
            messages=messages,
            stream=True,
        )

        for chunk in response_stream:
            content = chunk.choices[0].delta.content

            if content:
                yield content

        return
        # st.write(type(response_stream).__name__)

        # ai_message = response.choices[0].message.content

        # Update chat history
        # if st is not None:
        #     if "chat_history" not in st.session_state:
        #         st.session_state.chat_history = []

        #     st.session_state.chat_history.append(
        #         {"role": "user", "content": user_question}
        #     )
        #     st.session_state.chat_history.append(
        #         {"role": "assistant", "content": ai_message}
        #     )

        # return ai_message

        # except Exception as e:
        # return f"Error getting AI response: {str(e)}. Please check your API key and connection."

    def get_personalized_feedback(self, player_profile: Dict[str, Any]) -> str:
        """
        Generate automatic personalized feedback based on player stats
        """
        if self.backend_enabled:
            prompt = self.generate_coaching_prompt(player_profile)
            try:
                r = requests.post(
                    f"{self.backend_url.rstrip('/')}/api/ask",
                    json={
                        "message": "Provide a comprehensive personalized coaching analysis and improvement plan for this player.",
                        "system_prompt": prompt,
                    },
                    timeout=30,
                )
                if r.status_code != 200:
                    return f"Backend error ({r.status_code}): {r.text}"
                return r.json().get("reply", "")
            except Exception as e:
                return f"Error calling backend AI: {str(e)}"

        if not self.enabled or self.client is None:
            return "⚠️ AI Assistant is not available. Configure AI_BACKEND_URL (recommended) or OPENAI_API_KEY."

        prompt = self.generate_coaching_prompt(player_profile)

        try:
            response = self.client.chat.completions.create(
                # model="gpt-3.5-turbo",
                model="qwen3:4b",
                messages=[
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": "Provide a comprehensive personalized coaching analysis and improvement plan for this player.",
                    },
                ],
                max_tokens=600,
                temperature=0.7,
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error generating feedback: {str(e)}"


# Global instance
ai_assistant = AIAssistant()
