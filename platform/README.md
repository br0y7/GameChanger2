
## Platform Server (API + Auth)

This server will be for providing the sign-up, login pages, and  API endpoints for managing teams, leagues, and other data.

## Installation
> Make sure your terminal is in the `platform` directory

1. Install [bun](https://bun.com/docs/installation), this is for MacOS & Linux:
    ```sh
    curl -fsSL https://bun.com/install | bash
    ```
2. Make the `db-storage` directory
    ```sh
    mkdir db-storage
    ```
3. Copy the `.env.example` to `.env`
    ```sh
    cp .env.example .env
    ```
4. Open `.env` for we can fill in the values
    1. set `ORIGIN=http://localhost:5173`
    2. for `BETTER_AUTH_SECRET=` value you can either:
        - `openssl rand -base64 32`
        - [Go here](https://better-auth.com/docs/installation#set-environment-variables) and click `Generate Secret`
5. Install the dependencies
    ```sh
    bun install
    ```
6. Initialize the database
    ```sh
    bun run db:migrate
    ```
7. Now you can run the dev server
    ```sh
    bun --bun run dev
    ```

## Developing

To run the local dev server: 

```sh
bun --bun run dev
```
Using `BetterAuth` as the auth framework, 
[BetterAuth Docs](https://better-auth.com/docs/introduction)

### Database Dev

The local dev database is located in `db-storage` folder. You can use the `SQLite` extension to peek at the db.

If you make any changes in `src/lib/server/auth.ts` (basically changing `BetterAuth` config):

1. Generate the BetterAuth schema:
    ```sh
    bun run auth:schema
    ```

2. Compare the generated `auth-schema.ts` to the one in `src/lib/server/db/auth-schema.ts`
    > for relations check `...db/auth-relations.ts`, it will show errors since the generated one is `v1` and the installed drizzle@beta uses `v2`, [[Check the docs for v1 vs v2](https://orm.drizzle.team/docs/relations-v1-v2)]

3. Add the new changes to the `src/lib/server/db/auth-schema.ts` and update `...db/auth-relations.ts` as well for any changes.

4. Run this to generate the migration files
    ```sh
    bun run db:generate
    ```
    
5. Run the actual migration
    ```sh
    bun run db:migrate
    ```

## Building

To create a production version of the app:

```sh
bun --bun run build
```

You can preview the production build with `bun --bun run preview`.

