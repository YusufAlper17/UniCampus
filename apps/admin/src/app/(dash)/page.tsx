'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/api';

interface Stats {
  users: { total: number; active: number; suspended: number; banned: number; new7d: number };
  posts: { total: number; social: number; career: number };
  communities: number;
  moderation: { openReports: number; pendingOpportunities: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<Stats>('/admin/dashboard/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-50 to-white p-8">
      <header className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Platform geneli özet metrikler ve moderasyon durumu.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : !stats ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          Metrikler yüklenemedi. API bağlantısını kontrol edin.
        </div>
      ) : (
        <>
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Kullanıcılar</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Toplam Kullanıcı" value={stats.users.total} icon="👥" />
              <Kpi label="Aktif" value={stats.users.active} tone="success" icon="✓" />
              <Kpi label="Son 7 Gün Yeni" value={stats.users.new7d} tone="brand" icon="↑" />
              <Kpi label="Askıda / Yasaklı" value={stats.users.suspended + stats.users.banned} tone="danger" icon="!" />
            </div>
          </section>

          <section className="mt-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">İçerik</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Toplam Gönderi" value={stats.posts.total} icon="📝" />
              <Kpi label="Sosyal" value={stats.posts.social} icon="✨" />
              <Kpi label="Kariyer" value={stats.posts.career} icon="💼" />
              <Kpi label="Topluluk" value={stats.communities} icon="🏛️" />
            </div>
          </section>

          <section className="mt-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Moderasyon</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Açık Şikayet" value={stats.moderation.openReports} tone="danger" icon="🚩" highlight />
              <Kpi label="Bekleyen İlan" value={stats.moderation.pendingOpportunities} tone="brand" icon="⏳" highlight />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
  icon,
  highlight,
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'danger' | 'brand';
  icon?: string;
  highlight?: boolean;
}) {
  const toneClass: Record<string, string> = {
    neutral: 'text-gray-900',
    success: 'text-success',
    danger: 'text-danger',
    brand: 'text-primary',
  };
  const borderClass = highlight && value > 0 ? 'border-primary/30 ring-1 ring-primary/10' : 'border-gray-200';

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${borderClass}`}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        {icon ? <span className="text-lg opacity-60">{icon}</span> : null}
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${toneClass[tone]}`}>
        {value.toLocaleString('tr-TR')}
      </p>
    </div>
  );
}
