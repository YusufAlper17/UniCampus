# Sayfa Spec — Profil Sayfaları

Dual identity (sosyal + kariyer) + akademik bilgi. İlgili kod: `apps/mobile/src/features/profile/`.

## Öğrenci Profili

```
←  @kullaniciadi  [⋯]
[Avatar] 🔒/🌐
Ad Soyad
Kariyer headline (LinkedIn tarzı)
Bölüm · sınıf · Üniversite · GPA 🔒
Bio (sosyal)
120 takipçi · 89 bağlantı
[Takip Et] [Bağlantı Kur] [Mesaj]
Sekmeler: Sosyal | Kariyer | Etkinlik | Üyelikler
```

### Sekmeler

| Sekme | İçerik |
|-------|--------|
| Sosyal | Foto grid (content_domain=social) |
| Kariyer | Proje/milestone kartları (content_domain=career) |
| Etkinlik | Katıldığı/oluşturduğu etkinlikler |
| Üyelikler | Kulüp/takım/topluluk üyelikleri + rol |

### Akademik Bilgi Alanları

| Alan | Varsayılan görünürlük |
|------|----------------------|
| Fakülte | Herkes |
| Bölüm | Herkes |
| Sınıf | Herkes |
| GPA | Sadece bağlantılar |
| Öğrenci no | Gizli |
| Mezuniyet yılı | Herkes |
| Dönem | Bağlantılar |

Her alan bağımsız görünürlük: Herkes / Bağlantılar / Gizli. Hassas alanlar (GPA, öğrenci no) varsayılan kapalı. Detay: [academic-profile.md](./academic-profile.md).

### Gizli Hesap Davranışı

Takipçi olmayan ziyaretçi: avatar blur, post yok, akademik detay gizli, "Takip İsteği Gönder" CTA.

## Kulüp / Takım Profili

```
←  @ieee_kulubu  [⋯]
[Logo] ✓ Onaylı
IEEE ITÜ Student Branch
Teknoloji · 240 üye
Açık topluluk · Katılım isteği
[Takip Et] [Katıl / İstek Gönder]
Sekmeler: Sosyal | Kariyer | Etkinlik | Üyeler
```

- Kulüp kariyer sekmesinde fırsat ilanı ve proje paylaşabilir.
- Üyeler sekmesi: liste + roller (kulüp: Üye/Yönetici/Moderator; takım: Oyuncu/Kaptan/Yedek/Koç).
- Admin ayarları paneli: görünürlük, katılım modu, davet linki, üye yönetimi. Detay: [memberships.md](./memberships.md).

## Ayarlar (Profil → ⚙)

| Bölüm | İçerik |
|-------|--------|
| Hesap | Profil düzenle, kullanıcı adı, akademik bilgiler |
| Gizlilik | Açık/gizli hesap, kariyer görünürlüğü, alan görünürlükleri, DM izni |
| Bildirimler | Sosyal/kariyer ayrı toggle, push tercihleri |
| Güvenlik | 2FA, aktif oturumlar, engellenenler, veri indirme |
| Tercihler | Varsayılan feed sekmesi, dil (TR/EN), tema (dark/light) |

## API

| Aksiyon | Endpoint |
|---------|----------|
| Profil getir | `GET /users/{username}` |
| Profil güncelle | `PATCH /users/me` |
| Akademik güncelle | `PATCH /users/me/academic` |
| Gizlilik güncelle | `PATCH /users/me/privacy` |
| Üyelikler | `GET /users/{id}/memberships` |
