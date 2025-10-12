import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import type { DbAdapter } from './types';

export class SQLiteAdapter implements DbAdapter {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'slowpost.db');
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.initializeTables();
  }

  private initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        collection TEXT NOT NULL,
        key TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, key)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS links (
        collection TEXT NOT NULL,
        parent_key TEXT NOT NULL,
        child_key TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, parent_key, child_key)
      )
    `);

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
    return results.map((record) => JSON.parse(record.data));
  }

  async getParentLinks<T>(collection: string, childKey: string): Promise<T[]> {
    const stmt = this.db.prepare('SELECT data FROM links WHERE collection = ? AND child_key = ?');
    const results = stmt.all(collection, childKey) as { data: string }[];
    return results.map((record) => JSON.parse(record.data));
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
    const updateStmt = this.db.prepare(
      'UPDATE links SET data = ? WHERE collection = ? AND parent_key = ? AND child_key = ?'
    );
    updateStmt.run(JSON.stringify(updated), collection, parentKey, childKey);
  }

  async getAllDocuments<T>(collection: string): Promise<Array<{ key: string; data: T }>> {
    const stmt = this.db.prepare('SELECT key, data FROM documents WHERE collection = ?');
    const results = stmt.all(collection) as { key: string; data: string }[];
    return results.map((record) => ({ key: record.key, data: JSON.parse(record.data) }));
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
