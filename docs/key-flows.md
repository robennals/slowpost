# Key User Flows

This document describes the major user flows in SlowPost with implementation details.

## Table of Contents

1. [Signup and Authentication](#signup-and-authentication)
2. [Profile Management](#profile-management)
3. [Subscription Flows](#subscription-flows)
4. [Group Management](#group-management)
5. [Email Reminders](#email-reminders)

---

## Signup and Authentication

### New User Signup

**User Journey:**
1. User visits `/login`
2. Enters email address
3. Receives PIN (via email or shown in dev mode)
4. Enters PIN
5. Creates username and full name
6. Redirected to home page, logged in

**Implementation:**

**Step 1-2: Request PIN** (`POST /api/auth/request-pin`)
```typescript
// Client (src/app/login/page.tsx)
await requestPin(email);

// Server (src/app/api/auth/request-pin/handler.ts)
export const requestPinHandler: Handler<{ email: string }> = async (req, ctx) => {
  const { email } = ctx.body;
  const { authService } = getHandlerDeps();

  // Generate PIN
  const pin = authService.generatePin();
  await authService.storePinForEmail(email, pin);

  // Check if user exists
  const existingUser = await authService.getUserByEmail(email);

  if (!existingUser) {
    // New user - needs signup
    return success({ requiresSignup: true, pin: skipPin ? pin : undefined });
  } else {
    // Existing user - can login with PIN
    return success({ requiresSignup: false, pin: skipPin ? pin : undefined });
  }
};
```

**Step 3-4: Verify PIN and Signup** (`POST /api/auth/signup`)
```typescript
// Client
await signup(email, username, fullName, pin);

// Server (src/app/api/auth/signup/handler.ts)
export const signupHandler: Handler<SignupRequest> = async (req, ctx) => {
  const { email, username, fullName, pin, planToSend } = ctx.body;
  const { authService } = getHandlerDeps();

  // Verify PIN
  await authService.verifyPin(email, pin);

  // Create user account
  const user = await authService.createUser(email, username, fullName, planToSend);

  // Create session
  const session = await authService.createSession(email);

  return success(
    { success: true, session },
    { cookies: [{ type: 'set', name: 'session', value: session.token }] }
  );
};
```

**Step 5: Session Cookie Set**
- `vercelHandler` sets the session cookie
- Browser includes cookie in future requests
- Middleware validates session and adds user to context

### Returning User Login

**User Journey:**
1. User visits `/login`
2. Enters email
3. Receives PIN
4. Enters PIN
5. Logged in, redirected home

**Implementation:**

Similar to signup, but uses `POST /api/auth/login` instead:

```typescript
export const loginHandler: Handler<LoginRequest> = async (req, ctx) => {
  const { email, pin } = ctx.body;
  const { authService } = getHandlerDeps();

  // Verify PIN
  await authService.verifyPin(email, pin);

  // Get existing user
  const user = await authService.getUserByEmail(email);
  if (!user) throw new ApiError(404, 'User not found');

  // Create new session
  const session = await authService.createSession(email);

  return success(
    { success: true, session },
    { cookies: [{ type: 'set', name: 'session', value: session.token }] }
  );
};
```

### Session Management

**AuthContext** keeps session state synchronized:

```typescript
// src/contexts/AuthContext.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current session on mount
    getCurrentUser().then(setUser).finally(() => setLoading(false));
  }, []);

  // Components use this to check auth state
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
```

**Protected Pages:**
```typescript
function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Protected content</div>;
}
```

---

## Profile Management

### Viewing Profiles

**User Journey:**
1. User navigates to `/{username}`
2. See profile with bio, photo, subscription status
3. If own profile, see edit controls

**Implementation:**

**Client** (`src/app/[username]/page.tsx`):
```typescript
export default function ProfilePage({ params }: { params: { username: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getProfile(params.username).then(setProfile);
  }, [params.username]);

  const isOwnProfile = user?.username === params.username;

  return (
    <div>
      <h1>{profile.fullName}</h1>
      <p>{profile.bio}</p>
      {isOwnProfile && <EditProfileButton />}
    </div>
  );
}
```

**Server** (`GET /api/profiles/{username}`):
```typescript
export const getProfileHandler: Handler<unknown, { username: string }> =
  async (req, { params }) => {
    const { db } = getHandlerDeps();
    const profile = await db.getDocument<Profile>('profiles', params.username);
    if (!profile) throw new ApiError(404, 'Profile not found');
    return success(profile);
  };
```

### Editing Profile

**User Journey:**
1. User clicks "Edit Profile" on own profile
2. Inline editor appears
3. User edits bio, expected send month, plan to send
4. Clicks save
5. Profile updates

**Implementation:**

```typescript
// Client
const handleSave = async () => {
  const result = await updateProfile(username, { bio, expectedSendMonth, planToSend });
  if (result.error) {
    alert(result.error);
  } else {
    setProfile(result.profile);
  }
};

// Server (PUT /api/profiles/{username})
export const updateProfileHandler: Handler<
  { fullName?: string; bio?: string; expectedSendMonth?: string; planToSend?: boolean },
  { username: string }
> = async (req, ctx) => {
  const user = requireUser(ctx);
  const { username } = ctx.params;

  // Users can only edit their own profile
  ensure(user.username === username, 403, 'Cannot edit other users');

  const { db } = getHandlerDeps();
  await db.updateDocument('profiles', username, ctx.body);

  const updated = await db.getDocument<Profile>('profiles', username);
  return success({ success: true, profile: updated });
};
```

### Uploading Profile Photo

**User Journey:**
1. User clicks camera icon
2. Takes photo or selects file
3. Photo uploads
4. Profile shows new photo

**Implementation:**

```typescript
// Client
const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Convert to base64
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result as string;
    const result = await uploadProfilePhoto(base64);
    setPhotoUrl(result.url);
  };
  reader.readAsDataURL(file);
};

// Server (POST /api/profile-photo)
export const uploadProfilePhotoHandler: Handler<{ image: string }> =
  async (req, ctx) => {
    const user = requireUser(ctx);
    const { image } = ctx.body;

    // Upload to Vercel Blob
    const { url } = await put(
      `profile-${user.username}.jpg`,
      Buffer.from(image.split(',')[1], 'base64'),
      { access: 'public' }
    );

    // Update profile
    await db.updateDocument('profiles', user.username, { photoUrl: url });

    return success({ url });
  };
```

---

## Subscription Flows

### Direct Subscription

**User Journey:**
1. User visits someone's profile
2. Clicks "Subscribe to Annual Letter"
3. Button changes to "Subscribed"
4. User appears in subscriptions list

**Implementation:**

```typescript
// Client
const handleSubscribe = async () => {
  const result = await subscribeToUser(profileUsername);
  if (result.success) {
    setSubscribed(true);
  }
};

// Server (POST /api/subscribers/{username})
export const subscribeHandler: Handler<unknown, { username: string }> =
  async (req, ctx) => {
    const user = requireUser(ctx);
    const { username } = ctx.params;
    const { db, mailer } = getHandlerDeps();

    // Can't subscribe to self
    ensure(username !== user.username, 400, 'Cannot subscribe to yourself');

    // Check not already subscribed
    const existing = await db.getChildLinks('subscriptions', username);
    ensure(
      !existing.some((s: any) => s.subscriberUsername === user.username),
      400,
      'Already subscribed'
    );

    // Create subscription
    const subscription = {
      subscriberUsername: user.username,
      subscribedToUsername: username,
      isClose: false,
      addedBy: user.username,
      confirmed: true,
      timestamp: new Date().toISOString(),
    };
    await db.addLink('subscriptions', username, user.username, subscription);

    // Create update for the subscribed-to user
    const updateId = `${Date.now()}-${user.username}-subscribed`;
    await db.addLink('updates', username, updateId, {
      id: updateId,
      type: 'new_subscriber',
      username: user.username,
      timestamp: new Date().toISOString(),
    });

    // Send email notification
    if (mailer) {
      const subscribedToProfile = await db.getDocument('profiles', username);
      if (subscribedToProfile?.email) {
        await mailer.sendNewSubscriberNotification(
          subscribedToProfile.email,
          user.username,
          user.fullName
        );
      }
    }

    return success({ success: true, subscription });
  };
```

### Manual Subscription (by Email)

**User Journey:**
1. User goes to `/subscribers`
2. Enters email and name of person to add
3. Person shows up as pending subscriber
4. When they sign up with that email, they're prompted to confirm
5. If confirmed, subscription is established

**Implementation:**

**Step 1-2: Add by Email** (`POST /api/subscribers/{username}/add-by-email`)
```typescript
export const addSubscriberByEmailHandler: Handler<
  { email: string; fullName?: string },
  { username: string }
> = async (req, ctx) => {
  const user = requireUser(ctx);
  const { username } = ctx.params;
  const { email, fullName } = ctx.body;
  const { db } = getHandlerDeps();

  ensure(user.username === username, 403, 'Can only add subscribers to yourself');

  // Check if user exists
  const authData = await db.getDocument<any>('auth', email);

  let subscriberUsername: string;

  if (authData?.username) {
    // User exists - use their username
    subscriberUsername = authData.username;
  } else {
    // User doesn't exist yet - use pending identifier
    ensure(fullName, 400, 'Full name is required for new users');

    subscriberUsername = `pending-${email}`;

    // Create auth record to track pending subscriber
    await db.addDocument('auth', email, { email, hasAccount: false });
  }

  // Create subscription
  const subscription = {
    subscriberUsername,
    subscribedToUsername: username,
    isClose: false,
    addedBy: username,
    confirmed: authData?.username ? true : false,  // Auto-confirm if user exists
    timestamp: new Date().toISOString(),
    // For pending subscribers, store data in subscription
    pendingEmail: authData?.username ? undefined : email,
    pendingFullName: authData?.username ? undefined : fullName,
  };

  await db.addLink('subscriptions', username, subscriberUsername, subscription);

  return success({ success: true, subscriberUsername });
};
```

**Step 3-4: Signup with Pending Subscription**

When user signs up, `createUser` in AuthService migrates pending subscriptions:

```typescript
async createUser(email: string, username: string, fullName: string, planToSend?: boolean) {
  const pendingIdentifier = `pending-${email}`;

  // Check for pending subscriptions
  const existingAuth = await this.db.getDocument<any>('auth', email);
  if (existingAuth && !existingAuth.hasAccount) {
    // Migrate pending subscriptions to real username
    const subscriptions = await this.db.getParentLinks('subscriptions', pendingIdentifier);

    for (const subscription of subscriptions) {
      const subscribedToUsername = subscription.subscribedToUsername;

      // Delete old pending link
      await this.db.deleteLink('subscriptions', subscribedToUsername, pendingIdentifier);

      // Create new link with real username
      await this.db.addLink('subscriptions', subscribedToUsername, username, {
        ...subscription,
        subscriberUsername: username,
        pendingEmail: undefined,
        pendingFullName: undefined,
      });
    }
  }

  // Create user and profile...
}
```

**Step 5: Confirmation Prompt**

When pending subscriber visits the profile they were added to:

```typescript
// Check subscription status
const [subscription] = await db.getChildLinks('subscriptions', profileUsername)
  .filter(s => s.subscriberUsername === user.username);

const needsConfirmation = subscription && !subscription.confirmed;

if (needsConfirmation) {
  return (
    <div>
      <p>{profileOwner.fullName} added you as a subscriber</p>
      <button onClick={handleConfirm}>Confirm Subscription</button>
      <button onClick={handleDecline}>Cancel</button>
    </div>
  );
}

// POST /api/subscribers/{username}/{subscriberUsername}/confirm
const handleConfirm = async () => {
  await confirmSubscription(profileUsername, user.username);
  setSubscription({ ...subscription, confirmed: true });
};

// DELETE /api/subscribers/{username}/{subscriberUsername}
const handleDecline = async () => {
  await unsubscribeFromUser(profileUsername, user.username);
  setSubscription(null);
};
```

### Subscribe Back

**User Journey:**
1. User goes to `/subscribers`
2. Sees list of subscribers
3. Clicks "Subscribe Back" for someone they don't subscribe to
4. Button disappears, now subscribed

**Implementation:**

```typescript
// Fetch both subscribers and subscriptions in parallel
const [subscribersData, subscriptionsData] = await Promise.all([
  getSubscribers(user.username),
  getSubscriptions(user.username)
]);

// Extract usernames of people user subscribes to
const subscribedToUsernames = subscriptionsData.map(s => s.subscribedToUsername);

// Show "Subscribe Back" button if:
// - Subscriber has an account (not pending)
// - User doesn't already subscribe to them
const showSubscribeBack =
  subscriber.hasAccount &&
  !subscribedToUsernames.includes(subscriber.subscriberUsername);

const handleSubscribeBack = async (subscriberUsername: string) => {
  const result = await subscribeToUser(subscriberUsername);
  if (result.success) {
    setSubscriptions([...subscriptions, subscriberUsername]);
  }
};
```

### Unsubscribe

**User Journey:**
1. User visits profile they subscribe to
2. Clicks "Unsubscribe" button
3. Confirms in dialog
4. Subscription removed

**Implementation:**

```typescript
// Client
const handleUnsubscribe = async () => {
  if (!confirm('Are you sure you want to unsubscribe?')) return;

  const result = await unsubscribeFromUser(profileUsername, user.username);
  if (result.success) {
    setSubscribed(false);
  }
};

// Server (DELETE /api/subscribers/{username}/{subscriberUsername})
export const unsubscribeHandler: Handler<unknown, { username: string; subscriberUsername: string }> =
  async (req, ctx) => {
    const user = requireUser(ctx);
    const { username, subscriberUsername } = ctx.params;
    const { db } = getHandlerDeps();

    // User can unsubscribe themselves, or owner can remove subscriber
    const canDelete =
      user.username === subscriberUsername ||  // Unsubscribing self
      user.username === username;              // Owner removing subscriber

    ensure(canDelete, 403, 'Cannot remove this subscription');

    await db.deleteLink('subscriptions', username, subscriberUsername);

    return success({ success: true });
  };
```

---

## Group Management

### Creating a Group

**User Journey:**
1. User goes to `/groups`
2. Clicks "Create Group"
3. Fills in name, display name, description
4. Chooses public/private
5. Group created, user is admin

**Implementation:**

```typescript
// Client
const handleCreate = async () => {
  const result = await createGroup(groupName, displayName, description, isPublic);
  if (result.success) {
    router.push(`/g/${groupName}`);
  }
};

// Server (POST /api/groups)
export const createGroupHandler: Handler<{
  groupName: string;
  displayName: string;
  description: string;
  isPublic: boolean;
}> = async (req, ctx) => {
  const user = requireUser(ctx);
  const { groupName, displayName, description, isPublic } = ctx.body;
  const { db } = getHandlerDeps();

  // Validate group name (URL-safe)
  ensure(/^[a-z0-9-]+$/.test(groupName), 400, 'Invalid group name');

  // Check group doesn't exist
  const existing = await db.getDocument('groups', groupName);
  ensure(!existing, 409, 'Group already exists');

  // Create group
  const group: Group = {
    groupName,
    displayName,
    description,
    adminUsername: user.username,
    isPublic,
  };
  await db.addDocument('groups', groupName, group);

  // Add creator as admin member
  const member: Member = {
    groupName,
    username: user.username,
    groupBio: '',
    status: 'approved',
    isAdmin: true,
  };
  await db.addLink('members', groupName, user.username, member);

  return success({ success: true, group });
};
```

### Joining a Group

**User Journey:**
1. User visits `/g/{groupName}`
2. Sees group description and members
3. Clicks "Join Group"
4. Enters group bio
5. If public group: immediately joined
6. If private group: request pending, admin notified

**Implementation:**

```typescript
// Server (POST /api/groups/{groupName}/join)
export const joinGroupHandler: Handler<
  { groupBio: string },
  { groupName: string }
> = async (req, ctx) => {
  const user = requireUser(ctx);
  const { groupName } = ctx.params;
  const { groupBio } = ctx.body;
  const { db, mailer } = getHandlerDeps();

  const group = await db.getDocument<Group>('groups', groupName);
  ensure(group, 404, 'Group not found');

  // Check not already a member
  const existing = await db.getChildLinks('members', groupName);
  ensure(
    !existing.some((m: any) => m.username === user.username),
    400,
    'Already a member'
  );

  // Create membership
  const member: Member = {
    groupName,
    username: user.username,
    groupBio,
    status: group.isPublic ? 'approved' : 'pending',
    isAdmin: false,
  };
  await db.addLink('members', groupName, user.username, member);

  // If private group, notify admin
  if (!group.isPublic && mailer) {
    const adminProfile = await db.getDocument<Profile>('profiles', group.adminUsername);
    if (adminProfile?.email) {
      await mailer.sendGroupJoinRequestNotification(
        adminProfile.email,
        user.username,
        user.fullName,
        groupName,
        group.displayName
      );
    }
  }

  return success({ success: true, member });
};
```

### Approving Members (Private Groups)

**User Journey:**
1. Admin receives email notification of join request
2. Admin visits group page
3. Sees pending members
4. Clicks "Approve"
5. Member status changes to approved

**Implementation:**

```typescript
// Server (PUT /api/groups/{groupName}/members/{username})
export const updateGroupMemberHandler: Handler<
  { status?: 'pending' | 'approved'; isAdmin?: boolean; groupBio?: string },
  { groupName: string; username: string }
> = async (req, ctx) => {
  const user = requireUser(ctx);
  const { groupName, username } = ctx.params;
  const { status, isAdmin, groupBio } = ctx.body;
  const { db } = getHandlerDeps();

  const group = await db.getDocument<Group>('groups', groupName);
  ensure(group, 404, 'Group not found');

  // Check permissions
  const members = await db.getChildLinks<Member>('members', groupName);
  const requestingMember = members.find(m => m.username === user.username);

  if (status || isAdmin !== undefined) {
    // Only admins can change status or admin flag
    ensure(requestingMember?.isAdmin, 403, 'Only admins can modify members');
  } else {
    // User can update their own group bio
    ensure(user.username === username, 403, 'Can only edit your own bio');
  }

  // Update member
  await db.updateLink('members', groupName, username, { status, isAdmin, groupBio });

  return success({ success: true });
};
```

---

## Email Reminders

### Reminder System

**Purpose:** Send monthly reminders to users who plan to send annual letters.

**Schedule:** 1st of each month at midnight (Vercel Cron)

**Flow:**
1. Cron triggers `/api/cron/send-reminders`
2. Handler fetches all profiles
3. For each profile where `expectedSendMonth` matches current month:
   - Count subscribers
   - Check if reminder already sent this year
   - Send initial reminder or follow-up (3 months later)
4. Update profile with reminder timestamp

**Implementation:**

```typescript
export const sendRemindersHandler: Handler = async (req) => {
  const { db, mailer } = getHandlerDeps();

  if (!mailer) {
    return success({ message: 'Mailer not configured' });
  }

  const profiles = await db.getAllDocuments<Profile>('profiles');
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const currentYear = new Date().getFullYear();

  let initialRemindersSent = 0;
  let followUpsSent = 0;

  for (const { key: username, data: profile } of profiles) {
    // Skip if user doesn't plan to send or no email
    if (!profile.planToSend || !profile.email) continue;

    // Check if this is their expected month
    if (profile.expectedSendMonth !== currentMonth) continue;

    // Get subscriber count
    const subscribers = await db.getChildLinks('subscriptions', username);
    if (subscribers.length === 0) continue;  // No subscribers to remind about

    const lastReminderDate = profile.lastReminderSentDate
      ? new Date(profile.lastReminderSentDate)
      : null;

    const lastFollowUpDate = profile.lastFollowUpSentDate
      ? new Date(profile.lastFollowUpSentDate)
      : null;

    // Check if we already sent a reminder this year
    if (lastReminderDate && lastReminderDate.getFullYear() === currentYear) {
      // Already sent initial reminder this year

      // Check if we should send follow-up (3 months later)
      const monthsSinceReminder =
        (new Date().getTime() - lastReminderDate.getTime()) /
        (1000 * 60 * 60 * 24 * 30);

      if (monthsSinceReminder >= 3 && (!lastFollowUpDate || lastFollowUpDate.getFullYear() < currentYear)) {
        // Send follow-up
        await mailer.sendAnnualLetterFollowUp(
          profile.email,
          profile.fullName,
          username,
          subscribers.length,
          profile.expectedSendMonth
        );

        await db.updateDocument('profiles', username, {
          lastFollowUpSentDate: new Date().toISOString(),
        });

        followUpsSent++;
      }
    } else {
      // Send initial reminder
      await mailer.sendAnnualLetterReminder(
        profile.email,
        profile.fullName,
        username,
        subscribers.length,
        profile.expectedSendMonth
      );

      await db.updateDocument('profiles', username, {
        lastReminderSentDate: new Date().toISOString(),
      });

      initialRemindersSent++;
    }
  }

  return success({
    message: 'Reminders sent',
    initialRemindersSent,
    followUpsSent,
  });
};
```

### Marking Letter as Sent

**User Journey:**
1. User sends their annual letter
2. Visits their profile
3. Clicks "Mark Letter as Sent"
4. Confirmation message appears
5. Profile shows "Last sent: [date]"

**Implementation:**

```typescript
// Client
const handleMarkSent = async () => {
  const result = await markLetterSent(username);
  if (result.success) {
    setProfile({ ...profile, lastSentDate: result.lastSentDate });
  }
};

// Server (POST /api/profiles/{username}/mark-sent)
export const markLetterSentHandler: Handler<unknown, { username: string }> =
  async (req, ctx) => {
    const user = requireUser(ctx);
    const { username } = ctx.params;
    const { db } = getHandlerDeps();

    ensure(user.username === username, 403, 'Can only mark your own letter as sent');

    const lastSentDate = new Date().toISOString();
    await db.updateDocument('profiles', username, { lastSentDate });

    return success({ success: true, lastSentDate });
  };
```

This resets the reminder cycle - user won't get reminded again until next year (if their expected month matches).
