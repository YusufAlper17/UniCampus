'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/api';

interface Sponsor {
  id: string;
  brandName: string;
  logoUrl: string | null;
  status: string;
  contactEmail: string | null;
  createdAt: string;
}

export default function SponsorsPage() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ items: Sponsor[] }>('/admin/sponsors');
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) return;
    setBusy(true);
    try {
      await adminFetch('/admin/sponsors', { method: 'POST', body: { brandName: brandName.trim() } });
      setBrandName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Sponsorlar</h2>

      <form onSubmit={create} className="mt-6 flex gap-2">
        <input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Marka adı"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Ekle
        </button>
      </form>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Yükleniyor...</p>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((s) => (
            <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">{s.brandName}</p>
              <p className="text-xs text-gray-500">
                {s.status} · {s.contactEmail ?? 'İletişim yok'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
