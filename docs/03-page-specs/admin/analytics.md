# Admin Spec — Gelir ve Analitik

İlgili kod: `apps/admin/src/app/(dashboard)/analytics/`.

## Metrikler

| Metrik | Kaynak |
|--------|--------|
| Sponsor geliri | `sponsor_contracts` + `deal_redemptions` |
| Reklam geliri | `ad_impressions` × CPM veya `ad_clicks` × CPC |
| Kampanya performansı | reveal, click, dönüşüm |
| Kullanıcı metrikleri | DAU, MAU, retention, üniversite kırılımı |
| İçerik metrikleri | post/gün, engagement oranı |

## Raporlar

- Aylık gelir özeti (sponsor vs reklam).
- Üniversite bazlı kullanıcı/gelir kırılımı.
- Kampanya/reklam CTR ve dönüşüm.
- Export: CSV / PDF.

## API

| Aksiyon | Endpoint |
|---------|----------|
| Genel | `GET /admin/analytics/overview` |
| Reklam | `GET /admin/analytics/ads` |
| Gelir | `GET /admin/analytics/revenue?from=&to=` |
| Export | `GET /admin/analytics/export?format=csv` |

## Gelir Hesaplama Notu

Impression/click event'leri BullMQ ile batch aggregate edilir (idempotent). Gerçek zamanlı sayaç Redis'te, kalıcı toplam PostgreSQL'de. Detay: [10 — Monetizasyon](../../10-admin-monetization.md).
