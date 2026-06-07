import { buildApp } from './app.js';
import { env } from './env.js';
import { startFanoutWorker } from './workers/feed-fanout.js';
import { startSearchIndexer } from './workers/search-indexer.js';
import { startPushWorker } from './workers/push-notification.js';

async function main() {
  const app = await buildApp();

  // Worker'lar API süreciyle birlikte çalışır (MVP). Ölçekte ayrı süreç.
  const fanoutWorker = startFanoutWorker();
  const searchWorker = startSearchIndexer();
  const pushWorker = startPushWorker();

  const shutdown = async () => {
    await fanoutWorker.close();
    if (searchWorker) await searchWorker.close();
    await pushWorker.close();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`UniCampus API → http://localhost:${env.PORT}/v1/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
