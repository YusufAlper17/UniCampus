# Supabase

UniCampus'un auth, realtime ve storage katmanı Supabase üzerinde. Şema migration'ları Drizzle ile `apps/api/drizzle/` altında üretilir; bu klasör Supabase'e özel parçaları (RLS policy'leri, Edge Functions) tutar.

## Yapı

```
supabase/
├── policies/
│   └── rls.sql              # Row Level Security politikaları (docs/04 + docs/11)
└── functions/
    └── send-otp-email/      # Edu mail OTP gönderimi (Edge Function)
```

## Sorumluluk Ayrımı

| Katman | Araç |
|--------|------|
| Tablo şeması + index | Drizzle (`apps/api/src/db/schema.ts`) |
| RLS policy | `supabase/policies/rls.sql` |
| Auth (JWT, session) | Supabase Auth + custom OTP (`apps/api`) |
| Realtime (DM, presence) | Supabase Realtime |
| Storage | R2/S3 (pre-signed) — Supabase Storage opsiyonel |
| Edge Functions | `supabase/functions/` |

## RLS Uygulama

```bash
# Migration sonrası policy'leri uygula
psql "$DATABASE_URL" -f supabase/policies/rls.sql
```

RLS'in amacı: üniversite izolasyonu + içerik görünürlüğü DB seviyesinde. Detay: [docs/11-security-trust-safety.md](../docs/11-security-trust-safety.md).
