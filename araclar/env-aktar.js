/* .env dosyasındaki Supabase ayarlarını tarayıcının okuyabileceği
   js/ayarlar.js dosyasına aktarır.

   Neden gerekli? Tarayıcı .env dosyasını okuyamaz ve bu projede derleme
   adımı yok. Bu küçük betik aradaki köprüdür. Çalıştırmak için:
     node araclar/env-aktar.js
   (İstersen js/ayarlar.js dosyasını elle de yazabilirsin; içeriği tek satır.) */
const fs = require("node:fs");
const path = require("node:path");

const kok = path.join(__dirname, "..");
const envYolu = path.join(kok, ".env");

if (!fs.existsSync(envYolu)) {
  console.error('".env" bulunamadı. Önce ".env.example" dosyasını ".env" adıyla kopyalayıp doldur.');
  process.exit(1);
}

// "ANAHTAR=deger" satırlarını oku; boş satırları ve # ile başlayan yorumları atla.
const ayarlar = {};
for (const satir of fs.readFileSync(envYolu, "utf8").split(/\r?\n/)) {
  const eslesme = satir.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (eslesme) ayarlar[eslesme[1]] = eslesme[2].replace(/^["']|["']$/g, "");
}

const url = ayarlar.SUPABASE_URL || "";
const anahtar = ayarlar.SUPABASE_ANON_KEY || "";
if (!url || !anahtar || url.includes("PROJE-KODUN") || anahtar.includes("BURAYA")) {
  console.error("SUPABASE_URL ve SUPABASE_ANON_KEY doldurulmamış (hâlâ örnek değerler duruyor).");
  process.exit(1);
}

const icerik =
  "// Bu dosya araclar/env-aktar.js tarafından üretildi. Depoya EKLENMEZ (.gitignore).\n" +
  "window.TAKIM_AYARLARI = " + JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anahtar }, null, 2) + ";\n";

fs.writeFileSync(path.join(kok, "js", "ayarlar.js"), icerik);
console.log("js/ayarlar.js yazıldı. Sayfayı yenileyince uygulama Supabase'e bağlanır.");
