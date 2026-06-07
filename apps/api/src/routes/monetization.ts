import { desc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { audit, requireAdmin } from '../lib/admin.js';
import { invalidateAdsCache } from '../services/ad-service.js';
import { invalidateDealsCache } from '../services/deals-service.js';

const sponsorSchema = z.object({
  brandName: z.string().min(1).max(120),
  logoUrl: z.string().url().optional(),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

const dealSchema = z.object({
  sponsorId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  bannerUrl: z.string().url().optional(),
  discountCode: z.string().max(50).optional(),
  discountValue: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  targetUniversities: z.array(z.string().uuid()).optional(),
  usageLimit: z.number().int().positive().optional(),
  sponsorUrl: z.string().url().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

const adSchema = z.object({
  sponsorId: z.string().uuid(),
  title: z.string().min(1).max(200),
  mediaUrl: z.string().url(),
  ctaText: z.string().max(50).optional(),
  targetUrl: z.string().url().optional(),
  targeting: z.record(z.unknown()).optional(),
  feedPositionInterval: z.number().int().min(3).max(20).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const monetizationRoutes: FastifyPluginAsync = async (app) => {
  // ---- Sponsors ----
  app.get('/admin/sponsors', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const rows = await db.select().from(schema.sponsors).orderBy(desc(schema.sponsors.createdAt)).limit(100);
    return reply.send({ items: rows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })) });
  });

  app.post('/admin/sponsors', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const parsed = sponsorSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Geçersiz girdi' } });
    }
    const [sponsor] = await db.insert(schema.sponsors).values(parsed.data).returning();
    await audit(auth.sub, 'sponsor.create', { type: 'sponsor', id: sponsor!.id });
    return reply.code(201).send({ sponsor });
  });

  // ---- Deals ----
  app.get('/admin/deals', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const rows = await db
      .select({ deal: schema.deals, brandName: schema.sponsors.brandName })
      .from(schema.deals)
      .innerJoin(schema.sponsors, eq(schema.sponsors.id, schema.deals.sponsorId))
      .orderBy(desc(schema.deals.createdAt))
      .limit(100);
    return reply.send({
      items: rows.map((r) => ({
        ...r.deal,
        brandName: r.brandName,
        createdAt: r.deal.createdAt.toISOString(),
        startsAt: r.deal.startsAt?.toISOString() ?? null,
        endsAt: r.deal.endsAt?.toISOString() ?? null,
      })),
    });
  });

  app.post('/admin/deals', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const parsed = dealSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Geçersiz girdi' } });
    }
    const input = parsed.data;
    const [deal] = await db
      .insert(schema.deals)
      .values({
        sponsorId: input.sponsorId,
        title: input.title,
        description: input.description,
        bannerUrl: input.bannerUrl,
        discountCode: input.discountCode ?? `UC${Date.now().toString(36).toUpperCase()}`,
        discountValue: input.discountValue,
        category: input.category,
        targetUniversities: input.targetUniversities ?? [],
        usageLimit: input.usageLimit,
        sponsorUrl: input.sponsorUrl,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        status: 'draft',
      })
      .returning();
    await audit(auth.sub, 'deal.create', { type: 'deal', id: deal!.id });
    return reply.code(201).send({ deal });
  });

  app.patch('/admin/deals/:id/publish', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [deal] = await db
      .update(schema.deals)
      .set({ status: 'active' })
      .where(eq(schema.deals.id, id))
      .returning();
    if (!deal) return reply.code(404).send({ error: { code: 'not_found', message: 'Kampanya yok' } });
    await invalidateDealsCache(deal.targetUniversities.length ? deal.targetUniversities : ['*']);
    await audit(auth.sub, 'deal.publish', { type: 'deal', id });
    return reply.send({ status: 'active' });
  });

  app.patch('/admin/deals/:id/pause', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [deal] = await db
      .update(schema.deals)
      .set({ status: 'paused' })
      .where(eq(schema.deals.id, id))
      .returning();
    if (!deal) return reply.code(404).send({ error: { code: 'not_found', message: 'Kampanya yok' } });
    await invalidateDealsCache(deal.targetUniversities.length ? deal.targetUniversities : ['*']);
    await audit(auth.sub, 'deal.pause', { type: 'deal', id });
    return reply.send({ status: 'paused' });
  });

  // ---- Ads ----
  app.get('/admin/ads', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const rows = await db
      .select({ campaign: schema.adCampaigns, brandName: schema.sponsors.brandName })
      .from(schema.adCampaigns)
      .innerJoin(schema.sponsors, eq(schema.sponsors.id, schema.adCampaigns.sponsorId))
      .orderBy(desc(schema.adCampaigns.createdAt))
      .limit(100);
    return reply.send({
      items: rows.map((r) => ({
        ...r.campaign,
        brandName: r.brandName,
        createdAt: r.campaign.createdAt.toISOString(),
        startsAt: r.campaign.startsAt?.toISOString() ?? null,
        endsAt: r.campaign.endsAt?.toISOString() ?? null,
      })),
    });
  });

  app.post('/admin/ads', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const parsed = adSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Geçersiz girdi' } });
    }
    const input = parsed.data;
    const [campaign] = await db
      .insert(schema.adCampaigns)
      .values({
        sponsorId: input.sponsorId,
        title: input.title,
        mediaUrl: input.mediaUrl,
        ctaText: input.ctaText,
        targetUrl: input.targetUrl,
        targeting: JSON.stringify(input.targeting ?? {}),
        feedPositionInterval: input.feedPositionInterval ?? 5,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        status: 'draft',
      })
      .returning();
    await audit(auth.sub, 'ad.create', { type: 'ad_campaign', id: campaign!.id });
    return reply.code(201).send({ campaign });
  });

  app.patch('/admin/ads/:id/publish', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [campaign] = await db
      .update(schema.adCampaigns)
      .set({ status: 'active' })
      .where(eq(schema.adCampaigns.id, id))
      .returning();
    if (!campaign) return reply.code(404).send({ error: { code: 'not_found', message: 'Kampanya yok' } });
    await invalidateAdsCache();
    await audit(auth.sub, 'ad.publish', { type: 'ad_campaign', id });
    return reply.send({ status: 'active' });
  });

  app.patch('/admin/ads/:id/pause', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [campaign] = await db
      .update(schema.adCampaigns)
      .set({ status: 'paused' })
      .where(eq(schema.adCampaigns.id, id))
      .returning();
    if (!campaign) return reply.code(404).send({ error: { code: 'not_found', message: 'Kampanya yok' } });
    await invalidateAdsCache();
    await audit(auth.sub, 'ad.pause', { type: 'ad_campaign', id });
    return reply.send({ status: 'paused' });
  });

  // ---- Analytics ----
  app.get('/admin/analytics/overview', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;

    const [impRow, clickRow, redRow, dealClickRow] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(schema.adImpressions),
      db.select({ c: sql<number>`count(*)::int` }).from(schema.adClicks),
      db.select({ c: sql<number>`count(*)::int` }).from(schema.dealRedemptions),
      db.select({ c: sql<number>`count(*)::int` }).from(schema.dealClicks),
    ]);

    return reply.send({
      ads: { impressions: impRow[0]?.c ?? 0, clicks: clickRow[0]?.c ?? 0 },
      deals: { redemptions: redRow[0]?.c ?? 0, clicks: dealClickRow[0]?.c ?? 0 },
    });
  });
};
