# Yayına alma (Netlify ya da Vercel)

Uygulama sunucu gerektirmeyen düz dosyalardan oluşur; ücretsiz bir statik site
servisine konması yeterlidir. Bu depo **Netlify** (`netlify.toml`) ve
**Vercel** (`vercel.json`) için hazırdır; iki dosya aynı güvenlik başlıklarını
gönderir (bir test bunu denetler). Ücretli plan ya da alan adı gerekmez; site
`https://sectigin-ad.netlify.app` gibi bir adreste yayınlanır.

> **Durum:** `netlify.toml` yazıldı ve içindeki güvenlik başlıkları yerelde
> aynı başlıkları gönderen bir deneme sunucusuyla sınandı (bütün ekranlar,
> service worker, çevrimdışı açılma çalıştı). **Henüz hiçbir serviste yayın
> yapılmadı:** bu bilgisayarda Netlify ya da Vercel komut satırı aracı (CLI)
> kurulu değildi, bu yüzden dağıtım denenmedi. Adımlar aşağıda; ilk yayında
> "Yayın sonrası kontrol" listesini uygula.

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
git remote add origin https://github.com/KULLANICI-ADIN/takim-asistani.git
```

```bash
git push -u origin main
```

Göndermeden önce commit'lerdeki ad ve e-postayı kontrol et (bkz. QUESTIONS.md):

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
takılma olmaz). `index.html`'e yeni bir dosya eklediysen `sw.js` içindeki
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
