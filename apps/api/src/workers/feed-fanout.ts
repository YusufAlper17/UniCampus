import { Worker, type ConnectionOptions } from 'bullmq';
import { redis } from '../redis.js';
import { QUEUE_NAMES, type FanoutJob } from '../queue/index.js';
import { fanoutPost } from '../services/feed-service.js';

const connection = redis as unknown as ConnectionOptions;

// Feed fan-out worker — post oluşturulunca takipçi timeline'larını Redis'te günceller.
export function startFanoutWorker(): Worker<FanoutJob> {
  const worker = new Worker<FanoutJob>(
    QUEUE_NAMES.fanout,
    async (job) => {
      const { postId, authorId, domain, createdAt } = job.data;
      await fanoutPost({ postId, authorId, domain, createdAt });
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[fanout] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
