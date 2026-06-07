import crypto from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  loginSchema,
  refreshSchema,
  sendOtpSchema,
  totpCodeSchema,
  verifyOtpSchema,
} from '@unicampus/shared-types';
import { db, schema } from '../db/index.js';
import { env } from '../env.js';
import { verifyPassword } from '../lib/password.js';
import { emailHash } from '../lib/email-crypto.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { requireAuth } from '../lib/context.js';
import { decryptSecret, encryptSecret, generateTotpSecret, verifyTotp } from '../lib/totp.js';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../lib/tokens.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function hashOtp(code: string, email: string): string {
  return crypto.createHmac('sha256', env.OTP_PEPPER).update(`${email}:${code}`).digest('hex');
}

function extractDomain(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // OTP gönder — edu domain whitelist kontrolü
  app.post('/auth/send-otp', async (req, reply) => {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const { email, universityId } = parsed.data;
    const domain = extractDomain(email);

    const [match] = await db
      .select()
      .from(schema.universityDomains)
      .where(
        and(
          eq(schema.universityDomains.universityId, universityId),
          eq(schema.universityDomains.domain, domain),
        ),
      )
      .limit(1);

    if (!match) {
      return reply.code(422).send({
        error: { code: 'domain_mismatch', message: 'Bu mail seçilen üniversiteye ait değil' },
      });
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = hashOtp(code, email);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await db
      .insert(schema.otpCodes)
      .values({ email, universityId, codeHash, expiresAt, attempts: 0 })
      .onConflictDoUpdate({
        target: schema.otpCodes.email,
        set: { codeHash, expiresAt, attempts: 0, universityId },
      });

    // Üretimde Resend ile e-posta; dev/test'te kolay doğrulama için kodu döndür.
    if (env.NODE_ENV !== 'production') {
      app.log.info({ email, code }, 'DEV OTP');
      return reply.send({ sent: true, retryAfter: 60, devCode: code });
    }
    await sendOtpEmail(email, code);

    return reply.send({ sent: true, retryAfter: 60 });
  });

  // OTP doğrula
  app.post('/auth/verify-otp', async (req, reply) => {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const { email, code } = parsed.data;

    const [record] = await db
      .select()
      .from(schema.otpCodes)
      .where(and(eq(schema.otpCodes.email, email), gt(schema.otpCodes.expiresAt, new Date())))
      .limit(1);

    if (!record) {
      return reply
        .code(400)
        .send({ error: { code: 'otp_expired', message: 'Kod süresi doldu, yeniden gönder' } });
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return reply
        .code(429)
        .send({ error: { code: 'rate_limited', message: 'Çok fazla deneme, yeni kod gerekli' } });
    }

    const valid = hashOtp(code, email) === record.codeHash;
    if (!valid) {
      await db
        .update(schema.otpCodes)
        .set({ attempts: record.attempts + 1 })
        .where(eq(schema.otpCodes.id, record.id));
      return reply
        .code(400)
        .send({ error: { code: 'otp_invalid', message: 'Kod hatalı' } });
    }

    await db.delete(schema.otpCodes).where(eq(schema.otpCodes.id, record.id));

    // Geçici doğrulama token'ı — profil tamamlamada kullanılır (Faz 1).
    const verificationToken = app.jwt.sign(
      { email, universityId: record.universityId, scope: 'registration' },
      { expiresIn: '30m' },
    );

    return reply.send({ verified: true, verificationToken });
  });

  // Login — email + şifre. Başarıda access + refresh token.
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.emailHash, emailHash(email)))
      .limit(1);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply
        .code(401)
        .send({ error: { code: 'invalid_credentials', message: 'E-posta veya şifre hatalı' } });
    }
    if (user.status === 'banned' || user.status === 'suspended') {
      return reply
        .code(403)
        .send({ error: { code: 'account_blocked', message: 'Hesap erişime kapalı' } });
    }

    // İkinci faktör: 2FA açıksa TOTP kodu zorunlu.
    if (user.totpEnabled && user.totpSecretEnc) {
      if (!parsed.data.totpCode) {
        return reply
          .code(401)
          .send({ error: { code: 'totp_required', message: 'Doğrulama kodu gerekli' } });
      }
      if (!verifyTotp(decryptSecret(user.totpSecretEnc), parsed.data.totpCode)) {
        return reply
          .code(401)
          .send({ error: { code: 'totp_invalid', message: 'Doğrulama kodu hatalı' } });
      }
    }

    const accessToken = signAccessToken(app, {
      sub: user.id,
      university_id: user.universityId,
      type: user.type,
      username: user.username,
    });
    const refreshToken = await issueRefreshToken(user.id, req.headers['user-agent']);

    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, displayName: user.displayName },
    });
  });

  // Refresh — rotation. Eski token revoke, yeni çift döner.
  app.post('/auth/refresh', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'validation_error', message: 'Geçersiz girdi', details: parsed.error.issues },
      });
    }
    const rotated = await rotateRefreshToken(parsed.data.refreshToken, req.headers['user-agent']);
    if (!rotated) {
      return reply
        .code(401)
        .send({ error: { code: 'invalid_token', message: 'Oturum süresi doldu' } });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, rotated.userId))
      .limit(1);
    if (!user) {
      return reply.code(401).send({ error: { code: 'invalid_token', message: 'Kullanıcı yok' } });
    }

    const accessToken = signAccessToken(app, {
      sub: user.id,
      university_id: user.universityId,
      type: user.type,
      username: user.username,
    });

    return reply.send({ accessToken, refreshToken: rotated.refreshToken });
  });

  // Logout — refresh token revoke.
  app.post('/auth/logout', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await revokeRefreshToken(parsed.data.refreshToken);
    }
    return reply.send({ success: true });
  });

  // 2FA kurulum — yeni secret üretir (henüz aktif değil), QR için otpauth URL döner.
  app.post('/auth/2fa/setup', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const [user] = await db
      .select({ username: schema.users.username, enabled: schema.users.totpEnabled })
      .from(schema.users)
      .where(eq(schema.users.id, auth.sub))
      .limit(1);
    if (!user) return reply.code(404).send({ error: { code: 'not_found', message: 'Kullanıcı yok' } });
    if (user.enabled) {
      return reply.code(409).send({ error: { code: 'already_enabled', message: '2FA zaten aktif' } });
    }
    const setup = generateTotpSecret(`UniCampus:${user.username}`);
    await db
      .update(schema.users)
      .set({ totpSecretEnc: encryptSecret(setup.base32), updatedAt: new Date() })
      .where(eq(schema.users.id, auth.sub));
    return reply.send({ otpauthUrl: setup.otpauthUrl, secret: setup.base32 });
  });

  // 2FA etkinleştir — kurulum kodunu doğrula, aktif et.
  app.post('/auth/2fa/enable', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = totpCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: '6 haneli kod gerekli' } });
    }
    const [user] = await db
      .select({ secret: schema.users.totpSecretEnc, enabled: schema.users.totpEnabled })
      .from(schema.users)
      .where(eq(schema.users.id, auth.sub))
      .limit(1);
    if (!user?.secret) {
      return reply.code(400).send({ error: { code: 'no_setup', message: 'Önce 2FA kurulumu başlat' } });
    }
    if (!verifyTotp(decryptSecret(user.secret), parsed.data.code)) {
      return reply.code(400).send({ error: { code: 'totp_invalid', message: 'Doğrulama kodu hatalı' } });
    }
    await db
      .update(schema.users)
      .set({ totpEnabled: true, updatedAt: new Date() })
      .where(eq(schema.users.id, auth.sub));
    return reply.send({ enabled: true });
  });

  // 2FA devre dışı bırak — geçerli kod gerekli.
  app.post('/auth/2fa/disable', { onRequest: [app.authenticate] }, async (req, reply) => {
    const auth = requireAuth(req, reply);
    if (!auth) return;
    const parsed = totpCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'validation_error', message: '6 haneli kod gerekli' } });
    }
    const [user] = await db
      .select({ secret: schema.users.totpSecretEnc, enabled: schema.users.totpEnabled })
      .from(schema.users)
      .where(eq(schema.users.id, auth.sub))
      .limit(1);
    if (!user?.enabled || !user.secret) {
      return reply.code(400).send({ error: { code: 'not_enabled', message: '2FA aktif değil' } });
    }
    if (!verifyTotp(decryptSecret(user.secret), parsed.data.code)) {
      return reply.code(400).send({ error: { code: 'totp_invalid', message: 'Doğrulama kodu hatalı' } });
    }
    await db
      .update(schema.users)
      .set({ totpEnabled: false, totpSecretEnc: null, updatedAt: new Date() })
      .where(eq(schema.users.id, auth.sub));
    return reply.send({ enabled: false });
  });
};
