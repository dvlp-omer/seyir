# RAPOR — v1 kod denetimi

v1 kodunun tamamını (yaklaşık 2100 satır) baştan okudum ve şüphelendiğim
noktaları tarayıcıda denedim. Bu rapor **kod değiştirilmeden önce** yazıldı.
"Durum" sütunu düzeltmelerden sonra dolduruldu (✅ düzeltildi).

**Nasıl denetlendi**
- Okuma: `js/`, `css/`, `index.html`, `supabase/`, `araclar/` içindeki her dosya.
- Ölçüm: renk kontrastı WCAG formülüyle hesaplandı (hedef: normal yazı için 4,5).
- Deneme: çift tıklama, klavye odağı, 320 ve 375 piksel genişlik, boş takım.

**Önem dereceleri:** 🔴 hata (veri bozar ya da kullanımı engeller) ·
🟠 önemli (belli kullanıcıları zorlar) · 🟡 küçük (cilalama)

---

## 1. Hatalar

| # | Önem | Sorun | Nasıl görüldü | Durum |
|---|------|-------|---------------|-------|
| H1 | 🔴 | **Çift tıklama çift kayıt oluşturuyor.** "Kaydet"e hızlı iki kez basınca aynı görev iki kez ekleniyor. "Örnek veriyle dene"ye çift tıklayınca iki örnek takım oluşuyor. Supabase'de (ağ yavaşken) çok daha kolay tetiklenir. | Denendi: 2 görev, 2 takım oluştu. | ✅ Eylem kilidi + kayıt sürerken pasif düğme. Yeniden denendi: 1 görev, 1 takım. |
| H2 | 🔴 | **Ekran çizimleri yarışabiliyor.** `yenile()` aynı anda iki kez çalışabiliyor (ör. `hashchange` + işlem sonrası). Yavaş depoda eski çizim yenisinin üstüne yazabilir. | Kod okuması: `yenile` bekleyen bir çizimi iptal etmiyor, sıraya da koymuyor. | ✅ Çizimler sıraya konuyor (`cizimKuyrugu`). |
| H3 | 🟠 | **Tutanak açıkken menüden "Toplantı"ya basınca listeye dönülmüyor.** Tek çıkış "← Tüm toplantılar" düğmesi. | Denendi. | ✅ Menüden basılınca ekran ilk hâline dönüyor (`sifirla`). |
| H4 | 🟠 | **Başka sekmede silinen kayıt hata verdiriyor.** `gorevTasi` ve "Tamamlandı" işlemi, kayıt artık yoksa `null` üzerinden okumaya çalışıyor. | Kod okuması (`gorev.durum`, `kayit.tamamlandi`). | ✅ Kayıt yoksa ekran sessizce yenileniyor. |
| H5 | 🟠 | **Başka sekmedeki değişiklik görünmüyor.** İki sekme açıkken biri eski veriyi gösteriyor. | Kod okuması: `storage` olayı dinlenmiyor. | ✅ `storage` olayı dinleniyor (form açıkken değil). |
| H6 | 🟡 | **localStorage kapalıysa uygulama sessizce boş kalıyor.** Bazı gizli modlarda `localStorage` erişimi hata fırlatır; bu hata yakalanmıyor. | Kod okuması: `baslat()` içinde depo seçimi `try` dışında. | ✅ Açıklayıcı hata kutusu gösteriliyor. |
| H7 | 🟡 | **Geçersiz durumdaki görev tutanağı çökertir.** `GOREV_DURUMLARI.find(...).etiket` — durum beklenmeyen bir değerse hata. Formdan gelemez ama içe aktarılan veriden gelebilir. | Kod okuması. | ✅ `gorevDurumEtiketi`; içe aktarmada durum şemayla denetleniyor. |

## 2. Boş durumlar

| # | Önem | Sorun | Durum |
|---|------|-------|-------|
| B1 | 🟠 | **Yeni takımda Özet ekranı yol göstermiyor.** Üye yokken dört sıfır ve "bekleyen bir şey yok" yazıyor; kullanıcı ne yapacağını bilmiyor. | ✅ Üye yokken "Başlarken" kutusu ve kısayollar. |
| B2 | 🟡 | **Üye yokken görev formu.** "Sorumlu" listesinde tek seçenek var, neden boş olduğu söylenmiyor. | ✅ Formda açıklayıcı ipucu. |
| B3 | 🟡 | **Süzgeç sonucu boşken pano.** Bir kişiye göre süzünce üç sütun da "Burada görev yok" diyor; süzgecin etkin olduğu belli değil. | ✅ Süzgeç etkinken uyarı + "Hepsini göster". |
| ✓ | — | Görev, son tarih, toplantı, üye listeleri boşken açıklayıcı mesaj var. Tutanakta gündem/karar/görev yoksa ayrı ayrı belirtiliyor. Duyuru ekranı kaynak yokken yönlendiriyor. | sorun yok |

## 3. Geçersiz girişler

| # | Önem | Sorun | Durum |
|---|------|-------|-------|
| G1 | 🟠 | **Çok satırlı alanlarda uzunluk sınırı yok.** Tek satırlık alanlar 200 karakterle sınırlı, `textarea`'lar sınırsız. | ✅ 2000 karakter sınırı. |
| G2 | 🟡 | **Anlamsız yıllar kabul ediliyor.** Tarih alanına 0002 ya da 9999 yılı yazılabiliyor. | ✅ 2000–2100 dışı ve var olmayan tarihler reddediliyor (`tarihGecerli`). |
| G3 | 🟡 | **Aynı karar iki kez yazılabiliyor.** Bağ mantığı bunu doğru işliyor (testi var) ama tutanakta tekrar görünüyor. Bilerek bırakıldı: iki ayrı karar aynı cümleyle yazılmış olabilir. | değiştirilmedi |
| ✓ | — | Zorunlu alanlar, sadece boşluk girilmesi, HTML/script girişi (`<b>`, `<script>` kaçırılıyor) doğru işleniyor. | sorun yok |

## 4. Mobil

| # | Önem | Sorun | Durum |
|---|------|-------|-------|
| M1 | 🟠 | **Küçük düğmeler parmak için dar.** `.dugme.kucuk` 32 piksel yüksekliğinde; önerilen dokunma hedefi en az 44 piksel. | ✅ Mobilde bütün düğmeler en az 44 piksel. |
| M2 | 🟠 | **Alt sekme çubuğu yeni ekranlara yer bırakmıyor.** 6 sekme 320 pikselde zaten sıkışık (her biri ~52 piksel, 11 punto yazı). Bu turda eklenecek ekranlarla taşacak. | ✅ Sekme çubuğu yana kaydırılıyor; 9 sekmeyle 320 pikselde taşma yok. |
| M3 | 🟡 | **Depo bilgisi mobilde görünmüyor.** "Veriler bu tarayıcıda saklanıyor" notu yan menünün altında; mobilde yan menü gizli. | ✅ Ayarlar ekranında "Veri deposu" kartı. |
| ✓ | — | 320 ve 375 piksel genişlikte hiçbir ekranda yatay taşma yok (ölçüldü). | sorun yok |

## 5. Erişilebilirlik

| # | Önem | Sorun | Nasıl görüldü | Durum |
|---|------|-------|---------------|-------|
| E1 | 🔴 | **Klavye odağı her işlemde kayboluyor.** Menüden ekran değiştirince, ◀ ▶ ile görev taşıyınca ya da form kapanınca odak `<body>`'ye düşüyor. Klavye ya da ekran okuyucu kullanan biri her seferinde sayfanın başından başlamak zorunda. Sebep: ekran (ve menü) `innerHTML` ile baştan çiziliyor, odaktaki düğme yok oluyor. | Denendi: üç durumda da `document.activeElement === body`. | ✅ Odak her çizimde korunuyor (`odakTarifi`). Yeniden denendi. |
| E2 | 🔴 | **Ana düğmenin kontrastı yetersiz.** Turuncu (#ee6a2f) üzerinde beyaz yazı: **3,12** (gereken 4,5). "Kaydet", "+ Yeni görev" gibi en önemli düğmeler bu renkte. | Hesaplandı. | ✅ Vurgu rengi koyulaştırıldı; otomatik testle 4,5 üstü. |
| E3 | 🟠 | **Soluk yazı bazı zeminlerde sınırın altında.** Görev sütununda 4,34; "tamam" sayacında 4,40. Bağlantı rengi sütun zemininde 3,87. | Hesaplandı. | ✅ Soluk yazı ve bağlantı renkleri koyulaştırıldı; testte. |
| E4 | 🟠 | **Aynı adlı düğmeler ayırt edilemiyor.** Her görev kartında "Düzenle" ve "Sil" var; ekran okuyucu hangisinin hangi göreve ait olduğunu söylemiyor. Son tarihlerde ve kararlardaki "+ Görev oluştur"da da aynı. | Kod okuması: `aria-label` yalnızca ◀ ▶ ve "Çıkar"da var. | ✅ `kayitDugmesi`: "Sil: Rapor taslağı" biçiminde etiket. |
| E5 | 🟠 | **Form penceresinin adı yok.** `<dialog>` açılınca ekran okuyucu neyin açıldığını söylemiyor. | Denendi: `aria-labelledby` yok. | ✅ `aria-labelledby` eklendi. |
| E6 | 🟠 | **Ekran değişince duyurulmuyor.** Sayfa başlığı değişiyor ama odak içerikte bir yere taşınmıyor. | Kod okuması. | ✅ Ekran değişince odak başlığa taşınıyor. |
| E7 | 🟡 | **Odak halkası zeminde soluk.** Turuncu halka açık zeminde 2,78 (arayüz öğeleri için gereken 3). | Hesaplandı. | ✅ Odak rengi 3 üstü; koyu zeminde beyaz halka. |
| E8 | 🟡 | **Hareket azaltma tercihi dikkate alınmıyor.** Bildirim animasyonu `prefers-reduced-motion` ayarına bakmıyor. | Kod okuması. | ✅ `prefers-reduced-motion` kuralı. |
| ✓ | — | Bütün form alanlarının etiketi var; çoklu seçim `fieldset/legend` ile gruplu; `lang="tr"` tanımlı; bildirimler `role="status"`; aciliyet yalnızca renkle değil metinle de belirtiliyor ("3 gün gecikti"). | | sorun yok |

## 6. Güvenlik ve veri

| # | Önem | Sorun | Durum |
|---|------|-------|-------|
| V1 | 🔴 | **Supabase'de veri herkese açık.** v1 erişim kuralları anon anahtarla herkese okuma/yazma veriyor (v1'de bilerek, uyarısıyla). Bu turda giriş ve takım bazlı kurallarla değiştirilecek. | ⚠️ Giriş + takım bazlı RLS yazıldı (`schema.sql`). **Gerçek projede denenmedi.** |
| V2 | 🟠 | **Yedek yok.** localStorage silinirse (tarayıcı verisi temizlenir, cihaz değişir) bütün veri gider. Bu turda JSON yedekleme ile çözülecek. | ✅ JSON yedekleme (Ayarlar). |
| ✓ | — | Kullanıcı metni HTML'e her yerde `htmlKacis` ile konuyor (elle tek tek kontrol edildi). Anahtarlar depoda yok. | sorun yok |

## 7. Kod kalitesi

| # | Önem | Not | Durum |
|---|------|-----|-------|
| K1 | 🟡 | `js/ayarlar.js` yokken her açılışta konsola 404 düşüyor. Zararsız ama hata gibi görünüyor. | bilerek bırakıldı: dosya gizli ayarlar için depoda yok; `env-aktar.js` bir kez çalışınca kaybolur. |
| K2 | 🟡 | CSS'te değişken yerine doğrudan yazılmış 6 renk var (`#fff`, `#e3ebe8` …). Koyu tema eklenince sorun olur. | ✅ Bütün renkler değişkende; bunu denetleyen test var. |
| K3 | 🟡 | Fonksiyonlar global. Bilinçli bir tercih (çift tıklayınca çalışsın diye), ama ad çakışması riski var; dosya sırası önemli. | değiştirilmedi |

---

## Özet

| | Bulunan | Düzeltilen | Bilerek bırakılan |
|---|---|---|---|
| 🔴 Hata | 5 | 5 (biri gerçek ortamda denenmedi: V1) | 0 |
| 🟠 Önemli | 12 | 12 | 0 |
| 🟡 Küçük | 12 | 9 | 3 (G3, K1, K3) |
| **Toplam** | **29** | **26** | **3** |

En önemli üç bulgu: **çift kayıt (H1)**, **klavye odağının kaybolması (E1)** ve
**ana düğme kontrastı (E2)**. Üçü de v1'de "çalışıyor" görünen ama gerçek
kullanımda can sıkacak sorunlardı; hiçbiri v1 testlerinde yakalanmamıştı çünkü
testler yalnızca mantık ve veri katmanını kapsıyordu, arayüz davranışını değil.

## Düzeltmelerden sonra

- H1, E1, E6, H3, G2, B3 tarayıcıda aynı adımlarla **yeniden denendi** ve geçti.
- Kontrast bulguları (E2, E3, E7) artık `testler/kontrast.test.js` ile her
  `npm test` çalıştığında iki temada da denetleniyor.
- Hâlâ açık olan yapısal eksik: **otomatik arayüz testi yok.** Bu rapordaki
  hataların çoğu arayüz davranışıydı ve elle bulundu; benzerleri yine elle
  aranmak zorunda. Sonraki en değerli adım budur.
