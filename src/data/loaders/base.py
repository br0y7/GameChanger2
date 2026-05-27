import pandas as pd
from typing import Protocol


class DataLoader(Protocol):
    """Generic interface that will represent data loaders"""

    def load_player_stats(self) -> pd.DataFrame:
        """Loads a data frame containing players stats"""
        ...

    def load_advanced_stats(self) -> pd.DataFrame:
        """Loads a data frame containing advanced stats"""
        ...
