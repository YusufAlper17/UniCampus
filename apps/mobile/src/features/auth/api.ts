import type {
  AccountType,
  ContentDomain,
  AccountVisibility,
} from '@unicampus/shared-types';
import { api } from '../../lib/api.js';
import type { SessionUser } from '../../lib/auth-store.js';

export interface UniversityItem {
  id: string;
  name: string;
  shortName: string | null;
  city: string | null;
  logoUrl: string | null;
  domains: string[];
}

export function searchUniversities(q: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return api.get<{ items: UniversityItem[] }>(`/universities${query}`, false);
}

export function sendOtp(email: string, universityId: string) {
  return api.post<{ sent: boolean; retryAfter: number; devCode?: string }>(
    '/auth/send-otp',
    { email, universityId },
    false,
  );
}

export function verifyOtp(email: string, code: string) {
  return api.post<{ verified: boolean; verificationToken: string }>(
    '/auth/verify-otp',
    { email, code },
    false,
  );
}

export interface RegisterParams {
  verificationToken: string;
  accountType: AccountType;
  username: string;
  displayName: string;
  password: string;
  bio?: string;
  careerHeadline?: string;
  accountVisibility?: AccountVisibility;
  defaultFeedTab: ContentDomain;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export function register(params: RegisterParams) {
  return api.post<AuthResult>('/users/register', params, false);
}

export function login(email: string, password: string, totpCode?: string) {
  return api.post<AuthResult>('/auth/login', { email, password, totpCode }, false);
}

export function setup2FA() {
  return api.post<{ otpauthUrl: string; secret: string }>('/auth/2fa/setup');
}

export function enable2FA(code: string) {
  return api.post<{ enabled: boolean }>('/auth/2fa/enable', { code });
}

export function disable2FA(code: string) {
  return api.post<{ enabled: boolean }>('/auth/2fa/disable', { code });
}
