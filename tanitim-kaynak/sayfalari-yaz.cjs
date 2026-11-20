// Derlemeden sonra çalışır (npm run build): tanıtımın HTML'ini iki adrese yazar.
//   ../index.html     -> Türkçe, ana adres (/)
//   ../en/index.html  -> İngilizce (/en): aynı JavaScript, başlık ve paylaşım metinleri İngilizce.
// Sayfa içi metinler src/ altında t("tr", "en") ile seçilir (src/dil.js); burası yalnızca
// JavaScript çalışmadan okunan <head> bilgilerini (arama motoru, paylaşım önizlemesi) çevirir.
// İkisi de .gitignore'da: her derlemede yeniden üretilir.
const fs = require("fs");
const path = require("path");

const kaynak = path.join(__dirname, "..", "tanitim", "index.html");
const html = fs.readFileSync(kaynak, "utf8");
fs.writeFileSync(path.join(__dirname, "..", "index.html"), html);

const ADRES = "https://seyir-takim.vercel.app";
const DEGISIKLIKLER = [
  ['<html lang="tr">', '<html lang="en">'],
  [/<title>[^<]*<\/title>/, "<title>Seyir — Team assistant for student teams</title>"],
  [/<meta name="description" content="[^"]*"/, '<meta name="description" content="Seyir: a free team assistant for student and competition teams. Task board, official meeting minutes (PDF / Word), calendar, attendance and WhatsApp messages in one place; opens offline."'],
  [`<link rel="canonical" href="${ADRES}/"`, `<link rel="canonical" href="${ADRES}/en"`],
  ['content="tr_TR"', 'content="en_US"'],
  [`<meta property="og:url" content="${ADRES}/"`, `<meta property="og:url" content="${ADRES}/en"`],
  [/<meta property="og:title" content="[^"]*"/, '<meta property="og:title" content="Seyir — Your team\'s logbook"'],
  [/<meta property="og:description" content="[^"]*"/, '<meta property="og:description" content="A team assistant for student teams: tasks, official minutes, calendar, messages. Free for teams."'],
  ['"inLanguage":"tr"', '"inLanguage":"en"'],
  [`"url":"${ADRES}/"`, `"url":"${ADRES}/en"`],
  [/"description":"Öğrenci takımları[^"]*"/, '"description":"Task board, official meeting minutes, calendar and WhatsApp messages for student teams."'],
  [/<noscript>[\s\S]*?<\/noscript>/, `<noscript>Seyir's landing page needs JavaScript. To open the app directly: <a href="/uygulama">seyir-takim.vercel.app/uygulama</a></noscript>`],
];

let en = html;
for (const [eski, yeni] of DEGISIKLIKLER) {
  const once = en;
  en = en.replace(eski, yeni);
  if (en === once) throw new Error("İngilizce sayfa: bulunamadı -> " + eski);
}
fs.mkdirSync(path.join(__dirname, "..", "en"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "..", "en", "index.html"), en);
console.log("yazıldı: index.html (tr), en/index.html (en)");
