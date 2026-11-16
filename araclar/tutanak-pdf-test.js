/* TUTANAK PDF TESTİ
   Örnek (uydurma) bir tutanağı gerçek bir PDF'e çevirir ve PDF'i denetler:
     1) Sayfa sayısı beklenen aralıkta mı?            (içerik iki sayfaya taşmalı)
     2) Türkçe harfler (ç ğ ı ö ş ü Ç Ğ İ Ö Ş Ü) PDF'te gerçekten var mı?
     3) Yazı tipi serif mi (Times New Roman / eşdeğeri)?

   Nasıl çalışır?
     - js/tutanak.js > tutanakBelgeHtml ile HTML üretir (uygulamadakiyle AYNI fonksiyon)
     - Bilgisayardaki Edge ya da Chrome'u penceresiz (headless) çalıştırıp
       sayfayı PDF olarak yazdırır. Uygulamadaki "PDF indir" de aynı yazdırma
       motorunu kullanır; yani burada görülen çıktı kullanıcının alacağı çıktıdır.
     - PDF dosyasını açıp sayfaları ve yazı tipi tablolarını okur.

   Çalıştırmak için:   npm run test:pdf
   Tarayıcı bulunamazsa test ATLANIR (hata vermez). Başka bir tarayıcı yolu
   vermek için:        TARAYICI="C:/.../chrome.exe" npm run test:pdf
   Çıktılar: testler/cikti/  (depoya girmez) */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

// tutanak.js tarayıcıda mantik.js'in fonksiyonlarını globalden bulur.
Object.assign(global, require("../js/mantik.js"));
const { tutanakBelgeHtml, tutanakSayfaCss } = require("../js/tutanak.js");
const { ornekTutanak } = require("../testler/ornek-tutanak.js");

const KOK = path.join(__dirname, "..");
const CIKTI = path.join(KOK, "testler", "cikti");
const TURKCE_HARFLER = "çğıöşüÇĞİÖŞÜ";

function tarayiciBul() {
  const adaylar = [
    process.env.TARAYICI,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ];
  return adaylar.find((yol) => yol && fs.existsSync(yol)) || null;
}

// Tutanağı, uygulamanın stil dosyasını kullanan tek başına bir sayfa olarak yazar.
function htmlDosyasiYaz(tutanak, dosya) {
  const stilAdresi = pathToFileURL(path.join(KOK, "css", "stil.css")).href;
  fs.writeFileSync(dosya,
    '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Örnek tutanak</title>' +
    '<link rel="stylesheet" href="' + stilAdresi + '">' +
    "<style>" + tutanakSayfaCss(tutanak) + "</style></head>" +
    '<body><main id="ekran"><div class="rt-sarici">' + tutanakBelgeHtml(tutanak) + "</div></main></body></html>");
}

function pdfUret(tarayici, htmlDosyasi, pdfDosyasi) {
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "tutanak-pdf-"));
  execFileSync(tarayici, [
    "--headless=new", "--disable-gpu", "--no-first-run",
    "--no-pdf-header-footer",              // tarayıcının kendi üst/alt bilgisi olmasın
    "--user-data-dir=" + profil,
    "--print-to-pdf=" + pdfDosyasi,
    pathToFileURL(htmlDosyasi).href,
  ], { stdio: "ignore", timeout: 60000 });
}

/* PDF'i inceler. PDF, "nesne"lerden oluşan bir dosyadır; sayfalar düz yazıyla
   "/Type /Page" diye işaretlenir. Yazı tipi tabloları ise sıkıştırılmış
   (zlib) akışlardadır: her yazı tipinin "ToUnicode" tablosu, PDF'teki şekil
   numaralarının hangi harfe karşılık geldiğini söyler. Bir harf bu tablolarda
   varsa, o harf PDF'e gerçek bir şekille çizilmiş demektir. */
function pdfIncele(veri) {
  const metin = veri.toString("latin1");
  const sayfaSayisi = (metin.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  const yaziTipleri = [...new Set([...metin.matchAll(/\/BaseFont\s*\/([^\s\/\[\]<>()]+)/g)].map((e) => e[1].replace(/^[A-Z]{6}\+/, "")))];

  // Bütün sıkıştırılmış akışları aç, içindeki ToUnicode tablolarından harfleri topla.
  const harfler = new Set();
  const hexMetin = (hex) => {
    let sonuc = "";
    for (let i = 0; i + 4 <= hex.length; i += 4) sonuc += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return sonuc;
  };
  let konum = 0;
  while ((konum = metin.indexOf("stream", konum)) !== -1) {
    const bas = metin.indexOf("\n", konum) + 1;
    const son = metin.indexOf("endstream", bas);
    if (son === -1) break;
    konum = son + 9;
    let acik;
    try { acik = zlib.inflateSync(veri.subarray(bas, son)).toString("latin1"); } catch (hata) { continue; }
    if (!acik.includes("beginbfchar") && !acik.includes("beginbfrange")) continue;

    for (const blok of acik.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const cift of blok[1].matchAll(/<[0-9A-Fa-f]+>\s*<([0-9A-Fa-f]+)>/g)) {
        for (const harf of hexMetin(cift[1])) harfler.add(harf);
      }
    }
    for (const blok of acik.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const uclu of blok[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const adet = parseInt(uclu[2], 16) - parseInt(uclu[1], 16);
        const ilk = parseInt(uclu[3].slice(-4), 16);
        for (let i = 0; i <= adet; i++) harfler.add(String.fromCharCode(ilk + i));
      }
    }
  }
  return { sayfaSayisi, yaziTipleri, harfler };
}

function calistir() {
  const tarayici = tarayiciBul();
  if (!tarayici) {
    console.log("ATLANDI: Edge ya da Chrome bulunamadı. TARAYICI değişkeniyle yolunu verebilirsin.");
    return;
  }
  fs.mkdirSync(CIKTI, { recursive: true });
  const htmlDosyasi = path.join(CIKTI, "ornek-tutanak.html");
  const pdfDosyasi = path.join(CIKTI, "ornek-tutanak.pdf");
  const tutanak = ornekTutanak();

  htmlDosyasiYaz(tutanak, htmlDosyasi);
  if (fs.existsSync(pdfDosyasi)) fs.rmSync(pdfDosyasi);
  pdfUret(tarayici, htmlDosyasi, pdfDosyasi);

  const sonuc = pdfIncele(fs.readFileSync(pdfDosyasi));
  const eksikHarfler = [...TURKCE_HARFLER].filter((harf) => !sonuc.harfler.has(harf));
  const serif = sonuc.yaziTipleri.some((ad) => /Times|Tinos|Liberation ?Serif|Nimbus ?Roman/i.test(ad));

  const kontroller = [
    ["Sayfa sayısı 2 (içerik ikinci sayfaya taşıyor)", sonuc.sayfaSayisi === 2, "bulunan: " + sonuc.sayfaSayisi],
    ["Türkçe harflerin hepsi PDF'te var (" + TURKCE_HARFLER + ")", eksikHarfler.length === 0, eksikHarfler.length ? "eksik: " + eksikHarfler.join(" ") : "eksik yok"],
    ["Yazı tipi serif", serif, sonuc.yaziTipleri.join(", ") || "yazı tipi bulunamadı"],
  ];
  let basarisiz = 0;
  for (const [ad, gecti, ayrinti] of kontroller) {
    console.log((gecti ? "✔ " : "✖ ") + ad + "  [" + ayrinti + "]");
    if (!gecti) basarisiz++;
  }
  console.log("PDF: " + pdfDosyasi);
  if (basarisiz) process.exit(1);
}

if (require.main === module) calistir();

module.exports = { pdfIncele };
