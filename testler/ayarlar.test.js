// Ortam değişkeni -> js/ayarlar.js aktarımının testleri.  npm test
// "Hangi veri katmanı kullanılacak" seçimi buradan geçer; yanlış ya da
// tehlikeli bir ayarın sessizce yayına çıkmaması gerekir.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { envCoz, ayarlarIcerigi } = require("../araclar/env-aktar.js");
const { depoSec } = require("../js/veri.js");

// Üretilen dosyayı tarayıcının yapacağı gibi çalıştırıp ayar nesnesini alır.
function calistir(icerik) {
  const window = {};
  new Function("window", icerik)(window);
  return window.TAKIM_AYARLARI;
}
const sahteDepolama = () => ({ getItem: () => null, setItem: () => {} });

// JWT biçiminde sahte anahtar üretir (imza önemli değil, yalnızca "role" okunur)
const sahteJwt = (rol) =>
  "aaa." + Buffer.from(JSON.stringify({ role: rol })).toString("base64url") + ".bbb";

test("envCoz: yorumları, boş satırları ve tırnakları doğru işler", () => {
  const sonuc = envCoz('# yorum\n\nVERI_KATMANI=supabase\r\nSUPABASE_URL = "https://x.supabase.co"\nBOS=\n  kucuk=atlanir');
  assert.deepEqual(sonuc, { VERI_KATMANI: "supabase", SUPABASE_URL: "https://x.supabase.co", BOS: "" });
});

test("hiç değişken yoksa yerel depo seçilir ve dosyada anahtar olmaz", () => {
  const icerik = ayarlarIcerigi({});
  assert.deepEqual(calistir(icerik), { VERI_KATMANI: "yerel" });
  assert.equal(depoSec(calistir(icerik), sahteDepolama()).tur, "yerel");
});

test("VERI_KATMANI=yerel iken Supabase anahtarları dosyaya YAZILMAZ", () => {
  const icerik = ayarlarIcerigi({ VERI_KATMANI: "yerel", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anahtar" });
  assert.equal(icerik.includes("anahtar\""), false);
  assert.deepEqual(calistir(icerik), { VERI_KATMANI: "yerel" });
});

test("VERI_KATMANI=supabase: uçtan uca Supabase deposu seçilir", () => {
  const icerik = ayarlarIcerigi({ VERI_KATMANI: "Supabase", SUPABASE_URL: "https://x.supabase.co/", SUPABASE_ANON_KEY: sahteJwt("anon") });
  const ayarlar = calistir(icerik);
  assert.equal(ayarlar.VERI_KATMANI, "supabase");           // büyük/küçük harf önemsiz
  assert.equal(ayarlar.SUPABASE_URL, "https://x.supabase.co"); // sondaki / temizlenir
  assert.equal(depoSec(ayarlar, sahteDepolama()).tur, "supabase");
});

test("eksik ya da örnek değerlerle supabase seçilirse hata verir", () => {
  assert.throws(() => ayarlarIcerigi({ VERI_KATMANI: "supabase" }), /doldurulmalı/);
  assert.throws(() => ayarlarIcerigi({ VERI_KATMANI: "supabase", SUPABASE_URL: "https://PROJE-KODUN.supabase.co", SUPABASE_ANON_KEY: "x" }), /doldurulmalı/);
  assert.throws(() => ayarlarIcerigi({ VERI_KATMANI: "supabase", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "BURAYA-ANON-PUBLIC-ANAHTAR" }), /doldurulmalı/);
  assert.throws(() => ayarlarIcerigi({ VERI_KATMANI: "supabase", SUPABASE_URL: "http://x.supabase.co", SUPABASE_ANON_KEY: "k" }), /https/);
  assert.throws(() => ayarlarIcerigi({ VERI_KATMANI: "mongo" }), /yerel.*supabase/);
});

test("gizli (service_role / secret) anahtar reddedilir", () => {
  const taban = { VERI_KATMANI: "supabase", SUPABASE_URL: "https://x.supabase.co" };
  assert.throws(() => ayarlarIcerigi({ ...taban, SUPABASE_ANON_KEY: sahteJwt("service_role") }), /GİZLİ/);
  assert.throws(() => ayarlarIcerigi({ ...taban, SUPABASE_ANON_KEY: "sb_secret_abc123" }), /GİZLİ/);
  // Herkese açık anahtarların iki biçimi de kabul edilir
  assert.ok(ayarlarIcerigi({ ...taban, SUPABASE_ANON_KEY: sahteJwt("anon") }));
  assert.ok(ayarlarIcerigi({ ...taban, SUPABASE_ANON_KEY: "sb_publishable_abc123" }));
});

test("değerin içindeki tırnak ya da </script> üretilen dosyayı bozamaz", () => {
  // Anahtar JSON.stringify ile yazıldığı için kod olarak çalıştırılamaz.
  const kotu = 'x";window.SALDIRI=1;//';
  const ayarlar = calistir(ayarlarIcerigi({ VERI_KATMANI: "supabase", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: kotu }));
  assert.equal(ayarlar.SUPABASE_ANON_KEY, kotu);
});

test(".env.example: gerçek anahtar içermez, örnek değerler duruyor", () => {
  const ornek = envCoz(fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8"));
  assert.equal(ornek.VERI_KATMANI, "yerel");
  assert.match(ornek.SUPABASE_URL, /PROJE-KODUN/);
  assert.match(ornek.SUPABASE_ANON_KEY, /BURAYA/);
  // Örnek dosya olduğu gibi kullanılırsa yerel depo çıkar, hata vermez
  assert.deepEqual(calistir(ayarlarIcerigi(ornek)), { VERI_KATMANI: "yerel" });
});

test(".gitignore: .env ve js/ayarlar.js depoya giremez", () => {
  const satirlar = fs.readFileSync(path.join(__dirname, "..", ".gitignore"), "utf8").split(/\r?\n/);
  assert.ok(satirlar.includes(".env"));
  assert.ok(satirlar.includes("js/ayarlar.js"));
});
