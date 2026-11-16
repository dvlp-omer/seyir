# Benim yapacaklarım

Kodun hazır olan kısmı bitti. Aşağıdakiler **senin hesabınla** yapılması
gereken adımlar: hesap açmak, anahtar almak, giriş yapmak. Bunları ben
yapamam (senin adına hesap açmam, anahtar istemem, global program kurmam).

Sıra önemli. Her adımın sonunda "✅ Olduysa" satırındaki şeyi görmelisin.

> Hiçbirini yapmasan da uygulama çalışır: yerel kipte, veriler tarayıcıda.
> Portföy için 1. bölüm yeterli; 2–4. bölümler ekibin gerçekten ortak
> kullanması içindir.

> **Durum (17 Kasım 2026):** 2. ve 3. bölümün çoğu senin adına yapıldı:
> `takim-asistani` Supabase projesi açıldı (dvlp-omer's Org, Avrupa), şema
> kuruldu ve doğrulandı, `.env` dolduruldu, ayar dosyası üretildi. Senden
> kalan tek zorunlu adım: **ilk hesabı açmak** (3. bölüm, işaretsiz maddeler).

---

## 1. Hemen (10 dakika) — depo ve portföy

- [ ] **Git yazar bilgisini kontrol et.** Commit'lerde kendi adın görünsün:

  ```bash
  git log -3 --format="%an <%ae>"
  ```

  Yanlışsa (yalnızca bu proje için):

  ```bash
  git config user.name "Adın Soyadın"
  ```

  ```bash
  git config user.email "github-epostan@ornek.com"
  ```

- [ ] **Referans klasörüne bak.** `referans/` içindeki dosyalar (gerçek ad ve
  numaralar) depoya **girmiyor** (`.gitignore`). İşin bitince bu klasörü
  silebilirsin; uygulama onsuz çalışır.

- [ ] **Testleri bir kez kendin çalıştır:**

  ```bash
  npm test
  ```

  ✅ Olduysa: `pass 182`, `fail 0`.

- [ ] **GitHub'a gönder** (YAYIN.md → 1. adım). Depoda gerçek görünen telefon
  numarası ve referans dosyasındaki ad/numara olmadığını `npm test` denetliyor
  (`testler/guvenlik.test.js`); göndermeden önce testlerin geçtiğini gör.

## 2. Supabase projesi (20 dakika)

Ayrıntı: [SUPABASE_KURULUM.md](SUPABASE_KURULUM.md). Kısaca:

- [x] Proje açıldı: **takim-asistani** (AB bölgesi). Hesaptaki diğer
  projelere dokunulmadı. Proje açılırken "yeni tabloları
  otomatik açma" kapatıldı, "otomatik RLS" açıldı.
- [x] Veritabanı şifresi Supabase'in "Generate a password" düğmesiyle üretildi;
  kimse görmedi, uygulamada kullanılmaz. Gerekirse Project Settings →
  Database → **Reset database password** ile yenisini al.
- [x] **SQL Editor**'da şema çalıştırıldı ("Success"). Doğrulama sorgusu:
  13 tablo, 13'ünde RLS açık, kuralsız tablo 0, ziyaretçinin okuyabildiği
  tablo 0; `auth.users` üzerinde `kayit_kapisi` ve `yeni_hesap` tetikleyicileri var.
- [x] Giriş yapmadan REST denemesi: `kisiler`, `gorevler`, `takimlar`,
  `profiller`, `izinli_epostalar` ve `rolum` → hepsi **permission denied**.
- [x] Authentication: "Confirm email" açık, "anonymous sign-ins" kapalı,
  Site URL = `http://localhost:8765`.
- [x] `anon` anahtarı alındı (`service_role` anahtarına dokunulmadı).

## 3. Anahtarları `.env`'e koy ve bağlan (5 dakika)

- [x] `.env` dolduruldu (depoya girmez) ve `node araclar/env-aktar.js`
  çalıştırıldı: `js/ayarlar.js yazıldı. Veri katmanı: supabase`.
- [ ] Uygulamayı aç (açık değilse):

  ```bash
  python -m http.server 8765
  ```

  Tarayıcıda `http://localhost:8765` → **Giriş yap** ekranı.
- [ ] **İlk hesabı SEN aç** (Yeni hesap aç). İlk hesap yönetici olur.
  Bunu başkasından önce yap.
- [ ] Takımını oluştur. **Ayarlar → Erişim**'den ekip arkadaşlarının
  e-postalarını ekle; onlar o e-postalarla hesap açsın.
- [ ] **Güvenliği dene:** SUPABASE_KURULUM.md → 7. adım (8 madde, 5 dakika).
  Özellikle: giriş yapmadan `.../rest/v1/kisiler?apikey=...` adresi **boş**
  dönmeli; davetsiz e-postayla hesap **açılmamalı**.
- [ ] Eski verin varsa: önce yerel kipte **Ayarlar → Yedeği indir**, Supabase'e
  geçince **Ayarlar → Yedekten yükle**.

## 4. Yayın (15 dakika)

Ayrıntı: [YAYIN.md](YAYIN.md). İki yoldan birini seç:

**A) Panelden (CLI gerekmez, önerilen):**

- [ ] <https://app.netlify.com> (ya da <https://vercel.com>) → GitHub ile giriş →
  depoyu içe aktar → Deploy. Ayarlar `netlify.toml` / `vercel.json`'dan gelir.
- [ ] Supabase kipi için panelde üç ortam değişkenini gir (`VERI_KATMANI`,
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`), yeniden yayınla.
- [ ] Supabase → **Authentication → URL Configuration → Site URL** = yayın adresin.

**B) Komut satırından (CLI):** bu bilgisayarda CLI kurulu değildi, o yüzden
ben denemedim. İstersen:

```bash
npm install -g netlify-cli
```

```bash
netlify login
```

```bash
netlify deploy --build --prod
```

- [ ] ✅ Olduysa: YAYIN.md → "Yayın sonrası kontrol" listesi.

## 5. Kişi verisi için dikkat

- [ ] Kabul mesajları dosyasını (gerçek numaralar) uygulamaya **Kişiler →
  İçe aktar** ile yükle; dosyayı depoya, e-postaya ya da herkese açık bir
  yere koyma.
- [ ] **Ekran görüntüsü** alırken (README, sunum, CV) yalnızca örnek veriyi
  kullan: `index.html?ornek=1` (numaralar `0500 000 00 xx`, uydurma).
- [ ] Yedek ve CSV dosyaları numara içerir; yalnızca ekip içinde paylaş.
- [ ] Ekipten ayrılan biri olursa: Supabase → Authentication → Users'tan
  hesabını sil (davet listesinden çıkarmak yetmez).

## 6. Mülakat öncesi

- [ ] [MULAKAT.md](MULAKAT.md) → "Kendin yap" listesi. Özellikle 21–25. sorular
  (WhatsApp, telefon biçimi, davetli kayıt, RLS).
