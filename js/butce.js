/* ==========================================================================
   BÜTÇE — saf mantık, testli: testler/butce.test.js
   Gelir ve gider kalemleri; toplam, kalan ve kategoriye göre gider dağılımı.
   Sponsorlarda "Anlaşıldı" olan tutar tek tıkla bütçeye gelir olarak eklenir
   (kalem, sponsorun kimliğini paydas_id'de taşır; böylece iki kez eklenmez).
   ========================================================================== */

const BUTCE_TURLERI = [
  { deger: "gider", etiket: "Gider" },
  { deger: "gelir", etiket: "Gelir" },
];

const KATEGORI_LISTELERI = {
  takim: ["Sponsorluk", "Bağış", "Malzeme", "Elektronik", "Kargo", "Yol / konaklama", "Baskı / tanıtım", "Yarışma ücreti", "Diğer"],
  sirket: ["Satış", "Sponsorluk", "Personel", "Yazılım / abonelik", "Donanım", "Pazarlama", "Ulaşım", "Ofis", "Diğer"],
};

function kategoriler(tur) {
  return KATEGORI_LISTELERI[tur] || KATEGORI_LISTELERI.takim;
}

const tutarSayisi = (k) => Math.max(0, Number(k.tutar) || 0);

function butceOzeti(kalemler) {
  let gelir = 0;
  let gider = 0;
  for (const k of kalemler) {
    if (k.tur === "gelir") gelir += tutarSayisi(k);
    else if (k.tur === "gider") gider += tutarSayisi(k);
  }
  return { gelir, gider, kalan: gelir - gider };
}

// Giderlerin kategoriye göre dağılımı, büyükten küçüğe; yüzde tam sayıya yuvarlanır
function kategoriDagilimi(kalemler) {
  const toplamlar = new Map();
  for (const k of kalemler) {
    if (k.tur !== "gider") continue;
    const ad = k.kategori || "Diğer";
    toplamlar.set(ad, (toplamlar.get(ad) || 0) + tutarSayisi(k));
  }
  const genel = [...toplamlar.values()].reduce((a, b) => a + b, 0);
  return [...toplamlar.entries()]
    .map(([kategori, tutar]) => ({ kategori, tutar, yuzde: genel ? Math.round((tutar / genel) * 100) : 0 }))
    .sort((a, b) => b.tutar - a.tutar || a.kategori.localeCompare(b.kategori, "tr"));
}

// Anlaşılan sponsor -> bütçe gelir kalemi taslağı
function sponsordanGelir(paydas, bugun) {
  return {
    tur: "gelir", baslik: paydas.ad + " — sponsorluk", tutar: Number(paydas.tutar) || 0, kategori: "Sponsorluk",
    tarih: bugun, odeyen: "", aciklama: "", paydas_id: paydas.id,
  };
}

function butcedeMi(paydas, kalemler) {
  return kalemler.some((k) => k.paydas_id === paydas.id);
}

// Yeniden eskiye
function kalemleriSirala(kalemler) {
  return [...kalemler].sort((a, b) =>
    String(b.tarih || "").localeCompare(String(a.tarih || "")) || String(b.olusturma || "").localeCompare(String(a.olusturma || "")));
}

if (typeof module !== "undefined") {
  module.exports = { BUTCE_TURLERI, kategoriler, butceOzeti, kategoriDagilimi, sponsordanGelir, butcedeMi, kalemleriSirala };
}
