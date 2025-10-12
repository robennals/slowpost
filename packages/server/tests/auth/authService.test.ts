import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/auth/auth.js';
import type { DbAdapter } from '../../src/db/adapter.js';

type CollectionMap = Map<string, any>;
type LinkCollectionMap = Map<string, Map<string, any>>;

class MockDbAdapter implements DbAdapter {
  private documents = new Map<string, CollectionMap>();
  private links = new Map<string, LinkCollectionMap>();

  private ensureCollection(collection: string): CollectionMap {
    if (!this.documents.has(collection)) {
      this.documents.set(collection, new Map());
    }
    return this.documents.get(collection)!;
  }

  private ensureLinkCollection(collection: string): LinkCollectionMap {
    if (!this.links.has(collection)) {
      this.links.set(collection, new Map());
    }
    return this.links.get(collection)!;
  }

  getDocument<T>(collection: string, key: string): T | null {
    const col = this.documents.get(collection);
    const value = col?.get(key);
    return value ? this.clone(value) : null;
  }

  addDocument<T>(collection: string, key: string, data: T): void {
    const col = this.ensureCollection(collection);
    col.set(key, this.clone(data));
  }

  updateDocument<T>(collection: string, key: string, update: Partial<T>): void {
    const col = this.ensureCollection(collection);
    const existing = col.get(key);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    col.set(key, this.clone({ ...existing, ...update }));
  }

  getChildLinks<T>(collection: string, parentKey: string): T[] {
    const col = this.links.get(collection);
    if (!col) return [];
    const children = col.get(parentKey);
    if (!children) return [];
    return Array.from(children.values()).map((value) => this.clone(value));
  }

  getParentLinks<T>(collection: string, childKey: string): T[] {
    const col = this.links.get(collection);
    if (!col) return [];
    const parents: T[] = [];
    for (const [, childMap] of col.entries()) {
      const value = childMap.get(childKey);
      if (value) {
        parents.push(this.clone(value));
      }
    }
    return parents;
  }

  addLink<T>(collection: string, parentKey: string, childKey: string, data: T): void {
    const col = this.ensureLinkCollection(collection);
    if (!col.has(parentKey)) {
      col.set(parentKey, new Map());
    }
    col.get(parentKey)!.set(childKey, this.clone(data));
  }

  deleteLink(collection: string, parentKey: string, childKey: string): void {
    const col = this.links.get(collection);
    col?.get(parentKey)?.delete(childKey);
  }

  updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): void {
    const col = this.links.get(collection);
    const childMap = col?.get(parentKey);
    const existing = childMap?.get(childKey);
    if (!existing) {
      throw new Error(`Link not found: ${collection}/${parentKey}/${childKey}`);
    }
    childMap!.set(childKey, this.clone({ ...existing, ...update }));
  }

  getAllDocuments<T>(collection: string): Array<{ key: string; data: T }> {
    const col = this.documents.get(collection);
    if (!col) return [];
    return Array.from(col.entries()).map(([key, value]) => ({ key, data: this.clone(value) }));
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}

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

    const authRecord = db.getDocument<any>('auth', email);
    expect(authRecord).not.toBeNull();
    expect(authRecord?.pin).toBe(pin);
  });

  it('retains existing users when requesting a PIN', async () => {
    const email = 'existing@example.com';
    db.addDocument('users', email, {
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

    db.updateDocument('auth', email, {
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

    const profile = db.getDocument<any>('profiles', 'profile-user');
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

    const storedSession = db.getDocument<any>('sessions', session.token);
    expect(storedSession).not.toBeNull();

    const authRecord = db.getDocument<any>('auth', email);
    expect(authRecord?.sessions).toHaveLength(1);

    const verified = await service.verifySession(session.token);
    expect(verified).not.toBeNull();

    db.updateDocument('sessions', session.token, {
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    });

    const expired = await service.verifySession(session.token);
    expect(expired).toBeNull();
  });
});
