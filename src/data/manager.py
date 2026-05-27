"""
Data Manager Module for Basketball Analytics Dashboard
Handles data storage, retrieval, and management
Supports CSV files (local) with structure ready for cloud migration (Google Sheets, SQL, etc.)
"""

import pandas as pd
from pathlib import Path
from player.models import PlayerProfile, PlayerIdentity
from player.player_profile_builder import PlayerProfileBuilder
from team.models import Team


class DataManager:
    """
    Manages player data storage and retrieval
    Currently uses CSV files, but structured for easy migration to cloud storage
    """

    def __init__(self, data_dir: Path | None = None):
        if data_dir is None:
            data_dir = Path(__file__).resolve().parent / "storage"

        self.storage_path = data_dir

        # Season 1 (main league)
        self.cleaned_data_file = data_dir / "Final_Cleaned_Data.csv"
        self.advanced_stats_file = data_dir / "Final_Player_Advanced_Stats.csv"

        # Season 2 (Unknown League / S2 - same data, different label)
        self.cleaned_data_s2_file = data_dir / "Final_Cleaned_Data_Unknown_League.csv"
        self.advanced_stats_s2_file = (
            data_dir / "Final_Player_Advanced_Stats_Unknown_League.csv"
        )
        # Season 3 (3 on 3 basketball tournament)
        self.cleaned_data_3on3_file = data_dir / "Final_Cleaned_Data_3on3.csv"
        self.advanced_stats_3on3_file = (
            data_dir / "Final_Player_Advanced_Stats_3on3.csv"
        )

    def _ensure_3on3_csvs(self) -> None:
        """If 3on3 CSVs are missing, run the converter from the tournament xlsx."""
        if (
            self.cleaned_data_3on3_file.exists()
            and self.advanced_stats_3on3_file.exists()
        ):
            return
        try:
            from convert_3on3_tournament import convert_to_csv

            convert_to_csv(self.storage_path)
        except Exception as e:
            raise FileNotFoundError(
                f"3 on 3 tournament data not found. Either add Final_Cleaned_Data_3on3.csv and "
                f"Final_Player_Advanced_Stats_3on3.csv, or place '3 on 3 basketball tournament.xlsx' "
                f"in the data folder. Converter error: {e}"
            ) from e

    def load_player_data(self, season: int = 1) -> pd.DataFrame:
        """
        Load cleaned player game data. Season 1/2 use Rising Stars CSVs;
        season 3 uses 3on3 tournament CSVs (generated from xlsx if missing).
        Default season=1 if None.
        """
        if season == 1:
            if not self.cleaned_data_file.exists():
                raise FileNotFoundError(
                    f"Player data file not found: {self.cleaned_data_file}"
                )
            return pd.read_csv(self.cleaned_data_file)
        elif season == 2:
            if not self.cleaned_data_s2_file.exists():
                raise FileNotFoundError(
                    f"Season 2 player data file not found: {self.cleaned_data_s2_file}"
                )
            return pd.read_csv(self.cleaned_data_s2_file)
        else:
            self._ensure_3on3_csvs()
            return pd.read_csv(self.cleaned_data_3on3_file)

    def load_advanced_stats(self, season: int = 1) -> pd.DataFrame:
        """
        Load player advanced statistics. Season 1/2 use Rising Stars CSVs;
        season 3 uses 3on3 tournament CSVs (generated from xlsx if missing).
        Default season=1 if None.
        """
        season = 1 if season is None else season
        if season == 1:
            if not self.advanced_stats_file.exists():
                raise FileNotFoundError(
                    f"Advanced stats file not found: {self.advanced_stats_file}"
                )
            return pd.read_csv(self.advanced_stats_file)
        elif season == 2:
            if not self.advanced_stats_s2_file.exists():
                raise FileNotFoundError(
                    f"Season 2 advanced stats file not found: {self.advanced_stats_s2_file}"
                )
            return pd.read_csv(self.advanced_stats_s2_file)
        else:
            self._ensure_3on3_csvs()
            return pd.read_csv(self.advanced_stats_3on3_file)

    def get_player_profile(
        self, player_no: int, team: str, season: int = 1
    ) -> PlayerProfile:
        """
        Get comprehensive player profile with all stats for the given season (1, 2, or 3).
        Returns structured data ready for AI prompt generation.
        """
        game_data = self.load_player_data(season)

        # Filter for specific player
        player_data = game_data[
            (game_data["Player No."] == player_no) & (game_data["Team"] == team)
        ]

        if player_data.empty:
            raise LookupError(
                f"No player found with Player #{player_no} and Team {team}"
            )

        # Only load advanced stats if player info exists.
        advanced_stats = self.load_advanced_stats(season)
        player_advanced_stats = advanced_stats[
            (advanced_stats["Player No."] == player_no)
            & (advanced_stats["Team"] == team)
        ]

        return (
            PlayerProfileBuilder(player_data)
            .add_advanced_statistics(player_advanced_stats)
            .build()
        )

    def get_all_players(self, season: int = 1) -> list[PlayerIdentity]:
        """Get list of all players for the given season (1, 2, or 3). Default season=1."""
        try:
            advanced_stats = self.load_advanced_stats(season=season)
            players: list[PlayerIdentity] = []
            for _, row in advanced_stats.iterrows():
                players.append(
                    PlayerIdentity(
                        player_no=int(row["Player No."]),
                        team=Team(name=row["Team"]),
                        label=row["Player_Team_Label"],
                    )
                )
            return players
        except Exception:
            return []

    def save_player_data(self, data: pd.DataFrame, filename: Path | None = None):
        """Save player data to CSV (for future cloud sync)"""
        if filename is None:
            filename = self.cleaned_data_file
        data.to_csv(filename, index=False)

    def build_season_stats_excel(self, file_path: Path | None = None) -> Path:
        """
        Create an Excel workbook with Season 1 Stats and Season 2 Stats sheets.
        Season 2 uses the same data as Unknown League / S2.
        Returns the path to the written file.
        """
        if file_path is None:
            file_path = self.storage_path / "Season_Stats.xlsx"
        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            if self.advanced_stats_file.exists():
                df_s1 = pd.read_csv(self.advanced_stats_file)
                df_s1.to_excel(writer, sheet_name="Season 1 Stats", index=False)
            if self.advanced_stats_s2_file.exists():
                df_s2 = pd.read_csv(self.advanced_stats_s2_file)
                df_s2.to_excel(writer, sheet_name="Season 2 Stats", index=False)
        return file_path

    # Future methods for cloud integration:
    # def sync_to_google_sheets(self): ...
    # def sync_to_sql(self): ...
    # def sync_to_cloud_storage(self): ...


# TODO: move data manager creation somewhere and let consumers handle
#  their own instance's lifespan
data_manager = DataManager()
