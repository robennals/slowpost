import Database from 'better-sqlite3';
import { join } from 'path';

export interface DbAdapter {
  getDocument<T>(collection: string, key: string): T | null;
  addDocument<T>(collection: string, key: string, data: T): void;
  updateDocument<T>(collection: string, key: string, update: Partial<T>): void;
  getChildLinks<T>(collection: string, parentKey: string): T[];
  getParentLinks<T>(collection: string, childKey: string): T[];
  addLink<T>(collection: string, parentKey: string, childKey: string, data: T): void;
  deleteLink(collection: string, parentKey: string, childKey: string): void;
  updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): void;
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

  getDocument<T>(collection: string, key: string): T | null {
    const stmt = this.db.prepare('SELECT data FROM documents WHERE collection = ? AND key = ?');
    const result = stmt.get(collection, key) as { data: string } | undefined;
    return result ? JSON.parse(result.data) : null;
  }

  addDocument<T>(collection: string, key: string, data: T): void {
    const stmt = this.db.prepare('INSERT INTO documents (collection, key, data) VALUES (?, ?, ?)');
    stmt.run(collection, key, JSON.stringify(data));
  }

  updateDocument<T>(collection: string, key: string, update: Partial<T>): void {
    const existing = this.getDocument<T>(collection, key);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    const updated = { ...existing, ...update };
    const stmt = this.db.prepare('UPDATE documents SET data = ? WHERE collection = ? AND key = ?');
    stmt.run(JSON.stringify(updated), collection, key);
  }

  getChildLinks<T>(collection: string, parentKey: string): T[] {
    const stmt = this.db.prepare('SELECT data FROM links WHERE collection = ? AND parent_key = ?');
    const results = stmt.all(collection, parentKey) as { data: string }[];
    return results.map(r => JSON.parse(r.data));
  }

  getParentLinks<T>(collection: string, childKey: string): T[] {
    const stmt = this.db.prepare('SELECT data FROM links WHERE collection = ? AND child_key = ?');
    const results = stmt.all(collection, childKey) as { data: string }[];
    return results.map(r => JSON.parse(r.data));
  }

  addLink<T>(collection: string, parentKey: string, childKey: string, data: T): void {
    const stmt = this.db.prepare('INSERT INTO links (collection, parent_key, child_key, data) VALUES (?, ?, ?, ?)');
    stmt.run(collection, parentKey, childKey, JSON.stringify(data));
  }

  deleteLink(collection: string, parentKey: string, childKey: string): void {
    const stmt = this.db.prepare('DELETE FROM links WHERE collection = ? AND parent_key = ? AND child_key = ?');
    stmt.run(collection, parentKey, childKey);
  }

  updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): void {
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

  close() {
    this.db.close();
  }
}
