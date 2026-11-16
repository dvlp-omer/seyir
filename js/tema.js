/* ==========================================================================
   TEMA — açık / koyu görünüm
   Bu dosya <head> içinde, sayfa çizilmeden ÖNCE yüklenir; yoksa koyu tema
   kullanan biri her açılışta bir an beyaz ekran görürdü.

   Kullanıcının tercihi üç değerden biridir:
     "sistem" (varsayılan) : cihazın ayarına uy
     "acik" / "koyu"       : her zaman o tema
   Sonuç <html data-tema="acik|koyu"> olarak yazılır; renkleri css/stil.css
   içindeki değişken blokları belirler. Burada renk yoktur.
   ========================================================================== */

const TEMA_ANAHTARI = "takim-asistani:tema";
const TEMA_SECENEKLERI = [
  { deger: "sistem", etiket: "Cihaza uy" },
  { deger: "acik", etiket: "Açık" },
  { deger: "koyu", etiket: "Koyu" },
];

// Saf fonksiyon: tercih + cihazın durumu -> uygulanacak tema. (Testi var.)
function temaHesapla(tercih, sistemKoyu) {
  if (tercih === "koyu") return "koyu";
  if (tercih === "acik") return "acik";
  return sistemKoyu ? "koyu" : "acik";
}

function temaTercihi() {
  try {
    const kayitli = localStorage.getItem(TEMA_ANAHTARI);
    return TEMA_SECENEKLERI.some((s) => s.deger === kayitli) ? kayitli : "sistem";
  } catch (hata) {
    return "sistem"; // localStorage kapalıysa cihaza uy
  }
}

function temaUygula() {
  const sistemKoyu = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const tema = temaHesapla(temaTercihi(), sistemKoyu);
  document.documentElement.dataset.tema = tema;
  // Telefonlarda tarayıcı çubuğunun rengi de temaya uysun
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = tema === "koyu" ? "#0a171f" : "#0b2231";
}

function temaSec(tercih) {
  localStorage.setItem(TEMA_ANAHTARI, tercih);
  temaUygula();
}

// Tarayıcıda hemen uygula; cihazın teması değişirse (gece modu) yeniden uygula.
if (typeof document !== "undefined") {
  temaUygula();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", temaUygula);
}

if (typeof module !== "undefined") {
  module.exports = { temaHesapla };
}
