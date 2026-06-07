import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { redis } from '../redis.js';

const trackSchema = z.object({ campaignId: z.string().uuid() });

export const adsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ads/impression', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Geçersiz girdi' } });
    }
    const idempotency = req.headers['idempotency-key'] as string | undefined;
    if (idempotency) {
      const dup = await redis.get(`ad:imp:${idempotency}`);
      if (dup) return reply.send({ recorded: true, duplicate: true });
    }
    await db.insert(schema.adImpressions).values({
      campaignId: parsed.data.campaignId,
      userId: auth.sub,
      universityId: auth.university_id,
    });
    if (idempotency) {
      await redis.setex(`ad:imp:${idempotency}`, 86400, '1');
    }
    return reply.send({ recorded: true });
  });

  app.post('/ads/click', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Geçersiz girdi' } });
    }
    await db.insert(schema.adClicks).values({ campaignId: parsed.data.campaignId, userId: auth.sub });
    return reply.send({ recorded: true });
  });
};
