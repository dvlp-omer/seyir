// Yedekleme testleri.  npm test
const test = require("node:test");
const assert = require("node:assert/strict");

// yedek.js ve ornek-veri.js tarayıcıda diğer dosyaların fonksiyonlarını
// globalden bulur; Node'da aynı ortamı biz kuruyoruz.
Object.assign(global, require("../js/mantik.js"), require("../js/veri.js"), require("../js/kisiler.js"));
const { yedekCoz, yedekOlustur, yedekYukle, kayitTemizle, YEDEK_SEMASI } = require("../js/yedek.js");
const { ornekVeriYukle } = require("../js/ornek-veri.js");

function sahteDepolama() {
  const kutu = {};
  return { getItem: (a) => (a in kutu ? kutu[a] : null), setItem: (a, d) => { kutu[a] = String(d); } };
}
const yeniDepo = () => yerelDepoOlustur(sahteDepolama());

// Geçerli, küçük bir yedek nesnesi; testler bunu bozarak dener.
function ornekYedek() {
  return {
    uygulama: "seyir", surum: 1, tarih: "2026-11-16T10:00:00.000Z",
    veriler: {
      takimlar: [{ id: "t1", ad: "ROTA İSAS" }],
      uyeler: [{ id: "u1", takim_id: "t1", ad: "Ayşe", rol: "kaptan" }],
      gorevler: [{ id: "g1", takim_id: "t1", baslik: "Rapor", durum: "yapiliyor", sorumlu_id: "u1", bitis_tarihi: "2026-11-25" }],
      son_tarihler: [{ id: "s1", takim_id: "t1", baslik: "ÖTR", tarih: "2026-11-25", tur: "rapor", tamamlandi: true }],
      toplantilar: [{ id: "p1", takim_id: "t1", baslik: "Haftalık", tarih: "2026-11-12", katilimci_idler: ["u1"], gundem: ["Bütçe"], kararlar: [{ metin: "Motor", gorev_id: "g1" }] }],
      etkinlikler: [{ id: "e1", takim_id: "t1", ad: "Stant", tarih: "2026-11-06", katilimci_sayisi: 140 }],
    },
  };
}
const coz = (nesne) => yedekCoz(JSON.stringify(nesne));

test("şema bütün koleksiyonları kapsar", () => {
  assert.deepEqual(Object.keys(YEDEK_SEMASI).sort(), [...KOLEKSIYONLAR].sort());
});

test("yedekCoz: geçerli dosyayı kabul eder, eksik alanları varsayılanla doldurur", () => {
  const sonuc = coz(ornekYedek());
  assert.equal(sonuc.gecerli, true);
  assert.equal(sonuc.toplam, 6);
  const gorev = sonuc.veriler.gorevler[0];
  assert.equal(gorev.aciklama, "");      // dosyada yoktu
  assert.equal(gorev.toplanti_id, "");
  assert.deepEqual(sonuc.veriler.etkinlikler[0].katilimci_idler, []);
  assert.equal(sonuc.veriler.toplantilar[0].notlar, "");
});

test("yedekCoz: şemada olmayan alanları atar", () => {
  const yedek = ornekYedek();
  yedek.veriler.uyeler[0].telefon = "555";               // kişisel veri: alınmamalı
  yedek.veriler.takimlar[0].davet_kodu = "abc";          // Supabase'e özel sütun
  yedek.veriler.toplantilar[0].kararlar[0].fazla = 1;
  const sonuc = coz(yedek);
  assert.equal(sonuc.gecerli, true);
  assert.equal("telefon" in sonuc.veriler.uyeler[0], false);
  assert.equal("davet_kodu" in sonuc.veriler.takimlar[0], false);
  assert.deepEqual(sonuc.veriler.toplantilar[0].kararlar[0], { metin: "Motor", gorev_id: "g1" });
});

test("yedekCoz: JSON olmayan ya da başka bir uygulamaya ait dosyayı reddeder", () => {
  assert.match(yedekCoz("merhaba").hata, /JSON/);
  assert.match(yedekCoz("null").hata, /yedeği değil/);
  assert.match(coz({ uygulama: "baska", surum: 1, veriler: {} }).hata, /yedeği değil/);
  assert.match(coz({ ...ornekYedek(), surum: 99 }).hata, /sürümü/);
  assert.match(coz({ uygulama: "seyir", surum: 1 }).hata, /veriler/);
});

test("yedek: yeni dosyalar 'seyir' adını taşır; eski addaki ('takim-asistani') yedekler hâlâ yüklenir", async () => {
  assert.equal((await yedekOlustur(yeniDepo())).uygulama, "seyir");
  const eski = { ...ornekYedek(), uygulama: "takim-asistani" };
  assert.equal(coz(eski).gecerli, true);
  assert.equal(coz(eski).toplam, 6);
});

test("yedekCoz: bozuk kayıtları, hangi kayıt olduğunu söyleyerek reddeder", () => {
  const bozmalar = [
    [(y) => { y.veriler.gorevler[0].durum = "ucuyor"; }, /gorevler içindeki 1\. kayıt.*durum/],
    [(y) => { y.veriler.gorevler[0].bitis_tarihi = "2026-02-30"; }, /bitis_tarihi/],
    [(y) => { y.veriler.son_tarihler[0].tarih = ""; }, /tarih/],
    [(y) => { y.veriler.uyeler[0].ad = "   "; }, /ad.*boş/],
    [(y) => { y.veriler.uyeler[0].rol = "baskan"; }, /rol/],
    [(y) => { delete y.veriler.takimlar[0].id; }, /id/],
    [(y) => { y.veriler.toplantilar[0].gundem = "tek satır"; }, /gundem/],
    [(y) => { y.veriler.toplantilar[0].kararlar = [{ metin: 5 }]; }, /kararlar/],
    [(y) => { y.veriler.etkinlikler[0].katilimci_sayisi = -3; }, /katilimci_sayisi/],
    [(y) => { y.veriler.etkinlikler[0].katilimci_sayisi = "140"; }, /katilimci_sayisi/],
    [(y) => { y.veriler.gorevler = "liste değil"; }, /gorevler.*liste/],
    [(y) => { y.veriler.gorevler.push({ ...y.veriler.gorevler[0] }); }, /iki kez/],
    [(y) => { y.veriler.gorevler[0].takim_id = "yok"; }, /bulunmayan bir takıma/],
    [(y) => { y.veriler.gorevler[0].baslik = "x".repeat(6000); }, /baslik/],
  ];
  for (const [boz, beklenen] of bozmalar) {
    const yedek = ornekYedek();
    boz(yedek);
    const sonuc = coz(yedek);
    assert.equal(sonuc.gecerli, false, String(beklenen));
    assert.match(sonuc.hata, beklenen);
  }
});

test("yedekCoz: HTML içeren metin olduğu gibi saklanır (kaçırma çizimde yapılır)", () => {
  const yedek = ornekYedek();
  yedek.veriler.uyeler[0].ad = "<img src=x onerror=alert(1)>";
  const sonuc = coz(yedek);
  assert.equal(sonuc.gecerli, true);
  assert.equal(htmlKacis(sonuc.veriler.uyeler[0].ad), "&lt;img src=x onerror=alert(1)&gt;");
});

test("kayitTemizle: nesne olmayan girdiyi reddeder", () => {
  assert.ok(kayitTemizle("uyeler", null).hata);
  assert.ok(kayitTemizle("uyeler", ["a"]).hata);
  assert.ok(kayitTemizle("uyeler", "metin").hata);
});

test("gidiş-dönüş: dışa aktar -> metin -> içe aktar, veri birebir aynı kalır", async () => {
  const kaynak = yeniDepo();
  await ornekVeriYukle(kaynak, "2026-11-16");

  const metin = JSON.stringify(await yedekOlustur(kaynak));
  const cozulen = yedekCoz(metin);
  assert.equal(cozulen.gecerli, true, cozulen.hata);

  const hedef = yeniDepo();
  const sonuc = await yedekYukle(hedef, cozulen.veriler);
  assert.equal(sonuc.eklenen, cozulen.toplam);
  assert.equal(sonuc.atlanan, 0);

  // "surum" (çakışma denetimi için sürüm numarası) yedeğe girmez: kaydın
  // içeriği değil, o depodaki değişiklik sayısıdır. Yüklenen kayıt 1'den başlar.
  const surumsuz = (liste) => liste.map(({ surum, ...kayit }) => kayit);
  for (const koleksiyon of KOLEKSIYONLAR) {
    assert.deepEqual(surumsuz(await hedef.listele(koleksiyon)), surumsuz(await kaynak.listele(koleksiyon)), koleksiyon);
  }
});

test("resmî tutanak: yedekte korunur; bozuk devreden listesi reddedilir", () => {
  const { ornekTutanak } = require("./ornek-tutanak.js");
  const yedek = ornekYedek();
  yedek.veriler.tutanaklar = [{ ...ornekTutanak(), takim_id: "t1", fazla_alan: "atılmalı" }];
  const sonuc = coz(yedek);
  assert.equal(sonuc.gecerli, true, sonuc.hata);
  const kayit = sonuc.veriler.tutanaklar[0];
  assert.equal(kayit.numara, "ROTA/İSAS-2026/04");
  assert.equal(kayit.kararlar.length, 12);
  assert.deepEqual(kayit.devreden[0], ornekTutanak().devreden[0]);
  assert.equal("fazla_alan" in kayit, false);

  yedek.veriler.tutanaklar[0].devreden = [{ atif: "metni yok" }];
  assert.match(coz(yedek).hata, /devreden/);
  yedek.veriler.tutanaklar[0].devreden = [];
  yedek.veriler.tutanaklar[0].toplanti_tarihi = "dün";
  assert.match(coz(yedek).hata, /toplanti_tarihi/);
});

test("yedekYukle: aynı dosya ikinci kez yüklenince hiçbir şey eklenmez ya da değişmez", async () => {
  const depo = yeniDepo();
  const veriler = coz(ornekYedek()).veriler;
  await yedekYukle(depo, veriler);

  // Kullanıcı bu arada bir kaydı değiştirmiş olsun
  await depo.guncelle("gorevler", "g1", { baslik: "Değişti" });

  const ikinci = await yedekYukle(depo, veriler);
  assert.deepEqual(ikinci, { eklenen: 0, atlanan: 6 });
  assert.equal((await depo.oku("gorevler", "g1")).baslik, "Değişti"); // üzerine yazılmadı
});

test("yedekYukle: var olan veriye dokunmadan yenileri ekler", async () => {
  const depo = yeniDepo();
  const mevcut = await depo.ekle("takimlar", { ad: "Başka takım" });
  await yedekYukle(depo, coz(ornekYedek()).veriler);

  const takimlar = await depo.listele("takimlar");
  assert.deepEqual(takimlar.map((t) => t.ad).sort(), ["Başka takım", "ROTA İSAS"]);
  assert.ok(await depo.oku("takimlar", mevcut.id));
});

test("kişiler, şablonlar ve gönderim listeleri yedekte korunur; bozuk numara reddedilir", () => {
  // Numaralar uydurmadır (kullanılmayan 0500 000 00 xx aralığı)
  const yedek = ornekYedek();
  Object.assign(yedek.veriler, {
    kisiler: [{ id: "k1", takim_id: "t1", ad: "Ece Demir", ilk_ad: "Ece", telefon: "905000000001", etiket: "üye", aciklama: "" }],
    sablonlar: [{ id: "s1", takim_id: "t1", ad: "Davet", tur: "davet", metin: "Merhaba {ad}" }],
    kampanyalar: [{ id: "c1", takim_id: "t1", ad: "Mart daveti", sablon_id: "s1", mesaj: "Merhaba {ad}",
      alicilar: [{ kisi_id: "k1", ad: "Ece Demir", ilk_ad: "Ece", telefon: "905000000001", gonderildi: true, zaman: "2026-03-12T10:00:00Z", fazla: "atılır" }] }],
  });
  const sonuc = yedekCoz(JSON.stringify(yedek));
  assert.equal(sonuc.gecerli, true, sonuc.hata);
  assert.equal(sonuc.veriler.kisiler[0].telefon, "905000000001");
  assert.deepEqual(Object.keys(sonuc.veriler.kampanyalar[0].alicilar[0]), ["kisi_id", "ad", "ilk_ad", "telefon", "gonderildi", "zaman"]);

  yedek.veriler.kisiler[0].telefon = "0500 000 00 01"; // kayıtta hep 90... biçiminde olmalı
  assert.match(yedekCoz(JSON.stringify(yedek)).hata, /telefon/);
  yedek.veriler.kisiler[0].telefon = "905000000001";
  yedek.veriler.kampanyalar[0].alicilar[0].telefon = "<script>";
  assert.match(yedekCoz(JSON.stringify(yedek)).hata, /alıcı listesi/);
});
