import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { connectionRequestSchema, type ConnectionSuggestion } from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../lib/context.js';

/**
 * Hibrit sosyal graf:
 *  - Takip (tek yön): açık hesap → anında; gizli hesap → istek (pending).
 *  - Bağlantı (çift yön): istek + onay → connections satırı.
 */
export const socialGraphRoutes: FastifyPluginAsync = async (app) => {
  // Takip et / takip isteği gönder.
  app.post('/users/:id/follow', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id: targetId } = req.params as { id: string };
    if (targetId === auth.sub) {
      return reply.code(400).send({ error: { code: 'self_action', message: 'Kendini takip edemezsin' } });
    }

    const [target] = await db
      .select({ id: schema.users.id, visibility: schema.users.accountVisibility, universityId: schema.users.universityId })
      .from(schema.users)
      .where(eq(schema.users.id, targetId))
      .limit(1);
    if (!target || target.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    }

    const status = target.visibility === 'private' ? 'pending' : 'active';
    await db
      .insert(schema.follows)
      .values({ followerId: auth.sub, followingId: targetId, status })
      .onConflictDoNothing();

    if (status === 'active') {
      await db
        .update(schema.users)
        .set({ followerCount: sql`${schema.users.followerCount} + 1` })
        .where(eq(schema.users.id, targetId));
      await db
        .update(schema.users)
        .set({ followingCount: sql`${schema.users.followingCount} + 1` })
        .where(eq(schema.users.id, auth.sub));
    }

    return reply.send({ status });
  });

  // Takibi bırak.
  app.delete('/users/:id/follow', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id: targetId } = req.params as { id: string };

    const deleted = await db
      .delete(schema.follows)
      .where(and(eq(schema.follows.followerId, auth.sub), eq(schema.follows.followingId, targetId)))
      .returning();

    if (deleted[0]?.status === 'active') {
      await db
        .update(schema.users)
        .set({ followerCount: sql`greatest(${schema.users.followerCount} - 1, 0)` })
        .where(eq(schema.users.id, targetId));
      await db
        .update(schema.users)
        .set({ followingCount: sql`greatest(${schema.users.followingCount} - 1, 0)` })
        .where(eq(schema.users.id, auth.sub));
    }
    return reply.send({ success: true });
  });

  // Bekleyen takip istekleri (gizli hesap sahibi için).
  app.get('/follow-requests', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const rows = await db
      .select({
        followerId: schema.follows.followerId,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        createdAt: schema.follows.createdAt,
      })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.users.id, schema.follows.followerId))
      .where(and(eq(schema.follows.followingId, auth.sub), eq(schema.follows.status, 'pending')))
      .orderBy(desc(schema.follows.createdAt));
    return reply.send({ items: rows });
  });

  // Takip isteğini onayla.
  app.post('/follow-requests/:followerId/accept', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { followerId } = req.params as { followerId: string };

    const updated = await db
      .update(schema.follows)
      .set({ status: 'active' })
      .where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, auth.sub),
          eq(schema.follows.status, 'pending'),
        ),
      )
      .returning();
    if (!updated.length) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'İstek yok' } });
    }
    await db
      .update(schema.users)
      .set({ followerCount: sql`${schema.users.followerCount} + 1` })
      .where(eq(schema.users.id, auth.sub));
    await db
      .update(schema.users)
      .set({ followingCount: sql`${schema.users.followingCount} + 1` })
      .where(eq(schema.users.id, followerId));
    return reply.send({ success: true });
  });

  // Takip isteğini reddet.
  app.post('/follow-requests/:followerId/reject', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { followerId } = req.params as { followerId: string };
    await db
      .delete(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, auth.sub),
          eq(schema.follows.status, 'pending'),
        ),
      );
    return reply.send({ success: true });
  });

  // Bağlantı isteği gönder (LinkedIn tarzı).
  app.post('/connections/request', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = connectionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const { receiverId } = parsed.data;
    if (receiverId === auth.sub) {
      return reply.code(400).send({ error: { code: 'self_action', message: 'Kendine bağlantı isteği gönderemezsin' } });
    }

    const [target] = await db
      .select({ id: schema.users.id, universityId: schema.users.universityId })
      .from(schema.users)
      .where(eq(schema.users.id, receiverId))
      .limit(1);
    if (!target || target.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    }

    await db
      .insert(schema.connectionRequests)
      .values({ senderId: auth.sub, receiverId, status: 'pending' })
      .onConflictDoNothing();
    return reply.send({ status: 'pending' });
  });

  // Bekleyen bağlantı istekleri.
  app.get('/connections/requests', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const rows = await db
      .select({
        id: schema.connectionRequests.id,
        senderId: schema.connectionRequests.senderId,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        careerHeadline: schema.users.careerHeadline,
        createdAt: schema.connectionRequests.createdAt,
      })
      .from(schema.connectionRequests)
      .innerJoin(schema.users, eq(schema.users.id, schema.connectionRequests.senderId))
      .where(
        and(
          eq(schema.connectionRequests.receiverId, auth.sub),
          eq(schema.connectionRequests.status, 'pending'),
        ),
      )
      .orderBy(desc(schema.connectionRequests.createdAt));
    return reply.send({ items: rows });
  });

  // Bağlantı isteğini kabul et → connections satırı (her zaman a<b sıralı).
  app.post('/connections/:id/accept', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };

    const [request] = await db
      .select()
      .from(schema.connectionRequests)
      .where(
        and(
          eq(schema.connectionRequests.id, id),
          eq(schema.connectionRequests.receiverId, auth.sub),
          eq(schema.connectionRequests.status, 'pending'),
        ),
      )
      .limit(1);
    if (!request) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'İstek yok' } });
    }

    const sorted = [request.senderId, request.receiverId].sort();
    await db
      .insert(schema.connections)
      .values({ userAId: sorted[0]!, userBId: sorted[1]! })
      .onConflictDoNothing();
    await db
      .update(schema.connectionRequests)
      .set({ status: 'accepted' })
      .where(eq(schema.connectionRequests.id, id));

    for (const uid of [request.senderId, request.receiverId]) {
      await db
        .update(schema.users)
        .set({ connectionCount: sql`${schema.users.connectionCount} + 1` })
        .where(eq(schema.users.id, uid));
    }
    return reply.send({ success: true });
  });

  // Bağlantı isteğini reddet.
  app.post('/connections/:id/reject', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { id } = req.params as { id: string };
    await db
      .update(schema.connectionRequests)
      .set({ status: 'rejected' })
      .where(and(eq(schema.connectionRequests.id, id), eq(schema.connectionRequests.receiverId, auth.sub)));
    return reply.send({ success: true });
  });

  /**
   * Bağlantı önerisi (Faz 11) — "tanıyor olabileceğin kişiler".
   * Sıralama: ortak bağlantı sayısı → aynı bölüm → kampüs. Zaten bağlı /
   * bekleyen istekli kullanıcılar hariç tutulur. Üniversite izolasyonu korunur.
   */
  app.get('/connections/suggestions', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;

    // 1) Mevcut bağlantılarım.
    const connRows = await db
      .select({ a: schema.connections.userAId, b: schema.connections.userBId })
      .from(schema.connections)
      .where(or(eq(schema.connections.userAId, auth.sub), eq(schema.connections.userBId, auth.sub)));
    const myConnections = connRows.map((r) => (r.a === auth.sub ? r.b : r.a));
    const myConnSet = new Set(myConnections);

    // 2) Hariç tutulacaklar: kendim + bağlantılarım + bekleyen istekler.
    const exclude = new Set<string>([auth.sub, ...myConnections]);
    const pending = await db
      .select({ s: schema.connectionRequests.senderId, r: schema.connectionRequests.receiverId })
      .from(schema.connectionRequests)
      .where(
        and(
          eq(schema.connectionRequests.status, 'pending'),
          or(
            eq(schema.connectionRequests.senderId, auth.sub),
            eq(schema.connectionRequests.receiverId, auth.sub),
          ),
        ),
      );
    for (const p of pending) {
      exclude.add(p.s);
      exclude.add(p.r);
    }

    // 3) İkinci derece bağlantılar → ortak bağlantı sayısı.
    const mutualCount = new Map<string, number>();
    if (myConnections.length) {
      const secondDegree = await db
        .select({ a: schema.connections.userAId, b: schema.connections.userBId })
        .from(schema.connections)
        .where(
          or(
            inArray(schema.connections.userAId, myConnections),
            inArray(schema.connections.userBId, myConnections),
          ),
        );
      for (const edge of secondDegree) {
        const cand = myConnSet.has(edge.a) && !myConnSet.has(edge.b)
          ? edge.b
          : myConnSet.has(edge.b) && !myConnSet.has(edge.a)
            ? edge.a
            : null;
        if (cand && !exclude.has(cand)) {
          mutualCount.set(cand, (mutualCount.get(cand) ?? 0) + 1);
        }
      }
    }

    // 4) Aday havuzu: ortak bağlantılı + aynı üniversiteden taze hesaplar.
    const mutualIds = [...mutualCount.keys()];
    const userCols = {
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      careerHeadline: schema.users.careerHeadline,
    };
    const recent = await db
      .select(userCols)
      .from(schema.users)
      .where(
        and(
          eq(schema.users.universityId, auth.university_id),
          eq(schema.users.status, 'active'),
          ne(schema.users.id, auth.sub),
        ),
      )
      .orderBy(desc(schema.users.createdAt))
      .limit(40);
    const mutualUsers = mutualIds.length
      ? await db.select(userCols).from(schema.users).where(inArray(schema.users.id, mutualIds))
      : [];

    const poolMap = new Map<string, (typeof recent)[number]>();
    for (const u of [...mutualUsers, ...recent]) {
      if (!exclude.has(u.id)) poolMap.set(u.id, u);
    }
    const pool = [...poolMap.values()];
    if (!pool.length) return reply.send({ items: [] });

    // 5) Bölüm bilgisi (aynı bölüm sinyali).
    const [myAcademic] = await db
      .select({ department: schema.academicProfiles.department })
      .from(schema.academicProfiles)
      .where(eq(schema.academicProfiles.userId, auth.sub))
      .limit(1);
    const myDept = myAcademic?.department ?? null;
    const depts = await db
      .select({ userId: schema.academicProfiles.userId, department: schema.academicProfiles.department })
      .from(schema.academicProfiles)
      .where(inArray(schema.academicProfiles.userId, pool.map((u) => u.id)));
    const deptMap = new Map(depts.map((d) => [d.userId, d.department ?? undefined]));

    const items: ConnectionSuggestion[] = pool
      .map((u) => {
        const mutual = mutualCount.get(u.id) ?? 0;
        const dept = deptMap.get(u.id);
        const sameDept = !!myDept && dept === myDept;
        const reason = mutual > 0 ? `${mutual} ortak bağlantı` : sameDept ? 'Aynı bölüm' : 'Kampüsünden';
        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl ?? undefined,
          careerHeadline: u.careerHeadline ?? undefined,
          department: dept,
          mutualCount: mutual,
          reason,
          _sameDept: sameDept,
        };
      })
      .sort((a, b) => {
        if (b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount;
        if (a._sameDept !== b._sameDept) return a._sameDept ? -1 : 1;
        return 0;
      })
      .slice(0, 10)
      .map(({ _sameDept, ...rest }) => rest);

    return reply.send({ items });
  });
};
