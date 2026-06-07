# 05 — API Sözleşmeleri

REST API. Base URL: `/v1`. JSON. Auth: `Authorization: Bearer <access_token>`. İlgili kod: `apps/api/src/routes/`. İstek/yanıt şemaları `packages/shared-types` (Zod) ile paylaşılır.

## Genel Kurallar

| Konu | Kural |
|------|-------|
| Sürüm | URL path: `/v1` |
| Auth | JWT Bearer; access 15 dk, refresh 7 gün (rotation) |
| Pagination | Cursor-based: `?cursor=<opaque>&limit=20` |
| Idempotency | Yazma için `Idempotency-Key` header (ödeme/gelir kritik) |
| Rate limit | Header: `X-RateLimit-Remaining`; aşımda 429 |
| Hata formatı | `{ error: { code, message, details? } }` |
| Tarih | ISO 8601 UTC |
| Üniversite izolasyonu | JWT'deki `university_id` claim'inden uygulanır |

### Standart Hata Kodları

| HTTP | code | Anlam |
|------|------|-------|
| 400 | `validation_error` | Geçersiz girdi |
| 401 | `unauthorized` | Token yok/geçersiz |
| 403 | `forbidden` | Yetki yok |
| 404 | `not_found` | Kaynak yok |
| 409 | `conflict` | Çakışma (örn. username dolu) |
| 422 | `domain_mismatch` | Edu mail üniversiteye ait değil |
| 429 | `rate_limited` | Limit aşıldı |
| 500 | `internal_error` | Sunucu hatası |

## Auth

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/send-otp` | `{email, university_id}` → domain kontrol + OTP |
| POST | `/auth/verify-otp` | `{email, code}` → geçici token |
| POST | `/users/register` | Profil oluştur → access+refresh |
| POST | `/auth/login` | `{email, password}` → token (veya 2FA challenge) |
| POST | `/auth/2fa/verify` | `{challenge_id, totp}` → token |
| POST | `/auth/refresh` | `{refresh_token}` → yeni çift (rotation) |
| POST | `/auth/logout` | Oturum sonlandır |
| POST | `/auth/forgot-password` | `{email}` → reset maili |
| POST | `/auth/reset-password` | `{token, password}` |

**Örnek — send-otp**

```http
POST /v1/auth/send-otp
{ "email": "ali@itu.edu.tr", "university_id": "uuid" }

200 { "sent": true, "retry_after": 60 }
422 { "error": { "code": "domain_mismatch", "message": "Bu mail İTÜ'ye ait değil" } }
```

## Users & Profil

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/users/me` | Kendi profil |
| PATCH | `/users/me` | Profil güncelle |
| PATCH | `/users/me/academic` | Akademik bilgi + görünürlük |
| PATCH | `/users/me/privacy` | Gizlilik ayarları |
| PATCH | `/users/me/notification-prefs` | Bildirim tercihleri |
| GET | `/users/{username}` | Başka profil (görünürlük filtreli) |
| GET | `/users/{id}/academic` | Akademik (alan görünürlüğü uygulanır) |
| GET | `/users/{id}/posts?domain=social\|career` | Profil postları |
| GET | `/users/{id}/memberships` | Kulüp/takım/topluluk üyelikleri |

## Sosyal Graf

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/users/{id}/follow` | Takip (açık) / istek (gizli) |
| DELETE | `/users/{id}/follow` | Takibi bırak |
| GET | `/follow-requests` | Bekleyen takip istekleri |
| POST | `/follow-requests/{id}/accept` | Onayla |
| POST | `/follow-requests/{id}/reject` | Reddet |
| POST | `/connections/request` | `{receiver_id}` bağlantı isteği |
| GET | `/connections/requests` | Bekleyen bağlantı istekleri |
| POST | `/connections/{id}/accept` | Kabul → mutual |
| POST | `/connections/{id}/reject` | Reddet |
| DELETE | `/connections/{id}` | Bağlantı kaldır |
| GET | `/users/{id}/connections` | Bağlantı listesi |

## Feed (Dual)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/feed?domain=social&cursor=&limit=` | Sosyal akış (+ reklam slot) |
| GET | `/feed?domain=career&cursor=&limit=` | Kariyer akış (reklamsız) |
| GET | `/explore?domain=social\|career` | Keşfet |
| GET | `/trending` | Üniversite trend hashtag'leri |
| GET | `/hashtags/{tag}/posts` | Hashtag akışı (sosyal) |

**Örnek — feed yanıtı (heterojen)**

```json
{
  "items": [
    { "type": "post", "id": "...", "author": {...}, "content": "...", "content_domain": "social" },
    { "type": "ad", "campaign_id": "...", "media_url": "...", "cta_text": "Daha Fazla" },
    { "type": "event", "id": "...", "title": "...", "starts_at": "..." }
  ],
  "next_cursor": "opaque"
}
```

> Sözleşme garantisi: `domain=social` isteği `content_domain=career` item döndürmez; `domain=career` isteğinde `type=ad` item bulunmaz.

## Posts & Etkileşim

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/posts` | `{content_domain, type, content, media_urls, visibility}` |
| GET | `/posts/{id}` | Post detay |
| DELETE | `/posts/{id}` | Sil (sahip) |
| POST | `/posts/{id}/like` / DELETE | Beğen/geri al |
| POST | `/posts/{id}/bookmark` / DELETE | Kaydet |
| GET | `/posts/{id}/comments` | Yorumlar |
| POST | `/posts/{id}/comments` | Yorum ekle (`parent_id` ops.) |
| POST | `/media/presign` | `{content_type, size}` → R2 pre-signed URL |

## Kariyer

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/career/projects` | Proje oluştur |
| GET | `/career/projects/{id}` | Proje detay |
| POST | `/career/milestones` | Milestone |
| POST | `/career/milestones/{id}/congrats` | Tebrik et |
| POST | `/career/opportunities` | Fırsat (moderasyona girer) |
| POST | `/career/opportunities/{id}/interest` | İlgileniyorum |

## Etkinlik & Anket

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/events` | Etkinlik oluştur |
| GET | `/events/{id}` | Detay |
| POST | `/events/{id}/join` | Katıl / istek / davet kontrolü |
| DELETE | `/events/{id}/join` | İptal |
| PATCH | `/events/{id}/participants/{uid}` | Onayla/reddet (organizatör) |
| GET | `/events/{id}/ics` | Takvim export |
| POST | `/polls` | Anket oluştur |
| POST | `/polls/{id}/vote` | `{option_ids[]}` |

## Mesajlaşma

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/conversations` | Sohbet listesi |
| POST | `/conversations` | DM/grup oluştur |
| GET | `/conversations/{id}/messages?cursor=` | Mesajlar |
| POST | `/conversations/{id}/messages` | Mesaj gönder (ciphertext) |
| PATCH | `/messages/{id}` | Düzenle (15 dk) |
| DELETE | `/messages/{id}?scope=me\|all` | Sil |
| POST | `/messages/{id}/reactions` | Emoji tepki |
| POST | `/conversations/{id}/read` | Okundu işaretle |
| PATCH | `/conversations/{id}` | Mute/pin/grup ayarı |

Realtime: Supabase Realtime channel `conversation:{id}` (mesaj, typing, presence).

## Topluluk & Üyelik

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/communities` | Oluştur (visibility, join_mode) |
| GET | `/communities/{id}` | Detay (RLS) |
| POST | `/communities/{id}/join` | Katıl/istek (moda göre) |
| DELETE | `/communities/{id}/members/me` | Ayrıl |
| GET | `/communities/{id}/requests` | Bekleyen istekler (admin) |
| POST | `/communities/{id}/requests/{uid}/approve` | Onayla |
| POST | `/communities/{id}/requests/{uid}/reject` | Reddet |
| PATCH | `/communities/{id}/members/{uid}` | Rol değiştir |
| DELETE | `/communities/{id}/members/{uid}` | Çıkar |
| POST | `/communities/{id}/invite-links` | Davet linki üret |
| DELETE | `/invite-links/{id}` | İptal |
| POST | `/join/{token}` | Link ile katıl |
| POST | `/communities/{id}/channels` | Kanal ekle |
| POST | `/channels/{id}/messages` | Kanal mesajı |

## Arama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/search?q=&type=user\|community\|hashtag\|event&domain=` | Meilisearch |

> Topluluk araması yalnızca `visibility=public` döndürür.

## Deals (Mobil)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/deals?university_id=&category=` | Aktif kampanyalar |
| GET | `/deals/{id}` | Detay |
| POST | `/deals/{id}/reveal` | Kod göster (`deal_redemptions`) |
| POST | `/deals/{id}/click` | Mağaza tıklama (attribution) |

## Ads (Mobil — tracking)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/ads/impression` | `{campaign_id}` (idempotent, batch) |
| POST | `/ads/click` | `{campaign_id}` |
| POST | `/ads/{id}/not-interested` | Feedback |

## Bildirimler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/notifications?cursor=` | Liste |
| POST | `/notifications/read` | `{ids[]}` okundu |
| POST | `/devices` | Push token kaydet |

## Moderasyon

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/reports` | `{entity_type, entity_id, reason}` |
| POST | `/users/{id}/block` / DELETE | Engelle/kaldır |

---

## Admin API (`/v1/admin`)

Erişim: JWT `role in (moderator, admin, super_admin)`. Ayrı rate-limit bucket. Tüm yazma aksiyonları `admin_audit_log`'a yazılır.

| Method | Endpoint | Rol |
|--------|----------|-----|
| GET | `/admin/dashboard/stats` | moderator+ |
| GET | `/admin/users?cursor=&q=&filter=` | moderator+ |
| GET | `/admin/users/{id}` | moderator+ |
| POST | `/admin/users/{id}/ban` | moderator+ |
| POST | `/admin/users/{id}/suspend` | moderator+ |
| POST | `/admin/users/{id}/warn` | moderator+ |
| PATCH | `/admin/users/{id}/role` | super_admin |
| POST | `/admin/users/{id}/approve` | admin+ (kulüp/takım) |
| GET | `/admin/reports?status=` | moderator+ |
| PATCH | `/admin/reports/{id}` | moderator+ |
| GET/POST | `/admin/sponsors` | admin+ |
| PATCH | `/admin/sponsors/{id}` | admin+ |
| POST | `/admin/sponsors/{id}/contracts` | admin+ |
| GET/POST | `/admin/deals` | admin+ |
| PATCH | `/admin/deals/{id}/publish` | admin+ |
| PATCH | `/admin/deals/{id}/pause` | admin+ |
| GET/POST | `/admin/ads` | admin+ |
| PATCH | `/admin/ads/{id}` | admin+ |
| GET | `/admin/analytics/overview` | admin+ |
| GET | `/admin/analytics/revenue?from=&to=` | admin+ |
| GET | `/admin/analytics/export?format=csv` | admin+ |
| GET/POST | `/admin/universities` | super_admin |

**Örnek — kampanya yayınlama**

```http
PATCH /v1/admin/deals/{id}/publish
Authorization: Bearer <admin_token>

200 { "id": "...", "status": "active" }
# yan etki: INVALIDATE deals:{university_id} (Redis)
```

## Webhook / Edge Functions

| Olay | Açıklama |
|------|----------|
| `email.otp` | Resend OTP gönderimi (Edge Function) |
| `media.process` | Upload sonrası thumbnail/resize (worker) |
| `feed.fanout` | Post sonrası timeline dağıtımı (BullMQ) |
| `ads.aggregate` | Impression/click batch (BullMQ, idempotent) |

## OpenAPI

Tam makine-okur sözleşme `apps/api`'de Fastify schema'larından `@fastify/swagger` ile üretilir → `/v1/docs` (Swagger UI). Bu doküman insan-okur özettir; tek doğruluk kaynağı kod içi Zod/JSON şemalardır.
