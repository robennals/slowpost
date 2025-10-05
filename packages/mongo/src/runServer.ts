import { connectToMongoStore } from './index.js';
import { createServer } from '@slowpost/server';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? 'slowpost';
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  const port = Number(process.env.PORT ?? 3001);
  const connection = await connectToMongoStore({ uri, dbName });
  const app = createServer(connection.store);

  const server = app.listen(port, () => {
    console.log(`Slowpost API listening on http://localhost:${port}`);
    console.log(`Connected to MongoDB at ${uri} (database: ${dbName}).`);
  });

  const shutdown = async () => {
    await connection.close();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start Slowpost API server:', error);
  process.exit(1);
});
