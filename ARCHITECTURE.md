# Seyir — Mimari özet

Seyir (Team Assistant for Student Teams / Öğrenci Takımları İçin Takım
Asistanı) projesinin mimarisi. Bu belge, projeyi beş dakikada anlatabilmen için yazıldı. Kodun her dosyasının
başında da "bu dosya ne yapar" yorumu var; burası büyük resim.

**Tek cümle:** Düz HTML/CSS/JavaScript ile yazılmış tek sayfalık bir uygulama;
ekranlar veriye tek bir arayüz üzerinden ulaşır, o arayüzün arkasında
tarayıcı kaydı (localStorage) ya da bulut (Supabase) olabilir.

Sayılarla: yaklaşık 5.800 satır JavaScript, 650 satır CSS, 248 otomatik test,
sıfır bağımlılık, derleme adımı yok.

---

## 1. Klasör yapısı

```
uygulama.html              Uygulamanın tek sayfası (/uygulama). Boş bir iskelet; içini JavaScript doldurur.
robots.txt, sitemap.xml    Arama motorları: ana sayfa (tanıtım) dizinlenir, uygulama dizinlenmez
css/stil.css               Bütün görünüm: renk değişkenleri, açık/koyu tema, mobil, yazdırma
manifest.webmanifest       "Ana ekrana ekle" için uygulama kimliği
sw.js                      Service worker: dosyaları önbelleğe alır, çevrimdışı açar
ikonlar/                   Uygulama ikonları

js/
  veri.js                  VERİ KATMANI — depo arayüzü ve iki uygulaması
  oturum.js                Supabase girişi (jeton al, yenile, çık)
  mantik.js                Saf fonksiyonlar: tarih, takvim, yoklama, rapor, duyuru metni
  yedek.js                 Veri şeması + JSON dışa/içe aktarma
  tema.js                  Açık / koyu tema
  kolaylik.js              Saf yardımcılar: taslak, sorumlu tahmini, .ics, arama, kısayollar
  arayuz.js                Ortak arayüz: form penceresi, arama, kısayollar, bildirim, tıklama eylemleri
  paylasim.js              Duyuruya fotoğraf / video ekleme ve Paylaş menüsü (kuralları: js/kisiler.js)
  ornek-veri.js            "Örnek veriyle dene" için hayali takım
  uygulama.js              Başlatma, ekran geçişi, odak yönetimi
  ekranlar/                Her ekran bir dosya
    ozet.js  gorevler.js  sontarihler.js  takvim.js  toplantilar.js
    tutanaklar.js          Resmî tutanak ekranı (mantığı: js/tutanak.js, Word: js/docx.js)
    kisiler.js mesajlar.js Kişi rehberi ve WhatsApp mesajları (mantığı: js/kisiler.js)
    etkinlikler.js  duyuru.js  takim.js  ayarlar.js  giris.js

supabase/schema.sql        Tablolar ve satır düzeyinde güvenlik kuralları
araclar/env-aktar.js       Ortam değişkenlerini js/ayarlar.js'e yazar
araclar/ikon-uret.js       PNG ikonları ikonlar/ikon.svg'den üretir (Chrome ile)
netlify.toml               Yayın ayarları ve güvenlik başlıkları
tanitim-kaynak/            Tanıtım sayfası (/tanitim): React + Tailwind + Framer Motion, Vite ile
                           derlenir; çıktı tanitim/ (depoya girmez, yayında üretilir). Uygulamadan
                           bağımsızdır: uygulama yine framework'süz, derlemesiz.
testler/                   248 test (Node'un kendi test aracı)
```

## 2. Katmanlar

```
┌──────────────────────────────────────────────────────────────┐
│  EKRANLAR  js/ekranlar/*.js                                  │
│  "Ne gösterilecek, tıklanınca ne olacak"                     │
└───────┬───────────────────────┬──────────────────────────────┘
        │ kullanır              │ kullanır
┌───────▼──────────┐   ┌────────▼───────────┐
│ ARAYÜZ arayuz.js │   │ MANTIK  mantik.js  │   ← ekrana ve veriye dokunmaz;
│ form, bildirim   │   │ yedek.js           │     girdi alır, çıktı verir
└──────────────────┘   └────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────┐
│  VERİ KATMANI  js/veri.js                                    │
│  depo.listele · oku · ekle · guncelle · sil                  │
│        ┌───────────────────┬────────────────────────┐        │
│        │ yerelDepoOlustur  │ supabaseDepoOlustur    │        │
│        │ (localStorage)    │ (REST + fetch + jeton) │        │
│        └───────────────────┴────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

Kural: **oklar hep aşağı gider.** Ekranlar veri katmanını çağırır; veri katmanı
ekranlardan habersizdir. Mantık dosyaları hiç kimseyi çağırmaz.

## 3. Veri akışı: "Yeni görev ekle"ye basınca ne olur?

1. Kullanıcı **+ Yeni görev** düğmesine basar. Düğmede `data-eylem="ekle"` yazar.
2. `arayuz.js > eylemleriBagla` tıklamayı yakalar, `gorevler.js` içindeki `ekle`
   fonksiyonunu çağırır.
3. O da `gorevFormu(...)` → `formAc(...)` ile form penceresini açar.
4. Kullanıcı **Kaydet**'e basar. `formAc` değerleri toplar, denetler
   (zorunlu alan, geçerli tarih) ve `kaydet(degerler)` fonksiyonunu çağırır.
5. `kaydet`, `durum.depo.ekle("gorevler", {...})` der. Depo localStorage ise
   listeye yazar; Supabase ise `POST /rest/v1/gorevler` isteği atar.
6. `formAc` pencereyi kapatır ve `yenile()` çağırır.
7. `yenile()`, açık ekranın `ciz` fonksiyonunu çalıştırır: görevler depodan
   yeniden okunur, pano baştan çizilir. Yeni görev artık görünür.

Bütün işlemler bu kalıbı izler: **tıkla → depoyu değiştir → ekranı yeniden çiz.**

## 4. Altı temel karar ve nedenleri

### Karar 1 — Veri katmanı tek bir arayüzün arkasında
Ekranlar veriye yalnızca beş fonksiyonla ulaşır. **Neden:** Önce localStorage
ile bitirip sonra Supabase ekleyebilmek için. Supabase eklendiğinde ekran
kodunda tek satır değişmedi. **Kanıt:** `testler/supabase.test.js` içindeki
"sözleşme testi" aynı senaryoyu iki depoda da çalıştırır.
**Bedeli:** Arayüz basit tutulduğu için filtre yalnızca "eşittir" yapabilir;
sıralama ve tarih aralığı gibi işler tarayıcıda yapılır. Bu boyutta sorun değil.

### Karar 2 — "Değişince hepsini yeniden çiz"
Her işlemden sonra ekran veriyi yeniden okuyup baştan çizilir.
**Neden:** React gibi kütüphanelerin çözdüğü asıl sorun "ekran ile veri
uyumsuz kaldı" sorunudur. Her seferinde baştan çizince bu sorun hiç oluşmaz
ve kütüphaneye gerek kalmaz. **Bedeli:** (a) Çok büyük listelerde yavaşlar —
bir öğrenci takımının verisinde hissedilmez. (b) Yeniden çizim klavye odağını
siler; bunu `uygulama.js > odakTarifi / odagiGeriVer` ile ayrıca çözmek gerekti.

### Karar 3 — Mantık saf fonksiyonlarda
"Kaç gün kaldı", "ay ızgarası", "katılım yüzdesi", "duyuru metni" gibi
hesaplar `mantik.js`'te; ekrana ve depoya dokunmazlar, bugünün tarihini bile
parametre olarak alırlar. **Neden:** Tarayıcı açmadan, her gün aynı sonucu
verecek şekilde test edilebilsinler. Testlerin çoğu buradadır.

### Karar 4 — Framework ve derleme yok, klasik `<script>`
**Neden:** (a) Proje sahibinin her satırı anlatabilmesi. (b) `uygulama.html`'e
çift tıklayınca çalışması. (c) Yayınlanan dosyaların depodakilerle aynı olması.
**Bedeli:** Fonksiyonlar global; dosyaların `uygulama.html`'deki sırası önemli.
Proje büyüseydi ES modüllerine geçmek gerekirdi.

### Karar 5 — Güvenlik veritabanında
Supabase kipinde "kim hangi veriyi görür" kuralı uygulama kodunda değil,
`schema.sql`'deki satır düzeyinde güvenlik (RLS) kurallarındadır.
**Neden:** Tarayıcıya giden kod herkesin elindedir ve değiştirilebilir;
güvenilemez. Veritabanı her satır için "bu hesap bu takımın üyesi mi?" diye
kendisi sorar. Ek katmanlar: kullanıcı metni her yerde `htmlKacis` ile
kaçırılır (XSS), yayında İçerik Güvenlik Politikası başlığı vardır, içe
aktarılan yedek dosyası şemaya göre denetlenir.

### Karar 6 — Renkler yalnızca CSS değişkenlerinde
**Neden:** Koyu tema tek bir blokla gelir (`:root[data-tema="koyu"]`), ve
`testler/kontrast.test.js` iki temada da her yazı/zemin çiftinin okunabilirliğini
otomatik ölçer.

## 5. Veri modeli

Altı koleksiyon; her kayıtta `id` ve `olusturma`, takım dışındakilerde `takim_id` var.

| Koleksiyon | Alanlar |
|---|---|
| `takimlar` | ad |
| `uyeler` | ad, rol (kaptan / uye) |
| `gorevler` | baslik, aciklama, durum, sorumlu_id → uye, bitis_tarihi, toplanti_id → toplantı |
| `son_tarihler` | baslik, tur, tarih, aciklama, tamamlandi |
| `toplantilar` | baslik, tarih, saat, yer, katilimci_idler → uye[], yazan_id → uye, gundem[], kararlar[{metin, gorev_id}], notlar |
| `etkinlikler` | ad, tarih, yer, katilimci_sayisi, katilimci_idler → uye[], aciklama |
| `kisiler` | ad, ilk_ad, telefon (90XXXXXXXXXX), etiket, aciklama |
| `sablonlar` | ad, tur (kabul / davet / hatirlatma / duyuru), metin |
| `kampanyalar` | ad, sablon_id, mesaj, alicilar[{kisi_id, ad, ilk_ad, telefon, gonderildi, zaman}] |
| `tutanaklar` | kurum, alt_baslik, numara, toplanti_tarihi, tutanak_tarihi, sonraki_toplanti, ek_etiket, ek_deger, katilimcilar[], devreden_giris, devreden[{metin, atif}], kararlar[], gorevler[], alt_bilgi, sayfa_altligi |

Tek doğru kaynak: `js/yedek.js > YEDEK_SEMASI`. `supabase/schema.sql` aynı
alanları tablo olarak tanımlar. Tarihler `"2026-11-25"` biçiminde metindir
(sıralanabilir, saat dilimi sorunu yok).

## 6. Testler

| Dosya | Neyi dener |
|---|---|
| `mantik.test.js`, `mantik2.test.js` | Tarih hesabı, takvim ızgarası, yoklama, rapor, duyuru şablonları |
| `veri.test.js` | localStorage deposu |
| `supabase.test.js` | Supabase deposu (sahte sunucu) + iki depo için sözleşme testi |
| `oturum.test.js` | Giriş, jeton yenileme, çıkış (sahte sunucu, sahte saat) |
| `yedek.test.js` | Dışa/içe aktarma, bozuk dosyaların reddi, gidiş-dönüş |
| `ayarlar.test.js` | Ortam değişkeni → ayar dosyası; gizli anahtarın reddi |
| `kontrast.test.js` | İki temada renk kontrastı |
| `pwa.test.js` | Service worker dosya listesi, manifest, ikonlar |

Otomatik testler **mantığı ve veri katmanını** kapsar. Arayüz davranışı
(tıklama, odak, mobil görünüm) tarayıcıda elle denendi; otomatik arayüz testi yok.

## 7. Bilinen sınırlar (dürüst liste)

- Otomatik arayüz testi yok.
- Aynı anda düzenleme: her satırda `surum` (sürüm) var; güncelleme "sürüm
  hâlâ gördüğüm mü?" koşuluyla tek istekte yapılır (`js/veri.js`,
  `schema.sql` bölüm 6). İkinci kaydeden uyarılır; alan alan birleştirme yok.
- Supabase kipinde çevrimdışıyken veri görünmez (yalnızca uygulama açılır).
- Takım içinde yetki ayrımı yok; her üye her şeyi yapabilir.
- Fonksiyonlar global; proje büyürse modüllere bölünmeli.

## 8. "Bugün baştan yazsam neyi farklı yapardım?"

Kendi cevabını yaz. Düşünmen için başlangıç noktaları:
- ES modülleri (global fonksiyonlar yerine `import`/`export`)
- Arayüz için otomatik test (ör. Playwright)
- `innerHTML` ile metin birleştirmek yerine küçük bir şablon yardımcı fonksiyonu
- Supabase'i gerçek bir projeyle en baştan denemek
