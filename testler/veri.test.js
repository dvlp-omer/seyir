// Veri katmanı testleri. Çalıştırmak için:  node --test "testler/*.test.js"   (ya da: npm test)
// Node'un kendi test aracını kullanıyoruz; ek kurulum gerekmez.
const test = require("node:test");
const assert = require("node:assert/strict");
const { yerelDepoOlustur, filtreyeUyar, kimlikUret } = require("../js/veri.js");

// Tarayıcıdaki localStorage'ın yerine geçen basit bir taklit.
function sahteDepolama() {
  const kutu = {};
  return {
    getItem: (anahtar) => (anahtar in kutu ? kutu[anahtar] : null),
    setItem: (anahtar, deger) => { kutu[anahtar] = String(deger); },
    kutu,
  };
}

test("ekle: kayda id ve oluşturma zamanı verir, oku ile geri gelir", async () => {
  const depo = yerelDepoOlustur(sahteDepolama());
  const eklenen = await depo.ekle("uyeler", { ad: "Ayşe", rol: "kaptan" });

  assert.ok(eklenen.id);
  assert.ok(eklenen.olusturma);
  assert.deepEqual(await depo.oku("uyeler", eklenen.id), eklenen);
});

test("oku: olmayan kayıt için null döner", async () => {
  const depo = yerelDepoOlustur(sahteDepolama());
  assert.equal(await depo.oku("uyeler", "yok"), null);
});

test("listele: filtre verilirse sadece eşleşenleri döner", async () => {
  const depo = yerelDepoOlustur(sahteDepolama());
  await depo.ekle("gorevler", { baslik: "A", takim_id: "t1" });
  await depo.ekle("gorevler", { baslik: "B", takim_id: "t2" });
  await depo.ekle("gorevler", { baslik: "C", takim_id: "t1" });

  assert.equal((await depo.listele("gorevler")).length, 3);
  const t1 = await depo.listele("gorevler", { takim_id: "t1" });
  assert.deepEqual(t1.map((g) => g.baslik), ["A", "C"]);
});

test("guncelle: sadece verilen alanları değiştirir, id sabit kalır", async () => {
  const depo = yerelDepoOlustur(sahteDepolama());
  const gorev = await depo.ekle("gorevler", { baslik: "Rapor", durum: "yapilacak" });

  const guncel = await depo.guncelle("gorevler", gorev.id, { durum: "bitti", id: "baska" });

  assert.equal(guncel.durum, "bitti");
  assert.equal(guncel.baslik, "Rapor");
  assert.equal(guncel.id, gorev.id);
  assert.equal((await depo.oku("gorevler", gorev.id)).durum, "bitti");
});

test("guncelle: olmayan kayıtta hata verir", async () => {
  const depo = yerelDepoOlustur(sahteDepolama());
  await assert.rejects(() => depo.guncelle("gorevler", "yok", { durum: "bitti" }));
});

test("sil: kaydı kaldırır, diğerlerine dokunmaz", async () => {
  const depo = yerelDepoOlustur(sahteDepolama());
  const a = await depo.ekle("uyeler", { ad: "A" });
  const b = await depo.ekle("uyeler", { ad: "B" });

  await depo.sil("uyeler", a.id);

  const kalan = await depo.listele("uyeler");
  assert.deepEqual(kalan.map((u) => u.id), [b.id]);
});

test("veri kalıcıdır: aynı depolamayla açılan yeni depo eski kayıtları görür", async () => {
  const depolama = sahteDepolama();
  await yerelDepoOlustur(depolama).ekle("takimlar", { ad: "ROTA İSAS" });

  const liste = await yerelDepoOlustur(depolama).listele("takimlar");
  assert.equal(liste[0].ad, "ROTA İSAS");
});

test("bilinmeyen koleksiyon adı hata verir", async () => {
  const depo = yerelDepoOlustur(sahteDepolama());
  await assert.rejects(() => depo.listele("gorevlerr"));
});

test("bozuk kayıt uygulamayı çökertmez, boş liste döner", async () => {
  const depolama = sahteDepolama();
  depolama.setItem("takim-asistani:uyeler", "{bozuk json");
  const depo = yerelDepoOlustur(depolama);
  // console.error çıktısı testi kirletmesin
  const eski = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await depo.listele("uyeler"), []);
  } finally {
    console.error = eski;
  }
});

test("filtreyeUyar ve kimlikUret", () => {
  assert.equal(filtreyeUyar({ a: 1, b: 2 }, { a: 1 }), true);
  assert.equal(filtreyeUyar({ a: 1 }, { a: 2 }), false);
  assert.equal(filtreyeUyar({ a: 1 }, undefined), true);
  assert.notEqual(kimlikUret(), kimlikUret());
});
