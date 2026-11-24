// Projeler: saf mantık testleri.  npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const p = require("../js/proje.js");

const proje = (id, durum, bitis = "") => ({ id, ad: "Proje " + id, durum, bitis });
const gorev = (proje_id, durum) => ({ id: proje_id + durum + Math.random(), proje_id, durum });

test("durumlar: planlama, devam, beklemede, tamamlandı, iptal", () => {
  assert.deepEqual(p.PROJE_DURUMLARI.map((d) => d.deger), ["planlama", "devam", "beklemede", "tamamlandi", "iptal"]);
  assert.equal(p.projeDurumEtiketi("devam"), "Devam ediyor");
  assert.equal(p.projeDurumEtiketi("x"), "Planlama");
});

test("projeIlerleme: projeye bağlı görevlerden; biten / toplam ve yüzde; görevi yoksa 0", () => {
  const gorevler = [gorev("a", "bitti"), gorev("a", "bitti"), gorev("a", "yapiliyor"), gorev("a", "yapilacak"), gorev("b", "bitti"), gorev("", "bitti")];
  assert.deepEqual(p.projeIlerleme(proje("a", "devam"), gorevler), { toplam: 4, biten: 2, yuzde: 50 });
  assert.deepEqual(p.projeIlerleme(proje("c", "devam"), gorevler), { toplam: 0, biten: 0, yuzde: 0 });
  assert.equal(p.projeIlerleme(proje("b", "tamamlandi"), []).yuzde, 100, "tamamlanan proje görevsiz de %100");
});

test("projeGecikti: açık proje teslim tarihini geçtiyse; tamamlanan / iptal / tarihsiz gecikmez", () => {
  assert.equal(p.projeGecikti(proje("a", "devam", "2026-11-20"), "2026-11-24"), true);
  assert.equal(p.projeGecikti(proje("a", "devam", "2026-11-30"), "2026-11-24"), false);
  assert.equal(p.projeGecikti(proje("a", "tamamlandi", "2026-11-20"), "2026-11-24"), false);
  assert.equal(p.projeGecikti(proje("a", "iptal", "2026-11-20"), "2026-11-24"), false);
  assert.equal(p.projeGecikti(proje("a", "devam", ""), "2026-11-24"), false);
});

test("projeleriSirala: açık projeler teslim tarihine göre (tarihsiz sonda), sonra tamamlanan, en son iptal", () => {
  const s = p.projeleriSirala([
    proje("iptal", "iptal", "2026-01-01"), proje("bitti", "tamamlandi", "2026-01-01"),
    proje("tarihsiz", "planlama"), proje("gec", "devam", "2026-12-20"), proje("erken", "beklemede", "2026-11-30"),
  ]);
  assert.deepEqual(s.map((x) => x.id), ["erken", "gec", "tarihsiz", "bitti", "iptal"]);
});

test("projeOzeti: açık, geciken ve tamamlanan sayıları", () => {
  const o = p.projeOzeti([proje("a", "devam", "2026-11-20"), proje("b", "planlama"), proje("c", "tamamlandi"), proje("d", "iptal")], "2026-11-24");
  assert.deepEqual(o, { acik: 2, geciken: 1, tamamlanan: 1 });
});
