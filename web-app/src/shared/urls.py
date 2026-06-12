from yarl import URL
import streamlit as st


class Accounts:
    BASE_URL = URL(st.secrets.get("ACCOUNTS_BASE_URL", "http://localhost:5173/"))
    LOGIN = BASE_URL / "login"
    LOGOUT = BASE_URL / "logout"
    SIGNUP = BASE_URL / "signup"
