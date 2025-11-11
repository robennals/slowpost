import type { DbAdapter } from './types';

interface LibsqlClient {
  execute(statement: { sql: string; args?: any[] }): Promise<{ rows: Array<Record<string, unknown>> }>;
  batch(statements: Array<{ sql: string; args?: any[] }>): Promise<unknown>;
  close(): Promise<void> | void;
}

interface LibsqlModule {
  createClient(options: { url: string; authToken: string; syncInterval?: number }): LibsqlClient;
}

async function loadLibsqlModule(): Promise<LibsqlModule> {
  try {
    return await import('@libsql/client');
  } catch (error) {
    const message =
      'The @libsql/client package is required to use the Turso adapter. ' +
      'Install it with "yarn add @libsql/client".';
    throw new Error(message);
  }
}

export interface TursoAdapterOptions {
  url: string;
  authToken: string;
  syncIntervalMs?: number;
}

export class TursoAdapter implements DbAdapter {
  private clientPromise: Promise<LibsqlClient>;

  constructor(options: TursoAdapterOptions) {
    this.clientPromise = loadLibsqlModule().then(({ createClient }) =>
      createClient({
        url: options.url,
        authToken: options.authToken,
        syncInterval: options.syncIntervalMs,
      })
    );
  }

  private async client() {
    return this.clientPromise;
  }

  async getDocument<T>(collection: string, key: string): Promise<T | null> {
    const result = await (await this.client()).execute({
      sql: 'SELECT data FROM documents WHERE collection = ?1 AND key = ?2',
      args: [collection, key],
    });
    const row = result.rows[0] as { data?: string } | undefined;
    return row?.data ? JSON.parse(String(row.data)) : null;
  }

  async addDocument<T>(collection: string, key: string, data: T): Promise<void> {
    await (await this.client()).execute({
      sql: 'INSERT INTO documents (collection, key, data) VALUES (?1, ?2, ?3)',
      args: [collection, key, JSON.stringify(data)],
    });
  }

  async updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void> {
    const existing = await this.getDocument<T>(collection, key);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    const updated = { ...existing, ...update };
    await (await this.client()).execute({
      sql: 'UPDATE documents SET data = ?1 WHERE collection = ?2 AND key = ?3',
      args: [JSON.stringify(updated), collection, key],
    });
  }

  async getChildLinks<T>(collection: string, parentKey: string): Promise<T[]> {
    const result = await (await this.client()).execute({
      sql: 'SELECT data FROM links WHERE collection = ?1 AND parent_key = ?2',
      args: [collection, parentKey],
    });
    return result.rows.map((row) => JSON.parse(String((row as any).data)) as T);
  }

  async getParentLinks<T>(collection: string, childKey: string): Promise<T[]> {
    const result = await (await this.client()).execute({
      sql: 'SELECT data FROM links WHERE collection = ?1 AND child_key = ?2',
      args: [collection, childKey],
    });
    return result.rows.map((row) => JSON.parse(String((row as any).data)) as T);
  }

  async addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void> {
    await (await this.client()).execute({
      sql: 'INSERT INTO links (collection, parent_key, child_key, data) VALUES (?1, ?2, ?3, ?4)',
      args: [collection, parentKey, childKey, JSON.stringify(data)],
    });
  }

  async deleteLink(collection: string, parentKey: string, childKey: string): Promise<void> {
    await (await this.client()).execute({
      sql: 'DELETE FROM links WHERE collection = ?1 AND parent_key = ?2 AND child_key = ?3',
      args: [collection, parentKey, childKey],
    });
  }

  async updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void> {
    const result = await (await this.client()).execute({
      sql: 'SELECT data FROM links WHERE collection = ?1 AND parent_key = ?2 AND child_key = ?3',
      args: [collection, parentKey, childKey],
    });
    const row = result.rows[0] as { data?: string } | undefined;
    if (!row?.data) {
      throw new Error(`Link not found: ${collection}/${parentKey}/${childKey}`);
    }
    const existing = JSON.parse(String(row.data));
    const updated = { ...existing, ...update };
    await (await this.client()).execute({
      sql: 'UPDATE links SET data = ?1 WHERE collection = ?2 AND parent_key = ?3 AND child_key = ?4',
      args: [JSON.stringify(updated), collection, parentKey, childKey],
    });
  }

  async getAllDocuments<T>(collection: string): Promise<Array<{ key: string; data: T }>> {
    const result = await (await this.client()).execute({
      sql: 'SELECT key, data FROM documents WHERE collection = ?1',
      args: [collection],
    });
    return result.rows.map((row) => ({
      key: String((row as any).key),
      data: JSON.parse(String((row as any).data)) as T,
    }));
  }

  async ensureSchema(): Promise<void> {
    await (await this.client()).batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS documents (
          collection TEXT NOT NULL,
          key TEXT NOT NULL,
          data TEXT NOT NULL,
          PRIMARY KEY (collection, key)
        )`,
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS links (
          collection TEXT NOT NULL,
          parent_key TEXT NOT NULL,
          child_key TEXT NOT NULL,
          data TEXT NOT NULL,
          PRIMARY KEY (collection, parent_key, child_key)
        )`,
      },
      {
        sql: 'CREATE INDEX IF NOT EXISTS idx_links_parent ON links(collection, parent_key)',
      },
      {
        sql: 'CREATE INDEX IF NOT EXISTS idx_links_child ON links(collection, child_key)',
      },
    ]);
  }

  async getUserGroupsWithMembership(
    username: string,
    viewerUsername: string | null
  ): Promise<Array<{ group: any; membership: any; viewerMembership: any | null }>> {
    const sql = viewerUsername
      ? `
        SELECT
          g.data as group_data,
          m.data as membership_data,
          v.data as viewer_membership_data
        FROM links m
        INNER JOIN documents g ON g.collection = 'groups' AND g.key = m.parent_key
        LEFT JOIN links v ON v.collection = 'members'
          AND v.parent_key = m.parent_key
          AND v.child_key = ?2
        WHERE m.collection = 'members' AND m.child_key = ?1
      `
      : `
        SELECT
          g.data as group_data,
          m.data as membership_data,
          NULL as viewer_membership_data
        FROM links m
        INNER JOIN documents g ON g.collection = 'groups' AND g.key = m.parent_key
        WHERE m.collection = 'members' AND m.child_key = ?1
      `;

    const args = viewerUsername ? [username, viewerUsername] : [username];

    const result = await (await this.client()).execute({ sql, args });

    return result.rows.map((row: any) => ({
      group: JSON.parse(String(row.group_data)),
      membership: JSON.parse(String(row.membership_data)),
      viewerMembership: row.viewer_membership_data ? JSON.parse(String(row.viewer_membership_data)) : null,
    }));
  }

  async getGroupMembersWithProfiles(groupName: string): Promise<Array<{ membership: any; profile: any }>> {
    const sql = `
      SELECT
        m.data as membership_data,
        p.data as profile_data
      FROM links m
      INNER JOIN documents p ON p.collection = 'profiles' AND p.key = m.child_key
      WHERE m.collection = 'members' AND m.parent_key = ?1
    `;

    const result = await (await this.client()).execute({ sql, args: [groupName] });

    return result.rows.map((row: any) => ({
      membership: JSON.parse(String(row.membership_data)),
      profile: JSON.parse(String(row.profile_data)),
    }));
  }

  async close(): Promise<void> {
    await (await this.client()).close();
  }
}
