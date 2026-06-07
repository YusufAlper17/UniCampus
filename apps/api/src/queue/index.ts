import { Queue, type ConnectionOptions } from 'bullmq';
import { redis } from '../redis.js';

// BullMQ bağlantısı — ioredis instance paylaşılır (maxRetriesPerRequest: null redis.ts'de ayarlı).
// BullMQ kendi ioredis tipini bundle ettiği için cast gerekli; runtime'da aynı instance.
const connection = redis as unknown as ConnectionOptions;

export interface FanoutJob {
  postId: string;
  authorId: string;
  universityId: string;
  domain: 'social' | 'career';
  createdAt: number;
}

export const fanoutQueue = new Queue<FanoutJob>('feed-fanout', { connection });

export interface IndexJob {
  kind: 'user' | 'event' | 'hashtag';
  id: string;
}

export const searchIndexQueue = new Queue<IndexJob>('search-index', { connection });

export interface PushJob {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const pushQueue = new Queue<PushJob>('push-notification', { connection });

export const QUEUE_NAMES = {
  fanout: 'feed-fanout',
  searchIndex: 'search-index',
  push: 'push-notification',
} as const;

export async function enqueueFanout(job: FanoutJob): Promise<void> {
  await fanoutQueue.add('fanout', job, {
    removeOnComplete: 1000,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

// Meili kapalıysa kuyruğa iş eklenmez (gereksiz Redis trafiği yok).
export async function enqueueIndex(job: IndexJob): Promise<void> {
  const { isSearchEnabled } = await import('../lib/search.js');
  if (!isSearchEnabled()) return;
  await searchIndexQueue.add('index', job, { removeOnComplete: 1000, removeOnFail: 500, attempts: 2 });
}

export async function enqueuePush(job: PushJob): Promise<void> {
  if (!job.userIds.length) return;
  await pushQueue.add('push', job, { removeOnComplete: 1000, removeOnFail: 500, attempts: 2 });
}
