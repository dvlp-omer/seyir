// Kolaylık özellikleri: taslak saklama, karardan görev (ad eşleştirme),
// takvim dosyası (.ics), genel arama ve klavye kısayolları.  npm test
// Bütün adlar uydurmadır.
const test = require("node:test");
const assert = require("node:assert/strict");
const k = require("../js/kolaylik.js");

// localStorage benzeri bellek içi depo
function sahteDepo(bozuk = false) {
  const veri = new Map();
  return {
    get length() { return veri.size; },
    key: (i) => [...veri.keys()][i] ?? null,
    getItem: (a) => { if (bozuk) throw new Error("erişim yok"); return veri.has(a) ? veri.get(a) : null; },
    setItem: (a, d) => { if (bozuk) throw new Error("kota doldu"); veri.set(a, String(d)); },
    removeItem: (a) => { veri.delete(a); },
    _veri: veri,
  };
}

/* ---------- 1) Taslak ---------- */

test("taslak: kaydedilir, okunur, silinir", () => {
  const depo = sahteDepo();
  k.taslakKaydet(depo, "form:a", { baslik: "Afiş" }, 1000);
  assert.deepEqual(k.taslakOku(depo, "form:a", 2000), { veri: { baslik: "Afiş" }, zaman: 1000 });
  k.taslakSil(depo, "form:a");
  assert.equal(k.taslakOku(depo, "form:a", 2000), null);
});

test("taslak: süresi geçen ve bozuk taslak yok sayılır ve silinir", () => {
  const depo = sahteDepo();
  k.taslakKaydet(depo, "form:eski", { x: 1 }, 0);
  const onDortGunSonra = k.TASLAK_OMRU_GUN * 86400000 + 1;
  assert.equal(k.taslakOku(depo, "form:eski", onDortGunSonra), null);
  assert.equal(depo._veri.size, 0);
  depo.setItem(k.TASLAK_ONEKI + "form:bozuk", "{yarım");
  assert.equal(k.taslakOku(depo, "form:bozuk", 0), null);
  assert.equal(depo._veri.size, 0);
});

test("taslak: depoya erişilemezse (gizli mod, kota) çökmez", () => {
  const depo = sahteDepo(true);
  assert.equal(k.taslakKaydet(depo, "a", { x: 1 }, 0), false);
  assert.equal(k.taslakOku(depo, "a", 0), null);
  assert.doesNotThrow(() => k.taslakSil(null, "a"));
});

test("taslak: anahtar, formun başlangıç değerlerine göre değişir (başka kaydın taslağı karışmaz)", () => {
  const a = k.taslakAnahtari("form", "takim1", "Toplantıyı düzenle", { baslik: "A" });
  const b = k.taslakAnahtari("form", "takim1", "Toplantıyı düzenle", { baslik: "B" });
  const a2 = k.taslakAnahtari("form", "takim1", "Toplantıyı düzenle", { baslik: "A" });
  assert.notEqual(a, b);
  assert.equal(a, a2);
  assert.notEqual(a, k.taslakAnahtari("form", "takim2", "Toplantıyı düzenle", { baslik: "A" }));
});

/* ---------- 2) Karardan görev: sorumluyu bul ---------- */

const UYELER = [
  { id: "u1", ad: "Çağla Öztürk" },
  { id: "u2", ad: "Şükrü Işık" },
  { id: "u3", ad: "Gökçe Ünal" },
  { id: "u4", ad: "Gökçe Er" },
];

test("sorumluBul: karar metnindeki tam ad, büyük/küçük harf ve Türkçe harf farkı gözetmeden bulunur", () => {
  assert.equal(k.sorumluBul("bütçe tablosu takibi çağla öztürk", UYELER).id, "u1");
  assert.equal(k.sorumluBul("Afiş basımı - SUKRU ISIK", UYELER).id, "u2");
  assert.equal(k.sorumluBul("Sponsor listesi (Gökçe Ünal)", UYELER).id, "u3");
});

test("sorumluBul: yalnızca ilk ad yazılmışsa, o ada sahip tek üye varsa o seçilir", () => {
  assert.equal(k.sorumluBul("atölye izni sorulacak şükrü", UYELER).id, "u2");
  // İki "Gökçe" var: tahmin yapılmaz
  assert.equal(k.sorumluBul("rapor gökçe tarafından yazılacak", UYELER), null);
  // Sözcüğün parçası ad sayılmaz
  assert.equal(k.sorumluBul("çağlayan deresi gezisi", UYELER), null);
  assert.equal(k.sorumluBul("", UYELER), null);
});

/* ---------- 3) Takvim dosyası (.ics) ---------- */

test("icsOlustur: saatli ve tüm gün olaylar, CRLF satır sonu ve özel karakter kaçışı", () => {
  const ics = k.icsOlustur([
    { uid: "toplanti-1@seyir", baslik: "Haftalık toplantı; gündem, bütçe", tarih: "2026-12-04", saat: "17:30", yer: "Atölye", aciklama: "1. madde\n2. madde" },
    { uid: "son-1@seyir", baslik: "Rapor teslimi", tarih: "2026-12-31" },
  ], { takvimAdi: "Güneş Robotik", simdi: Date.UTC(2026, 10, 18, 9, 5, 0) });

  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(ics.split("\r\n").filter((s) => s === "BEGIN:VEVENT").length, 2);
  assert.ok(ics.includes("DTSTART:20261204T173000\r\n"));
  assert.ok(ics.includes("DTEND:20261204T183000\r\n"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101\r\n"));
  assert.ok(ics.includes("SUMMARY:Haftalık toplantı\\; gündem\\, bütçe\r\n"));
  assert.ok(ics.includes("DESCRIPTION:1. madde\\n2. madde\r\n"));
  assert.ok(ics.includes("DTSTAMP:20261118T090500Z\r\n"));
  assert.ok(ics.includes("X-WR-CALNAME:Güneş Robotik\r\n"));
  assert.equal(/\r(?!\n)|(?<!\r)\n/.test(ics), false, "yalnızca CRLF olmalı");
});

test("icsOlustur: 75 bayttan uzun satır katlanır, Türkçe harf ortadan bölünmez", () => {
  const uzun = "ğ".repeat(80); // her biri 2 bayt
  const ics = k.icsOlustur([{ uid: "x", baslik: uzun, tarih: "2026-01-01" }], { simdi: 0 });
  const satirlar = ics.split("\r\n");
  for (const s of satirlar) assert.ok(Buffer.byteLength(s, "utf8") <= 75, "uzun satır: " + s.length);
  // Katlanan satırlar birleşince özgün metin geri gelir
  const acik = ics.replace(/\r\n /g, "");
  assert.ok(acik.includes("SUMMARY:" + uzun + "\r\n"));
});

test("icsOlustur: '17.30' ve '9:05' saat biçimleri; anlaşılmayan saat tüm gün olur; gece yarısını geçen bitiş ertesi gün", () => {
  const ics = k.icsOlustur([
    { uid: "a", baslik: "A", tarih: "2026-03-01", saat: "17.30" },
    { uid: "b", baslik: "B", tarih: "2026-03-01", saat: "9:05" },
    { uid: "c", baslik: "C", tarih: "2026-03-01", saat: "öğle" },
    { uid: "d", baslik: "D", tarih: "2026-03-01", saat: "23:30" },
  ], { simdi: 0 });
  assert.ok(ics.includes("DTSTART:20260301T173000"));
  assert.ok(ics.includes("DTSTART:20260301T090500"));
  assert.ok(ics.includes("UID:c\r\nDTSTAMP:19700101T000000Z\r\nDTSTART;VALUE=DATE:20260301"));
  assert.ok(ics.includes("DTSTART:20260301T233000\r\nDTEND:20260302T003000"));
});

test("takvimOlaylari: tamamlanmamış son tarihler, toplantılar, etkinlikler ve bitmemiş görevler; geçmiş olanlar yok", () => {
  const olaylar = k.takvimOlaylari({
    sonTarihler: [
      { id: "s1", baslik: "Rapor", tarih: "2026-12-01", tamamlandi: false, aciklama: "" },
      { id: "s2", baslik: "Biten", tarih: "2026-12-02", tamamlandi: true },
      { id: "s3", baslik: "Eski", tarih: "2026-01-01", tamamlandi: false },
    ],
    toplantilar: [{ id: "t1", baslik: "Toplantı", tarih: "2026-11-20", saat: "17:30", yer: "Atölye", gundem: ["Bütçe"] }],
    etkinlikler: [{ id: "e1", ad: "Tanıtım günü", tarih: "2026-11-25", yer: "Kampüs" }],
    gorevler: [
      { id: "g1", baslik: "Afiş", bitis_tarihi: "2026-11-22", durum: "yapiliyor" },
      { id: "g2", baslik: "Bitti", bitis_tarihi: "2026-11-22", durum: "bitti" },
      { id: "g3", baslik: "Tarihsiz", bitis_tarihi: "", durum: "yapilacak" },
    ],
  }, "2026-11-18");
  assert.deepEqual(olaylar.map((o) => o.uid), ["toplanti-t1@seyir", "gorev-g1@seyir", "etkinlik-e1@seyir", "son-tarih-s1@seyir"]);
  assert.equal(olaylar[0].saat, "17:30");
  assert.equal(olaylar[0].yer, "Atölye");
  assert.equal(olaylar[1].baslik, "Görev: Afiş");
});

/* ---------- 5) Genel arama ---------- */

const VERI = {
  gorevler: [{ id: "g1", baslik: "Afiş tasarımı", aciklama: "Sponsor logoları eklenecek", durum: "yapilacak", bitis_tarihi: "2026-11-22" }],
  sonTarihler: [{ id: "s1", baslik: "Ön tasarım raporu", tarih: "2026-12-01", aciklama: "" }],
  toplantilar: [{ id: "t1", baslik: "Haftalık toplantı", tarih: "2026-11-20", yer: "Atölye", gundem: ["Bütçe"], kararlar: [{ metin: "Afiş basılacak" }], notlar: "" }],
  tutanaklar: [{ id: "r1", numara: "ROTA/İSAS-2026/02", alt_baslik: "İkinci toplantı", toplanti_tarihi: "2026-11-10", kararlar: ["Şükrü atölye iznini soracak"], devreden: [], gorevler: [], katilimcilar: ["Şükrü Işık"] }],
  etkinlikler: [{ id: "e1", ad: "Tanıtım günü", tarih: "2026-11-25", yer: "Kampüs", aciklama: "" }],
  kisiler: [{ id: "k1", ad: "Çağla Öztürk", etiket: "Mentor", aciklama: "", telefon: "905000000001" }],
  uyeler: [{ id: "u1", ad: "Gökçe Ünal" }],
};

test("arama: Türkçe harf ve büyük/küçük harf farkı gözetilmez; her sözcük eşleşmeli", () => {
  const dizin = k.aramaDizini(VERI);
  assert.deepEqual(k.aramaYap(dizin, "afis").map((s) => s.id), ["g1", "t1"]);
  assert.deepEqual(k.aramaYap(dizin, "SUKRU izni").map((s) => s.id), ["r1"]);
  assert.deepEqual(k.aramaYap(dizin, "çağla").map((s) => s.tur), ["kisi"]);
  assert.deepEqual(k.aramaYap(dizin, "gökçe").map((s) => s.tur), ["uye"]);
  assert.deepEqual(k.aramaYap(dizin, "afiş olmayan"), []);
});

test("arama: başlığı eşleşen sonuç önce gelir; boş sorgu boş döner; sonuç sayısı sınırlıdır", () => {
  const dizin = k.aramaDizini(VERI);
  // "toplantı": toplantının başlığında, tutanağın alt başlığında ("İkinci toplantı")
  const sonuc = k.aramaYap(dizin, "toplantı");
  assert.equal(sonuc[0].id, "t1"); // başlığı "Haftalık toplantı"
  assert.deepEqual(k.aramaYap(dizin, "   "), []);
  const cok = k.aramaDizini({ gorevler: Array.from({ length: 50 }, (_, i) => ({ id: "g" + i, baslik: "Görev " + i })) });
  assert.equal(k.aramaYap(cok, "görev", 10).length, 10);
  // Her sonuçta ekran adı ve okunur tür adı var
  for (const s of k.aramaYap(dizin, "a")) {
    assert.ok(s.ekran && s.turAdi && s.baslik, JSON.stringify(s));
  }
});

/* ---------- 4) Klavye kısayolları ---------- */

test("kisayolBul: Ctrl/Cmd+K ve '/' aramayı, Ctrl+S kaydetmeyi, '?' yardımı açar", () => {
  assert.equal(k.kisayolBul({ key: "k", ctrlKey: true }), "arama");
  assert.equal(k.kisayolBul({ key: "K", metaKey: true }), "arama");
  assert.equal(k.kisayolBul({ key: "/" }), "arama");
  assert.equal(k.kisayolBul({ key: "s", ctrlKey: true, yaziAlaninda: true }), "kaydet");
  assert.equal(k.kisayolBul({ key: "?" }), "yardim");
  assert.equal(k.kisayolBul({ key: "?", shiftKey: true }), "yardim");
});

test("kisayolBul: yazı yazarken '/' ve '?' karakter olarak kalır; Alt'lı ve tanımsız tuşlar bir şey yapmaz", () => {
  assert.equal(k.kisayolBul({ key: "/", yaziAlaninda: true }), null);
  assert.equal(k.kisayolBul({ key: "?", yaziAlaninda: true }), null);
  assert.equal(k.kisayolBul({ key: "k", ctrlKey: true, yaziAlaninda: true }), "arama");
  assert.equal(k.kisayolBul({ key: "k", ctrlKey: true, altKey: true }), null);
  assert.equal(k.kisayolBul({ key: "a" }), null);
  assert.equal(k.kisayolBul({ key: "/", ctrlKey: true }), null);
});
