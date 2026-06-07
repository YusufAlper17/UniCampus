import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  registerSchema,
  updateAcademicSchema,
  updatePreferencesSchema,
  updateProfileSchema,
  updateStatusSchema,
} from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { hashPassword } from '../lib/password.js';
import { emailHash, encryptEmail } from '../lib/email-crypto.js';
import { issueRefreshToken, signAccessToken } from '../lib/tokens.js';
import { requireAuth } from '../lib/context.js';
import { enqueueIndex } from '../queue/index.js';

interface RegistrationClaims {
  email: string;
  universityId: string;
  scope: string;
}

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Kayıt tamamlama — verify-otp'tan gelen verificationToken ile.
  app.post('/users/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const input = parsed.data;

    let claims: RegistrationClaims;
    try {
      claims = app.jwt.verify<RegistrationClaims>(input.verificationToken);
    } catch {
      return reply
        .code(401)
        .send({ error: { code: 'invalid_token', message: 'Doğrulama süresi doldu' } });
    }
    if (claims.scope !== 'registration') {
      return reply.code(401).send({ error: { code: 'invalid_token', message: 'Geçersiz token' } });
    }

    const eHash = emailHash(claims.email);
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.emailHash, eHash))
      .limit(1);
    if (existing) {
      return reply
        .code(409)
        .send({ error: { code: 'email_taken', message: 'Bu e-posta zaten kayıtlı' } });
    }

    // Kulüp/takım hesapları admin onayı bekler.
    const status = input.accountType === 'club' || input.accountType === 'team'
      ? 'pending_approval'
      : 'active';

    let user: typeof schema.users.$inferSelect | undefined;
    try {
      [user] = await db
        .insert(schema.users)
        .values({
          universityId: claims.universityId,
          type: input.accountType,
          status,
          username: input.username.toLowerCase(),
          displayName: input.displayName,
          emailEnc: encryptEmail(claims.email),
          emailHash: eHash,
          passwordHash: hashPassword(input.password),
          bio: input.bio,
          careerHeadline: input.careerHeadline,
          accountVisibility: input.accountVisibility,
          isVerifiedStudent: input.accountType === 'student',
        })
        .returning();
    } catch {
      return reply
        .code(409)
        .send({ error: { code: 'username_taken', message: 'Bu kullanıcı adı alınmış' } });
    }
    if (!user) {
      return reply
        .code(500)
        .send({ error: { code: 'server_error', message: 'Kayıt oluşturulamadı' } });
    }

    await db.insert(schema.userPreferences).values({
      userId: user.id,
      defaultFeedTab: input.defaultFeedTab,
    });

    await enqueueIndex({ kind: 'user', id: user.id });

    const accessToken = signAccessToken(app, {
      sub: user.id,
      university_id: user.universityId,
      type: user.type,
      username: user.username,
    });
    const refreshToken = await issueRefreshToken(user.id, req.headers['user-agent']);

    return reply.code(201).send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        type: user.type,
        status: user.status,
      },
    });
  });

  // Kendi profilim (tercihler + akademik dahil).
  app.get('/users/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, auth.sub))
      .limit(1);
    if (!user) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    }

    const [prefs] = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, auth.sub))
      .limit(1);
    const [academic] = await db
      .select()
      .from(schema.academicProfiles)
      .where(eq(schema.academicProfiles.userId, auth.sub))
      .limit(1);

    return reply.send({ user: publicUser(user, true), preferences: prefs ?? null, academic: academic ?? null });
  });

  // Profil güncelle.
  app.patch('/users/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const [updated] = await db
      .update(schema.users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.users.id, auth.sub))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    }
    return reply.send({ user: publicUser(updated, true) });
  });

  // Tercihler güncelle (varsayılan feed sekmesi, bildirim toggle'ları, tema).
  app.patch('/users/me/preferences', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = updatePreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const [prefs] = await db
      .insert(schema.userPreferences)
      .values({ userId: auth.sub, ...parsed.data })
      .onConflictDoUpdate({ target: schema.userPreferences.userId, set: parsed.data })
      .returning();
    return reply.send({ preferences: prefs });
  });

  // Durum metni güncelle (Faz 11 — WhatsApp tarzı "Ders çalışıyorum").
  app.put('/users/me/status', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const [updated] = await db
      .update(schema.users)
      .set({
        statusText: parsed.data.statusText ?? null,
        statusEmoji: parsed.data.statusEmoji ?? null,
        statusUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, auth.sub))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    }
    return reply.send({
      statusText: updated.statusText ?? undefined,
      statusEmoji: updated.statusEmoji ?? undefined,
    });
  });

  // Akademik profil güncelle (alan bazlı görünürlük).
  app.put('/users/me/academic', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = updateAcademicSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const { fieldVisibility, gpa, ...rest } = parsed.data;
    const values = {
      ...rest,
      gpa: gpa != null ? String(gpa) : undefined,
      fieldVisibility: fieldVisibility ? JSON.stringify(fieldVisibility) : undefined,
      updatedAt: new Date(),
    };
    const [academic] = await db
      .insert(schema.academicProfiles)
      .values({ userId: auth.sub, ...values })
      .onConflictDoUpdate({ target: schema.academicProfiles.userId, set: values })
      .returning();
    return reply.send({ academic });
  });

  // Başka kullanıcının profili (username ile). Üniversite izolasyonu uygulanır.
  app.get('/users/:username', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const { username } = req.params as { username: string };

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username.toLowerCase()))
      .limit(1);
    if (!user || user.universityId !== auth.university_id) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı bulunamadı' } });
    }

    const [academic] = await db
      .select()
      .from(schema.academicProfiles)
      .where(eq(schema.academicProfiles.userId, user.id))
      .limit(1);

    let relationship: AcademicRelationship = 'other';
    if (user.id === auth.sub) {
      relationship = 'self';
    } else {
      const sorted = [auth.sub, user.id].sort();
      const [conn] = await db
        .select({ a: schema.connections.userAId })
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.userAId, sorted[0]!),
            eq(schema.connections.userBId, sorted[1]!),
          ),
        )
        .limit(1);
      if (conn) relationship = 'connection';
    }

    return reply.send({
      user: publicUser(user, false),
      academic: academic ? filterAcademic(academic, relationship) : null,
    });
  });
};

type AcademicRelationship = 'self' | 'connection' | 'other';

// Varsayılan gizlilik: hassas alanlar (gpa, öğrenci no) private, diğerleri public.
const DEFAULT_FIELD_VISIBILITY: Record<string, 'public' | 'connections' | 'private'> = {
  faculty: 'public',
  department: 'public',
  classYear: 'public',
  graduationYear: 'public',
  gpa: 'private',
  studentNo: 'private',
};

function filterAcademic(
  academic: typeof schema.academicProfiles.$inferSelect,
  relationship: AcademicRelationship,
) {
  let visibility: Record<string, 'public' | 'connections' | 'private'> = {};
  try {
    visibility = JSON.parse(academic.fieldVisibility) as typeof visibility;
  } catch {
    visibility = {};
  }

  const canSee = (field: string): boolean => {
    if (relationship === 'self') return true;
    const vis = visibility[field] ?? DEFAULT_FIELD_VISIBILITY[field] ?? 'public';
    if (vis === 'public') return true;
    if (vis === 'connections') return relationship === 'connection';
    return false;
  };

  const numericGpa = academic.gpa != null ? Number(academic.gpa) : null;
  return {
    faculty: canSee('faculty') ? academic.faculty : null,
    department: canSee('department') ? academic.department : null,
    classYear: canSee('classYear') ? academic.classYear : null,
    graduationYear: canSee('graduationYear') ? academic.graduationYear : null,
    gpa: canSee('gpa') ? numericGpa : null,
    studentNo: canSee('studentNo') ? academic.studentNo : null,
  };
}

function publicUser(u: typeof schema.users.$inferSelect, self: boolean) {
  return {
    id: u.id,
    universityId: u.universityId,
    type: u.type,
    status: u.status,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl ?? undefined,
    bio: u.bio ?? undefined,
    careerHeadline: u.careerHeadline ?? undefined,
    accountVisibility: u.accountVisibility,
    careerVisibility: u.careerVisibility,
    isVerifiedStudent: u.isVerifiedStudent,
    isVerifiedOrg: u.isVerifiedOrg,
    followerCount: u.followerCount,
    followingCount: self ? u.followingCount : undefined,
    connectionCount: u.connectionCount,
    postCount: u.postCount,
    statusText: u.statusText ?? undefined,
    statusEmoji: u.statusEmoji ?? undefined,
    twoFactorEnabled: self ? u.totpEnabled : undefined,
    createdAt: u.createdAt.toISOString(),
  };
}
