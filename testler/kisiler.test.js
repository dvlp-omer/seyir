// Kişiler ve WhatsApp mesajları: saf mantık testleri.  npm test
// Buradaki bütün adlar ve numaralar UYDURMADIR. Numaralar bilerek
// kullanılmayan "0500 000 00 xx" aralığından seçildi.
const test = require("node:test");
const assert = require("node:assert/strict");
const k = require("../js/kisiler.js");

/* ---------- Telefon ---------- */

test("telefonNormallestir: bütün yaygın yazımlar 90XXXXXXXXXX olur", () => {
  for (const yazim of ["0500 000 00 01", "05000000001", "+90 500 000 00 01", "+905000000001",
    "0090 500 000 0001", "500 000 00 01", "5000000001", "905000000001", "0 (500) 000-00-01", "  0500.000.00.01 "]) {
    assert.deepEqual(k.telefonNormallestir(yazim), { telefon: "905000000001" }, yazim);
  }
});

test("telefonNormallestir: geçersizler nedeniyle reddedilir", () => {
  assert.match(k.telefonNormallestir("").hata, /boş/);
  assert.match(k.telefonNormallestir(null).hata, /boş/);
  assert.match(k.telefonNormallestir("0500 000 00").hata, /Türkiye numarası/);      // eksik hane
  assert.match(k.telefonNormallestir("0500 000 00 012").hata, /Türkiye numarası/);  // fazla hane
  assert.match(k.telefonNormallestir("+1 202 555 0100").hata, /Türkiye numarası/);  // başka ülke
  assert.match(k.telefonNormallestir("0212 000 00 01").hata, /cep telefonu değil/);  // sabit hat
  assert.match(k.telefonNormallestir("telefonu yok").hata, /harf/);
});

test("telefonGoster: okunaklı biçim; tanımadığını olduğu gibi bırakır", () => {
  assert.equal(k.telefonGoster("905000000001"), "+90 500 000 00 01");
  assert.equal(k.telefonGoster("12345"), "12345");
});
test("ilkAdTahmin:adın ilk sözcüğünü alır", () =>{
  assert.equal(k.ilkAdTahmin("Ece Nur Demir"), "Ece");
  assert.equal(k.ilkAdTahmin(" Can Öz "), "Can");
  assert.equal(k.ilkAdTahmin(""), "");

});

test("adSade: küçük harf ve tek boşluk",() =>{
  assert.equal(k.adSade(" Ece   Nur "), "ece nur");
});

/* ---------- CSV ---------- */

test("csvAyristir: başlıklı, noktalı virgüllü (Excel Türkçe) dosya", () => {
  const metin = "﻿Ad Soyad;İlk ad;Telefon;Grup;Not\r\nEce Nur Demir;Ece Nur;0500 000 00 01;başvuran;\r\nCan Öz;;0500 000 00 02;üye;Yazılım ekibi\r\n";
  const satirlar = k.csvAyristir(metin);
  assert.equal(satirlar.length, 2);
  assert.deepEqual(satirlar[0], { ad: "Ece Nur Demir", ilk_ad: "Ece Nur", telefon: "0500 000 00 01", etiket: "başvuran", aciklama: "", satir: 2 });
  assert.equal(satirlar[1].aciklama, "Yazılım ekibi");
});

test("csvAyristir: tırnak içinde ayırıcı ve kaçırılmış tırnak", () => {
  const satirlar = k.csvAyristir('ad,telefon,not\n"Demir, Ece",05000000001,"""Kaptan"" adayı"');
  assert.equal(satirlar[0].ad, "Demir, Ece");
  assert.equal(satirlar[0].aciklama, '"Kaptan" adayı');
});

test("csvAyristir: başlıksız yapıştırma (ad + numara, sekmeyle ya da virgülle)", () => {
  const satirlar = k.csvAyristir("Ece Demir\t0500 000 00 01\nCan Öz\t+90 500 000 00 02\n\n05000000003, Deniz Ak");
  assert.deepEqual(satirlar.map((s) => [s.ad, s.telefon]), [
    ["Ece Demir", "0500 000 00 01"], ["Can Öz", "+90 500 000 00 02"], ["Deniz Ak", "05000000003"]]);
  assert.deepEqual(k.csvAyristir("  \n "), []);
});

/* ---------- Kabul mesajları HTML'i ---------- */

const ORNEK_HTML = '<html><body><script>\nconst P=[{"ad": "Ece Nur Demir", "ilk": "Ece Nur", "tel": "905000000001"}, ' +
  '{"ad": "Can Öz", "ilk": "Can", "tel": "905000000002"}];const DEF="Merhaba {ad}";\nalert("çalıştırılmamalı");\n</script></body></html>';

test("htmlKisiDizisiOku: dizideki ad, ilk ad ve numarayı okur (kodu çalıştırmadan)", () => {
  const kisiler = k.htmlKisiDizisiOku(ORNEK_HTML);
  assert.equal(kisiler.length, 2);
  assert.deepEqual(kisiler[0], { ad: "Ece Nur Demir", ilk_ad: "Ece Nur", telefon: "905000000001", etiket: "", aciklama: "", satir: 1 });
});

test("htmlKisiDizisiOku: listesi olmayan ya da bozuk dosyada anlaşılır hata", () => {
  assert.throws(() => k.htmlKisiDizisiOku("<html>boş</html>"), /bulunamadı/);
  assert.throws(() => k.htmlKisiDizisiOku('const P=[{"ad": "x", "tel": bozuk}]'), /okunamadı/);
});

/* ---------- Kayda hazırlama ---------- */

test("kisileriHazirla: geçerli, hatalı ve yinelenenleri ayırır; ilk adı tahmin eder", () => {
  const mevcut = [{ id: "a", ad: "Eski Kişi", telefon: "905000000009" }];
  const sonuc = k.kisileriHazirla([
    { ad: "Ece Nur Demir", telefon: "0500 000 00 01", satir: 1 },
    { ad: "Can Öz", ilk_ad: "Cancan", telefon: "+90 500 000 00 02", etiket: "üye", satir: 2 },
    { ad: "Aynı Numara", telefon: "05000000001", satir: 3 },          // listede yinelenen
    { ad: "Rehberde Var", telefon: "0500 000 00 09", satir: 4 },      // rehberde zaten var
    { ad: "", telefon: "05000000005", satir: 5 },
    { ad: "Sabit Hat", telefon: "0212 000 00 01", satir: 6 },
  ], mevcut, "başvuran");
  assert.deepEqual(sonuc.eklenecek, [
    { ad: "Ece Nur Demir", ilk_ad: "Ece", telefon: "905000000001", etiket: "başvuran", aciklama: "" },
    { ad: "Can Öz", ilk_ad: "Cancan", telefon: "905000000002", etiket: "üye", aciklama: "" },
  ]);
  assert.deepEqual(sonuc.yinelenen.map((y) => y.satir), [3, 4]);
  assert.deepEqual(sonuc.hatali.map((h) => [h.satir, h.neden.split(" ")[0]]), [[5, "ad"], [6, "cep"]]);
});

test("kisileriCsvYap: dışa verilen CSV geri okununca aynı kişiler çıkar", () => {
  const kisiler = [{ ad: "Demir; Ece", ilk_ad: "Ece", telefon: "905000000001", etiket: "üye", aciklama: 'satır "1"' }];
  const csv = k.kisileriCsvYap(kisiler);
  assert.ok(csv.startsWith("﻿"));
  const geri = k.csvAyristir(csv)[0];
  assert.deepEqual([geri.ad, geri.ilk_ad, geri.telefon, geri.etiket, geri.aciklama], ["Demir; Ece", "Ece", "905000000001", "üye", 'satır "1"']);
});

/* ---------- Şablon ---------- */

test("sablonDoldur: değişkenler dolar; boş ve bilinmeyenler olduğu gibi kalır", () => {
  const metin = "Merhaba {ad}, {tarih} {saat} {yer} {link} {bilinmeyen}";
  assert.equal(k.sablonDoldur(metin, { ad: "Ece", tarih: "19 Mart", saat: "17:30", yer: "Atölye", link: "https://ornek.org" }),
    "Merhaba Ece, 19 Mart 17:30 Atölye https://ornek.org {bilinmeyen}");
  assert.equal(k.sablonDoldur(metin, { ad: "Ece" }), "Merhaba Ece, {tarih} {saat} {yer} {link} {bilinmeyen}");
  assert.equal(k.sablonDoldur("{ad} {ad}", { ad: "$& $1" }), "$& $1 $& $1"); // özel karakterler bozulmaz
});

test("eksikDegiskenler: doldurulmamış değişkenleri bir kez listeler", () => {
  assert.deepEqual(k.eksikDegiskenler("{ad} {tarih} {tarih} {x}"), ["ad", "tarih"]);
  assert.deepEqual(k.eksikDegiskenler("{ad} {tarih}", ["ad"]), ["tarih"]);
});

test("hazır şablonlar: dört tür, yalnızca bilinen değişkenler", () => {
  assert.deepEqual(k.VARSAYILAN_SABLONLAR.map((s) => s.tur), ["kabul", "davet", "hatirlatma", "duyuru"]);
  for (const s of k.VARSAYILAN_SABLONLAR) {
    const bilinmeyen = (s.metin.match(/\{(\w+)\}/g) || []).filter((p) => !k.SABLON_DEGISKENLERI.includes(p.slice(1, -1)));
    assert.deepEqual(bilinmeyen, [], s.ad);
  }
});

/* ---------- WhatsApp ---------- */

test("waLinki ve waPaylasLinki: Türkçe, satır sonu ve & işareti doğru kodlanır", () => {
  const link = k.waLinki("905000000001", "Merhaba Çağla,\nyarın 17:30 & atölye?");
  assert.equal(link, "https://wa.me/905000000001?text=Merhaba%20%C3%87a%C4%9Fla%2C%0Ayar%C4%B1n%2017%3A30%20%26%20at%C3%B6lye%3F");
  assert.equal(decodeURIComponent(link.split("text=")[1]), "Merhaba Çağla,\nyarın 17:30 & atölye?");
  assert.equal(k.waPaylasLinki("a b"), "https://wa.me/?text=a%20b");
});

/* ---------- Kampanya ---------- */

test("kampanyaHazirla + aliciMesaji: {ad} kişiye göre, diğerleri baştan dolar", () => {
  const kampanya = k.kampanyaHazirla(
    { ad: "Kabul — Mart", sablonId: "s1", mesaj: "Merhaba {ad}, {tarih} {saat}. {yer}", degerler: { tarih: "19 Mart", saat: "17:30" } },
    [{ id: "k1", ad: "Ece Nur Demir", ilk_ad: "Ece Nur", telefon: "905000000001" }, { id: "k2", ad: "Can Öz", ilk_ad: "", telefon: "905000000002" }]);
  assert.equal(kampanya.mesaj, "Merhaba {ad}, 19 Mart 17:30. {yer}");
  assert.equal(k.aliciMesaji(kampanya, kampanya.alicilar[0]), "Merhaba Ece Nur, 19 Mart 17:30. {yer}");
  assert.equal(k.aliciMesaji(kampanya, kampanya.alicilar[1]), "Merhaba Can, 19 Mart 17:30. {yer}");
  assert.deepEqual(kampanya.alicilar[0], { kisi_id: "k1", ad: "Ece Nur Demir", ilk_ad: "Ece Nur", telefon: "905000000001", gonderildi: false, zaman: "" });
});

test("aliciIsaretle + kampanyaIlerleme: sayaç 0/2 -> 1/2 -> 0/2; asıl liste değişmez", () => {
  const kampanya = k.kampanyaHazirla({ ad: "x", mesaj: "m" }, [{ ad: "A", telefon: "905000000001" }, { ad: "B", telefon: "905000000002" }]);
  assert.equal(k.kampanyaIlerleme(kampanya).yazi, "0/2");
  const isaretli = k.aliciIsaretle(kampanya.alicilar, 1, true, "2026-03-12T10:00:00Z");
  assert.equal(kampanya.alicilar[1].gonderildi, false);
  assert.deepEqual(k.kampanyaIlerleme({ alicilar: isaretli }), { gonderilen: 1, toplam: 2, yazi: "1/2" });
  assert.equal(isaretli[1].zaman, "2026-03-12T10:00:00Z");
  const geri = k.aliciIsaretle(isaretli, 1, false, "x");
  assert.deepEqual([geri[1].gonderildi, geri[1].zaman], [false, ""]);
  assert.equal(k.kampanyaIlerleme(null).yazi, "0/0");
});

/* ---------- Tutanakla bağ ---------- */

test("sonrakiToplantiCoz: tarih ve saati ayırır", () => {
  assert.deepEqual(k.sonrakiToplantiCoz("19 Mart 2026 Perşembe, 17.30"), { tarih: "19 Mart 2026 Perşembe", saat: "17:30" });
  assert.deepEqual(k.sonrakiToplantiCoz("14 Kasım 2026, Cumartesi 20.00"), { tarih: "14 Kasım 2026, Cumartesi", saat: "20:00" });
  assert.deepEqual(k.sonrakiToplantiCoz("saat 9:05, 2 Nisan"), { tarih: "2 Nisan", saat: "09:05" });
  assert.deepEqual(k.sonrakiToplantiCoz("Daha sonra belirlenecek"), { tarih: "Daha sonra belirlenecek", saat: "" });
  assert.deepEqual(k.sonrakiToplantiCoz(""), { tarih: "", saat: "" });
  // Tarihteki "12.03.2026" saat sanılmaz
  assert.deepEqual(k.sonrakiToplantiCoz("12.03.2026"), { tarih: "12.03.2026", saat: "" });
});

test("tutanakKisileri: katılımcılar ve görev satırında adı geçenler bulunur", () => {
  const kisiler = [
    { id: "1", ad: "Ece Demir" }, { id: "2", ad: "can öz" }, { id: "3", ad: "Deniz Ak" }, { id: "4", ad: "Ali" },
  ];
  const tutanak = { katilimcilar: ["Ece Demir", "Can Öz"], gorevler: ["Rapor Deniz Ak tarafından yazılacak", "Alinin kitabı"] };
  assert.deepEqual(k.tutanakKisileri(tutanak, kisiler), ["1", "2", "3"]); // "Ali" kısa ad: yanlış eşleşmesin
  assert.deepEqual(k.tutanaktanDegerler({ sonraki_toplanti: "19 Mart, 17:30" }), { tarih: "19 Mart", saat: "17:30" });
});

test("etiketler ve kisileriSuz", () => {
  const kisiler = [
    { ad: "Ece Demir", ilk_ad: "Ece", telefon: "905000000001", etiket: "üye" },
    { ad: "Can Öz", ilk_ad: "Can", telefon: "905000000002", etiket: "başvuran" },
    { ad: "İpek Işık", ilk_ad: "İpek", telefon: "905000000003", etiket: "" },
  ];
  assert.deepEqual(k.etiketler(kisiler), ["başvuran", "üye"]);
  assert.deepEqual(k.kisileriSuz(kisiler, { etiket: "üye" }).map((x) => x.ad), ["Ece Demir"]);
  assert.deepEqual(k.kisileriSuz(kisiler, { arama: "ipek" }).map((x) => x.ad), ["İpek Işık"]); // Türkçe büyük İ
  assert.deepEqual(k.kisileriSuz(kisiler, { arama: "0000002" }).map((x) => x.ad), ["Can Öz"]);
  assert.equal(k.kisileriSuz(kisiler).length, 3);
});
