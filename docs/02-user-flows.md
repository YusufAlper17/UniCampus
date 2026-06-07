# 02 — Kullanıcı Akışları

Bu doküman uçtan uca kullanıcı senaryolarını ve sistem etkileşimlerini tanımlar. Her akış mobil istemci, API, veritabanı ve dış servisler arasındaki ilişkiyi gösterir.

## Navigasyon Haritası

```mermaid
flowchart TB
    Root[App Root]
    Root --> AuthStack[Auth Stack]
    Root --> MainTabs[Main Tab Navigator]

    AuthStack --> Splash
    AuthStack --> Welcome
    AuthStack --> Login
    AuthStack --> RegisterFlow

    MainTabs --> HomeTab["Akış: Sosyal | Kariyer"]
    MainTabs --> ExploreTab["Keşfet: Sosyal | Kariyer"]
    MainTabs --> CreateTab[Olustur FAB]
    MainTabs --> MessagesTab[Mesajlar]
    MainTabs --> ProfileTab[Profil]

    HomeTab --> Feed
    HomeTab --> StoryViewer
    HomeTab --> PostDetail
    ExploreTab --> Search
    ExploreTab --> DealsPage
    CreateTab --> CreateSheet["Sosyal veya Kariyer"]
    MessagesTab --> ChatRoom
    MessagesTab --> CommunityChannels
    ProfileTab --> Settings
```

## 1. Kayıt → İlk Paylaşım

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant App as Mobile App
    participant API as API
    participant Email as Resend
    participant DB as PostgreSQL

    U->>App: Hesap tipi seç (öğrenci/kulüp/takım)
    U->>App: Üniversite seç
    U->>App: Edu mail gir
    App->>API: POST /auth/send-otp
    API->>DB: Domain whitelist kontrolü
    API->>Email: 6 haneli OTP gönder
    U->>App: OTP gir
    App->>API: POST /auth/verify-otp
    API->>DB: users + user_preferences insert
    API-->>App: JWT (access + refresh)
    U->>App: Profil tamamla + onboarding tercihi
    App->>API: PATCH /users/me
    U->>App: İlk post oluştur
    App->>API: POST /posts (content_domain=social)
    API->>DB: posts insert + fan-out job
    API-->>App: Akışta göster
```

Kritik kurallar:
- Domain whitelist'te olmayan mail → "Bu mail {üniversite}'ye ait değil" hatası.
- OTP 10 dk geçerli, 3 deneme; 60 sn yeniden gönderim rate limit.
- Onboarding tercihi (`Sosyal / Kariyer / İkisi`) → `user_preferences.default_feed_tab`.

## 2. Giriş (Login)

```mermaid
flowchart TD
    Start[Login Screen] --> Input[Edu mail + şifre]
    Input --> Submit[POST /auth/login]
    Submit --> Valid{Geçerli?}
    Valid -->|Evet| TwoFA{2FA aktif?}
    Valid -->|Hayır| Error[Hata: 5 deneme sonra 15 dk kilit]
    TwoFA -->|Evet| OTP[TOTP gir]
    TwoFA -->|Hayır| Home[Ana Akış]
    OTP --> Home
    Error --> Input
```

## 3. Dual Feed Görüntüleme

```mermaid
flowchart TD
    Open[Uygulama açılır] --> Pref{default_feed_tab?}
    Pref -->|social| SocialTab[Sosyal Akış]
    Pref -->|career| CareerTab[Kariyer Akış]
    SocialTab --> SocialAPI["GET /feed?domain=social"]
    CareerTab --> CareerAPI["GET /feed?domain=career"]
    SocialAPI --> RedisS["feed:social:{user_id}"]
    CareerAPI --> RedisC["feed:career:{user_id}"]
    RedisS --> Merge["Post + reklam merge (sadece sosyal)"]
    RedisC --> NoAds["Reklamsız kariyer akışı"]
    Merge --> Render[Akış render]
    NoAds --> Render
    Render --> Switch{Sekme değişti?}
    Switch -->|Sosyal-Kariyer| Pref
```

Altın kural: `domain=social` sorgusu `content_domain=career` post döndürmez ve tersi. SQL ve Redis seviyesinde garanti.

## 4. İçerik Oluşturma (Evren Seçimi)

```mermaid
flowchart TD
    FAB["+ butonu"] --> Sheet[Bottom Sheet]
    Sheet --> SocialChoice{Sosyal?}
    Sheet --> CareerChoice{Kariyer?}
    SocialChoice -->|Gönderi| Post["content_domain=social"]
    SocialChoice -->|Anket| Poll[Anket]
    SocialChoice -->|Etkinlik| Event[Etkinlik]
    SocialChoice -->|Story| Story[Story]
    CareerChoice -->|Proje| Project["content_domain=career"]
    CareerChoice -->|Milestone| Milestone[Milestone]
    CareerChoice -->|Fırsat| Opportunity[Fırsat İlanı]
    Post --> Publish[POST /posts]
    Project --> Publish
    Publish --> FanOut[Fan-out worker]
    FanOut --> Followers[Takipçi/bağlantı timeline]
```

## 5. Takip ve Bağlantı (Sosyal Graf)

```mermaid
stateDiagram-v2
    [*] --> NotConnected
    NotConnected --> FollowPending: Gizli hesap takip isteği
    NotConnected --> Following: Açık hesap takip
    FollowPending --> Following: Kabul
    FollowPending --> Rejected: Red
    NotConnected --> ConnectPending: Bağlantı isteği
    ConnectPending --> Connected: Karşılıklı kabul
    ConnectPending --> Rejected: Red
    Following --> Connected: Bağlantı isteği kabul
```

İki bağımsız ilişki: Takip (tek yönlü) ve Bağlantı (karşılıklı). Bir kullanıcı hem takipçi hem bağlantı olabilir.

## 6. Etkinliğe Katılım

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant App as App
    participant API as API
    participant DB as DB
    participant Org as Organizatör

    U->>App: "Katılacağım" tıkla
    App->>API: POST /events/{id}/join
    API->>DB: Kapasite + katılım tipi kontrolü
    alt Herkese açık + yer var
        DB-->>API: status=joined
        API-->>U: "Katıldın" badge
    else Onay gerekli
        DB-->>API: status=pending
        API->>Org: Bildirim gönder
        Org->>API: PATCH /events/{id}/participants/{uid} approve
        API-->>U: Push: onaylandı
    else Kapasite dolu
        API-->>U: "Kontenjan doldu"
    end
```

## 7. Topluluk/Kulüp/Takım Katılımı

```mermaid
flowchart TD
    User["Katılmak istiyor"] --> VisCheck{Görünürlük?}
    VisCheck -->|Açık| Search["Keşfet/Arama'dan bulur"]
    VisCheck -->|Gizli| Link["Davet linki"]
    VisCheck -->|Özel| InviteOnly["Admin daveti"]
    Search --> JoinMode{Katılım modu?}
    Link --> JoinMode
    InviteOnly --> JoinMode
    JoinMode -->|Open| Instant["Anında üye"]
    JoinMode -->|Request| Pending["Onay kuyruğu"]
    JoinMode -->|Invite| MustInvite["Davet şart"]
    Pending --> AdminApprove["Admin onaylar"]
    AdminApprove --> Member["Üye olur"]
    Instant --> Member
```

Detay: [15 — Üyelik & Topluluklar](./15-membership-communities.md).

## 8. Mesajlaşma (Realtime)

```mermaid
sequenceDiagram
    participant A as Ali
    participant App as App
    participant RT as Realtime
    participant DB as DB
    participant B as Veli

    A->>App: Mesaj yaz + gönder
    App->>DB: messages insert (optimistic UI)
    DB->>RT: Realtime event yayını
    RT-->>B: Yeni mesaj
    B->>App: Mesaj görüntüle
    App->>DB: read_receipt insert
    DB->>RT: Okundu event
    RT-->>A: ✓✓ güncelle
```

## 9. Monetizasyon — Reklam Gösterimi

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant Feed as Feed API
    participant AdSvc as Ad Service
    participant Queue as BullMQ
    participant DB as DB

    App->>Feed: GET /feed?domain=social
    Feed->>AdSvc: getActiveAds(university_id)
    Feed-->>App: posts + ad (slot 5, 12...)
    App->>App: Reklam %50 görünür 1sn
    App->>Feed: POST /ads/impression
    Feed->>Queue: aggregate impression job
    Queue->>DB: batch insert ad_impressions
    App->>Feed: POST /ads/click (tıklanırsa)
```

## 10. Monetizasyon — İndirim Kodu Alma

```mermaid
sequenceDiagram
    participant U as Öğrenci
    participant App as App
    participant API as API
    participant DB as DB

    U->>App: İndirimler sayfasını aç
    App->>API: GET /deals?university_id
    API-->>App: Aktif kampanyalar
    U->>App: "Kodu Gör" tıkla
    App->>API: POST /deals/{id}/reveal
    API->>DB: deal_redemptions insert (unique)
    API-->>App: İndirim kodu
    U->>App: "Mağazaya Git" tıkla
    App->>API: POST /deals/{id}/click
    API->>DB: deal_clicks insert (attribution)
```

## 11. Şikayet ve Moderasyon

```mermaid
flowchart LR
    Report["Kullanıcı şikayeti"] --> Queue["Moderasyon kuyruğu"]
    Upload["İçerik yükleme"] --> AutoMod["Otomatik filtre"]
    AutoMod -->|Temiz| Publish["Yayınla"]
    AutoMod -->|Şüpheli| Queue
    Queue --> Admin["Admin inceler"]
    Admin -->|Kaldır| Remove["İçerik kaldır + bildirim"]
    Admin -->|Uyar| Warn["Kullanıcı uyar"]
    Admin -->|Ban| Ban["Hesap askıya al"]
    Admin -->|Temiz| Dismiss["Şikayeti kapat"]
```

## Hata ve Boş Durum Akışları

| Durum | Davranış |
|-------|----------|
| Ağ yok | Cache'lenmiş feed göster + "çevrimdışı" banner; aksiyonlar kuyruğa alınır |
| Boş feed | Curated starter content + "5 kulüp takip et" önerisi |
| OTP süresi doldu | "Kod süresi doldu, yeniden gönder" |
| Kapasite dolu (etkinlik) | "Kontenjan doldu" + bekleme listesi (V2) |
| Yetkisiz erişim | 403 → "Bu içeriğe erişim yetkin yok" |
