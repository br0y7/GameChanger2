import streamlit as st
from .manager import DataManager


@st.cache_resource
def get_data_manager() -> DataManager:
    # TODO: Either refactor or pass in path for DataManager
    return DataManager()


__all__ = ["DataManager"]
