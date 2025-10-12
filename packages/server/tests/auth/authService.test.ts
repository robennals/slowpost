import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/auth/auth.js';
import { MockDbAdapter } from '../helpers/mockDbAdapter.js';

describe('AuthService', () => {
  let db: MockDbAdapter;
  let service: AuthService;

  beforeEach(() => {
    db = new MockDbAdapter();
    service = new AuthService(db);
  });

  it('issues a PIN for new users and marks signup required', async () => {
    const email = 'new-user@example.com';

    const { pin, requiresSignup } = await service.requestPin(email);

    expect(pin).toHaveLength(6);
    expect(requiresSignup).toBe(true);

    const authRecord = await db.getDocument<any>('auth', email);
    expect(authRecord).not.toBeNull();
    expect(authRecord?.pin).toBe(pin);
  });

  it('retains existing users when requesting a PIN', async () => {
    const email = 'existing@example.com';
    await db.addDocument('users', email, {
      email,
      username: 'existing',
      fullName: 'Existing User',
    });

    const { requiresSignup } = await service.requestPin(email);

    expect(requiresSignup).toBe(false);
  });

  it('verifies valid and expired PINs correctly', async () => {
    const email = 'verify@example.com';
    const { pin } = await service.requestPin(email);

    await expect(service.verifyPin(email, pin)).resolves.toBe(true);

    await db.updateDocument('auth', email, {
      pinExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    });

    await expect(service.verifyPin(email, pin)).resolves.toBe(false);
  });

  it('allows skipping PIN validation when configured', async () => {
    const skipService = new AuthService(db, true);

    await expect(skipService.verifyPin('any@example.com', 'skip')).resolves.toBe(true);
  });

  it('creates user profiles and prevents duplicates', async () => {
    const email = 'profile@example.com';

    const user = await service.createUser(email, 'profile-user', 'Profile User');

    expect(user).toMatchObject({
      email,
      username: 'profile-user',
      fullName: 'Profile User',
    });

    const profile = await db.getDocument<any>('profiles', 'profile-user');
    expect(profile).toMatchObject({
      username: 'profile-user',
      fullName: 'Profile User',
    });

    await expect(service.createUser(email, 'profile-user', 'Duplicate')).rejects.toThrow('User already exists');
  });

  it('creates and verifies sessions with expiry enforcement', async () => {
    const email = 'session@example.com';
    await service.createUser(email, 'session-user', 'Session User');
    await service.requestPin(email);

    const session = await service.createSession(email);

    expect(session.token).toBeDefined();
    expect(session.username).toBe('session-user');

    const storedSession = await db.getDocument<any>('sessions', session.token);
    expect(storedSession).not.toBeNull();

    const authRecord = await db.getDocument<any>('auth', email);
    expect(authRecord?.sessions).toHaveLength(1);

    const verified = await service.verifySession(session.token);
    expect(verified).not.toBeNull();

    await db.updateDocument('sessions', session.token, {
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    });

    const expired = await service.verifySession(session.token);
    expect(expired).toBeNull();
  });
});
