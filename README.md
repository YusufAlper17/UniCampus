# UniCampus

Üniversite öğrencilerine özel, `.edu` mail doğrulamalı sosyal medya ve kariyer platformu. Instagram'ın sosyal akışını, LinkedIn'in kariyer ağını ve Discord'un topluluk yapısını tek uygulamada — ama sosyal ve kariyer evrenlerini **asla birbirine karıştırmadan** — birleştirir.

## Vizyon

Üniversite öğrencisinin sosyal hayatı (Instagram) ve kariyer kimliği (LinkedIn) tek uygulamada. `.edu` doğrulaması güveni, kampüs ağı network effect'i sağlar. Hedef: milyon kullanıcıya ölçeklenebilir, enterprise güvenlikli, unicorn potansiyelli bir platform.

## Monorepo Yapısı

```
unicampus/
├── apps/
│   ├── mobile/          # React Native (Expo) — öğrenci/kulüp/takım uygulaması
│   ├── admin/           # Next.js admin paneli — yönetim + monetizasyon
│   └── api/             # Node.js (Fastify) API — monolith, mikroservise hazır
├── packages/
│   ├── shared-types/    # Mobil + admin + api ortak TypeScript tipleri
│   ├── ui/              # Design system komponent kütüphanesi
│   └── crypto/          # E2E şifreleme wrapper (libsignal)
├── supabase/            # Migrations, RLS policy'leri, seed data, Edge Functions
├── infra/               # Docker, Kubernetes manifest'leri (ölçek fazı)
└── docs/                # Tüm ürün, mimari ve teknik dokümanlar
```

## Dokümantasyon

Tüm tasarım ve mühendislik dokümanları [`docs/`](./docs/) altında. Başlangıç noktası: [`docs/README.md`](./docs/README.md).

| Doküman | İçerik |
|---------|--------|
| [01 — Ürün Vizyonu](./docs/01-product-vision.md) | Vizyon, kullanıcı tipleri, MVP kapsamı, North Star metrik |
| [02 — Kullanıcı Akışları](./docs/02-user-flows.md) | Kayıt, paylaşım, etkinlik, üyelik, mesajlaşma akışları |
| [03 — Sayfa Spec'leri](./docs/03-page-specs/) | Her ekranın detaylı davranış spesifikasyonu |
| [04 — Veritabanı Şeması](./docs/04-database-schema.md) | PostgreSQL tablolar, partitioning, ER, RLS |
| [05 — API Sözleşmeleri](./docs/05-api-contracts.md) | REST endpoint'leri, admin API, monetizasyon |
| [06 — Teknoloji Stack](./docs/06-tech-stack.md) | Stack seçimleri, kurulum, ortam değişkenleri |
| [07 — UI Wireframe'ler](./docs/07-ui-wireframes/) | Mobil + admin ASCII wireframe'ler |
| [08 — Geliştirme Yol Haritası](./docs/08-development-roadmap.md) | 13 fazlık sprint planı |
| [09 — Ölçeklenebilirlik](./docs/09-scalability-architecture.md) | Milyon kullanıcı mimarisi, geçiş planı |
| [10 — Admin & Monetizasyon](./docs/10-admin-monetization.md) | Admin panel, sponsor, reklam, gelir |
| [11 — Güvenlik & Trust](./docs/11-security-trust-safety.md) | E2E, KVKK, anti-abuse, audit |
| [12 — Design System](./docs/12-design-system.md) | Token'lar, komponentler, animasyon, a11y |
| [13 — Rekabetçi Özellikler](./docs/13-competitive-features.md) | Diferansiyatör özellik matrisi |
| [14 — Sosyal × Kariyer](./docs/14-social-career-product-design.md) | Dual feed, bağlantı modeli, taksonomi |
| [15 — Üyelik & Topluluklar](./docs/15-membership-communities.md) | Görünürlük/katılım matrisi, davet linki |

## Hızlı Başlangıç

```bash
# Bağımlılıkları kur (monorepo kökünde)
npm install

# Yerel altyapıyı başlat (PostgreSQL + Redis)
docker compose -f infra/docker-compose.yml up -d

# Veritabanı migration + seed
npm run db:migrate
npm run db:seed

# API'yi geliştirme modunda çalıştır
npm run dev --workspace=apps/api

# Mobil uygulamayı çalıştır
npm run start --workspace=apps/mobile

# Admin panelini çalıştır
npm run dev --workspace=apps/admin
```

Detaylı kurulum için [`docs/06-tech-stack.md`](./docs/06-tech-stack.md).

## Lisans

Özel (proprietary). Tüm hakları saklıdır.
