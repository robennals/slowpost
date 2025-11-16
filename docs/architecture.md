# Architecture

SlowPost is built on Next.js 14 App Router with a clean separation between client and server code.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Turso (libSQL) - SQLite-compatible edge database
- **Storage**: Vercel Blob (for profile photos)
- **Email**: Postmark
- **Testing**: Vitest (unit), Playwright (e2e), Storybook
- **Deployment**: Vercel

## Project Structure

```
slowpost/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # API route handlers
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── profiles/      # Profile management
│   │   │   ├── subscribers/   # Subscription management
│   │   │   ├── subscriptions/ # User's subscriptions
│   │   │   ├── groups/        # Group management
│   │   │   ├── updates/       # Activity feed
│   │   │   └── cron/          # Scheduled jobs
│   │   ├── [username]/        # User profile pages
│   │   ├── g/[groupName]/     # Group pages
│   │   ├── login/             # Login/signup page
│   │   ├── subscribers/       # Subscriber management page
│   │   └── ...                # Other pages
│   ├── server/                # Server-side business logic
│   │   ├── api/               # API infrastructure
│   │   │   ├── types.ts       # Handler types
│   │   │   ├── context.ts     # Dependency injection
│   │   │   └── vercelHandler.ts # Next.js adapter
│   │   ├── auth/              # Authentication service
│   │   ├── db/                # Database adapters
│   │   └── mailer/            # Email service
│   ├── shared/                # Shared types (client & server)
│   ├── lib/                   # Client-side utilities
│   ├── contexts/              # React contexts
│   └── components/            # React components (future)
├── tests/
│   ├── server/                # Unit tests
│   └── e2e/                   # End-to-end tests
├── docs/                      # Documentation (you are here)
└── scripts/                   # Build and deployment scripts
```

## Core Architectural Patterns

### 1. Handler Pattern (API Routes)

All API endpoints follow a consistent handler pattern with dependency injection.

#### Structure

```
src/app/api/[endpoint]/
├── route.ts          # Next.js route file (thin adapter)
└── handler.ts        # Business logic handler
```

#### Example

**route.ts** (Next.js adapter):
```typescript
import { NextRequest } from 'next/server';
import { vercelHandler } from '@/server/api/vercelHandler';
import { myHandler } from './handler';

export const GET = (req: NextRequest) => vercelHandler(req, myHandler);
export const POST = (req: NextRequest) => vercelHandler(req, myHandler);
```

**handler.ts** (business logic):
```typescript
import { Handler, requireUser, success } from '@/server/api/types';
import { getHandlerDeps } from '@/server/api/context';

export const myHandler: Handler = async (req, ctx) => {
  const user = requireUser(ctx);  // Ensure authenticated
  const { db } = getHandlerDeps();  // Get dependencies

  const data = await db.getDocument('profiles', user.username);
  return success(data);
};
```

#### Benefits

1. **Testable**: Handlers are pure functions - easy to unit test
2. **Type-safe**: Full TypeScript support with generics
3. **Dependency injection**: Mock db/auth/mailer in tests
4. **Consistent error handling**: ApiError, requireUser, etc.
5. **Next.js agnostic**: Business logic doesn't depend on Next.js

#### Type Parameters

```typescript
Handler<TBody, TParams, TQuery>
```

- `TBody`: Request body type
- `TParams`: URL parameters (e.g., `{ username: string }`)
- `TQuery`: Query string parameters

Example:
```typescript
export const updateProfileHandler: Handler<
  { fullName?: string; bio?: string },  // Body
  { username: string },                 // Params
  {}                                    // Query
> = async (req, ctx) => {
  const { username } = ctx.params;
  const updates = ctx.body;
  // ...
};
```

### 2. Dependency Injection

Global dependencies are managed through `HandlerDeps`:

```typescript
interface HandlerDeps {
  db: DbAdapter;
  authService: AuthService;
  mailer?: Mailer;
}
```

**Setting dependencies** (src/server/api/context.ts):
```typescript
let deps: HandlerDeps | null = null;

export function setHandlerDeps(newDeps: HandlerDeps) {
  deps = newDeps;
}

export function getHandlerDeps(): HandlerDeps {
  if (!deps) throw new Error('Handler deps not initialized');
  return deps;
}
```

**In production** (used by vercelHandler):
```typescript
setHandlerDeps({
  db: new TursoAdapter({ url, authToken }),
  authService: new AuthService(db),
  mailer: new PostmarkMailer(token),
});
```

**In tests**:
```typescript
setHandlerDeps({
  db: new InMemoryAdapter(),
  authService: new AuthService(db),
  mailer: undefined,  // Skip emails in tests
});
```

### 3. Database Adapter Pattern

The `DbAdapter` interface abstracts database operations:

```typescript
interface DbAdapter {
  // Documents (entities)
  getDocument<T>(collection: string, key: string): Promise<T | null>;
  addDocument<T>(collection: string, key: string, data: T): Promise<void>;
  updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void>;

  // Links (relationships)
  getChildLinks<T>(collection: string, parentKey: string): Promise<T[]>;
  getParentLinks<T>(collection: string, childKey: string): Promise<T[]>;
  addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void>;
  updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void>;
  deleteLink(collection: string, parentKey: string, childKey: string): Promise<void>;
}
```

**Implementations:**
- `TursoAdapter`: Production (Turso/libSQL database)
- `InMemoryAdapter`: Testing (fast, isolated)

**Benefits:**
- Switch databases without changing business logic
- Fast, isolated tests with in-memory implementation
- Type-safe operations with TypeScript generics

### 4. Authentication Flow

Authentication uses email + PIN with session tokens.

**Components:**
- `AuthService`: Core authentication logic
- `auth` collection: Stores PINs and sessions
- `users` collection: Email → username mapping
- Session cookies: HTTP-only, secure

**Flow:**
```
1. User enters email
2. Server generates PIN, stores in auth collection
3. Server emails PIN (or shows it in dev mode)
4. User enters PIN
5. Server validates PIN, creates session
6. Server sets session cookie
7. Future requests include session cookie
8. Middleware validates session, adds user to context
```

**Session structure:**
```typescript
{
  email: string;
  sessions: Array<{
    token: string;      // Random UUID
    expiresAt: string;  // ISO timestamp
  }>;
}
```

### 5. Client-Server Communication

**Client** (React components):
```typescript
// src/lib/api.ts - Client-side API functions
export async function getProfile(username: string) {
  const res = await fetch(`/api/profiles/${username}`, {
    credentials: 'include',  // Send cookies
  });
  if (!res.ok) return null;
  return res.json();
}
```

**Server** (API handlers):
```typescript
// src/app/api/profiles/[username]/handlers.ts
export const getProfileHandler: Handler<unknown, { username: string }> =
  async (req, { params }) => {
    const { db } = getHandlerDeps();
    const profile = await db.getDocument('profiles', params.username);
    return success(profile);
  };
```

**Shared types** ensure type safety:
```typescript
// src/shared/index.ts
export interface Profile {
  username: string;
  fullName: string;
  bio: string;
  // ...
}
```

### 6. State Management

SlowPost uses React hooks and Context API for state management.

**AuthContext** (src/contexts/AuthContext.tsx):
```typescript
const AuthContext = createContext<{
  user: AuthSession | null;
  loading: boolean;
  refetch: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(setUser).finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Usage in components:**
```typescript
function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Redirect to="/login" />;

  return <div>Welcome {user.fullName}</div>;
}
```

### 7. Error Handling

**Server-side:**
```typescript
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// In handlers:
throw new ApiError(404, 'Profile not found');
throw new ApiError(401, 'Not authenticated');

// Helper functions:
export function requireUser(ctx: HandlerContext): AuthSession {
  if (!ctx.user) throw new ApiError(401, 'Not authenticated');
  return ctx.user;
}

export function ensure(condition: unknown, status: number, message: string) {
  if (!condition) throw new ApiError(status, message);
}
```

**Client-side:**
```typescript
try {
  const result = await updateProfile(username, updates);
  if (result.error) {
    alert(result.error);  // Show error to user
  }
} catch (error) {
  alert('Request failed');
}
```

### 8. Scheduled Jobs (Cron)

Reminder emails are sent via Vercel Cron Jobs.

**Configuration** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/send-reminders",
    "schedule": "0 0 1 * *"  // Monthly on 1st at midnight
  }]
}
```

**Handler** (src/app/api/cron/send-reminders/handler.ts):
```typescript
export const sendRemindersHandler: Handler = async (req) => {
  const { db, mailer } = getHandlerDeps();

  // Get all users with expectedSendMonth matching current month
  const profiles = await db.getAllDocuments<Profile>('profiles');
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

  for (const { data: profile } of profiles) {
    if (profile.expectedSendMonth === currentMonth) {
      const subscribers = await db.getChildLinks('subscriptions', profile.username);
      await mailer.sendAnnualLetterReminder(
        profile.email,
        profile.fullName,
        profile.username,
        subscribers.length,
        currentMonth
      );
    }
  }

  return success({ sent: count });
};
```

### 9. File Uploads (Profile Photos)

Profile photos use Vercel Blob storage.

**Flow:**
1. Client captures image (camera or file upload)
2. Client converts to base64 data URL
3. Client sends data URL to `/api/profile-photo`
4. Server uploads to Vercel Blob
5. Server updates profile with blob URL
6. Client displays new photo

**Handler:**
```typescript
import { put } from '@vercel/blob';

export const uploadProfilePhotoHandler: Handler<{ image: string }> =
  async (req, ctx) => {
    const user = requireUser(ctx);
    const { image } = ctx.body;

    // Upload to Vercel Blob
    const blob = await put(`profile-${user.username}.jpg`,
      Buffer.from(image.split(',')[1], 'base64'),
      { access: 'public' }
    );

    // Update profile
    await db.updateDocument('profiles', user.username, {
      photoUrl: blob.url
    });

    return success({ url: blob.url });
  };
```

## Testing Strategy

### Unit Tests (Vitest)

Test handlers in isolation with in-memory database:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDeps, executeHandler } from './helpers';
import { getProfileHandler } from '@/app/api/profiles/[username]/handlers';

describe('Profile API', () => {
  let deps = createTestDeps();

  beforeEach(() => {
    deps = createTestDeps();  // Fresh database for each test
  });

  it('returns profile for valid username', async () => {
    // Setup
    await deps.db.addDocument('profiles', 'alice', {
      username: 'alice',
      fullName: 'Alice',
      bio: 'Test user',
    });

    // Execute
    const result = await executeHandler(
      getProfileHandler,
      { params: { username: 'alice' } }
    );

    // Assert
    expect(result.status).toBe(200);
    expect(result.body.fullName).toBe('Alice');
  });
});
```

### End-to-End Tests (Playwright)

Test full user flows in real browser:

```typescript
import { test, expect } from '@playwright/test';

test('user can sign up and create profile', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type=email]', 'alice@example.com');
  await page.click('button:has-text("Continue")');

  // Signup flow
  await page.fill('[placeholder="johndoe"]', 'alice');
  await page.fill('[placeholder="Full Name"]', 'Alice Smith');
  await page.click('button:has-text("Skip PIN")');

  // Should be logged in
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Alice Smith')).toBeVisible();
});
```

### Component Tests (Storybook)

Test components in isolation:

```typescript
// ProfileCard.stories.tsx
export default {
  component: ProfileCard,
  title: 'Components/ProfileCard',
};

export const Default = {
  args: {
    profile: {
      username: 'alice',
      fullName: 'Alice Smith',
      bio: 'Annual letter enthusiast',
    },
  },
};
```

## Deployment

### Vercel Deployment

SlowPost deploys to Vercel with:
- Automatic deployments from `main` branch
- Preview deployments for PRs
- Edge runtime for API routes (fast global response)
- Environment variables for secrets

**Required environment variables:**
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
POSTMARK_SERVER_TOKEN=...
POSTMARK_FROM_EMAIL=...
BLOB_READ_WRITE_TOKEN=...
```

### Build Process

```bash
# 1. Build static pages (for groups)
node scripts/build-pages.mjs

# 2. Build Next.js app
next build

# 3. Deploy to Vercel
vercel deploy --prod
```

## Development Workflow

### Local Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Run unit tests
yarn test

# Run e2e tests (starts dev server automatically)
yarn test:e2e

# Type check
yarn typecheck
```

### Environment Setup

**.env.local** (for local development):
```
TURSO_DATABASE_URL=file:local.db
SKIP_PIN=true  # Skip email PIN in development
```

### Hot Reload

Next.js App Router provides fast hot reload:
- React components reload instantly
- API handlers reload on save
- CSS modules update without refresh

## Security Considerations

### Authentication
- Session tokens are random UUIDs (crypto.randomUUID())
- Cookies are HTTP-only, secure, SameSite=lax
- PINs expire after 10 minutes
- Sessions expire after 30 days

### Authorization
- All protected endpoints use `requireUser(ctx)`
- Users can only modify their own data
- Group admins checked before member modifications

### Input Validation
- Email format validated
- Usernames restricted to alphanumeric + underscore
- Group names restricted to URL-safe characters
- SQL injection prevented by parameterized queries

### Rate Limiting
- (Not yet implemented - see improvement-opportunities.md)

### Secrets Management
- All secrets in environment variables
- Never committed to git
- Vercel securely stores production secrets
