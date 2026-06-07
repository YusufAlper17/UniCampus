# Sayfa Spec — İndirimler ve Kampanyalar (Deals)

Admin panelden yönetilen sponsor kampanyalarının mobil yüzü. İlgili kod: `apps/mobile/src/features/deals/`, `apps/api/src/services/deals/`.

## Liste Sayfası

```
←  İndirimler & Fırsatlar
🔍 Marka veya kategori ara
[Tümü][Yeme][Teknoloji][Giyim][Eğlence]
─ Kampanya kartları ─
[Logo] %20 Öğrenci İndirimi
ITÜ öğrencilerine özel · Bitiş: 30 Haz
[Kodu Gör] [Detay]
```

`GET /deals?university_id=` → aktif kampanyalar (Redis `deals:{university_id}`, 5 dk TTL).

## Detay Sayfası

```
←  Starbucks Kampanyası
[Banner]
%20 İndirim · Geçerlilik: 1-30 Haziran
Kapsam: ITÜ öğrencileri
Kampanya detayları + kullanım koşulları
KOD: ITU20STB  [Kopyala]
[Mağazaya Git →]
```

## Aksiyonlar

| Aksiyon | API | Sonuç |
|---------|-----|-------|
| Sayfa açılış | `GET /deals?university_id` | Aktif liste |
| Kodu Gör | `POST /deals/{id}/reveal` | `deal_redemptions` insert (unique), kod göster |
| Kodu Kopyala | lokal | Clipboard + analytics event |
| Mağazaya Git | `POST /deals/{id}/click` | Sponsor URL + attribution |
| Filtre | query param | Filtrelenmiş liste |

## Gelir Modeli (admin tarafında)

| Model | Tetikleyici |
|-------|-------------|
| CPA | Kod kullanımı (`deal_redemptions`) |
| CPC | Tıklama (`deal_clicks`) |
| Sabit | Aylık/yıllık anlaşma |
| Hybrid | Sabit + performans |

## Kurallar

- Kampanya yalnızca hedef üniversite(ler) öğrencilerine görünür.
- Kullanım limiti dolunca "Kampanya sona erdi".
- Kod kullanıcı başına 1 kez açılır (`deal_redemptions` UNIQUE).
- Admin "duraklat" → mobilde anında gizlenir (cache invalidation).

Detay: [10 — Admin & Monetizasyon](../10-admin-monetization.md).
