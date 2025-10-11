# Codebase Structure Guide

This document explains how the Slowpost monorepo is organized, what lives in each
package, and the main implementation details that matter when extending the
project. It complements `docs/overview.md`, which focuses on product behavior.

## Repository layout

```
/ (workspace root)
├─ package.json           – Yarn workspaces entry point and shared scripts
├─ packages/client/       – Next.js front-end application
├─ packages/server/       – Express API written in TypeScript
├─ packages/scripts/      – Shared maintenance utilities
└─ docs/                  – Product and engineering documentation
```

The root `package.json` wires the workspace together and exposes convenience
commands such as `yarn test`, which runs the server and client test suites in
sequence. Tooling such as `mprocs.yaml` (for concurrent dev servers) and the
root `README.md` also live here.

## Front-end (`packages/client`)

The client package is a conventional Next.js 14 application with a small design
system. Key directories:

- `pages/` defines route entry points with file-based routing. Each page uses
  hard-coded sample data until the real API is connected.
- `components/` contains reusable UI pieces that the pages compose.
- `style/` exposes the local design system (layout primitives, buttons, text
  helpers) backed by a CSS module.
- `lib/data.ts` centralizes TypeScript interfaces plus mock data used by both
  components and pages.
- `components/__tests__/` holds Storybook stories. A workspace script converts
  them into Vitest suites so component behavior is always exercised via their
  canonical stories.

### Notable pages

- `_app.tsx` renders the global `<StatusBar>` and threads `viewer` data from
  page props. Because the sample data is static, pages that want the logged-in
  state export `getStaticProps` with a fake viewer.
- `index.tsx` conditionally shows the logged-out marketing hero or the logged-in
  dashboard (`FollowerList` plus an export button). When integrating with the
  API, replace the sample data import with a fetch to `/api/home/:username`.
- Dynamic routes such as `[username].tsx` and `g/[groupKey].tsx` use Next.js's
  `useRouter` hook to read the URL segment and pipe it into the corresponding
  component while reusing the mock objects from `lib/data.ts`.
- `p/login.tsx` and `followers.tsx` simply render `LoginFlow` and
  `FollowersPanel`, respectively, keeping business logic inside components.

### Key components and subtleties

- `StatusBar.tsx` reads a simple `isLoggedIn` flag and decides which call-to-
  action to render. It relies on the design system's polymorphic `AppBar` and
  `AppBarAction` helpers so that the semantic element can change (e.g., anchor
  tags via `next/link`).
- `LoginFlow.tsx` implements the full e-mail/PIN onboarding in three steps using
  React state. Two notable edge cases:
  - `readError` attempts to parse JSON from failed responses and falls back to a
    generic message if parsing fails, ensuring the UI never breaks on non-JSON
    errors.
  - A development-only `Skip PIN` button calls `/api/login/dev-skip`; the button
    is hidden in production to avoid exposing the bypass endpoint.
  All network calls expect the server routes defined in
  `packages/server/src/server.ts`.
- `FollowerList.tsx` caches close-friend toggles in component state so users can
  adjust the checkboxes locally before the API persists it. A `useEffect` hook
  keeps the state synchronized with new props, and memoized selectors avoid
  unnecessary recomputations.
- `ProfileSummary.tsx`, `GroupMembers.tsx`, and `FollowersPanel.tsx` are mostly
  presentational but show how to use the design-system components (e.g.,
  `TileGrid` for responsive lists, `Avatar` tone variants).

### Design system (`style/index.tsx`)

The design system exposes polymorphic React components that accept an optional
`as` prop while preserving type safety. Helpers such as `HorizBox` and
`VertBox` translate declarative props (`gap`, `align`, `justify`, etc.) into CSS
classes. Because layout spacing is handled via CSS variables, consumers can pass
inline `style` overrides (e.g., `Card` sets `--card-max-width`) without losing
class-based styling. When adding new primitives, ensure the corresponding class
names exist in `style/system.module.css`.

### Testing flow

The `test` script runs `packages/scripts/generate-story-tests.mjs` before Vitest.
This script walks the client workspace, finds every `*.stories.tsx` file, and
emits a matching test in `__generated_tests__/`. Each generated suite renders the
story through Storybook's `composeStories` helper, which means interactions
defined in `Story.play` hooks execute during tests. If stories import new
libraries, update Vite's config (`vitest.config.ts`) so they resolve.

## Back-end (`packages/server`)

The server is an Express app with an in-memory datastore used for local demos
and tests. The compiled artifacts live in `dist/` after running `yarn build`.
Important files:

- `src/types.ts` defines shared interfaces for profiles, groups, follows, login
  sessions, and view models returned to the client.
- `src/datastore.ts` implements `InMemoryStore`, which seeds mock data and
  exposes methods consumed by both API routes and tests.
- `src/server.ts` wires `express` routes, input validation with `zod`, and (in
  production) Postmark e-mail delivery for login PINs.
- `src/devServer.ts` boots the Express app on a configurable port for local
  development.
- `tests/datastore.test.ts` exercises every store method to ensure the sample
  data stays coherent.

### Datastore behaviors

`InMemoryStore` clones the seed objects in its constructor so tests and runtime
code can mutate records (e.g., toggling close friends) without changing the
constants. Noteworthy methods:

- `getHomeView` filters `Follow` relationships by `status === 'accepted'` and
  hydrates the follower profiles. Missing profiles throw errors to avoid
  returning partial data.
- `setCloseFriend` mutates the `Follow` object in place and immediately re-
  derives the full home view to keep return types consistent with
  `getHomeView`.
- `getProfileView` cross-references a viewer username to decide whether to mark
  the profile as `isSelf`, whether the viewer already follows the user, and
  which private groups should be visible. The `sharedPrivateGroups` array only
  includes groups where both the target and the viewer are members.
- `requestGroupJoin` and `requestFollow` showcase placeholder flows: they return
  generated identifiers or pending follow objects but do not persist approval
  state. Integrations should eventually replace these with database-backed
  logic.
- `createLoginSession` reuses existing sessions by overwriting the PIN and
  resetting `verified`, ensuring users can request multiple codes without
  duplicating records. Pins use `crypto.randomBytes(3).toString('hex')`, which
  produces a 6-character hexadecimal code; tests assert this length.
- `forceVerifyLogin` is a development helper that mirrors the `/api/login/dev-skip`
  route. It either marks the existing session verified or creates a new verified
  session so developers can bypass the e-mail flow.

### API routes and edge cases

`src/server.ts` exports `createServer`, which returns the configured Express
instance. Highlights:

- Login routes guard against missing Postmark configuration in production by
  logging a warning during startup. In development, the service prints the PIN
  to stdout instead of sending e-mail.
- Every route validates input with `zod`; malformed bodies get a `400` with a
  user-friendly message, while missing resources respond with `404`.
- `GET /api/profile/:username` accepts an optional `viewer` query parameter so
  the client can render the correct private groups and follow state.
- `POST /api/login/dev-skip` short-circuits to a 404 in production to prevent
  misuse.

When adding new routes, export typed helpers from the datastore first—tests can
then target the pure methods before the HTTP layer.

## Shared scripts

`packages/scripts/generate-story-tests.mjs` powers the client test flow. It
recursively walks the client workspace (skipping `node_modules`, `.next`, and
other generated folders), converts Storybook stories into Vitest files, and
runs Storybook's `composeStories` to simulate each story. The generated files are
placed under `packages/client/__generated_tests__/` and removed before each run
so stale suites never linger.

## Development workflows

- Run `yarn dev` at the root to start the Next.js dev server, TypeScript watcher,
  and Express API simultaneously via `mprocs`.
- Use `yarn workspace @slowpost/client build` before deploying; the build fails
  on type or lint errors, which keeps the Storybook-driven tests honest.
- Server changes should be covered by `yarn workspace @slowpost/server test`,
  which executes the Vitest suite against `InMemoryStore`.

With these pieces in mind, you can quickly locate where functionality lives,
identify the relevant tests, and understand the mocked pathways that will later
connect to real infrastructure.
