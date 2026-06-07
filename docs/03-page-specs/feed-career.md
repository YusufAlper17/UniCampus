# Sayfa Spec — Kariyer Akış

LinkedIn feed benzeri. **Yalnızca `content_domain=career`.** Reklam yok (denge korunur). İlgili kod: `apps/mobile/src/features/feed/career/`.

## Yapı

```
TopBar: UniCampus | 🔔 | ✉️
Tab switch: [Sosyal] [Kariyer ●]
"Senin için": proje + bağlantı önerileri
Feed listesi: ProjectCard | MilestoneCard | OpportunityCard
```

## Feed Algoritması

1. `WHERE content_domain = 'career'` — zorunlu filtre.
2. 1. derece bağlantıların kariyer postları (öncelik, Redis `feed:career:{user_id}`).
3. Aynı bölüm/fakülte kariyer postları.
4. Trend projeler ve fırsat ilanları.
5. **Sponsorlu kariyer ilanı yok** — reklamlar sadece sosyal akışta.

## Kart Tipleri

### ProjectCard (🚀 Proje)

| Alan | İçerik |
|------|--------|
| Başlık | Proje adı |
| Sahip | @kullanıcı + rol |
| Tech | Stack tag'leri |
| Medya | Görsel/galeri |
| Link | GitHub / demo |
| Ekip | @mention'lı üyeler |
| Etkileşim | Beğeni, yorum, paylaş |

### MilestoneCard (🎉 Milestone)

- "Google'da stajyer oldum" tarzı başarı.
- Kısa metin + opsiyonel görsel.
- "Tebrik Et" reaksiyon butonu (LinkedIn modeli).

### OpportunityCard (💼 Fırsat)

- Staj/iş/proje ekibi ilanı.
- "İlgileniyorum" CTA → başvuru/DM.
- Admin moderasyonundan geçer (spam önleme).

## Bağlantı Önerileri

- 2. derece bağlantılar, aynı bölüm, ortak proje.
- "12 ortak bağlantı" sosyal kanıt.
- Aksiyon: Bağlantı Kur → `POST /connections/request`.

## Boş ve Hata Durumları

| Durum | UI |
|-------|-----|
| Boş feed | "İlk projeni paylaş" + bağlantı önerileri |
| Bağlantı yok | "Bölümünden 5 kişiyle bağlan" önerisi |

## Kritik Kural

Kariyer akışı sosyal içerikle **asla** karışmaz. Kullanıcı kariyer içeriği görmek istemiyorsa varsayılan sekmesini Sosyal yapar ve kariyer akışını hiç açmaz; tersi de geçerli. Reklam kariyer akışında görünmez.
