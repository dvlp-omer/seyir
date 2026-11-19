// Uygulama ikonlarını (PNG) ikonlar/ikon.svg'den üretir: ikon-192.png, ikon-512.png, ikon-maskable-512.png
//
// Neden betik? PNG elle yazılamaz; resim kütüphanesi de kurmak istemedik. Bilgisayarda zaten
// kurulu olan Chrome'u penceresiz (headless) açıp SVG'nin ekran görüntüsünü alıyoruz.
// İkonlar depoda hazır durur; yalnızca logoyu değiştirirsen yeniden çalıştır:
//     node araclar/ikon-uret.js
// Chrome başka bir yerdeyse: CHROME="yol/chrome.exe" node araclar/ikon-uret.js
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const klasor = path.join(__dirname, "..", "ikonlar");
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "seyir-ikon-"));
const svg = fs.readFileSync(path.join(klasor, "ikon.svg"), "utf8");

// maskable: telefon ikonu daire/damla şeklinde kırpabilir. Zemin tüm kareyi doldurur,
// logo ortadaki güvenli bölgeye (%80'lik daire) sığacak kadar küçültülür.
const maskeli = svg
  .replace(/<rect [^>]*\/>/, '<rect width="64" height="64" fill="#0b0e22"/>')
  .replace(/(<\/defs>\s*<rect [^>]*\/>)/, "$1<g transform=\"translate(32 32) scale(.78) translate(-32 -32)\">")
  .replace("</svg>", "</g></svg>");

function uret(icerik, boyut, ad) {
  const html = path.join(gecici, ad + ".html");
  fs.writeFileSync(html, `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${boyut}px;height:${boyut}px}</style>${icerik}`);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
    "--user-data-dir=" + path.join(gecici, "profil"), `--window-size=${boyut},${boyut}`,
    "--screenshot=" + path.join(klasor, ad), require("url").pathToFileURL(html).href], { stdio: "ignore" });
  console.log("yazıldı: ikonlar/" + ad);
}

uret(svg, 192, "ikon-192.png");
uret(svg, 512, "ikon-512.png");
uret(maskeli, 512, "ikon-maskable-512.png");
fs.rmSync(gecici, { recursive: true, force: true });
