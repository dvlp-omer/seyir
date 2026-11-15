# Takım Asistanı

Öğrenci takımları için görev, son tarih, toplantı tutanağı ve duyuru asistanı.
Düz HTML, CSS ve JavaScript — framework yok, derleme adımı yok, kurulum yok.

**[Türkçe](#türkçe)** · **[English](#english)**

---

## Türkçe

### Ne işe yarar?

Teknofest gibi yarışmalara hazırlanan öğrenci takımlarında aynı sorunlar
tekrar eder: toplantıda alınan kararlar unutulur, görevin kimde olduğu
karışır, rapor ve izin tarihleri son anda hatırlanır. Takım Asistanı bu dört
işi tek sayfada toplar.

### Özellikler (v1)

| | |
|---|---|
| **Takım ve üyeler** | Takım oluştur, üye ekle, rol ver (kaptan / üye). Birden fazla takım desteklenir. |
| **Görev panosu** | Yapılacak / Yapılıyor / Bitti sütunları, sorumlu, bitiş tarihi, sorumluya göre süzme. |
| **Son tarih takibi** | Rapor, izin, etkinlik tarihleri için geri sayım; yaklaşan ve geciken renkle vurgulanır. |
| **Toplantı tutanağı** | Tarih, yer, katılımcılar, gündem, kararlar, görevler. Karardan tek tıkla görev. Yazdırılabilir / PDF. |
| **Duyuru şablonu** | Toplantı daveti, toplantı özeti ya da hatırlatma için WhatsApp'a yapıştırılmaya hazır metin. |
| **Özet ekranı** | En yakın son tarih, görev sayıları, gecikenler ve önümüzdeki 7 gün. |

Kişisel veri olarak yalnızca **ad ve rol** tutulur. Yapay zekâ ve ücretli servis kullanılmaz.

### Nasıl çalıştırılır?

**En kolay yol:** `index.html` dosyasına çift tıkla. Bu kadar.

İstersen yerel sunucuyla:

```bash
python -m http.server 8765
```

Sonra tarayıcıda `http://localhost:8765` adresini aç.

İlk açılışta "Örnek veriyle dene" düğmesi hayali bir takım yükler; uygulamayı
dolu hâliyle görmek için kullanışlıdır.

Veriler varsayılan olarak **tarayıcının localStorage alanında** saklanır: sadece
o tarayıcıda görünür, tarayıcı verisi silinirse gider.

### Testler

```bash
npm test
```

ya da `node --test "testler/*.test.js"`. Node 18+ yeterli; paket kurmak gerekmez.
38 test: tarih hesabı, tutanak mantığı, duyuru şablonları ve veri katmanı.

### Mimari özet

```
index.html ──► js/uygulama.js      başlatma, takım seçimi, ekran geçişi
                  │
                  ├─► js/ekranlar/*.js   her ekran bir dosya (ozet, gorevler,
                  │        │             sontarihler, toplantilar, duyuru, takim)
                  │        │
                  │        ├─► js/arayuz.js   form penceresi, bildirim, tıklama eylemleri
                  │        └─► js/mantik.js   saf fonksiyonlar (tarih, tutanak, şablon)
                  │
                  └─► js/veri.js         VERİ KATMANI — tek dosya, tek arayüz
                           ├─ yerelDepoOlustur     → localStorage
                           └─ supabaseDepoOlustur  → Supabase (REST + fetch)
```

Üç temel fikir:

1. **Veri katmanı tek arayüzün arkasında.** Ekranlar veriye sadece beş
   fonksiyonla ulaşır: `listele`, `oku`, `ekle`, `guncelle`, `sil`. Arkasında
   localStorage mı Supabase mi olduğunu bilmezler. Supabase eklenirken ekran
   kodunda tek satır değişmedi.
2. **Mantık ekrandan ayrı ve saf.** `js/mantik.js` içindeki fonksiyonlar ekrana
   ya da depoya dokunmaz; bu yüzden tarayıcı açmadan test edilir.
3. **Değişince yeniden çiz.** Her işlemden sonra açık ekran veriyi yeniden
   okuyup baştan çizilir. Basit, ve ekranla veri hiçbir zaman uyumsuz kalmaz.

Her kararın gerekçesi [PROGRESS.md](PROGRESS.md) dosyasında, yapılan
varsayımlar [QUESTIONS.md](QUESTIONS.md) dosyasında.

### Supabase ile ortak kullanım (isteğe bağlı)

Takımdaki herkesin aynı veriyi görmesi için:

1. [supabase.com](https://supabase.com) üzerinde ücretsiz bir proje aç.
2. SQL Editor'da [supabase/sema.sql](supabase/sema.sql) dosyasını çalıştır.
3. `.env.example` dosyasını `.env` adıyla kopyala; `SUPABASE_URL` ve
   `SUPABASE_ANON_KEY` değerlerini doldur (Project Settings → API).
4. `node araclar/env-aktar.js` komutunu çalıştır (`js/ayarlar.js` dosyasını üretir).
5. Sayfayı yenile. Sol altta "Supabase'e bağlı" yazmalı.

`.env` ve `js/ayarlar.js` depoya girmez (`.gitignore`).

> **Uyarı:** v1'de giriş (kullanıcı hesabı) yoktur. `sema.sql` içindeki erişim
> kuralları anon anahtarına sahip herkese okuma ve yazma izni verir. Küçük,
> kapalı bir ekip için uygundur; herkese açık yayın için önce giriş eklenmelidir.
>
> Supabase sürümü sahte sunucuyla test edildi; gerçek bir Supabase projesiyle
> henüz denenmedi.

### Bilinen sınırlar

- Giriş / yetkilendirme yok.
- localStorage kullanırken veri cihazlar arasında eşitlenmez, yedeği yoktur.
- PDF, tarayıcının "Yazdır → PDF olarak kaydet" özelliğiyle alınır.

### Yol haritası (v2)

Faaliyet raporu · yoklama · giriş ve takım bazlı erişim · veri yedeği (JSON)

### ROTA İSAS ekibinde kullanıldı

<!-- Ekip uygulamayı gerçekten kullandıktan sonra doldurulacak:
     ne zaman, kaç kişi, hangi toplantılarda, ne işe yaradı, ne eksik kaldı. -->

_Bu bölüm henüz doldurulmadı._

---

## English

### What is it?

A small team assistant for student engineering teams (built with a Teknofest
underwater-vehicle team in mind). It keeps tasks, deadlines, meeting minutes
and announcements in one page. The interface is in Turkish.

Plain HTML, CSS and JavaScript — no framework, no build step, no install.

### Features (v1)

- **Team & members** — create a team, add members, assign a role (captain / member).
- **Task board** — To do / Doing / Done, with assignee, due date and a per-person filter.
- **Deadline tracking** — countdowns for reports, permits and events; upcoming and overdue items are colour-coded.
- **Meeting minutes** — date, place, attendees, agenda, decisions and tasks; turn a decision into a task in one click; printable / save as PDF.
- **Announcement templates** — ready-to-paste WhatsApp text for a meeting invite, a meeting summary or a deadline reminder (plain templates, no AI).
- **Overview** — next deadline, task counts, overdue items and the next 7 days.

Only **name and role** are stored about people.

### Running it

Double-click `index.html`. Or serve the folder:

```bash
python -m http.server 8765
```

and open `http://localhost:8765`. The "Örnek veriyle dene" button on first run
loads a fictional demo team.

By default data lives in the browser's **localStorage**.

### Tests

```bash
npm test
```

38 tests using Node's built-in test runner (Node 18+, no dependencies).

### Architecture

- `js/veri.js` — the **data layer**, one file, one interface: `listele` (list),
  `oku` (read), `ekle` (create), `guncelle` (update), `sil` (delete). Two
  implementations: `yerelDepoOlustur` (localStorage) and `supabaseDepoOlustur`
  (Supabase REST via `fetch`, no client library). A contract test runs the same
  scenario against both.
- `js/mantik.js` — pure functions: date maths, minutes helpers, announcement templates.
- `js/arayuz.js` — shared UI: one generic form dialog, toast, click delegation.
- `js/ekranlar/*.js` — one file per screen; each registers itself and the menu is built from that registry.
- `js/uygulama.js` — startup, team selection, hash-based navigation.

Screens never know which storage backend is active; adding Supabase required no
changes to screen code. After every change the current screen re-reads its
data and re-renders, which keeps UI and data in sync without a framework.

Design decisions are explained in [PROGRESS.md](PROGRESS.md) (Turkish);
assumptions and open questions are in [QUESTIONS.md](QUESTIONS.md).

### Optional: shared data with Supabase

1. Create a free Supabase project and run [supabase/sema.sql](supabase/sema.sql) in the SQL Editor.
2. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Run `node araclar/env-aktar.js` (generates the git-ignored `js/ayarlar.js`).
4. Reload the page.

> **Warning:** v1 has no login. The RLS policies in `sema.sql` allow anyone
> with the anon key to read and write. Fine for a small closed team; add
> authentication before any public deployment.
>
> The Supabase backend is covered by tests against a fake server; it has not
> yet been exercised against a live Supabase project.

### Used by the ROTA İSAS team

_To be filled in once the team has actually used it._
