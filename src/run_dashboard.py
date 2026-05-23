import subprocess
import sys
from pathlib import Path

def run_dashboard():
    """
    Launches the Streamlit dashboard app.
    Uses existing CSV data (Final_Cleaned_Data*.csv, Final_Player_Advanced_Stats*.csv).
    No gamechanger ETL script required.
    """
    SRC_DIR = Path(__file__).resolve().parent

    dashboard_file = SRC_DIR / "dashboard_app.py"

    if not dashboard_file.exists():
        print(f"Error: '{dashboard_file.name}' not found in the current directory.")
        sys.exit(1)

    print("--- Launching GameChanger Dashboard ---")
    print("Please wait for the browser to open or follow the URL provided by Streamlit.")

    streamlit_command = [sys.executable, "-m", "streamlit", "run", dashboard_file]
    subprocess.run(streamlit_command)


if __name__ == "__main__":
    run_dashboard()
