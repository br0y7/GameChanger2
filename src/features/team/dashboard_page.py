import streamlit as st
import pandas as pd
from data import get_data_manager
from features.ai_chatbot import (
    render_ai_chatbot,
    SystemPromptEngine,
    get_basketball_training_providers,
)
from features.ai_chatbot.assistants import get_assistants

STAT_TOOLTIPS = {
    "Name": "Player name and team",
    "Games": "Number of games played.",
    "Points": "Total points you scored in the game.",
    "Rebounds": "How many times you gained possession after a missed shot.",
    "Assists": "Passes that directly led to a teammate scoring.",
    "3PM": "Shots made from beyond the three-point line.",
    "FG Made": "Total shots made from the floor (2-point and 3-point shots).",
    "Blocks": "Shots you prevented by stopping the ball before it reached the basket.",
    "OREB": "Rebounds your team gets after your own team misses a shot.",
    "DREB": "Rebounds your team gets after the opponent misses a shot.",
    "Personal Fouls": "Illegal contact that can give the opponent free throws or possession.",
    "Turnovers": "Times you lost possession of the ball to the other team.",
    "FG%": "How efficient you are at making your shots overall.",
    "3PT%": "How often you make shots from long range.",
    "FT%": "How often you make uncontested free throw shots.",
    "GCIR": "GameChanger Impact Rating: (PTS*PPS) + 1.3(REB) + 1.5(AST) + 3(STL) + 2.5(BLK) + 0.7(OREB) - 1.5(TOV) - 0.8(PF). PPS = PTS/FGA (points per shot).",
    "GCMVP": "GameChanger MVP (Total games only, per-game avg): (4*PTS*(PTS/(FGA+0.44*FTA))) + 0.7(REB) + 1.2(AST) + 1.8(STL) + 1.5(BLK) - 2(TOV) - 0.7(PF).",
}


def render_team_dashboard():
    # 2️⃣ Live Dashboard - Player Stats Table (Team Dashboard)"""

    # TODO: Handle this better
    SELECTED_SEASON_KEY = "selected_season_state"

    season_options = {"Season 1 Rising Stars": 1, "Season 2 Rising Stars": 2}

    col1, col2 = st.columns([4, 1])

    with col1:
        st.header("📊 Team Dashboard")

    with col2:
        st.selectbox(
            "Select a Season",
            season_options.keys(),
            key=SELECTED_SEASON_KEY,
            label_visibility="collapsed",
        )

    season_num = season_options[st.session_state[SELECTED_SEASON_KEY]]

    st.caption("Click “View Dashboard” on the homepage to see how it works.")
    try:
        game_data = get_data_manager().load_player_data(season=season_num)
        advanced_stats = get_data_manager().load_advanced_stats(season=season_num)
    except Exception as e:
        st.error(e)
        return

    totals = game_data.groupby(["Player No.", "Team"], as_index=False).agg(
        Games=("Game", "nunique"),
        PTS=("PTS", "sum"),
        REB=("REB", "sum"),
        AST=("AST", "sum"),
        ThreePTM=("3PTM", "sum"),
        FGM=("FGM", "sum"),
        BLK=("BLK", "sum"),
        OREB=("OREB", "sum"),
        DREB=("DREB", "sum"),
        PF=("PF", "sum"),
        TOV=("TOV", "sum"),
        FGA=("FGA", "sum"),
        ThreePA=("3PA", "sum"),
        FTM=("FTM", "sum"),
        FTA=("FTA", "sum"),
        STL=("STL", "sum"),
    )
    # Coerce to numeric in case CSV read as object (e.g. on some hosts)
    for col in [
        "Games",
        "PTS",
        "REB",
        "AST",
        "ThreePTM",
        "FGM",
        "BLK",
        "OREB",
        "DREB",
        "PF",
        "TOV",
        "FGA",
        "ThreePA",
        "FTM",
        "FTA",
        "STL",
    ]:
        if col in totals.columns:
            totals[col] = pd.to_numeric(totals[col], errors="coerce")
    games = totals["Games"].replace(0, pd.NA)
    totals["Points"] = (totals["PTS"] / games).round(1)
    totals["Rebounds"] = (totals["REB"] / games).round(1)
    totals["Assists"] = (totals["AST"] / games).round(1)
    totals["3PM"] = (totals["ThreePTM"] / games).round(1)
    totals["FG Made"] = (totals["FGM"] / games).round(1)
    totals["Blocks"] = (totals["BLK"] / games).round(1)
    totals["OREB"] = (totals["OREB"] / games).round(1)
    totals["DREB"] = (totals["DREB"] / games).round(1)
    totals["Personal Fouls"] = (totals["PF"] / games).round(1)
    totals["Turnovers"] = (totals["TOV"] / games).round(1)
    totals["FG%"] = pd.to_numeric(
        totals["FGM"] / totals["FGA"].replace(0, pd.NA) * 100, errors="coerce"
    ).round(1)
    totals["3PT%"] = pd.to_numeric(
        totals["ThreePTM"] / totals["ThreePA"].replace(0, pd.NA) * 100, errors="coerce"
    ).round(1)
    totals["FT%"] = pd.to_numeric(
        totals["FTM"] / totals["FTA"].replace(0, pd.NA) * 100, errors="coerce"
    ).round(1)
    # PPS = PTS/FGA (points per shot, when FGA > 0); GCIR = (PTS*PPS) + 1.3(REB) + 1.5(AST) + 3(STL) + 2.5(BLK) + 0.7(OREB) - 1.5(TOV) - 0.8(PF)
    _pps = totals["PTS"] / totals["FGA"].replace(0, pd.NA)
    _pps = _pps.fillna(0).astype(float)
    _gcir_total = (
        totals["PTS"] * _pps
        + 1.3 * totals["REB"]
        + 1.5 * totals["AST"]
        + 3 * totals["STL"]
        + 2.5 * totals["BLK"]
        + 0.7 * totals["OREB"]
        - 1.5 * totals["TOV"]
        - 0.8 * totals["PF"]
    )
    totals["GCIR"] = (_gcir_total / games).fillna(0).round(1)

    labels = advanced_stats[
        ["Player No.", "Team", "Player_Team_Label"]
    ].drop_duplicates()
    totals = totals.merge(labels, on=["Player No.", "Team"], how="left")
    totals["Name"] = totals["Player_Team_Label"].fillna(
        "Player "
        + totals["Player No."].astype(str)
        + " ("
        + totals["Team"].astype(str)
        + ")"
    )

    display_df = totals[
        [
            "Name",
            "Points",
            "Rebounds",
            "Assists",
            "3PM",
            "FG Made",
            "Blocks",
            "OREB",
            "DREB",
            "Personal Fouls",
            "Turnovers",
            "FG%",
            "3PT%",
            "FT%",
            "GCIR",
        ]
    ].copy()
    # Format percentages to 1 decimal
    for pct_col in ["FG%", "3PT%", "FT%"]:
        if pct_col in display_df.columns:
            display_df[pct_col] = display_df[pct_col].apply(
                lambda x: f"{x:.1f}" if pd.notna(x) else "N/A"
            )

    column_config = {
        col: st.column_config.Column(col, help=STAT_TOOLTIPS.get(col, ""))
        for col in display_df.columns
        if STAT_TOOLTIPS.get(col)
    }
    st.dataframe(
        display_df,
        width="stretch",
        hide_index=True,
        column_config=column_config,
    )

    # Optional bar chart (plotly optional for environments where it fails to import, e.g. some hosts)
    # on_change="rerun" makes the content lazy loaded
    with st.expander("Show player comparison chart", expanded=False, on_change="rerun"):
        try:
            import plotly.express as px

            fig = px.bar(
                display_df.sort_values("GCIR", ascending=True).tail(12),
                x="Name",
                y="GCIR",
                title="GCIR by Player",
                color="GCIR",
                color_continuous_scale="Blues",
            )
            fig.update_layout(showlegend=False, height=400, xaxis_tickangle=-45)
            st.plotly_chart(fig, width="stretch")
        except Exception:
            st.info(
                "Chart is unavailable in this environment. The stats table above has the same data."
            )

    st.markdown("---")

    AI_TASK = """
    Give coaching advice if the input is related about basketball. 
    Look at the context block for information about drills and stat definitions.
    If the input asks for a drill recommendation and you have not recommended it before look in the DRILL OVERVIEW and pick a random one.
    If you have recommended one, make sure you explain that drill.

    ## Constraints
    - Do not infer data or use outside knowledge.
    - If any required data, definition, or drill match is missing, trigger the system prompt's exact Missing Data Response.
    """

    # TODO: Learn what context you want here.

    providers = [*get_basketball_training_providers()]

    system_prompt_engine = SystemPromptEngine(AI_TASK, providers)

    render_ai_chatbot(
        chatbot_id="team_dashboard_page",
        system_prompt_engine=system_prompt_engine,
        assistants=get_assistants(),
    )
