'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/api';

interface Overview {
  ads: { impressions: number; clicks: number };
  deals: { redemptions: number; clicks: number };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<Overview>('/admin/analytics/overview')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Gelir Analitiği</h2>
      <p className="mt-1 text-sm text-gray-500">Reklam gösterim/tıklama ve kampanya kod açılımları.</p>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Yükleniyor...</p>
      ) : data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Reklam Gösterimi" value={data.ads.impressions} />
          <StatCard label="Reklam Tıklama" value={data.ads.clicks} />
          <StatCard label="Kod Açılımı" value={data.deals.redemptions} />
          <StatCard label="Mağaza Tıklama" value={data.deals.clicks} />
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString('tr-TR')}</p>
    </div>
  );
}
