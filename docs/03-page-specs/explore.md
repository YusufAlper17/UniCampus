# Sayfa Spec — Keşfet ve Arama

Sosyal ve kariyer keşfi ayrı alt sekmelerde — karışmaz. İlgili kod: `apps/mobile/src/features/explore/`, `apps/api/src/services/search/`.

## Yapı

```
🔍 Ara...
[Sosyal ●] [Kariyer]
─ Sosyal sekme ─
  🎁 İndirimler & Fırsatlar (yatay kart şeridi)
  Önerilen Kulüpler
  Önerilen Takımlar / Topluluklar
  Popüler Gönderiler (grid)
─ Kariyer sekme ─
  Trend projeler
  Fırsat ilanları
  Öne çıkan öğrenciler
  Bağlantı önerileri
```

## Arama (Meilisearch)

| Sekme | Aranabilir |
|-------|-----------|
| Sosyal | Hesaplar, Kulüpler, Takımlar, Topluluklar, Hashtag, Etkinlik |
| Kariyer | Kişiler, Projeler, Fırsatlar, Beceriler (tag) |

Kurallar:
- Topluluk araması yalnızca `visibility=public` döndürür (gizli/özel asla).
- Üniversite filtresi otomatik uygulanır (izolasyon).
- Son aramalar lokal cache'te.
- Sonuç tıklama → ilgili profil/detay/hashtag sayfası.

## Keşfet Algoritması

| Bölüm | Mantık |
|-------|--------|
| Önerilen kulüpler | Üniversite + ilgi + arkadaş üyelikleri |
| Popüler gönderiler | Takip edilmeyen, yüksek engagement, son 48s |
| Bağlantı önerileri | 2. derece, aynı bölüm, ortak proje |

## Performans

- Arama debounce 300ms.
- Sonuçlar sayfalı (cursor).
- Grid: FlashList, BlurHash placeholder.
