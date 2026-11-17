# CV için hazır metinler

Aşağıdakileri CV'ne, LinkedIn'e ya da GitHub profiline kopyalayabilirsin.
Hepsi **şu an doğru olan** şeyleri söyler. Köşeli parantezli yerleri doldur.

> **Kural:** Yapmadığın bir şeyi yazma. "Yayında", "ekip kullanıyor",
> "Supabase ile çalışıyor" cümlelerini ancak gerçekten yaptıktan sonra ekle
> (aşağıda "Sonradan eklenebilecekler"). Mülakatta ilk sorulan şey CV'deki
> cümlenin kanıtıdır.

---

## Kısa (CV'de tek satır)

**Seyir** — Öğrenci takımları için görev, son tarih, toplantı tutanağı,
etkinlik, kişi rehberi ve WhatsApp mesajı yönetimi yapan web uygulaması.
Düz JavaScript, 188 otomatik test,
çevrimdışı çalışabilen PWA. `[GitHub bağlantısı]`

## Orta (CV'de proje bölümü)

**Seyir — Öğrenci Takımları İçin Takım Asistanı** · HTML, CSS, JavaScript, PWA, Supabase (PostgreSQL) · `[ay yıl]`
`[GitHub bağlantısı]` · `[varsa canlı demo bağlantısı]`

- Teknofest su altı takımımda yaşadığım sorunlardan yola çıkarak; görev panosu,
  son tarih geri sayımı, takvim, toplantı tutanağı (PDF), yoklama, faaliyet
  raporu, A4 resmî tutanak (PDF ve Word çıktısı), kişi rehberi ve WhatsApp
  mesaj gönderim listeleri olan tek sayfalık bir uygulama geliştirdim.
- Framework ve derleme adımı kullanmadan, veri katmanını tek bir arayüzün
  arkasına aldım; aynı arayüzü hem tarayıcı kaydı (localStorage) hem bulut
  (Supabase REST) için uyguladım ve iki uygulamayı aynı testlerden geçirdim.
- 188 otomatik test yazdım (tarih mantığı, veri katmanı, giriş, yedekleme,
  renk kontrastı); testler ek paket gerektirmeden Node ile çalışıyor.
- Kendi kodumu denetleyip 29 sorun belgeledim ve 26'sını düzelttim (çift
  kayıt, klavye odağı, kontrast gibi); erişilebilirlik ve mobil kullanım
  için koyu tema, 44 piksel dokunma hedefleri ve klavye desteği ekledim.
- Telefon numarası gibi kişisel veri için güvenliği veritabanında kurdum:
  satır düzeyinde güvenlik (RLS), giriş yapmayana tam kapalı tablolar ve
  yalnızca davetle hesap açılabilen kayıt (PostgreSQL tetikleyicisi); ayrıca
  XSS'e karşı çıktı kaçırma ve içerik güvenlik politikası (CSP).

*(Beş madde çok gelirse ilk üçünü kullan.)*

## English

**Seyir — Team Assistant for Student Teams** · HTML, CSS, JavaScript, PWA, Supabase (PostgreSQL) · `[month year]`
`[GitHub link]`

- Built a single-page app for student engineering teams — task board, deadline
  countdowns, calendar, printable meeting minutes, attendance, activity reports
  announcement templates, formal A4 minutes with PDF/Word export, a contact list
  and per-person WhatsApp send lists — based on problems I saw in my own
  Teknofest team.
- No framework or build step: put the data layer behind one interface and
  implemented it twice (localStorage and Supabase REST), verified by a shared
  contract test suite.
- Wrote 188 automated tests (date logic, data layer, auth, backup validation,
  colour contrast) that run on plain Node with no dependencies.
- Audited my own code, documented 29 issues and fixed 26 (double submission,
  keyboard focus loss, insufficient contrast); added dark theme, offline
  support and accessible keyboard navigation.
- Protected personal data (phone numbers) in the database itself: row-level
  security, no anonymous access, and invite-only sign-up enforced by a
  PostgreSQL trigger; plus output escaping against XSS and a Content Security
  Policy.

## LinkedIn / GitHub profili için bir cümle

Seyir: öğrenci takımım için geliştirdiğim, framework kullanmadan yazılmış ve 188
testle doğrulanan bir takım asistanı: görevler, son tarihler,
tutanaklar, etkinlikler ve WhatsApp mesajları tek yerde.

---

## Yapay zekâ asistanı konusu

Proje bir yapay zekâ kodlama asistanıyla birlikte geliştirildi ve commit
geçmişinde bu görünüyor. CV maddelerinde "geliştirdim" demen yanlış değil,
ama mülakatta sorulursa açıkça söyle ve neyi senin yaptığını anlat
(bkz. `MULAKAT.md`'nin başı). İstersen araçlar satırına ekleyebilirsin:
`... · Claude Code ile geliştirildi`.

`MULAKAT.md` sonundaki "kendin yap" listesini tamamlamadan bu projeyi CV'ne
koyma; listedeki her madde, yukarıdaki cümlelerden birini kendi deneyiminle
savunabilmeni sağlar.

## Sonradan eklenebilecekler (yapınca yaz)

| Bunu yaptıktan sonra | Şu cümleyi ekleyebilirsin |
|---|---|
| Netlify'da yayınladın (`YAYIN.md`) | "Netlify üzerinde yayında: `[bağlantı]`" |
| Supabase'i kurup güvenlik denemesini yaptın (`SUPABASE_KURULUM.md`) | "Supabase ile çok kullanıcılı; her kullanıcı yalnızca kendi takımının verisine erişiyor" |
| Ekibin gerçekten kullandı | "`[N]` kişilik ROTA İSAS ekibinde `[süre]` boyunca kullanıldı" |
| Kendi başına bir özellik ekledin | O özelliği ayrı bir madde olarak yaz; en güçlü madden bu olur |
