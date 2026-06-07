import { and, desc, eq, gt, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { audit, requireAdmin } from '../lib/admin.js';
import { revokeAllUserTokens } from '../lib/tokens.js';

const suspendSchema = z.object({
  days: z.number().int().min(1).max(365).default(7),
  note: z.string().max(500).optional(),
});
const banSchema = z.object({ note: z.string().max(500).optional() });
const resolveReportSchema = z.object({ status: z.enum(['resolved', 'dismissed']) });

async function countOf(table: PgTable, where?: SQL): Promise<number> {
  const [row] = await db.select({ c: sql<number>`count(*)::int` }).from(table).where(where);
  return row?.c ?? 0;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // KPI paneli — platform geneli (üniversite filtresi yok).
  app.get('/admin/dashboard/stats', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'moderator');
    if (!auth) return;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      newUsers,
      totalPosts,
      socialPosts,
      careerPosts,
      totalCommunities,
      openReports,
      pendingOpportunities,
    ] = await Promise.all([
      countOf(schema.users),
      countOf(schema.users, eq(schema.users.status, 'active')),
      countOf(schema.users, eq(schema.users.status, 'suspended')),
      countOf(schema.users, eq(schema.users.status, 'banned')),
      countOf(schema.users, gt(schema.users.createdAt, weekAgo)),
      countOf(schema.posts),
      countOf(schema.posts, eq(schema.posts.contentDomain, 'social')),
      countOf(schema.posts, eq(schema.posts.contentDomain, 'career')),
      countOf(schema.communities),
      countOf(schema.reports, eq(schema.reports.status, 'open')),
      countOf(schema.careerOpportunities, eq(schema.careerOpportunities.moderationStatus, 'pending')),
    ]);

    return reply.send({
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers, new7d: newUsers },
      posts: { total: totalPosts, social: socialPosts, career: careerPosts },
      communities: totalCommunities,
      moderation: { openReports, pendingOpportunities },
    });
  });

  // Kullanıcı listesi — arama, durum filtresi, cursor.
  app.get('/admin/users', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'moderator');
    if (!auth) return;
    const { q, status, cursor, limit: rawLimit } = req.query as {
      q?: string;
      status?: string;
      cursor?: string;
      limit?: string;
    };
    const limit = Math.min(Number(rawLimit) || 25, 100);
    const cursorMs = cursor ? Number(cursor) : null;
    const statusFilter = ['active', 'suspended', 'banned', 'pending_approval', 'deleted'].includes(
      status ?? '',
    )
      ? (status as 'active')
      : null;

    const rows = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        type: schema.users.type,
        status: schema.users.status,
        universityId: schema.users.universityId,
        followerCount: schema.users.followerCount,
        postCount: schema.users.postCount,
        suspendedUntil: schema.users.suspendedUntil,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(
        and(
          q ? or(ilike(schema.users.username, `%${q}%`), ilike(schema.users.displayName, `%${q}%`)) : undefined,
          statusFilter ? eq(schema.users.status, statusFilter) : undefined,
          cursorMs ? lt(schema.users.createdAt, new Date(cursorMs)) : undefined,
        ),
      )
      .orderBy(desc(schema.users.createdAt))
      .limit(limit);

    const last = rows[rows.length - 1];
    const nextCursor = rows.length === limit && last ? String(last.createdAt.getTime()) : null;
    return reply.send({
      items: rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), suspendedUntil: u.suspendedUntil?.toISOString() ?? null })),
      nextCursor,
    });
  });

  // Askıya al (süreli).
  app.post('/admin/users/:id/suspend', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const parsed = suspendSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Geçersiz girdi' } });
    }
    const until = new Date(Date.now() + parsed.data.days * 86_400_000);
    const [updated] = await db
      .update(schema.users)
      .set({ status: 'suspended', suspendedUntil: until, moderationNote: parsed.data.note, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    if (!updated) return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    await revokeAllUserTokens(id);
    await audit(auth.sub, 'user.suspend', { type: 'user', id }, { days: parsed.data.days, note: parsed.data.note });
    return reply.send({ status: 'suspended', until: until.toISOString() });
  });

  // Yasakla (kalıcı).
  app.post('/admin/users/:id/ban', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const parsed = banSchema.safeParse(req.body ?? {});
    const [updated] = await db
      .update(schema.users)
      .set({ status: 'banned', moderationNote: parsed.success ? parsed.data.note : undefined, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    if (!updated) return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    await revokeAllUserTokens(id);
    await audit(auth.sub, 'user.ban', { type: 'user', id });
    return reply.send({ status: 'banned' });
  });

  // Yeniden aktifleştir.
  app.post('/admin/users/:id/activate', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [updated] = await db
      .update(schema.users)
      .set({ status: 'active', suspendedUntil: null, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    if (!updated) return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    await audit(auth.sub, 'user.activate', { type: 'user', id });
    return reply.send({ status: 'active' });
  });

  // Moderasyon kuyruğu — bekleyen fırsat ilanları + açık şikayetler.
  app.get('/admin/moderation/queue', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'moderator');
    if (!auth) return;

    const opportunities = await db
      .select({
        id: schema.careerOpportunities.id,
        title: schema.careerOpportunities.title,
        company: schema.careerOpportunities.company,
        type: schema.careerOpportunities.type,
        createdAt: schema.careerOpportunities.createdAt,
        authorUsername: schema.users.username,
      })
      .from(schema.careerOpportunities)
      .innerJoin(schema.users, eq(schema.users.id, schema.careerOpportunities.userId))
      .where(eq(schema.careerOpportunities.moderationStatus, 'pending'))
      .orderBy(desc(schema.careerOpportunities.createdAt))
      .limit(50);

    const openReports = await db
      .select({
        id: schema.reports.id,
        targetType: schema.reports.targetType,
        targetId: schema.reports.targetId,
        reason: schema.reports.reason,
        details: schema.reports.details,
        status: schema.reports.status,
        createdAt: schema.reports.createdAt,
        reporterUsername: schema.users.username,
      })
      .from(schema.reports)
      .innerJoin(schema.users, eq(schema.users.id, schema.reports.reporterId))
      .where(inArray(schema.reports.status, ['open', 'reviewing']))
      .orderBy(desc(schema.reports.createdAt))
      .limit(50);

    return reply.send({
      opportunities: opportunities.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
      reports: openReports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  });

  // Fırsat ilanı onayla / reddet.
  app.post('/admin/moderation/opportunities/:id/:decision', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'moderator');
    if (!auth) return;
    const { id, decision } = req.params as { id: string; decision: string };
    if (decision !== 'approve' && decision !== 'reject') {
      return reply.code(400).send({ error: { code: 'invalid', message: 'Geçersiz karar' } });
    }
    const next = decision === 'approve' ? 'approved' : 'rejected';
    const [updated] = await db
      .update(schema.careerOpportunities)
      .set({ moderationStatus: next })
      .where(eq(schema.careerOpportunities.id, id))
      .returning({ id: schema.careerOpportunities.id });
    if (!updated) return reply.code(404).send({ error: { code: 'not_found', message: 'İlan yok' } });
    await audit(auth.sub, `opportunity.${decision}`, { type: 'opportunity', id });
    return reply.send({ status: next });
  });

  // Şikayeti çöz / reddet.
  app.post('/admin/reports/:id/resolve', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'moderator');
    if (!auth) return;
    const { id } = req.params as { id: string };
    const parsed = resolveReportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Geçersiz girdi' } });
    }
    const [updated] = await db
      .update(schema.reports)
      .set({ status: parsed.data.status, resolvedBy: auth.sub, resolvedAt: new Date() })
      .where(eq(schema.reports.id, id))
      .returning({ id: schema.reports.id });
    if (!updated) return reply.code(404).send({ error: { code: 'not_found', message: 'Şikayet yok' } });
    await audit(auth.sub, `report.${parsed.data.status}`, { type: 'report', id });
    return reply.send({ status: parsed.data.status });
  });

  // Denetim günlüğü.
  app.get('/admin/audit-logs', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAdmin(req, reply, 'admin');
    if (!auth) return;
    const rows = await db
      .select({
        id: schema.adminAuditLogs.id,
        action: schema.adminAuditLogs.action,
        targetType: schema.adminAuditLogs.targetType,
        targetId: schema.adminAuditLogs.targetId,
        metadata: schema.adminAuditLogs.metadata,
        createdAt: schema.adminAuditLogs.createdAt,
        adminUsername: schema.users.username,
      })
      .from(schema.adminAuditLogs)
      .innerJoin(schema.users, eq(schema.users.id, schema.adminAuditLogs.adminId))
      .orderBy(desc(schema.adminAuditLogs.createdAt))
      .limit(100);
    return reply.send({ items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
  });
};
