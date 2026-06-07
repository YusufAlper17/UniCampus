# Sayfa Spec — Topluluklar (Discord Modeli)

Topluluk → kanal/grup hiyerarşisi. İlgili kod: `apps/mobile/src/features/communities/`, `apps/api/src/services/community/`.

## Topluluk İçi UI

```
☰  # genel  [👥][⋯]
[mesajlar, etkinlik kartları]
💬 Mesaj... [➤]

Drawer (☰):
  ITÜ Bilgisayar 2024
  ── Kanallar ──
  # genel
  # etkinlikler
  # duyurular (sadece admin)
  ── Gruplar ──
  👥 Final Çalışma (8)
  [+ Kanal/Grup ekle]
```

## Yapı

```
Topluluk
├── # genel          (kanal — broadcast, sınırsız üye)
├── # etkinlikler    (kanal)
├── # duyurular      (kanal, sadece admin yazar)
└── Grup: Final Çalışma (max 50 kişi, alt sohbet)
```

| Tip | Üye | Amaç |
|-----|-----|------|
| Kanal | Sınırsız | Topluluk içi broadcast |
| Grup | Max 50 | Alt sohbet (organize) |

## Oluşturma

| Alan | Kural |
|------|-------|
| Ad, açıklama, kapak | Zorunlu ad |
| Tip | Grup / kulüp-bağlı / takım-bağlı |
| Görünürlük | Açık / Gizli / Özel |
| Katılım modu | Herkese açık / İstekle / Sadece davet |

Varsayılan kanallar otomatik: `#genel`, `#duyurular`. Detay matris: [memberships.md](./memberships.md).

## Kanal Özellikleri

| Özellik | Öncelik |
|---------|---------|
| Metin mesaj | MVP |
| Etkinlik kartı paylaş | V1 |
| Pin mesaj | V1 |
| Thread (konu) | V1 |
| Slow mode | V1 |
| Rol bazlı yazma izni | V1 |
| Sesli kanal | V2 |

## İçerik Scope

Topluluk kanalı paylaşımları **ana akışa düşmez** — yalnızca topluluk içinde kalır. Ayrı scope.

## Roller

| Rol | Yetki |
|-----|-------|
| Owner | Tüm yetkiler, topluluk silme |
| Admin | Ayarlar, üye yönetimi, kanal CRUD |
| Moderator | Mesaj sil, üye sustur |
| Member | Yazma (izin varsa), okuma |

## API

| Aksiyon | Endpoint |
|---------|----------|
| Topluluk oluştur | `POST /communities` |
| Kanal ekle | `POST /communities/{id}/channels` |
| Mesaj gönder | `POST /channels/{id}/messages` |
| Üye yönet | `PATCH /communities/{id}/members/{uid}` |
