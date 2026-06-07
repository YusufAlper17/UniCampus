# Sayfa Spec — Anket Oluşturma

`content_domain=social`. İlgili kod: `apps/mobile/src/features/create/poll/`, `apps/api/src/services/polls/`.

## Form

| Alan | Kural |
|------|-------|
| Soru | Zorunlu, ≤ 200 karakter |
| Seçenekler | 2–4 adet |
| Süre | 1 saat / 1 gün / 3 gün / 1 hafta |
| Çoklu seçim | Toggle (varsayılan kapalı) |
| Anonim oy | Toggle (varsayılan açık) |

`POST /polls` → `polls` + `poll_options` + `posts(type=poll)`.

## Oy Verme Akışı

```mermaid
flowchart LR
    View[Anket gör] --> Vote[Seçenek seç]
    Vote --> Submit[POST /polls/{id}/vote]
    Submit --> Update[Anında % güncelleme]
    Update --> Locked{Süre bitti mi?}
    Locked -->|Evet| Results[Sonuçlar kilitli]
    Locked -->|Hayır| Editable[Oy değiştirilebilir]
```

## Davranışlar

- Oy → anında yüzde güncellenir (optimistic).
- Süre bitince sonuçlar kilitlenir, yeni oy alınmaz.
- Anonim ise oy verenler gizli; değilse görülebilir.
- Çoklu seçim açıksa birden fazla seçenek işaretlenir.
- Anket post gibi beğenilir/yorumlanır.

## Limitler

| Kural | Değer |
|-------|-------|
| Seçenek | 2–4 |
| Soru | ≤ 200 karakter |
| Kullanıcı başına oy | Tek (çoklu seçim hariç) |
