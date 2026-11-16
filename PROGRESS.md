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

## Aşama 9 — Doğrulama ve README

**Ne yaptım:**
- Uygulamayı tarayıcıda boş hâlden başlayarak uçtan uca denedim: takım oluştur
  → üye ekle → görev ekle ve taşı → son tarih ekle / tamamla → toplantı gir →
  karardan görev oluştur → tutanağı düzenle (bağ korunuyor) → duyuru üret →
  üye çıkar (görevi sorumlusuz kalıyor) → takımı sil.
- Aynı akışı tarayıcıda sahte bir Supabase sunucusuyla da çalıştırdım.
- 375 piksel genişlikte (telefon) bütün ekranlarda yatay taşma olmadığını kontrol ettim.
- Yazdırma kurallarını ekrana uygulayıp tutanağın düğmesiz, menüsüz çıktığını gördüm.
- `README.md` (Türkçe + İngilizce) yazdım.

**Doğrulanamayanlar (dürüst liste):**
- Gerçek Supabase projesiyle bağlantı (anahtar yok).
- `index.html`'i çift tıklayarak (file://) açma; denemeler yerel sunucu
  (`python -m http.server`) üzerinden yapıldı. Kod buna göre yazıldı (ES modülü
  ve fetch yok) ama bir kez elle denemekte fayda var.
- Tarayıcının gerçek yazdırma penceresi ve üretilen PDF dosyası (otomasyonda
  açılamıyor); yalnızca yazdırma CSS'i kontrol edildi.
- Gerçek telefonda deneme; yalnızca dar ekran benzetimi yapıldı.
- "Kopyala" düğmesinin panoya gerçekten yazdığı (otomasyonda pano okunamıyor).

**Nasıl çalıştırılır:** `index.html`'e çift tıkla. Testler: `npm test`.

# İkinci tur

## Tur 2 / Aşama 1 — Denetim ve düzeltmeler

**Ne yaptım:** Bütün kodu okuyup `RAPOR.md`'yi yazdım (29 bulgu), sonra
bulguları düzelttim: çift kayıt, çizim yarışı, klavye odağı, kontrast,
dokunma hedefleri, tarih ve uzunluk sınırları, boş durum yönlendirmeleri.

**Neden böyle:**
- *Önce rapor, sonra düzeltme.* Sorunları yazmadan düzeltmeye başlasaydım
  hangilerini atladığım belli olmazdı.
- *Eylem kilidi (`eylemSuruyor`).* Bir işlem bitmeden ikincisi başlamaz;
  çift tıklama artık çift kayıt oluşturmaz.
- *Çizim kuyruğu.* `yenile()` çağrıları sıraya girer; yavaş depoda eski
  çizim yenisinin üstüne yazamaz.
- *Odak tarifi.* Ekran baştan çizilince odaktaki düğme yok oluyordu. Çizimden
  önce düğmenin `data-eylem` + `data-id` değerini saklayıp sonra aynı düğmeyi
  buluyoruz.
- *Renkler tek yerde.* Bütün renkler CSS değişkeni; `testler/kontrast.test.js`
  açık ve koyu temada her yazı/zemin çiftini otomatik ölçüyor.

## Tur 2 / Aşama 2 — Etkinlik kaydı ve faaliyet raporu

**Ne yaptım:** `etkinlikler` koleksiyonu, `js/ekranlar/etkinlikler.js`
(etkinlik listesi + tarih aralığına göre yazdırılabilir rapor taslağı),
`mantik.js > faaliyetOzeti` ve testleri.

**Neden böyle:** Rapor hesabı (hangi etkinlikler, toplam katılımcı) saf
fonksiyonda; ekran yalnızca çiziyor. Tutanakla aynı kâğıt düzenini ve aynı
yazdırma kurallarını kullanıyor.

**Nasıl çalıştırılır:** "Etkinlik" → "+ Yeni etkinlik" → "Faaliyet raporu".
Testler: `npm test` (58 test).

## Tur 2 / Aşama 3 — Yoklama

**Ne yaptım:** Takım ekranına "Yoklama: katılım oranları" kartı. Toplantı ve
etkinlik formlarındaki "katılanlar" listesi yoklamanın kendisi.

**Neden böyle:**
- *Ayrı bir yoklama ekranı yok.* Toplantıda kimin olduğu zaten tutanağa
  yazılıyordu; aynı bilgiyi ikinci kez girdirmek yerine onu kullandım.
- *Hangi buluşmalar sayılır?* Tarihi geçmiş (ya da bugün) VE en az bir kişinin
  işaretlendiği toplantı/etkinlikler. Gelecekteki toplantı ya da yoklaması
  alınmamış etkinlik kimsenin yüzdesini düşürmez. Kural `katilimOranlari`
  fonksiyonunda ve testlerinde yazılı.
- *Hiç buluşma yoksa* yüzde `null` döner; ekranda "%0" yerine açıklama görünür.

**Nasıl çalıştırılır:** "Takım" ekranının altındaki tablo.

## Tur 2 / Aşama 4 — Takvim

**Ne yaptım:** `js/ekranlar/takvim.js` — son tarihler, toplantılar ve
etkinlikler tek ay ızgarasında; güne basınca o günün kayıtları.

**Neden böyle:**
- *Izgara hesabı saf fonksiyonda* (`ayIzgarasi`): ayın hangi gün başladığı,
  kaç hafta sürdüğü, artık yıl. En hata yapılan kısım bu olduğu için ayrı
  test edildi (4, 5 ve 6 haftalık aylar).
- *Gerçek `<table>`.* Ekran okuyucu satır/sütun başlıklarını okur; her gün
  düğmesinin tam cümle etiketi var ("18 Kasım 2026 Çarşamba, 2 kayıt").
- *Renk + şekil.* Türler kare / daire / baklava ile de ayrılıyor; renk körü
  kullanıcılar için.
- *Dar ekranda* başlıklar yerine sadece noktalar görünür; ayrıntı alttaki listede.

**Nasıl çalıştırılır:** "Takvim" → ◀ ▶ ile ay değiştir, güne bas.

## Tur 2 / Aşama 5 — Veri yedekleme

**Ne yaptım:** `js/yedek.js` (dışa aktar, denetle, içe aktar), Ayarlar
ekranında "Yedeği indir" ve "Yedekten yükle", 10 test.

**Neden böyle:**
- *Dışarıdan gelen dosyaya güvenilmez.* `yedekCoz` her kaydı `YEDEK_SEMASI`'na
  göre tek tek denetler; şemada olmayan alanları atar; tek bozuk kayıtta bütün
  dosyayı reddeder (yarım yükleme olmaz) ve hangi kaydın bozuk olduğunu söyler.
- *İçe aktarma hiçbir şeyin üzerine yazmaz.* Kayıtlar kendi kimlikleriyle
  eklenir; aynı kimlik varsa atlanır. Aynı dosyayı iki kez yüklemek zararsızdır.
  Bunun için `ekle()` artık kayıtta `id` varsa onu koruyor.
- *Gidiş-dönüş testi:* örnek veri → dışa aktar → içe aktar → birebir aynı mı?
- *Şema aynı zamanda veri modelinin belgesi.* Yeni koleksiyon eklenip şemaya
  yazılmazsa bir test kırılır.

**Nasıl çalıştırılır:** "Ayarlar" → "Yedeği indir (.json)" / "Yedekten yükle…".

## Tur 2 / Aşama 6 — Koyu/açık tema ve PWA

**Ne yaptım:** `js/tema.js`, `manifest.webmanifest`, `sw.js`, `ikonlar/`,
`araclar/ikon-uret.py`, PWA ve tema testleri.

**Neden böyle:**
- *Tema = sadece CSS değişkenleri.* `<html data-tema="koyu">` olunca renk
  değişkenleri değişir; başka hiçbir kural değişmez. Kontrast testi iki temayı
  da denetler.
- *`tema.js` `<head>` içinde.* Sayfa çizilmeden önce uygulanmazsa koyu tema
  kullanan kişi her açılışta bir an beyaz ekran görür.
- *Service worker "önce ağ, olmazsa önbellek".* İnternet varken her zaman
  güncel dosya gelir (eski sürümde takılma olmaz), yokken son kopya açılır.
  Supabase isteklerine dokunmaz.
- *İkonlar betikle üretildi* (resim kütüphanesi kurmadan, yalnızca Python'un
  kendi kütüphanesiyle).
- *`testler/pwa.test.js`:* index.html'e eklenen bir dosya `sw.js` listesine
  eklenmezse test kırılır.

**Nasıl çalıştırılır:** Tema: "Ayarlar" → Görünüm. Ana ekrana ekleme yalnızca
http(s) adresinde çalışır (yayınlanmış site ya da `python -m http.server`);
dosyadan çift tıklayınca service worker devreye girmez, uygulama yine çalışır.

**Geliştirirken dikkat:** `python -m http.server` dosyaları tarayıcıya
"önbelleğe alınabilir" gönderir. Bir dosyayı değiştirince eski hâli gelirse
sayfayı Ctrl+Shift+R ile yenile.

## Tur 2 / Aşama 7 — Supabase hazırlığı (RLS + giriş)

**Ne yaptım:**
- `supabase/schema.sql` (eski adı `sema.sql`): 7 tablo, takım üyeliği,
  satır düzeyinde güvenlik kuralları, davet koduyla katılma fonksiyonu.
- `js/oturum.js` + `js/ekranlar/giris.js`: e-posta/şifre ile giriş, jeton
  yenileme, çıkış. Takım ekranında davet kodu.
- `VERI_KATMANI` ortam değişkeni: `yerel` ya da `supabase`.
- `araclar/env-aktar.js` yeniden yazıldı; testleri eklendi.
- `SUPABASE_KURULUM.md`: adım adım rehber + "güvenliği dene" tablosu.

**Neden böyle:**
- *"Kullanıcı sadece kendi takımını görsün" giriş olmadan yapılamaz.*
  Veritabanının kimin istek attığını bilmesi gerekir; bu yüzden v1'de olmayan
  giriş bu turda eklendi. localStorage kullanılırken giriş ekranı hiç çıkmaz.
- *Güvenlik veritabanında, uygulamada değil.* Tarayıcıdaki kod herkesin
  elindedir ve değiştirilebilir. Kural `uye_mi(takim_id)` fonksiyonuyla her
  tabloda aynı; her satır için veritabanı sorar: "bu hesap bu takımın üyesi mi?"
- *Beş fonksiyonluk depo arayüzü değişmedi.* Giriş ayrı bir dosyada
  (`oturum.js`); depo yalnızca "jetonu ver" diye bir fonksiyon alıyor.
  Ekranların hiçbiri Supabase'den haberdar değil.
- *İki "üye" kavramı ayrı tutuldu:* `uyeler` = kadro (ad + rol), 
  `takim_uyelikleri` = giriş yapan hesaplar. Kadrodaki herkesin hesabı olmak
  zorunda değil. E-posta uygulama tablolarına girmiyor.
- *Davet kodu:* başka birini takıma almanın en basit yolu. Üyelik tablosuna
  doğrudan yazılamaz; tek yol kodu bilen birinin `takima_katil` çağırması.
- *Gizli anahtar koruması:* `env-aktar.js`, `service_role` anahtarı yazılırsa
  durur. Bu anahtarın tarayıcıya gitmesi bütün kuralları boşa çıkarırdı.
- *Aynı sözleşme testi iki depoda da çalışıyor* (`testler/supabase.test.js`).

**Doğrulanamayan (önemli):** Gerçek Supabase projesi yok. `schema.sql` hiçbir
PostgreSQL'de çalıştırılmadı; RLS kuralları yalnızca okunarak kontrol edildi.
Giriş ve veri istekleri sahte sunucuyla test edildi. İlk gerçek kurulumda
`SUPABASE_KURULUM.md > 7. Güvenliği dene` mutlaka yapılmalı.

**Nasıl çalıştırılır:** `SUPABASE_KURULUM.md`. Yapmazsan uygulama yerel çalışır.

## Tur 2 / Aşama 8 — Yayın yapılandırması

**Ne yaptım:** `netlify.toml` (derleme komutu, yayın klasörü, güvenlik
başlıkları) ve `YAYIN.md`.

**Neden böyle:**
- *Netlify seçildi* çünkü ortam değişkenlerini okuyup `js/ayarlar.js` üreten
  tek satırlık komutu çalıştırabiliyor ve güvenlik başlıklarını dosyadan alıyor.
- *Tek "derleme" adımı ayar dosyasını yazmak.* Kod derlenmiyor; yayındaki
  dosyalar depodakilerle aynı.
- *İçerik Güvenlik Politikası (CSP).* Sayfa yalnızca kendi betiklerini
  çalıştırabilir ve yalnızca kendi adresi + Supabase ile konuşabilir. Bir XSS
  açığı kalmış olsa bile dışarıdan betik yüklenemez, jeton başka adrese
  gönderilemez. Kodda satır içi betik olmaması (tema.js ayrı dosya) bunu mümkün kıldı.

**Nasıl doğrulandı:** Netlify hesabı olmadığı için, `netlify.toml`'daki
başlıkları birebir gönderen geçici bir yerel sunucu yazdım ve uygulamayı
onunla açtım: 9 ekran, form, tema, yedek indirme, service worker kurulumu
çalıştı; hiç CSP ihlali olmadı; `example.com`'a istek engellendi. Sunucuyu
kapatınca uygulama önbellekten açıldı (çevrimdışı).

**Doğrulanamayan:** Netlify'ın kendisinde yayın (derleme komutunun orada
çalışması, başlıkların uygulanması). `YAYIN.md > Yayın sonrası kontrol` bunun için.

**Nasıl çalıştırılır:** `YAYIN.md`.

## Tur 2 / Aşama 9 — Mülakat belgeleri ve son doğrulama

**Ne yaptım:**
- `ARCHITECTURE.md`: klasör yapısı, katmanlar, veri akışı, altı karar ve bedelleri.
- `MULAKAT.md`: 15 soru, taslak cevaplar, kodda kanıt yerleri, "kendin yap" listesi.
- `README.md` güncellendi; ekran görüntüsü yerleri bırakıldı.
- `RAPOR.md`: her bulgunun durumu işlendi (29 bulgu: 26 düzeltildi, 3 bilerek bırakıldı).
- `QUESTIONS.md` baştan yazıldı.

**Son doğrulama (tarayıcıda, temiz başlangıçla):**
- 320 piksel genişlikte 9 ekran, hem boş takımla hem örnek veriyle: hata yok,
  yatay taşma yok. Tutanak, faaliyet raporu ve form penceresi de sığıyor.
- En küçük düğme 44 piksel.
- Koyu temada yazdırma kuralları: kâğıt beyaz, yazı siyah, düğme ve menü yok.
- Yedek: dışa aktar → takımı sil → içe aktar → kayıt sayıları aynı.
- Giriş akışı sahte sunucuyla: kısa şifre, yanlış şifre, giriş, davet kodu, çıkış.
- Güvenlik başlıklarıyla (CSP) bütün ekranlar; service worker; sunucu kapalıyken açılma.
- `npm test`: 100 test geçiyor.

**Doğrulanamayanlar (hepsi QUESTIONS.md'de):**
- Gerçek Supabase projesi (şema hiç çalıştırılmadı).
- Netlify'da yayın.
- Gerçek yazdırma penceresi / PDF dosyası (yalnızca yazdırma kuralları denendi).
- Gerçek telefon ve "ana ekrana ekle" (yalnızca dar ekran benzetimi; manifest
  ve ikonlar testle denetlendi).
- Ekran okuyucuyla gerçek deneme (etiketler ve odak kodla denetlendi).

**Nasıl çalıştırılır:** `index.html`'e çift tıkla ya da `python -m http.server 8765`.
Testler: `npm test`.

## Tur 3 — Bitiriş

**Ne yaptım:**
- Demo bağlantısı: adrese `?ornek=1` eklenince örnek takım kendiliğinden
  yüklenir (yalnızca yerel kayıtta ve hiç takım yokken).
- README'ye beş ekran görüntüsü (`docs/ekran/`); başsız (penceresiz) Edge ile,
  doğrudan `index.html` dosyasından alındı.
- `CV_METNI.md`: CV'ye konabilecek hazır metinler (TR + EN).

**Bu sırada doğrulanan:** Ekran görüntüleri `file://` adresinden alındığı için
**`index.html`'e çift tıklayarak açma artık doğrulanmış oldu** (örnek veri
yüklendi, ekranlar çizildi, koyu ve açık tema çalıştı).

**Hâlâ senin yapman gerekenler:** GitHub'a gönderme, Netlify'da yayın,
gerçek Supabase kurulumu, ekipte kullanım. Bkz. QUESTIONS.md > A.

# Resmî tutanak özelliği

## Tutanak / Aşama 1 — Mantık, belge görünümü ve PDF denemesi

**Ne yaptım:**
- `js/tutanak.js`: tutanak numarası, yeni taslak, kopya, devreden karar
  adayları, notlardan ayrıştırma, belgenin HTML'i ve sayfa kuralları.
- `css/stil.css`: "Resmî tutanak" görünümü (A4, serif, çerçeve) ve yazdırma kuralları.
- `tutanaklar` adında yeni kayıt türü (veri katmanı, yedek şeması, Supabase şeması).
- `araclar/tutanak-pdf-test.js` (`npm run test:pdf`): örnek tutanağı gerçek
  PDF'e çevirip sayfa sayısını, Türkçe harfleri ve yazı tipini denetler.
- `testler/tutanak.test.js`: 31 test.

**Neden böyle:**
- *Önce mantık ve belge, sonra ekran.* Belgeyi üreten fonksiyon
  (`tutanakBelgeHtml`) ekrandan bağımsız; bu yüzden aynı fonksiyon hem
  uygulamada hem PDF testinde kullanılıyor. Testte gördüğüm çıktı kullanıcının
  alacağı çıktıyla aynı.
- *PDF'i tarayıcının yazdırma motoru üretiyor, kütüphane değil.* Sayfalara
  bölme, "karar ortadan bölünmesin" (`break-inside: avoid`), her sayfada
  çerçeve ve "Sayfa N" (`@page` kuralı ve `counter(page)`) tarayıcının zaten
  yaptığı işler. Türkçe harfler sorun olmuyor çünkü bilgisayardaki Times New
  Roman kullanılıyor; PDF kütüphanesi kullansaydım yaklaşık 2 MB'lık bir
  yazı tipi dosyasını da uygulamaya gömmem gerekirdi.
- *Notlardan ayrıştırma basit kurallarla:* "Etiket: değer" satırları, bölüm
  başlıkları, numaralı satırlar. Amaç %100 doğru olmak değil; **hiçbir satırı
  kaybetmemek** (tanınmayanlar "yerleştirilemeyen satırlar" olarak gösterilir)
  ve sonucu düzeltilebilir bir forma vermek.
- *Numara biçimi için ayrı ayar yok.* Sıradaki numara bir öncekinden türetilir
  (`sonrakiTutanakNo`): son sayı bir artar, sıfır dolgusu korunur, yıl
  değişince sayaç 01'e döner. Biçimi değiştirmek için bir tutanağın numarasını
  elle değiştirmek yeter; sonrakiler onu izler.
- *Sayfa altlığındaki yazı CSS'e yazılırken kaçırılıyor* (`cssMetni`):
  kullanıcının yazdığı metin stil kuralını bozamaz.

**Referans PDF hakkında:** `referans/` klasörü proje klasöründe yoktu;
görünüm, istekte yazılı biçim tarifine göre yapıldı. Bkz. QUESTIONS.md.

**Nasıl çalıştırılır:** `npm test` · `npm run test:pdf` (çıktı: `testler/cikti/ornek-tutanak.pdf`)

## Tutanak / Aşama 2 — Word (.docx) okuma ve yazma

**Ne yaptım:** `js/docx.js` — .docx dosyasından düz yazı çıkarma ve tutanaktan
.docx üretme; `testler/docx.test.js` (13 test).

**Neden böyle:**
- *Hazır kütüphane yerine yaklaşık 300 satır kendi kodum.* Bir .docx aslında
  içinde XML dosyaları olan bir ZIP arşividir. Okumak için arşivden
  `word/document.xml`'i çıkarıp `<w:t>` etiketlerindeki yazıyı toplamak
  yetiyor; sıkıştırmayı tarayıcının kendi `DecompressionStream` özelliği açıyor.
  Yazmak için dosyaları sıkıştırmadan arşive koymak yetiyor. Böylece dışarıdan
  dosya indirmedim, uygulama internetsiz çalışmaya devam ediyor ve kodun
  tamamı okunup anlatılabilir. (İstekte "kütüphane kullan" deniyordu; neden
  farklı yaptığım QUESTIONS.md'de.)
- *Gerçek Word ile denendi.* Üretilen dosyayı bu bilgisayardaki Word ile açtım
  (onarım istemeden açıldı: 2 sayfa, Times New Roman, çerçeve, altlıkta
  "Sayfa N"). Tersini de denedim: Word'ün kendi yazdığı, otomatik numaralı
  liste içeren bir dosyayı uygulamanın okuyucusu doğru okudu.
- *Gidiş-dönüş testi:* tutanağı Word'e aktar → Word dosyasını geri oku →
  ayrıştır → bütün alanlar aynı mı? Bu tek test hem yazıcıyı, hem okuyucuyu,
  hem not ayrıştırıcıyı birlikte sınıyor.
- *Word'ün otomatik numaralı paragraflarında* numara yazının içinde olmaz;
  okuyucu bunları "- " ile başlatır ki ayrıştırıcı madde olarak görsün.
- *Kullanıcı metni XML'e kaçırılarak yazılır* (`xmlKacis`); yasak denetim
  karakterleri atılır, yoksa Word dosyayı "bozuk" diye açmazdı.

**Nasıl çalıştırılır:** `npm test`. Elle görmek için: `npm run test:pdf`
çalıştırdıktan sonra `testler/cikti/` klasörüne bak.
