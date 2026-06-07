# Admin Panel Wireframe'ler

Web dashboard (Next.js). Sol sidebar + içerik alanı. Responsive (mobilde sidebar collapse).

## Dashboard
```
┌──────────────────────────────────────────────────────────┐
│ UniCampus Admin                          [Admin Avatar ▼]│
├────────┬─────────────────────────────────────────────────┤
│ Dash ● │ Dashboard                                       │
│ Users  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ Content│ │ DAU  │ │ MAU  │ │ Post │ │Gelir │           │
│ Sponsor│ │12.4K │ │89.2K │ │ 1.2K │ │₺45K  │           │
│ Ads    │ └──────┘ └──────┘ └──────┘ └──────┘           │
│ Deals  │ [Kullanıcı büyüme grafiği — 30 gün]            │
│ Univ.  │ [Gelir grafiği — sponsor vs reklam]            │
│ Analyt.│ Son şikayetler (5) | Bekleyen onay (3)         │
│ Setting│                                                 │
└────────┴─────────────────────────────────────────────────┘
```

## Kullanıcı Yönetimi
```
┌──────────────────────────────────────────────────────────┐
│ Kullanıcılar                            [+ Export CSV]   │
│ 🔍 isim, @username, email                                │
│ Filtre: [Üniversite ▼] [Tip ▼] [Durum ▼]                │
├──────────────────────────────────────────────────────────┤
│ @ali_yilmaz | Öğrenci | ITÜ | Aktif | 12.04.2026         │
│   [Detay] [Ban] [Mesaj]                                  │
│ @ieee_kulubu | Kulüp | ITÜ | Onay Bekliyor               │
│   [Onayla] [Reddet] [Detay]                              │
│ @spam_user | Öğrenci | ODTÜ | Banlı                      │
│   [Ban Kaldır] [Detay]                                   │
│ ◄ 1 2 3 ... ► (cursor)                                   │
└──────────────────────────────────────────────────────────┘
```

## Sponsor Yönetimi
```
┌──────────────────────────────────────────────────────────┐
│ Sponsorlar                              [+ Yeni Sponsor]  │
├──────────────────────────────────────────────────────────┤
│ Starbucks TR | Sabit ₺15.000/ay | Aktif | 3 kampanya     │
│   [Düzenle] [Kampanyalar] [Gelir Raporu]                 │
│ Teknosa | CPA ₺5/kod | Aktif | 1 kampanya                │
│   [Düzenle] [Kampanyalar] [Gelir Raporu]                 │
└──────────────────────────────────────────────────────────┘
 Yeni Sponsor formu:
  Marka adı | Logo | İletişim | Anlaşma tipi [CPA/CPC/Sabit/Hybrid]
  Bedel ₺ | Tarih aralığı | Hedef üniversiteler | Sözleşme PDF
```

## Kampanya (Deals)
```
┌──────────────────────────────────────────────────────────┐
│ Kampanyalar                             [+ Yeni Kampanya] │
├──────────────────────────────────────────────────────────┤
│ Starbucks %20 | ITÜ | Yayında | 320 reveal | 84 click    │
│   [Düzenle] [Duraklat] [İstatistik]                      │
│ Teknosa %15 | Tümü | Taslak                              │
│   [Yayınla] [Düzenle]                                    │
└──────────────────────────────────────────────────────────┘
 Form: Sponsor▼ | Başlık | Banner | Kod (oto/manuel)
       Oran | Kategori | Hedef | Tarih | Limit | URL
```

## Feed Reklamları
```
┌──────────────────────────────────────────────────────────┐
│ Feed Reklamları                         [+ Yeni Reklam]   │
├──────────────────────────────────────────────────────────┤
│ Starbucks Yaz | Aktif | 45K gösterim | 1.2K tık          │
│   CTR %2.7 | Harcama ₺12.400 | [Düzenle] [Duraklat]      │
│ Teknosa BTS | Taslak | — | —                             │
│   [Yayınla] [Düzenle]                                    │
└──────────────────────────────────────────────────────────┘
 Form: Sponsor▼ | Görsel 1080x1080 | Başlık | CTA metni
       Hedef URL | Hedefleme | Pozisyon (her N post) | Bütçe
```

## Gelir & Analitik
```
┌──────────────────────────────────────────────────────────┐
│ Analitik          [Tarih: Son 30 gün ▼] [Export CSV/PDF] │
├──────────────────────────────────────────────────────────┤
│ Toplam Gelir: ₺45.200  (Sponsor ₺30K + Reklam ₺15.2K)    │
│ [Gelir trend grafiği]                                    │
│ [Üniversite kırılımı pasta]                              │
│ Kampanya performansı tablosu:                            │
│  Kampanya | Reveal | Click | Dönüşüm | Gelir            │
└──────────────────────────────────────────────────────────┘
```

## İçerik Moderasyonu
```
┌──────────────────────────────────────────────────────────┐
│ Moderasyon Kuyruğu        [Açık ▼] [Tip: Post/Yorum ▼]  │
├──────────────────────────────────────────────────────────┤
│ Şikayet: spam | @user post | 3 şikayet                   │
│   "İçerik önizleme..."                                    │
│   [İçeriği Kaldır] [Kullanıcıyı Uyar] [Ban] [Kapat]     │
│ Otomatik filtre: NSFW şüphesi | @user2 görsel            │
│   [İncele] [Onayla] [Kaldır]                            │
└──────────────────────────────────────────────────────────┘
```
