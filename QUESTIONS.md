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

### 6. Ekran görüntüleri
README'de beş ekran görüntüsü için yer ve dosya adları hazır (yorum satırı
olarak). Görüntüleri `docs/ekran/` klasörüne koyup yorumları kaldırman yeterli.
Ben eklemedim; senin gerçek ekranından alınması daha doğru.

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
