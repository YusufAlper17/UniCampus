import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { listActiveDeals } from '../services/deals-service.js';

export const dealsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/deals', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { category } = req.query as { category?: string };
    const items = await listActiveDeals(auth.university_id, category);
    return reply.send({
      items: items.map((d) => ({
        ...d,
        endsAt: d.endsAt?.toISOString() ?? null,
      })),
    });
  });

  app.get('/deals/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [row] = await db
      .select({
        deal: schema.deals,
        brandName: schema.sponsors.brandName,
        logoUrl: schema.sponsors.logoUrl,
      })
      .from(schema.deals)
      .innerJoin(schema.sponsors, eq(schema.sponsors.id, schema.deals.sponsorId))
      .where(eq(schema.deals.id, id))
      .limit(1);
    if (!row || row.deal.status !== 'active') {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kampanya bulunamadı' } });
    }
    return reply.send({
      deal: {
        id: row.deal.id,
        sponsorId: row.deal.sponsorId,
        title: row.deal.title,
        description: row.deal.description,
        bannerUrl: row.deal.bannerUrl,
        category: row.deal.category,
        discountValue: row.deal.discountValue,
        sponsorUrl: row.deal.sponsorUrl,
        endsAt: row.deal.endsAt?.toISOString() ?? null,
        brandName: row.brandName,
        logoUrl: row.logoUrl,
      },
    });
  });

  app.post('/deals/:id/reveal', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, id)).limit(1);
    if (!deal || deal.status !== 'active') {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kampanya bulunamadı' } });
    }
    if (deal.usageLimit != null && deal.usedCount >= deal.usageLimit) {
      return reply.code(410).send({ error: { code: 'expired', message: 'Kampanya sona erdi' } });
    }

    const existing = await db
      .select()
      .from(schema.dealRedemptions)
      .where(and(eq(schema.dealRedemptions.dealId, id), eq(schema.dealRedemptions.userId, auth.sub)))
      .limit(1);

    if (!existing.length) {
      await db.insert(schema.dealRedemptions).values({ dealId: id, userId: auth.sub }).onConflictDoNothing();
      await db
        .update(schema.deals)
        .set({ usedCount: deal.usedCount + 1 })
        .where(eq(schema.deals.id, id));
    }

    return reply.send({ discountCode: deal.discountCode ?? '', sponsorUrl: deal.sponsorUrl });
  });

  app.post('/deals/:id/click', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, id)).limit(1);
    if (!deal) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kampanya bulunamadı' } });
    }
    await db.insert(schema.dealClicks).values({ dealId: id, userId: auth.sub });
    return reply.send({ url: deal.sponsorUrl ?? '' });
  });
};
