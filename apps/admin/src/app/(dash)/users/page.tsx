'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/api';

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  type: string;
  status: string;
  followerCount: number;
  postCount: number;
  suspendedUntil: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  banned: 'bg-red-100 text-red-700',
  pending_approval: 'bg-blue-100 text-blue-700',
  deleted: 'bg-gray-100 text-gray-500',
};

export default function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    try {
      const res = await adminFetch<{ items: AdminUser[] }>(`/admin/users?${params.toString()}`);
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: 'suspend' | 'ban' | 'activate') {
    setBusyId(id);
    try {
      const body = action === 'suspend' ? { days: 7 } : undefined;
      await adminFetch(`/admin/users/${id}/${action}`, { method: 'POST', body });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Kullanıcılar</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kullanıcı adı veya isim ara..."
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="suspended">Askıda</option>
          <option value="banned">Yasaklı</option>
          <option value="pending_approval">Onay bekliyor</option>
        </select>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Tip</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Takipçi</th>
              <th className="px-4 py-3">Gönderi</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Yükleniyor...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.displayName}</p>
                    <p className="text-xs text-gray-400">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_TONE[u.status] ?? ''}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.followerCount}</td>
                  <td className="px-4 py-3 text-gray-600">{u.postCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {u.status === 'active' ? (
                        <>
                          <ActionButton label="Askıya Al" tone="amber" disabled={busyId === u.id} onClick={() => act(u.id, 'suspend')} />
                          <ActionButton label="Yasakla" tone="red" disabled={busyId === u.id} onClick={() => act(u.id, 'ban')} />
                        </>
                      ) : (
                        <ActionButton label="Aktifleştir" tone="green" disabled={busyId === u.id} onClick={() => act(u.id, 'activate')} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  tone: 'amber' | 'red' | 'green';
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClass: Record<string, string> = {
    amber: 'border-amber-300 text-amber-700 hover:bg-amber-50',
    red: 'border-red-300 text-red-700 hover:bg-red-50',
    green: 'border-green-300 text-green-700 hover:bg-green-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${toneClass[tone]}`}
    >
      {label}
    </button>
  );
}
