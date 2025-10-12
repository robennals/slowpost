import crypto from 'crypto';
import type { DbAdapter } from '../db/adapter.js';

export interface AuthData {
  email: string;
  pin: string;
  pinExpiresAt: string;
  sessions: AuthSession[];
}

export interface AuthSession {
  username: string;
  fullName: string;
  token: string;
  expiresAt: string;
}

export interface UserProfile {
  username: string;
  email: string;
  fullName: string;
}

const PIN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class AuthService {
  constructor(
    private db: DbAdapter,
    private skipPin: boolean = false
  ) {}

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async requestPin(email: string): Promise<{ pin: string; requiresSignup: boolean }> {
    const pin = this.generatePin();
    const pinExpiresAt = new Date(Date.now() + PIN_EXPIRY_MS).toISOString();

    // Check if user exists
    const user = await this.db.getDocument<UserProfile>('users', email);
    const requiresSignup = !user;

    // Store or update auth data
    const existingAuth = await this.db.getDocument<AuthData>('auth', email);

    if (existingAuth) {
      await this.db.updateDocument<AuthData>('auth', email, {
        pin,
        pinExpiresAt,
      });
    } else {
      await this.db.addDocument<AuthData>('auth', email, {
        email,
        pin,
        pinExpiresAt,
        sessions: [],
      });
    }

    return { pin, requiresSignup };
  }

  async verifyPin(email: string, pin: string): Promise<boolean> {
    if (this.skipPin && pin === 'skip') {
      return true;
    }

    const authData = await this.db.getDocument<AuthData>('auth', email);
    if (!authData) return false;

    const now = new Date();
    const expiresAt = new Date(authData.pinExpiresAt);

    return authData.pin === pin && now < expiresAt;
  }

  async createSession(email: string): Promise<AuthSession> {
    const user = await this.db.getDocument<UserProfile>('users', email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();

    const session: AuthSession = {
      username: user.username,
      fullName: user.fullName,
      token,
      expiresAt,
    };

    // Store session in a separate collection for easy lookup
    await this.db.addDocument('sessions', token, session);

    // Also add to auth data for reference
    const authData = await this.db.getDocument<AuthData>('auth', email);
    if (authData) {
      await this.db.updateDocument<AuthData>('auth', email, {
        sessions: [...authData.sessions, session],
      });
    }

    return session;
  }

  async verifySession(token: string): Promise<AuthSession | null> {
    const session = await this.db.getDocument<AuthSession>('sessions', token);
    if (!session) return null;

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now >= expiresAt) return null;

    return session;
  }

  async createUser(email: string, username: string, fullName: string): Promise<UserProfile> {
    // Check if username is already taken
    const existingUser = await this.db.getDocument<UserProfile>('users', email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user: UserProfile = {
      email,
      username,
      fullName,
    };

    await this.db.addDocument<UserProfile>('users', email, user);

    // Also create the profile
    await this.db.addDocument('profiles', username, {
      username,
      fullName,
      bio: '',
    });

    return user;
  }
}
