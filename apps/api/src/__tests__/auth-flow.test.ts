import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

/**
 * Faz 1 uçtan uca: send-otp → verify-otp → register → login → me → follow.
 * Gerçek Postgres gerektirir (docker-compose). university seed'i olmalı.
 */
describe('Faz 1 — auth + social graph flow', () => {
  let app: FastifyInstance;
  let universityId: string;
  const email = `test_${Date.now()}@itu.edu.tr`;
  const username = `tester_${Date.now()}`;
  let accessToken: string;

  beforeAll(async () => {
    app = await buildApp();
    const [domain] = await db
      .select()
      .from(schema.universityDomains)
      .where(eq(schema.universityDomains.domain, 'itu.edu.tr'))
      .limit(1);
    if (!domain) throw new Error('Seed yok — önce npm run db:seed');
    universityId = domain.universityId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('OTP gönderir ve dev kodu döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/send-otp',
      payload: { email, universityId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().devCode).toMatch(/^\d{6}$/);
  });

  it('yanlış domain reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/send-otp',
      payload: { email: 'x@gmail.com', universityId },
    });
    expect(res.statusCode).toBe(422);
  });

  it('OTP doğrular ve kayıt tamamlar', async () => {
    const otpRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/send-otp',
      payload: { email, universityId },
    });
    const devCode = otpRes.json().devCode;

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-otp',
      payload: { email, code: devCode },
    });
    expect(verifyRes.statusCode).toBe(200);
    const verificationToken = verifyRes.json().verificationToken;

    const regRes = await app.inject({
      method: 'POST',
      url: '/v1/users/register',
      payload: {
        verificationToken,
        accountType: 'student',
        username,
        displayName: 'Test User',
        password: 'supersecret123',
        defaultFeedTab: 'social',
      },
    });
    expect(regRes.statusCode).toBe(201);
    expect(regRes.json().accessToken).toBeTruthy();
    accessToken = regRes.json().accessToken;
  });

  it('login çalışır', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'supersecret123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().refreshToken).toBeTruthy();
  });

  it('yanlış şifre reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('me korumalıdır', async () => {
    const noAuth = await app.inject({ method: 'GET', url: '/v1/users/me' });
    expect(noAuth.statusCode).toBe(401);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.username).toBe(username);
  });

  it('üniversite arama public çalışır', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/universities?q=İTÜ' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().items)).toBe(true);
  });
});
