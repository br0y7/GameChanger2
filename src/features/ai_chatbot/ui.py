from itertools import chain
from collections.abc import Iterator
from typing import cast
from . import ChatMessage, SystemPromptEngine
from .assistants import AIAssistant
from dataclasses import dataclass, field
import streamlit as st


@dataclass
class ChatState:
    is_processing: bool = False
    chat_history: list[ChatMessage] = field(default_factory=list)
    user_prompt: str = ""


@dataclass
class ChatUIText:
    header: str = "💡 AI Assistant"
    description: str = "Ask questions about performance, training, or game strategy."
    input_placeholder: str = "Ask a question to the assistant..."


# Callbacks run first when script is rerun (when somebody submits).
# Put the callback outside the render function to prevent reallocating
# this function each time render_ai_chatbot is called.
def start_processing(state: ChatState, input_key: str):
    user_input = st.session_state[input_key]

    if user_input and (user_input := user_input.strip()):
        state.user_prompt = user_input
        state.is_processing = True


@st.fragment
def render_ai_chatbot(
    chatbot_id: str,
    system_prompt_engine: SystemPromptEngine,
    assistants: list[AIAssistant],
    preferred_assistant_name: str | None = None,
    chat_ui_text: ChatUIText = ChatUIText(),
) -> None:
    """Reusable function to render the AI chatbot"""

    if not assistants:
        raise ValueError(
            "The assistants list can't be empty."
            "At least one `AIAssistant` implementation must be provided."
        )

    st.markdown("---")
    st.subheader(chat_ui_text.header)
    st.caption(chat_ui_text.description)

    # So per context we could have different chat state/history
    CHAT_STATE_KEY = f"{chatbot_id}_chatbot_state"
    CHAT_INPUT_KEY = f"{chatbot_id}_input_key"

    if CHAT_STATE_KEY not in st.session_state:
        st.session_state[CHAT_STATE_KEY] = ChatState()

    state: ChatState = st.session_state[CHAT_STATE_KEY]

    for message in state.chat_history:
        match message["role"]:
            case "error":
                with st.chat_message("assistant", avatar=":material/error:"):
                    st.error(message["content"])
            case "warning":
                with st.chat_message("assistant", avatar=":material/warning:"):
                    st.warning(message["content"])
            case _:
                with st.chat_message(message["role"]):
                    st.write(message["content"])

    # Important: So that the chat_input doesn't disappear when doing a
    # heavy call to get the stream response, also it is called first
    # so the chat input will always render after this.
    stream_container = st.container()

    if state.chat_history and st.button(
        "Clear Chat", icon=":material/chat_bubble_off:", disabled=state.is_processing
    ):
        state.chat_history = []
        state.user_prompt = ""

        st.rerun(scope="fragment")

    st.chat_input(
        placeholder=chat_ui_text.input_placeholder,
        disabled=state.is_processing,
        on_submit=start_processing,
        args=(state, CHAT_INPUT_KEY),  # start_processing callback args
        key=CHAT_INPUT_KEY,
    )

    # early guard to prevent deep nesting
    if not state.is_processing or not state.user_prompt:
        return

    stream_container.chat_message("user").write(state.user_prompt)

    state.chat_history.append({"role": "user", "content": state.user_prompt})

    chat_msg = stream_container.chat_message("assistant")
    assistants = assistants.copy()

    if preferred_assistant_name is None:
        preferred_assistant_name = assistants[0].name

    # False -> 0 -> Goes first when sorting, 0 < 1
    assistants.sort(key=lambda x: x.name != preferred_assistant_name)

    response: Iterator[str] | None = None
    active_assistant: AIAssistant = assistants[0]

    status = chat_msg.status(label="Thinking...")

    for assistant in assistants:
        try:
            response = assistant.stream_response(
                state.user_prompt, system_prompt_engine, state.chat_history
            )
            active_assistant = assistant
        except Exception as e:
            # TODO: Maybe log or something
            continue

    try:
        if response:
            if active_assistant and active_assistant.name != preferred_assistant_name:
                state.chat_history.append(
                    {
                        "role": "warning",
                        "content": f"{preferred_assistant_name} was unreachable, asked {active_assistant.name} instead.",
                    }
                )

            # Wait for the first chunk
            first_chunk = next(response)

            # Then put it back
            response = chain([first_chunk], response)

            status.update(label="Answering...", state="running")

            full_response = cast(str, chat_msg.write_stream(response))

            status.update(label="Complete", state="complete")

            state.chat_history.append({"role": "assistant", "content": full_response})
        else:
            raise NotImplementedError("No defaults yet...")
    except Exception as e:
        # TODO: Maybe log or something
        state.chat_history.append({"role": "error", "content": f"{e}"})

    state.is_processing = False
    # important to re-evaluate this fragment after processing
    st.rerun(scope="fragment")
