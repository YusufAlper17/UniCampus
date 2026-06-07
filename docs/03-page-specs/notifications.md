# Sayfa Spec — Bildirimler

İlgili kod: `apps/mobile/src/features/notifications/`, tablo `notifications`.

## Liste

```
←  Bildirimler
♡ @ali gönderini beğendi
💬 @veli yorum yaptı
👤 @ayse seni takip etti
🔗 @mehmet bağlantı isteği gönderdi  [Kabul][Red]
📅 Hackathon yarın!
✅ Katılım isteğin onaylandı
🏛 IEEE Kulübü üyeliğin onaylandı
🎁 Yeni kampanya: Starbucks %20
```

## Bildirim Tipleri

| Tip | Evren | Push |
|-----|-------|------|
| Beğeni, yorum, mention | Sosyal | Toggle |
| Takip, takip isteği | Sosyal | Toggle |
| Bağlantı isteği/kabul | Kariyer | Toggle |
| Milestone tebrik | Kariyer | Toggle |
| Etkinlik hatırlatma | Sosyal | Evet |
| Katılım onayı | Sosyal | Evet |
| Topluluk/kulüp/takım katılım isteği | Neutral | Evet |
| Üyelik onaylandı | Neutral | Evet |
| Davet linki | Neutral | Evet |
| Yeni kampanya | Sosyal | Toggle |
| DM | — | Evet |

## Ayrım

Sosyal ve kariyer bildirimleri **ayrı toggle** (kullanıcı tercihiyle). Push, in-app ve e-posta kanalları bağımsız ayarlanabilir.

## API

| Aksiyon | Endpoint |
|---------|----------|
| Liste | `GET /notifications` |
| Okundu işaretle | `POST /notifications/read` |
| Tercih güncelle | `PATCH /users/me/notification-prefs` |
