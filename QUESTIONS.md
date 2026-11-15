# QUESTIONS — Sorular ve yaptığım varsayımlar

Ömer uyurken durmamak için aşağıdaki kararları kendim verdim. Her biri
sonradan değiştirilebilir. Katılmadığın bir şey varsa söyle. En önemlileri
üstte.

## Karar bekleyenler (bakmanı istediklerim)

### 1. Supabase'de giriş yok → veri herkese açık
v1'de kullanıcı hesabı/giriş yok (istenmedi, kapsamı büyütürdü). Bu yüzden
`supabase/sema.sql` içindeki erişim kuralları anon anahtarına sahip **herkese
okuma ve yazma** izni veriyor. Site adresini bilen biri veriyi görebilir ve
değiştirebilir.
- **Varsayımım:** Küçük, kapalı bir ekip ve "sadece ad + rol" verisi için v1'de
  kabul edilebilir. Uyarı SQL dosyasında ve README'de yazıyor.
- **Sorum:** Uygulamayı herkese açık bir adreste Supabase ile yayınlayacak
  mısın? Öyleyse önce giriş (Supabase Auth) eklenmeli. Sadece localStorage ile
  kullanacaksan sorun yok.

### 2. Supabase sürümü gerçek bir projeyle denenmedi
Gerçek anahtar istemediğim için Supabase deposunu yalnızca **sahte sunucuyla**
test ettim (`testler/supabase.test.js`): istek adresleri, başlıklar ve yerel
depoyla aynı davranış doğrulandı. Gerçek Supabase projesinde `sema.sql`'i
çalıştırıp bir kez elle denemen gerekiyor. Adımlar README'de.

### 3. Git yazar bilgisi
Bu bilgisayarda genel (global) git kimliği tanımlı değildi. Global ayara
dokunmadım; sadece **bu depoya özel** olarak ad = "Ömer", e-posta = Claude
hesabındaki e-posta adresi yaptım.
- GitHub'a göndermeden önce kontrol et: `git config user.name` ve `git config user.email`
- Commit'lerin GitHub profilinde görünmesi için e-posta GitHub hesabındakiyle
  aynı olmalı. Yanlışsa, göndermeden önce söyle; düzeltmesi kolay.

### 4. "ROTA İSAS ekibinde kullanıldı" notu
README'de bu bölüm boş bırakıldı. Ekip gerçekten kullandıktan sonra sen
dolduracaksın (ne zaman, kaç kişi, ne işe yaradı). Ben uydurma bir şey yazmadım.

## Kendim karar verdiklerim (bilgin olsun)

### 5. Anahtarlar tarayıcıya nasıl ulaşıyor?
Tarayıcı `.env` okuyamaz ve derleme adımı istenmedi. Çözüm: `.env` →
`node araclar/env-aktar.js` → `js/ayarlar.js` (gitignore'da). Uygulama açılırken
bu dosyayı arar; yoksa localStorage ile çalışır. Dosya yokken tarayıcı
konsolunda bir "404 js/ayarlar.js" satırı görünür; bu beklenen bir durumdur.

### 6. ES modülü yerine klasik `<script>`
`index.html` çift tıklanınca (file://) da çalışsın diye. ES modülleri dosyadan
açılınca tarayıcı tarafından engellenir ve sunucu gerektirir. Bedeli:
fonksiyonlar global; dosya sırası `index.html`'de önemli.

### 7. Birden fazla takım
"Takım oluştur" dendiği için birden fazla takım destekleniyor; sağ üstten
seçilir. Seçili takım tarayıcıda hatırlanır.

### 8. Görevleri taşımak: sürükle-bırak yok, ◀ ▶ düğmeleri var
Telefonda daha kullanışlı, kod daha kısa. İstenirse sonra eklenebilir.

### 9. Gündem/kararlar "her satıra bir madde"
Madde madde ekleme düğmeleri yerine tek metin kutusu. Toplantı sırasında hızlı
yazmaya uygun.

### 10. Son tarihlerde "Tamamlandı" işareti
Listede yoktu ama teslim edilmiş bir raporun sonsuza kadar "gecikti" görünmesi
yanıltıcı olurdu. Küçük bir ekleme.

### 11. "Örnek veriyle dene" düğmesi
İlk açılışta uygulamayı dolu görmek ve mülakatta göstermek için hayali bir
takım yükler. Adlar uydurmadır. Yüklenen takım "Takım" ekranından silinebilir.

### 12. Tarihler veritabanında metin
`"2026-11-25"` biçiminde metin olarak tutuluyor (Supabase'de de `text`).
Boş tarih sorun çıkarmıyor, sıralama doğru çalışıyor, saat dilimi hatası olmuyor.

### 13. Duyuruda "WhatsApp'ta aç" bağlantısı yok
Sadece "Kopyala" var. Metni bağlantıya koymak, üye adlarını adres çubuğuna
taşımak demek olurdu; gerek görmedim.

## v2 için fikirler (yapmadım)
- Faaliyet raporu, yoklama (zaten v2 olarak belirtilmişti)
- Giriş sistemi ve takım bazlı erişim kuralları
- Verileri JSON olarak yedekle / geri yükle (localStorage silinirse veri gider)
- Sürükle-bırak, karanlık tema
