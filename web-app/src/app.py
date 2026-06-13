from yarl import URL
import requests
from pathlib import Path
import streamlit as st
from utils.paths import SRC_DIR, ASSETS_DIR
from utils.ui import load_css
from utils.navigation import redirectTo
from features.player.performance_page import render_player_performance
from features.team.dashboard_page import render_team_dashboard
from shared.urls import Accounts, Pages
from shared.models import User
from shared.constants import AuthKeys
from utils.parsers import convert_json_to
import httpx


def initialize_auth_session(
    user_key: str, cookie_key: str
) -> tuple[User | None, str | None]:
    if user_key not in st.session_state:
        st.session_state[user_key] = None

    return st.session_state[user_key], st.context.cookies.get(cookie_key)


@st.cache_data(ttl=60)
def authenticate(cookie_key: str, cookie_value: str) -> User | None:
    if not cookie_value:
        return None

    try:
        with httpx.Client(timeout=10) as client:
            response = client.get(
                str(Accounts.GET_SESSION),
                cookies={cookie_key: cookie_value},
            )
            response.raise_for_status()

            session: dict = response.json()
            return convert_json_to(User, session["user"])

    except Exception:
        # TODO: Maybe log
        pass


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

user, auth_cookie = initialize_auth_session(
    user_key=AuthKeys.USER, cookie_key=AuthKeys.COOKIE
)

if user:

    def logout():
        st.session_state.clear()
        redirectTo(Pages.LOGOUT)

    # TODO: Conditionally add pages based on roles
    print(user.name)

    # Keep at the end to look nice
    pages.append(st.Page(logout, title="Logout", icon=":material/logout:"))

elif not auth_cookie:

    def login():
        redirectTo(Pages.LOGIN)

    pages.append(st.Page(login, title="Login", icon=":material/login:"))

    def signup():
        redirectTo(Pages.SIGNUP)

    pages.append(st.Page(signup, title="Sign Up", icon=":material/person_add:"))


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

# Run this at the end so at least the current page runs first.
if auth_cookie and not user:
    auth_user = authenticate(cookie_key=AuthKeys.COOKIE, cookie_value=auth_cookie)

    if auth_user:
        st.session_state[AuthKeys.USER] = auth_user
        st.rerun()
