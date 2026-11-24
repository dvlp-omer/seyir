// Sponsorlar / Müşteriler (paydaşlar): saf mantık testleri.  npm test
// Kurum adları UYDURMADIR.
const test = require("node:test");
const assert = require("node:assert/strict");
const p = require("../js/paydas.js");

const kayit = (ad, asama, tutar = 0, sonraki_tarih = "") => ({ id: ad, ad, asama, tutar, sonraki_tarih, sonraki_adim: sonraki_tarih ? "Ara" : "" });

test("aşamalar sırayla: aday -> iletişimde -> görüşme -> anlaşıldı / olmadı", () => {
  assert.deepEqual(p.ASAMALAR.map((a) => a.deger), ["aday", "iletisimde", "gorusme", "anlasildi", "olmadi"]);
  assert.equal(p.asamaEtiketi("gorusme"), "Görüşme");
  assert.equal(p.asamaEtiketi("bilinmeyen"), "Aday");
});

test("paydasOzeti: aşama sayıları, anlaşılan toplam ve süreçteki (beklenen) toplam", () => {
  const ozet = p.paydasOzeti([
    kayit("A Ltd.", "anlasildi", 25000), kayit("B A.Ş.", "anlasildi", 10000),
    kayit("C", "gorusme", 40000), kayit("D", "iletisimde", 5000), kayit("E", "olmadi", 90000), kayit("F", "aday"),
  ]);
  assert.equal(ozet.sayilar.anlasildi, 2);
  assert.equal(ozet.sayilar.aday, 1);
  assert.equal(ozet.sayilar.olmadi, 1);
  assert.equal(ozet.anlasilan, 35000);
  assert.equal(ozet.surecte, 45000, "olmadı ve anlaşıldı sayılmaz");
  assert.equal(ozet.toplam, 6);
  assert.deepEqual(p.paydasOzeti([]).sayilar, { aday: 0, iletisimde: 0, gorusme: 0, anlasildi: 0, olmadi: 0 });
});

test("yaklasanAdimlar: süreçteki kayıtların sonraki adımları tarihe göre; geciken işaretli; kapananlar yok", () => {
  const adimlar = p.yaklasanAdimlar([
    kayit("Geç", "iletisimde", 0, "2026-11-20"),
    kayit("Yakın", "gorusme", 0, "2026-11-26"),
    kayit("Tarihsiz", "aday"),
    kayit("Kapandı", "anlasildi", 0, "2026-11-25"),
    kayit("Olmadı", "olmadi", 0, "2026-11-25"),
  ], "2026-11-24");
  assert.deepEqual(adimlar.map((a) => [a.ad, a.gecikti]), [["Geç", true], ["Yakın", false]]);
});

test("tutarYaz: Türk lirası, binlik ayraçlı; sıfır ya da boşsa tire", () => {
  assert.equal(p.tutarYaz(25000), "₺25.000");
  assert.equal(p.tutarYaz(1250000), "₺1.250.000");
  assert.equal(p.tutarYaz(0), "—");
  assert.equal(p.tutarYaz(undefined), "—");
});

test("paydaslariSirala: önce süreçtekiler (aşama ilerledikçe üstte), sonra anlaşılan, en son olmayan; eşitse ada göre", () => {
  const sirali = p.paydaslariSirala([
    kayit("Zeta", "olmadi"), kayit("Beta", "aday"), kayit("Alfa", "aday"), kayit("Gama", "anlasildi"), kayit("Delta", "gorusme"),
  ]);
  assert.deepEqual(sirali.map((k) => k.ad), ["Delta", "Alfa", "Beta", "Gama", "Zeta"]);
});
