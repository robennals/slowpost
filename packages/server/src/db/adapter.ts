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

export { TursoAdapter } from './turso-adapter.js';
export { MockDbAdapter } from './mock-adapter.js';
