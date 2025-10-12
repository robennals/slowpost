import { TursoAdapter } from '../db/adapter.js';
import { AuthService } from '../auth/auth.js';

let cachedDb: TursoAdapter | null = null;
let cachedAuthService: AuthService | null = null;

/**
 * Get or create the database adapter
 * Cached for serverless function reuse
 */
export function getDb(): TursoAdapter {
  if (cachedDb) {
    return cachedDb;
  }

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
  }

  console.log('Initializing Turso database');
  cachedDb = new TursoAdapter(
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_AUTH_TOKEN
  );

  return cachedDb;
}

/**
 * Get or create the auth service
 * Cached for serverless function reuse
 */
export function getAuthService(): AuthService {
  if (cachedAuthService) {
    return cachedAuthService;
  }

  const db = getDb();
  const skipPin = process.env.SKIP_PIN === 'true';

  cachedAuthService = new AuthService(db, skipPin);
  return cachedAuthService;
}
