# Seyir — Yayına alma (Netlify ya da Vercel)

Uygulama sunucu gerektirmeyen düz dosyalardan oluşur; ücretsiz bir statik site
servisine konması yeterlidir. Bu depo **Netlify** (`netlify.toml`) ve
**Vercel** (`vercel.json`) için hazırdır; iki dosya aynı güvenlik başlıklarını
gönderir (bir test bunu denetler). Ücretli plan ya da alan adı gerekmez.

**Önerilen proje / site adı: `seyir`** → `seyir.vercel.app` ya da
`seyir.netlify.app` (ad boşsa; doluysa `seyir-takim` gibi bir ek kullan).

> **Durum (17 Kasım 2026):** Vercel'de yayında, Supabase kipinde:
> **<https://seyir-takim.vercel.app>** (`seyir.vercel.app` başkasına ait
> olduğu için `seyir-takim` seçildi). Vercel projesi `seyir-takim`, GitHub
> deposu `dvlp-omer/seyir`, Supabase projesinin adı `seyir`. Eski adres
> `takim-asistani.vercel.app` yeni adrese kalıcı (308) yönlendirir.

### Yayındaki bir projenin adını değiştirmek (nasıl yapıldı)

Sıra önemli; adres değişince giriş e-postalarındaki bağlantılar da değişmeli.

1. **Vercel:** Project → Settings → General → *Project Name* → Save. Proje adı
   adresi kendiliğinden değiştirmez: Settings → Domains → *Add Existing* ile
   yeni `….vercel.app` adresini ekle; eski adresi *Edit* → *Redirect to
   Another Domain* → 308 ile yeni adrese yönlendir (eski bağlantılar kırılmaz).
2. **Supabase:** Authentication → URL Configuration → *Site URL* = yeni adres.
3. **GitHub:** depo → Settings → *Repository name*. GitHub eski adresi yeni
   adrese yönlendirir; yine de yerel bağlantıyı güncelle:

   ```bash
   git remote set-url origin https://github.com/KULLANICI-ADIN/seyir.git
   ```

4. README'deki "Canlı / Live" bağlantısını yeni adresle değiştir.

---

## Hangi kipte yayınlayacağım?

| | Yerel kip | Supabase kipi |
|---|---|---|
| Veri nerede? | Her ziyaretçinin kendi tarayıcısında | Bulutta, ekip ortak |
| Giriş | Yok | E-posta + şifre |
| Kurulum | Hiçbiri | [SUPABASE_KURULUM.md](SUPABASE_KURULUM.md) |
| Ne için uygun? | Portföyde canlı demo, tek kişilik kullanım | Ekibin gerçek kullanımı |

Portföy için **yerel kip** yeterli ve en güvenlisi: siteyi açan herkes "Örnek
veriyle dene" ile uygulamayı görür, kimsenin verisi kimseyle karışmaz.

> **Kişi rehberi (telefon numaraları) ve yerel kip:** yerel kipte numaralar
> yalnızca girildikleri tarayıcıda durur; sunucuya gitmez, başka ziyaretçi
> göremez. Ama o bilgisayarı kullanan herkes görebilir ve giriş yoktur.
> **Ekibin gerçek rehberi için Supabase kipini kullan:** orada giriş zorunlu,
> kayıt davetli ve her kayıt yalnızca kendi takımına görünür.

---

## Adımlar

### 1. Depoyu GitHub'a gönder

GitHub'da boş bir depo aç (README ekleme). Sonra bu klasörde:

```bash
git remote add origin https://github.com/KULLANICI-ADIN/seyir.git
```

```bash
git push -u origin main
```

Göndermeden önce commit'lerdeki ad ve e-postayı kontrol et (depo herkese
açıksa bu e-posta görünür; istersen GitHub'ın "noreply" adresini kullan):

```bash
git log -1 --format="%an <%ae>"
```

### 2. Netlify'a bağla

1. <https://app.netlify.com> → GitHub hesabınla giriş yap.
2. **Add new site** → **Import an existing project** → GitHub → depoyu seç.
3. Ayarlar `netlify.toml` dosyasından kendiliğinden gelir:
   - Build command: `node araclar/env-aktar.js`
   - Publish directory: `.`
4. **Deploy**. Bir dakika içinde site adresi verilir.

Bu hâliyle site **yerel kipte** çalışır. Portföy için burada durabilirsin.

### 3. (İsteğe bağlı) Supabase kipine geçir

Önce [SUPABASE_KURULUM.md](SUPABASE_KURULUM.md) içindeki 1–4. adımları yap. Sonra
Netlify'da: **Site configuration** → **Environment variables** → üç değişken ekle:

| Değişken | Değer |
|---|---|
| `VERI_KATMANI` | `supabase` |
| `SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | anon / publishable anahtar |

Ardından **Deploys** → **Trigger deploy** → **Deploy site**. (Değişkenler yalnızca
yeni bir yayında okunur.)

Son olarak Supabase panelinde **Authentication → URL Configuration → Site URL**
alanına Netlify adresini yaz; e-posta onay bağlantıları oraya yönlenir.

> `.env` dosyasını Netlify'a **yükleme**, depoya **ekleme**. Değerler yalnızca
> Netlify panelinde durur. `service_role` / `secret` anahtarını hiçbir yere
> yazma; yanlışlıkla yazarsan yayın "GİZLİ anahtar" hatasıyla durur.

### 4. Yayın sonrası kontrol

| # | Kontrol | Beklenen |
|---|---------|----------|
| 1 | Siteyi aç. | Açılış ekranı gelir; F12 → Console'da kırmızı hata yok. |
| 2 | "Örnek veriyle dene" (yerel kip) ya da giriş yap (Supabase kipi). | Özet ekranı dolar. |
| 3 | Menüdeki 12 ekranı sırayla gez. | Hiçbirinde "Veri yüklenemedi" yok. |
| 4 | Toplantı → bir tutanak → **Yazdır / PDF**; Tutanak → bir resmî tutanak → **PDF indir**. | Önizlemede yalnızca belge var; resmî tutanakta çerçeve ve "Sayfa N". |
| 4b | Mesajlar → bir gönderim listesi → **WhatsApp'ta aç**. | WhatsApp (web ya da uygulama) mesaj hazır açılır. |
| 5 | Telefonda aç → tarayıcı menüsü → **Ana ekrana ekle**. | Uygulama simgesiyle açılır. |
| 6 | Telefonu uçak moduna al, uygulamayı yeniden aç. | Açılır (yerel kipte veriler de görünür). |
| 7 | F12 → Network → ana sayfa isteği → Response Headers. | `content-security-policy` başlığı var. |
| 8 | Supabase kipindeysen: SUPABASE_KURULUM.md → **7. Güvenliği dene**. | Tablodaki beş madde. |

Console'da **"Content Security Policy"** geçen bir hata görürsen: `netlify.toml`
içindeki `Content-Security-Policy` satırı bir şeyi fazla kısıtlıyor demektir.
Hata mesajı hangi kuralın (`script-src`, `connect-src` …) neyi engellediğini
yazar. Geçici çözüm o satırı silip yeniden yayınlamaktır; kalıcı çözüm için
mesajı not al.

---

### Komut satırından yayın (CLI ile, isteğe bağlı)

Panel yerine terminalden yayınlamak istersen. CLI'ı kurmak bilgisayarına genel
(global) bir paket kurar; bu yüzden ben kurmadım, kurulum senin kararın.

**Netlify:**

```bash
npm install -g netlify-cli
```

```bash
netlify login
```

```bash
netlify deploy --build
```

İlk komut bir önizleme adresi verir; beğenirsen kalıcı yayın:

```bash
netlify deploy --build --prod
```

**Vercel:**

```bash
npm install -g vercel
```

```bash
vercel login
```

```bash
vercel
```

Kalıcı yayın: `vercel --prod`. Supabase değişkenleri için: `vercel env add VERI_KATMANI`
(ve diğer ikisi), sonra yeniden `vercel --prod`.

## Güncelleme

`main` dalına her `git push` yeni bir yayın başlatır. Kullanıcılar bir sonraki
açılışta yeni sürümü alır (service worker "önce ağ" çalışır; eski sürümde
takılma olmaz). `uygulama.html`'e yeni bir dosya eklediysen `sw.js` içindeki
`KABUK` listesine de ekle ve `ONBELLEK` adındaki sürüm numarasını artır;
unutursan `npm test` uyarır.

## Başka servisler

- **Vercel:** `vercel.json` hazır (derleme komutu, yayın klasörü ve aynı
  güvenlik başlıkları). <https://vercel.com> → **Add New → Project** → GitHub
  deposunu seç → Deploy. Ortam değişkenleri: **Settings → Environment Variables**
  (aynı üç değişken). Vercel'de henüz denenmedi.
- **GitHub Pages:** Yalnızca yerel kip için uygundur (derleme komutu
  çalıştırmaz, başlık ayarlanamaz). Settings → Pages → Branch: `main` / root.
  `js/ayarlar.js` olmadığı için konsolda zararsız bir 404 satırı görünür.

## Yayında neler herkese açık?

Depodaki her dosya (belgeler, testler, `schema.sql`, `.env.example`) sitede de
erişilebilir olur; hiçbiri gizli bilgi içermez. Gizli olması gereken tek şey
`service_role` anahtarı ve veritabanı şifresidir; ikisi de bu projede hiçbir
dosyada yer almaz.


## Adresler (ana sayfa tanıtım, uygulama /uygulama)

| Adres | Ne açılır |
|---|---|
| `/` | Tanıtım sayfası (`tanitim-kaynak/`; derleme `tanitim/` klasörüne yazar ve `index.html`'i köke kopyalar) |
| `/uygulama` | Uygulama (`uygulama.html`; `cleanUrls` ile uzantısız sunulur) |
| `/tanitim`, `/tanitim/` | Ana sayfaya kalıcı yönlendirme (eski adres) |

Eski bağlantılar kırılmaz: ana sayfa, `/#gorevler` gibi eski ekran adreslerini,
e-postadaki `#access_token=…` bağlantılarını, `?ornek=1`'i ve ana ekrana
eklenmiş eski uygulama simgesini `/uygulama`'ya iletir
(`tanitim-kaynak/src/yonlendir.js`, testi `testler/yonlendir.test.js`).

İsteğe bağlı: Supabase'te **Authentication → URL Configuration → Site URL**
`https://seyir-takim.vercel.app/uygulama` yapılırsa e-posta bağlantıları
doğrudan uygulamaya gelir (yapılmasa da yönlendirme sayesinde çalışır).
