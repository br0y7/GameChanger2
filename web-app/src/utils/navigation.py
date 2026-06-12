import streamlit as st


def redirectTo(url: str):
    """Redirect to external urls in Streamlit"""
    st.markdown(
        f'<meta http-equiv="refresh" content="0; url={url}">', unsafe_allow_html=True
    )
