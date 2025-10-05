import { startInMemoryMongo } from './index.js';

async function main() {
  const port = Number(process.env.MONGODB_MEMORY_PORT ?? 37017);
  const dbName = process.env.MONGODB_MEMORY_DB ?? 'slowpost-dev';
  const instance = await startInMemoryMongo({ port, dbName, seed: true });
  console.log(`Started in-memory MongoDB at ${instance.uri}`);
  console.log(`Database name: ${dbName}`);

  const shutdown = async () => {
    await instance.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.stdin.resume();
}

main().catch((error) => {
  console.error('Failed to start in-memory MongoDB:', error);
  process.exit(1);
});
