export type StatementType =
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

export class FakeDatabase {
  private documents = new Map<string, Map<string, string>>();
  private links = new Map<string, Map<string, Map<string, string>>>();

  exec(): void {
    // Schema setup is a no-op for the in-memory adapter
  }

  prepare(sql: string): Statement {
    const type = this.statementType(sql);
    return new FakeStatement(type, this);
  }

  close(): void {
    // Nothing to clean up for the in-memory adapter
  }

  reset(): void {
    this.documents.clear();
    this.links.clear();
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

  updateDocument(collection: string, key: string, data: string) {
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

  updateLink(collection: string, parent: string, child: string, data: string) {
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

export function createBetterSqliteMock() {
  const state: { instance: FakeDatabase | null } = { instance: null };

  class MockedDatabase extends FakeDatabase {
    constructor() {
      super();
      state.instance = this;
    }
  }

  return {
    default: MockedDatabase,
    __getInstance: () => state.instance,
  };
}
