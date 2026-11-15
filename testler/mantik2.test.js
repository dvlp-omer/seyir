// İkinci tur mantık testleri: tarih doğrulama, takvim, yoklama, faaliyet raporu.
// Çalıştırmak için:  npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../js/mantik.js");

/* ---------- Tarih doğrulama ---------- */

test("tarihGecerli: doğru biçimli gerçek tarihleri kabul eder", () => {
  assert.equal(m.tarihGecerli("2026-11-16"), true);
  assert.equal(m.tarihGecerli("2028-02-29"), true); // artık yıl
});

test("tarihGecerli: var olmayan, aralık dışı ya da bozuk tarihleri reddeder", () => {
  assert.equal(m.tarihGecerli("2026-02-30"), false); // 30 Şubat yok
  assert.equal(m.tarihGecerli("2027-02-29"), false); // artık yıl değil
  assert.equal(m.tarihGecerli("2026-13-01"), false);
  assert.equal(m.tarihGecerli("0002-01-01"), false); // yazım hatası yılı
  assert.equal(m.tarihGecerli("9999-01-01"), false);
  assert.equal(m.tarihGecerli("16.11.2026"), false);
  assert.equal(m.tarihGecerli(""), false);
  assert.equal(m.tarihGecerli(null), false);
  assert.equal(m.tarihGecerli(20261116), false);
});

test("araliktaMi: uçlar dahil, boş uç sınırsız", () => {
  assert.equal(m.araliktaMi("2026-11-16", "2026-11-16", "2026-11-16"), true);
  assert.equal(m.araliktaMi("2026-11-15", "2026-11-16", ""), false);
  assert.equal(m.araliktaMi("2030-01-01", "2026-11-16", ""), true);
  assert.equal(m.araliktaMi("1999-01-01", "", "2026-11-16"), true);
  assert.equal(m.araliktaMi("2026-11-17", "", "2026-11-16"), false);
  assert.equal(m.araliktaMi("2026-11-17", "", ""), true);
});

/* ---------- Takvim ---------- */

test("ayIzgarasi: Kasım 2026 Pazar başlar; ızgara Pazartesi 26 Ekim'den başlamalı", () => {
  const haftalar = m.ayIzgarasi(2026, 11);
  assert.equal(haftalar.length, 6);
  assert.equal(haftalar[0][0], "2026-10-26");
  assert.equal(haftalar[0][6], "2026-11-01"); // ayın 1'i Pazar sütununda
  assert.equal(haftalar[5][0], "2026-11-30");
  assert.equal(haftalar[5][6], "2026-12-06");
});

test("ayIzgarasi: her hafta 7 gün, günler ardışık, ayın bütün günleri var", () => {
  for (const [yil, ay, gunSayisi] of [[2026, 2, 28], [2028, 2, 29], [2026, 12, 31], [2027, 1, 31]]) {
    const duz = m.ayIzgarasi(yil, ay).flat();
    assert.equal(duz.length % 7, 0);
    for (let i = 1; i < duz.length; i++) {
      assert.equal(m.kalanGun(duz[i], duz[i - 1]), 1);
    }
    const onEk = yil + "-" + String(ay).padStart(2, "0") + "-";
    assert.equal(duz.filter((gun) => gun.startsWith(onEk)).length, gunSayisi);
  }
});

test("ayIzgarasi: tam 4 haftaya sığan ay (Şubat 2027 Pazartesi başlar, 28 gün)", () => {
  const haftalar = m.ayIzgarasi(2027, 2);
  assert.equal(haftalar.length, 4);
  assert.equal(haftalar[0][0], "2027-02-01");
  assert.equal(haftalar[3][6], "2027-02-28");
});

test("ayKaydir: yıl sınırını geçer", () => {
  assert.deepEqual(m.ayKaydir(2026, 12, 1), { yil: 2027, ay: 1 });
  assert.deepEqual(m.ayKaydir(2026, 1, -1), { yil: 2025, ay: 12 });
  assert.deepEqual(m.ayKaydir(2026, 11, 0), { yil: 2026, ay: 11 });
});

test("takvimOgeleri: üç kaynağı güne göre toplar", () => {
  const gunler = m.takvimOgeleri(
    [{ id: "s1", baslik: "Rapor", tarih: "2026-11-25", tamamlandi: false }],
    [{ id: "t1", baslik: "Haftalık", tarih: "2026-11-25", saat: "19:00" }],
    [{ id: "e1", ad: "Stant", tarih: "2026-11-28" }, { id: "e2", ad: "Tarihsiz", tarih: "" }],
  );
  assert.deepEqual(Object.keys(gunler).sort(), ["2026-11-25", "2026-11-28"]);
  assert.deepEqual(gunler["2026-11-25"].map((o) => o.tur), ["son_tarih", "toplanti"]);
  assert.equal(gunler["2026-11-28"][0].baslik, "Stant"); // etkinlikte alan adı "ad"
});

/* ---------- Yoklama ---------- */

const UYELER = [{ id: "a", ad: "Ayşe" }, { id: "b", ad: "Burak" }, { id: "c", ad: "Can" }];

test("katilimOranlari: katıldığı / sayılan buluşma, yüzde yuvarlanır", () => {
  const bulusmalar = [
    { tarih: "2026-11-01", katilimci_idler: ["a", "b"] },
    { tarih: "2026-11-08", katilimci_idler: ["a"] },
    { tarih: "2026-11-15", katilimci_idler: ["a", "b", "c"] },
  ];
  const sonuc = m.katilimOranlari(UYELER, bulusmalar, "2026-11-16");
  assert.deepEqual(sonuc.map((s) => [s.ad, s.katildi, s.toplam, s.yuzde]), [
    ["Ayşe", 3, 3, 100],
    ["Burak", 2, 3, 67],
    ["Can", 1, 3, 33],
  ]);
});

test("katilimOranlari: gelecekteki ve yoklaması alınmamış buluşmalar sayılmaz", () => {
  const bulusmalar = [
    { tarih: "2026-11-10", katilimci_idler: ["a"] },
    { tarih: "2026-11-16", katilimci_idler: ["b"] },       // bugün: sayılır
    { tarih: "2026-11-20", katilimci_idler: ["a", "b"] },  // gelecek: sayılmaz
    { tarih: "2026-11-05", katilimci_idler: [] },          // yoklama alınmamış: sayılmaz
    { tarih: "2026-11-06" },                               // alan hiç yok: sayılmaz
  ];
  const sonuc = m.katilimOranlari(UYELER, bulusmalar, "2026-11-16");
  assert.deepEqual(sonuc.map((s) => [s.katildi, s.toplam]), [[1, 2], [1, 2], [0, 2]]);
});

test("katilimOranlari: hiç buluşma yoksa yüzde null (0'a bölme yok)", () => {
  const sonuc = m.katilimOranlari(UYELER, [], "2026-11-16");
  assert.equal(sonuc.length, 3);
  assert.ok(sonuc.every((s) => s.toplam === 0 && s.yuzde === null));
  assert.deepEqual(m.katilimOranlari([], [{ tarih: "2026-11-01", katilimci_idler: ["x"] }], "2026-11-16"), []);
});

test("katilimOranlari: silinmiş üyenin kimliği listede kalsa da sonucu bozmaz", () => {
  const sonuc = m.katilimOranlari([UYELER[0]], [{ tarih: "2026-11-01", katilimci_idler: ["silinmis", "a"] }], "2026-11-16");
  assert.deepEqual(sonuc, [{ uye_id: "a", ad: "Ayşe", katildi: 1, toplam: 1, yuzde: 100 }]);
});

/* ---------- Faaliyet raporu ---------- */

const ETKINLIKLER = [
  { ad: "Stant", tarih: "2026-11-20", katilimci_sayisi: 120 },
  { ad: "Okul ziyareti", tarih: "2026-10-05", katilimci_sayisi: 45 },
  { ad: "Seminer", tarih: "2026-11-02", katilimci_sayisi: 0 },
  { ad: "Eski", tarih: "2026-03-01", katilimci_sayisi: 30 },
];
const TOPLANTILAR = [{ tarih: "2026-11-12" }, { tarih: "2026-10-01" }, { tarih: "2026-01-01" }];

test("faaliyetOzeti: aralıktaki etkinlikler eskiden yeniye, sayılar doğru", () => {
  const ozet = m.faaliyetOzeti(ETKINLIKLER, TOPLANTILAR, "2026-10-01", "2026-11-30");
  assert.deepEqual(ozet.etkinlikler.map((e) => e.ad), ["Okul ziyareti", "Seminer", "Stant"]);
  assert.equal(ozet.etkinlik_sayisi, 3);
  assert.equal(ozet.toplam_katilimci, 165);
  assert.equal(ozet.toplanti_sayisi, 2);
});

test("faaliyetOzeti: boş aralık her şeyi kapsar; eşleşme yoksa sıfırlar", () => {
  assert.equal(m.faaliyetOzeti(ETKINLIKLER, TOPLANTILAR, "", "").etkinlik_sayisi, 4);
  const bos = m.faaliyetOzeti(ETKINLIKLER, TOPLANTILAR, "2030-01-01", "2030-12-31");
  assert.deepEqual([bos.etkinlik_sayisi, bos.toplam_katilimci, bos.toplanti_sayisi], [0, 0, 0]);
});

test("faaliyetOzeti: katılımcı sayısı eksik ya da metin olsa da toplam bozulmaz", () => {
  const ozet = m.faaliyetOzeti(
    [{ ad: "A", tarih: "2026-11-01" }, { ad: "B", tarih: "2026-11-02", katilimci_sayisi: "12" }], [], "", "");
  assert.equal(ozet.toplam_katilimci, 12);
});
