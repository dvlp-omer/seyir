// Word (.docx) okuma/yazma testleri.  npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");

Object.assign(global, require("../js/mantik.js"), require("../js/tutanak.js"));
const d = require("../js/docx.js");
const { ornekTutanak } = require("./ornek-tutanak.js");

const metin = (baytlar) => new TextDecoder().decode(baytlar);

/* ---------- ZIP ---------- */

test("crc32: bilinen değer", () => {
  // "123456789" dizisinin CRC-32'si her kaynakta 0xCBF43926 olarak geçer
  assert.equal(d.crc32(new TextEncoder().encode("123456789")), 0xCBF43926);
  assert.equal(d.crc32(new Uint8Array(0)), 0);
});

test("zipYaz + zipOku: yazılan dosyalar geri okunur (Türkçe içerik dahil)", async () => {
  const zip = d.zipYaz([
    { ad: "a.txt", metin: "merhaba" },
    { ad: "klasor/b.xml", metin: "<x>çğıöşü ÇĞİÖŞÜ</x>" },
    { ad: "bos.txt", metin: "" },
  ]);
  assert.equal(metin(await d.zipOku(zip, "a.txt")), "merhaba");
  assert.equal(metin(await d.zipOku(zip, "klasor/b.xml")), "<x>çğıöşü ÇĞİÖŞÜ</x>");
  assert.equal(metin(await d.zipOku(zip, "bos.txt")), "");
  assert.equal(await d.zipOku(zip, "yok.txt"), null);
});

test("zipYaz: aynı girdi her zaman aynı baytları üretir; imzalar yerinde", () => {
  const bir = d.zipYaz([{ ad: "a.txt", metin: "x" }]);
  const iki = d.zipYaz([{ ad: "a.txt", metin: "x" }]);
  assert.deepEqual(bir, iki);
  assert.equal(String.fromCharCode(bir[0], bir[1]), "PK"); // bütün ZIP dosyaları "PK" ile başlar
});

// Word dosyaları SIKIŞTIRILMIŞ (deflate) olur. Bizim yazıcı sıkıştırmadığı için,
// okuyucunun sıkıştırılmış dosyayı da açabildiğini elle kurulan bir arşivle deniyoruz.
function sikisikZip(ad, icerik) {
  const adBayt = Buffer.from(ad);
  const ham = Buffer.from(icerik);
  const sikisik = zlib.deflateRawSync(ham);
  const yerel = Buffer.alloc(30);
  yerel.writeUInt32LE(0x04034b50, 0); yerel.writeUInt16LE(20, 4); yerel.writeUInt16LE(8, 8);
  yerel.writeUInt32LE(d.crc32(ham), 14); yerel.writeUInt32LE(sikisik.length, 18); yerel.writeUInt32LE(ham.length, 22);
  yerel.writeUInt16LE(adBayt.length, 26);
  const dizin = Buffer.alloc(46);
  dizin.writeUInt32LE(0x02014b50, 0); dizin.writeUInt16LE(8, 10);
  dizin.writeUInt32LE(d.crc32(ham), 16); dizin.writeUInt32LE(sikisik.length, 20); dizin.writeUInt32LE(ham.length, 24);
  dizin.writeUInt16LE(adBayt.length, 28); dizin.writeUInt32LE(0, 42);
  const bitis = Buffer.alloc(22);
  bitis.writeUInt32LE(0x06054b50, 0); bitis.writeUInt16LE(1, 8); bitis.writeUInt16LE(1, 10);
  bitis.writeUInt32LE(46 + adBayt.length, 12); bitis.writeUInt32LE(30 + adBayt.length + sikisik.length, 16);
  return new Uint8Array(Buffer.concat([yerel, adBayt, sikisik, dizin, adBayt, bitis]));
}

test("zipOku: sıkıştırılmış (deflate) dosyayı açar", async () => {
  const uzun = "Toplantı tutanağı ".repeat(200);
  const zip = sikisikZip("word/document.xml", uzun);
  assert.ok(zip.length < uzun.length); // gerçekten sıkışmış
  assert.equal(metin(await d.zipOku(zip, "word/document.xml")), uzun);
});

test("zipOku / docxOku: ZIP olmayan ya da Word olmayan dosyada anlaşılır hata", async () => {
  await assert.rejects(() => d.zipOku(new TextEncoder().encode("düz yazı, zip değil"), "a"), /ZIP\/Word dosyası değil/);
  await assert.rejects(() => d.zipOku(new Uint8Array(0), "a"), /değil/);
  const baskaZip = d.zipYaz([{ ad: "resim.png", metin: "x" }]);
  await assert.rejects(() => d.docxOku(baskaZip), /Word \(\.docx\) belgesi değil/);
});

/* ---------- Word XML'inden yazı çıkarma ---------- */

const W = (govde) => '<w:document xmlns:w="x"><w:body>' + govde + "</w:body></w:document>";

test("docxMetniCikar: her paragraf bir satır; parçalı yazı birleşir", () => {
  const xml = W(
    "<w:p><w:r><w:t>Toplantı </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t xml:space=\"preserve\">Tarihi: </w:t></w:r><w:r><w:t>12.03.2026</w:t></w:r></w:p>" +
    "<w:p><w:pPr><w:jc w:val=\"center\"/></w:pPr></w:p>" +
    "<w:p><w:r><w:t>İkinci satır</w:t></w:r></w:p>");
  assert.equal(d.docxMetniCikar(xml), "Toplantı Tarihi: 12.03.2026\n\nİkinci satır");
});

test("docxMetniCikar: XML kaçışları, sekme ve satır sonu", () => {
  const xml = W("<w:p><w:r><w:t>A &amp; B &lt;c&gt; &quot;d&quot; &#305;&#x131; &amp;lt;</w:t><w:tab/><w:t>e</w:t><w:br/><w:t>f</w:t></w:r></w:p>");
  assert.equal(d.docxMetniCikar(xml), 'A & B <c> "d" ıı &lt; e\nf');
});

test("docxMetniCikar: otomatik numaralı paragraflar madde işaretiyle başlar; tablo hücreleri ayrı satır", () => {
  const xml = W(
    "<w:p><w:pPr><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr></w:pPr><w:r><w:t>Birinci karar</w:t></w:r></w:p>" +
    "<w:p><w:pPr><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr></w:pPr></w:p>" + // boş madde: işaret konmaz
    "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Toplantı Tarihi</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>12 Mart 2026</w:t></w:r></w:p></w:tc></w:tr></w:tbl>");
  assert.equal(d.docxMetniCikar(xml), "- Birinci karar\n\nToplantı Tarihi\n12 Mart 2026");
});

test("docxMetniCikar: <w:pPr> gibi 'w:p' ile başlayan başka etiketler paragraf sanılmaz", () => {
  const xml = W("<w:p><w:pPr><w:pStyle w:val=\"a\"/></w:pPr><w:r><w:t>tek</w:t></w:r></w:p>");
  assert.equal(d.docxMetniCikar(xml), "tek");
});

/* ---------- Tutanaktan Word üretme ---------- */

test("tutanakDocx: geçerli bir paket üretir (gerekli bütün parçalar var)", async () => {
  const docx = d.tutanakDocx(ornekTutanak());
  for (const ad of ["[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels", "word/styles.xml", "word/settings.xml", "word/document.xml", "word/footer1.xml"]) {
    assert.ok(await d.zipOku(docx, ad), ad + " eksik");
  }
  const belge = metin(await d.zipOku(docx, "word/document.xml"));
  assert.ok(belge.includes("İSTANBUL SABAHATTİN ZAİM ÜNİVERSİTESİ TEKNOFEST KULÜBÜ"));
  assert.ok(belge.includes("<w:pgBorders"));           // sayfa çerçevesi
  assert.ok(belge.includes('w:w="11906" w:h="16838"')); // A4
  assert.equal((belge.match(/<w:keepLines\/>/g) || []).length, 3 + 12 + 5); // her madde "bölünmez"
  const altlik = metin(await d.zipOku(docx, "word/footer1.xml"));
  assert.ok(altlik.includes("İSAS Akademi — Toplantı Tutanağı 04"));
  assert.ok(altlik.includes(" PAGE "));                 // sayfa numarası alanı
  assert.ok(metin(await d.zipOku(docx, "word/styles.xml")).includes("Times New Roman"));
});

test("tutanakDocx: kullanıcı metni XML'i bozamaz", async () => {
  const kotu = { ...bosTutanak(), toplanti_tarihi: "2026-03-12", kurum: 'A & B <w:p> "x"', kararlar: ["</w:t></w:r><w:br/>", "denetim\u0001karakteri"], sayfa_altligi: "<&>" };
  const docx = d.tutanakDocx(kotu);
  const belge = metin(await d.zipOku(docx, "word/document.xml"));
  assert.ok(belge.includes("A &amp; B &lt;w:p&gt; &quot;x&quot;"));
  assert.equal(belge.includes("\u0001"), false);
  // Geri okununca metin aynen çıkar
  const yazi = await d.docxOku(docx);
  assert.ok(yazi.includes('A & B <w:p> "x"'));
  assert.ok(yazi.includes("1. </w:t></w:r><w:br/>"));
  assert.ok(metin(await d.zipOku(docx, "word/footer1.xml")).includes("&lt;&amp;&gt;"));
});

test("tutanakDocx: boş tutanak ve isteğe bağlı kutu", async () => {
  const bos = metin(await d.zipOku(d.tutanakDocx(bosTutanak()), "word/document.xml"));
  assert.ok(bos.includes("Devreden karar bulunmamaktadır."));
  assert.ok(bos.includes('<w:gridSpan w:val="3"/>'));   // 4. kutu yok: değer hücresi üç sütunu kaplar
  assert.equal(bos.includes(IMZA_BASLIGI), false);
  const dolu = metin(await d.zipOku(d.tutanakDocx(ornekTutanak()), "word/document.xml"));
  assert.equal(dolu.includes("<w:gridSpan"), false);
  assert.ok(dolu.includes("Seminer/Buluşma"));
});

/* ---------- Gidiş-dönüş: Word'e aktar -> Word'den oku -> aynı tutanak ---------- */

test("gidiş-dönüş: indirilen Word dosyası geri yüklenince bütün alanlar aynı gelir", async () => {
  const asil = ornekTutanak();
  const okunan = notlariAyristir(await d.docxOku(d.tutanakDocx(asil)));

  for (const alan of ["kurum", "alt_baslik", "numara", "toplanti_tarihi", "tutanak_tarihi", "sonraki_toplanti",
    "ek_etiket", "ek_deger", "katilimcilar", "devreden_giris", "devreden", "kararlar", "gorevler", "alt_bilgi"]) {
    assert.deepEqual(okunan[alan], asil[alan], alan);
  }
  assert.deepEqual(okunan.artan, []); // hiçbir satır açıkta kalmadı
});
