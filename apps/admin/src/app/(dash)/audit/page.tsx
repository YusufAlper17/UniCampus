'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/api';

interface AuditLog {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  adminUsername: string;
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ items: AuditLog[] }>('/admin/audit-logs')
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Denetim Günlüğü</h2>
      <p className="mt-1 text-sm text-gray-500">Son 100 yönetici işlemi.</p>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Yönetici</th>
              <th className="px-4 py-3">Aksiyon</th>
              <th className="px-4 py-3">Hedef</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Yükleniyor...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Kayıt yok.
                </td>
              </tr>
            ) : (
              items.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">@{log.adminUsername}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {log.targetType ? `${log.targetType}:${log.targetId?.slice(0, 8)}` : '—'}
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
