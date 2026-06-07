import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  createMilestoneSchema,
  createOpportunitySchema,
  createProjectSchema,
} from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { createLinkedPost } from '../services/post-service.js';
import { enqueuePush } from '../queue/index.js';

/**
 * Kariyer içerikleri — content_domain her zaman CAREER (sosyal akışa sızmaz).
 * Fırsat ilanları moderasyon kuyruğuna düşer (Faz 7 admin onayı).
 */
export const careerRoutes: FastifyPluginAsync = async (app) => {
  app.post('/career/projects', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;
    const post = await createLinkedPost({
      universityId: auth.university_id,
      authorId: auth.sub,
      type: 'project',
      contentDomain: 'career',
      content: input.title + (input.description ? `\n${input.description}` : ''),
      mediaUrls: input.mediaUrls,
    });
    const [project] = await db
      .insert(schema.careerProjects)
      .values({
        userId: auth.sub,
        postId: post.id,
        title: input.title,
        role: input.role,
        description: input.description,
        techTags: input.techTags,
        githubUrl: input.githubUrl,
        demoUrl: input.demoUrl,
        mediaUrls: input.mediaUrls,
      })
      .returning();
    return reply.code(201).send({ project, postId: post.id });
  });

  app.post('/career/milestones', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createMilestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;
    const post = await createLinkedPost({
      universityId: auth.university_id,
      authorId: auth.sub,
      type: 'milestone',
      contentDomain: 'career',
      content: input.title + (input.description ? `\n${input.description}` : ''),
    });
    const [milestone] = await db
      .insert(schema.careerMilestones)
      .values({
        userId: auth.sub,
        postId: post.id,
        title: input.title,
        description: input.description,
        occurredOn: input.occurredOn ? new Date(input.occurredOn) : undefined,
      })
      .returning();
    return reply.code(201).send({ milestone, postId: post.id });
  });

  // Fırsat ilanı — moderasyon kuyruğuna düşer; onaylanana kadar feed'e fan-out edilmez.
  app.post('/career/opportunities', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createOpportunitySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;
    const [opportunity] = await db
      .insert(schema.careerOpportunities)
      .values({
        universityId: auth.university_id,
        userId: auth.sub,
        title: input.title,
        description: input.description,
        type: input.type,
        company: input.company,
        location: input.location,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        applyUrl: input.applyUrl,
        moderationStatus: 'pending',
      })
      .returning();
    return reply.code(201).send({
      opportunity,
      moderation: 'pending',
      message: 'Fırsat ilanı moderasyon onayından sonra yayınlanacak',
    });
  });

  // Onaylı fırsat ilanları listesi.
  app.get('/career/opportunities', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const rows = await db
      .select()
      .from(schema.careerOpportunities)
      .where(
        and(
          eq(schema.careerOpportunities.universityId, auth.university_id),
          eq(schema.careerOpportunities.moderationStatus, 'approved'),
        ),
      )
      .orderBy(desc(schema.careerOpportunities.createdAt))
      .limit(30);
    return reply.send({ items: rows });
  });

  // Bir kullanıcının kariyer projeleri.
  app.get('/career/users/:userId/projects', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { userId } = req.params as { userId: string };
    const rows = await db
      .select()
      .from(schema.careerProjects)
      .where(eq(schema.careerProjects.userId, userId))
      .orderBy(desc(schema.careerProjects.createdAt));
    return reply.send({ items: rows });
  });

  // Proje detayı (Faz 11) — proje + sahibi.
  app.get('/career/projects/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [row] = await db
      .select({
        project: schema.careerProjects,
        authorId: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        careerHeadline: schema.users.careerHeadline,
        isVerifiedStudent: schema.users.isVerifiedStudent,
        universityId: schema.users.universityId,
      })
      .from(schema.careerProjects)
      .innerJoin(schema.users, eq(schema.users.id, schema.careerProjects.userId))
      .where(eq(schema.careerProjects.id, id))
      .limit(1);
    if (!row || row.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Proje bulunamadı' } });
    }
    return reply.send({
      project: row.project,
      author: {
        id: row.authorId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl ?? undefined,
        careerHeadline: row.careerHeadline ?? undefined,
        isVerifiedStudent: row.isVerifiedStudent,
      },
    });
  });

  // Bir kullanıcının milestone'ları (tebrik durumu dahil).
  app.get('/career/users/:userId/milestones', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { userId } = req.params as { userId: string };
    const rows = await db
      .select()
      .from(schema.careerMilestones)
      .where(eq(schema.careerMilestones.userId, userId))
      .orderBy(desc(schema.careerMilestones.createdAt));
    if (!rows.length) return reply.send({ items: [] });

    const myCongrats = await db
      .select({ milestoneId: schema.careerCongrats.milestoneId })
      .from(schema.careerCongrats)
      .where(
        and(
          eq(schema.careerCongrats.userId, auth.sub),
          inArray(
            schema.careerCongrats.milestoneId,
            rows.map((m) => m.id),
          ),
        ),
      );
    const congratulated = new Set(myCongrats.map((c) => c.milestoneId));

    return reply.send({
      items: rows.map((m) => ({
        id: m.id,
        userId: m.userId,
        title: m.title,
        description: m.description ?? undefined,
        occurredOn: m.occurredOn?.toISOString(),
        congratsCount: m.congratsCount,
        congratulatedByMe: congratulated.has(m.id),
        createdAt: m.createdAt.toISOString(),
      })),
    });
  });

  // Milestone tebrik et (Faz 11) — bir kez; sahibe bildirim.
  app.post('/career/milestones/:id/congrats', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const [milestone] = await db
      .select()
      .from(schema.careerMilestones)
      .where(eq(schema.careerMilestones.id, id))
      .limit(1);
    if (!milestone) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Başarı bulunamadı' } });
    }
    const inserted = await db
      .insert(schema.careerCongrats)
      .values({ milestoneId: id, userId: auth.sub })
      .onConflictDoNothing()
      .returning({ milestoneId: schema.careerCongrats.milestoneId });

    if (!inserted.length) {
      return reply.send({ congratsCount: milestone.congratsCount, congratulated: true });
    }

    const [updated] = await db
      .update(schema.careerMilestones)
      .set({ congratsCount: sql`${schema.careerMilestones.congratsCount} + 1` })
      .where(eq(schema.careerMilestones.id, id))
      .returning({ congratsCount: schema.careerMilestones.congratsCount });

    if (milestone.userId !== auth.sub) {
      await enqueuePush({
        userIds: [milestone.userId],
        title: 'Tebrikler! 🎉',
        body: `Bir başarın tebrik aldı: ${milestone.title}`,
        data: { milestoneId: id },
      });
    }

    return reply.send({ congratsCount: updated?.congratsCount ?? milestone.congratsCount + 1, congratulated: true });
  });
};
