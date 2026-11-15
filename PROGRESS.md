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
