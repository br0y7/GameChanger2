from utils.paths import SRC_DIR
from pathlib import Path
import streamlit as st

# 1️⃣ Homepage - Hook in 5 Seconds"""
# Larger subtitle/paragraph text for main page (50% increase)
st.markdown(
    """
    <style>
    .main p, .main .stMarkdown, .main [data-testid="stMarkdown"], .main ul, .main li { font-size: 1.5rem !important; line-height: 1.6 !important; }
    .main h2, .main .stMarkdown h2 { font-size: 2.2rem !important; }
    .main .stMetric [data-testid="stMetricValue"], .main .stMetric [data-testid="stMetricLabel"] { font-size: 1.5rem !important; }
    .main .stCaptionContainer { font-size: 1.3rem !important; }
    </style>
""",
    unsafe_allow_html=True,
)

st.markdown('<h1 class="hero-headline">GameChanger</h1>', unsafe_allow_html=True)
st.markdown(
    '<p class="hero-subtext">AI-Powered Basketball Analytics for Youth Athletes</p>',
    unsafe_allow_html=True,
)
st.markdown(
    '<p class="hero-subtext">Making performance data accessible to community leagues.</p>',
    unsafe_allow_html=True,
)
st.markdown("---")
st.subheader("🏀 What Is GameChanger?")
st.markdown(
    "GameChanger is a youth basketball analytics platform that tracks real game statistics and "
    "converts them into clear performance insights for players and coaches."
)
st.markdown(
    "By measuring points, rebounds, assists, shooting efficiency, and turnovers, GameChanger provides "
    "structured, data-driven feedback that helps athletes understand their strengths and areas for improvement."
)

st.markdown("---")
st.subheader("📊 What We Track")
st.markdown("- **Points**")
st.markdown("- **Rebounds** (Offensive & Defensive)")
st.markdown("- **Assists**")
st.markdown("- **Three-Pointers Made**")
st.markdown("- **Field Goals Made**")
st.markdown("- **Blocks**")
st.markdown("- **Turnovers**")
st.markdown("- **Personal Fouls**")
st.markdown("- **Shooting Percentages** (FT%, 3PT%, FG%)")
st.markdown(
    "*GCIR (GameChanger Impact Rating) combines scoring efficiency (PPS), stats, and negative plays to measure overall game performance.*"
)

st.markdown("---")
st.subheader("🧠 How It Works")
st.markdown("1️⃣ Game stats are recorded live")
st.markdown("2️⃣ Performance metrics are calculated")
st.markdown("3️⃣ A GCIR (GameChanger Impact Rating) is generated")
st.markdown("4️⃣ A player development report is created")
st.markdown("*GameChanger turns raw statistics into meaningful insights.*")

st.markdown("---")
st.subheader("🏆 Live at the Met Schools 3x3 Tournament")
st.markdown(
    "GameChanger is being implemented at the Met Schools 3x3 Basketball Tournament."
)
st.markdown("- Players wear numbered pinnies")
st.markdown("- Stats are tracked in real time")
st.markdown("- Performance reports are generated after games")
st.markdown("- Data is used to support youth development")

img_path = SRC_DIR / "assets/tournament.jpg"
if img_path.exists():
    st.image(img_path, width="stretch", caption="Met Schools 3x3 Tournament")
else:
    st.markdown(
        '<div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); height: 180px; '
        "border-radius: 12px; display: flex; align-items: center; justify-content: center; "
        'color: #1565c0; font-size: 1rem;">📸 Add tournament photo at assets/tournament.jpg</div>',
        unsafe_allow_html=True,
    )

st.markdown("---")
st.subheader("📈 Community Impact")
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Funding Secured", "$1500")
with col2:
    st.metric("Organizations", "2")
with col3:
    st.metric("Youth Athletes Served", "50+")
with col4:
    st.metric("Honorarium", "$1000")
st.caption("Recognized with a $1000 Honorarium from North Forge")

st.markdown("---")
st.subheader("🚀 Vision")
st.markdown(
    "The long-term goal of GameChanger is to expand youth access to performance analytics by:"
)
st.markdown("- Integrating video-based stat tracking")
st.markdown("- Expanding to additional community leagues")
st.markdown("- Building student-led analytics teams")
