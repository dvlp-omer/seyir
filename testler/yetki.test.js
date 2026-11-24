// Roller ve yetkiler: saf mantık testleri.  npm test
// Asıl denetim veritabanındadır (supabase/schema.sql > 8. bölüm); buradaki kurallar
// uygulamanın ekranı ve hazır rolleri içindir. İkisi aynı eşlemeyi kullanır (aşağıda test).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const y = require("../js/yetki.js");
const { BILINEN_SEKMELER, KAPATILAMAZ } = require("../js/kurum.js");

test("yetkileriTemizle: yalnızca bilinen sekme ve seviye kalır", () => {
  assert.deepEqual(
    y.yetkileriTemizle({ gorevler: "duzenler", kisiler: "gizli", tutanaklar: "gorur", ozet: "duzenler", yok: "duzenler", takvim: "her-sey" }),
    { gorevler: "duzenler", kisiler: "gizli", tutanaklar: "gorur" });
  assert.deepEqual(y.yetkileriTemizle(null), {});
  assert.deepEqual(y.yetkileriTemizle([1, 2]), {});
});

test("enGenisSeviye: temel rol + atanan roller; en geniş yetki geçerli, yazılmayan sekme gizli", () => {
  const temel = { temel: true, yetkiler: { gorevler: "gorur", tutanaklar: "gorur" } };
  const gorevSorumlusu = { yetkiler: { gorevler: "duzenler" } };
  assert.equal(y.enGenisSeviye([temel], "gorevler"), "gorur");
  assert.equal(y.enGenisSeviye([temel, gorevSorumlusu], "gorevler"), "duzenler");
  assert.equal(y.enGenisSeviye([temel, gorevSorumlusu], "tutanaklar"), "gorur");
  assert.equal(y.enGenisSeviye([temel], "kisiler"), "gizli");
});

test("yetkilerimiHesapla: yönetici ya da rolleri kurulmamış takım her şeyi düzenler", () => {
  const roller = [{ id: "r0", temel: true, yetkiler: { gorevler: "gorur" } }, { id: "r1", yetkiler: { gorevler: "duzenler", kisiler: "gorur" } }];
  const uye = y.yetkilerimiHesapla({ yonetici: false, rolIdleri: ["r1"] }, roller);
  assert.equal(uye.yonetici, false);
  assert.equal(uye.sekmeler.gorevler, "duzenler");
  assert.equal(uye.sekmeler.kisiler, "gorur");
  assert.equal(uye.sekmeler.mesajlar, "gizli");
  const yonetici = y.yetkilerimiHesapla({ yonetici: true, rolIdleri: [] }, roller);
  assert.ok(Object.values(yonetici.sekmeler).every((s) => s === "duzenler"));
  const rolsuzTakim = y.yetkilerimiHesapla({ yonetici: false, rolIdleri: [] }, []);
  assert.ok(Object.values(rolsuzTakim.sekmeler).every((s) => s === "duzenler"), "roller kurulmadan eskisi gibi");
  assert.equal(rolsuzTakim.rollerKurulu, false);
  // Hep açık sekmeler (Özet, Ayarlar) kimseden gizlenmez
  assert.equal(uye.sekmeler.ozet, "gorur");
  assert.equal(uye.sekmeler.ayarlar, "gorur");
});

test("hazirRoller: her paket bir temel rol ve sorumluluk rolleri getirir; temel üye telefonları göremez", () => {
  for (const tur of ["takim", "sirket"]) {
    const roller = y.hazirRoller(tur);
    assert.equal(roller.filter((r) => r.temel).length, 1, tur + ": tam bir temel rol");
    const temel = roller.find((r) => r.temel);
    assert.equal(temel.yetkiler.kisiler, "gizli");
    assert.equal(temel.yetkiler.mesajlar, "gizli");
    assert.equal(temel.yetkiler.gorevler, "gorur");
    assert.ok(roller.some((r) => r.yetkiler.gorevler === "duzenler"), "görevleri düzenleyen bir rol");
    assert.ok(roller.some((r) => r.yetkiler.tutanaklar === "duzenler"), "tutanağı düzenleyen bir rol");
    assert.ok(roller.some((r) => r.yetkiler.mesajlar === "duzenler" && r.yetkiler.kisiler === "duzenler"), "iletişim rolü");
    for (const r of roller) assert.deepEqual(y.yetkileriTemizle(r.yetkiler), r.yetkiler, r.ad + ": geçersiz yetki yok");
  }
  assert.equal(y.hazirRoller("takim").find((r) => r.temel).ad, "Üye");
  assert.equal(y.hazirRoller("sirket").find((r) => r.temel).ad, "Çalışan");
});

test("yetki sekmeleri kurum sekmeleriyle uyumlu; tablo eşlemesi veritabanıyla aynı", () => {
  for (const sekme of y.YETKI_SEKMELERI) {
    assert.ok(BILINEN_SEKMELER.includes(sekme), sekme);
    assert.ok(!KAPATILAMAZ.includes(sekme) || sekme === "takim", sekme + " hep açık; yetkiye bağlanmaz");
  }
  // Veritabanında eşleme ya 8. bölümdeki döngüde ("(tablo, sekme)") ya da tablonun kendi kurallarında
  const sql = fs.readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");
  for (const [tablo, sekme] of Object.entries(y.TABLO_SEKMESI)) {
    const dongude = sql.includes("('" + tablo + "', '" + sekme + "')");
    const kendiKurali = sql.replace(/\s+/g, " ").includes("on " + tablo + " for select to authenticated using (yetki_seviyesi(takim_id, '" + sekme + "') >= 1)");
    assert.ok(dongude || kendiKurali, "SQL eşlemesinde yok: " + tablo + " -> " + sekme);
  }
});

test("menuyuYetkiyleSuz: gizli sekmeler menüden düşer, boşalan grup gizlenir; Özet ve Ayarlar kalır", () => {
  const gruplar = [
    { baslik: "", ekranlar: ["ozet"] },
    { baslik: "İletişim", ekranlar: ["kisiler", "mesajlar"] },
    { baslik: "Planlama", ekranlar: ["gorevler", "takvim"] },
    { baslik: "Takım", ekranlar: ["takim", "ayarlar"] },
  ];
  const yetki = y.yetkilerimiHesapla({ yonetici: false, rolIdleri: [] },
    [{ id: "r0", temel: true, yetkiler: { gorevler: "gorur", takvim: "gorur", takim: "gizli" } }]);
  assert.deepEqual(y.menuyuYetkiyleSuz(gruplar, yetki), [
    { baslik: "", ekranlar: ["ozet"] },
    { baslik: "Planlama", ekranlar: ["gorevler", "takvim"] },
    { baslik: "Takım", ekranlar: ["ayarlar"] },
  ]);
  assert.equal(y.sekmeGorunurMu(yetki, "kisiler"), false);
  assert.equal(y.sekmeGorunurMu(yetki, "ozet"), true);
  assert.equal(y.sekmeGorunurMu(yetki, "bilinmeyen-sekme"), true, "yetkiye bağlı olmayan ekran görünür");
  assert.equal(y.sekmeGorunurMu(null, "kisiler"), true, "yetki bilgisi yoksa (yerel kullanım) her şey görünür");
});

test("yetkiHatasiMi: veritabanının 'yetki yok' cevaplarını tanır", () => {
  assert.equal(y.yetkiHatasiMi('Supabase hatası (403): {"code":"42501","message":"new row violates row-level security policy for table \\"gorevler\\""}'), true);
  assert.equal(y.yetkiHatasiMi("permission denied for table takimlar"), true);
  assert.equal(y.yetkiHatasiMi("YETKI_YOK"), true);
  assert.equal(y.yetkiHatasiMi("Failed to fetch"), false);
  assert.equal(y.yetkiHatasiMi(undefined), false);
});
