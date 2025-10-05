import { startInMemoryMongo } from '@slowpost/data';
import { createServer } from './server.js';

async function main() {
  const port = Number(process.env.PORT ?? 3001);
  const mongo = await startInMemoryMongo();
  const app = createServer(mongo.store);

  const server = app.listen(port, () => {
    console.log(`Slowpost API listening on http://localhost:${port}`);
    console.log('Loaded in-memory MongoDB with the standard Slowpost dataset.');
  });

  const shutdown = async () => {
    await mongo.stop();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

await main();
