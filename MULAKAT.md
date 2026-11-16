# Mülakat hazırlığı — 20 soru

Aşağıdaki cevaplar **taslaktır**. Ezberleme; her birini kodu açıp doğrula,
sonra kendi cümlelerinle yeniden yaz. Mülakatçı ezber cevabı ikinci soruda
anlar ("peki bunu kodda gösterir misin?").

**Önce bir not.** Bu proje bir yapay zekâ asistanıyla birlikte yazıldı; commit
geçmişinde de böyle görünüyor (`Co-Authored-By`). Sorulursa bunu açıkça
söyle — saklamaya çalışmak, söylemekten çok daha kötü görünür. Güçlü cevap şu
biçimdedir: *"Asistanla birlikte yazdım. Gereksinimleri ben belirledim, her
dosyayı okudum, şu kararı şu yüzden değiştirdim, şu hatayı ben buldum."*
Bunu söyleyebilmek için aşağıdaki "Kendin yap" maddelerini gerçekten yap.

Her sorunun altındaki 📂 satırı, cevabın kanıtının kodda nerede olduğunu gösterir.

---

## A. Proje ve mimari

### 1. Bu proje ne yapıyor, neden yaptın?
Öğrenci takımlarında tekrar eden dört sorunu çözüyor: toplantı kararları
unutuluyor, görevin kimde olduğu karışıyor, rapor ve izin tarihleri kaçıyor,
duyurular her seferinde baştan yazılıyor. Hepsini tek sayfada topladım:
görev panosu, son tarih geri sayımı, tutanak, WhatsApp duyuru metni, takvim,
yoklama ve faaliyet raporu. Takımımda (ROTA İSAS) yaşadığım sorunlardan çıktı.

> ✍️ *Buraya kendi deneyimini ekle: hangi toplantıda, hangi tarih kaçtı?*

### 2. Neden React ya da başka bir framework kullanmadın?
Üç neden: her satırını anlatabilmek istedim; `index.html`'e çift tıklayınca
çalışsın istedim; ve bu boyutta gerek yoktu. Framework'lerin çözdüğü asıl
sorun ekranla verinin uyumsuz kalması. Ben bunu daha basit bir yolla çözdüm:
her değişiklikten sonra ekranı baştan çiziyorum. Bedelini de biliyorum: büyük
listelerde yavaşlar, ve klavye odağını elle korumam gerekti. 10 ekranı geçen
ya da çok kişinin çalıştığı bir projede framework kullanırdım.

📂 `js/uygulama.js` → `yenile`, `odakTarifi`

### 3. Mimariyi bir dakikada anlat.
Üç katman. En üstte ekranlar: her biri bir dosya, ne gösterileceğini bilir.
Ortada saf mantık fonksiyonları: tarih hesabı, takvim ızgarası, katılım
yüzdesi — ekrana ve veriye dokunmazlar. En altta veri katmanı: beş fonksiyonlu
tek bir arayüz, arkasında localStorage ya da Supabase. Oklar hep aşağı gider:
ekran veri katmanını çağırır, tersi olmaz.

📂 `ARCHITECTURE.md` → 2. bölümdeki şema

### 4. localStorage'dan Supabase'e geçerken neyi değiştirmen gerekti?
Ekran kodunda hiçbir şeyi. Ekranlar `depo.listele`, `depo.ekle` gibi beş
fonksiyonu çağırıyor; arkasında ne olduğunu bilmiyor. Aynı arayüzü uygulayan
ikinci bir depo yazdım, hangisinin kullanılacağını bir ortam değişkeni
seçiyor. Bunun işe yaraması için baştan bir karar vermiştim: localStorage
anında cevap verse de bütün fonksiyonları `async` yaptım, çünkü Supabase ağ
üzerinden çalışıyor. İkisinin aynı davrandığını "sözleşme testi" kanıtlıyor:
aynı senaryo iki depoda da çalışıyor.

📂 `js/veri.js` · `testler/supabase.test.js` → "sözleşme"

> ⚠️ Dürüst ol: Supabase tarafı sahte sunucuyla test edildi. Gerçek projeyle
> kurduysan "kurdum, şu sorunla karşılaştım" de; kurmadıysan "henüz gerçek
> projeyle denemedim" de.

### 5. `data-eylem` ne işe yarıyor? Neden her düğmeye `onclick` yazmadın?
Buna olay delegasyonu deniyor. Her düğmeye ayrı dinleyici eklemek yerine
kapsayıcıya tek dinleyici koyuyorum; tıklanan düğmenin `data-eylem` değerine
bakıp ilgili fonksiyonu çağırıyorum. İki faydası var: ekran baştan çizilince
dinleyiciler kaybolmuyor, ve çift tıklamayı tek yerden engelleyebiliyorum
(bir işlem bitmeden ikincisi başlamıyor).

📂 `js/arayuz.js` → `eylemleriBagla`

---

## B. Veri ve güvenlik

### 6. Kullanıcı bir üye adına `<script>` yazarsa ne olur?
Hiçbir şey; ekranda yazı olarak görünür. Kullanıcıdan gelen her metni HTML'e
koymadan önce `htmlKacis` fonksiyonundan geçiriyorum: `<` işareti `&lt;` oluyor.
Bu saldırının adı XSS. İkinci bir katman olarak yayında İçerik Güvenlik
Politikası başlığı var: sayfa yalnızca kendi dosyalarındaki betikleri
çalıştırabiliyor, o yüzden bir yeri kaçırmış olsam bile dışarıdan betik yüklenemez.

📂 `js/mantik.js` → `htmlKacis` · `netlify.toml` → `Content-Security-Policy`

### 7. Supabase'de bir kullanıcının başka takımın verisini görmesini ne engelliyor?
Uygulama kodu değil, veritabanı. Tarayıcıdaki koda güvenemem; herkes
değiştirebilir. Her tabloda satır düzeyinde güvenlik kuralı var: "bu satırın
takımı, istek atan hesabın üye olduğu bir takım mı?" Kim hangi takımda bilgisi
ayrı bir üyelik tablosunda. Kullanıcı giriş yapınca bir jeton alıyor, her
istekte onu gönderiyorum; veritabanı jetondan kim olduğunu anlıyor.

📂 `supabase/schema.sql` → `uye_mi` fonksiyonu ve 4. bölüm

**Olası devam sorusu:** *"anon anahtar kodda duruyor, bu sorun değil mi?"*
Değil; o anahtar tarayıcıya gitmek üzere tasarlanmış. Veriyi koruyan anahtar
değil, kurallar. Asıl gizli olan `service_role` anahtarı; onu hiçbir dosyaya
koymadım, ayar betiği de yanlışlıkla yazılırsa reddediyor.

### 8. Yedek dosyasını içe aktarırken neye dikkat ettin?
Dışarıdan gelen dosyaya güvenilmez. Her kaydı bir şemaya göre tek tek
denetliyorum: zorunlu alanlar, geçerli tarih, izin verilen değerler. Şemada
olmayan alanları atıyorum. Tek bir bozuk kayıt varsa bütün dosyayı
reddediyorum, yarım yükleme olmasın diye. Bir de içe aktarma hiçbir şeyin
üzerine yazmıyor: aynı kimlikte kayıt varsa atlıyor. Aynı dosyayı iki kez
yüklemek zararsız.

📂 `js/yedek.js` → `yedekCoz`, `kayitTemizle` · `testler/yedek.test.js`

### 9. Tarihleri neden metin olarak tutuyorsun?
`"2026-11-25"` biçiminde. Üç nedeni var: bu biçim alfabetik sıralanınca tarih
sırasına da girmiş oluyor; saat dilimi kayması olmuyor (Date nesnesi gece
yarısı civarında bir gün kaydırabilir); ve `<input type="date">` zaten bu
biçimi veriyor. Gün farkı hesaplarken UTC kullanıyorum, yaz saati geçişinde
bir gün kaymasın diye.

📂 `js/mantik.js` → `gunSayisi`, `kalanGun`

---

## C. Kalite

### 10. Nasıl test ettin? Neyi test etmedin?
146 otomatik test var; Node'un kendi test aracıyla, ek paket kurmadan. Mantık
fonksiyonlarını ve veri katmanını kapsıyor. Supabase ve giriş için sahte
sunucu, jeton süresi için sahte saat kullandım. Test etmediğim şey arayüz:
tıklama, odak, mobil görünüm tarayıcıda elle denendi. Bir sonraki adım
Playwright gibi bir araçla arayüz testi olurdu.

📂 `testler/` · çalıştır: `npm test`

> 🛠️ **Kendin yap:** Bir testi bilerek boz (ör. `aciliyet` içindeki `3`'ü `2`
> yap), `npm test` çalıştır, hangi testin kırıldığını gör. Mülakatta
> "testlerin gerçekten bir şey yakaladığını nereden biliyorsun?" sorusunun cevabı bu.

### 11. Bu projede bulduğun en ilginç hata neydi?
Çift tıklama. "Kaydet"e hızlı iki kez basınca aynı görev iki kez ekleniyordu.
Yerelde fark etmek zor, çünkü kayıt anında bitiyor; ama Supabase'de ağ
gecikmesiyle kolayca olurdu. Çözüm: bir işlem bitmeden ikincisini
başlatmayan bir kilit ve kayıt sürerken pasif olan düğme. Bunu v1'den sonra
yaptığım kod denetiminde buldum; v1 testleri yakalamamıştı çünkü yalnızca
mantığı test ediyordu, arayüzü değil.

📂 `RAPOR.md` → H1 · `js/arayuz.js` → `eylemSuruyor`

> ✍️ *Kendi bulduğun bir hata varsa onu anlat; her zaman daha inandırıcıdır.*

### 12. Erişilebilirlik için ne yaptın?
Üç şey öne çıkıyor. Klavye odağı: ekran baştan çizilince odaktaki düğme yok
oluyordu ve odak sayfanın başına düşüyordu; çizimden önce odaktaki düğmeyi
"tarif edip" sonra aynı düğmeyi bulup odağı geri veriyorum. Kontrast: ana
düğmede beyaz yazı / turuncu zemin 3,1 çıkmıştı, gereken 4,5; rengi
koyulaştırdım ve bunu denetleyen bir test yazdım. Renk dışında ipucu:
takvimde türler kare, daire ve baklava şekilleriyle de ayrılıyor; gecikme
yalnızca kırmızıyla değil "3 gün gecikti" yazısıyla da belirtiliyor.

📂 `RAPOR.md` → 5. bölüm · `testler/kontrast.test.js`

### 13. Service worker ne yapıyor? Hangi stratejiyi seçtin, neden?
Uygulamanın kendi dosyalarını önbelleğe alıyor; internet yokken oradan
veriyor. "Önce ağ, olmazsa önbellek" stratejisini seçtim. Tersi ("önce
önbellek") daha hızlıdır ama kullanıcı eski sürümde takılıp kalabilir; bu
uygulamada güncel olmak hızdan önemli. Supabase isteklerine hiç dokunmuyor.

📂 `sw.js`

---

## D. Düşünme soruları

### 14. İki kişi aynı görevi aynı anda düzenlerse ne olur?
Son kaydeden kazanır, diğerinin değişikliği sessizce kaybolur. Bu bilinen bir
sınır; küçük bir ekipte nadir olur diye kabul ettim. Çözmek isteseydim: her
kayda "son değişiklik zamanı" ekler, güncellerken "bu zaman hâlâ aynıysa
güncelle" derdim; değilse kullanıcıya "bu kayıt değişmiş" diye sorardım
(iyimser kilitleme). Supabase'in anlık güncelleme özelliğiyle ekranı da
canlı tutabilirdim.

### 15. Bugün baştan yazsan neyi farklı yapardın?
> ✍️ *Bu soruyu mutlaka kendin cevapla. Fikir için: ARCHITECTURE.md → 8. bölüm.*

Taslak: ES modülleri kullanırdım, çünkü global fonksiyonlar dosya sırasına
bağımlılık yaratıyor. Arayüz testini en baştan kurardım; en can sıkıcı
hatalar oradaydı. Supabase'i gerçek bir projeyle ilk günden denerdim; sahte
sunucu arayüzü doğrular ama veritabanı kurallarını doğrulamaz.

---

## E. Resmî tutanak, PDF ve Word

### 16. PDF'i nasıl üretiyorsun? Neden bir PDF kütüphanesi kullanmadın?
PDF'i tarayıcının kendi yazdırma motoru üretiyor. Tutanak ekranda HTML olarak
duruyor; yazdırma için ayrı CSS kuralları var: `@page` ile A4 boyutu, sayfa
çerçevesi ve her sayfanın altındaki "… Tutanağı 04 / Sayfa N" yazıları,
`break-inside: avoid` ile de bir kararın iki sayfaya bölünmemesi. Kullanıcı
"PDF indir"e basınca yazdırma penceresi açılır, "PDF olarak kaydet" seçilir.
Kütüphane kullansaydım Türkçe harfler için yazı tipi dosyası gömmem, satır
kırmayı ve sayfalara bölmeyi kendim hesaplamam gerekirdi; tarayıcı bunların
hepsini zaten doğru yapıyor. Bedeli: çıktı tek tıkla inmiyor, araya yazdırma
penceresi giriyor ve sayfa altlığı yalnızca Chromium tabanlı tarayıcılarda
(Chrome, Edge) çıkıyor.

📂 `css/stil.css` ("Resmî tutanak" ve `@page resmi-tutanak`) · `js/tutanak.js > tutanakBelgeHtml, tutanakSayfaCss`

> 🛠️ **Kendin yap:** `break-inside: avoid` satırını geçici olarak sil,
> `npm run test:pdf` çalıştır ve PDF'te sayfa sonundaki kararın nasıl
> bölündüğüne bak. Sonra geri koy.

### 17. .docx dosyasını kütüphanesiz nasıl okuyup yazıyorsun?
Bir .docx aslında bir ZIP arşividir; içinde XML dosyaları vardır. Okurken
arşivin sonundaki dizinden `word/document.xml`'in yerini buluyorum,
sıkıştırılmışsa tarayıcının `DecompressionStream` özelliğiyle açıyorum ve
`<w:t>` etiketlerindeki yazıyı paragraf paragraf topluyorum. Yazarken yedi
küçük XML dosyası üretip bunları sıkıştırmadan arşive koyuyorum; ZIP biçimi
sıkıştırmasız dosyaya izin verir, yalnızca CRC-32 sağlaması hesaplamak
gerekir. Yorumlarla birlikte 400 satırdan az. Kütüphane kullanmadım, çünkü uygulamanın
"bağımlılık yok, internetsiz çalışır" özelliğini bozmak istemedim ve her
satırını anlatabilmek istedim. Sınırı: yalnızca düz yazıyı okur; resim,
dipnot, eski `.doc` biçimi yok.

📂 `js/docx.js` · `testler/docx.test.js`

> 🛠️ **Kendin yap:** İndirdiğin bir tutanağın uzantısını `.zip` yap, aç ve
> `word/document.xml` dosyasına bak. "docx bir ZIP'tir" cümlesini gözünle gör.

### 18. Yapay zekâ olmadan serbest notu forma nasıl yerleştiriyorsun?
Basit kurallarla, satır satır. "Toplantı Tarihi: …" gibi tanıdığım etiketler
ilgili alana gider. "Kararlar:" gibi bir bölüm başlığından sonra gelen
satırlar o bölüme yazılır; "1." ya da "-" ile başlayan satır yeni madde
başlatır, numarasız satır önceki maddenin devamı sayılır. Tarih birkaç
biçimde yazılabilir ("12.03.2026", "12 Mart 2026"). En önemli kural şu:
tanıyamadığım satırı atmıyorum, "yerleştirilemeyen satırlar" kutusunda
gösteriyorum. Kuralların %100 doğru olması gerekmiyor, çünkü sonuç her zaman
düzeltilebilir bir formda açılıyor; ama veri kaybetmemesi gerekiyor.

📂 `js/tutanak.js > notlariAyristir` · `testler/tutanak.test.js`

### 19. Tutanak numarası nasıl artıyor? Devreden kararların atfı nereden geliyor?
Numaranın sonundaki sayıyı bulup bir artırıyorum, baştaki sıfırları koruyorum:
"ROTA/İSAS-2026/04" → "…/05". Biçim bir ayar değil; son tutanağın numarasından
çıkarılıyor. Kullanıcı numarayı elle değiştirirse sonraki tutanaklar yeni
biçimi izler. Devreden kararlar için önceki tutanakların kararları listelenir;
seçilen kararın yanına "ROTA/İSAS-2026/03, Karar 2" atfı kendiliğinden yazılır
(tutanağın numarası + kararın sırası).

📂 `js/tutanak.js > sonrakiTutanakNo, atifMetni, devredenAdaylari`

> 🛠️ **Kendin yap:** `testler/tutanak.test.js` içinde numara ve devreden karar
> testlerini oku; kenar durumları (yıl değişimi, daha önce devredilmiş karar)
> kodda nasıl ele alınmış, kendi cümlenle anlat.

### 20. Bu özelliği eklerken mevcut koda ne kadar dokundun?
Çok az; mimarinin işe yaradığını burada gördüm. Veri katmanına yalnızca
koleksiyon adını ekledim (`tutanaklar`); `listele / ekle / guncelle / sil`
aynen çalıştı, yani localStorage'da da Supabase'de de aynı kod. Yedek şemasına
bir satır, `schema.sql`'e bir tablo ve aynı güvenlik kuralı eklendi. Ekran
kendi dosyasında ve `ekranKaydet` ile menüye kendini ekliyor. Değişen tek
eski fonksiyon `dosyaIndir`: JSON dışında dosya türü de alabilsin diye bir
parametre eklendi.

📂 `js/veri.js > KOLEKSIYONLAR` · `js/yedek.js > YEDEK_SEMASI` · `js/ekranlar/tutanaklar.js`

---

## Mülakattan önce: kendin yap listesi

Bunları yaptıysan yukarıdaki cevapların hepsini kendi deneyiminle verebilirsin.

- [ ] `npm test` çalıştır; bir testi boz, kırıldığını gör, düzelt.
- [ ] Bir üye adına `<b>kalın</b>` yaz; ekranda nasıl göründüğüne bak. Sonra `htmlKacis`'ı oku.
- [ ] Tarayıcıda F12 → Application → Local Storage: verinin nasıl saklandığına bak.
- [ ] Küçük bir özellik ekle (ör. görevlere "öncelik" alanı). Hangi dosyalara
      dokunman gerekti? (İpucu: `gorevler.js`, `yedek.js` şeması, `schema.sql`.)
- [ ] `ayIzgarasi` fonksiyonunu kâğıt üzerinde Şubat 2027 için elle çalıştır.
- [ ] Supabase'i gerçekten kur (`SUPABASE_KURULUM.md`) ve 7. adımdaki güvenlik denemesini yap.
- [ ] Siteyi yayınla (`YAYIN.md`) ve telefonuna "ana ekrana ekle".
- [ ] Ekibinle bir toplantıda gerçekten kullan; README'deki "ROTA İSAS" bölümünü doldur.
- [ ] `RAPOR.md`'yi oku; her bulgunun kodda nasıl düzeltildiğini bul.
- [ ] Resmî tutanak ekranında kendi notlarını yapıştır; hangi satırların yerleşmediğine bak ve `notlariAyristir`'da nedenini bul.
- [ ] `npm run test:pdf` çalıştır, `testler/cikti/ornek-tutanak.pdf` dosyasını aç; referans tutanakla yan yana koyup farkları not et.
