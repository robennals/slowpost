import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

type StatementType =
  | 'selectDocument'
  | 'insertDocument'
  | 'updateDocument'
  | 'selectLinksByParent'
  | 'selectLinksByChild'
  | 'insertLink'
  | 'deleteLink'
  | 'selectLink'
  | 'updateLink'
  | 'selectAllDocuments';

interface Statement {
  get: (...args: any[]) => any;
  run: (...args: any[]) => any;
  all: (...args: any[]) => any;
}

class FakeStatement implements Statement {
  constructor(private type: StatementType, private db: FakeDatabase) {}

  get(...args: any[]) {
    switch (this.type) {
      case 'selectDocument':
        return this.db.selectDocument(args[0], args[1]);
      case 'selectLink':
        return this.db.selectLink(args[0], args[1], args[2]);
      default:
        throw new Error(`GET not implemented for ${this.type}`);
    }
  }

  run(...args: any[]) {
    switch (this.type) {
      case 'insertDocument':
        this.db.insertDocument(args[0], args[1], args[2]);
        return;
      case 'updateDocument':
        this.db.updateDocument(args[0], args[1], args[2]);
        return;
      case 'insertLink':
        this.db.insertLink(args[0], args[1], args[2], args[3]);
        return;
      case 'deleteLink':
        this.db.deleteLink(args[0], args[1], args[2]);
        return;
      case 'updateLink':
        this.db.updateLink(args[0], args[1], args[2], args[3]);
        return;
      default:
        throw new Error(`RUN not implemented for ${this.type}`);
    }
  }

  all(...args: any[]) {
    switch (this.type) {
      case 'selectLinksByParent':
        return this.db.selectLinksByParent(args[0], args[1]);
      case 'selectLinksByChild':
        return this.db.selectLinksByChild(args[0], args[1]);
      case 'selectAllDocuments':
        return this.db.selectAllDocuments(args[0]);
      default:
        throw new Error(`ALL not implemented for ${this.type}`);
    }
  }
}

class FakeDatabase {
  private documents = new Map<string, Map<string, string>>();
  private links = new Map<string, Map<string, Map<string, string>>>();

  exec(): void {
    // no-op for schema setup
  }

  prepare(sql: string): Statement {
    const type = this.statementType(sql);
    return new FakeStatement(type, this);
  }

  close(): void {
    // no-op
  }

  private ensureDocumentCollection(collection: string): Map<string, string> {
    if (!this.documents.has(collection)) {
      this.documents.set(collection, new Map());
    }
    return this.documents.get(collection)!;
  }

  private ensureLinkCollection(collection: string, parent: string): Map<string, string> {
    if (!this.links.has(collection)) {
      this.links.set(collection, new Map());
    }
    const parentMap = this.links.get(collection)!;
    if (!parentMap.has(parent)) {
      parentMap.set(parent, new Map());
    }
    return parentMap.get(parent)!;
  }

  private statementType(sql: string): StatementType {
    if (sql.startsWith('SELECT data FROM documents') && sql.includes('key = ?')) {
      return 'selectDocument';
    }
    if (sql.startsWith('INSERT INTO documents')) {
      return 'insertDocument';
    }
    if (sql.startsWith('UPDATE documents')) {
      return 'updateDocument';
    }
    if (sql.startsWith('SELECT data FROM links') && sql.includes('parent_key = ?') && sql.includes('child_key = ?')) {
      return 'selectLink';
    }
    if (sql.startsWith('SELECT data FROM links') && sql.includes('parent_key = ?')) {
      return 'selectLinksByParent';
    }
    if (sql.startsWith('SELECT data FROM links') && sql.includes('child_key = ?')) {
      return 'selectLinksByChild';
    }
    if (sql.startsWith('INSERT INTO links')) {
      return 'insertLink';
    }
    if (sql.startsWith('DELETE FROM links')) {
      return 'deleteLink';
    }
    if (sql.startsWith('UPDATE links')) {
      return 'updateLink';
    }
    if (sql.startsWith('SELECT key, data FROM documents')) {
      return 'selectAllDocuments';
    }
    throw new Error(`Unknown SQL statement: ${sql}`);
  }

  selectDocument(collection: string, key: string) {
    const col = this.documents.get(collection);
    const value = col?.get(key);
    return value ? { data: value } : undefined;
  }

  insertDocument(collection: string, key: string, data: string) {
    this.ensureDocumentCollection(collection).set(key, data);
  }

  updateDocument(data: string, collection: string, key: string) {
    const col = this.ensureDocumentCollection(collection);
    if (!col.has(key)) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    col.set(key, data);
  }

  selectLinksByParent(collection: string, parent: string) {
    const parentMap = this.links.get(collection)?.get(parent);
    if (!parentMap) return [];
    return Array.from(parentMap.values()).map((data) => ({ data }));
  }

  selectLinksByChild(collection: string, child: string) {
    const col = this.links.get(collection);
    if (!col) return [];
    const matches: Array<{ data: string }> = [];
    for (const parentMap of col.values()) {
      const data = parentMap.get(child);
      if (data) {
        matches.push({ data });
      }
    }
    return matches;
  }

  insertLink(collection: string, parent: string, child: string, data: string) {
    this.ensureLinkCollection(collection, parent).set(child, data);
  }

  deleteLink(collection: string, parent: string, child: string) {
    this.links.get(collection)?.get(parent)?.delete(child);
  }

  selectLink(collection: string, parent: string, child: string) {
    const data = this.links.get(collection)?.get(parent)?.get(child);
    return data ? { data } : undefined;
  }

  updateLink(data: string, collection: string, parent: string, child: string) {
    const parentMap = this.links.get(collection)?.get(parent);
    if (!parentMap || !parentMap.has(child)) {
      throw new Error(`Link not found: ${collection}/${parent}/${child}`);
    }
    parentMap.set(child, data);
  }

  selectAllDocuments(collection: string) {
    const col = this.documents.get(collection);
    if (!col) return [];
    return Array.from(col.entries()).map(([key, data]) => ({ key, data }));
  }
}

vi.mock('better-sqlite3', () => ({
  default: FakeDatabase,
}));

let SQLiteAdapter: typeof import('../../src/db/adapter.js').SQLiteAdapter;

beforeAll(async () => {
  ({ SQLiteAdapter } = await import('../../src/db/adapter.js'));
});

let dbDir: string;
let dbPath: string;
let adapter: InstanceType<typeof SQLiteAdapter>;

beforeEach(() => {
  dbDir = mkdtempSync(join(tmpdir(), 'slowpost-sqlite-'));
  dbPath = join(dbDir, 'test.db');
  adapter = new SQLiteAdapter(dbPath);
});

afterEach(() => {
  adapter.close();
  rmSync(dbDir, { recursive: true, force: true });
});

describe('SQLiteAdapter', () => {
  it('stores, retrieves, and updates documents', () => {
    adapter.addDocument('profiles', 'alice', { username: 'alice', fullName: 'Alice Example' });

    const profile = adapter.getDocument<any>('profiles', 'alice');
    expect(profile).toMatchObject({ username: 'alice', fullName: 'Alice Example' });

    adapter.updateDocument('profiles', 'alice', { fullName: 'Alice Updated' });

    const updated = adapter.getDocument<any>('profiles', 'alice');
    expect(updated).toMatchObject({ username: 'alice', fullName: 'Alice Updated' });

    const allProfiles = adapter.getAllDocuments<any>('profiles');
    expect(allProfiles).toHaveLength(1);

    expect(() => adapter.updateDocument('profiles', 'missing', { fullName: 'Nope' })).toThrow('Document not found');
  });

  it('manages links between parent and child records', () => {
    adapter.addLink('members', 'group-1', 'alice', { username: 'alice', status: 'pending' });
    adapter.addLink('members', 'group-1', 'bob', { username: 'bob', status: 'approved' });
    adapter.addLink('members', 'group-2', 'alice', { username: 'alice', status: 'pending' });

    const groupOneMembers = adapter.getChildLinks<any>('members', 'group-1');
    expect(groupOneMembers.map((member) => member.username)).toEqual(['alice', 'bob']);

    const aliceMemberships = adapter.getParentLinks<any>('members', 'alice');
    expect(aliceMemberships).toHaveLength(2);

    adapter.updateLink('members', 'group-1', 'alice', { status: 'approved' });
    const updated = adapter.getChildLinks<any>('members', 'group-1').find((member) => member.username === 'alice');
    expect(updated?.status).toBe('approved');

    adapter.deleteLink('members', 'group-1', 'bob');
    const remaining = adapter.getChildLinks<any>('members', 'group-1');
    expect(remaining.map((member) => member.username)).toEqual(['alice']);
  });
});
