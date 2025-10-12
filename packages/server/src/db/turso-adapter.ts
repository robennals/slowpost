import { createClient, type Client } from '@libsql/client';
import { DbAdapter } from './adapter.js';

export class TursoAdapter implements DbAdapter {
  private client: Client;

  constructor(url: string, authToken: string) {
    this.client = createClient({
      url,
      authToken,
    });
    this.initializeTables();
  }

  private async initializeTables() {
    // Documents table for single-key collections (profiles, groups, etc.)
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        collection TEXT NOT NULL,
        key TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, key)
      )
    `);

    // Links table for parent-child relationships (follows, members, etc.)
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS links (
        collection TEXT NOT NULL,
        parent_key TEXT NOT NULL,
        child_key TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, parent_key, child_key)
      )
    `);

    // Indexes for efficient lookups
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_links_parent ON links(collection, parent_key)
    `);
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_links_child ON links(collection, child_key)
    `);
  }

  async getDocument<T>(collection: string, key: string): Promise<T | null> {
    const result = await this.client.execute({
      sql: 'SELECT data FROM documents WHERE collection = ? AND key = ?',
      args: [collection, key],
    });

    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].data as string);
  }

  async addDocument<T>(collection: string, key: string, data: T): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO documents (collection, key, data) VALUES (?, ?, ?)',
      args: [collection, key, JSON.stringify(data)],
    });
  }

  async updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void> {
    const existing = await this.getDocument<T>(collection, key);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    const updated = { ...existing, ...update };
    await this.client.execute({
      sql: 'UPDATE documents SET data = ? WHERE collection = ? AND key = ?',
      args: [JSON.stringify(updated), collection, key],
    });
  }

  async getChildLinks<T>(collection: string, parentKey: string): Promise<T[]> {
    const result = await this.client.execute({
      sql: 'SELECT data FROM links WHERE collection = ? AND parent_key = ?',
      args: [collection, parentKey],
    });

    return result.rows.map(row => JSON.parse(row.data as string));
  }

  async getParentLinks<T>(collection: string, childKey: string): Promise<T[]> {
    const result = await this.client.execute({
      sql: 'SELECT data FROM links WHERE collection = ? AND child_key = ?',
      args: [collection, childKey],
    });

    return result.rows.map(row => JSON.parse(row.data as string));
  }

  async addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO links (collection, parent_key, child_key, data) VALUES (?, ?, ?, ?)',
      args: [collection, parentKey, childKey, JSON.stringify(data)],
    });
  }

  async deleteLink(collection: string, parentKey: string, childKey: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM links WHERE collection = ? AND parent_key = ? AND child_key = ?',
      args: [collection, parentKey, childKey],
    });
  }

  async updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void> {
    const result = await this.client.execute({
      sql: 'SELECT data FROM links WHERE collection = ? AND parent_key = ? AND child_key = ?',
      args: [collection, parentKey, childKey],
    });

    if (result.rows.length === 0) {
      throw new Error(`Link not found: ${collection}/${parentKey}/${childKey}`);
    }

    const existing = JSON.parse(result.rows[0].data as string);
    const updated = { ...existing, ...update };

    await this.client.execute({
      sql: 'UPDATE links SET data = ? WHERE collection = ? AND parent_key = ? AND child_key = ?',
      args: [JSON.stringify(updated), collection, parentKey, childKey],
    });
  }

  async getAllDocuments<T>(collection: string): Promise<Array<{key: string, data: T}>> {
    const result = await this.client.execute({
      sql: 'SELECT key, data FROM documents WHERE collection = ?',
      args: [collection],
    });

    return result.rows.map(row => ({
      key: row.key as string,
      data: JSON.parse(row.data as string),
    }));
  }

  async close(): Promise<void> {
    this.client.close();
  }
}
