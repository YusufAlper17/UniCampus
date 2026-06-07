import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { createPollSchema, votePollSchema, type PollData } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';
import { createLinkedPost } from '../services/post-service.js';

export const pollRoutes: FastifyPluginAsync = async (app) => {
  // Anket oluştur — content_domain her zaman SOSYAL.
  app.post('/polls', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = createPollSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;

    const post = await createLinkedPost({
      universityId: auth.university_id,
      authorId: auth.sub,
      type: 'poll',
      contentDomain: 'social',
      content: input.question,
    });

    const endsAt = new Date(Date.now() + input.durationHours * 3600 * 1000);
    const [poll] = await db
      .insert(schema.polls)
      .values({
        postId: post.id,
        question: input.question,
        multiChoice: input.multiChoice,
        isAnonymous: input.isAnonymous,
        endsAt,
      })
      .returning();
    if (!poll) {
      return reply.code(500).send({ error: { code: 'server_error', message: 'Oluşturulamadı' } });
    }

    await db.insert(schema.pollOptions).values(
      input.options.map((text, i) => ({ pollId: poll.id, text, position: i })),
    );

    const data = await loadPoll(poll.id, auth.sub);
    return reply.code(201).send({ poll: data, postId: post.id });
  });

  app.get('/polls/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const data = await loadPoll(id, auth.sub);
    if (!data) return reply.code(404).send({ error: { code: 'not_found', message: 'Anket yok' } });
    return reply.send({ poll: data });
  });

  // Oy ver — tek/çok seçim, çift oy engeli, süre kontrolü.
  app.post('/polls/:id/vote', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    const parsed = votePollSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }

    const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, id)).limit(1);
    if (!poll) return reply.code(404).send({ error: { code: 'not_found', message: 'Anket yok' } });
    if (poll.endsAt.getTime() < Date.now()) {
      return reply.code(409).send({ error: { code: 'poll_ended', message: 'Anket süresi doldu' } });
    }

    let optionIds = parsed.data.optionIds;
    if (!poll.multiChoice) optionIds = optionIds.slice(0, 1);

    // Seçenekler bu ankete ait mi?
    const valid = await db
      .select({ id: schema.pollOptions.id })
      .from(schema.pollOptions)
      .where(and(eq(schema.pollOptions.pollId, id), inArray(schema.pollOptions.id, optionIds)));
    if (valid.length !== optionIds.length) {
      return reply.code(422).send({ error: { code: 'invalid_option', message: 'Geçersiz seçenek' } });
    }

    // Zaten oy verdiyse engelle (idempotent).
    const [existing] = await db
      .select({ optionId: schema.pollVotes.optionId })
      .from(schema.pollVotes)
      .where(and(eq(schema.pollVotes.pollId, id), eq(schema.pollVotes.userId, auth.sub)))
      .limit(1);
    if (existing) {
      return reply.code(409).send({ error: { code: 'already_voted', message: 'Zaten oy verdin' } });
    }

    await db
      .insert(schema.pollVotes)
      .values(optionIds.map((optionId) => ({ optionId, userId: auth.sub, pollId: id })));
    for (const optionId of optionIds) {
      await db
        .update(schema.pollOptions)
        .set({ voteCount: sql`${schema.pollOptions.voteCount} + 1` })
        .where(eq(schema.pollOptions.id, optionId));
    }
    await db
      .update(schema.polls)
      .set({ totalVotes: sql`${schema.polls.totalVotes} + 1` })
      .where(eq(schema.polls.id, id));

    const data = await loadPoll(id, auth.sub);
    return reply.send({ poll: data });
  });
};

export async function loadPoll(pollId: string, userId: string): Promise<PollData | null> {
  const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, pollId)).limit(1);
  if (!poll) return null;
  const options = await db
    .select()
    .from(schema.pollOptions)
    .where(eq(schema.pollOptions.pollId, pollId))
    .orderBy(asc(schema.pollOptions.position));
  const myVotes = await db
    .select({ optionId: schema.pollVotes.optionId })
    .from(schema.pollVotes)
    .where(and(eq(schema.pollVotes.pollId, pollId), eq(schema.pollVotes.userId, userId)));

  return {
    id: poll.id,
    question: poll.question,
    options: options.map((o) => ({ id: o.id, text: o.text, voteCount: o.voteCount })),
    totalVotes: poll.totalVotes,
    multiChoice: poll.multiChoice,
    isAnonymous: poll.isAnonymous,
    endsAt: poll.endsAt.toISOString(),
    myVotes: myVotes.map((v) => v.optionId),
  };
}
