// Kurum ayarları (ad, tür, logo, renk, tutanak bilgileri, kapalı sekmeler): saf mantık testleri.  npm test
// Buradaki kurum adları UYDURMADIR.
const test = require("node:test");
const assert = require("node:assert/strict");
const k = require("../js/kurum.js");

/* ---------- Ayarları okuma ve temizleme ---------- */

test("kurumAyarlari: ayarı olmayan (eski) takım varsayılanlarla gelir", () => {
  const a = k.kurumAyarlari({ id: "t1", ad: "Deniz Yıldızı Takımı" });
  assert.equal(a.tur, "takim");
  assert.equal(a.renk, k.VARSAYILAN_RENK);
  assert.equal(a.logo, "");
  assert.deepEqual(a.kapali_sekmeler, []);
  assert.deepEqual(Object.keys(a.tutanak).sort(), ["alt_baslik", "alt_bilgi", "ek_etiket", "kurum", "numara_kalibi", "sayfa_altligi"]);
  assert.deepEqual(k.kurumAyarlari(null), k.kurumAyarlari({}));
});

test("kurumAyarlari: bozuk ya da tehlikeli değerler atılır, varsayılana döner", () => {
  const a = k.kurumAyarlari({ ad: "X", ayarlar: {
    tur: "banka", renk: "red; background:url(x)", logo: "javascript:alert(1)",
    tutanak: { kurum: 42, numara_kalibi: "  ÖRN-{yil}/01  ", alt_bilgi: "x".repeat(500) },
    kapali_sekmeler: ["etkinlikler", "ozet", "yok-boyle-ekran", 5, "etkinlikler"],
    fazladan: "atılmalı",
  } });
  assert.equal(a.tur, "takim");
  assert.equal(a.renk, k.VARSAYILAN_RENK);
  assert.equal(a.logo, "");
  assert.equal(a.tutanak.kurum, "");
  assert.equal(a.tutanak.numara_kalibi, "ÖRN-{yil}/01");
  assert.equal(a.tutanak.alt_bilgi.length, 300);
  assert.deepEqual(a.kapali_sekmeler, ["etkinlikler"], "Özet kapatılamaz, bilinmeyen ve tekrar edenler atılır");
  assert.equal("fazladan" in a, false);
});

test("kurumAyarlari: geçerli logo ve renk korunur", () => {
  const logo = "data:image/png;base64,iVBORw0KGgo=";
  const a = k.kurumAyarlari({ ayarlar: { tur: "sirket", renk: "#1F4E79", logo } });
  assert.equal(a.tur, "sirket");
  assert.equal(a.renk, "#1f4e79");
  assert.equal(a.logo, logo);
  assert.equal(k.kurumAyarlari({ ayarlar: { logo: "data:image/svg+xml;base64,PHN2Zz4=" } }).logo, "", "SVG içinde betik olabilir; kabul edilmez");
  assert.equal(k.kurumAyarlari({ ayarlar: { logo: "data:image/png;base64," + "A".repeat(k.LOGO_EN_BUYUK + 1) } }).logo, "", "çok büyük logo");
});

/* ---------- Paketler: sözcükler ve sekmeler ---------- */

test("soz: kurum türüne göre sözcük (takım ↔ ekip, üye ↔ çalışan)", () => {
  const takim = k.kurumAyarlari({ ayarlar: { tur: "takim" } });
  const sirket = k.kurumAyarlari({ ayarlar: { tur: "sirket" } });
  assert.equal(k.soz(takim, "takim"), "Takım");
  assert.equal(k.soz(sirket, "takim"), "Ekip");
  assert.equal(k.soz(takim, "uye"), "Üye");
  assert.equal(k.soz(sirket, "uye"), "Çalışan");
  assert.equal(k.soz(sirket, "kaptan"), "Yönetici");
  // İki paketin sözlüğü aynı anahtarları taşır (biri unutulmasın)
  assert.deepEqual(Object.keys(k.SOZLUKLER.takim).sort(), Object.keys(k.SOZLUKLER.sirket).sort());
  assert.equal(k.soz(takim, "olmayan-anahtar"), "olmayan-anahtar");
});

test("paket varsayılanı: şirket paketinde Etkinlik kapalı başlar, takımda hepsi açık", () => {
  assert.deepEqual(k.paketVarsayilani("takim").kapali_sekmeler, []);
  assert.deepEqual(k.paketVarsayilani("sirket").kapali_sekmeler, ["etkinlikler"]);
  assert.equal(k.paketVarsayilani("sirket").tur, "sirket");
});

test("sekmeAcikMi: kapalı sekme menüden düşer; Özet, Takım ve Ayarlar her zaman açık", () => {
  const a = k.kurumAyarlari({ ayarlar: { kapali_sekmeler: ["etkinlikler", "duyuru"] } });
  assert.equal(k.sekmeAcikMi(a, "etkinlikler"), false);
  assert.equal(k.sekmeAcikMi(a, "gorevler"), true);
  for (const ad of k.KAPATILAMAZ) assert.equal(k.sekmeAcikMi(a, ad), true);
  assert.deepEqual(k.acikSekmeler(a, ["ozet", "gorevler", "etkinlikler", "duyuru", "ayarlar"]), ["ozet", "gorevler", "ayarlar"]);
});

/* ---------- Renk ---------- */

test("vurguRenkleri: düğme yazısı (beyaz) her renkte okunur; gerekirse renk koyulaştırılır", () => {
  // Bugünkü renk zaten okunur: olduğu gibi kalır
  assert.equal(k.vurguRenkleri("#b8451a").vurgu, "#b8451a");
  assert.equal(k.vurguRenkleri("#1f4e79").vurgu, "#1f4e79");
  for (const renk of ["#000000", "#ffffff", "#7f7f7f", "#ffd84d", "#9be9f4", "#e53935", "#43a047", "#b8451a"]) {
    const r = k.vurguRenkleri(renk);
    assert.equal(r.vurgu_yazi, "#ffffff");
    assert.ok(k.kontrastOrani(r.vurgu, "#ffffff") >= 4.5, renk + " → " + r.vurgu + " üzerindeki yazı okunmuyor");
    assert.ok(k.kontrastOrani(r.vurgu_koyu, "#ffffff") >= 4.5, renk + " üzerine gelince (hover) yazı okunmuyor");
    assert.notEqual(r.vurgu_koyu, r.vurgu, "üzerine gelince renk koyulaşmalı");
  }
});

/* ---------- Tutanak varsayılanları ---------- */

test("tutanakVarsayilani: kurum ayarı boşsa takım adından üretilir; doluysa ayar geçerli", () => {
  const bos = k.tutanakVarsayilani(k.kurumAyarlari({}), "Deniz Yıldızı Takımı");
  assert.equal(bos.kurum, "DENİZ YILDIZI TAKIMI");
  assert.equal(bos.numara_kalibi, "DENİZ-YILDIZI-TAKIMI-{yil}/01");
  assert.match(bos.alt_bilgi, /Deniz Yıldızı Takımı — Toplantı Tutanağı No\. 01/);
  assert.equal(bos.sayfa_altligi, "Toplantı Tutanağı 01");
  assert.ok(bos.devreden_giris.length > 10);

  const dolu = k.tutanakVarsayilani(k.kurumAyarlari({ ayarlar: { tutanak: {
    kurum: "ÖRNEK A.Ş.", numara_kalibi: "ÖRN/TT-{yil}/001", alt_bilgi: "Örnek A.Ş. — Tutanak 001",
  } } }), "Örnek");
  assert.equal(dolu.kurum, "ÖRNEK A.Ş.");
  assert.equal(dolu.numara_kalibi, "ÖRN/TT-{yil}/001");
  assert.equal(dolu.alt_bilgi, "Örnek A.Ş. — Tutanak 001");
});

test("tutanakVarsayilani: kodda kuruma özel sabit kalmadı (ROTA / Sabahattin Zaim yok)", () => {
  const metin = JSON.stringify(k.tutanakVarsayilani(k.kurumAyarlari({}), "Takım"));
  assert.doesNotMatch(metin, /ROTA|İSAS|Sabahattin|Zaim/i);
});
