# Repository Guidelines

## Project Structure & Module Organization
- `packages/client/`: Next.js app with React components, Storybook stories, and Vitest suites.
- `packages/server/`: Express API in TypeScript; compiled output lives in `packages/server/dist/`.
- `docs/`: Product overview and UX reference; sync UI or API changes with these notes.
- Tooling sits at the repo root (`package.json`, `mprocs.yaml`, `yarn.lock`). Use Yarn workspaces; run shared commands from the root unless noted. Yarn is pinned to **4.1.1** via `.yarn/releases/yarn-4.1.1.cjs`; always invoke Yarn through `corepack yarn ...` so the pinned Berry release is used. Avoid installing or running Yarn Classic (`1.x`) since it rewrites the workspace `yarn.lock`.

## Build, Test, and Development Commands
- `yarn install`: Restore workspace dependencies.
- `yarn dev`: Launches `mprocs` (Next dev server, `tsc --watch`, API watcher). If a port is busy, pass `env PORT=40xx` when starting or stop the conflicting process.
- `yarn workspace @slowpost/client build`: Production build; fails on lint or type errors—run before pushing.
- `yarn workspace @slowpost/client test`: Regenerates per-story Vitest specs and runs them in JSDOM.
- `yarn workspace @slowpost/server test`: Tests the Express API datastore logic.
- `yarn workspace @slowpost/client storybook`: Start Storybook (port auto-increments). Verify key stories render after UI changes.

## Coding Style & Naming Conventions
- TypeScript + React with functional components. Prefer named exports (`export function Component`).
- ESLint uses `next/core-web-vitals`; `<img>` usage is allowed for this project, but keep accessibility attributes (`alt`, labels) intact.
- Keep import order consistent: external packages, workspace modules, then styles.
- CSS Modules scope styles per component—use class selectors (e.g., `.button`) instead of global tag selectors.

## Testing Guidelines
- Run **all** of the following before submitting: `yarn workspace @slowpost/client test`, `yarn workspace @slowpost/client build`, `yarn workspace @slowpost/client storybook` (ensure the UI loads), and `yarn workspace @slowpost/server test` for API changes.
- Storybook stories are the source of truth for client tests; keep them deterministic, tagged for testing (global preview applies `['test']`), and update them alongside component changes. Running the test command regenerates per-story specs under `packages/client/__generated_tests__/` (ignored from Git).
- Server Vitest files stay in `packages/server/tests/`; name new files `*.test.ts`.
- When a new dependency renders Markdown/MDX (e.g., docs content), add it to Vite’s `optimizeDeps.include` if tests start re-optimizing mid-run.

## Commit & Pull Request Guidelines
- Commit messages follow short imperative summaries (e.g., `Allow img usage in lint config`).
- Pull requests should describe scope, list the commands run (see Testing Guidelines), link related issues, and include UI screenshots or GIFs for visual changes.

## Additional Tips
- Storybook and Vitest share components—breakages in one usually affect the other. Fix underlying components rather than patching tests.
- API dev entry point is `packages/server/src/devServer.ts`; update `mprocs.yaml` if the startup flow changes.
