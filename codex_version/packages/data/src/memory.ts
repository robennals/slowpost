import {
  getStandardDataset,
  type StandardDataset
} from './dataset.js';
import {
  createSlowpostStore,
  type CollectionLike,
  type Query,
  type SlowpostCollections,
  type Update
} from './store.js';
import {
  type Follow,
  type Group,
  type GroupJoinRequest,
  type LoginSession,
  type Membership,
  type Notification,
  type Profile,
  type SlowpostStore
} from './types.js';

function cloneValue<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      cloneValue(val)
    ]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

type QueryRecord<T> = Query<T> & Record<string, unknown>;

type FindCondition = { $in: readonly unknown[] };

function isInCondition(value: unknown): value is FindCondition {
  return typeof value === 'object' && value !== null && '$in' in (value as Record<string, unknown>);
}

function matchesQuery<T>(document: T, query: QueryRecord<T>): boolean {
  const entries = Object.entries(query);
  if (entries.length === 0) {
    return true;
  }
  return entries.every(([key, condition]) => {
    const value = (document as Record<string, unknown>)[key];
    if (isInCondition(condition)) {
      return condition.$in.some((candidate) => candidate === value);
    }
    return value === condition;
  });
}

function createMemoryCollection<T>(initial: readonly T[] = []): CollectionLike<T> {
  const documents: T[] = initial.map((item) => cloneValue(item));

  return {
    find(query: Query<T>) {
      const filter = query as QueryRecord<T>;
      return {
        async toArray() {
          return documents.filter((document) => matchesQuery(document, filter)).map((document) => cloneValue(document));
        }
      };
    },
    async findOne(query: Query<T>) {
      const filter = query as QueryRecord<T>;
      const found = documents.find((document) => matchesQuery(document, filter));
      return found ? cloneValue(found) : null;
    },
    async insertOne(document: T) {
      documents.push(cloneValue(document));
    },
    async insertMany(items: readonly T[]) {
      for (const item of items) {
        documents.push(cloneValue(item));
      }
    },
    async updateOne(filter: Query<T>, update: Update<T>) {
      const queryRecord = filter as QueryRecord<T>;
      const document = documents.find((item) => matchesQuery(item, queryRecord));
      if (!document) {
        return;
      }
      if (update.$set) {
        Object.assign(document as Record<string, unknown>, update.$set as Record<string, unknown>);
      }
    },
    async deleteMany(filter: Query<T>) {
      const queryRecord = filter as QueryRecord<T>;
      if (Object.keys(queryRecord).length === 0) {
        documents.length = 0;
        return;
      }
      for (let index = documents.length - 1; index >= 0; index -= 1) {
        if (matchesQuery(documents[index], queryRecord)) {
          documents.splice(index, 1);
        }
      }
    }
  };
}

export interface MemoryCollections extends SlowpostCollections {}

export function createMemoryCollections(
  dataset: StandardDataset = getStandardDataset()
): MemoryCollections {
  return {
    profiles: createMemoryCollection<Profile>(dataset.profiles),
    groups: createMemoryCollection<Group>(dataset.groups),
    memberships: createMemoryCollection<Membership>(dataset.memberships),
    follows: createMemoryCollection<Follow>(dataset.follows),
    loginSessions: createMemoryCollection<LoginSession>(dataset.loginSessions),
    notifications: createMemoryCollection<Notification>(dataset.notifications),
    groupJoinRequests: createMemoryCollection<GroupJoinRequest>(dataset.groupJoinRequests ?? [])
  };
}

export function createMemoryStore(dataset: StandardDataset = getStandardDataset()): SlowpostStore {
  const collections = createMemoryCollections(dataset);
  return createSlowpostStore(collections);
}
