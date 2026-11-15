// Renk kontrastı testi. Çalıştırmak için:  npm test
//
// css/stil.css içindeki renk değişkenlerini okur ve yazı/zemin çiftlerinin
// WCAG 2 kontrast oranını hesaplar. Açık ve koyu temanın ikisi de denetlenir.
// Hedefler: normal yazı en az 4,5 — arayüz öğeleri (kenar, odak halkası) en az 3.
// Biri bir rengi değiştirip okunmaz hâle getirirse bu test kırılır.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "css", "stil.css"), "utf8");

// Bir seçici bloğundaki "--ad: #rrggbb;" tanımlarını nesneye çevirir.
function degiskenler(secici) {
  const baslangic = css.indexOf(secici + " {");
  assert.notEqual(baslangic, -1, secici + " bloğu bulunamadı");
  const blok = css.slice(baslangic, css.indexOf("}", baslangic));
  const sonuc = {};
  for (const [, ad, deger] of blok.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    sonuc[ad] = deger;
  }
  return sonuc;
}

// WCAG göreli parlaklık ve kontrast oranı formülleri
function parlaklik(renk) {
  const [k, y, m] = [1, 3, 5]
    .map((i) => parseInt(renk.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k + 0.7152 * y + 0.0722 * m;
}
function kontrast(a, b) {
  const [acik, koyu] = [parlaklik(a), parlaklik(b)].sort((x, y) => y - x);
  return (acik + 0.05) / (koyu + 0.05);
}

const acik = degiskenler(":root");
// Koyu tema sadece değişenleri tanımlar; gerisi açık temadan gelir.
const koyu = { ...acik, ...degiskenler(':root[data-tema="koyu"]') };

// [yazı, zemin, en az oran]
const YAZI_CIFTLERI = [
  ["yazi", "zemin", 4.5], ["yazi", "kagit", 4.5], ["yazi", "sutun", 4.5], ["yazi", "giris-zemin", 4.5],
  ["soluk", "zemin", 4.5], ["soluk", "kagit", 4.5], ["soluk", "sutun", 4.5],
  ["su", "kagit", 4.5], ["su", "sutun", 4.5], ["su", "zemin", 4.5],
  ["vurgu-yazi", "vurgu", 4.5], ["vurgu-yazi", "vurgu-koyu", 4.5],
  ["rozet-y", "rozet-z", 4.5],
  ["gecikti-y", "gecikti-z", 4.5], ["yakin-y", "yakin-z", 4.5],
  ["yaklasiyor-y", "yaklasiyor-z", 4.5], ["rahat-y", "rahat-z", 4.5],
  ["gecikti-y", "kagit", 4.5], ["rahat-y", "sutun", 4.5],
  ["yazi", "balon", 4.5],
  // Yan menü ve öne çıkan kutu (iki temada aynı)
  ["gece-yazi", "gece-1", 4.5], ["gece-yazi", "gece-3", 4.5],
  ["gece-soluk", "gece-1", 4.5], ["gece-soluk", "gece-2", 4.5], ["gece-vurgu", "gece-2", 4.5],
  // Arayüz öğeleri: 3 yeterli
  ["giris-cizgi", "giris-zemin", 3], ["giris-cizgi", "kagit", 3],
  ["odak", "zemin", 3], ["odak", "kagit", 3], ["odak", "sutun", 3],
  ["nokta-son-tarih", "kagit", 3], ["nokta-toplanti", "kagit", 3], ["nokta-etkinlik", "kagit", 3],
];

for (const [temaAdi, tema] of [["açık", acik], ["koyu", koyu]]) {
  test("kontrast (" + temaAdi + " tema): bütün yazı/zemin çiftleri yeterli", () => {
    const yetersizler = [];
    for (const [yazi, zemin, enAz] of YAZI_CIFTLERI) {
      assert.ok(tema[yazi], "--" + yazi + " tanımlı değil");
      assert.ok(tema[zemin], "--" + zemin + " tanımlı değil");
      const oran = kontrast(tema[yazi], tema[zemin]);
      if (oran < enAz) yetersizler.push("--" + yazi + " / --" + zemin + " = " + oran.toFixed(2) + " (en az " + enAz + ")");
    }
    assert.deepEqual(yetersizler, []);
  });
}

test("kontrast formülü: siyah/beyaz 21, aynı renk 1", () => {
  assert.equal(Math.round(kontrast("#000000", "#ffffff")), 21);
  assert.equal(kontrast("#123456", "#123456"), 1);
});

test("stil.css: renkler yalnızca değişken bloklarında tanımlı (aşağıda #rrggbb yok)", () => {
  // "2) Temel" bölümünden sonrasında doğrudan renk kodu olmamalı.
  // İstisnalar: saf beyaz (koyu zemin üstü yazı) ve yazdırma bloğu.
  const govde = css.slice(css.indexOf("/* ---------- 2) Temel"), css.indexOf("/* ---------- 8) Yazdırma"));
  const bulunanlar = [...govde.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((e) => e[0].toLowerCase())
    .filter((renk) => !["#ffffff", "#ffb4ab", "#6fd3a0"].includes(renk));
  assert.deepEqual(bulunanlar, []);
});
