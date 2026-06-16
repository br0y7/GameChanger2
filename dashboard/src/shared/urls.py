from yarl import URL
import streamlit as st


_BASE_URL = URL(st.secrets.get("ACCOUNTS_BASE_URL", "http://localhost:5173/"))


class Accounts:
    GET_SESSION = _BASE_URL / "api/auth/get-session"


class Pages:
    LOGIN = _BASE_URL / "login"
    LOGOUT = _BASE_URL / "logout"
    SIGNUP = _BASE_URL / "signup"
