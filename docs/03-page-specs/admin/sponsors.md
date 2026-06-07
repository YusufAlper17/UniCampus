# Admin Spec — Sponsor Yönetimi

Sponsor = platforma ödeme yapan marka. İlgili kod: `apps/admin/src/app/(dashboard)/sponsors/`.

## Liste

```
Sponsorlar  [+ Yeni Sponsor]
Starbucks TR | Sabit ₺15.000/ay | Aktif | 3 kampanya
  [Düzenle][Kampanyalar][Gelir Raporu]
Teknosa | CPA ₺5/kod | Aktif | 1 kampanya
  [Düzenle][Kampanyalar][Gelir Raporu]
```

## Sponsor CRUD Alanları

| Alan | Tip |
|------|-----|
| Marka adı, logo | text, upload |
| İletişim kişisi, email, telefon | text |
| Anlaşma tipi | CPA / CPC / Sabit / Hybrid |
| Anlaşma bedeli | ₺ |
| Başlangıç/bitiş | date |
| Hedef üniversiteler | çoklu seçim / "tümü" |
| Sözleşme dosyası | PDF upload |
| Durum | Taslak/Aktif/Duraklatıldı/Sona erdi |
| Notlar | iç kullanım |

## API

| Aksiyon | Endpoint |
|---------|----------|
| Liste | `GET /admin/sponsors` |
| Oluştur | `POST /admin/sponsors` |
| Güncelle | `PATCH /admin/sponsors/{id}` |
| Sözleşme | `POST /admin/sponsors/{id}/contracts` |
| Gelir raporu | `GET /admin/sponsors/{id}/revenue` |

Yalnızca `role in (admin, super_admin)` erişebilir.
