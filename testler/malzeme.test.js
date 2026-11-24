// Malzeme (takım) / Envanter (şirket): saf mantık testleri.  npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../js/malzeme.js");

const parca = (ad, durum, ekstra = {}) => ({ id: ad, ad, durum, adet: 1, birim_fiyat: 0, beklenen_tarih: "", ...ekstra });

test("durumlar sırayla: ihtiyaç -> sipariş -> yolda -> geldi -> kullanımda / arızalı", () => {
  assert.deepEqual(m.MALZEME_DURUMLARI.map((d) => d.deger), ["lazim", "siparis", "yolda", "geldi", "kullanimda", "arizali"]);
  assert.equal(m.durumEtiketi("yolda"), "Yolda");
  assert.equal(m.durumEtiketi("bilinmeyen"), "İhtiyaç");
});

test("toplamTutar: adet × birim fiyat; bozuk değer 0", () => {
  assert.equal(m.toplamTutar(parca("a", "siparis", { adet: 3, birim_fiyat: 1200 })), 3600);
  assert.equal(m.toplamTutar(parca("a", "siparis", { adet: "x", birim_fiyat: 1200 })), 0);
});

test("malzemeOzeti: duruma göre sayılar, bekleyen (sipariş + yolda) tutar, geciken teslimler", () => {
  const o = m.malzemeOzeti([
    parca("Motor", "yolda", { adet: 2, birim_fiyat: 4800, beklenen_tarih: "2026-11-20" }),
    parca("Sensör", "siparis", { adet: 1, birim_fiyat: 2750, beklenen_tarih: "2026-11-30" }),
    parca("Kablo", "lazim"), parca("Kamera", "geldi"), parca("Pil", "arizali"),
  ], "2026-11-24");
  assert.equal(o.sayilar.yolda, 1);
  assert.equal(o.sayilar.lazim, 1);
  assert.equal(o.bekleyenTutar, 2 * 4800 + 2750);
  assert.deepEqual(o.geciken.map((p) => p.ad), ["Motor"], "beklenen tarihi geçmiş ve henüz gelmemiş");
});

test("malzemedenGider: alınan malzeme bütçeye gider taslağı olur; eklenmişse tekrar önerilmez", () => {
  const p = parca("İtici motor", "geldi", { adet: 2, birim_fiyat: 4800, tedarikci: "Örnek Market" });
  assert.deepEqual(m.malzemedenGider(p, "2026-11-24", "takim"), {
    tur: "gider", baslik: "İtici motor (2 adet)", tutar: 9600, kategori: "Malzeme", tarih: "2026-11-24",
    odeyen: "", aciklama: "Tedarikçi: Örnek Market", paydas_id: "", malzeme_id: "İtici motor",
  });
  assert.equal(m.malzemedenGider(parca("Lisans", "geldi"), "2026-11-24", "sirket").kategori, "Donanım");
  assert.equal(m.butcedeMiMalzeme(p, [{ malzeme_id: "İtici motor" }]), true);
  assert.equal(m.butcedeMiMalzeme(p, [{ malzeme_id: "" }]), false);
  assert.equal(m.butceyeEklenebilirMi(parca("Kablo", "lazim", { adet: 1, birim_fiyat: 50 })), false, "henüz alınmadı");
  assert.equal(m.butceyeEklenebilirMi(parca("Kablo", "siparis", { adet: 1, birim_fiyat: 0 })), false, "tutar yok");
  assert.equal(m.butceyeEklenebilirMi(parca("Kablo", "siparis", { adet: 1, birim_fiyat: 50 })), true);
});

test("malzemeleriSirala: ilerleyişe göre (ihtiyaç ve sipariş üstte, arızalı en altta), eşitse ada göre", () => {
  const s = m.malzemeleriSirala([parca("Zil", "geldi"), parca("Ana kart", "lazim"), parca("Pil", "arizali"), parca("Batarya", "lazim"), parca("Cıvata", "yolda")]);
  assert.deepEqual(s.map((p) => p.ad), ["Ana kart", "Batarya", "Cıvata", "Zil", "Pil"]);
});
