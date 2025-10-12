# Local Development Setup

The application always talks to a Turso database. Follow these steps to provision a dedicated development instance and run the stack locally.

## 1. Install prerequisites

- **Node.js 18+**
- **Yarn 1.22.22** (Corepack or a local install)
- **Turso CLI** – [install guide](https://docs.turso.tech/reference/turso-cli)

Log into the Turso CLI once it is installed:

```bash
turso auth signup   # or: turso auth login
```

## 2. Create a development database

Pick any name you like (the example below uses `slowpost-dev`):

```bash
turso db create slowpost-dev
```

Generate a read/write token so the API can modify data:

```bash
turso db tokens create slowpost-dev --read-write
```

Copy the generated token, then grab the connection URL:

```bash
turso db show slowpost-dev --url
```

## 3. Configure environment variables

Create `.env.development.local` in the repository root and add the credentials you just collected:

```
TURSO_URL=libsql://slowpost-dev-<hash>.turso.io
TURSO_AUTH_TOKEN=<token from the previous step>
SKIP_PIN=true
```

The `SKIP_PIN` flag keeps the login flow in development mode so you can bypass email verification while building features.

`yarn dev` loads `.env.development.local` automatically (falling back to `.env.development`, `.env.local`, or `.env`) and refuses to start if the Turso variables are missing. You can still override any value by exporting it in your shell before running the command.

## 4. Install dependencies and start Next.js

```bash
yarn install
yarn dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000). API routes reuse the same Turso-backed adapter used in production, so schema differences surface during local testing.

## 5. Optional helpers

- `yarn test` – Run Vitest suites
- `yarn storybook` – Launch the Storybook instance for component work
- `yarn build` – Ensure the production build still succeeds before committing large changes

Because the database layer no longer falls back to SQLite, remember to create isolated Turso databases per developer or branch when testing destructive changes.
