# Sayfa Spec — Kariyer İçeriği Oluşturma

`content_domain=career`. Proje / Milestone / Fırsat. İlgili kod: `apps/mobile/src/features/create/career/`.

## Giriş Noktası

Orta tab `+` → Bottom Sheet → "Kariyer" bölümü.

## Proje Oluşturma

| Alan | Kural |
|------|-------|
| Başlık | Zorunlu, ≤ 120 karakter |
| Rol | Örn. "Full-stack Developer" |
| Açıklama | ≤ 2000 karakter |
| Tech stack | Tag listesi (autocomplete) |
| Medya | Görsel/galeri (ops.) |
| Linkler | GitHub, demo URL (doğrulanır) |
| Ekip üyeleri | @mention → bağlantılar onaylayınca eklenir |
| Görünürlük | Herkes / Bağlantılar / Gizli |

`POST /career/projects` → `career_projects` + `posts(content_domain=career, type=project)`.

## Milestone Oluşturma

| Alan | Kural |
|------|-------|
| Başlık | "Google'da stajyer oldum" |
| Açıklama | Kısa metin |
| Görsel | Opsiyonel |
| Tarih | Opsiyonel |

Yayında "Tebrik Et" reaksiyonu açıktır.

## Fırsat İlanı Oluşturma

| Alan | Kural |
|------|-------|
| Tip | Staj / part-time / proje ekibi / hackathon |
| Başlık | Zorunlu |
| Açıklama | Detay, gereksinimler |
| Başvuru | DM / harici link |
| Son tarih | Opsiyonel |

Fırsat ilanı **admin moderasyonundan** geçer (spam/sahte ilan önleme) → onaylanınca kariyer akışında.

## Ortak Kurallar

- Tüm kariyer içeriği `content_domain=career` → yalnızca kariyer akışında, kariyer profil sekmesinde, kariyer keşfette görünür.
- Sosyal akışa **asla** düşmez.
- Ekip mention'ı: davet → onay → `career_project_members`.
