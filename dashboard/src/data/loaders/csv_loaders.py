from pathlib import Path
import pandas as pd


class BaseCSVLoader:
    def __init__(
        self, player_stats_path: Path, advanced_stats_path: Path | None = None
    ):
        self.player_stats_path = player_stats_path
        self.advanced_stats_path = advanced_stats_path

    def load_player_stats(self) -> pd.DataFrame:
        """Loads a data frame containing players stats"""
        if not self.player_stats_path.exists():
            return pd.DataFrame()

        return pd.read_csv(self.player_stats_path)

    def load_advanced_stats(self) -> pd.DataFrame:
        """Loads a data frame containing advanced stats"""
        if not self.advanced_stats_path or not self.advanced_stats_path.exists():
            return pd.DataFrame()

        return pd.read_csv(self.advanced_stats_path)


class ThreeOnThreeTournamentLoader(BaseCSVLoader):
    """Derived implementation, tries to generate cleaned csv files when they don't exist"""

    def __init__(self, player_stats_path: Path, advanced_stats_path: Path):
        super().__init__(player_stats_path, advanced_stats_path)

    def _generate_csvs(self):
        from data.converters.three_on_three_tournament import convert_to_csv

        STORAGE_PATH = self.player_stats_path.resolve().parent

        if not STORAGE_PATH.exists():
            raise LookupError(f"Can't generate player stats {STORAGE_PATH}")

        try:
            convert_to_csv(STORAGE_PATH)
        except Exception as e:
            raise FileNotFoundError(
                f"3 on 3 tournament data not found. Either add Final_Cleaned_Data_3on3.csv and "
                f"Final_Player_Advanced_Stats_3on3.csv, or place '3 on 3 basketball tournament.xlsx' "
                f"in the data folder. Converter error: {e}"
            )

    def load_player_stats(self) -> pd.DataFrame:
        if not self.player_stats_path.exists():
            self._generate_csvs()

        return super().load_player_stats()

    def load_advanced_stats(self) -> pd.DataFrame:
        if not self.advanced_stats_path or not self.advanced_stats_path.exists():
            self._generate_csvs()

        return super().load_advanced_stats()
