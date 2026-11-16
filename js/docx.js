/* ==========================================================================
   WORD (.docx) OKUMA VE YAZMA — kütüphanesiz
   --------------------------------------------------------------------------
   Bir .docx dosyası aslında içinde XML dosyaları olan bir ZIP arşividir.
   Dosyanın uzantısını .zip yapıp açarsan görürsün:
       [Content_Types].xml      arşivde hangi tür dosyalar var
       _rels/.rels              "asıl belge şu dosyada" bilgisi
       word/document.xml        BELGENİN KENDİSİ (paragraflar, tablolar)
       word/styles.xml          varsayılan yazı tipi ve boyutu
       word/footer1.xml         sayfa altlığı
       word/settings.xml        belge ayarları

   Bu yüzden iki küçük parça yetiyor:
     1) ZIP: arşiv yazma (sıkıştırmadan) ve arşivden dosya okuma
     2) Word XML'i: tutanaktan document.xml üretme; document.xml'den düz yazı çıkarma

   Sıkıştırılmış dosyaları açmak için tarayıcının kendi DecompressionStream
   özelliği kullanılır (Node 18+ içinde de vardır; testler bu yüzden çalışır).
   Dışarıdan hiçbir dosya yüklenmez; uygulama internetsiz de Word dosyası
   okuyup yazabilir.
   ========================================================================== */

/* ---------- 1) ZIP ---------- */

// CRC-32: ZIP'in her dosya için istediği sağlama toplamı. Tablo bir kez hesaplanır.
const CRC_TABLOSU = (() => {
  const tablo = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    tablo[n] = c >>> 0;
  }
  return tablo;
})();

function crc32(baytlar) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < baytlar.length; i++) crc = CRC_TABLOSU[(crc ^ baytlar[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/* ZIP arşivi yazar. dosyalar: [{ ad: "word/document.xml", metin: "<xml...>" }]
   Dosyalar SIKIŞTIRILMADAN konur ("stored"); bu geçerli bir ZIP'tir ve bizi
   sıkıştırma algoritması yazmaktan kurtarır. Bir tutanak birkaç kilobayttır.
   Arşivin yapısı: [her dosya için başlık + veri] ... [içindekiler tablosu] [bitiş kaydı] */
function zipYaz(dosyalar) {
  const kodlayici = new TextEncoder();
  const parcalar = [];   // arşivin baştan sona baytları
  const dizin = [];      // içindekiler tablosunun kayıtları
  let konum = 0;
  const TARIH = ((2026 - 1980) << 9) | (1 << 5) | 1; // 1 Ocak 2026 (sabit: aynı girdi aynı dosyayı versin)

  for (const dosya of dosyalar) {
    const ad = kodlayici.encode(dosya.ad);
    const veri = kodlayici.encode(dosya.metin);
    const crc = crc32(veri);

    const baslik = new DataView(new ArrayBuffer(30));
    baslik.setUint32(0, 0x04034b50, true);  // "yerel dosya başlığı" imzası
    baslik.setUint16(4, 20, true);          // gereken ZIP sürümü
    baslik.setUint16(6, 0x0800, true);      // dosya adları UTF-8
    baslik.setUint16(8, 0, true);           // yöntem 0 = sıkıştırma yok
    baslik.setUint16(12, TARIH, true);
    baslik.setUint32(14, crc, true);
    baslik.setUint32(18, veri.length, true); // sıkıştırılmış boyut
    baslik.setUint32(22, veri.length, true); // gerçek boyut
    baslik.setUint16(26, ad.length, true);

    const kayit = new DataView(new ArrayBuffer(46));
    kayit.setUint32(0, 0x02014b50, true);   // "içindekiler kaydı" imzası
    kayit.setUint16(4, 20, true);
    kayit.setUint16(6, 20, true);
    kayit.setUint16(8, 0x0800, true);
    kayit.setUint16(14, TARIH, true);
    kayit.setUint32(16, crc, true);
    kayit.setUint32(20, veri.length, true);
    kayit.setUint32(24, veri.length, true);
    kayit.setUint16(28, ad.length, true);
    kayit.setUint32(42, konum, true);       // bu dosyanın arşivdeki yeri

    parcalar.push(new Uint8Array(baslik.buffer), ad, veri);
    dizin.push(new Uint8Array(kayit.buffer), ad);
    konum += 30 + ad.length + veri.length;
  }

  const dizinBoyutu = dizin.reduce((toplam, parca) => toplam + parca.length, 0);
  const bitis = new DataView(new ArrayBuffer(22));
  bitis.setUint32(0, 0x06054b50, true);     // "arşiv sonu" imzası
  bitis.setUint16(8, dosyalar.length, true);
  bitis.setUint16(10, dosyalar.length, true);
  bitis.setUint32(12, dizinBoyutu, true);
  bitis.setUint32(16, konum, true);

  const hepsi = [...parcalar, ...dizin, new Uint8Array(bitis.buffer)];
  const sonuc = new Uint8Array(hepsi.reduce((toplam, parca) => toplam + parca.length, 0));
  let yaz = 0;
  for (const parca of hepsi) { sonuc.set(parca, yaz); yaz += parca.length; }
  return sonuc;
}

// "deflate" ile sıkıştırılmış veriyi açar (tarayıcının / Node'un kendi özelliği).
async function sikistirmayiAc(veri) {
  const akis = new Blob([veri]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(akis).arrayBuffer());
}

/* ZIP arşivinden tek bir dosyayı okur; yoksa null döner.
   Arşivin SONUNDAKİ bitiş kaydından içindekiler tablosunun yerini öğrenir,
   tabloda dosyayı adıyla arar, sonra verisini okur. */
async function zipOku(baytlar, arananAd) {
  const goz = new DataView(baytlar.buffer, baytlar.byteOffset, baytlar.byteLength);
  // Bitiş kaydını sondan geriye doğru ara (sonunda en çok 64 KB'lık yorum olabilir)
  let bitis = -1;
  for (let i = baytlar.length - 22; i >= Math.max(0, baytlar.length - 66000); i--) {
    if (goz.getUint32(i, true) === 0x06054b50) { bitis = i; break; }
  }
  if (bitis === -1) throw new Error("Bu dosya bir ZIP/Word dosyası değil.");

  const adet = goz.getUint16(bitis + 10, true);
  let konum = goz.getUint32(bitis + 16, true);
  const cozucu = new TextDecoder();

  for (let i = 0; i < adet; i++) {
    if (konum + 46 > baytlar.length || goz.getUint32(konum, true) !== 0x02014b50) throw new Error("Word dosyası bozuk.");
    const yontem = goz.getUint16(konum + 10, true);
    const sikisikBoyut = goz.getUint32(konum + 20, true);
    const adBoyu = goz.getUint16(konum + 28, true);
    const ekBoyu = goz.getUint16(konum + 30, true);
    const yorumBoyu = goz.getUint16(konum + 32, true);
    const yerelKonum = goz.getUint32(konum + 42, true);
    const ad = cozucu.decode(baytlar.subarray(konum + 46, konum + 46 + adBoyu));

    if (ad === arananAd) {
      // Yerel başlıktaki ad ve ek alan uzunlukları tablodakinden farklı olabilir; oradan oku.
      const veriBasi = yerelKonum + 30 + goz.getUint16(yerelKonum + 26, true) + goz.getUint16(yerelKonum + 28, true);
      const ham = baytlar.subarray(veriBasi, veriBasi + sikisikBoyut);
      if (yontem === 0) return ham;                         // sıkıştırılmamış
      if (yontem === 8) return sikistirmayiAc(ham);         // deflate (Word'ün kullandığı)
      throw new Error("Desteklenmeyen sıkıştırma yöntemi.");
    }
    konum += 46 + adBoyu + ekBoyu + yorumBoyu;
  }
  return null;
}

/* ---------- 2a) Word belgesinden düz yazı çıkarma ---------- */

function xmlCoz(metin) {
  return metin
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (tum, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (tum, sayi) => String.fromCodePoint(Number(sayi)))
    .replace(/&amp;/g, "&"); // en son: "&amp;lt;" yanlışlıkla "<" olmasın
}

/* document.xml içindeki paragrafları satır satır düz yazıya çevirir.
   Word'de her paragraf <w:p>, içindeki yazı parçaları <w:t> etiketindedir.
   Tablo hücreleri de paragraf içerir; her hücre ayrı satır olur.
   Word'ün otomatik numaralı/madde işaretli paragraflarında numara yazının
   içinde DEĞİLDİR; bunları "- " ile başlatırız ki not ayrıştırıcı madde saysın. */
function docxMetniCikar(xml) {
  const satirlar = [];
  for (const paragraf of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    let yazi = "";
    for (const parca of paragraf[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\s*\/>|<w:cr\/>/g)) {
      if (parca[1] !== undefined) yazi += xmlCoz(parca[1]);
      else if (parca[0].startsWith("<w:tab")) yazi += " ";
      else yazi += "\n";
    }
    const listeMaddesi = paragraf[0].includes("<w:numPr>");
    satirlar.push((listeMaddesi && yazi.trim() ? "- " : "") + yazi);
  }
  return satirlar.join("\n");
}

// .docx dosyasının baytlarından düz yazı üretir.
async function docxOku(baytlar) {
  const belge = await zipOku(baytlar, "word/document.xml");
  if (!belge) throw new Error("Bu dosya bir Word (.docx) belgesi değil.");
  return docxMetniCikar(new TextDecoder().decode(belge));
}

/* ---------- 2b) Tutanaktan Word belgesi üretme ----------
   Word XML'inde ölçüler alışılmadık birimlerdedir:
     yazı boyutu  : yarım punto  (24 = 12 punto)
     uzunluklar   : "twip" = 1/20 punto  (567 twip ≈ 1 cm)
   Aşağıdaki küçük fonksiyonlar XML parçaları üretir; belge bunların birleşimidir. */

function xmlKacis(metin) {
  return String(metin == null ? "" : metin)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    // XML'de yasak olan denetim karakterlerini at (yapıştırılan metinden gelebilir)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

// Yazı parçası ("run"). bicim: { kalin, italik, boyut (punto) }
function wYazi(metin, bicim = {}) {
  const ozellik =
    (bicim.kalin ? "<w:b/>" : "") + (bicim.italik ? "<w:i/>" : "") +
    (bicim.renk ? '<w:color w:val="' + bicim.renk + '"/>' : "") +   // renk: "4D4D4D" gibi
    (bicim.boyut ? '<w:sz w:val="' + bicim.boyut * 2 + '"/>' : "");
  return "<w:r>" + (ozellik ? "<w:rPr>" + ozellik + "</w:rPr>" : "") +
    '<w:t xml:space="preserve">' + xmlKacis(metin) + "</w:t></w:r>";
}

/* Paragraf. icerik: wYazi(...) parçaları.
   ayar: { hiza: "center"|"both"|"left", once, sonra (punto boşluk), altCizgi, ustCizgi,
           asili (asılı girinti: numara solda, yazı hizalı), bolme (maddeyi sayfalara bölme),
           sonrakiyle (başlık sonraki paragraftan ayrılmasın), sekme (twip) }
   Not: Word, <w:pPr> içindeki etiketlerin SIRASINA duyarlıdır; sıra bilerek böyle. */
function wParagraf(icerik, ayar = {}) {
  // kalinCizgi: numara satırının altındaki 1,5 puntoluk çizgi (w:sz sekizde bir punto)
  const kenar = (ad) => "<w:" + ad + ' w:val="single" w:sz="' + (ayar.kalinCizgi ? 12 : 6) + '" w:space="' + (ayar.kalinCizgi ? 6 : 2) + '" w:color="000000"/>';
  const ozellik =
    (ayar.sonrakiyle ? "<w:keepNext/>" : "") +
    (ayar.bolme ? "<w:keepLines/>" : "") +
    (ayar.altCizgi || ayar.ustCizgi ? "<w:pBdr>" + (ayar.ustCizgi ? kenar("top") : "") + (ayar.altCizgi ? kenar("bottom") : "") + "</w:pBdr>" : "") +
    (ayar.sekme ? '<w:tabs><w:tab w:val="right" w:pos="' + ayar.sekme + '"/></w:tabs>' : "") +
    '<w:spacing w:before="' + (ayar.once || 0) * 20 + '" w:after="' + (ayar.sonra || 0) * 20 + '"/>' +
    (ayar.asili ? '<w:ind w:left="400" w:hanging="400"/>' : "") +
    '<w:jc w:val="' + (ayar.hiza || "both") + '"/>';
  return "<w:p><w:pPr>" + ozellik + "</w:pPr>" + icerik + "</w:p>";
}

// Tablo hücresi. ayar: { genislik (twip), birlesim (kaç sütun), altCizgi }
function wHucre(icerik, ayar) {
  return "<w:tc><w:tcPr>" +
    '<w:tcW w:w="' + ayar.genislik + '" w:type="dxa"/>' +
    (ayar.birlesim ? '<w:gridSpan w:val="' + ayar.birlesim + '"/>' : "") +
    (ayar.altCizgi ? '<w:tcBorders><w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>' : "") +
    (ayar.zemin ? '<w:shd w:val="clear" w:color="auto" w:fill="' + ayar.zemin + '"/>' : "") +   // hücre zemin rengi
    '<w:vAlign w:val="center"/>' +
    "</w:tcPr>" + icerik + "</w:tc>";
}

// Tablo. ayar: { sutunlar: [twip...], cerceve: true/false }
function wTablo(satirlar, ayar) {
  // Çerçeveli tabloda dış çizgi koyu ve kalın, iç çizgiler ince ve gri (referanstaki gibi)
  const cizgi = (ad) => {
    if (!ayar.cerceve) return "<w:" + ad + ' w:val="nil"/>';
    const ic = ad.startsWith("inside");
    return "<w:" + ad + ' w:val="single" w:sz="' + (ic ? 4 : 10) + '" w:space="0" w:color="' + (ic ? "C4C4C4" : "000000") + '"/>';
  };
  return "<w:tbl><w:tblPr>" +
    '<w:tblW w:w="' + ayar.sutunlar.reduce((a, b) => a + b, 0) + '" w:type="dxa"/>' +
    "<w:tblBorders>" + ["top", "left", "bottom", "right", "insideH", "insideV"].map(cizgi).join("") + "</w:tblBorders>" +
    '<w:tblLayout w:type="fixed"/>' +
    '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar>' +
    "</w:tblPr><w:tblGrid>" + ayar.sutunlar.map((g) => '<w:gridCol w:w="' + g + '"/>').join("") + "</w:tblGrid>" +
    satirlar.map((hucreler) => '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + hucreler.join("") + "</w:tr>").join("") +
    "</w:tbl>";
}

const DOCX_YAZI_GENISLIGI = 9638; // A4 (11906 twip) - iki yandan 2 cm (1134 twip) kenar boşluğu

// Tutanağın document.xml içeriği. Bölümler ve sıraları tutanakBelgeHtml ile aynıdır.
function tutanakBelgeXml(t) {
  const govde = [];
  const ekle = (xml) => govde.push(xml);

  ekle(wParagraf(wYazi(t.kurum, { kalin: true, boyut: 12 }), { hiza: "center" }));
  ekle(wParagraf(wYazi(TUTANAK_BASLIGI, { kalin: true, boyut: 20 }), { hiza: "center", once: 12, sonra: 3 }));
  if (t.alt_baslik) ekle(wParagraf(wYazi(t.alt_baslik, { italik: true, boyut: 13, renk: "4D4D4D" }), { hiza: "center" }));
  // Numara satırının altındaki kalın çizgi başlık bloğunu tablodan ayırır (referanstaki gibi)
  ekle(wParagraf(t.numara ? wYazi("Tutanak No: " + t.numara, { boyut: 10.5, renk: "4D4D4D" }) : "", { hiza: "center", sonra: 12, altCizgi: true, kalinCizgi: true }));

  // Bilgi tablosu (2 satır x 4 hücre: etiket, değer, etiket, değer)
  const [etiketG, degerG] = [2000, 2819];
  const etiket = (yazi) => wHucre(wParagraf(wYazi(yazi, { kalin: true, boyut: 11 }), { hiza: "left" }), { genislik: etiketG, zemin: "EFEDE8" });
  const deger = (yazi, birlesim) => wHucre(wParagraf(wYazi(yazi, { boyut: 11 }), { hiza: "left" }),
    { genislik: birlesim ? degerG * 2 + etiketG : degerG, birlesim: birlesim });
  const ekVar = !!(t.ek_etiket && t.ek_deger);
  ekle(wTablo([
    [etiket("Toplantı Tarihi"), deger(tarihYaz(t.toplanti_tarihi)), etiket("Tutanak Tarihi"), deger(tarihYaz(t.tutanak_tarihi))],
    ekVar
      ? [etiket("Sonraki Toplantı"), deger(t.sonraki_toplanti || "—"), etiket(t.ek_etiket), deger(t.ek_deger)]
      : [etiket("Sonraki Toplantı"), deger(t.sonraki_toplanti || "—", 3)],
  ], { sutunlar: [etiketG, degerG, etiketG, degerG], cerceve: true }));

  ekle(wParagraf(wYazi("Katılımcılar: " + (katilimciSatiri(t.katilimcilar) || "—")), { once: 8, sonra: 4 }));

  const baslik = (yazi) => ekle(wParagraf(wYazi(yazi, { kalin: true, boyut: 13.5 }), { hiza: "left", once: 16, sonra: 6, altCizgi: true, sonrakiyle: true }));
  // Numaralı maddeler: "1." kalın, sonra sekme, sonra yazı. Madde sayfalara bölünmez.
  const maddeler = (liste, parcalar, bosYazi) => {
    if (!liste.length) return ekle(wParagraf(wYazi(bosYazi, { italik: true })));
    liste.forEach((madde, sira) => ekle(wParagraf(
      wYazi((sira + 1) + ".", { kalin: true }) + "<w:r><w:tab/></w:r>" + parcalar(madde),
      { asili: true, bolme: true, once: 2.5, sonra: 2.5 })));
  };

  baslik(MADDE_BASLIKLARI[0]);
  if ((t.devreden || []).length && t.devreden_giris) ekle(wParagraf(wYazi(t.devreden_giris), { sonra: 4, sonrakiyle: true }));
  maddeler(t.devreden || [], (d) => wYazi((d.atif ? "(" + d.atif + ") " : "") + d.metin), "Devreden karar bulunmamaktadır.");
  baslik(MADDE_BASLIKLARI[1]);
  maddeler(t.kararlar || [], (metin) => wYazi(metin), "Bu toplantıda karar alınmamıştır.");
  baslik(MADDE_BASLIKLARI[2]);
  maddeler(t.gorevler || [], (metin) => wYazi(metin), "Kayıt girilmemiştir.");

  // İmza bölümü: üçer üçer, çerçevesiz tablo; her hücrede ad ve altında imza çizgisi
  const adlar = t.katilimcilar || [];
  if (adlar.length) {
    // Referanstaki gibi: üstte ayırıcı çizgi, başlığın altında çizgi yok
    ekle(wParagraf(wYazi(IMZA_BASLIGI, { kalin: true, boyut: 13.5 }), { hiza: "left", once: 22, sonra: 6, ustCizgi: true, sonrakiyle: true }));
    const [imzaG, araG] = [2900, 469];
    const satirlar = [];
    for (let i = 0; i < adlar.length; i += 3) {
      const hucreler = [];
      for (let j = 0; j < 3; j++) {
        const ad = adlar[i + j];
        if (j > 0) hucreler.push(wHucre(wParagraf("", {}), { genislik: araG }));
        hucreler.push(wHucre(
          wParagraf(wYazi(ad || "", { boyut: 11.5, kalin: true }), { hiza: "center", once: 8 }),
          { genislik: imzaG, altCizgi: !!ad }));
      }
      satirlar.push(hucreler);
      // Adların altında imza atılacak boş satır
      const bosluk = [];
      for (let j = 0; j < 5; j++) bosluk.push(wHucre(wParagraf("", { sonra: 30 }), { genislik: j % 2 ? araG : imzaG }));
      satirlar.push(bosluk);
    }
    ekle(wTablo(satirlar, { sutunlar: [imzaG, araG, imzaG, araG, imzaG], cerceve: false }));
  }
  if (t.alt_bilgi) ekle(wParagraf(wYazi(t.alt_bilgi, { italik: true, boyut: 9.5, renk: "4D4D4D" }), { hiza: "center", once: 6, ustCizgi: true }));

  // Sayfa ayarı: A4, 2 cm kenar boşluğu, sayfa çerçevesi, altlık
  // Çerçeve yazı alanından 20 punto dışarıda durur; altlık çerçevenin ALTINDA kalır (PDF'teki gibi).
  const cerceve = (ad) => "<w:" + ad + ' w:val="single" w:sz="8" w:space="20" w:color="000000"/>';
  const sayfa =
    '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/>' +
    '<w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1247" w:left="1134" w:header="567" w:footer="340" w:gutter="0"/>' +
    '<w:pgBorders w:offsetFrom="text">' + ["top", "left", "bottom", "right"].map(cerceve).join("") + "</w:pgBorders>" +
    "</w:sectPr>";

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<w:body>" + govde.join("") + sayfa + "</w:body></w:document>";
}

// Sayfa altlığı: solda tutanağa özel yazı, sağda "Sayfa N" (N'yi Word hesaplar: PAGE alanı)
function tutanakAltlikXml(t) {
  const alan = (tur) => '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="' + tur + '"/></w:r>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    wParagraf(
      wYazi(t.sayfa_altligi, { boyut: 9, renk: "4D4D4D" }) + "<w:r><w:tab/></w:r>" + wYazi("Sayfa ", { boyut: 9, renk: "4D4D4D" }) +
      alan("begin") + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' +
      alan("separate") + wYazi("1", { boyut: 9 }) + alan("end"),
      { hiza: "left", sekme: DOCX_YAZI_GENISLIGI }) +
    "</w:ftr>";
}

// Tutanağı .docx dosyasının baytlarına çevirir.
function tutanakDocx(t) {
  const BAS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const PAKET = "http://schemas.openxmlformats.org/package/2006";
  const BELGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const TUR = "application/vnd.openxmlformats-officedocument.wordprocessingml.";
  return zipYaz([
    { ad: "[Content_Types].xml", metin: BAS +
      '<Types xmlns="' + PAKET + '/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="' + TUR + 'document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="' + TUR + 'styles+xml"/>' +
      '<Override PartName="/word/footer1.xml" ContentType="' + TUR + 'footer+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="' + TUR + 'settings+xml"/>' +
      "</Types>" },
    { ad: "_rels/.rels", metin: BAS +
      '<Relationships xmlns="' + PAKET + '/relationships">' +
      '<Relationship Id="rId1" Type="' + BELGE + '/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>" },
    { ad: "word/_rels/document.xml.rels", metin: BAS +
      '<Relationships xmlns="' + PAKET + '/relationships">' +
      '<Relationship Id="rId1" Type="' + BELGE + '/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="' + BELGE + '/footer" Target="footer1.xml"/>' +
      '<Relationship Id="rId3" Type="' + BELGE + '/settings" Target="settings.xml"/>' +
      "</Relationships>" },
    // Varsayılan biçim: Times New Roman, 12 punto, Türkçe, satır aralığı 1,15
    { ad: "word/styles.xml", metin: BAS +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults>' +
      '<w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>' +
      '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>' +
      "</w:docDefaults></w:styles>" },
    // Sayfa çerçevesi üst/alt bilgiyi içine ALMASIN (Word'ün varsayılanı içine almaktır;
    // o zaman çerçevenin alt kenarı altlığın da altına, sayfanın dışına düşüyordu).
    { ad: "word/settings.xml", metin: BAS +
      '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      "<w:bordersDoNotSurroundHeader/><w:bordersDoNotSurroundFooter/></w:settings>" },
    { ad: "word/document.xml", metin: tutanakBelgeXml(t) },
    { ad: "word/footer1.xml", metin: tutanakAltlikXml(t) },
  ]);
}

if (typeof module !== "undefined") {
  module.exports = { crc32, zipYaz, zipOku, docxMetniCikar, docxOku, xmlKacis, tutanakBelgeXml, tutanakDocx };
}
