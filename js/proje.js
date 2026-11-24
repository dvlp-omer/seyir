/* ==========================================================================
   PROJELER — saf mantık, testli: testler/proje.test.js
   Bir proje; müşteriye (paydas_id) bağlı olabilir, teslim tarihi vardır.
   İlerleme elle girilmez: projeye bağlı görevlerden (gorevler.proje_id)
   biten / toplam olarak hesaplanır.
   ========================================================================== */

const PROJE_DURUMLARI = [
  { deger: "planlama", etiket: "Planlama" },
  { deger: "devam", etiket: "Devam ediyor" },
  { deger: "beklemede", etiket: "Beklemede" },
  { deger: "tamamlandi", etiket: "Tamamlandı" },
  { deger: "iptal", etiket: "İptal" },
];
const ACIK_PROJE = ["planlama", "devam", "beklemede"];

function projeDurumEtiketi(durum) {
  return (PROJE_DURUMLARI.find((d) => d.deger === durum) || PROJE_DURUMLARI[0]).etiket;
}

function projeIlerleme(proje, gorevler) {
  const bagli = gorevler.filter((g) => g.proje_id && g.proje_id === proje.id);
  const biten = bagli.filter((g) => g.durum === "bitti").length;
  if (!bagli.length) return { toplam: 0, biten: 0, yuzde: proje.durum === "tamamlandi" ? 100 : 0 };
  return { toplam: bagli.length, biten, yuzde: Math.round((biten / bagli.length) * 100) };
}

function projeGecikti(proje, bugun) {
  return ACIK_PROJE.includes(proje.durum) && Boolean(proje.bitis) && proje.bitis < bugun;
}

function projeleriSirala(projeler) {
  const grup = (x) => (ACIK_PROJE.includes(x.durum) ? 0 : x.durum === "tamamlandi" ? 1 : 2);
  return [...projeler].sort((a, b) =>
    grup(a) - grup(b) ||
    (a.bitis ? 0 : 1) - (b.bitis ? 0 : 1) ||
    String(a.bitis || "").localeCompare(String(b.bitis || "")) ||
    String(a.ad).localeCompare(String(b.ad), "tr"));
}

function projeOzeti(projeler, bugun) {
  return {
    acik: projeler.filter((x) => ACIK_PROJE.includes(x.durum)).length,
    geciken: projeler.filter((x) => projeGecikti(x, bugun)).length,
    tamamlanan: projeler.filter((x) => x.durum === "tamamlandi").length,
  };
}

if (typeof module !== "undefined") {
  module.exports = { PROJE_DURUMLARI, ACIK_PROJE, projeDurumEtiketi, projeIlerleme, projeGecikti, projeleriSirala, projeOzeti };
}
