# QUESTIONS — Sorular ve yaptığım varsayımlar

Sen yokken durmamak için aşağıdaki kararları kendim verdim. Her biri sonradan
değiştirilebilir. Katılmadığın bir şey varsa söyle. En önemlileri üstte.

---

## A. Senin yapman / karar vermen gerekenler

### 1. Supabase gerçek bir projeyle hiç denenmedi  ⚠️ en önemlisi
Gerçek anahtar istemediğim için:
- `supabase/schema.sql` **hiçbir veritabanında çalıştırılmadı.** Kuralları
  dikkatle yazdım ve okuyarak kontrol ettim, ama SQL'de "çalıştırmadan emin
  olmak" diye bir şey yok. Bir yazım ya da yetki hatası çıkabilir.
- Giriş, jeton yenileme ve veri istekleri **sahte bir sunucuyla** test edildi
  (testlerde ve tarayıcıda). Bu, isteklerin doğru biçimde gittiğini gösterir;
  Supabase'in onlara gerçekten beklediğim cevabı verdiğini göstermez.

**Yapman gereken:** `SUPABASE_KURULUM.md`'yi izle; özellikle **7. Güvenliği
dene** tablosunu atlama. Bir adım takılırsa hata mesajını bana getir.

Yalnızca localStorage ile kullanacaksan bu maddenin hiçbir etkisi yok.

### 2. Netlify'da henüz yayınlanmadı
`netlify.toml`'daki güvenlik başlıklarını yerelde eşdeğer bir sunucuyla
denedim (her şey çalıştı), ama Netlify'ın kendisinde yayın yapılmadı.
**Yapman gereken:** `YAYIN.md` → "Yayın sonrası kontrol".

### 3. Git yazar bilgisi
Bu bilgisayarda genel git kimliği yoktu. Yalnızca **bu depoya özel** olarak
ad = "Ömer", e-posta = Claude hesabındaki adres yaptım.
- GitHub'a göndermeden önce bak: `git log -1 --format="%an <%ae>"`
- Commit'lerin GitHub profilinde görünmesi için e-posta GitHub hesabındakiyle
  aynı olmalı. Yanlışsa göndermeden **önce** söyle; sonradan düzeltmek zahmetli.

### 4. README'ye "yapay zekâ asistanıyla geliştirildi" notu ekledim
README'nin sonuna (TR ve EN) tek cümlelik bir "Nasıl yapıldı?" bölümü koydum;
`MULAKAT.md`'nin başında da bunu nasıl anlatabileceğine dair bir not var.
Commit'lerde zaten `Co-Authored-By` satırı bulunduğu için açık olmanın daha
iyi duracağını düşündüm. **Bu senin kararın;** istemezsen README'deki o bölümü sil.

### 5. "ROTA İSAS ekibinde kullanıldı" bölümü boş
Ekip gerçekten kullandıktan sonra sen dolduracaksın. Uydurma bir şey yazmadım.

### 6. Ekran görüntüleri (eklendi; istersen değiştir)
README'ye örnek veriyle alınmış beş görüntü koydum (`docs/ekran/`). Toplantı
tutanağının ve kendi takımının görüntüsünü eklemek istersen aynı klasöre koy.

### 7. İkinci turda bir test dosyası indirildi
Yedek indirmeyi denerken tarayıcı `takim-asistani-yedek-2026-11-16.json` adlı,
örnek veriyi içeren bir dosyayı İndirilenler klasörüne kaydetmiş olabilir.
İçinde gerçek veri yok; silebilirsin.

---

## B. Bu turda kendim karar verdiklerim

### 8. Yoklama için ayrı ekran yok
Toplantı ve etkinlik formundaki "katılanlar" listesi yoklamanın kendisi;
yüzdeler Takım ekranında. Aynı bilgiyi iki kez girdirmemek için.
**Sayım kuralı:** tarihi geçmiş (ya da bugün) ve en az bir kişi işaretlenmiş
buluşmalar sayılır. Yan etkisi: takıma sonradan katılan biri, katılmadan
önceki toplantılarda "yok" sayılır. Düzeltmek için üyeye "katılma tarihi"
eklemek gerekirdi; kapsamı büyütmemek için yapmadım.

### 9. Supabase için giriş (e-posta + şifre) eklendi
"Kullanıcı sadece kendi takımını görsün" kuralı giriş olmadan uygulanamaz;
veritabanının kimin istek attığını bilmesi gerekir. Bu yüzden istenmemiş olsa
da gerekliydi. localStorage kullanılırken giriş ekranı hiç çıkmaz.
- E-posta, uygulama tablolarında **tutulmaz**; Supabase'in kendi hesap
  tablosunda durur. Uygulama verisinde hâlâ yalnızca ad ve rol var.
- "Şifremi unuttum" akışı yok (Supabase panelinden gönderilebilir).

### 10. Takıma katılma: davet kodu
Başka bir hesabı takıma almanın en basit yolu olarak seçtim. Kod Takım
ekranında görünür. Sınırı: kod değiştirilemez; sızarsa yeni takım açıp veriyi
yedekle taşımak gerekir.

### 11. Takım içinde yetki ayrımı yok
Her üye her şeyi yapabilir (silme dahil). "Kaptan" yalnızca kadroda görünen
bir etiket. Rol bazlı yetki ayrı bir özellik olurdu.

### 12. İçe aktarma hiçbir şeyin üzerine yazmaz
Yedekteki bir kayıt depoda zaten varsa atlanır. Yani yedek, eksikleri
tamamlar; "eski hâline döndür" yapmaz. Bilerek: yanlışlıkla veri ezmek,
eksik geri yüklemekten çok daha kötü.

### 13. Yalnızca Netlify yapılandırıldı
"Vercel veya Netlify" dendiği için birini seçtim. Vercel ve GitHub Pages için
`YAYIN.md`'de kısa notlar var ama dosyaları hazır değil.

### 14. Faaliyet raporu bir "taslak"
Etkinlik listesi, sayılar ve açıklamalardan oluşur; düzenlenebilir bir belge
değil, yazdırılır/PDF alınır. Resmi bir şablondan kopyalanmadı.

### 15. `js/ayarlar.js` yokken konsolda 404 görünür (bilerek bırakıldı)
Dosya gizli ayarlar için `.gitignore`'da olduğundan depoda yok. Bir kez
`node araclar/env-aktar.js` çalıştırınca oluşur ve 404 kaybolur. Yayında her
zaman üretilir.

---

## B2. Resmî tutanak özelliğinde (4. tur) verdiğim kararlar

### 16. Referans PDF'i bulamadım  ⚠️ senden bir şey bekliyor
`referans/_SAS_Akademi_Toplant__Tutana___4.pdf` dosyası proje klasöründe yoktu
(`referans/` klasörü de yoktu). Düzeni, isteğinde yazdığın biçim tarifine göre
kurdum; **referansla yan yana karşılaştırma yapılmadı.** Yapman gereken: PDF'i
`referans/` klasörüne koy (klasör `.gitignore`'da, depoya girmez),
`npm run test:pdf` çıktısıyla yan yana aç. Fark görürsen (yazı boyutu,
boşluklar, tablo çizgileri, imza bölümü) söyle; hepsi `css/stil.css` içindeki
"Resmî tutanak" bölümünde ve kolay ayarlanır.

### 17. "PDF indir" yazdırma penceresini açıyor
PDF'i tarayıcının yazdırma motoru üretiyor; düğmeye basınca yazdırma penceresi
açılır, hedef olarak "PDF olarak kaydet" seçilir. Tek tıkla dosya inmesi için
bir PDF kütüphanesi ve Türkçe harfli bir yazı tipi dosyası indirmem gerekirdi;
iznin olmadan indirmedim. Bu yolun iyi yanı: Türkçe harfler, sayfalara bölme
ve "karar bölünmesin" kuralı tarayıcı tarafından doğru yapılıyor.
- Sayfa çerçevesi ve alttaki "… Tutanağı 04 / Sayfa N" yazısı **Chrome ve
  Edge'de** çalışır (sürüm 131+; Edge ile denendi). Firefox ve Safari'de
  denemedim; orada sayfa altlığı büyük olasılıkla çıkmaz. Tutanağı
  Chrome/Edge'de yazdır.
- Yazdırma penceresinde "Üst bilgi ve alt bilgiler" işaretliyse sayfanın
  üstüne tarih ve başlık basılır (alt kısım bozulmaz); kutuyu kaldır. Ekranda
  da hatırlatılıyor.

### 18. .docx için hazır kütüphane kullanmadım
İstekte "tarayıcıda çalışan bir kütüphane kullan, dosyasını yerelde tut"
deniyordu. Kütüphaneyi internetten indirmem gerekirdi. Onun yerine okuma ve
yazmayı kendim yazdım (`js/docx.js`, 400 satırdan az): docx bir ZIP'tir, içindeki
XML'den yazıyı çıkarmak yeterli. Sonuç istediğin şeyi karşılıyor (CDN yok,
internetsiz çalışır) ve mülakatta her satırını anlatabilirsin. Sınırı: yalnızca
düz yazı ve basit tablolar okunur; eski `.doc` okunmaz (anlaşılır hata verir).
Kütüphane istersen (ör. mammoth.js) söyle, yalnızca `docxOku` değişir.

### 19. İki ayrı "tutanak" var
Mevcut **Toplantı** ekranındaki tutanak ekip içi hızlı not ve görev takibi
için; yeni **Tutanak** ekranındaki ise imzaya gidecek resmî belge. "Başka
özellik ekleme" dediğin için ikisini birbirine bağlamadım (ör. toplantıdan
resmî tutanak üretme yok). İstersen küçük bir sonraki adım olur.

### 20. Numara biçimi ayar değil, son tutanaktan çıkarılıyor
"Biçim ayarlanabilir olsun" isteğini şöyle karşıladım: numara alanı serbest
yazıdır; yeni tutanak, son tutanağın numarasındaki son sayıyı bir artırır.
Biçimi bir kez elle değiştirmen yeter, sonrakiler onu izler. İlk tutanak
"ROTA/İSAS-<yıl>/01" ile başlar. Alt başlık ("… Dördüncü Toplantı") ve sayfa
altlığı da numarayla birlikte güncellenir.

### 21. Serbest notta numarasız satır önceki maddeye eklenir
Bir bölümün içinde numaralı satırlar varsa, numarasız satır "önceki maddenin
devamı" sayılır (uzun kararlar alt satıra taşabildiği için). Bu yüzden bölümün
sonuna yazılmış alakasız bir satır son maddeye yapışabilir; formda elle
düzeltilir.

### 22. Örnek veride resmî tutanak yok
"Örnek veriyle dene" takımına resmî tutanak eklemedim (kapsam dışı sayıp
dokunmadım). Uydurma örnek tutanak yalnızca testte: `testler/ornek-tutanak.js`.

### 23. Git geçmişi yeni klasöre elle taşındı
Proje `Documents` altına taşınırken `.git` klasörü gelmemişti; eski çalışma
klasöründen kopyaladım. Geçmiş tam (ilk commit'ten bugüne).

---

## B3. Kişiler ve WhatsApp (5. tur) kararları

### 24. Referans dosyalarını masaüstünden kopyaladım
`referans/` klasörü proje klasöründe yoktu. Aynı adlı dosyaları masaüstündeki
"ROTA İSAS TOPLANTI KARARLARI" klasöründe buldum ve yalnızca okuyup
`referans/` içine kopyaladım (klasör `.gitignore`'da, depoya girmedi; kaynak
dosyalara dokunulmadı). İstemezsen `referans/` klasörünü silebilirsin.

### 25. "Kişisel veri: sadece ad ve rol" kuralı bu özellikte genişledi
İlk turdaki kural yalnızca ad ve rol tutmaktı. Bu özellik için senin isteğinle
telefon numarası da tutuluyor. Önlemler: kişiler ayrı tabloda, Supabase'de
yalnızca takım üyeleri görür (RLS), demo ve testlerde gerçek numara yok,
ekranda "kişisel veridir" uyarısı var.

### 26. Yalnızca Türkiye cep numaraları kabul ediliyor
WhatsApp için cep numarası gerekir; `90 5xx …` dışındakiler (sabit hat,
yabancı numara) "geçersiz" sayılıp içe aktarmada listelenir. Yabancı numara
gerekirse kural `js/kisiler.js > telefonNormallestir` içinde genişletilir.

### 27. Uydurma numaralar "0500 000 00 xx"
Türkiye'de kurgu için ayrılmış bir numara aralığı yok. 0500 öneki bilgim
dahilinde hiçbir operatöre verilmemiş; demo ve testlerde bu aralığı kullandım.
Yine de bu numaralara gerçek mesaj gönderme.

### 28. Hitap adı tahmini: adın ilk sözcüğü
İçe aktarmada hitap adı yoksa adın ilk sözcüğü alınır ("Ece Nur Demir" →
"Ece"). İki adlı kişilerde formdan düzeltilir. Kabul mesajları dosyasında
hitap adı (`ilk`) zaten var, o kullanılır.

### 29. "Gönderildi" işareti tıklamayla konuyor
"WhatsApp'ta aç"a basmak mesajın gerçekten gönderildiğini kanıtlamaz
(WhatsApp'ta vazgeçilebilir). Referans sayfa da böyle çalışıyordu; işaret elle
kaldırılabilir.

### 30. Duyuru ekranı yerinde kaldı
Eski **Duyuru** ekranı (toplantıdan özet metni üretme) aynen duruyor; yeni
**Mesajlar** ekranı kişiye özel gönderim için. İkisini birleştirmedim
(kapsamı aşmamak için).

### 31. Yerel kipte giriş yok
"Uygulama giriş gerektirsin" isteğini Supabase kipinde uyguladım (giriş
zorunlu, kayıt davetli). Yerel kipte (localStorage) giriş eklemedim: veri
sunucuya hiç gitmez, yalnızca o tarayıcıda durur; tarayıcıda tutulan bir
şifre gerçek koruma sağlamazdı (kod ve veri aynı yerde). Ekibin gerçek
rehberi için Supabase kipi öneriliyor (YAYIN.md'de not var). İstersen yerel
kipte Kişiler/Mesajlar ekranlarını tamamen kapatabilirim.

### 32. Davetli kayıt için auth.users tetikleyicisi seçtim
Supabase'de iki yol var: (a) `auth.users` tablosuna tetikleyici, (b) panelden
"Before User Created" Auth Hook. (a)'yı seçtim çünkü tamamı `schema.sql`
içinde, tek dosyayla kurulur ve panelde ayar gerektirmez. Bedeli: davetsiz
kayıtta Supabase tetikleyicinin mesajını (`KAYIT_DAVETLI_DEGIL`) döner (gerçek projede denendi; bazı sürümler genel "Database error saving new user" mesajını döndürebilir, ikisi de karşılanıyor);
uygulama bunu "davet listesinde yok" olarak çevirir.
mesaj farklı gelirse `js/oturum.js > OTURUM_HATALARI`'na eklenir.
Alternatif olarak panelde **Allow new users to sign up** tamamen kapatılıp
kullanıcılar panelden "Invite user" ile davet edilebilir; o zaman uygulamadaki
"Yeni hesap aç" düğmesi çalışmaz.

### 33. Rol değiştirme yalnızca SQL ile
Birini yönetici yapmak ya da yöneticiliği almak için arayüz yok (SQL Editor'da
tek satır; SUPABASE_KURULUM.md 6. adım). Yanlışlıkla bütün yöneticilerin
yetkisini almak gibi kazalar olmasın diye bilerek basit bıraktım.

### 34. Vercel yapılandırması yazıldı ama denenmedi
`vercel.json` Netlify ile aynı başlıkları gönderir (test ediliyor). Vercel'in
`installCommand: ""` ve `framework: null` ayarlarıyla düz klasörü yayınlaması
beklenir; ilk yayında YAYIN.md'deki kontrol listesini uygula.

---

## C. v1'de verilen kararlar (hâlâ geçerli)

- **Klasik `<script>`**, ES modülü değil: çift tıklayınca çalışsın diye.
- **Birden fazla takım** desteklenir; sağ üstten seçilir.
- **Görev taşıma ◀ ▶ düğmeleriyle;** sürükle-bırak yok.
- **Gündem ve kararlar "her satıra bir madde".**
- **Son tarihlerde "Tamamlandı" işareti** (listede yoktu, eklendi).
- **"Örnek veriyle dene" düğmesi;** adlar uydurmadır.
- **Tarihler metin** (`"2026-11-25"`), veritabanında da.
- **Duyuruda "WhatsApp'ta aç" bağlantısı yok;** yalnızca "Kopyala".

---

## D. Yapmadıklarım / sonraki adım fikirleri

- Otomatik arayüz testi (ör. Playwright). En değerli sonraki adım bu olurdu.
- `schema.sql` için gerçek PostgreSQL üzerinde otomatik güvenlik testi.
  (Bunun için bir paket indirmem gerekirdi; iznin olmadan indirmedim.)
- Takvimde ok tuşlarıyla gezinme (şimdilik Tab ile).
- Aynı anda düzenlemede çakışma uyarısı.
- Rol bazlı yetki, şifre sıfırlama, davet kodunu yenileme.
- Supabase kipinde çevrimdışıyken veri gösterme.
