import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

/** Dual feed timeline key'leri — sosyal ve kariyer AYRI (sızıntı imkansız). */
export const feedKey = (domain: 'social' | 'career', userId: string) => `feed:${domain}:${userId}`;
export const trendingKey = (universityId: string) => `trending:${universityId}`;
export const dealsKey = (universityId: string) => `deals:${universityId}`;
export const adsKey = (universityId: string) => `ads:active:${universityId}`;
export const profileKey = (userId: string) => `user:${userId}:profile`;
