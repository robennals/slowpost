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
  getUserGroupsWithMembership(username: string, viewerUsername: string | null): Promise<Array<{ group: any; membership: any; viewerMembership: any | null }>>;
  getGroupMembersWithProfiles(groupName: string): Promise<Array<{ membership: any; profile: any }>>;
}

export interface AdapterFactoryEnv {
  TURSO_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  TURSO_SYNC_INTERVAL_MS?: string;
  [key: string]: string | undefined;
}

export async function createDbAdapter(env: AdapterFactoryEnv = process.env): Promise<DbAdapter> {
  const tursoUrl = env.TURSO_URL;
  const tursoAuthToken = env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoAuthToken) {
    throw new Error(
      'TURSO_URL and TURSO_AUTH_TOKEN must be set to start the application. ' +
        'Create a development database and define these variables in your environment.'
    );
  }

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

  const { TursoAdapter } = await import('./tursoAdapter');
  const adapter = new TursoAdapter(options);
  await adapter.ensureSchema();
  return adapter;
}
