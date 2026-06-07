'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/api';

interface Deal {
  id: string;
  title: string;
  brandName: string;
  status: string;
  discountValue: string | null;
  category: string | null;
}

interface Sponsor {
  id: string;
  brandName: string;
}

export default function DealsAdminPage() {
  const [items, setItems] = useState<Deal[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ sponsorId: '', title: '', discountValue: '', category: 'Teknoloji' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [deals, sp] = await Promise.all([
        adminFetch<{ items: Deal[] }>('/admin/deals'),
        adminFetch<{ items: Sponsor[] }>('/admin/sponsors'),
      ]);
      setItems(deals.items);
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
    await adminFetch('/admin/deals', { method: 'POST', body: form });
    setForm((f) => ({ ...f, title: '', discountValue: '' }));
    await load();
  }

  async function publish(id: string) {
    setBusyId(id);
    try {
      await adminFetch(`/admin/deals/${id}/publish`, { method: 'PATCH' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function pause(id: string) {
    setBusyId(id);
    try {
      await adminFetch(`/admin/deals/${id}/pause`, { method: 'PATCH' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Kampanyalar (Deals)</h2>

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
          placeholder="Kampanya başlığı"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.discountValue}
          onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
          placeholder="Örn. %20"
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
          {items.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
              <div>
                <p className="font-medium text-gray-900">{d.title}</p>
                <p className="text-xs text-gray-500">
                  {d.brandName} · {d.status} · {d.discountValue ?? '-'}
                </p>
              </div>
              <div className="flex gap-2">
                {d.status !== 'active' ? (
                  <button
                    disabled={busyId === d.id}
                    onClick={() => publish(d.id)}
                    className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700"
                  >
                    Yayınla
                  </button>
                ) : (
                  <button
                    disabled={busyId === d.id}
                    onClick={() => pause(d.id)}
                    className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700"
                  >
                    Duraklat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
