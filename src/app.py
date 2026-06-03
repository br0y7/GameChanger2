from pathlib import Path
import streamlit as st
from paths import SRC_DIR, ASSETS_DIR
from utils.ui import load_css
from features.player import performance_page

st.set_page_config(layout="wide")

load_css(ASSETS_DIR / "style.css")


# TODO: Get user roles here and filter pages

current_page = st.navigation(
    [
        st.Page(
            SRC_DIR / "homepage.py",
            icon="🏀",
            title="Home",
        ),
        st.Page(
            performance_page.render_page,
            icon="📋",
            title="Player Performance Report",
        ),
    ],
    position="top",
)

current_page.run()

# Footer
st.markdown(
    '<p class="footer-brand">GameChanger — AI-Powered Basketball Analytics for Youth Players</p>',
    unsafe_allow_html=True,
)
