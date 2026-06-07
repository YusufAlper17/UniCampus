import crypto from 'node:crypto';
import { env } from '../env.js';

// E-posta gizliliği: emailHash (deterministik, lookup için) + emailEnc (AES-256-GCM, geri çözülebilir).
// KVKK: e-posta düz metin saklanmaz.
const key = crypto.createHash('sha256').update(env.OTP_PEPPER).digest();

export function emailHash(email: string): string {
  return crypto.createHmac('sha256', env.OTP_PEPPER).update(email.toLowerCase()).digest('hex');
}

export function encryptEmail(email: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptEmail(stored: string): string {
  const [ivB64, tagB64, encB64] = stored.split(':') as [string, string, string];
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}
