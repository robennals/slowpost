# Database Schema

SlowPost uses a simple yet flexible two-table schema with JSON storage, implemented via Turso (libSQL).

## Overview

The database consists of two tables:
- **documents**: Key-value store for entity data
- **links**: Many-to-many relationships between entities

Both tables store data as JSON strings, providing schema flexibility while maintaining type safety through TypeScript interfaces.

## Tables

### documents

Stores individual entities indexed by collection and key.

```sql
CREATE TABLE documents (
  collection TEXT NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON string
  PRIMARY KEY (collection, key)
)
```

**Fields:**
- `collection`: The entity type (e.g., "profiles", "users", "groups")
- `key`: Unique identifier within the collection (e.g., username, email, group name)
- `data`: JSON-serialized entity data

**Example:**
```json
-- Collection: "profiles", Key: "alice"
{
  "username": "alice",
  "fullName": "Alice Smith",
  "bio": "Annual letter enthusiast",
  "email": "alice@example.com",
  "expectedSendMonth": "December",
  "planToSend": true
}
```

### links

Stores relationships between entities.

```sql
CREATE TABLE links (
  collection TEXT NOT NULL,
  parent_key TEXT NOT NULL,
  child_key TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON string
  PRIMARY KEY (collection, parent_key, child_key)
)
```

**Fields:**
- `collection`: The relationship type (e.g., "subscriptions", "members")
- `parent_key`: The "owner" side of the relationship
- `child_key`: The "member" side of the relationship
- `data`: JSON-serialized relationship data

**Example:**
```json
-- Collection: "subscriptions", Parent: "alice", Child: "bob"
{
  "subscriberUsername": "bob",
  "subscribedToUsername": "alice",
  "isClose": true,
  "addedBy": "bob",
  "confirmed": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Collections

### Document Collections

#### users
**Key:** Email address
**Purpose:** Maps email to user account
**Data:**
```typescript
{
  email: string;
  username: string;
  fullName: string;
}
```

#### auth
**Key:** Email address
**Purpose:** Authentication state and sessions
**Data:**
```typescript
{
  email: string;
  pin?: string;
  pinExpiresAt?: string;
  sessions?: Array<{
    token: string;
    expiresAt: string;
  }>;
  hasAccount?: boolean;  // false for pending subscribers added by email
}
```

**Special case:** When someone is added as a subscriber by email before creating an account, an auth record is created with `hasAccount: false`.

#### profiles
**Key:** Username
**Purpose:** Public user profile data
**Data:**
```typescript
{
  username: string;
  fullName: string;
  bio: string;
  photoUrl?: string;
  email?: string;
  expectedSendMonth?: string;  // e.g., "January", "December"
  lastSentDate?: string;  // ISO date when letter was marked sent
  lastReminderSentDate?: string;  // ISO date of initial reminder
  lastFollowUpSentDate?: string;  // ISO date of follow-up reminder
  planToSend?: boolean;  // Whether user plans to send letters
}
```

#### groups
**Key:** Group name (URL-safe identifier)
**Purpose:** Group metadata
**Data:**
```typescript
{
  groupName: string;
  displayName: string;
  description: string;
  adminUsername: string;
  isPublic: boolean;
}
```

### Link Collections

#### subscriptions
**Parent:** User being subscribed to
**Child:** Subscriber username (or `pending-{email}` for not-yet-registered users)
**Purpose:** Tracks who subscribes to whom
**Data:**
```typescript
{
  subscriberUsername: string;  // or "pending-{email}"
  subscribedToUsername: string;
  isClose: boolean;
  addedBy?: string;  // Who initiated (subscriber or subscribedTo)
  confirmed?: boolean;  // For email-added subscriptions
  timestamp?: string;
  pendingEmail?: string;  // For pending subscribers only
  pendingFullName?: string;  // For pending subscribers only
}
```

**Pending Subscriber Pattern:**
When a user manually adds a subscriber by email who hasn't signed up yet:
1. No profile is created (prevents username blocking)
2. Subscription uses `pending-{email}` as child_key
3. Pending data stored in subscription: `pendingEmail`, `pendingFullName`
4. When they sign up, subscription is migrated to use their chosen username

**Queries:**
- Get subscribers of Alice: `getChildLinks('subscriptions', 'alice')`
- Get who Alice subscribes to: `getParentLinks('subscriptions', 'alice')`

#### members
**Parent:** Group name
**Child:** Username
**Purpose:** Group membership
**Data:**
```typescript
{
  groupName: string;
  username: string;
  groupBio: string;  // User's bio within this group
  status: 'pending' | 'approved';
  isAdmin: boolean;
}
```

**Queries:**
- Get members of group: `getChildLinks('members', 'my-group')`
- Get groups user belongs to: `getParentLinks('members', 'alice')`

#### updates
**Parent:** Username
**Child:** Update ID (timestamp-based)
**Purpose:** Activity feed for a user
**Data:**
```typescript
{
  id: string;
  type: 'new_subscriber' | 'group_join_request' | 'group_member_approved';
  username?: string;  // Related user
  timestamp: string;
  // Additional fields based on type
}
```

**Example Update IDs:**
- `1234567890-bob-subscribed`
- `1234567891-group-request-my-group`

## Database Adapter Pattern

The `DbAdapter` interface provides a consistent API over the physical database:

```typescript
interface DbAdapter {
  // Document operations
  getDocument<T>(collection: string, key: string): Promise<T | null>;
  addDocument<T>(collection: string, key: string, data: T): Promise<void>;
  updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void>;
  getAllDocuments<T>(collection: string): Promise<Array<{ key: string; data: T }>>;

  // Link operations
  getChildLinks<T>(collection: string, parentKey: string): Promise<T[]>;
  getParentLinks<T>(collection: string, childKey: string): Promise<T[]>;
  addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void>;
  updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void>;
  deleteLink(collection: string, parentKey: string, childKey: string): Promise<void>;

  // Schema
  ensureSchema(): Promise<void>;
}
```

This abstraction allows:
- Swapping database implementations (currently TursoAdapter)
- Easy mocking for tests (InMemoryAdapter)
- Type-safe operations with TypeScript generics

## Optimized Join Queries

Some operations require joining documents with links. These are implemented as specialized methods:

### getSubscribersWithProfiles

Fetches subscriptions with subscriber profile data in a single query:

```sql
SELECT
  s.data as subscription_data,
  p.data as profile_data
FROM links s
LEFT JOIN documents p ON p.collection = 'profiles' AND p.key = s.child_key
WHERE s.collection = 'subscriptions' AND s.parent_key = ?
```

Returns: `Array<{ subscription: Subscription; profile: Profile | null }>`

**Why LEFT JOIN?**
Pending subscribers (using `pending-{email}` identifiers) don't have profiles yet. LEFT JOIN allows fetching subscriptions even when profiles don't exist.

### getSubscriptionsWithProfiles

Similar join for users you subscribe to:

```sql
SELECT
  s.data as subscription_data,
  p.data as profile_data
FROM links s
INNER JOIN documents p ON p.collection = 'profiles' AND p.key = s.parent_key
WHERE s.collection = 'subscriptions' AND s.child_key = ?
```

Returns: `Array<{ subscription: Subscription; profile: Profile }>`

### getMembersWithProfiles

Fetches group members with their profile data:

```sql
SELECT
  m.data as member_data,
  p.data as profile_data
FROM links m
INNER JOIN documents p ON p.collection = 'profiles' AND p.key = m.child_key
WHERE m.collection = 'members' AND m.parent_key = ?
```

Returns: `Array<{ member: Member; profile: Profile }>`

## Migration and Schema Evolution

### No Traditional Migrations

The JSON-based schema allows adding new fields without migrations:
- New optional fields can be added to TypeScript interfaces
- Old data continues to work (fields are optional)
- Use `field || defaultValue` or optional chaining when reading

**Example:**
```typescript
// Added planToSend field to Profile interface
interface Profile {
  // ... existing fields
  planToSend?: boolean;  // New field, optional for backwards compatibility
}

// In code, handle missing field:
const planToSend = profile.planToSend ?? true;  // Default to true
```

### Handling Legacy Data

When data shape changes significantly, use conditional logic:

```typescript
// Check if subscriber is pending (new pattern) vs old data
const isPending = subscriber.subscriberUsername.startsWith('pending-');

if (isPending) {
  // New: Use pendingEmail and pendingFullName from subscription
  email = subscription.pendingEmail;
  fullName = subscription.pendingFullName;
} else {
  // Old or current: Fetch from profile
  const profile = await getProfile(subscriber.subscriberUsername);
  email = profile.email;
  fullName = profile.fullName;
}
```

### Cleanup Old Data (Manual)

For significant schema changes, old data can be cleaned up via script:

```typescript
// Example: Migrate old subscribers to pending pattern
const subscriptions = await db.getChildLinks('subscriptions', 'alice');
for (const sub of subscriptions) {
  if (!sub.subscriberUsername.startsWith('pending-')) {
    const profile = await db.getDocument('profiles', sub.subscriberUsername);
    if (!profile) {
      // This is an old email-added subscriber with fake username
      // Migrate to pending pattern
      await db.deleteLink('subscriptions', 'alice', sub.subscriberUsername);
      await db.addLink('subscriptions', 'alice', `pending-${email}`, {
        ...sub,
        pendingEmail: email,
        pendingFullName: sub.fullName,
      });
    }
  }
}
```

## Index Considerations

The current schema uses composite primary keys:
- `(collection, key)` for documents
- `(collection, parent_key, child_key)` for links

**Additional indexes to consider (future optimization):**
- `links(collection, child_key)` for faster `getParentLinks` queries
- `documents(collection)` for faster `getAllDocuments` queries

Currently, these queries are fast enough without additional indexes due to modest data size.
