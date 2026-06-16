# 🏀 Gamechanger

### Streamlit Dashboard App

The main app that provides the basketball analytics dashboard is located in the `dashboard` folder.

Make sure you change directory `cd` to `dashboard` then you can run:

```sh
uv run streamlit run ./src/app.py
```

### Platform Server (API + Auth)

The server that contains the features about managing users, teams, and org and the API for CRUD (create, read, update, and delete) operations.

- User Login / Signup
- Creating Leagues/Teams
- Organizers/Coaches sending invites to add members
- API for CRUD for central db

It is located in the `platform` folder. Make sure you change directory `cd` to `platform` then you can run:

```sh
bun --bun run dev
```

## Getting Started

### Step 2: Download the Files

1. Open your preferred terminal, `cmd` or `Windows Terminal`, ensure you have git installed by running `git`
   - [install git](https://git-scm.com/install/)
2. Download using git clone, make sure to edit the last argument to your preferred folder name

```
git clone https://github.com/br0y7/GameChanger2.git your-gamechanger-folder
```

3. Check the `README.md` for `dashboard` and `platform` for more instructions for each.
