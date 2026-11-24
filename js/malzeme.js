/* ==========================================================================
   MALZEME (takım paketi) / ENVANTER (şirket paketi) — saf mantık, testli: testler/malzeme.test.js
   Bir parçanın yolculuğu: İhtiyaç → Sipariş edildi → Yolda → Geldi → Kullanımda
   (ya da Arızalı). Kimde olduğu, nerede durduğu ve ne zaman geleceği tutulur.
   Alınan malzeme tek tıkla bütçeye gider olarak eklenir (kalem malzeme_id taşır;
   iki kez eklenmez).
   ========================================================================== */

const MALZEME_DURUMLARI = [
  { deger: "lazim", etiket: "İhtiyaç" },
  { deger: "siparis", etiket: "Sipariş edildi" },
  { deger: "yolda", etiket: "Yolda" },
  { deger: "geldi", etiket: "Geldi" },
  { deger: "kullanimda", etiket: "Kullanımda" },
  { deger: "arizali", etiket: "Arızalı" },
];
const BEKLENEN = ["siparis", "yolda"];      // parası çıktı, henüz elde değil
const ALINMIS = ["siparis", "yolda", "geldi", "kullanimda", "arizali"];

function durumEtiketi(durum) {
  return (MALZEME_DURUMLARI.find((d) => d.deger === durum) || MALZEME_DURUMLARI[0]).etiket;
}

function toplamTutar(p) {
  const adet = Number(p.adet);
  const fiyat = Number(p.birim_fiyat);
  return Number.isFinite(adet) && Number.isFinite(fiyat) ? Math.max(0, adet) * Math.max(0, fiyat) : 0;
}

// Duruma göre sayılar, bekleyen (sipariş + yolda) tutar ve beklenen tarihi geçmiş teslimler
function malzemeOzeti(kayitlar, bugun) {
  const sayilar = Object.fromEntries(MALZEME_DURUMLARI.map((d) => [d.deger, 0]));
  let bekleyenTutar = 0;
  const geciken = [];
  for (const p of kayitlar) {
    const durum = sayilar[p.durum] === undefined ? "lazim" : p.durum;
    sayilar[durum] += 1;
    if (BEKLENEN.includes(durum)) {
      bekleyenTutar += toplamTutar(p);
      if (p.beklenen_tarih && p.beklenen_tarih < bugun) geciken.push(p);
    }
  }
  return { sayilar, bekleyenTutar, geciken };
}

function butceyeEklenebilirMi(p) {
  return ALINMIS.includes(p.durum) && toplamTutar(p) > 0;
}

// Alınan malzeme -> bütçe gider kalemi taslağı (kategori pakete göre)
function malzemedenGider(p, bugun, kurumTuru) {
  const adet = Number(p.adet) || 1;
  return {
    tur: "gider", baslik: p.ad + (adet > 1 ? " (" + adet + " adet)" : ""), tutar: toplamTutar(p),
    kategori: kurumTuru === "sirket" ? "Donanım" : "Malzeme", tarih: bugun,
    odeyen: "", aciklama: p.tedarikci ? "Tedarikçi: " + p.tedarikci : "", paydas_id: "", malzeme_id: p.id,
  };
}

function butcedeMiMalzeme(p, butceKalemleri) {
  return butceKalemleri.some((k) => k.malzeme_id === p.id);
}

function malzemeleriSirala(kayitlar) {
  const sira = { lazim: 0, siparis: 1, yolda: 2, geldi: 3, kullanimda: 4, arizali: 5 };
  return [...kayitlar].sort((a, b) =>
    (sira[a.durum] ?? 0) - (sira[b.durum] ?? 0) || String(a.ad).localeCompare(String(b.ad), "tr"));
}

if (typeof module !== "undefined") {
  module.exports = {
    MALZEME_DURUMLARI, durumEtiketi, toplamTutar, malzemeOzeti, butceyeEklenebilirMi,
    malzemedenGider, butcedeMiMalzeme, malzemeleriSirala,
  };
}
