/* ==========================================================================
   SPONSORLAR / MÜŞTERİLER (paydaşlar) — saf mantık, testli: testler/paydas.test.js
   Takım paketinde "Sponsorlar", şirket paketinde "Müşteriler" adıyla görünür
   (js/kurum.js > SOZLUKLER). İkisi de aynı işi yapar: bir kurumla ilişkiyi
   aşama aşama takip etmek, sonraki adımı ve tutarı unutmamak.
   ========================================================================== */

const ASAMALAR = [
  { deger: "aday", etiket: "Aday" },
  { deger: "iletisimde", etiket: "İletişimde" },
  { deger: "gorusme", etiket: "Görüşme" },
  { deger: "anlasildi", etiket: "Anlaşıldı" },
  { deger: "olmadi", etiket: "Olmadı" },
];
const SURECTEKI = ["aday", "iletisimde", "gorusme"];

function asamaEtiketi(asama) {
  return (ASAMALAR.find((a) => a.deger === asama) || ASAMALAR[0]).etiket;
}

// Aşama sayıları, anlaşılan toplam ve süreçte bekleyen toplam (olmadılar sayılmaz)
function paydasOzeti(kayitlar) {
  const sayilar = Object.fromEntries(ASAMALAR.map((a) => [a.deger, 0]));
  let anlasilan = 0;
  let surecte = 0;
  for (const k of kayitlar) {
    const asama = sayilar[k.asama] === undefined ? "aday" : k.asama;
    sayilar[asama] += 1;
    const tutar = Number(k.tutar) || 0;
    if (asama === "anlasildi") anlasilan += tutar;
    if (SURECTEKI.includes(asama)) surecte += tutar;
  }
  return { sayilar, anlasilan, surecte, toplam: kayitlar.length };
}

// Süreçteki kayıtların tarihli sonraki adımları, tarihe göre; geçmiş tarihliler "gecikti"
function yaklasanAdimlar(kayitlar, bugun) {
  return kayitlar
    .filter((k) => SURECTEKI.includes(k.asama) && k.sonraki_tarih)
    .sort((a, b) => a.sonraki_tarih.localeCompare(b.sonraki_tarih))
    .map((k) => ({ ...k, gecikti: k.sonraki_tarih < bugun }));
}

function tutarYaz(tutar) {
  const sayi = Number(tutar) || 0;
  return sayi > 0 ? "₺" + sayi.toLocaleString("tr-TR") : "—";
}

// Listede sıra: süreçteki (ilerlemiş olan üstte), sonra anlaşılan, en son olmayan; eşitse ada göre
function paydaslariSirala(kayitlar) {
  const sira = { gorusme: 0, iletisimde: 1, aday: 2, anlasildi: 3, olmadi: 4 };
  return [...kayitlar].sort((a, b) =>
    (sira[a.asama] ?? 2) - (sira[b.asama] ?? 2) || String(a.ad).localeCompare(String(b.ad), "tr"));
}

if (typeof module !== "undefined") {
  module.exports = { ASAMALAR, SURECTEKI, asamaEtiketi, paydasOzeti, yaklasanAdimlar, tutarYaz, paydaslariSirala };
}
