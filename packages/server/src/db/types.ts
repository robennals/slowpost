import { SQLiteAdapter } from './sqliteAdapter.js';

export interface DbAdapter {
  getDocument<T>(collection: string, key: string): Promise<T | null>;
  addDocument<T>(collection: string, key: string, data: T): Promise<void>;
  updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void>;
  getChildLinks<T>(collection: string, parentKey: string): Promise<T[]>;
  getParentLinks<T>(collection: string, childKey: string): Promise<T[]>;
  addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void>;
  deleteLink(collection: string, parentKey: string, childKey: string): Promise<void>;
  updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void>;
  getAllDocuments<T>(collection: string): Promise<Array<{ key: string; data: T }>>;
}

export interface AdapterFactoryEnv {
  TURSO_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  TURSO_SYNC_INTERVAL_MS?: string;
}

export async function createDbAdapter(env: AdapterFactoryEnv = process.env): Promise<DbAdapter> {
  const tursoUrl = env.TURSO_URL;
  const tursoAuthToken = env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoAuthToken) {
    const options: { url: string; authToken: string; syncIntervalMs?: number } = {
      url: tursoUrl,
      authToken: tursoAuthToken,
    };

    if (env.TURSO_SYNC_INTERVAL_MS) {
      const parsed = Number(env.TURSO_SYNC_INTERVAL_MS);
      if (!Number.isNaN(parsed)) {
        options.syncIntervalMs = parsed;
      }
    }

    const { TursoAdapter } = await import('./tursoAdapter.js');
    const adapter = new TursoAdapter(options);
    adapter.ensureSchema?.().catch((error) => {
      console.error('Failed to ensure Turso schema', error);
    });
    return adapter;
  }

  return new SQLiteAdapter();
}

export type { SQLiteAdapter };
