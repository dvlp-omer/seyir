# PROGRESS — İlerleme günlüğü

Her aşamada: ne yapıldı, neden böyle yapıldı, nasıl çalıştırılır.

## Aşama 1 — Plan ve depo

**Ne yaptım:** `PLAN.md` yazdım, git deposunu başlattım, `.gitignore` ekledim.

**Neden:** Önce dosya yapısını ve sırayı belirlemek, sonradan "bu nereye
konacaktı?" sorusunu önler. `.gitignore`'a `.env` ve `js/ayarlar.js` baştan
eklendi ki gerçek anahtar yanlışlıkla depoya girmesin.

## Aşama 2 — Veri katmanı ve saf mantık

**Ne yaptım:**
- `js/veri.js`: beş fonksiyonlu depo arayüzü (`listele`, `oku`, `ekle`,
  `guncelle`, `sil`) ve bunun localStorage sürümü.
- `js/mantik.js`: tarih hesabı (kalan gün, aciliyet), tutanak yardımcıları,
  WhatsApp duyuru şablonları.
- `testler/`: 28 test.

**Neden böyle:**
- *Önce veri ve mantık, sonra ekran.* Bu kısım ekrandan bağımsız olduğu için
  tarayıcı açmadan test edilebiliyor. Ekranlar bunların üstüne kurulacak.
- *Depo fonksiyonları `async`.* localStorage buna ihtiyaç duymaz ama Supabase
  duyar. Arayüzü baştan async yapınca Supabase eklenirken ekran kodu değişmez.
- *`yerelDepoOlustur(depolama)` parametre alıyor.* Tarayıcıda `localStorage`
  veriyoruz, testte sahte bir nesne. Buna "bağımlılığı dışarıdan verme"
  (dependency injection) denir; test yazmayı kolaylaştırır.
- *Mantık fonksiyonları "saf".* `kalanGun(hedef, bugun)` bugünün tarihini
  kendisi okumaz, parametre alır. Böylece test her gün aynı sonucu verir.
- *Dosyaların sonundaki `if (typeof module !== "undefined")` satırı:* aynı
  dosya hem tarayıcıda `<script>` ile hem Node'da `require` ile yüklenebilsin
  diye. Derleme adımı olmadan test yazmanın en basit yolu.

**Nasıl çalıştırılır:**
```
node --test "testler/*.test.js"
```
ya da `npm test`. Kurulum gerekmez (Node 18+ yeterli).

## Aşama 3 — Arayüz iskeleti, tasarım, takım ve üyeler

**Ne yaptım:**
- `index.html`: tek sayfa. Yan menü + içerik alanı + tek bir form penceresi.
- `css/stil.css`: bütün tasarım (masaüstü, mobil, yazdırma).
- `js/arayuz.js`: ortak parçalar — `ekranKaydet`, `eylemleriBagla`, `formAc`, `bildir`.
- `js/uygulama.js`: başlatma, takım seçimi, ekranlar arası geçiş.
- `js/ekranlar/takim.js`: takım oluşturma, üye ekleme/düzenleme/çıkarma, rol.
- `js/ornek-veri.js`: "Örnek veriyle dene" düğmesi için hayali takım.

**Neden böyle:**
- *Her ekran kendi dosyasında ve kendini `ekranKaydet` ile kaydediyor.* Menü bu
  kayıtlardan otomatik oluşuyor. Yeni ekran eklemek = yeni dosya + bir
  `<script>` satırı.
- *"Değişince hepsini yeniden çiz" (`yenile()`).* Her işlemden sonra ekran
  veriyi depodan tekrar okuyup baştan çiziliyor. React gibi kütüphanelerin
  çözdüğü "ekran ile veri uyumsuz kaldı" sorununu en basit yoldan çözer.
- *Tek `formAc` fonksiyonu.* Bütün ekle/düzenle formları alan listesinden
  üretiliyor; her form için ayrı HTML yazmak gerekmiyor.
- *Olay delegasyonu (`data-eylem`).* Her düğmeye ayrı dinleyici yerine
  kapsayıcıya tek dinleyici. Ekran yeniden çizilince dinleyiciler kaybolmuyor.
- *`htmlKacis`.* Kullanıcının yazdığı her metin HTML'e konmadan önce
  kaçırılıyor (XSS önlemi).
- *Adres çubuğunda `#gorevler` gibi ekran adı.* Sayfa yenilenince aynı ekranda
  kalınır, tarayıcının geri tuşu çalışır.
- *Tasarım:* "derin su" teması — koyulaşan lacivert yan menü, kâğıt rengi
  çalışma alanı, şamandıra turuncusu vurgu, sayılarda eş aralıklı yazı tipi.
  Mobilde yan menü alt sekme çubuğuna dönüşür.
- *Üye silinince* görevleri silinmez, sorumlusuz kalır. *Takım silinince* ona
  ait her şey silinir (iki durumda da onay sorulur).

**Nasıl çalıştırılır:** `index.html` dosyasını tarayıcıda aç (çift tıkla).
İstersen yerel sunucuyla: `python -m http.server 8765` → http://localhost:8765

## Aşama 4 — Görev panosu

**Ne yaptım:** `js/ekranlar/gorevler.js` — üç sütunlu pano (Yapılacak /
Yapılıyor / Bitti), görev ekle/düzenle/sil, sorumlu ve bitiş tarihi,
sorumluya göre süzme, ◀ ▶ ile sütun değiştirme.

**Neden böyle:**
- *Sürükle-bırak yerine ◀ ▶ düğmeleri.* Telefonda sürükle-bırak zahmetli ve
  kodu uzun. Düğmeler her cihazda aynı çalışır, klavyeyle de kullanılır.
- *`gorevFormu` ayrı bir fonksiyon.* Toplantı ekranı "karardan görev oluştur"
  için aynı formu kullanacak; kod tekrar yazılmıyor.
- *Gecikme vurgusu:* kartın sol kenarı gecikmişse kırmızı, 3 gün ve altı
  kalmışsa turuncu. Biten görev asla "gecikmiş" görünmez (`gorevGecikti`).

**Nasıl çalıştırılır:** `index.html` → menüden "Görevler".

## Aşama 5 — Son tarihler ve özet

**Ne yaptım:**
- `js/ekranlar/sontarihler.js`: rapor / izin / etkinlik tarihleri, geri sayım
  kutusu, "tamamlandı" işareti.
- `js/ekranlar/ozet.js`: açılış ekranı — en yakın son tarih, görev sayıları,
  gecikenler ve önümüzdeki 7 gün.

**Neden böyle:**
- *Renkler tek kuraldan geliyor:* `aciliyet(gun)` → gecikti / yakın (0–3 gün) /
  yaklaşıyor (4–7) / rahat. Pano, son tarihler ve özet aynı fonksiyonu
  kullandığı için her yerde aynı renk aynı anlama gelir.
- *"Tamamlandı" işareti.* Teslim edilmiş bir rapor, tarihi geçti diye sonsuza
  kadar "gecikti" görünmesin.
- *Özet ekranı veri tutmaz,* var olan kayıtlardan hesaplar. Böylece
  "özet ile pano farklı şey gösteriyor" hatası olamaz.
- *Tarihleri metin olarak karşılaştırmak:* "YYYY-AA-GG" biçimi alfabetik
  sıralandığında tarih sırasına da girmiş olur; ek kütüphane gerekmez.

**Nasıl çalıştırılır:** `index.html` → "Özet" ve "Tarihler".

## Aşama 6 — Toplantı tutanağı

**Ne yaptım:** `js/ekranlar/toplantilar.js` — toplantı listesi, tutanak
görünümü (künye, gündem, kararlar, görevler, notlar, imza alanı), karardan
tek tıkla görev, "Yazdır / PDF".

**Neden böyle:**
- *Gündem ve kararlar "her satıra bir madde" olarak yazılıyor.* Madde ekle/sil
  düğmeleriyle uğraşmak yerine tek bir metin kutusu; toplantı sırasında hızlı
  not almaya en yakın yol. `satirlaraAyir` satırları maddelere çevirir.
- *Karardan görev:* kararın yanındaki düğme görev formunu karar metniyle dolu
  açar. Kaydedilince kararın `gorev_id` alanına görevin kimliği yazılır;
  böylece aynı karardan yanlışlıkla iki görev açılmaz.
- *Tutanak düzenlenince bağ kopmaz:* `kararlariBirlestir` metni değişmeyen
  kararların `gorev_id` değerini korur (testi var).
- *PDF için kütüphane yok.* Tarayıcının kendi "Yazdır → PDF olarak kaydet"
  özelliği kullanılıyor. `@media print` kuralları menüyü ve düğmeleri gizler,
  geriye sadece tutanak kâğıdı kalır. Ekrandaki görünüm ile çıktı aynıdır.
- *Tutanak düzeni özgün;* resmi bir şablondan kopyalanmadı.

**Nasıl çalıştırılır:** "Toplantı" → "+ Yeni toplantı" → kaydet → "Yazdır / PDF"
→ yazıcı olarak "PDF olarak kaydet" seç.

## Aşama 7 — Duyuru şablonu

**Ne yaptım:** `js/ekranlar/duyuru.js` — toplantı daveti, toplantı özeti ve
son tarih hatırlatması için WhatsApp metni; "Kopyala" düğmesi. Tutanak ve son
tarih satırlarına bu ekrana kısayol düğmeleri.

**Neden böyle:**
- *Yapay zekâ yok, düz şablon.* Metin `mantik.js`'teki üç fonksiyondan gelir;
  aynı girdi her zaman aynı metni verir, bu yüzden birebir test edilebiliyor.
- *Boş alanın satırı yazılmaz.* Yer girilmediyse "Yer:" satırı hiç çıkmaz.
- *Metin kutusu düzenlenebilir.* Şablon her duruma uymaz; kopyalamadan önce
  elle düzeltme imkânı var.
- *Kopyalama iki yöntemli:* önce `navigator.clipboard`, olmazsa (ör. sayfa
  dosyadan açıldıysa) eski `execCommand("copy")`.

**Nasıl çalıştırılır:** "Duyuru" → tür ve kaynak seç → "Kopyala" → WhatsApp'a yapıştır.

## Aşama 8 — Supabase sürümü

**Ne yaptım:**
- `js/veri.js`: `supabaseDepoOlustur` — yerel depoyla aynı beş fonksiyon,
  Supabase REST API'sine `fetch` ile bağlanır. `depoSec` ayar varsa Supabase'i,
  yoksa localStorage'ı seçer.
- `supabase/sema.sql`: tablolar ve erişim kuralları.
- `.env.example` (yer tutucu) ve `araclar/env-aktar.js` (`.env` → `js/ayarlar.js`).
- `testler/supabase.test.js`: sahte sunucuyla testler + "sözleşme testi".

**Neden böyle:**
- *Ekran kodunda tek satır değişmedi.* Bütün ekranlar `durum.depo` üzerinden
  çalışıyor; arkasında localStorage mı Supabase mi olduğunu bilmiyorlar. Veri
  katmanını tek dosyada ve açık bir arayüzle tutmanın karşılığı bu.
- *Supabase kütüphanesi yok.* Supabase her tablo için REST adresi verir;
  dört HTTP yöntemi (GET/POST/PATCH/DELETE) yetiyor. Bağımlılık yok, kod okunur.
- *Sözleşme testi:* aynı senaryo iki depoda da çalıştırılıyor. İkisi de
  geçiyorsa "aynı arayüz" iddiası kanıtlanmış olur.
- *Anahtar koda gömülmedi.* `.env` ve `js/ayarlar.js` gitignore'da.
- *Gerçek Supabase ile denenmedi* (anahtar istenmedi). Bkz. QUESTIONS.md #2.
- *Giriş olmadığı için veriler anon anahtarla herkese açık.* Bkz. QUESTIONS.md #1.

**Nasıl çalıştırılır (isteğe bağlı):**
1. Supabase'de ücretsiz proje aç → SQL Editor'da `supabase/sema.sql`'i çalıştır.
2. `.env.example` dosyasını `.env` adıyla kopyala, iki değeri doldur.
3. `node araclar/env-aktar.js`
4. Sayfayı yenile; sol altta "Supabase'e bağlı" yazmalı.

Bunları yapmazsan uygulama localStorage ile çalışmaya devam eder.
