# 06 — Teknoloji Stack

## Genel Mimari (MVP)

```mermaid
flowchart TB
    subgraph client [Clients]
        RN["React Native + Expo"]
        AdminWeb["Next.js 15 Admin Panel"]
    end
    subgraph backend [Backend - MVP Monolith]
        API["Node.js API - Fastify"]
        Supa["Supabase Auth"]
        PG["PostgreSQL 16"]
        RedisNode["Redis 7"]
        MQ["BullMQ"]
    end
    subgraph external [External Services]
        Email["Resend"]
        Push["Expo Push + FCM/APNs"]
        Search["Meilisearch"]
        CDN["Cloudflare CDN + R2"]
    end
    RN --> API
    AdminWeb --> API
    API --> PG
    API --> RedisNode
    API --> MQ
    API --> Supa
    API --> Email
    API --> Search
    RN --> CDN
    AdminWeb --> CDN
```

## Stack Seçimleri ve Gerekçeleri

| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| Mobil | React Native + Expo (SDK 52+) | iOS/Android tek kod tabanı, OTA güncelleme, hızlı iterasyon |
| Admin Panel | Next.js 15 (App Router) + shadcn/ui + TanStack Table | Hızlı CRUD, responsive, SSR, güçlü tablo |
| API | Node.js 20 + Fastify + TypeScript | Yüksek throughput, düşük overhead, plugin ekosistemi |
| ORM/Query | Drizzle ORM | Tip güvenli, hafif, raw SQL'e yakın, migration desteği |
| Auth | Supabase Auth + custom OTP | Edu doğrulama, JWT, RLS entegrasyonu, admin rol ayrımı |
| DB | PostgreSQL 16 (partitioned) | İlişkisel, `university_id` partition, RLS |
| Cache | Redis 7 (cluster at scale) | Feed timeline, rate limit, presence, ad cache |
| Queue | BullMQ (Redis tabanlı) | Async fan-out, push batch, media processing |
| Realtime | Supabase Realtime → Centrifugo (scale) | DM, typing, presence |
| Medya | Cloudflare R2 / S3 + CDN | Ölçeklenebilir upload (pre-signed URL), global CDN |
| Arama | Meilisearch | Kullanıcı/kulüp/topluluk/hashtag araması |
| Email | Resend | OTP, bildirim e-postaları |
| Push | Expo Notifications + FCM/APNs | Bildirimler |
| Analytics | PostHog | Kullanıcı davranışı, funnel, reklam CTR |
| Monitoring | Sentry + Grafana/Prometheus | Hata, latency, SLA |
| State (mobil) | TanStack Query + Zustand | Server cache + lokal UI state |
| Styling (mobil) | NativeWind v4 | Tailwind sözdizimi, design token entegrasyonu |
| Animasyon | react-native-reanimated + lottie | 60fps, spring, mikro-etkileşim |
| i18n | i18next | TR + EN |
| CI/CD | GitHub Actions + EAS + Vercel | Otomatik build/deploy |
| Test | Vitest (api/packages) + Jest/RNTL (mobil) + Playwright (admin) | Birim + entegrasyon + e2e |

## Monorepo

Paket yöneticisi: **npm workspaces** (basitlik) + **Turborepo** (build cache, task orchestration).

```
unicampus/
├── apps/
│   ├── mobile/          # React Native (Expo)
│   ├── admin/           # Next.js 15
│   └── api/             # Fastify
├── packages/
│   ├── shared-types/    # Ortak TS tipleri + Zod şemaları
│   ├── ui/              # Design system
│   └── crypto/          # E2E wrapper (libsignal)
├── supabase/            # migrations, seed, RLS, functions
├── infra/               # docker-compose, k8s
└── docs/
```

`packages/shared-types` hem API hem mobil hem admin tarafından import edilir — tek doğruluk kaynağı (single source of truth) tipler ve doğrulama şemaları için.

## Yerel Geliştirme Kurulumu

### Önkoşullar

| Araç | Sürüm |
|------|-------|
| Node.js | 20 LTS |
| npm | 10+ |
| Docker + Docker Compose | güncel |
| Expo CLI | `npx expo` |
| Watchman (macOS) | önerilir |

### Adımlar

```bash
# 1. Bağımlılıklar (kökte)
npm install

# 2. Yerel altyapı (PostgreSQL + Redis + Meilisearch)
docker compose -f infra/docker-compose.yml up -d

# 3. Ortam değişkenleri
cp .env.example .env
# .env içindeki değerleri doldur

# 4. DB migration + seed
npm run db:migrate
npm run db:seed

# 5. Servisleri çalıştır
npm run dev --workspace=apps/api      # API → http://localhost:4000
npm run dev --workspace=apps/admin    # Admin → http://localhost:3000
npm run start --workspace=apps/mobile # Expo → QR / simulator
```

## Ortam Değişkenleri

Tüm gizli değerler `.env` dosyalarında; repoya **asla** commit edilmez. `.env.example` şablon olarak tutulur.

### `apps/api/.env`

```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://unicampus:unicampus@localhost:5432/unicampus
REDIS_URL=redis://localhost:6379
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
RESEND_API_KEY=
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=unicampus-media
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
OTP_PEPPER=
```

### `apps/mobile/.env`

```
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_CDN_URL=
EXPO_PUBLIC_POSTHOG_KEY=
```

### `apps/admin/.env`

```
NEXT_PUBLIC_API_URL=http://localhost:4000
DATABASE_URL=postgresql://unicampus:unicampus@localhost:5432/unicampus
ADMIN_SESSION_SECRET=
```

## Komut Referansı (kökten)

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Tüm uygulamaları paralel çalıştır (turbo) |
| `npm run build` | Tüm paketleri build et |
| `npm run lint` | ESLint tüm workspace |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run test` | Tüm testler |
| `npm run db:migrate` | Drizzle migration uygula |
| `npm run db:seed` | Seed data yükle |
| `npm run db:studio` | Drizzle Studio (DB GUI) |

## Sürüm ve Bağımlılık Politikası

- Bağımlılıklar paket yöneticisi ile eklenir (uydurma sürüm yok).
- Major sürüm yükseltmeleri ayrı PR'da, changelog incelemesiyle.
- `packages/shared-types` değişiklikleri tüm tüketicilerde tip kontrolünden geçmeli.

## Üretim Topolojisi (Özet)

| Bileşen | Pilot | Ölçek |
|---------|-------|-------|
| API | Railway/Render tek instance | Kubernetes, HPA |
| DB | Supabase/managed PG | Primary + read replica, partition |
| Redis | Managed tek instance | Redis Cluster |
| Medya | Cloudflare R2 + CDN | Aynı + image resize worker |
| Admin | Vercel | Vercel |
| Mobil | EAS Build → App Store/Play | Aynı + OTA |

Detaylı ölçek planı: [09 — Ölçeklenebilirlik Mimarisi](./09-scalability-architecture.md).
