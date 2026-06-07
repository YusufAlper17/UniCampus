'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, clearToken, setToken, AdminApiError } from '../../lib/api';

const ADMIN_ROLES = ['admin', 'super_admin', 'moderator'];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: { email: string; password: string; totpCode?: string } = { email, password };
      if (needsTotp && totpCode) body.totpCode = totpCode;

      const res = await adminFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body,
        auth: false,
      });
      setToken(res.accessToken);
      const me = await adminFetch<{ user: { type: string } }>('/users/me');
      if (!ADMIN_ROLES.includes(me.user.type)) {
        clearToken();
        setError('Bu hesabın yönetim paneli yetkisi yok.');
        return;
      }
      router.replace('/');
    } catch (err) {
      clearToken();
      if (err instanceof AdminApiError && err.code === 'totp_required') {
        setNeedsTotp(true);
        setError('İki faktörlü doğrulama kodu gerekli.');
        return;
      }
      setError(err instanceof AdminApiError ? err.message : 'E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xl shadow-primary/5"
      >
        <div className="bg-primary px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-lg font-bold text-white">
              UC
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">UniCampus Admin</h1>
              <p className="text-sm text-indigo-100">Yönetim paneline güvenli giriş</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-8">
          <div>
            <label className="block text-sm font-medium text-gray-700">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="admin@itu.edu.tr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>

          {needsTotp ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Doğrulama Kodu (2FA)</label>
              <input
                type="text"
                inputMode="numeric"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg tracking-widest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="000000"
              />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : needsTotp ? 'Doğrula ve Giriş Yap' : 'Giriş Yap'}
          </button>
        </div>
      </form>
    </div>
  );
}
