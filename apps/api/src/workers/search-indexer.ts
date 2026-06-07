import { Worker, type ConnectionOptions } from 'bullmq';
import { eq } from 'drizzle-orm';
import { redis } from '../redis.js';
import { db, schema } from '../db/index.js';
import { QUEUE_NAMES, type IndexJob } from '../queue/index.js';
import { indexEvent, indexHashtag, indexUser } from '../services/search-service.js';
import { ensureSearchIndexes, isSearchEnabled } from '../lib/search.js';

const connection = redis as unknown as ConnectionOptions;

// Search indexer — user/event/hashtag dokümanlarını Meili'ye yazar.
export function startSearchIndexer(): Worker<IndexJob> | null {
  if (!isSearchEnabled()) return null;
  void ensureSearchIndexes();

  const worker = new Worker<IndexJob>(
    QUEUE_NAMES.searchIndex,
    async (job) => {
      const { kind, id } = job.data;
      if (kind === 'user') {
        const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
        if (u) await indexUser(u);
      } else if (kind === 'event') {
        const [e] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
        if (e) await indexEvent(e);
      } else if (kind === 'hashtag') {
        const [h] = await db.select().from(schema.hashtags).where(eq(schema.hashtags.id, id)).limit(1);
        if (h) await indexHashtag(h);
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[search-index] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
