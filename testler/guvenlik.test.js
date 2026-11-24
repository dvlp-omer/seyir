// Güvenlik ve kişisel veri denetimleri.  npm test
//
// 1) supabase/schema.sql METİN olarak okunur ve kurallar denetlenir. Gerçek bir
//    veritabanında çalıştırmak değildir (bunun için SUPABASE_KURULUM.md >
//    "Güvenliği dene"), ama en sık yapılan hatayı yakalar: yeni bir tablo
//    eklenip RLS'in ya da ziyaretçi yasağının unutulması.
// 2) Depodaki dosyalarda gerçek görünen bir telefon numarası var mı?
//    Demo ve testlerde yalnızca kullanılmayan "0500 000 00 xx" aralığı serbest.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const KOK = path.join(__dirname, "..");
const sema = fs.readFileSync(path.join(KOK, "supabase/schema.sql"), "utf8")
  .replace(/--.*$/gm, ""); // yorumları at: yalnızca gerçek komutlar sayılsın
const { KOLEKSIYONLAR } = require("../js/veri.js");
Object.assign(global, require("../js/mantik.js"));
const { YEDEK_SEMASI } = require("../js/yedek.js");

const tablolar = [...sema.matchAll(/create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/g)]
  .map((e) => ({ ad: e[1], govde: e[2] }));

test("şema: uygulamanın her koleksiyonu için tablo var ve sütunlar yedek şemasıyla aynı", () => {
  for (const koleksiyon of KOLEKSIYONLAR) {
    const tablo = tablolar.find((t) => t.ad === koleksiyon);
    assert.ok(tablo, koleksiyon + " tablosu yok");
    for (const alan of Object.keys(YEDEK_SEMASI[koleksiyon])) {
      assert.match(tablo.govde, new RegExp("^\\s*" + alan + "\\s", "m"), koleksiyon + "." + alan + " sütunu yok");
    }
  }
});

test("şema: HER tabloda RLS açık, en az bir kural var, ziyaretçiye (anon) kapalı", () => {
  assert.ok(tablolar.length >= 13, "tablo sayısı beklenenden az: " + tablolar.length);
  // "revoke all on a, b, c from anon" komutlarındaki tablo adları
  const anonaKapali = new Set([...sema.matchAll(/revoke all on ([\w,\s]+?) from anon/g)]
    .flatMap((e) => e[1].split(",").map((ad) => ad.trim())));
  for (const { ad } of tablolar) {
    assert.match(sema, new RegExp("alter table " + ad + "\\s+enable row level security"), ad + ": RLS açılmamış");
    assert.match(sema, new RegExp("create policy \\w+ on " + ad + "\\s"), ad + ": hiç kural yok (RLS açık + kural yok = kimse göremez; büyük olasılıkla unutuldu)");
    assert.ok(anonaKapali.has(ad), ad + ": ziyaretçiden (anon) yetki geri alınmamış");
  }
});

test("şema: hiçbir kural ve yetki ziyaretçiye (anon / public) verilmez", () => {
  assert.doesNotMatch(sema, /create policy[^;]*\bto\s+(anon|public)\b/i);
  assert.doesNotMatch(sema, /grant[^;]*\bto\s+(anon|public)\b/i);
  // Yeni eklenecek tablolar da kapalı başlasın
  assert.match(sema, /alter default privileges in schema public revoke all on tables from anon/);
});

test("şema: kayıt yalnızca davetle — auth.users tetikleyicileri ve ilk hesabın yönetici olması", () => {
  assert.match(sema, /create trigger kayit_kapisi\s+before insert on auth\.users/);
  assert.match(sema, /create trigger yeni_hesap\s+after insert on auth\.users/);
  // kayıt kapısı: hiç profil yoksa geçir, davet listesindeyse geçir, değilse hata
  const kapi = sema.match(/function kayit_kapisi\(\)[\s\S]*?\$\$;/)[0];
  assert.match(kapi, /not exists \(select 1 from profiller\)/);
  assert.match(kapi, /from izinli_epostalar where eposta = lower\(new\.email\)/);
  assert.match(kapi, /raise exception/);
  assert.match(sema, /case when exists \(select 1 from profiller\) then 'uye' else 'yonetici' end/);
  // davet listesini yalnızca yönetici görür/yazar
  assert.match(sema, /create policy davet_yonetici on izinli_epostalar for all to authenticated\s+using \(yonetici_mi\(\)\) with check \(yonetici_mi\(\)\)/);
  // tetikleyici fonksiyonları dışarıdan çağrılamaz
  assert.match(sema, /revoke all on function kayit_kapisi\(\) from public, anon, authenticated/);
  assert.match(sema, /revoke all on function yeni_hesap\(\) from public, anon, authenticated/);
});

test("şema: takıma bağlı her tablonun kuralı 'yalnızca kendi takımım' (uye_mi)", () => {
  for (const { ad, govde } of tablolar) {
    // takim_uyelikleri hariç: onun kuralı "yalnızca kendi üyeliğim" (kullanici_id = auth.uid())
    if (ad === "takim_uyelikleri") continue;
    if (!/^\s*takim_id\s+text not null/m.test(govde)) continue;
    assert.match(sema, new RegExp("create policy \\w+ on " + ad + " for all to authenticated\\s+using \\(uye_mi\\(takim_id\\)\\) with check \\(uye_mi\\(takim_id\\)\\)"), ad);
  }
});

/* ---------- Kişisel veri ---------- */

// Depodaki metin dosyaları (referans/, .git, çıktılar ve resimler hariç)
function metinDosyalari(klasor = KOK) {
  const atla = new Set([".git", "node_modules", "referans", "cikti", ".claude", "tanitim"]); // tanitim: derleme çıktısı
  const sonuc = [];
  for (const oge of fs.readdirSync(klasor, { withFileTypes: true })) {
    if (atla.has(oge.name)) continue;
    const yol = path.join(klasor, oge.name);
    if (oge.isDirectory()) sonuc.push(...metinDosyalari(yol));
    else if (/\.(js|html|css|md|sql|json|toml|txt|example)$/.test(oge.name) || oge.name.startsWith(".env")) sonuc.push(yol);
  }
  return sonuc;
}

test("şema: her koleksiyonda 'surum' sütunu ve onu artıran tetikleyici var (çakışma denetimi)", () => {
  assert.match(sema, /create or replace function surum_artir\(\)/);
  assert.match(sema, /new\.surum := coalesce\(old\.surum, 0\) \+ 1/);
  assert.match(sema, /add column if not exists surum integer not null default 1/);
  assert.match(sema, /create trigger surum_artir before update on %I/);
  // Döngüdeki tablo listesi, uygulamanın koleksiyon listesiyle aynı olmalı
  const liste = /foreach tablo in array array\[([^\]]+)\]/.exec(sema);
  assert.ok(liste, "tablo listesi bulunamadı");
  const tablolar = liste[1].match(/'([a-z_]+)'/g).map((t) => t.slice(1, -1)).sort();
  assert.deepEqual(tablolar, [...KOLEKSIYONLAR].sort());
  // Ayrı güncelleme dosyası da aynı komutları içersin
  const guncelleme = fs.readFileSync(path.join(KOK, "supabase/guncelleme-surum.sql"), "utf8");
  // (sema'dan yorumlar atılmıştır; dosyayı da aynı biçimde karşılaştır)
  const komutlar = (metin) => metin.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
  const fonksiyonVeDongu = /create or replace function surum_artir[\s\S]*?end\s*\$\$;/.exec(sema)[0];
  assert.ok(komutlar(guncelleme).includes(komutlar(fonksiyonVeDongu)), "guncelleme-surum.sql, schema.sql ile aynı değil");
});

test("kişisel veri: depoda gerçek görünen cep telefonu numarası yok (yalnızca 0500 000 00 xx)", () => {
  // 5XX XXX XX XX biçiminde, önünde 0 / 90 / +90 olabilen numaralar
  const desen = /(?<![\d])(?:\+?90|0)?[\s(]*5\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?![\d])/g;
  const bulunan = [];
  for (const dosya of metinDosyalari()) {
    for (const eslesme of fs.readFileSync(dosya, "utf8").matchAll(desen)) {
      const rakam = eslesme[0].replace(/\D/g, "").replace(/^(90|0)/, "");
      if (!rakam.startsWith("500000")) bulunan.push(path.relative(KOK, dosya) + ": " + eslesme[0]);
    }
  }
  assert.deepEqual(bulunan, []);
});

test("kişisel veri: referans dosyasındaki adlar ve numaralar depoya girmemiş (dosya varsa)", (t) => {
  const referans = path.join(KOK, "referans/ROTA__SAS_Akademi___Kabul_Mesajlar_.html");
  if (!fs.existsSync(referans)) return t.skip("referans dosyası bu bilgisayarda yok");
  const { htmlKisiDizisiOku } = require("../js/kisiler.js");
  const kisiler = htmlKisiDizisiOku(fs.readFileSync(referans, "utf8"));
  const bulunan = [];
  for (const dosya of metinDosyalari()) {
    const metin = fs.readFileSync(dosya, "utf8");
    for (const k of kisiler) {
      if (metin.includes(k.telefon) || metin.includes(k.telefon.slice(2)) || metin.includes(k.ad)) {
        bulunan.push(path.relative(KOK, dosya) + " (" + k.ad.length + " harflik bir ad / numara)"); // adı yazdırmıyoruz
      }
    }
  }
  assert.deepEqual(bulunan, []);
});

/* ---------- Yayın yapılandırması ---------- */

test("yayın: Netlify ve Vercel aynı güvenlik başlıklarını gönderir", () => {
  const netlify = fs.readFileSync(path.join(KOK, "netlify.toml"), "utf8");
  const vercel = JSON.parse(fs.readFileSync(path.join(KOK, "vercel.json"), "utf8"));
  const tumSayfalar = vercel.headers.find((h) => h.source === "/(.*)").headers;
  for (const { key, value } of tumSayfalar) {
    assert.ok(netlify.includes(key + ' = "' + value + '"'), key + " iki dosyada farklı");
  }
  assert.ok(tumSayfalar.some((h) => h.key === "Content-Security-Policy" && h.value.includes("script-src 'self'")));
  assert.ok(vercel.buildCommand.startsWith("node araclar/env-aktar.js"));
  assert.ok(netlify.includes('command = "' + vercel.buildCommand + '"'), "iki yayın aynı derleme komutunu çalıştırmalı");
});

test("yayın: sıkı güvenlik başlıkları (HSTS, yalıtım, CSP'de satır içi / eval betik yok)", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(KOK, "vercel.json"), "utf8"));
  const baslik = Object.fromEntries(vercel.headers.find((h) => h.source === "/(.*)").headers.map((h) => [h.key, h.value]));
  assert.match(baslik["Strict-Transport-Security"], /max-age=(\d+)/);
  assert.ok(Number(/max-age=(\d+)/.exec(baslik["Strict-Transport-Security"])[1]) >= 31536000, "HSTS en az bir yıl olmalı");
  assert.equal(baslik["Cross-Origin-Opener-Policy"], "same-origin");
  assert.equal(baslik["Cross-Origin-Resource-Policy"], "same-origin");
  assert.equal(baslik["X-Frame-Options"], "DENY");
  const csp = baslik["Content-Security-Policy"];
  const betik = /script-src ([^;]+)/.exec(csp)[1].trim();
  assert.equal(betik, "'self'", "betikler yalnızca kendi dosyalarımızdan: " + betik);
  assert.doesNotMatch(csp, /unsafe-eval|\*;|https?:\/\/\*[^.]/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /upgrade-insecure-requests/);
});

test("tanıtım sayfası: derlenmiş HTML'de satır içi betik yok, dışarıdan dosya çekilmiyor (derlendiyse)", (t) => {
  const dosya = path.join(KOK, "tanitim/index.html");
  if (!fs.existsSync(dosya)) return t.skip("tanıtım sayfası henüz derlenmemiş (npm --prefix tanitim-kaynak run build)");
  const html = fs.readFileSync(dosya, "utf8");
  for (const [, nitelik] of html.matchAll(/<script\b([^>]*)>/g)) {
    // Arama motorları için yapılandırılmış veri çalıştırılmaz; ona izin var
    if (/type="application\/ld\+json"/.test(nitelik)) continue;
    assert.match(nitelik, /\bsrc="\/tanitim\//, "satır içi ya da dış betik: <script" + nitelik + ">");
  }
  // Dışarıdan yüklenen dosya yok (canonical / og:url gibi adres bilgileri yükleme değildir)
  assert.doesNotMatch(html, /\bsrc="https?:\/\//, "dış adresten betik / görsel yükleniyor");
  assert.doesNotMatch(html, /<link\b[^>]*rel="(stylesheet|icon|preload|modulepreload)"[^>]*href="https?:\/\//, "dış adresten stil / yazı tipi yükleniyor");
});

test("yayın: ana sayfa tanıtım, uygulama /uygulama; eski /tanitim yönlenir; uygulama dizinlenmez", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(KOK, "vercel.json"), "utf8"));
  assert.equal(vercel.cleanUrls, true, "uygulama.html, /uygulama adresinden sunulmalı");
  for (const eski of ["/tanitim", "/tanitim/"]) {
    assert.ok(vercel.redirects.some((r) => r.source === eski && r.destination === "/" && r.permanent), eski);
  }
  // Ana sayfa: derleme, tanıtımın index.html'ini köke (tr) ve en/ altına (en) yazar (ikisi de depoya girmez)
  const paket = JSON.parse(fs.readFileSync(path.join(KOK, "tanitim-kaynak/package.json"), "utf8"));
  assert.match(paket.scripts.build, /node sayfalari-yaz\.cjs/);
  const yazici = fs.readFileSync(path.join(KOK, "tanitim-kaynak/sayfalari-yaz.cjs"), "utf8");
  assert.match(yazici, /"\.\.", "index\.html"/);
  assert.match(yazici, /"\.\.", "en", "index\.html"/);
  const yoksay = fs.readFileSync(path.join(KOK, ".gitignore"), "utf8");
  assert.match(yoksay, /^\/index\.html$/m);
  assert.match(yoksay, /^\/en\/$/m);
  const kokSayfa = path.join(KOK, "index.html");
  if (fs.existsSync(kokSayfa)) assert.match(fs.readFileSync(kokSayfa, "utf8"), /<div id="kok">/, "kökteki index.html tanıtım sayfası olmalı");
  const enSayfa = path.join(KOK, "en", "index.html");
  if (fs.existsSync(enSayfa)) {
    const en = fs.readFileSync(enSayfa, "utf8");
    assert.match(en, /<html lang="en">/);
    assert.match(en, /<link rel="canonical" href="https:\/\/seyir-takim\.vercel\.app\/en"/);
  }
  // İki dil birbirini hreflang ile gösterir; site haritasında ikisi de var
  const kaynakHtml = fs.readFileSync(path.join(KOK, "tanitim-kaynak/index.html"), "utf8");
  assert.match(kaynakHtml, /hreflang="en" href="https:\/\/seyir-takim\.vercel\.app\/en"/);
  assert.match(fs.readFileSync(path.join(KOK, "sitemap.xml"), "utf8"), /<loc>https:\/\/seyir-takim\.vercel\.app\/en<\/loc>/);
  assert.match(fs.readFileSync(path.join(KOK, "uygulama.html"), "utf8"), /<meta name="robots" content="noindex">/);
  assert.match(fs.readFileSync(path.join(KOK, "robots.txt"), "utf8"), /Sitemap: https:\/\/seyir-takim\.vercel\.app\/sitemap\.xml/);
});

test("lisans: PolyForm Noncommercial; sitede ve videoda 'açık kaynak' iddiası yok", () => {
  // Kod herkese açık ama açık kaynak değil (ticari kullanım izne bağlı). Yanlış vaat geri gelmesin.
  const lisans = fs.readFileSync(path.join(KOK, "LICENSE.md"), "utf8");
  assert.match(lisans, /^Required Notice: Copyright \(c\) 2026 /m);
  assert.match(lisans, /# PolyForm Noncommercial License 1\.0\.0/);
  const dosyalar = [
    "README.md", "tanitim-kaynak/index.html", "tanitim-kaynak/sayfalari-yaz.cjs", "tanitim-video/src/metinler.ts",
    ...fs.readdirSync(path.join(KOK, "tanitim-kaynak/src")).filter((d) => /\.(jsx?|css)$/.test(d)).map((d) => "tanitim-kaynak/src/" + d),
  ];
  for (const d of dosyalar) {
    // "açık kaynak değildir" / "not open source" gibi olumsuz cümleler doğru bilgidir, sayılmaz
    const metin = fs.readFileSync(path.join(KOK, d), "utf8").replace(/açık kaynak\*{0,2} değil|not\*{0,2} open[ -]source|\*\*not open source/gi, "");
    assert.doesNotMatch(metin, /açık kaynak|open[ -]source/i, d + " 'açık kaynak' diyor; lisans PolyForm Noncommercial");
  }
});

test("Search Console: sahiplik doğrulama etiketi tanıtım sayfasında duruyor", () => {
  // Google uyarısı: etiket kaldırılırsa site sahipliği doğrulaması düşer.
  const html = fs.readFileSync(path.join(KOK, "tanitim-kaynak/index.html"), "utf8");
  assert.match(html, /<meta name="google-site-verification" content="vDP-KhF2csmsWzK9AB2Oq6zeUZBL7isGsuSyla2XOg0" \/>/);
});

test("veritabanı: kurum ayarları sütunu schema.sql ile güncelleme dosyasında aynı", () => {
  const sade = (dosya) => fs.readFileSync(path.join(KOK, dosya), "utf8").replace(/\s+/g, " ");
  const sema = sade("supabase/schema.sql");
  const guncelleme = sade("supabase/guncelleme-kurum.sql");
  for (const parca of ["ayarlar jsonb not null default '{}'::jsonb", "jsonb_typeof(ayarlar) = 'object'", "pg_column_size(ayarlar) < 150000"]) {
    assert.ok(sema.includes(parca), "schema.sql: " + parca);
    assert.ok(guncelleme.includes(parca), "guncelleme-kurum.sql: " + parca);
  }
});
