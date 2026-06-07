import { and, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { createEventSchema } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { createLinkedPost } from '../services/post-service.js';
import { enqueueIndex } from '../queue/index.js';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  // Etkinlik oluştur — content_domain her zaman SOSYAL.
  app.post('/events', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;

    const post = await createLinkedPost({
      universityId: auth.university_id,
      authorId: auth.sub,
      type: 'event',
      contentDomain: 'social',
      content: input.title + (input.description ? `\n${input.description}` : ''),
    });

    const [event] = await db
      .insert(schema.events)
      .values({
        universityId: auth.university_id,
        organizerId: auth.sub,
        postId: post.id,
        title: input.title,
        description: input.description,
        scope: input.scope,
        locationText: input.locationText,
        locationLat: input.locationLat != null ? String(input.locationLat) : undefined,
        locationLng: input.locationLng != null ? String(input.locationLng) : undefined,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        capacity: input.capacity ?? undefined,
        isPaid: input.isPaid,
        price: input.price != null ? String(input.price) : undefined,
        participationType: input.participationType,
      })
      .returning();
    if (!event) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
    }

    await enqueueIndex({ kind: 'event', id: event.id });

    return reply.code(201).send({ event: serializeEvent(event), postId: post.id });
  });

  app.get('/events/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
    if (!event || event.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Etkinlik yok' } });
    }
    const [me] = await db
      .select({ status: schema.eventParticipants.status })
      .from(schema.eventParticipants)
      .where(and(eq(schema.eventParticipants.eventId, id), eq(schema.eventParticipants.userId, auth.sub)))
      .limit(1);
    return reply.send({ event: { ...serializeEvent(event), myStatus: me?.status ?? null } });
  });

  // Etkinliğe katıl — kapasite + katılım tipi kontrolü.
  app.post('/events/:id/join', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };

    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
    if (!event || event.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Etkinlik yok' } });
    }

    if (event.capacity != null && event.participantCount >= event.capacity) {
      return reply.code(409).send({ error: { code: 'event_full', message: 'Etkinlik dolu' } });
    }

    // invite-only → doğrudan katılım yok; open → joined; approval → pending.
    if (event.participationType === 'invite') {
      return reply
        .code(403)
        .send({ error: { code: 'invite_only', message: 'Bu etkinlik yalnızca davetle' } });
    }
    const status = event.participationType === 'approval' ? 'pending' : 'joined';

    const inserted = await db
      .insert(schema.eventParticipants)
      .values({ eventId: id, userId: auth.sub, status })
      .onConflictDoNothing()
      .returning();

    if (inserted.length && status === 'joined') {
      await db
        .update(schema.events)
        .set({ participantCount: sql`${schema.events.participantCount} + 1` })
        .where(eq(schema.events.id, id));
    }
    return reply.send({ status });
  });

  // Katılımı iptal et.
  app.post('/events/:id/leave', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const removed = await db
      .delete(schema.eventParticipants)
      .where(and(eq(schema.eventParticipants.eventId, id), eq(schema.eventParticipants.userId, auth.sub)))
      .returning({ status: schema.eventParticipants.status });
    if (removed[0]?.status === 'joined') {
      await db
        .update(schema.events)
        .set({ participantCount: sql`greatest(${schema.events.participantCount} - 1, 0)` })
        .where(eq(schema.events.id, id));
    }
    return reply.send({ success: true });
  });
};

export function serializeEvent(e: typeof schema.events.$inferSelect) {
  return {
    id: e.id,
    universityId: e.universityId,
    organizerId: e.organizerId,
    postId: e.postId ?? undefined,
    title: e.title,
    description: e.description ?? undefined,
    coverUrl: e.coverUrl ?? undefined,
    scope: e.scope,
    locationText: e.locationText ?? undefined,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString(),
    capacity: e.capacity ?? undefined,
    isPaid: e.isPaid,
    price: e.price != null ? Number(e.price) : undefined,
    participationType: e.participationType,
    participantCount: e.participantCount,
    createdAt: e.createdAt.toISOString(),
  };
}
