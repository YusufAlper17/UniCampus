import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

export async function getSeededUniversityId(): Promise<string> {
  const [domain] = await db
    .select()
    .from(schema.universityDomains)
    .where(eq(schema.universityDomains.domain, 'itu.edu.tr'))
    .limit(1);
  if (!domain) throw new Error('Seed yok — önce npm run db:seed');
  return domain.universityId;
}

export interface TestUser {
  accessToken: string;
  userId: string;
  username: string;
  email: string;
}

let counter = 0;

// Test kullanıcısı oluşturur (send-otp → verify-otp → register).
export async function createTestUser(
  app: FastifyInstance,
  universityId: string,
  overrides?: { accountVisibility?: 'public' | 'private' },
): Promise<TestUser> {
  counter += 1;
  // Paralel test worker'ları arası çakışmayı önlemek için rastgele ek.
  const unique = `${crypto.randomBytes(5).toString('hex')}${counter}`;
  const email = `u_${unique}@itu.edu.tr`;
  const username = `user_${unique}`;

  const otpRes = await app.inject({
    method: 'POST',
    url: '/v1/auth/send-otp',
    payload: { email, universityId },
  });
  const devCode = otpRes.json().devCode as string;

  const verifyRes = await app.inject({
    method: 'POST',
    url: '/v1/auth/verify-otp',
    payload: { email, code: devCode },
  });
  const verificationToken = verifyRes.json().verificationToken as string;

  const regRes = await app.inject({
    method: 'POST',
    url: '/v1/users/register',
    payload: {
      verificationToken,
      accountType: 'student',
      username,
      displayName: `User ${counter}`,
      password: 'supersecret123',
      defaultFeedTab: 'social',
      accountVisibility: overrides?.accountVisibility ?? 'public',
    },
  });
  const body = regRes.json();
  return { accessToken: body.accessToken, userId: body.user.id, username, email };
}

export function authHeader(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}
