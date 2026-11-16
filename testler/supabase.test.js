// Supabase deposu testleri.  node --test "testler/*.test.js"   (ya da: npm test)
//
// Gerçek Supabase'e bağlanmıyoruz (anahtar yok, internet gerekmesin).
// Onun yerine fetch'in yerine geçen, Supabase REST adreslerini taklit eden
// küçük bir sahte sunucu kullanıyoruz. Amaç iki şeyi doğrulamak:
//   1) Depo doğru adrese, doğru yöntem ve başlıklarla istek atıyor mu?
//   2) Supabase deposu, yerel depoyla AYNI davranıyor mu? (aynı arayüz)
const test = require("node:test");
const assert = require("node:assert/strict");
const { yerelDepoOlustur, supabaseDepoOlustur, depoSec } = require("../js/veri.js");
const { ornekVeriYukle } = require("../js/ornek-veri.js");

// ornek-veri.js tarayıcıda gunEkle'yi globalden bulur; Node'da biz veriyoruz.
global.gunEkle = require("../js/mantik.js").gunEkle;
global.VARSAYILAN_SABLONLAR = require("../js/kisiler.js").VARSAYILAN_SABLONLAR;

const ADRES = "https://ornek.supabase.co";
const ANAHTAR = "test-anahtari";

// Bellekte tablo tutan, "?alan=eq.deger" süzgecini anlayan sahte fetch.
function sahteSupabase() {
  const tablolar = {};
  const istekler = [];

  async function sahteFetch(adres, secenekler) {
    istekler.push({ adres, ...secenekler });
    const url = new URL(adres);
    const tablo = url.pathname.replace("/rest/v1/", "");
    const satirlar = (tablolar[tablo] = tablolar[tablo] || []);

    // select ve order dışındaki parametreler süzgeçtir: id=eq.abc
    const suzgecler = [...url.searchParams].filter(([ad]) => ad !== "select" && ad !== "order");
    const uyar = (satir) => suzgecler.every(([ad, deger]) => String(satir[ad]) === deger.replace(/^eq\./, ""));

    const cevap = (durum, govde) => ({
      ok: durum < 400, status: durum,
      json: async () => govde, text: async () => JSON.stringify(govde),
    });

    if (secenekler.method === "GET") return cevap(200, satirlar.filter(uyar));
    if (secenekler.method === "POST") {
      const satir = JSON.parse(secenekler.body);
      satirlar.push(satir);
      return cevap(201, [satir]);
    }
    if (secenekler.method === "PATCH") {
      const degisenler = satirlar.filter(uyar);
      degisenler.forEach((satir) => Object.assign(satir, JSON.parse(secenekler.body)));
      return cevap(200, degisenler);
    }
    if (secenekler.method === "DELETE") {
      tablolar[tablo] = satirlar.filter((satir) => !uyar(satir));
      return cevap(204, null);
    }
    return cevap(405, { message: "desteklenmiyor" });
  }

  return { sahteFetch, istekler, tablolar };
}

function sahteDepolama() {
  const kutu = {};
  return { getItem: (a) => (a in kutu ? kutu[a] : null), setItem: (a, d) => { kutu[a] = String(d); } };
}

test("istekler doğru adrese, anahtar başlıklarıyla gider", async () => {
  const sunucu = sahteSupabase();
  const depo = supabaseDepoOlustur(ADRES + "/", ANAHTAR, { istek: sunucu.sahteFetch }); // sondaki / sorun olmamalı

  await depo.listele("gorevler", { takim_id: "t1" });

  const istek = sunucu.istekler[0];
  assert.equal(istek.method, "GET");
  assert.equal(istek.adres, ADRES + "/rest/v1/gorevler?select=*&order=olusturma.asc&takim_id=eq.t1");
  assert.equal(istek.headers.apikey, ANAHTAR);
  assert.equal(istek.headers.Authorization, "Bearer " + ANAHTAR);
});

test("guncelle: PATCH gövdesinde id ve olusturma gönderilmez", async () => {
  const sunucu = sahteSupabase();
  const depo = supabaseDepoOlustur(ADRES, ANAHTAR, { istek: sunucu.sahteFetch });
  const gorev = await depo.ekle("gorevler", { baslik: "Rapor", durum: "yapilacak" });

  await depo.guncelle("gorevler", gorev.id, { durum: "bitti", id: "baska", olusturma: "x" });

  const yama = sunucu.istekler.find((i) => i.method === "PATCH");
  assert.equal(yama.adres, ADRES + "/rest/v1/gorevler?id=eq." + gorev.id);
  assert.deepEqual(JSON.parse(yama.body), { durum: "bitti" });
});

test("sunucu hata dönerse anlaşılır bir hata fırlatır", async () => {
  const hataliFetch = async () => ({ ok: false, status: 401, text: async () => "Invalid API key" });
  const depo = supabaseDepoOlustur(ADRES, ANAHTAR, { istek: hataliFetch });
  await assert.rejects(() => depo.listele("gorevler"), /Supabase hatası \(401\).*Invalid API key/);
});

test("bilinmeyen koleksiyon adı istek atılmadan reddedilir", async () => {
  const sunucu = sahteSupabase();
  const depo = supabaseDepoOlustur(ADRES, ANAHTAR, { istek: sunucu.sahteFetch });
  await assert.rejects(() => depo.listele("gorevlerr"));
  assert.equal(sunucu.istekler.length, 0);
});

test("depoSec: VERI_KATMANI ortam değişkeni depoyu seçer", () => {
  const supabaseAyar = { VERI_KATMANI: "supabase", SUPABASE_URL: ADRES, SUPABASE_ANON_KEY: ANAHTAR };
  assert.equal(depoSec({}, sahteDepolama()).tur, "yerel");               // hiç ayar yok
  assert.equal(depoSec(undefined, sahteDepolama()).tur, "yerel");
  assert.equal(depoSec({ VERI_KATMANI: "yerel" }, sahteDepolama()).tur, "yerel");
  assert.equal(depoSec(supabaseAyar, sahteDepolama()).tur, "supabase");
  // Anahtarlar dursa bile VERI_KATMANI=yerel ise yerel depo kullanılır
  assert.equal(depoSec({ ...supabaseAyar, VERI_KATMANI: "yerel" }, sahteDepolama()).tur, "yerel");
});

test("depoSec: yanlış ya da eksik ayar sessizce geçilmez, açık hata verir", () => {
  assert.throws(() => depoSec({ VERI_KATMANI: "supabase" }, sahteDepolama()), /eksik/);
  assert.throws(() => depoSec({ VERI_KATMANI: "supabase", SUPABASE_URL: ADRES }, sahteDepolama()), /eksik/);
  assert.throws(() => depoSec({ VERI_KATMANI: "firebase" }, sahteDepolama()), /yerel.*supabase/);
});

test("jetonGetir verilirse isteklerde kullanıcının jetonu gider, anon anahtar değil", async () => {
  const sunucu = sahteSupabase();
  const depo = supabaseDepoOlustur(ADRES, ANAHTAR, { istek: sunucu.sahteFetch, jetonGetir: async () => "kullanici-jetonu" });
  await depo.listele("gorevler");
  assert.equal(sunucu.istekler[0].headers.apikey, ANAHTAR);
  assert.equal(sunucu.istekler[0].headers.Authorization, "Bearer kullanici-jetonu");
});

test("jetonGetir hata verirse (oturum bitti) istek hiç gönderilmez", async () => {
  const sunucu = sahteSupabase();
  const depo = supabaseDepoOlustur(ADRES, ANAHTAR, {
    istek: sunucu.sahteFetch, jetonGetir: async () => { throw new Error("Oturumun süresi doldu."); },
  });
  await assert.rejects(() => depo.listele("gorevler"), /süresi doldu/);
  assert.equal(sunucu.istekler.length, 0);
});

/* ---------- Sözleşme testi ----------
   Aynı senaryo iki depoda da çalıştırılır. İkisi de geçiyorsa ekran kodu
   hangi deponun kullanıldığını bilmeden çalışabilir demektir. */
const depolar = {
  yerel: () => yerelDepoOlustur(sahteDepolama()),
  supabase: () => supabaseDepoOlustur(ADRES, ANAHTAR, { istek: sahteSupabase().sahteFetch }),
};

for (const [ad, depoOlustur] of Object.entries(depolar)) {
  test("sözleşme (" + ad + "): ekle, oku, listele, guncelle, sil", async () => {
    const depo = depoOlustur();

    const a = await depo.ekle("gorevler", { baslik: "A", takim_id: "t1", durum: "yapilacak" });
    const b = await depo.ekle("gorevler", { baslik: "B", takim_id: "t2", durum: "yapilacak" });
    assert.ok(a.id && a.olusturma);
    assert.notEqual(a.id, b.id);

    assert.deepEqual(await depo.oku("gorevler", a.id), a);
    assert.equal(await depo.oku("gorevler", "yok"), null);

    assert.equal((await depo.listele("gorevler")).length, 2);
    assert.deepEqual((await depo.listele("gorevler", { takim_id: "t1" })).map((g) => g.baslik), ["A"]);

    const guncel = await depo.guncelle("gorevler", a.id, { durum: "bitti" });
    assert.equal(guncel.durum, "bitti");
    assert.equal(guncel.baslik, "A");
    assert.equal(guncel.id, a.id);
    await assert.rejects(() => depo.guncelle("gorevler", "yok", { durum: "bitti" }));

    await depo.sil("gorevler", a.id);
    assert.deepEqual((await depo.listele("gorevler")).map((g) => g.id), [b.id]);

    // Kayıtta id ve olusturma varsa korunur (yedekten geri yükleme bunu kullanır)
    const hazir = await depo.ekle("gorevler", { id: "sabit-1", olusturma: "2026-01-01T00:00:00.000Z", baslik: "C" });
    assert.equal(hazir.id, "sabit-1");
    assert.equal(hazir.olusturma, "2026-01-01T00:00:00.000Z");
    assert.equal((await depo.oku("gorevler", "sabit-1")).baslik, "C");
  });

  test("sözleşme (" + ad + "): kişi ve gönderim listesi (iç içe alıcı listesi) gidiş-dönüş", async () => {
    const depo = depoOlustur();
    // Uydurma kişi; numara kullanılmayan 0500 aralığında
    const kisi = await depo.ekle("kisiler", { takim_id: "t1", ad: "Ece Demir", ilk_ad: "Ece", telefon: "905000000001", etiket: "üye", aciklama: "" });
    const kampanya = await depo.ekle("kampanyalar", {
      takim_id: "t1", ad: "Davet", sablon_id: "", mesaj: "Merhaba {ad}",
      alicilar: [{ kisi_id: kisi.id, ad: kisi.ad, ilk_ad: "Ece", telefon: kisi.telefon, gonderildi: false, zaman: "" }],
    });
    const isaretli = kampanya.alicilar.map((a) => ({ ...a, gonderildi: true, zaman: "2026-03-12T10:00:00Z" }));
    await depo.guncelle("kampanyalar", kampanya.id, { alicilar: isaretli });
    const okunan = await depo.oku("kampanyalar", kampanya.id);
    assert.deepEqual(okunan.alicilar, isaretli);
    assert.equal(okunan.mesaj, "Merhaba {ad}");
    assert.deepEqual((await depo.listele("kisiler", { takim_id: "t1" })).map((k) => k.telefon), ["905000000001"]);
    assert.deepEqual(await depo.listele("kisiler", { takim_id: "baska-takim" }), []);
  });

  test("sözleşme (" + ad + "): örnek veri uçtan uca yüklenir", async () => {
    const depo = depoOlustur();
    const takim = await ornekVeriYukle(depo, "2026-11-16");
    const filtre = { takim_id: takim.id };

    assert.equal((await depo.listele("uyeler", filtre)).length, 4);
    assert.equal((await depo.listele("gorevler", filtre)).length, 6);
    assert.equal((await depo.listele("son_tarihler", filtre)).length, 4);
    assert.equal((await depo.listele("etkinlikler", filtre)).length, 3);
    assert.equal((await depo.listele("kisiler", filtre)).length, 6);
    assert.equal((await depo.listele("sablonlar", filtre)).length, 4);
    // Örnek kişilerin numaraları yalnızca kullanılmayan 0500 000 00 xx aralığında
    for (const kisi of await depo.listele("kisiler", filtre)) assert.match(kisi.telefon, /^9050000000\d\d$/);

    // İlk karar bir göreve bağlı olmalı ve o görev gerçekten var olmalı
    const [toplanti] = await depo.listele("toplantilar", filtre);
    const bagliGorev = await depo.oku("gorevler", toplanti.kararlar[0].gorev_id);
    assert.equal(bagliGorev.toplanti_id, toplanti.id);
  });
}
