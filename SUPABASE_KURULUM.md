# Supabase kurulumu — adım adım

Bu rehber, Seyir'i (takım asistanı) tarayıcıdaki kayıttan (localStorage) çıkarıp
ekibin **ortak** kullandığı bir veritabanına bağlar. Yaklaşık 20 dakika sürer.
Ücretsiz Supabase planı yeterlidir.

> **Önce şunu bil:** Bu kurulum henüz **gerçek bir Supabase projesiyle
> denenmedi.** Kod ve şema, Supabase'in belgelerindeki davranışa göre yazıldı
> ve sahte bir sunucuyla test edildi. İlk kurulumu yaparken bir adım burada
> yazdığı gibi çıkmazsa (özellikle 3. ve 7. adım) hata mesajını not al;
> büyük olasılıkla küçük bir düzeltme gerekir. Bkz. en alttaki "Sorun giderme".

**Gerekmeyebilir:** Uygulamayı tek başına ya da tek cihazda kullanacaksan bu
kuruluma ihtiyacın yok. Hiçbir şey yapmadan localStorage ile çalışır.

---

## Ne kuruyoruz?

```
Tarayıcı (uygulama)  ──giriş──►  Supabase Auth      (kim olduğunu doğrular, jeton verir)
        │
        └──jeton + istek──►  Supabase veritabanı    (jetona bakar, yalnızca
                                                     üyesi olduğun takımın
                                                     satırlarını döner)
```

Güvenliği uygulama değil **veritabanı** sağlar. Tarayıcıdaki kod değiştirilse
bile başka takımın verisi dönmez (`supabase/schema.sql` içindeki RLS kuralları).

Rehberde telefon numaraları olduğu için üç kat koruma var:

1. **Giriş yapmayan hiçbir şey göremez** (anon rolüne hiçbir tablo açık değil).
2. **Giriş yapan yalnızca kendi takımını görür** (her tabloda RLS kuralı).
3. **Herkes hesap açamaz:** ilk hesap yönetici olur; sonrakiler yalnızca
   yöneticinin davet listesine eklediği e-postayla hesap açabilir. Bu kontrol
   de veritabanında (`auth.users` tetikleyicisi); uygulamayı atlayıp doğrudan
   Supabase'e kayıt isteği atmak da işe yaramaz.

---

## 1. Supabase projesi aç

1. <https://supabase.com> adresinde hesap aç, **New project** de.
2. Proje adı: `seyir` (ne istersen; uygulama bu adı kullanmaz).
3. **Database password**: güçlü bir şifre üret ve bir şifre yöneticisine kaydet.
   Bu şifre uygulamada **kullanılmaz**; yalnızca veritabanına doğrudan
   bağlanmak istersen gerekir.
4. Region: sana en yakın olan (ör. Frankfurt).
5. Projenin hazırlanmasını bekle (1–2 dakika).

## 2. Tabloları ve güvenlik kurallarını kur

1. Sol menüden **SQL Editor** → **New query**.
2. Bu depodaki [supabase/schema.sql](supabase/schema.sql) dosyasının
   **tamamını** kopyalayıp yapıştır.
3. **Run**. "Success. No rows returned" görmelisin.
4. Sol menüden **Table Editor**'a bak: 13 tablo olmalı — `takimlar`,
   `takim_uyelikleri`, `uyeler`, `gorevler`, `son_tarihler`, `toplantilar`,
   `etkinlikler`, `tutanaklar`, `kisiler`, `sablonlar`, `kampanyalar`,
   `profiller`, `izinli_epostalar`. Her birinin yanında RLS'in **açık**
   olduğu yazmalı.
5. **Database → Triggers** (ya da Table Editor'da şema olarak `auth` seç →
   `users`): `kayit_kapisi` ve `yeni_hesap` tetikleyicileri görünmeli.

> Bu dosyayı daha önce (davet sistemi yokken) çalıştırdıysan ve zaten
> hesaplar varsa: dosya en eski hesabı yönetici yapar, diğerlerini üye.

> **Var olan bir projeyi güncelliyorsan** (Kasım 2026'dan önce kurulduysa):
> [supabase/guncelleme-surum.sql](supabase/guncelleme-surum.sql) dosyasını da bir
> kez çalıştır. Her tabloya `surum` sütunu ekler; "aynı anda düzenleme"
> uyarısı bununla çalışır. Çalıştırmazsan uygulama yine çalışır, yalnızca
> bu uyarı çıkmaz. Yeni kurulumda gerekmez (`schema.sql` içinde var).
>
> Aynı şekilde, bu sırayla:
> - [supabase/guncelleme-kurum.sql](supabase/guncelleme-kurum.sql): kurum ayarları (tür, logo, renk, tutanak bilgileri, sekmeler).
> - [supabase/guncelleme-roller.sql](supabase/guncelleme-roller.sql): roller ve yetkiler. Çalıştırınca kimsenin
>   yetkisi değişmez; yönetici uygulamada rolleri kurunca sekme yetkileri devreye girer. Takım adını ve kurum
>   ayarlarını artık yalnızca takım yöneticisi (takımı kuran, kurulum yöneticisi ya da yönetici yapılan) değiştirir.
> - [supabase/guncelleme-paydaslar.sql](supabase/guncelleme-paydaslar.sql): Sponsorlar / Müşteriler sekmesi (rollerden sonra çalıştır).

Dosya tekrar çalıştırılabilir; var olan veriyi silmez.

## 3. Giriş ayarları

Sol menü → **Authentication** → **Sign In / Providers** (ya da *Providers*) → **Email**:

- **Email** sağlayıcısı açık olmalı (varsayılan açıktır).
- **Confirm email** ayarı için iki seçenek var:
  - **Açık (önerilen):** hesap açan kişi e-postasına gelen bağlantıya tıklar,
    sonra giriş yapar. Başkasının e-postasıyla hesap açılamaz.
  - **Kapalı:** hesap açılır açılmaz giriş yapılır. Küçük ekip için pratik ama
    e-posta doğrulanmaz.
- Açık bırakırsan: **Authentication → URL Configuration → Site URL** alanına
  uygulamanın adresini yaz (yayınladıktan sonra, ör. `https://takimin.netlify.app`).
  Onay bağlantısı buraya yönlendirir.

> Ücretsiz planda Supabase'in kendi e-posta gönderimi saatte birkaç e-postayla
> sınırlıdır. Ekip aynı anda hesap açacaksa "Confirm email"i geçici olarak
> kapatabilir ya da herkes birkaç dakika arayla kayıt olabilir.

## 4. Adresi ve anahtarı al

Sol altta **Project Settings** → **API** (ya da **API Keys**):

- **Project URL** → `https://xxxxxxxx.supabase.co`
- **anon / public** anahtar (yeni panelde adı **publishable** olabilir)

> ⚠️ **`service_role` / `secret` anahtarını ASLA kullanma.** O anahtar bütün
> güvenlik kurallarını devre dışı bırakır. Tarayıcıya giden her şey herkes
> tarafından görülebilir. `araclar/env-aktar.js` bu anahtarı tanırsa reddeder.
>
> `anon` anahtar ise gizli değildir; tarayıcıya gitmek üzere tasarlanmıştır.
> Veriyi koruyan anahtar değil, 2. adımda kurduğun kurallardır.

## 5. Uygulamayı Supabase'e bağla (kendi bilgisayarında)

1. `.env.example` dosyasını `.env` adıyla kopyala.
2. `.env` içini doldur:

   ```
   VERI_KATMANI=supabase
   SUPABASE_URL=https://xxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=...anon anahtar...
   ```

3. Ayar dosyasını üret:

   ```bash
   node araclar/env-aktar.js
   ```

   `js/ayarlar.js yazıldı. Veri katmanı: supabase` görmelisin.
4. Uygulamayı yerel sunucuyla aç (çift tıklayarak değil; giriş için adres gerekir):

   ```bash
   python -m http.server 8765
   ```

   Tarayıcıda `http://localhost:8765/uygulama.html` → **Giriş yap** ekranı çıkmalı.

`.env` ve `js/ayarlar.js` depoya girmez (`.gitignore`). Yerel kayda dönmek
için `.env` içinde `VERI_KATMANI=yerel` yapıp betiği yeniden çalıştır.

## 6. İlk hesap (yönetici), takım ve davetler

1. **Yeni hesap aç** ile e-posta ve şifre gir (şifre en az 8 karakter).
   "Confirm email" açıksa e-postandaki bağlantıya tıkla, sonra **Giriş yap**.
   **Bu ilk hesap kendiliğinden yönetici olur.** Bu adımı başkasından önce sen yap.
2. Takımını oluştur. Takımı oluşturan hesap otomatik olarak o takıma erişir.
3. **Ayarlar → Erişim** bölümünde takım arkadaşlarının e-postalarını ekle.
   "… takımına da üye olsun" kutusu işaretliyse hesap açtıklarında takıma
   kendiliğinden girerler.
4. Arkadaşların uygulamayı açar → **Yeni hesap aç** → davet edilen e-postayla
   kayıt olur. Listede olmayan e-postayla denerse "davet listesinde yok" der.
5. Davet kodu hâlâ çalışır (**Takım** ekranı): hesabı olan biri başka bir
   takıma kodla katılabilir. Ama hesap açmak için önce davet gerekir.

Başka birini yönetici yapmak: SQL Editor →
`update profiller set rol = 'yonetici' where eposta = 'ornek@ornek.com';`

**Eski verini taşımak için:** `VERI_KATMANI=yerel` iken **Ayarlar → Yedeği
indir**; sonra Supabase'e geçip giriş yap ve **Ayarlar → Yedekten yükle**.

## 7. Güvenliği dene (5 dakika, atlama)

Kuralların gerçekten çalıştığını kendi gözünle gör. İki hesap gerekir
(ikincisi için başka bir e-posta ya da `adin+test@gmail.com` biçimi).

| # | Yap | Beklenen |
|---|-----|----------|
| 1 | A hesabıyla giriş yap, "Takım A" oluştur, bir görev ekle. | Görev görünür. |
| 2 | Çıkış yap. B hesabıyla giriş yap. | **Hiç takım görünmez**; "Hoş geldin" ekranı çıkar. |
| 3 | B ile "Davet koduyla katıl" → yanlış bir kod yaz. | "Davet kodu geçersiz". |
| 4 | B ile doğru kodu yaz. | "Takım A" ve görevi görünür. |
| 5 | Gizli pencerede, **giriş yapmadan** şu adresi aç: `https://xxxxxxxx.supabase.co/rest/v1/kisiler?apikey=ANON_ANAHTARIN` | Boş liste `[]` ya da "permission denied". **Numara görünmemeli.** (Aynısını `gorevler` için de dene.) |
| 6 | Davet listesinde olmayan bir e-postayla **Yeni hesap aç**. | "Bu e-posta davet listesinde yok" — Supabase → Authentication → Users'ta bu e-posta **yok**. |
| 7 | Yönetici olarak Ayarlar → Erişim'den o e-postayı ekle, tekrar dene. | Hesap açılır. |
| 8 | Yönetici olmayan (B) hesapla Ayarlar'a bak. | Erişim bölümünde yalnızca "Rolün: Üye" yazar; davet listesi görünmez. |

5\. ve 6. adımlar en önemlisi: giriş yapmayan biri anon anahtarı bilse bile
veri alamamalı; davetsiz biri hesap açamamalı. Liste geliyorsa ya da hesap
açılıyorsa 2. adımı (schema.sql) yeniden çalıştır, Table Editor'da RLS'in
açık olduğunu ve tetikleyicilerin kurulduğunu kontrol et.

## 8. Yayına al

Bkz. [YAYIN.md](YAYIN.md). Özet: aynı üç değişkeni Netlify paneline yazarsın;
`.env` dosyasını hiçbir yere yüklemezsin.

---

## Sorun giderme

| Belirti | Olası neden | Çözüm |
|---------|-------------|-------|
| Giriş ekranı yerine eski veriler geliyor | `js/ayarlar.js` üretilmedi ya da tarayıcı eski dosyayı kullanıyor | `node araclar/env-aktar.js`, sonra Ctrl+Shift+R |
| "Ayarlar hatalı (js/ayarlar.js)" | `VERI_KATMANI=supabase` ama adres/anahtar eksik | `.env`'i kontrol et, betiği yeniden çalıştır |
| "E-posta adresin henüz onaylanmamış" | "Confirm email" açık | E-postadaki bağlantıya tıkla (spam klasörüne bak) |
| Hesap açınca e-posta gelmiyor | Ücretsiz planın e-posta sınırı | Birkaç dakika bekle ya da 3. adımdaki ayarı geçici kapat |
| "Supabase hatası (401)" | Anahtar yanlış ya da oturum bozuk | Anahtarı yeniden kopyala; Ayarlar → Çıkış yap → yeniden gir |
| "Supabase hatası (403)" / "permission denied" | schema.sql'in yetki bölümü çalışmadı | Dosyanın tamamını yeniden çalıştır |
| "Supabase hatası (404)" tablo bulunamadı | Tablolar kurulmamış | 2. adım |
| Takım oluşturunca "row-level security" hatası | `takimlar` kuralları eksik | schema.sql'i yeniden çalıştır; hata sürerse mesajı not al |
| "column ... does not exist" | Şema eski sürümden kalma | schema.sql'in güncel hâlini çalıştır |
| Kayıt eklenirken "new row violates check constraint" | Beklenmeyen bir değer (ör. 200 karakterden uzun başlık) | Hata mesajındaki sütuna bak |
| "Bu e-posta davet listesinde yok" | Kayıt kapısı çalışıyor (beklenen) | Yönetici Ayarlar → Erişim'den e-postayı eklesin |
| Herkes hâlâ hesap açabiliyor | Tetikleyiciler kurulmamış | schema.sql'in tamamını yeniden çalıştır; 2. adım → 5'teki kontrol |
| Ayarlar → Erişim "Rol bilgisi alınamadı" | `rolum` fonksiyonu yok (eski şema) | schema.sql'i yeniden çalıştır |

Hata mesajının tamamı tarayıcıda **F12 → Console** sekmesinde görünür.

## Bilinen sınırlar

- Takımın her üyesi o takımda her şeyi yapabilir (silme dahil). "Kaptan"
  yalnızca kadroda görünen bir etikettir. "Yönetici"nin tek ayrıcalığı davet
  listesidir; o da yalnızca üyesi olduğu takımların verisini görür.
- Davet listesinden çıkarmak açılmış hesabı silmez (Authentication → Users).
- Davet kodu değiştirilemez. Kod sızarsa: verinin yedeğini al, yeni takım
  oluştur, yedeği oraya yükle.
- Şifremi unuttum akışı yok. Şimdilik: Supabase paneli → Authentication →
  Users → kullanıcı → "Send password recovery".
- Jeton tarayıcıda (localStorage) durur; Supabase'in kendi kütüphanesi de
  böyle yapar. Ortak bilgisayarda işin bitince **Ayarlar → Çıkış yap**.
