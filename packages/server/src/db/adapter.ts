import Database from 'better-sqlite3';
import { join } from 'path';
import { createClient, type Client } from '@libsql/client';

export interface DbAdapter {
  getDocument<T>(collection: string, key: string): Promise<T | null>;
  addDocument<T>(collection: string, key: string, data: T): Promise<void>;
  updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void>;
  getChildLinks<T>(collection: string, parentKey: string): Promise<T[]>;
  getParentLinks<T>(collection: string, childKey: string): Promise<T[]>;
  addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void>;
  deleteLink(collection: string, parentKey: string, childKey: string): Promise<void>;
  updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void>;
  getAllDocuments<T>(collection: string): Promise<Array<{key: string, data: T}>>;
  close(): Promise<void>;
}

export class SQLiteAdapter implements DbAdapter {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'slowpost.db');
    this.db = new Database(path);
    this.initializeTables();
  }

  private initializeTables() {
    // Documents table for single-key collections (profiles, groups, etc.)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        collection TEXT NOT NULL,
        key TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, key)
      )
    `);

    // Links table for parent-child relationships (follows, members, etc.)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS links (
        collection TEXT NOT NULL,
        parent_key TEXT NOT NULL,
        child_key TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, parent_key, child_key)
      )
    `);

    // Indexes for efficient lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_links_parent ON links(collection, parent_key);
      CREATE INDEX IF NOT EXISTS idx_links_child ON links(collection, child_key);
    `);
  }

  async getDocument<T>(collection: string, key: string): Promise<T | null> {
    const stmt = this.db.prepare('SELECT data FROM documents WHERE collection = ? AND key = ?');
    const result = stmt.get(collection, key) as { data: string } | undefined;
    return result ? JSON.parse(result.data) : null;
  }

  async addDocument<T>(collection: string, key: string, data: T): Promise<void> {
    const stmt = this.db.prepare('INSERT INTO documents (collection, key, data) VALUES (?, ?, ?)');
    stmt.run(collection, key, JSON.stringify(data));
  }

  async updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void> {
    const existing = await this.getDocument<T>(collection, key);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    const updated = { ...existing, ...update };
    const stmt = this.db.prepare('UPDATE documents SET data = ? WHERE collection = ? AND key = ?');
    stmt.run(JSON.stringify(updated), collection, key);
  }

  async getChildLinks<T>(collection: string, parentKey: string): Promise<T[]> {
    const stmt = this.db.prepare('SELECT data FROM links WHERE collection = ? AND parent_key = ?');
    const results = stmt.all(collection, parentKey) as { data: string }[];
    return results.map(r => JSON.parse(r.data));
  }

  async getParentLinks<T>(collection: string, childKey: string): Promise<T[]> {
    const stmt = this.db.prepare('SELECT data FROM links WHERE collection = ? AND child_key = ?');
    const results = stmt.all(collection, childKey) as { data: string }[];
    return results.map(r => JSON.parse(r.data));
  }

  async addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void> {
    const stmt = this.db.prepare('INSERT INTO links (collection, parent_key, child_key, data) VALUES (?, ?, ?, ?)');
    stmt.run(collection, parentKey, childKey, JSON.stringify(data));
  }

  async deleteLink(collection: string, parentKey: string, childKey: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM links WHERE collection = ? AND parent_key = ? AND child_key = ?');
    stmt.run(collection, parentKey, childKey);
  }

  async updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void> {
    const stmt = this.db.prepare('SELECT data FROM links WHERE collection = ? AND parent_key = ? AND child_key = ?');
    const result = stmt.get(collection, parentKey, childKey) as { data: string } | undefined;
    if (!result) {
      throw new Error(`Link not found: ${collection}/${parentKey}/${childKey}`);
    }
    const existing = JSON.parse(result.data);
    const updated = { ...existing, ...update };
    const updateStmt = this.db.prepare('UPDATE links SET data = ? WHERE collection = ? AND parent_key = ? AND child_key = ?');
    updateStmt.run(JSON.stringify(updated), collection, parentKey, childKey);
  }

  async getAllDocuments<T>(collection: string): Promise<Array<{key: string, data: T}>> {
    const stmt = this.db.prepare('SELECT key, data FROM documents WHERE collection = ?');
    const results = stmt.all(collection) as { key: string, data: string }[];
    return results.map(r => ({ key: r.key, data: JSON.parse(r.data) }));
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

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
