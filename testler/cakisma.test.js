// Aynı anda düzenleme (çakışma) testleri.  npm test
//
// Senaryo: iki kullanıcı (Ayşe ve Mert) aynı görevi ekranında görüyor.
// Ayşe kaydediyor; Mert eski hâli üzerinden kaydetmeye çalışınca uyarı almalı
// ve Ayşe'nin değişikliği KAYBOLMAMALI. Aynı testler iki depoda da çalışır.
const test = require("node:test");
const assert = require("node:assert/strict");
const { yerelDepoOlustur, supabaseDepoOlustur, CakismaHatasi } = require("../js/veri.js");
const { sahteSupabase } = require("./sahte-supabase.js");

function sahteDepolama() {
  const kutu = {};
  return { getItem: (a) => (a in kutu ? kutu[a] : null), setItem: (a, d) => { kutu[a] = String(d); } };
}

// Aynı veriyi paylaşan iki ayrı depo (iki kişi / iki sekme)
const KURULUMLAR = {
  yerel() {
    const depolama = sahteDepolama();
    return [yerelDepoOlustur(depolama), yerelDepoOlustur(depolama)];
  },
  supabase() {
    const sunucu = sahteSupabase();
    const yap = () => supabaseDepoOlustur("https://ornek.supabase.co", "anahtar", { istek: sunucu.sahteFetch });
    return [yap(), yap()];
  },
};

for (const [ad, kur] of Object.entries(KURULUMLAR)) {
  test(ad + ": eski hâl üzerinden kaydetmek CakismaHatasi verir, öbürünün değişikliği korunur", async () => {
    const [ayse, mert] = kur();
    const gorev = await ayse.ekle("gorevler", { baslik: "Rapor", durum: "yapilacak" });
    await mert.listele("gorevler");                      // Mert ekranı açtı (sürüm 1)

    await ayse.oku("gorevler", gorev.id);
    await ayse.guncelle("gorevler", gorev.id, { baslik: "Rapor (Ayşe)" });   // sürüm 2

    await assert.rejects(() => mert.guncelle("gorevler", gorev.id, { durum: "bitti" }), CakismaHatasi);
    const simdiki = await ayse.oku("gorevler", gorev.id);
    assert.equal(simdiki.baslik, "Rapor (Ayşe)");
    assert.equal(simdiki.durum, "yapilacak");             // Mert'in değişikliği yazılmadı
  });

  test(ad + ": uyarıdan sonra ikinci kez kaydetmek bilerek üzerine yazar", async () => {
    const [ayse, mert] = kur();
    const gorev = await ayse.ekle("gorevler", { baslik: "Rapor", durum: "yapilacak" });
    await mert.listele("gorevler");
    await ayse.guncelle("gorevler", gorev.id, { baslik: "Rapor (Ayşe)" });

    await assert.rejects(() => mert.guncelle("gorevler", gorev.id, { durum: "bitti" }), CakismaHatasi);
    const son = await mert.guncelle("gorevler", gorev.id, { durum: "bitti" });
    assert.equal(son.durum, "bitti");
    assert.equal(son.surum, 3);
  });

  test(ad + ": kendi art arda kaydetmeleri çakışma sayılmaz", async () => {
    const [ayse] = kur();
    const gorev = await ayse.ekle("gorevler", { baslik: "Rapor", durum: "yapilacak" });
    await ayse.guncelle("gorevler", gorev.id, { durum: "yapiliyor" });
    await ayse.guncelle("gorevler", gorev.id, { durum: "bitti" });
    assert.equal((await ayse.oku("gorevler", gorev.id)).surum, 3);
  });

  test(ad + ": zorla seçeneği denetimi atlar (programın toplu işleri için)", async () => {
    const [ayse, mert] = kur();
    const gorev = await ayse.ekle("gorevler", { baslik: "Rapor", sorumlu_id: "u1" });
    await mert.listele("gorevler");
    await ayse.guncelle("gorevler", gorev.id, { baslik: "Rapor (Ayşe)" });
    await mert.guncelle("gorevler", gorev.id, { sorumlu_id: "" }, { zorla: true });
    const simdiki = await ayse.oku("gorevler", gorev.id);
    assert.equal(simdiki.sorumlu_id, "");
    assert.equal(simdiki.baslik, "Rapor (Ayşe)");
  });

  test(ad + ": başkası silmişse 'bulunamadı' der, çakışma demez", async () => {
    const [ayse, mert] = kur();
    const gorev = await ayse.ekle("gorevler", { baslik: "Rapor" });
    await mert.listele("gorevler");
    await ayse.sil("gorevler", gorev.id);
    await assert.rejects(() => mert.guncelle("gorevler", gorev.id, { baslik: "x" }), (h) => !(h instanceof CakismaHatasi) && /bulunamadı/.test(h.message));
  });
}

test("supabase: sürüm sütunu olmayan eski veritabanında denetim atlanır, güncelleme çalışır", async () => {
  const sunucu = sahteSupabase({ surumsuz: true });
  const depo = supabaseDepoOlustur("https://ornek.supabase.co", "anahtar", { istek: sunucu.sahteFetch });
  const gorev = await depo.ekle("gorevler", { baslik: "Rapor" });
  await depo.listele("gorevler");
  const son = await depo.guncelle("gorevler", gorev.id, { baslik: "Yeni" });
  assert.equal(son.baslik, "Yeni");
  const yama = sunucu.istekler.find((i) => i.method === "PATCH");
  assert.equal(yama.adres.includes("surum="), false);
});

test("yerel: sürüm alanı olmayan eski kayıt 1 sayılır, güncellenebilir", async () => {
  const depolama = sahteDepolama();
  depolama.setItem("takim-asistani:gorevler", JSON.stringify([{ id: "g1", baslik: "Eski", olusturma: "2026-01-01T00:00:00Z" }]));
  const depo = yerelDepoOlustur(depolama);
  await depo.listele("gorevler");
  const son = await depo.guncelle("gorevler", "g1", { baslik: "Yeni" });
  assert.equal(son.surum, 2);
});
