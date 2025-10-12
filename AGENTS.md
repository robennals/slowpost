# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js application routes, including API endpoints under `app/api`.
- `src/components/`, `src/contexts/`, `src/lib/`: Shared React components, context providers, and frontend utilities.
- `src/server/`: Server-side logic reused by API handlers (auth, database adapters, mailers, etc.).
- `src/shared/`: Shared TypeScript types used across client and server code.
- `tests/server/`: Vitest suites covering the server logic.
- `docs/`: Product overview and UX reference; sync UI or API changes with these notes.
- Tooling sits at the repo root (`package.json`, `yarn.lock`). Yarn is pinned to **1.22.22** via the `packageManager` field; run commands with `corepack yarn ...` or a local Yarn Classic install so the expected release is used.

## Build, Test, and Development Commands
- `yarn install`: Restore project dependencies.
- `yarn dev`: Start the Next.js development server (client UI + API routes). If a port is busy, pass `PORT=40xx yarn dev` or stop the conflicting process.
- `yarn build`: Production build; fails on lint or type errors—run before pushing.
- `yarn test`: Run the Vitest suites.
- `yarn storybook`: Start Storybook (port auto-increments). Verify key stories render after UI changes.

## Coding Style & Naming Conventions
- TypeScript + React with functional components. Prefer named exports (`export function Component`).
- ESLint uses `next/core-web-vitals`; `<img>` usage is allowed for this project, but keep accessibility attributes (`alt`, labels) intact.
- Keep import order consistent: external packages, internal modules (e.g., `@/server/*`), then styles.
- CSS Modules scope styles per component—use class selectors (e.g., `.button`) instead of global tag selectors.

## Testing Guidelines
- Run **all** of the following before submitting: `yarn test`, `yarn build`, and `yarn storybook` (ensure the UI loads) when modifying relevant areas.
- Storybook stories are the source of truth for client tests; keep them deterministic, tagged for testing (global preview applies `['test']`), and update them alongside component changes. Running the test command regenerates per-story specs under `src/__generated_tests__/` (ignored from Git).
- Server Vitest files stay in `tests/server/`; name new files `*.test.ts`.
- When a new dependency renders Markdown/MDX (e.g., docs content), add it to Vite’s `optimizeDeps.include` if tests start re-optimizing mid-run.

## Commit & Pull Request Guidelines
- Commit messages follow short imperative summaries (e.g., `Allow img usage in lint config`).
- Pull requests should describe scope, list the commands run (see Testing Guidelines), link related issues, and include UI screenshots or GIFs for visual changes.

## Additional Tips
- Storybook and Vitest share components—breakages in one usually affect the other. Fix underlying components rather than patching tests.
- API handlers live under `src/app/api/[...slug]/route.ts` and call into the logic within `src/server`. Update both sides when the contract changes.
