# UniCampus Dokümantasyon

Bu klasör UniCampus platformunun tüm ürün, mimari, güvenlik ve teknik tasarım dokümanlarını içerir. Dokümanlar numaralandırılmıştır; bağımlılık sırasıyla okunması önerilir.

## Okuma Sırası

### Ürün ve Tasarım
1. [01 — Ürün Vizyonu](./01-product-vision.md) — Neden, kim için, ne kapsamda
2. [14 — Sosyal × Kariyer Ürün Tasarımı](./14-social-career-product-design.md) — En kritik ürün kararı: dual evren
3. [02 — Kullanıcı Akışları](./02-user-flows.md) — Uçtan uca senaryolar
4. [03 — Sayfa Spec'leri](./03-page-specs/) — Ekran bazlı detaylar
5. [15 — Üyelik & Topluluklar](./15-membership-communities.md) — Kulüp/takım/topluluk katılımı
6. [13 — Rekabetçi Özellikler](./13-competitive-features.md) — Diferansiyatörler
7. [07 — UI Wireframe'ler](./07-ui-wireframes/) — Görsel taslaklar

### Mühendislik
8. [06 — Teknoloji Stack](./06-tech-stack.md) — Stack, kurulum, env
9. [04 — Veritabanı Şeması](./04-database-schema.md) — Tablolar, partitioning, RLS
10. [05 — API Sözleşmeleri](./05-api-contracts.md) — Endpoint'ler
11. [09 — Ölçeklenebilirlik Mimarisi](./09-scalability-architecture.md) — Milyon kullanıcı
12. [12 — Design System](./12-design-system.md) — Token, komponent, a11y

### İş ve Operasyon
13. [10 — Admin & Monetizasyon](./10-admin-monetization.md) — Gelir modeli
14. [11 — Güvenlik & Trust/Safety](./11-security-trust-safety.md) — E2E, KVKK
15. [08 — Geliştirme Yol Haritası](./08-development-roadmap.md) — Fazlar, sprint'ler

## Terminoloji (Sözlük)

| Terim | Anlamı |
|-------|--------|
| **content_domain** | Bir içeriğin ait olduğu evren: `social` veya `career`. Asla karışmaz. |
| **Takip (Follow)** | Tek yönlü ilişki (Instagram modeli) — içerik tüketimi. |
| **Bağlantı (Connection)** | Karşılıklı ilişki (LinkedIn modeli) — profesyonel ağ. |
| **Üniversite izolasyonu** | İçerik varsayılan olarak kullanıcının üniversitesiyle sınırlı. |
| **Görünürlük (visibility)** | Topluluk/hesap: `public` / `unlisted` / `private`. |
| **Katılım modu (join_mode)** | Topluluk: `open` / `request` / `invite`. |
| **Fan-out** | Post'un takipçi timeline'larına dağıtılması (write vs read). |
| **Edu doğrulama** | `.edu` domain whitelist + OTP ile öğrenci doğrulama. |
| **WCE** | North Star metrik: Weekly Connections + Engagement. |

## Doküman Sahipliği (Kod Eşlemesi)

| Doküman | İlgili kod konumu |
|---------|-------------------|
| 04 — DB Schema | `supabase/migrations/`, `packages/shared-types/` |
| 05 — API | `apps/api/src/routes/` |
| 12 — Design System | `packages/ui/` |
| 14 — Sosyal/Kariyer | `apps/api/src/services/feed/`, `apps/mobile/src/features/feed/` |
| 15 — Üyelik | `apps/api/src/services/community/` |
| 10 — Monetizasyon | `apps/admin/`, `apps/api/src/services/ads/` |
| 11 — Güvenlik | `packages/crypto/`, `apps/api/src/middleware/` |
