import { connectToMongoStore } from '@slowpost/data';
import { createServer } from './server.js';

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
  });

  const shutdown = async () => {
    await connection.close();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

await main();
