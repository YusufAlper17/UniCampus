import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { createReportSchema } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';

export const reportRoutes: FastifyPluginAsync = async (app) => {
  // İçerik/kullanıcı şikayeti oluştur (Faz 9 — Trust & Safety).
  app.post('/reports', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;

    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;

    // Aynı hedefe tekrarlayan şikayet engeli.
    const [existing] = await db
      .select({ id: schema.reports.id })
      .from(schema.reports)
      .where(
        and(
          eq(schema.reports.reporterId, auth.sub),
          eq(schema.reports.targetType, input.targetType),
          eq(schema.reports.targetId, input.targetId),
          eq(schema.reports.status, 'open'),
        ),
      )
      .limit(1);
    if (existing) {
      return reply
        .code(409)
        .send({ error: { code: 'already_reported', message: 'Bu içerik zaten şikayet edildi' } });
    }

    const [report] = await db
      .insert(schema.reports)
      .values({
        reporterId: auth.sub,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details,
      })
      .returning();

    return reply.code(201).send({
      report: {
        id: report!.id,
        targetType: report!.targetType,
        targetId: report!.targetId,
        reason: report!.reason,
        status: report!.status,
        createdAt: report!.createdAt.toISOString(),
      },
    });
  });
};
