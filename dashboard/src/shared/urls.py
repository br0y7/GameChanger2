from yarl import URL
import streamlit as st


_BASE_URL = URL(st.secrets.get("PLATFORM_BASE_URL", "http://localhost:5173/"))
_API_URL = _BASE_URL / "api"


class Accounts:
    GET_SESSION = _API_URL / "auth/get-session"


class Pages:
    LOGIN = _BASE_URL / "login"
    LOGOUT = _BASE_URL / "logout"
    SIGNUP = _BASE_URL / "signup"
