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

## Getting Started with Developing

1. Open your preferred terminal, `cmd` or `Windows Terminal`, ensure you have git installed by running `git`
   - [install git](https://git-scm.com/install/)
2. Download using git clone, make sure to edit the last argument to your preferred folder name

```
git clone https://github.com/br0y7/GameChanger2.git your-gamechanger-folder
```

3. Install [Docker Desktop](https://docs.docker.com/desktop/)
   - [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
   > For Windows, use WSL

4. Copy the `.env.example` to `.env`

```
cp .env.example .env
```
5. For the `.env` just fill the `POSTGRES_PASSWORD` with a long and secure password

6. On the terminal in `your-gamechanger-folder` in `WSL`, run the docker compose command to start the `PostgreSQL` database and `MailCrab`

```
docker compose up

```
7. Check the `README.md` for `dashboard` and `platform` for more instructions for each app.
