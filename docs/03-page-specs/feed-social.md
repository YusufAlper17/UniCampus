# Sayfa Spec — Sosyal Akış (Home Feed)

Instagram + Twitter hibrit. **Yalnızca `content_domain=social`.** Kariyer içeriği bu akışa asla düşmez. İlgili kod: `apps/mobile/src/features/feed/`, `apps/api/src/services/feed/`.

## Yapı

```
TopBar: UniCampus | 🔔 | ✉️
Tab switch: [Sosyal ●] [Kariyer]
Story şeridi (yatay)
Trendler şeridi (#hashtag)
Top Topics chip'leri (Kariyer chip YOK)
Feed listesi: post | reklam | etkinlik | anket (FlashList)
```

## Feed Algoritması

1. `WHERE content_domain = 'social'` — zorunlu, kaldırılamaz filtre.
2. Takip edilenlerin postları (Redis `feed:social:{user_id}`, cursor-based).
3. Üniversite içi yüksek engagement postları (%20 keşfet karışımı).
4. Reklam enjeksiyonu: her 5–7 postta 1 sponsorlu kart (sadece sosyal akış).

Cache miss → PostgreSQL'den rebuild + cache warm. Detay: [09 — Ölçeklenebilirlik](../09-scalability-architecture.md).

## Post Kartı Etkileşimleri

| İkon | Aksiyon | API | Davranış |
|------|---------|-----|----------|
| ♡ | Beğen | `POST /posts/{id}/like` | Optimistic toggle, lottie animasyon, sayaç |
| 💬 | Yorum | `GET /posts/{id}/comments` | Post detay / yorum sheet |
| ↗ | Paylaş | — | DM'ye gönder / repost (V1) |
| 🔖 | Kaydet | `POST /posts/{id}/bookmark` | Koleksiyona ekle |
| ⋯ | Menü | — | Şikayet, sessize al, kopyala, ilgilenmiyorum |

Çift tıklama (double-tap) → beğeni + kalp animasyonu.

## Story Şeridi

| Özellik | Davranış |
|---------|----------|
| TTL | 24 saat |
| İçerik | Foto/video + metin overlay (V1: sticker, anket) |
| Görüntüleyenler | Sahibine liste |
| Rozet | Kulüp/takım story'si rozetli |
| Tap | Sol/sağ geçiş, progress bar, basılı tut duraklat |

## Trendler ve Top Topics

- Trendler: son 24 saat en çok kullanılan hashtag (üniversite bazlı, Redis `trending:{university_id}`, 5 dk TTL).
- Top Topics: önceden tanımlı sosyal kategoriler (Etkinlik, Housing, Kampüs). "Kariyer" topic'i yok.
- Tıklama → filtrelenmiş akış / hashtag sayfası.

## Reklam Kartı Kuralları

- "Sponsorlu" etiketi zorunlu (yasal).
- Tıklama → `POST /ads/click` + landing/Deals.
- Gösterim → `POST /ads/impression` (viewability: %50 görünür 1 sn).
- "İlgilenmiyorum" feedback; reklam gizlenemez ama az gösterilir.

## Boş ve Hata Durumları

| Durum | UI |
|-------|-----|
| Boş feed | Curated starter + "5 kulüp takip et" |
| Ağ yok | Cache feed + çevrimdışı banner |
| Yenileme | Pull-to-refresh, skeleton |
| Sayfa sonu | Infinite scroll, alt skeleton |

## Performans Hedefleri

| Metrik | Hedef |
|--------|-------|
| İlk render | < 300ms (skeleton) |
| Scroll | 60fps (FlashList recycling) |
| Görsel | BlurHash → progressive |
