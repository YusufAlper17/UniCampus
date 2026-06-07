import { and, asc, eq, inArray } from 'drizzle-orm';
import type { EventData, PollData } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';

/**
 * Anket/etkinlik tipindeki postlara interaktif veri ekler (batch — N+1 yok).
 * Feed ve post detayında kullanılır.
 */
export async function buildInteractiveMaps(
  posts: { id: string; type: string }[],
  userId: string,
): Promise<{ polls: Map<string, PollData>; events: Map<string, EventData> }> {
  const pollPostIds = posts.filter((p) => p.type === 'poll').map((p) => p.id);
  const eventPostIds = posts.filter((p) => p.type === 'event').map((p) => p.id);

  const polls = new Map<string, PollData>();
  const events = new Map<string, EventData>();

  if (pollPostIds.length) {
    const pollRows = await db
      .select()
      .from(schema.polls)
      .where(inArray(schema.polls.postId, pollPostIds));
    const pollIds = pollRows.map((p) => p.id);
    const options = pollIds.length
      ? await db
          .select()
          .from(schema.pollOptions)
          .where(inArray(schema.pollOptions.pollId, pollIds))
          .orderBy(asc(schema.pollOptions.position))
      : [];
    const myVotes = pollIds.length
      ? await db
          .select({ pollId: schema.pollVotes.pollId, optionId: schema.pollVotes.optionId })
          .from(schema.pollVotes)
          .where(and(eq(schema.pollVotes.userId, userId), inArray(schema.pollVotes.pollId, pollIds)))
      : [];

    for (const poll of pollRows) {
      polls.set(poll.postId, {
        id: poll.id,
        question: poll.question,
        options: options
          .filter((o) => o.pollId === poll.id)
          .map((o) => ({ id: o.id, text: o.text, voteCount: o.voteCount })),
        totalVotes: poll.totalVotes,
        multiChoice: poll.multiChoice,
        isAnonymous: poll.isAnonymous,
        endsAt: poll.endsAt.toISOString(),
        myVotes: myVotes.filter((v) => v.pollId === poll.id).map((v) => v.optionId),
      });
    }
  }

  if (eventPostIds.length) {
    const eventRows = await db
      .select()
      .from(schema.events)
      .where(inArray(schema.events.postId, eventPostIds));
    const eventIds = eventRows.map((e) => e.id);
    const myParticipation = eventIds.length
      ? await db
          .select({ eventId: schema.eventParticipants.eventId, status: schema.eventParticipants.status })
          .from(schema.eventParticipants)
          .where(
            and(
              eq(schema.eventParticipants.userId, userId),
              inArray(schema.eventParticipants.eventId, eventIds),
            ),
          )
      : [];

    for (const event of eventRows) {
      if (!event.postId) continue;
      const mine = myParticipation.find((p) => p.eventId === event.id);
      events.set(event.postId, {
        id: event.id,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString(),
        locationText: event.locationText ?? undefined,
        capacity: event.capacity ?? undefined,
        participantCount: event.participantCount,
        isPaid: event.isPaid,
        price: event.price != null ? Number(event.price) : undefined,
        participationType: event.participationType,
        scope: event.scope,
        myStatus: mine?.status ?? null,
      });
    }
  }

  return { polls, events };
}
