# Repository Guidelines

## Project Structure & Module Organization
- `packages/client/`: Next.js app with UI components, Storybook stories, and Vitest suites.
- `packages/server/`: Express API in TypeScript; build output lands in `packages/server/dist/`.
- `docs/`: Product overview and design notes; consult when adjusting features or flows.
- Shared tooling lives at repo root (`package.json`, `mprocs.yaml`, `yarn.lock`). Use Yarn workspaces; run commands from the root unless otherwise noted.

## Build, Test, and Development Commands
- `yarn install`: Restore workspace dependencies.
- `yarn dev`: Launches `mprocs` with Next.js dev server, TypeScript watch, and hot-reloading API runner.
- `yarn workspace @slowpost/client build`: Production build for the client (runs Next build).
- `yarn test`: Executes server and client Vitest suites.
- `yarn workspace @slowpost/client storybook`: Runs Storybook at `http://localhost:6006` (port auto-increments if busy).

## Coding Style & Naming Conventions
- TypeScript and React across packages; prefer named exports for components (`export function Component`).
- Follow existing lint rules (Next ESLint config). Import order mirrors current files: library imports, internal modules, then styles.
- CSS Modules scope styles to components; use class selectors (e.g., `.button`) rather than global element selectors.

## Testing Guidelines
- Client: Vitest with `@testing-library/react`; tests live under `packages/client/__tests__/` and reuse Storybook stories.
- Server: Vitest suites in `packages/server/tests/`.
- Name files with `.test.ts` / `.test.tsx`. Run `yarn test` locally before pushing; add targeted tests for new logic.

## Commit & Pull Request Guidelines
- Commit messages use short, descriptive imperatives (e.g., "Replace img with next/image").
- For PRs: describe scope, note testing performed (`yarn test`, `yarn build`), link any tracked issues, and attach UI screenshots when changing client visuals.

## Additional Tips
- External images require whitelisting in `packages/client/next.config.mjs` (`images.remotePatterns`).
- The API dev entry point is `packages/server/src/devServer.ts`; update both server code and the watcher workflow if the startup contract changes.
