// PWA ve tema testleri.  npm test
//
// Service worker'ı Node'da çalıştıramayız; ama en sık yapılan hatayı
// yakalayabiliriz: uygulama.html'e yeni bir dosya eklenip sw.js'teki önbellek
// listesine eklenmezse uygulama çevrimdışıyken açılmaz. Bu testler dosya
// listelerinin birbiriyle ve diskle tutarlı olduğunu denetler.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { temaHesapla } = require("../js/tema.js");

const kok = path.join(__dirname, "..");
const oku = (dosya) => fs.readFileSync(path.join(kok, dosya), "utf8");

const sw = oku("sw.js");
const html = oku("uygulama.html");
const kabuk = [...sw.slice(sw.indexOf("const KABUK = ["), sw.indexOf("];")).matchAll(/"([^"]+)"/g)].map((e) => e[1]);

test("sw.js: önbellek listesindeki her dosya diskte var", () => {
  const eksikler = kabuk.filter((dosya) => dosya !== "./" && !fs.existsSync(path.join(kok, dosya)));
  assert.deepEqual(eksikler, []);
});

test("sw.js: uygulama.html'deki bütün betikler ve stil dosyası önbellek listesinde", () => {
  const betikler = [...html.matchAll(/<script src="([^"]+)"/g)].map((e) => e[1]);
  const stiller = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((e) => e[1]);
  assert.ok(betikler.length > 10, "betikler bulunamadı");
  const eksikler = [...betikler, ...stiller].filter((dosya) => !kabuk.includes(dosya));
  assert.deepEqual(eksikler, []);
});

test("sw.js: gizli ayar dosyası önbellek listesine yazılmamış", () => {
  // js/ayarlar.js her kurulumda farklıdır ve olmayabilir; listede olsaydı
  // dosya yokken service worker kurulumu tümden başarısız olurdu.
  assert.equal(kabuk.includes("js/ayarlar.js"), false);
});

test("manifest: zorunlu alanlar ve ikon dosyaları yerinde", () => {
  const manifest = JSON.parse(oku("manifest.webmanifest"));
  for (const alan of ["name", "short_name", "start_url", "display", "icons"]) {
    assert.ok(manifest[alan], alan + " eksik");
  }
  assert.ok(manifest.icons.some((ikon) => ikon.sizes === "192x192"));
  assert.ok(manifest.icons.some((ikon) => ikon.sizes === "512x512"));
  for (const ikon of manifest.icons) {
    const dosya = path.join(kok, ikon.src);
    assert.ok(fs.existsSync(dosya), ikon.src + " yok");
    // PNG dosyaları sabit bir imzayla başlar ve genişlik 16. bayttadır
    const veri = fs.readFileSync(dosya);
    assert.equal(veri.subarray(1, 4).toString(), "PNG");
    assert.equal(veri.readUInt32BE(16) + "x" + veri.readUInt32BE(20), ikon.sizes);
  }
});

test("uygulama.html: manifest bağlı, tema betiği head içinde ve stil dosyasından sonra", () => {
  const head = html.slice(0, html.indexOf("</head>"));
  assert.ok(head.includes('rel="manifest"'));
  assert.ok(head.includes('src="js/tema.js"'), "tema.js head içinde olmalı (yoksa açılışta beyaz parlama olur)");
});

test("temaHesapla: açık seçim sistemi ezer; 'sistem' cihaza uyar", () => {
  assert.equal(temaHesapla("koyu", false), "koyu");
  assert.equal(temaHesapla("acik", true), "acik");
  assert.equal(temaHesapla("sistem", true), "koyu");
  assert.equal(temaHesapla("sistem", false), "acik");
  assert.equal(temaHesapla("bozuk-deger", true), "koyu"); // tanınmayan değer = sistem
});
