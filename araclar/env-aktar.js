/* Ortam değişkenlerini tarayıcının okuyabileceği js/ayarlar.js dosyasına aktarır.

   Neden gerekli? Tarayıcı .env dosyasını ya da ortam değişkenlerini okuyamaz
   ve bu projede derleme adımı yok. Bu küçük betik aradaki köprüdür:

     kendi bilgisayarında : .env dosyasını okur        -> node araclar/env-aktar.js
     Netlify'da           : paneldeki değişkenleri okur (netlify.toml bunu çalıştırır)

   Değişkenler (bkz. .env.example):
     VERI_KATMANI       "yerel" (varsayılan) ya da "supabase"
     SUPABASE_URL       yalnızca supabase seçiliyse gerekir
     SUPABASE_ANON_KEY  yalnızca supabase seçiliyse gerekir

   Hiçbir değişken yoksa "yerel" yazılır; uygulama localStorage ile çalışır. */
const fs = require("node:fs");
const path = require("node:path");

// ".env" metnini { ANAHTAR: "deger" } nesnesine çevirir.
// Boş satırlar ve # ile başlayan yorumlar atlanır; tırnaklar temizlenir.
function envCoz(metin) {
  const sonuc = {};
  for (const satir of metin.split(/\r?\n/)) {
    const eslesme = satir.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (eslesme) sonuc[eslesme[1]] = eslesme[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return sonuc;
}

/* Değişkenlerden js/ayarlar.js içeriğini üretir.
   Sorun varsa hata fırlatır; böylece yanlış ayarla yayın yapılmaz. */
function ayarlarIcerigi(degiskenler) {
  const tur = (degiskenler.VERI_KATMANI || "yerel").trim().toLowerCase();
  if (tur !== "yerel" && tur !== "supabase") {
    throw new Error('VERI_KATMANI "yerel" ya da "supabase" olmalı (gelen: "' + tur + '").');
  }

  const ayarlar = { VERI_KATMANI: tur };
  if (tur === "supabase") {
    const url = (degiskenler.SUPABASE_URL || "").trim();
    const anahtar = (degiskenler.SUPABASE_ANON_KEY || "").trim();
    if (!url || !anahtar || url.includes("PROJE-KODUN") || anahtar.includes("BURAYA")) {
      throw new Error("VERI_KATMANI=supabase için SUPABASE_URL ve SUPABASE_ANON_KEY doldurulmalı (örnek değerler duruyor ya da boş).");
    }
    if (!/^https:\/\/[a-z0-9.-]+$/i.test(url.replace(/\/+$/, ""))) {
      throw new Error("SUPABASE_URL https://....supabase.co biçiminde olmalı.");
    }
    // Yanlış anahtarı (gizli "service_role") koymayı engelle: o anahtar bütün
    // güvenlik kurallarını devre dışı bırakır ve ASLA tarayıcıya konmamalıdır.
    if (anahtar.startsWith("sb_secret_") || jwtRolu(anahtar) === "service_role") {
      throw new Error("Bu bir GİZLİ (service_role / secret) anahtar. Buraya yalnızca herkese açık anon / publishable anahtar yazılır.");
    }
    ayarlar.SUPABASE_URL = url.replace(/\/+$/, "");
    ayarlar.SUPABASE_ANON_KEY = anahtar;
  }

  return "// Bu dosya araclar/env-aktar.js tarafından üretildi. Depoya EKLENMEZ (.gitignore).\n" +
    "window.TAKIM_AYARLARI = " + JSON.stringify(ayarlar, null, 2) + ";\n";
}

// Supabase'in eski tip anahtarları JWT'dir; ortadaki bölümde "role" yazar.
function jwtRolu(anahtar) {
  try {
    return JSON.parse(Buffer.from(anahtar.split(".")[1], "base64url").toString("utf8")).role || "";
  } catch (hata) {
    return ""; // JWT değil (yeni tip anahtar)
  }
}

// Doğrudan çalıştırıldıysa (node araclar/env-aktar.js) dosyayı yaz.
// Testler bu dosyayı require ile yükler; o zaman bu kısım çalışmaz.
if (require.main === module) {
  const kok = path.join(__dirname, "..");
  const envYolu = path.join(kok, ".env");
  const dosyadan = fs.existsSync(envYolu) ? envCoz(fs.readFileSync(envYolu, "utf8")) : {};
  // Gerçek ortam değişkenleri (Netlify paneli) .env dosyasından önceliklidir.
  const degiskenler = { ...dosyadan };
  for (const ad of ["VERI_KATMANI", "SUPABASE_URL", "SUPABASE_ANON_KEY"]) {
    if (process.env[ad]) degiskenler[ad] = process.env[ad];
  }

  try {
    fs.writeFileSync(path.join(kok, "js", "ayarlar.js"), ayarlarIcerigi(degiskenler));
    console.log("js/ayarlar.js yazıldı. Veri katmanı: " + (degiskenler.VERI_KATMANI || "yerel"));
  } catch (hata) {
    console.error("HATA: " + hata.message);
    process.exit(1);
  }
}

module.exports = { envCoz, ayarlarIcerigi };
