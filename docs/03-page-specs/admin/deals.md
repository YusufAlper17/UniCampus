# Admin Spec — Kampanya (Deals) Yönetimi

Admin buradan mobil "İndirimler & Fırsatlar" sayfasına içerik girer. İlgili kod: `apps/admin/src/app/(dashboard)/deals/`.

## Kampanya Formu

| Alan | Kural |
|------|-------|
| Sponsor | dropdown (zorunlu) |
| Başlık, açıklama, banner | zorunlu başlık |
| İndirim kodu | otomatik üret veya manuel |
| İndirim oranı/tutarı | % veya ₺ |
| Kategori | yeme/teknoloji/giyim/eğlence... |
| Hedef | üniversite(ler), bölüm, sınıf (ops.) |
| Başlangıç/bitiş | date |
| Kullanım limiti | sayı veya sınırsız |
| Sponsor link | URL |
| Durum | Taslak/Yayında/Sona erdi |

## Admin Aksiyon → Mobil Etki

| Admin | Mobil |
|-------|-------|
| Yayınla | Deals sayfasında görünür (cache invalidate) |
| Duraklat | Mobilde gizlenir |
| Limit doldu | "Kampanya sona erdi" |

## API

| Aksiyon | Endpoint |
|---------|----------|
| Liste | `GET /admin/deals` |
| Oluştur | `POST /admin/deals` |
| Yayınla | `PATCH /admin/deals/{id}/publish` |
| Duraklat | `PATCH /admin/deals/{id}/pause` |
| Performans | `GET /admin/deals/{id}/stats` (reveal, click, dönüşüm) |

Yayınlama → `INVALIDATE deals:{university_id}` Redis.
