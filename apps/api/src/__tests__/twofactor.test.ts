import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import * as OTPAuth from 'otpauth';
import { buildApp } from '../app.js';
import { authHeader, createTestUser, getSeededUniversityId, type TestUser } from './helpers.js';

function codeFor(base32: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: 'UniCampus',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32),
  });
  return totp.generate();
}

describe('Faz 7 — 2FA (TOTP)', () => {
  let app: FastifyInstance;
  let user: TestUser;
  let secret: string;

  beforeAll(async () => {
    app = await buildApp();
    const universityId = await getSeededUniversityId();
    user = await createTestUser(app, universityId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('kurulum secret ve otpauth URL döner', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/2fa/setup',
      headers: authHeader(user),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().secret).toBeTruthy();
    expect(res.json().otpauthUrl).toContain('otpauth://totp/');
    secret = res.json().secret;
  });

  it('geçerli kodla etkinleşir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/2fa/enable',
      headers: authHeader(user),
      payload: { code: codeFor(secret) },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().enabled).toBe(true);
  });

  it('2FA açıkken kodsuz login reddedilir', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: 'supersecret123' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('totp_required');
  });

  it('geçerli kodla login başarılı', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: 'supersecret123', totpCode: codeFor(secret) },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTruthy();
  });

  it('devre dışı bırakılınca kodsuz login tekrar çalışır', async () => {
    const off = await app.inject({
      method: 'POST',
      url: '/v1/auth/2fa/disable',
      headers: authHeader(user),
      payload: { code: codeFor(secret) },
    });
    expect(off.statusCode).toBe(200);
    expect(off.json().enabled).toBe(false);

    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: user.email, password: 'supersecret123' },
    });
    expect(login.statusCode).toBe(200);
  });
});
