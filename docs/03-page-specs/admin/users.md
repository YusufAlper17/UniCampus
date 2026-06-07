# Admin Spec — Kullanıcı Yönetimi

İlgili kod: `apps/admin/src/app/(dashboard)/users/`. Tablo: TanStack Table + cursor pagination (1M+ için).

## Liste

```
Kullanıcılar  [+ Export CSV]
🔍 isim, @username, email
Filtre: [Üniversite▼][Tip▼][Durum▼]
─ satırlar ─
@ali_yilmaz | Öğrenci | ITÜ | Aktif | 12.04.2026
  [Detay][Ban][Mesaj]
@ieee_kulubu | Kulüp | ITÜ | Onay Bekliyor
  [Onayla][Reddet][Detay]
```

## Özellikler

| Özellik | Açıklama |
|---------|----------|
| Arama/filtre | Üniversite, tip, durum |
| Pagination | Cursor-based (ölçek) |
| Detay | Profil, post geçmişi, şikayet geçmişi, DM metadata (içerik değil — KVKK) |
| Aksiyonlar | Ban (geçici/kalıcı), suspend, uyar, rol değiştir, sil |
| Kulüp/takım onay | Bekleyen başvuru onay/red, belge görüntüle |
| Toplu işlem | Üniversite duyurusu, toplu ban (spam dalgası) |

## Aksiyon Akışı

| Aksiyon | Endpoint | Audit |
|---------|----------|-------|
| Ban | `POST /admin/users/{id}/ban` | Evet |
| Suspend | `POST /admin/users/{id}/suspend` | Evet |
| Rol değiştir | `PATCH /admin/users/{id}/role` | Evet (super_admin) |
| Kulüp onay | `POST /admin/users/{id}/approve` | Evet |
| Sil | `DELETE /admin/users/{id}` | Evet (soft → 30g) |

Tüm aksiyonlar `admin_audit_log`'a yazılır (immutable).

## KVKK Notu

DM içeriği admin'e **gösterilmez** — sadece metadata (kim, ne zaman, kaç mesaj). E2E içerik zaten sunucuda okunamaz.
