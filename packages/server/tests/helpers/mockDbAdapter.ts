import type { DbAdapter } from '../../src/db/types.js';

type CollectionMap = Map<string, any>;
type LinkCollectionMap = Map<string, Map<string, any>>;

export class MockDbAdapter implements DbAdapter {
  private documents = new Map<string, CollectionMap>();
  private links = new Map<string, LinkCollectionMap>();

  private ensureCollection(collection: string): CollectionMap {
    if (!this.documents.has(collection)) {
      this.documents.set(collection, new Map());
    }
    return this.documents.get(collection)!;
  }

  private ensureLinkCollection(collection: string): LinkCollectionMap {
    if (!this.links.has(collection)) {
      this.links.set(collection, new Map());
    }
    return this.links.get(collection)!;
  }

  async getDocument<T>(collection: string, key: string): Promise<T | null> {
    const col = this.documents.get(collection);
    const value = col?.get(key);
    return value ? this.clone(value) : null;
  }

  async addDocument<T>(collection: string, key: string, data: T): Promise<void> {
    const col = this.ensureCollection(collection);
    col.set(key, this.clone(data));
  }

  async updateDocument<T>(collection: string, key: string, update: Partial<T>): Promise<void> {
    const col = this.ensureCollection(collection);
    const existing = col.get(key);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${key}`);
    }
    col.set(key, this.clone({ ...existing, ...update }));
  }

  async getChildLinks<T>(collection: string, parentKey: string): Promise<T[]> {
    const col = this.links.get(collection);
    if (!col) return [];
    const children = col.get(parentKey);
    if (!children) return [];
    return Array.from(children.values()).map((value) => this.clone(value));
  }

  async getParentLinks<T>(collection: string, childKey: string): Promise<T[]> {
    const col = this.links.get(collection);
    if (!col) return [];
    const parents: T[] = [];
    for (const [, childMap] of col.entries()) {
      const value = childMap.get(childKey);
      if (value) {
        parents.push(this.clone(value));
      }
    }
    return parents;
  }

  async addLink<T>(collection: string, parentKey: string, childKey: string, data: T): Promise<void> {
    const col = this.ensureLinkCollection(collection);
    if (!col.has(parentKey)) {
      col.set(parentKey, new Map());
    }
    col.get(parentKey)!.set(childKey, this.clone(data));
  }

  async deleteLink(collection: string, parentKey: string, childKey: string): Promise<void> {
    const col = this.links.get(collection);
    col?.get(parentKey)?.delete(childKey);
  }

  async updateLink<T>(collection: string, parentKey: string, childKey: string, update: Partial<T>): Promise<void> {
    const col = this.links.get(collection);
    const childMap = col?.get(parentKey);
    const existing = childMap?.get(childKey);
    if (!existing) {
      throw new Error(`Link not found: ${collection}/${parentKey}/${childKey}`);
    }
    childMap!.set(childKey, this.clone({ ...existing, ...update }));
  }

  async getAllDocuments<T>(collection: string): Promise<Array<{ key: string; data: T }>> {
    const col = this.documents.get(collection);
    if (!col) return [];
    return Array.from(col.entries()).map(([key, value]) => ({ key, data: this.clone(value) }));
  }

  reset() {
    this.documents.clear();
    this.links.clear();
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}
