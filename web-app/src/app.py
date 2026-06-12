from yarl import URL
import requests
from pathlib import Path
import streamlit as st
from paths import SRC_DIR, ASSETS_DIR
from utils.ui import load_css
from utils.navigation import redirectTo
from features.player.performance_page import render_player_performance
from features.team.dashboard_page import render_team_dashboard
from shared.urls import Accounts

st.set_page_config(layout="wide")

load_css(ASSETS_DIR / "style.css")


home_page = st.Page(
    SRC_DIR / "homepage.py",
    icon="🏀",
    title="Home",
)

player_page = st.Page(
    render_player_performance,
    icon="📋",
    title="Player Performance Report",
)

team_dashboard_page = st.Page(
    render_team_dashboard,
    icon="📊",
    title="Team Dashboard",
)

pages = [home_page]

BETTER_AUTH_COOKIE = "better-auth.session_token"
auth_cookie = None

if BETTER_AUTH_COOKIE in st.context.cookies:
    auth_cookie = st.context.cookies[BETTER_AUTH_COOKIE]

if auth_cookie:
    res = requests.get(
        str(Accounts.BASE_URL / "api/auth/get-session"),
        cookies={BETTER_AUTH_COOKIE: auth_cookie},
    )

    if res.status_code != 200:
        st.error("ERROR")
        st.stop()

    # TODO: Add roles then filter pages here

    def logout():
        redirectTo(Accounts.LOGOUT)

    pages.append(st.Page(logout, icon=":material/logout:", title="Logout"))
else:

    def login():
        redirectTo(Accounts.LOGIN)

    def signup():
        redirectTo(Accounts.SIGNUP)

    pages.append(st.Page(login, icon=":material/login:", title="Login"))
    pages.append(st.Page(signup, icon=":material/person_add:", title="Sign Up"))


current_page = st.navigation(
    pages,
    position="top",
)

current_page.run()

# Footer
st.markdown(
    '<p class="footer-brand">GameChanger — AI-Powered Basketball Analytics for Youth Players</p>',
    unsafe_allow_html=True,
)
