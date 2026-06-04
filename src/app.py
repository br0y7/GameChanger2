from pathlib import Path
import streamlit as st
from paths import SRC_DIR, ASSETS_DIR
from utils.ui import load_css
from features.player.performance_page import render_player_performance
from features.team.dashboard_page import render_team_dashboard

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
            render_player_performance,
            icon="📋",
            title="Player Performance Report",
        ),
        st.Page(
            render_team_dashboard,
            icon="📊",
            title="Team Dashboard",
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
