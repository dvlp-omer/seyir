# Supabase kurulumu — adım adım

Bu rehber, Takım Asistanı'nı tarayıcıdaki kayıttan (localStorage) çıkarıp
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

---

## 1. Supabase projesi aç

1. <https://supabase.com> adresinde hesap aç, **New project** de.
2. Proje adı: `takim-asistani` (ne istersen).
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
4. Sol menüden **Table Editor**'a bak: 8 tablo olmalı — `takimlar`,
   `takim_uyelikleri`, `uyeler`, `gorevler`, `son_tarihler`, `toplantilar`,
   `etkinlikler`, `tutanaklar`. Her birinin yanında RLS'in **açık** olduğu yazmalı.

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

   Tarayıcıda `http://localhost:8765` → **Giriş yap** ekranı çıkmalı.

`.env` ve `js/ayarlar.js` depoya girmez (`.gitignore`). Yerel kayda dönmek
için `.env` içinde `VERI_KATMANI=yerel` yapıp betiği yeniden çalıştır.

## 6. İlk hesap ve takım

1. **Yeni hesap aç** ile e-posta ve şifre gir (şifre en az 8 karakter).
   "Confirm email" açıksa e-postandaki bağlantıya tıkla, sonra **Giriş yap**.
2. Takımını oluştur. Takımı oluşturan hesap otomatik olarak o takıma erişir.
3. **Takım** ekranında **Davet kodu** görünür. Takım arkadaşlarına bu kodu ver.
4. Arkadaşların: hesap açar → **Davet koduyla katıl** → kodu yazar.

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
| 5 | Gizli pencerede, **giriş yapmadan** şu adresi aç: `https://xxxxxxxx.supabase.co/rest/v1/gorevler?apikey=ANON_ANAHTARIN` | Boş liste `[]` ya da "permission denied". **Görev görünmemeli.** |

5\. adım en önemlisi: giriş yapmayan biri, anon anahtarı bilse bile veri
alamamalı. Görev listesi geliyorsa 2. adımı (schema.sql) yeniden çalıştır ve
Table Editor'da RLS'in açık olduğunu kontrol et.

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

Hata mesajının tamamı tarayıcıda **F12 → Console** sekmesinde görünür.

## Bilinen sınırlar

- Takımın her üyesi o takımda her şeyi yapabilir (silme dahil). "Kaptan"
  yalnızca kadroda görünen bir etikettir.
- Davet kodu değiştirilemez. Kod sızarsa: verinin yedeğini al, yeni takım
  oluştur, yedeği oraya yükle.
- Şifremi unuttum akışı yok. Şimdilik: Supabase paneli → Authentication →
  Users → kullanıcı → "Send password recovery".
- Jeton tarayıcıda (localStorage) durur; Supabase'in kendi kütüphanesi de
  böyle yapar. Ortak bilgisayarda işin bitince **Ayarlar → Çıkış yap**.
