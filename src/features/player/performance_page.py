import streamlit as st
import pandas as pd
from data.manager import DataManager
from . import PlayerProfile
from .context import (
    PlayerInfoProvider,
    AdvancedStatsProvider,
    PlayerScoutingReportProvider,
    PlayerStatsProvider,
    ShootingStatsProvider,
)
from features.ai_chatbot import (
    ChatUIText,
    SystemPromptEngine,
    get_basketball_training_providers,
    render_ai_chatbot,
)
from features.ai_chatbot.assistants import OpenAIAssistant, get_assistants

# TODO: Move this somewhere appropriate
from drill_library import drill_library


@st.cache_resource
def get_data_manager() -> DataManager:
    # TODO: Maybe add environment variable so in deployment can change the path
    return DataManager()


def render_player_performance():
    # 3️⃣ Player Performance Report - Wow page"""
    # Larger font for Player Performance Report (increase by ~20%)
    st.markdown(
        """
        <style>
        div[data-testid="stVerticalBlock"] > div {
            font-size: 1.2rem !important;
        }
        .report-page h3, .stMarkdown h3 { font-size: 1.9rem !important; }
        .report-page h4, .stMarkdown h4 { font-size: 1.6rem !important; }
        .report-page p, .stMarkdown p { font-size: 1.25rem !important; }
        [data-testid="stMetricValue"] { font-size: 1.75rem !important; }
        [data-testid="stMetricLabel"] { font-size: 1.15rem !important; }
        </style>
    """,
        unsafe_allow_html=True,
    )

    st.header("📋 Player Performance Report")

    # TODO: Handle this better
    SELECTED_SEASON_KEY = "selected_season_state"

    season_options = {"Season 1 Rising Stars": 1, "Season 2 Rising Stars": 2}

    col1, col2 = st.columns([1, 3])

    with col1:
        st.selectbox(
            "Select a Season",
            season_options.keys(),
            key=SELECTED_SEASON_KEY,
        )

    season_num = season_options[st.session_state[SELECTED_SEASON_KEY]]

    players = get_data_manager().get_all_players(season=season_num)

    if not players:
        st.warning("No players found for selected season.")
        return

    with col2:
        options = [p.label for p in players]
        selected = st.selectbox(
            "Select a player", options, key="performance_report_player"
        )

    idx = options.index(selected)
    player = players[idx]

    profile: PlayerProfile | None = None

    try:
        profile = get_data_manager().get_player_profile(
            player.player_no, player.team.name, season=season_num
        )
    except LookupError:
        st.error("Can't load player profile")
        return

    st.markdown(f"### {player.label}")
    st.markdown("#### Game Summary")
    st.markdown(f"**{profile.total_games} games played** — Season averages below.")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Points", f"{profile.stats.points.average:.1f}")
    with col2:
        st.metric("Assists", f"{profile.stats.assists.average:.1f}")
    with col3:
        st.metric("Turnovers", f"{profile.stats.turnovers.average:.1f}")
    with col4:
        fg = profile.stats.shooting.fg_pct
        st.metric("Shooting %", f"{fg:.1%}" if pd.notna(fg) else "N/A")

    st.markdown("---")
    st.markdown("#### Game-by-Game Box Scores")
    game_data = get_data_manager().load_player_data(season=season_num)
    player_games = game_data[
        (game_data["Player No."] == player.player_no)
        & (game_data["Team"] == player.team.name)
    ].copy()
    if not player_games.empty:
        box_df = player_games[
            [
                "Game",
                "PTS",
                "FGM",
                "FGA",
                "FG_PCT",
                "3PTM",
                "3PA",
                "3P%",
                "FTM",
                "FTA",
                "FT%",
                "REB",
                "OREB",
                "DREB",
                "AST",
                "STL",
                "BLK",
                "TOV",
                "PF",
                "Efficiency",
            ]
        ].copy()
        box_df = box_df.rename(columns={"FG_PCT": "FG%", "Efficiency": "EFF"})
        box_df["FG%"] = box_df["FG%"].apply(
            lambda x: f"{x:.1%}" if pd.notna(x) else "N/A"
        )
        box_df["3P%"] = box_df["3P%"].apply(
            lambda x: f"{x:.1%}" if pd.notna(x) else "N/A"
        )
        box_df["FT%"] = box_df["FT%"].apply(
            lambda x: f"{x:.1%}" if pd.notna(x) else "N/A"
        )
        st.dataframe(box_df, width="stretch", hide_index=True)
    else:
        st.info("No game-by-game data available.")

    st.markdown("---")
    st.markdown("#### Analysis")

    strength = profile.strengths
    weakness = profile.weaknesses

    st.markdown(
        f"**Strength:** {strength[0].description if strength else 'Versatile player'}"
    )
    st.markdown(
        f"**Area to Improve:** {weakness[0].description if weakness else 'Consistency'}"
    )

    # Suggested drills based on weaknesses (specific, like AI assistant)
    drills_shown = set()
    for w in weakness[:2]:
        drills = drill_library.get_drills_for_weakness(str(w))
        if drills:
            st.markdown(f"**Suggested drills for *{w.description}*:**")
            for drill in drills[:3]:
                if drill["name"] not in drills_shown:
                    drills_shown.add(drill["name"])
                    st.markdown(
                        f"- **{drill['name']}** ({drill['difficulty']}, {drill['duration']}) — {drill['description']}"
                    )
                    for step in drill.get("instructions", [])[:2]:
                        st.markdown(f"  - {step}")
                    st.markdown("")
    if not drills_shown:
        st.markdown(
            "**Suggested Focus:** General skill development — Form Shooting, Right Hand Dribbling, Box Out Drill"
        )

    st.markdown("---")
    st.caption("*Data → Analysis → Recommendation*")
    # st.markdown("---")
    # st.subheader("💡 AI Assistant")
    # st.caption(
    #     "Ask questions about training, performance, or game strategy for this player."
    # )
    # render_ai_chat_interface(player_profile=profile)

    PLAYER_TASK = """
    Only apply PLAYER PROFILE logic if the input is clearly related to basketball performance, training, or player evaluation. Otherwise, do not use any PLAYER PROFILE data.

    ## A - Greetings
    If input matches Rule A:
    - Extract Player Number from PLAYER PROFILE.
    - Format greeting exactly as specified in System Prompt Rule A.

    ## B - Performance & Concept Questions
    If user asks about stats, profile, strengths, weaknesses, or general basketball terms:
    - Map "I/me/my" directly to PLAYER PROFILE.
    - If the concept or data is missing from the context, trigger the exact Missing Data Response.
    - Start response exactly with: "Player #<Player Number>," followed by the extracted data.

    ## C - Training / Drills
    If user requests improvements or drills:
    - Identify weaknesses from PLAYER PROFILE.
    - Prescribe only matching drills explicitly present in DRILL OVERVIEW context.
    - Start response exactly with: "Player #<Player Number>," followed by the drill details.

    ## Constraints
    - Do not infer data or use outside knowledge.
    - If any required data, definition, or drill match is missing, trigger the system prompt's exact Missing Data Response.
    """

    providers = [
        *get_basketball_training_providers(),
        PlayerInfoProvider(profile),
        PlayerScoutingReportProvider(profile),
        PlayerStatsProvider(profile.stats),
        ShootingStatsProvider(profile.stats.shooting),
    ]

    if profile.advanced_stats:
        providers.append(AdvancedStatsProvider(profile.advanced_stats))

    player_system_prompt = SystemPromptEngine(PLAYER_TASK, providers=providers)

    render_ai_chatbot(
        chatbot_id="player_perf_report",
        system_prompt_engine=player_system_prompt,
        assistants=get_assistants(),
        chat_ui_text=ChatUIText(
            description="Ask questions about training, performance, or game strategy for this player.",
            input_placeholder="Ask a question about your profile...",
        ),
    )
