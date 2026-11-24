// Bütçe: saf mantık testleri.  npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const b = require("../js/butce.js");

const kalem = (tur, tutar, kategori = "Diğer", extra = {}) => ({ id: tur + tutar + kategori, tur, tutar, kategori, tarih: "2026-11-01", baslik: "x", ...extra });

test("butceOzeti: gelir, gider, kalan; bozuk tutar 0 sayılır", () => {
  const o = b.butceOzeti([kalem("gelir", 50000), kalem("gider", 12000), kalem("gider", 3000), kalem("gider", "abc")]);
  assert.deepEqual(o, { gelir: 50000, gider: 15000, kalan: 35000 });
  assert.deepEqual(b.butceOzeti([]), { gelir: 0, gider: 0, kalan: 0 });
  assert.equal(b.butceOzeti([kalem("gider", 500)]).kalan, -500, "eksiye düşebilir");
});

test("kategoriDagilimi: yalnızca giderler, büyükten küçüğe, yüzdeyle (toplam 100'e yakın)", () => {
  const d = b.kategoriDagilimi([
    kalem("gider", 6000, "Malzeme"), kalem("gider", 3000, "Kargo"), kalem("gider", 1000, "Malzeme"), kalem("gelir", 99999, "Malzeme"),
  ]);
  assert.deepEqual(d.map((x) => [x.kategori, x.tutar, x.yuzde]), [["Malzeme", 7000, 70], ["Kargo", 3000, 30]]);
  assert.deepEqual(b.kategoriDagilimi([kalem("gelir", 5)]), []);
});

test("kategoriler: pakete göre öneri listesi; ikisinde de 'Diğer' var", () => {
  assert.ok(b.kategoriler("takim").includes("Malzeme"));
  assert.ok(b.kategoriler("sirket").includes("Yazılım / abonelik"));
  for (const tur of ["takim", "sirket"]) assert.equal(b.kategoriler(tur).at(-1), "Diğer");
});

test("sponsordanGelir: anlaşılan sponsor bütçeye gelir taslağı olur; zaten eklendiyse tekrar önerilmez", () => {
  const sponsor = { id: "p1", ad: "Örnek Ltd.", tutar: 25000, asama: "anlasildi" };
  const taslak = b.sponsordanGelir(sponsor, "2026-11-24");
  assert.deepEqual(taslak, { tur: "gelir", baslik: "Örnek Ltd. — sponsorluk", tutar: 25000, kategori: "Sponsorluk", tarih: "2026-11-24", odeyen: "", aciklama: "", paydas_id: "p1" });
  assert.equal(b.butcedeMi(sponsor, [kalem("gelir", 25000, "Sponsorluk", { paydas_id: "p1" })]), true);
  assert.equal(b.butcedeMi(sponsor, [kalem("gelir", 25000)]), false);
});

test("kalemleriSirala: yeniden eskiye (tarih, sonra oluşturma)", () => {
  const s = b.kalemleriSirala([
    { id: "a", tarih: "2026-10-01", olusturma: "1" }, { id: "b", tarih: "2026-11-05", olusturma: "1" }, { id: "c", tarih: "2026-11-05", olusturma: "2" },
  ]);
  assert.deepEqual(s.map((k) => k.id), ["c", "b", "a"]);
});
