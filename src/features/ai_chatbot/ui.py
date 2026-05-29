from itertools import chain
from typing import cast, Iterator
from .types import ChatMessage, AIAssistant
from .context_builder import ContextBuilder
from dataclasses import dataclass, field
import streamlit as st


@dataclass
class ChatState:
    is_processing: bool = False
    chat_history: list[ChatMessage] = field(default_factory=list)
    user_prompt: str = ""


@st.fragment
def render_ai_chatbot(
    page_id: str,
    context_builder: ContextBuilder,
    input_placeholder: str,
    assistants: list[AIAssistant],
    preferred_assistant_name: str | None = None,
):
    if not assistants:
        raise ValueError(
            "assistants can't be empty! Need one assistant to generate the answer."
        )

    """Reusable function to render the AI chatbot"""
    st.markdown("---")
    st.subheader("💡 AI Assistant")
    st.caption("Ask questions about performance, training, or game strategy.")

    # So per page we could have different chat state/history
    CHAT_STATE_KEY = f"{page_id}_chatbot_state"
    CHAT_INPUT_KEY = f"{page_id}_input_key"

    if CHAT_STATE_KEY not in st.session_state:
        st.session_state[CHAT_STATE_KEY] = ChatState()

    state: ChatState = st.session_state[CHAT_STATE_KEY]

    for message in state.chat_history:
        with st.chat_message(message["role"]):
            st.write(message["content"])

    # Callbacks run first when script is rerun (when somebody submits)
    def start_processing():
        state.user_prompt = cast(str, st.session_state[CHAT_INPUT_KEY]).strip()
        state.is_processing = True

    st.chat_input(
        placeholder=input_placeholder,
        disabled=state.is_processing,
        on_submit=start_processing,
        key=CHAT_INPUT_KEY,
    )

    if state.user_prompt and state.is_processing:
        with st.chat_message("user"):
            st.write(state.user_prompt)

        with st.chat_message("assistant"):
            assistants = assistants.copy()

            if preferred_assistant_name is None:
                preferred_assistant_name = assistants[0].name

            # False -> 0 -> Goes first when sorting, 0 < 1
            assistants.sort(key=lambda x: x.name != preferred_assistant_name)

            response: Iterator[str] | None = None
            active_assistant: AIAssistant = assistants[0]

            status = st.status(label="Thinking...")

            for assistant in assistants:
                try:
                    response = assistant.stream_response(
                        state.user_prompt, context_builder, state.chat_history
                    )
                    active_assistant = assistant
                    status.write(active_assistant.name)
                except Exception:
                    # TODO: Maybe log or something
                    continue

            try:
                if response:
                    if (
                        active_assistant
                        and active_assistant.name != preferred_assistant_name
                    ):
                        st.warning(
                            f"{preferred_assistant_name} was unreachable, asked {active_assistant.name} instead."
                        )

                    # Wait for the first chunk
                    first_chunk = next(response)

                    # Then put it back
                    response = chain([first_chunk], response)

                    status.update(label="Answering...", state="running")

                    full_response = cast(str, st.write_stream(response))

                    status.update(label="Complete", state="complete")

                    state.chat_history.append(
                        {"role": "user", "content": state.user_prompt}
                    )
                    state.chat_history.append(
                        {"role": "assistant", "content": full_response}
                    )

                raise NotImplementedError("No defaults yet...")
            except Exception as e:
                # TODO: Maybe log or something
                st.error(f"🙁 Can't get an answer {e}")
        state.is_processing = False
        # important to re-evaluate this fragment after processing
        st.rerun(scope="fragment")

    if st.button("Clear Chat", icon=":material/delete_sweep:"):
        state.chat_history = []
        state.user_prompt = ""

        st.rerun(scope="fragment")
