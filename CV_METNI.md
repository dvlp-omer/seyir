# CV için hazır metinler

Aşağıdakileri CV'ne, LinkedIn'e ya da GitHub profiline kopyalayabilirsin.
Hepsi **şu an doğru olan** şeyleri söyler. Köşeli parantezli yerleri doldur.

> **Kural:** Yapmadığın bir şeyi yazma. "Yayında", "ekip kullanıyor",
> "Supabase ile çalışıyor" cümlelerini ancak gerçekten yaptıktan sonra ekle
> (aşağıda "Sonradan eklenebilecekler"). Mülakatta ilk sorulan şey CV'deki
> cümlenin kanıtıdır.

---

## Kısa (CV'de tek satır)

**Takım Asistanı** — Öğrenci takımları için görev, son tarih, toplantı tutanağı
ve etkinlik takibi yapan web uygulaması. Düz JavaScript, 100 otomatik test,
çevrimdışı çalışabilen PWA. `[GitHub bağlantısı]`

## Orta (CV'de proje bölümü)

**Takım Asistanı** · HTML, CSS, JavaScript, PWA, Supabase (PostgreSQL) · `[ay yıl]`
`[GitHub bağlantısı]` · `[varsa canlı demo bağlantısı]`

- Teknofest su altı takımımda yaşadığım sorunlardan yola çıkarak; görev panosu,
  son tarih geri sayımı, takvim, toplantı tutanağı (PDF), yoklama, faaliyet
  raporu ve WhatsApp duyuru metni üreten tek sayfalık bir uygulama geliştirdim.
- Framework ve derleme adımı kullanmadan, veri katmanını tek bir arayüzün
  arkasına aldım; aynı arayüzü hem tarayıcı kaydı (localStorage) hem bulut
  (Supabase REST) için uyguladım ve iki uygulamayı aynı testlerden geçirdim.
- 100 otomatik test yazdım (tarih mantığı, veri katmanı, giriş, yedekleme,
  renk kontrastı); testler ek paket gerektirmeden Node ile çalışıyor.
- Kendi kodumu denetleyip 29 sorun belgeledim ve 26'sını düzelttim (çift
  kayıt, klavye odağı, kontrast gibi); erişilebilirlik ve mobil kullanım
  için koyu tema, 44 piksel dokunma hedefleri ve klavye desteği ekledim.
- Güvenlik için kullanıcı girdisini kaçırma (XSS), içerik güvenlik politikası
  (CSP) ve veritabanında satır düzeyinde güvenlik (RLS) kuralları tasarladım.

*(Beş madde çok gelirse ilk üçünü kullan.)*

## English

**Team Assistant (Takım Asistanı)** · HTML, CSS, JavaScript, PWA, Supabase (PostgreSQL) · `[month year]`
`[GitHub link]`

- Built a single-page app for student engineering teams — task board, deadline
  countdowns, calendar, printable meeting minutes, attendance, activity reports
  and announcement templates — based on problems I saw in my own Teknofest team.
- No framework or build step: put the data layer behind one interface and
  implemented it twice (localStorage and Supabase REST), verified by a shared
  contract test suite.
- Wrote 100 automated tests (date logic, data layer, auth, backup validation,
  colour contrast) that run on plain Node with no dependencies.
- Audited my own code, documented 29 issues and fixed 26 (double submission,
  keyboard focus loss, insufficient contrast); added dark theme, offline
  support and accessible keyboard navigation.
- Designed security measures: output escaping against XSS, a Content Security
  Policy, and row-level security rules in PostgreSQL.

## LinkedIn / GitHub profili için bir cümle

Öğrenci takımım için geliştirdiğim, framework kullanmadan yazılmış ve 100
testle doğrulanan bir takım yönetimi uygulaması: görevler, son tarihler,
tutanaklar ve etkinlikler tek yerde.

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
