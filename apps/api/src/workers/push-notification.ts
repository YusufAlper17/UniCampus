import { Worker, type ConnectionOptions } from 'bullmq';
import { inArray } from 'drizzle-orm';
import { redis } from '../redis.js';
import { db, schema } from '../db/index.js';
import { QUEUE_NAMES, type PushJob } from '../queue/index.js';

const connection = redis as unknown as ConnectionOptions;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Push worker — kullanıcı cihaz token'larına Expo push gönderir (best-effort).
export function startPushWorker(): Worker<PushJob> {
  const worker = new Worker<PushJob>(
    QUEUE_NAMES.push,
    async (job) => {
      const { userIds, title, body, data } = job.data;
      const tokens = await db
        .select({ pushToken: schema.devices.pushToken })
        .from(schema.devices)
        .where(inArray(schema.devices.userId, userIds));
      if (!tokens.length) return;

      const messages = tokens.map((t) => ({
        to: t.pushToken,
        title,
        body,
        data: data ?? {},
        sound: 'default',
      }));

      try {
        await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(messages),
        });
      } catch (err) {
        console.error('[push] send failed:', (err as Error).message);
      }
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    console.error(`[push] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
