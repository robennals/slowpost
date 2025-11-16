# SlowPost Documentation

Welcome to the SlowPost documentation! This guide will help you understand how the codebase works and how to contribute effectively.

## What is SlowPost?

SlowPost is a platform for annual letters - helping people send and receive yearly updates from friends and family. Think of it as a social network optimized for slow, meaningful communication rather than constant updates.

### Core Features

- **User Profiles**: Create a profile with bio, photo, and expected send month for your annual letter
- **Subscriptions**: Subscribe to friends' annual letters, see who subscribes to you
- **Groups**: Create and join groups to discover people with shared interests
- **Email Reminders**: Automated reminders when it's time to send your annual letter
- **Manual Subscriber Addition**: Add subscribers by email, even if they haven't signed up yet

## Documentation Structure

### For Newcomers: Start Here

1. **[Architecture Overview](./architecture.md)** - Start here! Learn about the tech stack, project structure, and core patterns
   - Tech stack (Next.js, TypeScript, Turso)
   - Handler pattern (how API routes work)
   - Authentication flow
   - Testing strategy

2. **[Database Schema](./database-schema.md)** - Understand the data model
   - Two-table design (documents + links)
   - Collections (users, profiles, subscriptions, etc.)
   - Pending subscriber pattern
   - Query optimization

3. **[Key User Flows](./key-flows.md)** - See how features work end-to-end
   - Signup and authentication
   - Profile management
   - Subscription flows (direct, manual, subscribe back)
   - Group management
   - Email reminders

### For Contributors

4. **[Improvement Opportunities](./improvement-opportunities.md)** - Ideas for making the codebase better
   - Code reduction through abstractions
   - Performance optimizations
   - Developer experience improvements
   - Security enhancements

## Quick Start

### Prerequisites

- Node.js 20+
- Yarn 1.x
- Turso database (or use local SQLite for development)

### Local Development

```bash
# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start development server
yarn dev

# Visit http://localhost:3000
```

### Running Tests

```bash
# Unit tests
yarn test

# End-to-end tests
yarn test:e2e

# Type checking
yarn typecheck

# All checks (recommended before committing)
yarn test && yarn test:e2e && yarn typecheck
```

## Project Philosophy

### Keep It Simple

SlowPost intentionally uses a simple architecture:
- **No ORM**: Direct database queries with type-safe adapters
- **No complex state management**: React hooks and Context API
- **No microservices**: Monolithic Next.js app
- **JSON storage**: Flexible schema without migrations

This simplicity makes the codebase easy to understand and modify.

### Business Logic in Handlers

All business logic lives in handler functions (`src/app/api/**/handler.ts`), not in API routes. This makes testing easy - handlers are pure functions that can be tested without Next.js.

### Type Safety First

TypeScript is used throughout:
- Shared types between client and server (`src/shared/index.ts`)
- Generic database operations preserve types
- Handler functions specify request/response types

### Test Everything

The codebase has comprehensive test coverage:
- **Unit tests**: Test handlers in isolation with in-memory database
- **E2E tests**: Test full user flows in real browser
- **Component tests**: Test UI components with Storybook

## Common Tasks

### Adding a New API Endpoint

1. Create handler file: `src/app/api/my-endpoint/handler.ts`

```typescript
import { Handler, success, requireUser } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const myHandler: Handler = async (req, ctx) => {
  const user = requireUser(ctx);  // If auth required
  const { db } = getHandlerDeps();

  // Your logic here
  const data = await db.getDocument('profiles', user.username);

  return success({ data });
};
```

2. Create route file: `src/app/api/my-endpoint/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { vercelHandler } from '@/server/api/vercelHandler';
import { myHandler } from './handler';

export const GET = (req: NextRequest) => vercelHandler(req, myHandler);
```

3. Add client function: `src/lib/api.ts`

```typescript
export async function myEndpoint() {
  const res = await fetch('/api/my-endpoint', { credentials: 'include' });
  return res.json();
}
```

4. Write tests: `tests/server/api/my-endpoint.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { executeHandler, createTestDeps } from '../helpers/handlerTestUtils';
import { myHandler } from '@/app/api/my-endpoint/handler';

describe('My Endpoint', () => {
  it('returns data', async () => {
    const deps = createTestDeps();
    // Setup test data...

    const result = await executeHandler(myHandler, {});

    expect(result.status).toBe(200);
    expect(result.body.data).toBeDefined();
  });
});
```

### Adding a Database Collection

1. Define type in `src/shared/index.ts`

```typescript
export interface MyEntity {
  id: string;
  name: string;
  createdAt: string;
}
```

2. Add documents or links to database:

```typescript
// For entities
await db.addDocument('my-entities', id, entity);
const entity = await db.getDocument<MyEntity>('my-entities', id);

// For relationships
await db.addLink('my-relationships', parentKey, childKey, data);
const children = await db.getChildLinks<MyEntity>('my-relationships', parentKey);
```

3. No migration needed! The JSON schema is flexible.

### Adding a New Page

1. Create page file: `src/app/my-page/page.tsx`

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { myEndpoint } from '@/lib/api';

export default function MyPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    myEndpoint().then(setData);
  }, []);

  return <div>My Page: {JSON.stringify(data)}</div>;
}
```

2. Create styles: `src/app/my-page/my-page.module.css`

```css
.container {
  padding: 2rem;
}
```

3. Add navigation link (if needed)

### Debugging Common Issues

**Session not working:**
- Check that `credentials: 'include'` is in fetch calls
- Verify session cookie is being set (check browser DevTools > Application > Cookies)
- Ensure `requireUser(ctx)` is used in handler

**Database query failing:**
- Check collection and key names (case-sensitive)
- Verify document exists before update
- Use `getHandlerDeps()` to get db instance

**TypeScript errors:**
- Run `yarn typecheck` to see all errors
- Ensure shared types are updated in `src/shared/index.ts`
- Check handler type parameters match expected input

**Tests failing:**
- Ensure each test uses fresh database: `deps = createTestDeps()` in `beforeEach`
- Check test data setup matches what handler expects
- Look for race conditions in async operations

## Architecture Patterns

### Handler Pattern

Handlers are the core of the API layer:

```typescript
// Handler receives request and context
Handler<TBody, TParams, TQuery> = (req, ctx) => Promise<HandlerResult>

// Context contains:
- body: Parsed request body
- params: URL parameters
- query: Query string parameters
- cookies: Request cookies
- user: Authenticated user (if logged in)

// Result includes:
- status: HTTP status code
- body: Response body
- headers: Optional response headers
- cookies: Optional cookie actions (set/clear)
```

### Dependency Injection

Global dependencies (db, auth, mailer) are injected via `getHandlerDeps()`:

```typescript
const { db, authService, mailer } = getHandlerDeps();
```

This allows:
- Easy mocking in tests
- Swapping implementations (in-memory DB for tests)
- Centralized configuration

### Database Abstraction

The `DbAdapter` interface provides consistent API:

- **Documents**: Key-value store for entities
  - `getDocument(collection, key)`
  - `addDocument(collection, key, data)`
  - `updateDocument(collection, key, updates)`

- **Links**: Many-to-many relationships
  - `getChildLinks(collection, parentKey)` - Get all children of parent
  - `getParentLinks(collection, childKey)` - Get all parents of child
  - `addLink(collection, parent, child, data)`
  - `deleteLink(collection, parent, child)`

Example: Get Alice's subscribers:
```typescript
const subscribers = await db.getChildLinks<Subscription>('subscriptions', 'alice');
```

Example: Get groups Bob belongs to:
```typescript
const memberships = await db.getParentLinks<Member>('members', 'bob');
```

## Code Style Guidelines

### File Organization

- One component per file
- Co-locate styles with components (CSS Modules)
- Group related handlers in same directory
- Keep shared types in `src/shared/index.ts`

### Naming Conventions

- **Components**: PascalCase (`ProfileCard.tsx`)
- **Handlers**: camelCase with Handler suffix (`getProfileHandler`)
- **Styles**: camelCase (`profileCard.module.css`)
- **Types**: PascalCase (`Profile`, `Subscription`)
- **API functions**: camelCase (`getProfile`, `subscribeToUser`)

### Error Handling

Use `ApiError` for expected errors:

```typescript
throw new ApiError(404, 'Profile not found');
throw new ApiError(403, 'Not authorized');
throw new ApiError(400, 'Invalid input');
```

Use helper functions:

```typescript
// Ensure condition or throw
ensure(user.username === username, 403, 'Not authorized');

// Require authenticated user
const user = requireUser(ctx);
```

### TypeScript

- Use `interface` for data shapes
- Use `type` for unions and complex types
- Avoid `any` - use `unknown` and type guards instead
- Make fields optional with `?` when they might not exist

## Performance Considerations

### Database Queries

- Use specialized join queries (`getSubscribersWithProfiles`) instead of N+1 queries
- Fetch in parallel when possible: `Promise.all([query1, query2])`
- Consider adding indexes for frequently queried patterns (see `improvement-opportunities.md`)

### Client-Side

- Use React's `useMemo` for expensive computations
- Lazy load large lists (pagination or infinite scroll)
- Optimize images (Next.js Image component)
- Minimize bundle size (dynamic imports for large dependencies)

### API Routes

- Keep handlers focused and fast
- Validate inputs early (fail fast)
- Use streaming for large responses (future improvement)
- Add rate limiting for public endpoints (see `improvement-opportunities.md`)

## Security Best Practices

### Authentication

- All session tokens are random UUIDs
- Session cookies are HTTP-only, secure, SameSite=lax
- PINs expire after 10 minutes
- Sessions expire after 30 days

### Authorization

- Always use `requireUser(ctx)` for protected endpoints
- Verify ownership before updates: `ensure(user.username === resourceOwner)`
- Check group admin status before member modifications
- Never trust client-provided user identifiers

### Input Validation

- Validate email format
- Restrict usernames to alphanumeric + underscore
- Sanitize group names for URL safety
- Use parameterized queries (built into DbAdapter)

### Secrets

- Never commit secrets to git
- Use environment variables for all secrets
- Different secrets for dev/staging/production
- Rotate secrets periodically

## Deployment

### Production Checklist

- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Environment variables set in Vercel
- [ ] Database migrations applied (if any)
- [ ] Email templates tested
- [ ] Error monitoring enabled

### Environment Variables

Required for production:

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
POSTMARK_SERVER_TOKEN=...
POSTMARK_FROM_EMAIL=...
BLOB_READ_WRITE_TOKEN=...
```

Optional:

```
SKIP_PIN=false  # Set to true in dev to skip email PINs
```

### Vercel Configuration

The app is configured for Vercel deployment:

- **vercel.json**: Cron jobs configuration
- **Edge runtime**: Fast global response times
- **Automatic previews**: Every PR gets a preview URL
- **Zero-downtime deploys**: Gradual rollout of new versions

## Getting Help

### Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Turso Documentation](https://docs.turso.tech/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

### Understanding the Codebase

If you're new to the codebase, follow this learning path:

1. **Read architecture.md** - Understand the overall structure
2. **Read database-schema.md** - Understand the data model
3. **Pick a simple handler** - Study `getProfileHandler` as an example
4. **Read the tests** - Tests show how handlers are used
5. **Pick a simple page** - Study `/app/[username]/page.tsx`
6. **Read key-flows.md** - Understand end-to-end features
7. **Make a small change** - Add a field, fix a bug, improve documentation

### Common Questions

**Q: Why no ORM?**
A: ORMs add complexity and can obscure what queries run. Direct database access with type-safe adapters is simpler and faster.

**Q: Why JSON storage instead of separate columns?**
A: Flexibility - we can add fields without migrations. The data is relatively small, so performance is fine.

**Q: Why not use a state management library?**
A: React hooks and Context API handle our needs. Adding Redux/MobX/etc would add complexity without clear benefits.

**Q: Why Turso instead of Postgres?**
A: Turso (libSQL) is SQLite-compatible, runs on the edge (fast globally), and has a generous free tier. For our scale, it's perfect.

**Q: How do I add a new database index?**
A: See `database-schema.md` for index examples. Add to `ensureSchema()` in `TursoAdapter`.

**Q: How do I test email sending?**
A: In tests, set `mailer: undefined` in `createTestDeps()`. In development, set `SKIP_PIN=true` to see PINs in console.

## Contributing

### Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Write tests
4. Run all checks: `yarn test && yarn test:e2e && yarn typecheck`
5. Commit with clear message
6. Push and create PR
7. Wait for CI to pass
8. Request review
9. Merge when approved

### Code Review Guidelines

When reviewing PRs:

- Check tests cover new functionality
- Verify TypeScript types are correct
- Look for security issues (auth checks, input validation)
- Check for code duplication (could it use existing abstraction?)
- Ensure error handling is appropriate
- Verify performance impact (N+1 queries, large payloads)

### Writing Good Commits

- Use present tense: "Add feature" not "Added feature"
- Be specific: "Fix subscription confirmation bug" not "Fix bug"
- Reference issues: "Fix #123: Profile photo upload failing"
- Keep commits focused: One logical change per commit

## License

MIT License - see LICENSE file for details.

---

**Happy coding!** 🚀

If you have questions or suggestions for improving this documentation, please open an issue or PR.
