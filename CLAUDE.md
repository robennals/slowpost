# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Slowpost is a social networking app for connecting meaningfully with close friends and communities. Built with Next.js 14, React, TypeScript, and Turso (libSQL) database.

## Development Commands

- `yarn install` - Install dependencies (Yarn 1.22.22 pinned via packageManager field)
- `yarn dev` - Start Next.js dev server at http://localhost:3000 (loads `.env.development.local` via `scripts/dev.js`)
- `yarn build` - Production build (fails on lint/type errors)
- `yarn test` - Run Vitest server tests
- `yarn test:e2e` - Run Playwright E2E tests (Chromium only)
- `yarn test:e2e:all` - Run Playwright tests on all browsers
- `yarn test:storybook` - Run Storybook component tests
- `yarn test:storybook:jsdom` - Run Storybook tests with jsdom
- `yarn typecheck` - TypeScript type checking
- `yarn lint` - Run ESLint
- `yarn storybook` - Launch Storybook on port 6006

## Architecture Overview

### Server-First Architecture

The codebase separates server logic from API routes:
- **`src/server/`** - Core business logic (auth, database adapters, API handlers)
- **`src/app/api/*/route.ts`** - Next.js API route files that call into server logic
- **`src/shared/`** - Shared TypeScript types used by both client and server

API routes use the `createRouteHandler` wrapper from `src/server/api/routeHandler.ts`, which handles request parsing, error handling, cookie management, and authentication.

Example pattern:
```typescript
// src/app/api/auth/request-pin/route.ts
import { createRouteHandler } from '@/server/api/routeHandler';
import { requestPinHandler } from './handler';

export const POST = createRouteHandler(requestPinHandler);
```

Handler functions are defined with typed request bodies, params, and query strings, and return responses via helper functions like `success()`.

### Database Adapter Pattern

The app uses an abstraction layer (`DbAdapter` interface in `src/server/db/types.ts`) with two main primitives:

**Documents** (key-value storage):
- `getDocument<T>(collection, key): Promise<T | null>`
- `addDocument<T>(collection, key, data): Promise<void>`
- `updateDocument<T>(collection, key, update): Promise<void>`
- `getAllDocuments<T>(collection): Promise<Array<{key, data}>>`

**Links** (relationships):
- `getChildLinks<T>(collection, parentKey): Promise<T[]>`
- `getParentLinks<T>(collection, childKey): Promise<T[]>`
- `addLink<T>(collection, parentKey, childKey, data): Promise<void>`
- `updateLink<T>(collection, parentKey, childKey, update): Promise<void>`
- `deleteLink(collection, parentKey, childKey): Promise<void>`

The current implementation (`TursoAdapter`) uses Turso/libSQL, but the abstraction makes it easy to swap databases.

### Authentication Flow

1. User enters email → `AuthService.requestPin()` generates 6-digit PIN
2. PIN sent via Postmark email (or logged to console in dev mode with `SKIP_PIN=true`)
3. User enters PIN → `AuthService.verifyPin()` validates and creates session
4. Session token stored in httpOnly cookie
5. Client checks session via `/api/auth/me` on page load

The `createRouteHandler` function supports `requireAuth: true` option to automatically verify sessions.

### Dependency Injection

Server dependencies (db, authService, mailer) are initialized lazily via `src/server/api/deps.ts`:
- `initialiseHandlerDeps()` creates singleton instances
- `getHandlerDeps()` retrieves current dependencies
- Tests can override with `initialiseHandlerDeps(mockDeps)`

## Path Aliases

TypeScript and build tools recognize these aliases:
- `@/*` → `src/*`
- `@server/*` → `src/server/*`
- `@shared/*` → `src/shared/*`

## Environment Setup

Required environment variables (set in `.env.development.local` for development):
```
TURSO_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
SKIP_PIN=true  # Development mode - allows skipping PIN verification
```

Optional variables:
```
POSTMARK_SERVER_TOKEN=your-token  # For production email sending
POSTMARK_FROM_EMAIL=no-reply@yourapp.com
```

The `yarn dev` script (via `scripts/dev.js`) loads `.env.development.local` and validates that `TURSO_URL` and `TURSO_AUTH_TOKEN` are defined before starting Next.js.

### Setting up Turso Database

```bash
turso auth signup  # or: turso auth login
turso db create slowpost-dev
turso db tokens create slowpost-dev --read-write
turso db show slowpost-dev --url
```

Add the URL and token to `.env.development.local`.

## Testing Strategy

### Server Tests (Vitest)
- Located in `tests/server/`
- Test server logic in isolation using mock dependencies
- Run with `yarn test`

### E2E Tests (Playwright)
- Located in `tests/e2e/`
- Uses temporary SQLite database per test run
- Postmark emails are stubbed and logged to JSON file
- Run with `yarn test:e2e` (Chromium) or `yarn test:e2e:all` (all browsers)

### Component Tests (Storybook)
- Stories in `src/stories/`
- Run tests with `yarn test:storybook` (browser) or `yarn test:storybook:jsdom`
- Storybook runs on port 6006 (`yarn storybook`)

## Code Style

- TypeScript with strict mode enabled
- React functional components with named exports preferred
- CSS Modules for component styles (`.module.css` files)
- ESLint config extends `next/core-web-vitals`
- Import order: external packages → internal modules (`@/*`) → styles
