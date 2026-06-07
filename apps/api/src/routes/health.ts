import { sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { redis } from '../redis.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    let redisOk = false;
    try {
      redisOk = (await redis.ping()) === 'PONG';
    } catch {
      redisOk = false;
    }
    return {
      status: 'ok',
      service: 'unicampus-api',
      time: new Date().toISOString(),
      redis: redisOk,
    };
  });

  // Lansman readiness (Faz 12) — DB + Redis derin kontrol; orchestrator probe'u.
  app.get('/health/ready', async (_req, reply) => {
    let dbOk = false;
    let redisOk = false;
    try {
      await db.execute(sql`select 1`);
      dbOk = true;
    } catch {
      dbOk = false;
    }
    try {
      redisOk = (await redis.ping()) === 'PONG';
    } catch {
      redisOk = false;
    }
    const ready = dbOk && redisOk;
    return reply.code(ready ? 200 : 503).send({
      ready,
      checks: { db: dbOk, redis: redisOk },
      time: new Date().toISOString(),
    });
  });
};
