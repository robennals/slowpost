import {
  MongoClient,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type OptionalUnlessRequiredId,
  type UpdateFilter
} from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  createSlowpostStore,
  getStandardDataset,
  seedCollections,
  type CollectionLike,
  type SlowpostCollections,
  type SlowpostStore,
  type StandardDataset
} from '@slowpost/data';

function wrapCollection<T extends Document>(collection: Collection<T>): CollectionLike<T> {
  return {
    find(query) {
      return {
        toArray: async () => collection.find(query as Filter<T>).toArray() as unknown as T[]
      };
    },
    findOne(query) {
      return collection.findOne(query as Filter<T>) as Promise<T | null>;
    },
    async insertOne(document) {
      await collection.insertOne(document as OptionalUnlessRequiredId<T>);
    },
    async insertMany(documents) {
      if (documents.length === 0) {
        return;
      }
      await collection.insertMany(documents as OptionalUnlessRequiredId<T>[]);
    },
    async updateOne(filter, update) {
      await collection.updateOne(filter as Filter<T>, update as UpdateFilter<T>);
    },
    async deleteMany(filter) {
      await collection.deleteMany(filter as Filter<T>);
    }
  };
}

export function createMongoCollections(db: Db): SlowpostCollections {
  return {
    profiles: wrapCollection(db.collection('profiles')),
    groups: wrapCollection(db.collection('groups')),
    memberships: wrapCollection(db.collection('memberships')),
    follows: wrapCollection(db.collection('follows')),
    loginSessions: wrapCollection(db.collection('loginSessions')),
    notifications: wrapCollection(db.collection('notifications')),
    groupJoinRequests: wrapCollection(db.collection('groupJoinRequests'))
  };
}

export interface MongoStoreConnection {
  client: MongoClient;
  db: Db;
  collections: SlowpostCollections;
  store: SlowpostStore;
  close(): Promise<void>;
}

export async function connectToMongoStore(options: {
  uri: string;
  dbName: string;
}): Promise<MongoStoreConnection> {
  const client = new MongoClient(options.uri);
  await client.connect();
  const db = client.db(options.dbName);
  const collections = createMongoCollections(db);
  const store = createSlowpostStore(collections);
  return {
    client,
    db,
    collections,
    store,
    close: async () => {
      await client.close();
    }
  };
}

export interface StartInMemoryMongoOptions {
  port?: number;
  dbName?: string;
  seed?: boolean;
  dataset?: StandardDataset;
}

export async function startInMemoryMongo(options: StartInMemoryMongoOptions = {}): Promise<
  MongoStoreConnection & {
    uri: string;
    stop(): Promise<void>;
  }
> {
  const memory = await MongoMemoryServer.create({
    instance: {
      port: options.port,
      dbName: options.dbName
    }
  });
  const dbName = options.dbName ?? 'slowpost-dev';
  const uri = memory.getUri(dbName);
  const connection = await connectToMongoStore({ uri, dbName });
  if (options.seed !== false) {
    await seedCollections(connection.collections, options.dataset ?? getStandardDataset());
  }
  return {
    ...connection,
    uri,
    stop: async () => {
      await connection.close();
      await memory.stop();
    }
  };
}
