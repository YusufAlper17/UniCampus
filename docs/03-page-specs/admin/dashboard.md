# Admin Spec — Dashboard

İlgili kod: `apps/admin/src/app/(dashboard)/page.tsx`. Erişim: `role in (moderator, admin, super_admin)`.

## Layout

```
UniCampus Admin                    [Avatar ▼]
┌────────┬────────────────────────────────┐
│ Menu   │ Dashboard                       │
│ Dash   │ [DAU][MAU][Post][Gelir] kartlar │
│ Users  │ [Kullanıcı büyüme grafiği 30g]  │
│ Content│ [Gelir grafiği: sponsor vs ad]  │
│ Sponsor│ Son şikayetler (5)              │
│ Ads    │ Bekleyen kulüp onayı (3)        │
│ Deals  │                                 │
│ Univ.  │                                 │
│ Analyt.│                                 │
│ Setting│                                 │
└────────┴────────────────────────────────┘
```

## KPI Kartları

| Kart | Kaynak |
|------|--------|
| DAU | Aktif kullanıcı (24s) |
| MAU | Aktif kullanıcı (30g) |
| Post | Toplam/günlük post |
| Gelir | Sponsor + reklam (₺) |

## Widget'lar

- Kullanıcı büyüme grafiği (30 gün, üniversite kırılımı filtresi).
- Gelir grafiği (sponsor sabit vs reklam performans).
- Son şikayetler kuyruğu (hızlı aksiyon).
- Bekleyen kulüp/takım onayları.

## API

`GET /admin/dashboard/stats` → tüm KPI + grafik verisi (cache 1 dk).
