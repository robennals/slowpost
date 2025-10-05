# `mprocs` task overview

The `yarn dev` script at the repository root launches [`mprocs`](https://github.com/pvolok/mprocs) with the configuration in `mprocs.yaml`. The supervisor starts multiple long-lived processes that cooperate to run the Slowpost development stack. The sections below explain what each task does and how they work together.

## Client
- **Command:** `yarn dev` (run from `packages/client`).
- **What it does:** boots the Next.js development server for the Slowpost web client, with hot module replacement and lint/type checking handled by Next.
- **How it integrates:** the client proxies API traffic to the Express server started by the `server-run` task. It reads environment variables from `.env.local` or the shell to determine API endpoints.

## Data type watcher (`data-types`)
- **Command:** `yarn tsc --watch --preserveWatchOutput` (run from `packages/data`).
- **What it does:** continuously compiles the shared data models and store implementation to `packages/data/dist`. The generated declaration files provide type information for the server and Mongo packages.
- **How it integrates:** updates from this watcher are consumed by the `server-types` and `mongo-types` watchers through TypeScript path mapping. Because TypeScript now resolves `@slowpost/data` directly to the source files, the watcher immediately reflects cross-package changes without waiting for a manual build.

## Mongo type watcher (`mongo-types`)
- **Command:** `yarn tsc --watch --preserveWatchOutput` (run from `packages/mongo`).
- **What it does:** compiles the MongoDB integration layer, emitting JavaScript and declarations to `packages/mongo/dist`.
- **How it integrates:**
  - Waits for the shared data and server sources via the TypeScript path mappings defined in `packages/mongo/tsconfig.json`.
  - Produces `dist/src/devMemory.js` and `dist/src/runServer.js`, which are required by the `mongo-memory` and `server-run` tasks. Those tasks block until the compiled files exist, so they start automatically after the first successful emit.

## Server type watcher (`server-types`)
- **Command:** `yarn tsc --watch --preserveWatchOutput` (run from `packages/server`).
- **What it does:** watches and compiles the Express API server into `packages/server/dist`.
- **How it integrates:** exposes the `createServer` factory and type declarations that `packages/mongo` consumes. Like the Mongo watcher, it relies on TypeScript path mappings to pull from the shared data source directly.

## In-memory MongoDB (`mongo-memory`)
- **Command:** `node dist/src/devMemory.js` (run from `packages/mongo`, after waiting for the compiled file).
- **What it does:** starts `mongodb-memory-server` on `mongodb://127.0.0.1:37017` (or a custom port from `MONGODB_MEMORY_PORT`). The database is seeded with the standard dataset defined in `@slowpost/data` so that development logins and groups are immediately available.
- **How it integrates:**
  - The task blocks until `mongo-types` produces `dist/src/devMemory.js`.
  - The `server-run` task connects to the URI the in-memory server exposes. Shared defaults ensure both processes use the same database name and port unless overridden via environment variables.

## API server (`server-run`)
- **Command:** `node --watch dist/src/runServer.js` (run from `packages/mongo`, after waiting for the compiled file) with `MONGODB_URI=mongodb://127.0.0.1:37017` and `MONGODB_DB=slowpost-dev`.
- **What it does:** launches the Slowpost Express API using the Mongo-backed store. `node --watch` reloads the compiled file whenever the TypeScript watcher re-emits.
- **How it integrates:**
  - Waits for `mongo-types` to emit `dist/src/runServer.js`.
  - Reads the Mongo connection string from the same environment variables populated by the `mongo-memory` task, so it automatically connects to the in-memory instance.
  - Provides the API consumed by the client development server.

## Process coordination summary
- TypeScript watchers (`data-types`, `server-types`, `mongo-types`) run continuously so that source edits trigger recompilation across packages.
- Runtime tasks (`mongo-memory`, `server-run`, `client`) wait for the compiled output they need before starting, ensuring there are no race conditions.
- Shared environment defaults (`MONGODB_URI`, `MONGODB_DB`, and `MONGODB_MEMORY_*`) allow the API and database layers to find each other without additional configuration.

With these tasks running, `yarn dev` delivers a fully functional Slowpost stack: a seeded MongoDB instance, the Express API, and the Next.js client—all updating live as you edit the source.
