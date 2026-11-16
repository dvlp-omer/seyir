// Resmî tutanak mantığının testleri.  npm test
// Buradaki bütün adlar ve kararlar uydurmadır.
const test = require("node:test");
const assert = require("node:assert/strict");

Object.assign(global, require("../js/mantik.js")); // tutanak.js bunları globalden bulur
const t = require("../js/tutanak.js");
const { ornekTutanak } = require("./ornek-tutanak.js");

/* ---------- Numara ---------- */

test("sonrakiTutanakNo: son sayıyı artırır, sıfır dolgusunu korur", () => {
  assert.equal(t.sonrakiTutanakNo("ROTA/İSAS-2026/04", "2026"), "ROTA/İSAS-2026/05");
  assert.equal(t.sonrakiTutanakNo("ROTA/İSAS-2026/09", "2026"), "ROTA/İSAS-2026/10");
  assert.equal(t.sonrakiTutanakNo("ROTA/İSAS-2026/99", "2026"), "ROTA/İSAS-2026/100");
  assert.equal(t.sonrakiTutanakNo("T-7", "2026"), "T-8");
  assert.equal(t.sonrakiTutanakNo("2026/004 (taslak)", "2026"), "2026/005 (taslak)");
});

test("sonrakiTutanakNo: yıl değişince yılı günceller ve sayacı 01'e döndürür", () => {
  assert.equal(t.sonrakiTutanakNo("ROTA/İSAS-2026/12", "2027"), "ROTA/İSAS-2027/01");
});

test("sonrakiTutanakNo: ilk tutanakta varsayılan kalıp; sayısız numarada ek", () => {
  assert.equal(t.sonrakiTutanakNo("", "2026"), "ROTA/İSAS-2026/01");
  assert.equal(t.sonrakiTutanakNo(undefined, "2026"), "ROTA/İSAS-2026/01");
  assert.equal(t.sonrakiTutanakNo("Açılış", "2026"), "Açılış-2");
});

test("tutanakSirasi: numaradaki son sayı grubu", () => {
  assert.equal(t.tutanakSirasi("ROTA/İSAS-2026/04"), "04");
  assert.equal(t.tutanakSirasi("T-12 (ek)"), "12");
  assert.equal(t.tutanakSirasi("Açılış"), "");
});

test("sirayiYaziyla", () => {
  assert.equal(t.sirayiYaziyla(1), "Birinci");
  assert.equal(t.sirayiYaziyla(4), "Dördüncü");
  assert.equal(t.sirayiYaziyla(10), "Onuncu");
  assert.equal(t.sirayiYaziyla(11), "On Birinci");
  assert.equal(t.sirayiYaziyla(20), "Yirminci");
  assert.equal(t.sirayiYaziyla(37), "Otuz Yedinci");
  assert.equal(t.sirayiYaziyla(100), "100.");
});

test("sirayiGuncelle: sıra sözcüğünü ya da sayısını bir sonrakine çevirir", () => {
  assert.equal(t.sirayiGuncelle("İSAS Akademi — Dördüncü Toplantı", "04", "05"), "İSAS Akademi — Beşinci Toplantı");
  assert.equal(t.sirayiGuncelle("İSAS Akademi — Toplantı Tutanağı 04", "04", "05"), "İSAS Akademi — Toplantı Tutanağı 05");
  assert.equal(
    t.sirayiGuncelle("ROTA: İSAS Akademi — Toplantı Tutanağı No. 04 — İstanbul Sabahattin Zaim Üniversitesi", "04", "05"),
    "ROTA: İSAS Akademi — Toplantı Tutanağı No. 05 — İstanbul Sabahattin Zaim Üniversitesi");
  // Başka sayıların parçası olan rakamlara dokunmaz (2024 içindeki 4 gibi)
  assert.equal(t.sirayiGuncelle("2024 dönemi — Tutanak 4", "4", "5"), "2024 dönemi — Tutanak 5");
  // Sıra geçmiyorsa metin aynen kalır
  assert.equal(t.sirayiGuncelle("Genel Kurul", "04", "05"), "Genel Kurul");
  assert.equal(t.sirayiGuncelle("", "04", "05"), "");
});

/* ---------- Taslak, kopya, devreden ---------- */

test("yeniTutanakTaslagi: ilk tutanak varsayılanlarla ve 01 numarasıyla gelir", () => {
  const taslak = t.yeniTutanakTaslagi([], "2026-03-19");
  assert.equal(taslak.numara, "ROTA/İSAS-2026/01");
  assert.equal(taslak.kurum, t.TUTANAK_VARSAYILAN.kurum);
  assert.equal(taslak.toplanti_tarihi, "2026-03-19");
  assert.deepEqual(taslak.kararlar, []);
});

test("yeniTutanakTaslagi: öncekinden kurum ve katılımcıları alır, sırayı ilerletir, kararları almaz", () => {
  const onceki = ornekTutanak();
  const taslak = t.yeniTutanakTaslagi([onceki], "2026-03-19");
  assert.equal(taslak.numara, "ROTA/İSAS-2026/05");
  assert.equal(taslak.alt_baslik, "İSAS Akademi — Beşinci Toplantı");
  assert.equal(taslak.sayfa_altligi, "İSAS Akademi — Toplantı Tutanağı 05");
  assert.match(taslak.alt_bilgi, /No\. 05 —/);
  assert.deepEqual(taslak.katilimcilar, onceki.katilimcilar);
  assert.deepEqual(taslak.kararlar, []);
  assert.deepEqual(taslak.devreden, []);
  assert.equal(taslak.sonraki_toplanti, "");
  // Kopya bağımsız olmalı: taslağı değiştirmek önceki tutanağı bozmaz
  taslak.katilimcilar.push("Yeni Üye");
  assert.equal(onceki.katilimcilar.length, 6);
});

test("yeniTutanakTaslagi: 'son' tutanak listedeki sıraya değil toplantı tarihine göre seçilir", () => {
  const eski = { ...ornekTutanak(), id: "a", numara: "ROTA/İSAS-2026/02", toplanti_tarihi: "2026-02-01" };
  const yeni = { ...ornekTutanak(), id: "b", numara: "ROTA/İSAS-2026/07", toplanti_tarihi: "2026-05-01" };
  assert.equal(t.yeniTutanakTaslagi([yeni, eski], "2026-05-08").numara, "ROTA/İSAS-2026/08");
});

test("tutanakKopyasi: içeriği kopyalar, numarayı yeniler, tarihleri bugüne çeker", () => {
  const kaynak = ornekTutanak();
  const kopya = t.tutanakKopyasi(kaynak, [kaynak], "2026-04-02");
  assert.equal(kopya.numara, "ROTA/İSAS-2026/05");
  assert.equal(kopya.alt_baslik, "İSAS Akademi — Beşinci Toplantı");
  assert.deepEqual(kopya.kararlar, kaynak.kararlar);
  assert.deepEqual(kopya.devreden, kaynak.devreden);
  assert.equal(kopya.toplanti_tarihi, "2026-04-02");
  assert.equal(kopya.sonraki_toplanti, "");
  assert.equal("id" in kopya, false); // kopya yeni bir kayıttır
  kopya.devreden[0].metin = "değişti";
  assert.notEqual(kaynak.devreden[0].metin, "değişti");
});

test("devredenAdaylari: önceki kararlara atıf üretir, devredenlerin atfını korur", () => {
  const dort = ornekTutanak();
  const adaylar = t.devredenAdaylari([dort], "baska-id");
  assert.equal(adaylar.length, dort.kararlar.length + dort.devreden.length);
  assert.deepEqual(adaylar[1], { kaynak_no: "ROTA/İSAS-2026/04", metin: dort.kararlar[1], atif: "ROTA/İSAS-2026/04, Karar 2" });
  // Zaten devreden bir karar: ilk alındığı toplantının atfı korunur
  assert.equal(adaylar.at(-1).atif, "ROTA/İSAS-2026/03, Karar 2");
});

test("devredenAdaylari: düzenlenen tutanağın kendisi ve yinelenen kararlar listelenmez", () => {
  const dort = ornekTutanak();
  const bes = { ...ornekTutanak(), id: "bes", numara: "ROTA/İSAS-2026/05", toplanti_tarihi: "2026-03-19", kararlar: ["Yeni karar"] };
  assert.deepEqual(t.devredenAdaylari([dort], dort.id), []);
  const adaylar = t.devredenAdaylari([dort, bes], "alti");
  assert.equal(adaylar[0].metin, "Yeni karar"); // en yeni tutanak üstte
  // 5. tutanak 4.'nün devredenlerini aynen taşıyor: her biri yalnızca bir kez görünür
  const atiflar = adaylar.map((a) => a.atif);
  assert.equal(atiflar.filter((a) => a === "ROTA/İSAS-2026/01, Karar 1").length, 1);
});

/* ---------- Notlardan ayrıştırma ---------- */

test("tarihCoz: yaygın yazımlar", () => {
  assert.equal(t.tarihCoz("12.03.2026"), "2026-03-12");
  assert.equal(t.tarihCoz("5/3/2026"), "2026-03-05");
  assert.equal(t.tarihCoz("12 Mart 2026 Perşembe"), "2026-03-12");
  assert.equal(t.tarihCoz("12 mart 2026, saat 17.30"), "2026-03-12");
  assert.equal(t.tarihCoz("2026-03-12"), "2026-03-12");
  assert.equal(t.tarihCoz("1 Şubat 2026"), "2026-02-01");
  assert.equal(t.tarihCoz("31.02.2026"), ""); // böyle bir gün yok
  assert.equal(t.tarihCoz("12 Marth 2026"), "");
  assert.equal(t.tarihCoz("haftaya"), "");
  assert.equal(t.tarihCoz(""), "");
});

const ORNEK_NOT = `İSAS Akademi dördüncü toplantı notları

Toplantı Tarihi: 12.03.2026
Tutanak Tarihi: 13 Mart 2026
Sonraki Toplantı: 19 Mart 2026 Perşembe, 17.30
Seminer/Buluşma: Sızdırmazlık semineri — 26 Mart
Katılımcılar: Çağla Öztürk, Şükrü Işık; Gökçe Ünal

Devreden Kararlar:
1. Haftalık toplantıların perşembe günü yapılmasına (ROTA/İSAS-2026/01, Karar 1)
2) Tekliflerin danışmana sunulmasına

Kararlar:
1. Raporun bölümler hâlinde yazılmasına;
   mekanik bölümün Gökçe Ünal tarafından hazırlanmasına
2. Havuz izni için yazı hazırlanmasına
- Fiyat teklifi alınmasına

Görev Durumu:
• Taslaklar çarşambaya kadar yüklenecek
• Sonraki toplantı atölyede yapılacak`;

test("notlariAyristir: etiketli alanlar", () => {
  const sonuc = t.notlariAyristir(ORNEK_NOT);
  assert.equal(sonuc.toplanti_tarihi, "2026-03-12");
  assert.equal(sonuc.tutanak_tarihi, "2026-03-13");
  assert.equal(sonuc.sonraki_toplanti, "19 Mart 2026 Perşembe, 17.30");
  assert.equal(sonuc.ek_etiket, "Seminer/Buluşma");
  assert.equal(sonuc.ek_deger, "Sızdırmazlık semineri — 26 Mart");
  assert.deepEqual(sonuc.katilimcilar, ["Çağla Öztürk", "Şükrü Işık", "Gökçe Ünal"]);
});

test("notlariAyristir: numaralı satır madde başlatır, numarasız satır öncekinin devamıdır", () => {
  const sonuc = t.notlariAyristir(ORNEK_NOT);
  assert.deepEqual(sonuc.kararlar, [
    "Raporun bölümler hâlinde yazılmasına; mekanik bölümün Gökçe Ünal tarafından hazırlanmasına",
    "Havuz izni için yazı hazırlanmasına",
    "Fiyat teklifi alınmasına",
  ]);
  assert.deepEqual(sonuc.gorevler, ["Taslaklar çarşambaya kadar yüklenecek", "Sonraki toplantı atölyede yapılacak"]);
});

test("notlariAyristir: devreden kararda parantez içindeki atıf ayrılır", () => {
  const sonuc = t.notlariAyristir(ORNEK_NOT);
  assert.deepEqual(sonuc.devreden, [
    { metin: "Haftalık toplantıların perşembe günü yapılmasına", atif: "ROTA/İSAS-2026/01, Karar 1" },
    { metin: "Tekliflerin danışmana sunulmasına", atif: "" },
  ]);
});

test("notlariAyristir: tanınmayan satırlar atılmaz, 'artan' listesine girer", () => {
  const sonuc = t.notlariAyristir(ORNEK_NOT);
  assert.deepEqual(sonuc.artan, ["İSAS Akademi dördüncü toplantı notları"]);
  // Anlaşılamayan tarih de kaybolmaz
  const bozuk = t.notlariAyristir("Toplantı Tarihi: geçen perşembe\nKararlar:\nBir karar");
  assert.equal(bozuk.toplanti_tarihi, "");
  assert.deepEqual(bozuk.artan, ["Toplantı Tarihi: geçen perşembe"]);
  assert.deepEqual(bozuk.kararlar, ["Bir karar"]);
});

test("notlariAyristir: hiç numara yoksa bölümdeki her satır ayrı maddedir", () => {
  const sonuc = t.notlariAyristir("KARARLAR\nMotor alınacak\nAfiş basılacak\n\nGörevler:\nRapor yazılacak");
  assert.deepEqual(sonuc.kararlar, ["Motor alınacak", "Afiş basılacak"]);
  assert.deepEqual(sonuc.gorevler, ["Rapor yazılacak"]);
});

test("notlariAyristir: uygulamanın kendi başlıkları (MADDE 1-2-3) ve büyük/küçük harf", () => {
  const metin = [
    "TUTANAK NO: ROTA/İSAS-2026/04",
    "MADDE 1 — DEVREDEN KARARLAR", "1. Eski karar",
    "MADDE 2 — BU TOPLANTIDA ALINAN KARARLAR", "1. Yeni karar",
    "MADDE 3 — GÖREV DURUMU VE SONRAKİ TOPLANTI", "1. Bir görev",
    "TOPLANTI KATILIMCILARI", "Çağla Öztürk", "Şükrü Işık",
  ].join("\n");
  const sonuc = t.notlariAyristir(metin);
  assert.equal(sonuc.numara, "ROTA/İSAS-2026/04");
  assert.deepEqual(sonuc.devreden, [{ metin: "Eski karar", atif: "" }]);
  assert.deepEqual(sonuc.kararlar, ["Yeni karar"]);
  assert.deepEqual(sonuc.gorevler, ["Bir görev"]);
  assert.deepEqual(sonuc.katilimcilar, ["Çağla Öztürk", "Şükrü Işık"]);
  assert.deepEqual(sonuc.artan, []);
});

test("notlariAyristir: etiket bir satırda, değeri alt satırda (Word tablosundan gelen metin)", () => {
  const sonuc = t.notlariAyristir("Toplantı Tarihi\n12 Mart 2026\nSonraki Toplantı:\n19 Mart 2026\nKatılımcılar:\nÇağla Öztürk\nŞükrü Işık\nKararlar:\n1. Karar");
  assert.equal(sonuc.toplanti_tarihi, "2026-03-12");
  assert.equal(sonuc.sonraki_toplanti, "19 Mart 2026");
  assert.deepEqual(sonuc.katilimcilar, ["Çağla Öztürk", "Şükrü Işık"]);
  assert.deepEqual(sonuc.kararlar, ["Karar"]);
});

test("notlariAyristir: içinde iki nokta geçen karar, etiket sanılmaz", () => {
  const sonuc = t.notlariAyristir("Kararlar:\n1. Toplantı saati: 17.30 olarak belirlendi\n2. Bütçe: 5000 TL");
  assert.deepEqual(sonuc.kararlar, ["Toplantı saati: 17.30 olarak belirlendi", "Bütçe: 5000 TL"]);
});

test("notlariAyristir: başlık ve ilk madde aynı satırda; aynı ad iki kez yazılmışsa bir kez", () => {
  const sonuc = t.notlariAyristir("Katılımcılar: Çağla Öztürk, Şükrü Işık\nKararlar: 1) İlk karar\n2) İkinci karar\nToplantı Katılımcıları\nÇağla Öztürk");
  assert.deepEqual(sonuc.kararlar, ["İlk karar", "İkinci karar"]);
  assert.deepEqual(sonuc.katilimcilar, ["Çağla Öztürk", "Şükrü Işık"]);
});

test("notlariAyristir: boş ya da anlamsız girdide çökmeden boş tutanak döner", () => {
  for (const girdi of ["", null, undefined, "\n\n  \n"]) {
    const sonuc = t.notlariAyristir(girdi);
    assert.deepEqual(sonuc.kararlar, []);
    assert.deepEqual(sonuc.artan, []);
  }
});

test("notlariBirlestir: notta bulunan alanlar yazılır, bulunmayanlar formdaki gibi kalır", () => {
  const mevcut = { ...t.bosTutanak(), kurum: "KULÜP", numara: "ROTA/İSAS-2026/05", kararlar: ["eski"], katilimcilar: ["Eski Üye"] };
  const sonuc = t.notlariBirlestir(mevcut, t.notlariAyristir("Kararlar:\n1. yeni karar"));
  assert.equal(sonuc.kurum, "KULÜP");
  assert.equal(sonuc.numara, "ROTA/İSAS-2026/05");
  assert.deepEqual(sonuc.kararlar, ["yeni karar"]);
  assert.deepEqual(sonuc.katilimcilar, ["Eski Üye"]);
  assert.equal("artan" in sonuc, false);
});

/* ---------- Belge çıktısı ---------- */

test("tutanakBelgeHtml: bütün bölümler ve içerik sırayla yer alır", () => {
  const html = t.tutanakBelgeHtml(ornekTutanak());
  const sirali = [
    "İSTANBUL SABAHATTİN ZAİM ÜNİVERSİTESİ TEKNOFEST KULÜBÜ", "TOPLANTI TUTANAĞI",
    "İSAS Akademi — Dördüncü Toplantı", "Tutanak No: ROTA/İSAS-2026/04",
    "Toplantı Tarihi", "12 Mart 2026 Perşembe", "Tutanak Tarihi", "Sonraki Toplantı", "Seminer/<wbr>Buluşma",
    "Katılımcılar:", "MADDE 1 — DEVREDEN KARARLAR", "(ROTA/İSAS-2026/01, Karar 1)",
    "MADDE 2 — BU TOPLANTIDA ALINAN KARARLAR", "MADDE 3 — GÖREV DURUMU VE SONRAKİ TOPLANTI",
    "TOPLANTI KATILIMCILARI", "Ümran Ağaoğlu", "ROTA: İSAS Akademi — Toplantı Tutanağı No. 04",
  ];
  let konum = -1;
  for (const parca of sirali) {
    const yeni = html.indexOf(parca, konum + 1);
    assert.ok(yeni > konum, "eksik ya da yanlış sırada: " + parca);
    konum = yeni;
  }
  // Madde sayıları
  assert.equal((html.match(/class="rt-sira"/g) || []).length, 3 + 12 + 5);
  assert.equal((html.match(/class="rt-imza"/g) || []).length, 6);
});

test("tutanakBelgeHtml: referans biçimi — atıf maddenin başında, katılımcı satırı noktayla biter", () => {
  const html = t.tutanakBelgeHtml(ornekTutanak());
  assert.ok(html.includes('<span class="rt-atif">(ROTA/İSAS-2026/01, Karar 1)</span> Haftalık'));
  assert.ok(html.includes("Ümran Ağaoğlu.</p>"));
  // Alt bilgi imza bölümünün içinde (sayfa sonunda tek başına kalmasın)
  assert.ok(/<section class="rt-imza-bolumu">.*rt-alt-bilgi.*<\/section>/.test(html));
  assert.equal(t.katilimciSatiri(["A", "B"]), "A, B.");
  assert.equal(t.katilimciSatiri([]), "");
});

test("notlariAyristir: atıf başta yazılmış devreden karar ve noktayla biten katılımcı listesi", () => {
  const sonuc = t.notlariAyristir("Katılımcılar: Ece Demir, Can Öz.\nDevreden Kararlar:\n1. (1. toplantı, Karar 3) Eğitim tarihinin teyit edilmesine");
  assert.deepEqual(sonuc.katilimcilar, ["Ece Demir", "Can Öz"]);
  assert.deepEqual(sonuc.devreden, [{ metin: "Eğitim tarihinin teyit edilmesine", atif: "1. toplantı, Karar 3" }]);
});

test("tutanakBelgeHtml: kullanıcı metni kaçırılır (XSS)", () => {
  const kotu = { ...t.bosTutanak(), kurum: "<script>x</script>", kararlar: ['<img src=x onerror="a()">'], katilimcilar: ["<b>Ad</b>"], devreden: [{ metin: "m", atif: "</span><i>" }] };
  const html = t.tutanakBelgeHtml(kotu);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<b>Ad</b>"), false);
  assert.equal(html.includes("<i>"), false);
  assert.ok(html.includes("&lt;script&gt;"));
});

test("tutanakBelgeHtml: boş tutanak çökmez; boş bölümler açıklamayla, isteğe bağlı kutu gizli", () => {
  const html = t.tutanakBelgeHtml(t.bosTutanak());
  assert.ok(html.includes("Devreden karar bulunmamaktadır."));
  assert.ok(html.includes("Bu toplantıda karar alınmamıştır."));
  assert.equal(html.includes("TOPLANTI KATILIMCILARI"), false); // imzalayacak kimse yok
  assert.equal(html.includes("Tutanak No:"), false);
  assert.ok(html.includes('colspan="3"'));                      // 4. kutu yok: 3. kutu satırı kaplar
  // Etiket var ama değer yoksa kutu yine gizli
  assert.equal(t.tutanakBelgeHtml({ ...t.bosTutanak(), ek_etiket: "Seminer" }).includes("Seminer"), false);
});

test("tutanakBelgeHtml: ek kutunun etiketi özelleştirilebilir", () => {
  const html = t.tutanakBelgeHtml({ ...ornekTutanak(), ek_etiket: "Atölye Ziyareti", ek_deger: "2 Nisan" });
  assert.ok(html.includes("<th>Atölye Ziyareti</th><td>2 Nisan</td>"));
  assert.equal(html.includes("Seminer/Buluşma"), false);
});

test("cssMetni ve tutanakSayfaCss: tırnak, ters bölü ve satır sonu CSS'i bozamaz", () => {
  assert.equal(t.cssMetni('a"b'), '"a\\"b"');
  assert.equal(t.cssMetni("a\\b"), '"a\\\\b"');
  assert.equal(t.cssMetni("satır\nsonu"), '"satır sonu"');
  const css = t.tutanakSayfaCss({ sayfa_altligi: 'x"; } body { display:none } @page { content:"' });
  // Kötü niyetli metin tırnağın dışına çıkamamalı: kuralda tek bir @bottom-left ve tek @page var
  assert.equal((css.match(/@page/g) || []).length, 2); // biri bizim, biri tırnak içindeki zararsız metin
  assert.ok(css.includes('\\"; } body'));
  assert.ok(css.includes('"Sayfa " counter(page)'));
});

test("tutanakDosyaAdi: Türkçe harfler ve işaretler dosya adına uygun hâle gelir", () => {
  assert.equal(t.tutanakDosyaAdi({ numara: "ROTA/İSAS-2026/04" }), "Tutanak-ROTA-ISAS-2026-04");
  assert.equal(t.tutanakDosyaAdi({ numara: "", toplanti_tarihi: "2026-03-12" }), "Tutanak-2026-03-12");
  assert.equal(t.tutanakDosyaAdi({}), "Tutanak-taslak");
  assert.equal(t.tutanakDosyaAdi({ numara: "???" }), "Tutanak-taslak");
});

test("tutanaklariSirala: toplantı tarihine göre, asıl liste değişmez", () => {
  const liste = [{ id: "b", toplanti_tarihi: "2026-03-12" }, { id: "a", toplanti_tarihi: "2026-01-05" }, { id: "c", toplanti_tarihi: "" }];
  assert.deepEqual(t.tutanaklariSirala(liste).map((x) => x.id), ["c", "a", "b"]);
  assert.equal(liste[0].id, "b");
});
