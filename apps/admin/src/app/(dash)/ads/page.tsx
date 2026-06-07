'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/api';

interface AdCampaign {
  id: string;
  title: string;
  brandName: string;
  status: string;
  mediaUrl: string;
  feedPositionInterval: number;
}

interface Sponsor {
  id: string;
  brandName: string;
}

export default function AdsAdminPage() {
  const [items, setItems] = useState<AdCampaign[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    sponsorId: '',
    title: '',
    mediaUrl: 'https://picsum.photos/800/400',
    ctaText: 'Daha Fazla',
    targetUrl: 'https://example.com',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ads, sp] = await Promise.all([
        adminFetch<{ items: AdCampaign[] }>('/admin/ads'),
        adminFetch<{ items: Sponsor[] }>('/admin/sponsors'),
      ]);
      setItems(ads.items);
      setSponsors(sp.items);
      if (!form.sponsorId && sp.items[0]) setForm((f) => ({ ...f, sponsorId: sp.items[0]!.id }));
    } finally {
      setLoading(false);
    }
  }, [form.sponsorId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await adminFetch('/admin/ads', { method: 'POST', body: form });
    setForm((f) => ({ ...f, title: '' }));
    await load();
  }

  async function publish(id: string) {
    setBusyId(id);
    try {
      await adminFetch(`/admin/ads/${id}/publish`, { method: 'PATCH' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Feed Reklamları</h2>
      <p className="mt-1 text-sm text-gray-500">Yalnızca sosyal akışta gösterilir (kariyer akışı reklamsız).</p>

      <form onSubmit={create} className="mt-6 grid max-w-lg gap-2 rounded-lg border border-gray-200 bg-white p-4">
        <select
          value={form.sponsorId}
          onChange={(e) => setForm({ ...form, sponsorId: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {sponsors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.brandName}
            </option>
          ))}
        </select>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Kampanya adı"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-primary py-2 text-sm font-semibold text-white">
          Taslak Oluştur
        </button>
      </form>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Yükleniyor...</p>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
              <div>
                <p className="font-medium text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-500">
                  {a.brandName} · {a.status} · her {a.feedPositionInterval} post
                </p>
              </div>
              {a.status !== 'active' ? (
                <button
                  disabled={busyId === a.id}
                  onClick={() => publish(a.id)}
                  className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700"
                >
                  Yayınla
                </button>
              ) : (
                <span className="text-xs font-medium text-green-600">Yayında</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
