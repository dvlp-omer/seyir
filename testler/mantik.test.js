// Saf mantık testleri. Çalıştırmak için:  node --test "testler/*.test.js"   (ya da: npm test)
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../js/mantik.js");

test("kalanGun: bugün 0, gelecek artı, geçmiş eksi", () => {
  assert.equal(m.kalanGun("2026-11-16", "2026-11-16"), 0);
  assert.equal(m.kalanGun("2026-11-17", "2026-11-16"), 1);
  assert.equal(m.kalanGun("2026-11-10", "2026-11-16"), -6);
});

test("kalanGun: ay ve yıl sınırlarını, artık yılı doğru hesaplar", () => {
  assert.equal(m.kalanGun("2027-01-01", "2026-12-31"), 1);
  assert.equal(m.kalanGun("2028-03-01", "2028-02-28"), 2); // 2028 artık yıl
  assert.equal(m.kalanGun("2027-11-16", "2026-11-16"), 365);
});

test("kalanGunMetni", () => {
  assert.equal(m.kalanGunMetni(0), "Bugün");
  assert.equal(m.kalanGunMetni(1), "Yarın");
  assert.equal(m.kalanGunMetni(9), "9 gün kaldı");
  assert.equal(m.kalanGunMetni(-1), "1 gün gecikti");
  assert.equal(m.kalanGunMetni(-4), "4 gün gecikti");
});

test("aciliyet sınırları", () => {
  assert.equal(m.aciliyet(-1), "gecikti");
  assert.equal(m.aciliyet(0), "yakin");
  assert.equal(m.aciliyet(3), "yakin");
  assert.equal(m.aciliyet(4), "yaklasiyor");
  assert.equal(m.aciliyet(7), "yaklasiyor");
  assert.equal(m.aciliyet(8), "rahat");
});

test("tarihYaz: Türkçe ay ve gün adı", () => {
  assert.equal(m.tarihYaz("2026-11-16"), "16 Kasım 2026 Pazartesi");
  assert.equal(m.tarihYaz("2026-11-25", false), "25 Kasım 2026");
  assert.equal(m.tarihYaz(""), "");
});

test("tarihMetni: Date -> YYYY-AA-GG (tek haneler sıfırla dolar)", () => {
  assert.equal(m.tarihMetni(new Date(2026, 0, 5)), "2026-01-05");
});

test("gunEkle: ay ve yıl sınırını geçer, eksi sayıyla geri gider", () => {
  assert.equal(m.gunEkle("2026-11-30", 2), "2026-12-02");
  assert.equal(m.gunEkle("2026-12-31", 1), "2027-01-01");
  assert.equal(m.gunEkle("2026-03-01", -1), "2026-02-28");
});

test("tariheGoreSirala: eskiden yeniye, tarihsizler sonda, asıl liste değişmez", () => {
  const liste = [{ t: "2026-12-01" }, { t: "" }, { t: "2026-11-20" }];
  const sirali = m.tariheGoreSirala(liste, "t");
  assert.deepEqual(sirali.map((x) => x.t), ["2026-11-20", "2026-12-01", ""]);
  assert.equal(liste[0].t, "2026-12-01");
});

test("gorevGecikti: biten ya da tarihsiz görev gecikmiş sayılmaz", () => {
  const bugun = "2026-11-16";
  assert.equal(m.gorevGecikti({ durum: "yapilacak", bitis_tarihi: "2026-11-15" }, bugun), true);
  assert.equal(m.gorevGecikti({ durum: "bitti", bitis_tarihi: "2026-11-15" }, bugun), false);
  assert.equal(m.gorevGecikti({ durum: "yapiliyor", bitis_tarihi: "2026-11-16" }, bugun), false);
  assert.equal(m.gorevGecikti({ durum: "yapilacak", bitis_tarihi: "" }, bugun), false);
});

test("gorevSayilari", () => {
  const gorevler = [
    { durum: "yapilacak", bitis_tarihi: "2026-11-01" },
    { durum: "yapiliyor", bitis_tarihi: "2026-12-01" },
    { durum: "bitti", bitis_tarihi: "2026-11-01" },
    { durum: "bitti" },
  ];
  assert.deepEqual(m.gorevSayilari(gorevler, "2026-11-16"),
    { yapilacak: 1, yapiliyor: 1, bitti: 2, geciken: 1 });
});

test("satirlaraAyir: boş satırları ve madde işaretlerini temizler", () => {
  const metin = "- Bütçe\n\n  2. Sponsor görüşmesi \n• Havuz testi\n3) Rapor\nDüz satır";
  assert.deepEqual(m.satirlaraAyir(metin),
    ["Bütçe", "Sponsor görüşmesi", "Havuz testi", "Rapor", "Düz satır"]);
  assert.deepEqual(m.satirlaraAyir(""), []);
  assert.deepEqual(m.satirlaraAyir(null), []);
});

test("satirlaraAyir: sayıyla başlayan normal cümleyi bozmaz", () => {
  assert.deepEqual(m.satirlaraAyir("3 motor sipariş edilecek"), ["3 motor sipariş edilecek"]);
});

test("kararlariBirlestir: metni değişmeyen kararın görev bağı korunur", () => {
  const eski = [
    { metin: "Motor alınacak", gorev_id: "g1" },
    { metin: "Rapor yazılacak", gorev_id: null },
  ];
  const yeni = m.kararlariBirlestir(["Yeni karar", "Motor alınacak"], eski);
  assert.deepEqual(yeni, [
    { metin: "Yeni karar", gorev_id: null },
    { metin: "Motor alınacak", gorev_id: "g1" },
  ]);
});

test("kararlariBirlestir: aynı metin iki kez yazılırsa bağ sadece birine geçer", () => {
  const eski = [{ metin: "X", gorev_id: "g1" }];
  const yeni = m.kararlariBirlestir(["X", "X"], eski);
  assert.deepEqual(yeni.map((k) => k.gorev_id), ["g1", null]);
});

test("htmlKacis: özel karakterleri zararsız hâle getirir", () => {
  assert.equal(m.htmlKacis('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(m.htmlKacis(null), "");
});

test("duyuruToplantiDaveti: tam bilgiyle", () => {
  const metin = m.duyuruToplantiDaveti({
    takim: "ROTA İSAS", baslik: "Haftalık toplantı", tarih: "2026-11-18",
    saat: "19:00", yer: "Atölye", gundem: ["Bütçe", "Havuz testi"], not: "",
  });
  assert.equal(metin, [
    "📢 *ROTA İSAS — Toplantı Duyurusu*",
    "",
    "*Konu:* Haftalık toplantı",
    "🗓 *Tarih:* 18 Kasım 2026 Çarşamba",
    "🕖 *Saat:* 19:00",
    "📍 *Yer:* Atölye",
    "",
    "*Gündem:*",
    "1. Bütçe",
    "2. Havuz testi",
    "",
    "Katılamayacak olanlar lütfen önceden haber versin.",
  ].join("\n"));
});

test("duyuruToplantiDaveti: boş alanların satırı yazılmaz", () => {
  const metin = m.duyuruToplantiDaveti({ takim: "T", baslik: "Toplantı", tarih: "2026-11-18", gundem: [] });
  assert.ok(!metin.includes("Saat"));
  assert.ok(!metin.includes("Yer"));
  assert.ok(!metin.includes("Gündem"));
  assert.ok(!metin.includes("\n\n\n"));
});

test("duyuruToplantiOzeti: kararlar ve görevler", () => {
  const metin = m.duyuruToplantiOzeti({
    takim: "ROTA İSAS", baslik: "Haftalık toplantı", tarih: "2026-11-18",
    kararlar: ["Motor alınacak"],
    gorevler: [
      { baslik: "Motor siparişi", sorumlu: "Ali", bitis_tarihi: "2026-11-25" },
      { baslik: "Afiş", sorumlu: "", bitis_tarihi: "" },
    ],
  });
  assert.ok(metin.includes("Haftalık toplantı · 18 Kasım 2026 Çarşamba"));
  assert.ok(metin.includes("1. Motor alınacak"));
  assert.ok(metin.includes("• Motor siparişi — Ali (son: 25 Kasım 2026)"));
  assert.ok(metin.includes("• Afiş — sorumlu atanmadı"));
});

test("duyuruHatirlatma: kalan günü yazar", () => {
  const metin = m.duyuruHatirlatma({
    takim: "ROTA İSAS", baslik: "Ön Tasarım Raporu", tarih: "2026-11-25",
    bugun: "2026-11-16", not: "Taslaklar cumaya kadar.",
  });
  assert.equal(metin, [
    "⏰ *ROTA İSAS — Hatırlatma*",
    "",
    "*Ön Tasarım Raporu*",
    "🗓 25 Kasım 2026 Çarşamba (9 gün kaldı)",
    "",
    "Taslaklar cumaya kadar.",
  ].join("\n"));
});
