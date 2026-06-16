from pathlib import Path
import streamlit as st


def load_css(css_path: Path) -> None:
    try:
        if not css_path.is_file() or css_path.suffix.lower() != ".css":
            raise ValueError(f"Provided {css_path} path is not a css file.")

        with css_path.open() as file:
            st.html(f"<style>{file.read()}</style>")
    except Exception as e:
        st.error(e)
