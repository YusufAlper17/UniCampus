'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/api';

interface Opportunity {
  id: string;
  title: string;
  company: string | null;
  type: string;
  createdAt: string;
  authorUsername: string;
}

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporterUsername: string;
}

export default function ModerationPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ opportunities: Opportunity[]; reports: Report[] }>(
        '/admin/moderation/queue',
      );
      setOpportunities(res.opportunities);
      setReports(res.reports);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decideOpportunity(id: string, decision: 'approve' | 'reject') {
    setBusyId(id);
    try {
      await adminFetch(`/admin/moderation/opportunities/${id}/${decision}`, { method: 'POST' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function resolveReport(id: string, status: 'resolved' | 'dismissed') {
    setBusyId(id);
    try {
      await adminFetch(`/admin/reports/${id}/resolve`, { method: 'POST', body: { status } });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Moderasyon</h2>

      {loading ? (
        <p className="mt-8 text-sm text-gray-400">Yükleniyor...</p>
      ) : (
        <>
          <section className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Bekleyen Fırsat İlanları ({opportunities.length})
            </h3>
            <div className="mt-3 space-y-3">
              {opportunities.length === 0 ? (
                <p className="text-sm text-gray-400">Bekleyen ilan yok.</p>
              ) : (
                opportunities.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{o.title}</p>
                      <p className="text-xs text-gray-500">
                        {o.company ?? 'Şirket yok'} · {o.type} · @{o.authorUsername}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === o.id}
                        onClick={() => decideOpportunity(o.id, 'approve')}
                        className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        Onayla
                      </button>
                      <button
                        disabled={busyId === o.id}
                        onClick={() => decideOpportunity(o.id, 'reject')}
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900">Açık Şikayetler ({reports.length})</h3>
            <div className="mt-3 space-y-3">
              {reports.length === 0 ? (
                <p className="text-sm text-gray-400">Açık şikayet yok.</p>
              ) : (
                reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {r.reason} · <span className="text-gray-500">{r.targetType}</span>
                      </p>
                      {r.details ? <p className="text-xs text-gray-500">{r.details}</p> : null}
                      <p className="text-xs text-gray-400">Şikayet eden: @{r.reporterUsername}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => resolveReport(r.id, 'resolved')}
                        className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        Çözüldü
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => resolveReport(r.id, 'dismissed')}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
