# 🏀 Gamechanger

### Streamlit Dashboard App 

The main app that provides the basketball analytics dashboard is located in the `web-app` folder.

Make sure you change directory `cd` to `web-app` then you can run: 

```sh
uv run streamlit run ./src/app.py
```

### Account Management Server

The server that contains the features about managing users, teams, and org.
- User Login / Signup
- Creating Leagues/Teams
- Organizers/Coaches sending invites to add members

It is located in the `accounts` folder. Make sure you change directory `cd` to `accounts` then you can run: 

```sh
bun --bun run dev
```