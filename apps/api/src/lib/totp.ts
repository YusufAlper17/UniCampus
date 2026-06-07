import crypto from 'node:crypto';
import * as OTPAuth from 'otpauth';
import { env } from '../env.js';

// TOTP secret'ı (RFC 6238) AES-256-GCM ile şifreli saklanır.
const ISSUER = 'UniCampus';
const key = crypto.createHash('sha256').update(`${env.OTP_PEPPER}:totp`).digest();

function buildTotp(secret: OTPAuth.Secret, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({ issuer: ISSUER, label, algorithm: 'SHA1', digits: 6, period: 30, secret });
}

export interface TotpSetup {
  base32: string;
  otpauthUrl: string;
}

export function generateTotpSecret(label: string): TotpSetup {
  const secret = new OTPAuth.Secret({ size: 20 });
  return { base32: secret.base32, otpauthUrl: buildTotp(secret, label).toString() };
}

export function verifyTotp(base32: string, token: string): boolean {
  const totp = buildTotp(OTPAuth.Secret.fromBase32(base32), ISSUER);
  // window:1 → saat kayması için ±30sn tolerans.
  return totp.validate({ token: token.replace(/\s/g, ''), window: 1 }) !== null;
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, encB64] = stored.split(':') as [string, string, string];
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}
