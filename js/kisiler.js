/* ==========================================================================
   KİŞİLER VE WHATSAPP MESAJLARI — saf mantık (ekran yok, tarayıcı gerekmez)
   - Telefon numarasını tek biçime çevirme: 90XXXXXXXXXX
   - CSV ve yapıştırılan listeyi kişilere çevirme
   - "Kabul mesajları" HTML dosyasındaki kişi dizisini okuma
   - Mesaj şablonu doldurma: {ad} {tarih} {saat} {yer} {link}
   - wa.me bağlantısı, gönderim listesi (kampanya) ve ilerleme
   - Tutanakla bağ: sonraki toplantı bilgisinden tarih/saat, adlardan kişiler
   Ekran tarafı: js/ekranlar/kisiler.js ve js/ekranlar/mesajlar.js
   ========================================================================== */

/* ---------- Telefon ----------
   WhatsApp bağlantısı numarayı ülke koduyla, artı ve boşluk OLMADAN ister:
   "905000000001". İnsanlar ise her biçimde yazar. Bu fonksiyon hepsini
   aynı biçime çevirir:
     0500 000 00 01   -> 905000000001
     +90 500 000 0001 -> 905000000001
     0090500...       -> 905000000001
     500 000 00 01    -> 905000000001
   Sonuç: { telefon: "90..." } ya da { hata: "neden" }.
   Yalnızca Türkiye cep numaraları (5 ile başlayan) kabul edilir; WhatsApp
   için cep numarası gerekir. Sabit hat (212..., 312...) "cep değil" uyarısı alır. */
function telefonNormallestir(metin) {
  const ham = String(metin == null ? "" : metin).trim();
  if (!ham) return { hata: "numara boş" };
  if (/[a-zçğıöşü]/i.test(ham)) return { hata: "numarada harf var" };

  let rakam = ham.replace(/\D/g, "");  // boşluk, tire, parantez, artı gider
  if (rakam.startsWith("00")) rakam = rakam.slice(2);              // 0090... -> 90...
  if (rakam.length === 11 && rakam.startsWith("0")) rakam = "9" + rakam;  // 05... -> 905...
  if (rakam.length === 10) rakam = "90" + rakam;                   // 532... -> 90532...

  if (rakam.length !== 12 || !rakam.startsWith("90")) {
    return { hata: "Türkiye numarası gibi görünmüyor (" + ham + ")" };
  }
  if (rakam[2] !== "5") return { hata: "cep telefonu değil (" + ham + ")" };
  return { telefon: rakam };
}

// "905000000001" -> "+90 500 000 00 01" (ekranda okunaklı göstermek için)
function telefonGoster(telefon) {
  const t = String(telefon || "");
  if (!/^90\d{10}$/.test(t)) return t;
  return "+90 " + t.slice(2, 5) + " " + t.slice(5, 8) + " " + t.slice(8, 10) + " " + t.slice(10);
}

/* ---------- Ad ---------- */

// Hitap adı verilmemişse adın ilk sözcüğü kullanılır ("Ece Nur Demir" -> "Ece").
// İki adlı kişilerde kullanıcı formda düzeltebilir.
function ilkAdTahmin(ad) {
  return String(ad || "").trim().split(/\s+/)[0] || "";
}

// Ad karşılaştırması için sadeleştir: Türkçe küçük harf, tek boşluk.
function adSade(ad) {
  return String(ad || "").toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
}

/* ---------- CSV / yapıştırılan liste ----------
   Excel Türkçe ayarlarda ";" ile, diğerleri "," ile ayırır; sekmeyle de
   yapıştırılabilir (Excel'den kopyala-yapıştır). İlk satırda hangisi çoksa
   ayırıcı odur. Tırnak içindeki ayırıcı ve "" (kaçırılmış tırnak) desteklenir. */
function ayiriciBul(satir) {
  const sayilar = [";", ",", "\t"].map((a) => [a, satir.split(a).length - 1]);
  sayilar.sort((x, y) => y[1] - x[1]);
  return sayilar[0][1] > 0 ? sayilar[0][0] : ",";
}

// Tek bir CSV satırını hücrelere böler.
function csvSatiriniBol(satir, ayirici) {
  const hucreler = [];
  let hucre = "";
  let tirnakIcinde = false;
  for (let i = 0; i < satir.length; i++) {
    const harf = satir[i];
    if (tirnakIcinde) {
      if (harf === '"' && satir[i + 1] === '"') { hucre += '"'; i++; }   // "" -> "
      else if (harf === '"') tirnakIcinde = false;
      else hucre += harf;
    } else if (harf === '"') {
      tirnakIcinde = true;
    } else if (harf === ayirici) {
      hucreler.push(hucre.trim());
      hucre = "";
    } else {
      hucre += harf;
    }
  }
  hucreler.push(hucre.trim());
  return hucreler;
}

// Başlık satırındaki sütun adları -> alan adı
const CSV_BASLIKLARI = {
  "ad": "ad", "ad soyad": "ad", "adı soyadı": "ad", "ad-soyad": "ad", "isim": "ad", "isim soyisim": "ad", "name": "ad", "kişi": "ad",
  "ilk ad": "ilk_ad", "ilk": "ilk_ad", "hitap": "ilk_ad", "ilk_ad": "ilk_ad",
  "telefon": "telefon", "tel": "telefon", "telefon numarası": "telefon", "numara": "telefon", "gsm": "telefon", "cep": "telefon", "phone": "telefon",
  "etiket": "etiket", "grup": "etiket", "durum": "etiket",
  "not": "aciklama", "notlar": "aciklama", "açıklama": "aciklama",
};

/* Metni satırlara ve alanlara çevirir. Dönüş: [{ ad, ilk_ad, telefon, etiket, aciklama, satir }]
   - İlk satır başlıksa (tanınan bir sütun adı içeriyorsa) sütunlar ona göre eşlenir.
   - Başlık yoksa: telefon gibi görünen hücre telefon, ilk yazı hücresi ad olur.
     Böylece "Ali Kaya, 0532 ..." gibi iki sütunlu yapıştırmalar da çalışır. */
function csvAyristir(metin) {
  const satirlar = String(metin || "").replace(/^﻿/, "").split(/\r?\n/).filter((s) => s.trim());
  if (!satirlar.length) return [];
  const ayirici = ayiriciBul(satirlar[0]);

  const ilkHucreler = csvSatiriniBol(satirlar[0], ayirici);
  const eslesme = ilkHucreler.map((h) => CSV_BASLIKLARI[adSade(h)] || null);
  const baslikVar = eslesme.includes("ad") || eslesme.includes("telefon");

  const sonuc = [];
  satirlar.slice(baslikVar ? 1 : 0).forEach((satir, sira) => {
    // Başlıksız yapıştırmada her satırın ayırıcısı ayrı bulunur (karışık yapıştırma olabilir)
    const hucreler = csvSatiriniBol(satir, baslikVar ? ayirici : ayiriciBul(satir));
    const kayit = { ad: "", ilk_ad: "", telefon: "", etiket: "", aciklama: "", satir: sira + (baslikVar ? 2 : 1) };
    if (baslikVar) {
      eslesme.forEach((alan, i) => { if (alan && hucreler[i] && !kayit[alan]) kayit[alan] = hucreler[i]; });
    } else {
      for (const hucre of hucreler) {
        if (!hucre) continue;
        if (!kayit.telefon && /^[+\d][\d\s().-]{8,}$/.test(hucre)) kayit.telefon = hucre;
        else if (!kayit.ad) kayit.ad = hucre;
        else if (!kayit.etiket) kayit.etiket = hucre;
        else if (!kayit.aciklama) kayit.aciklama = hucre;
      }
    }
    sonuc.push(kayit);
  });
  return sonuc;
}

/* ---------- "Kabul mesajları" HTML dosyası ----------
   Bu dosyanın içinde kişiler şöyle bir JavaScript dizisi olarak durur:
     const P=[{"ad": "...", "ilk": "...", "tel": "90..."}, ...];
   Diziyi metin olarak bulup JSON.parse ile okuyoruz. Dosyadaki kodu
   ÇALIŞTIRMIYORUZ (eval yok): dışarıdan gelen dosyaya güvenmeyiz. */
function htmlKisiDizisiOku(html) {
  const metin = String(html || "");
  // "[{" ile başlayıp içinde "tel" geçen ve "}]" ile biten ilk parça
  const bas = metin.search(/\[\s*\{\s*"(ad|ilk|tel)"\s*:/);
  if (bas === -1) throw new Error("Dosyada kişi listesi bulunamadı.");
  const son = metin.indexOf("}]", bas);
  if (son === -1) throw new Error("Kişi listesi yarım görünüyor.");

  let dizi;
  try {
    dizi = JSON.parse(metin.slice(bas, son + 2));
  } catch (hata) {
    throw new Error("Kişi listesi okunamadı (biçim beklenenden farklı).");
  }
  if (!Array.isArray(dizi)) throw new Error("Kişi listesi okunamadı.");
  return dizi
    .filter((k) => k && typeof k === "object")
    .map((k, sira) => ({
      ad: String(k.ad || "").trim(), ilk_ad: String(k.ilk || "").trim(),
      telefon: String(k.tel || "").trim(), etiket: "", aciklama: "", satir: sira + 1,
    }));
}

/* Ham satırları denetleyip kayda hazır kişilere çevirir.
   mevcutlar: rehberde zaten olan kişiler (aynı numara ikinci kez eklenmez).
   Dönüş: { eklenecek: [...], hatali: [{ satir, ad, neden }], yinelenen: [{ satir, ad }] } */
function kisileriHazirla(hamlar, mevcutlar = [], varsayilanEtiket = "") {
  const gorulen = new Set(mevcutlar.map((k) => k.telefon));
  const sonuc = { eklenecek: [], hatali: [], yinelenen: [] };

  for (const ham of hamlar) {
    const ad = String(ham.ad || "").trim().slice(0, 120);
    if (!ad) { sonuc.hatali.push({ satir: ham.satir, ad: "", neden: "ad boş" }); continue; }
    const tel = telefonNormallestir(ham.telefon);
    if (tel.hata) { sonuc.hatali.push({ satir: ham.satir, ad: ad, neden: tel.hata }); continue; }
    if (gorulen.has(tel.telefon)) { sonuc.yinelenen.push({ satir: ham.satir, ad: ad }); continue; }
    gorulen.add(tel.telefon);
    sonuc.eklenecek.push({
      ad: ad,
      ilk_ad: String(ham.ilk_ad || "").trim().slice(0, 60) || ilkAdTahmin(ad),
      telefon: tel.telefon,
      etiket: String(ham.etiket || "").trim().slice(0, 40) || varsayilanEtiket,
      aciklama: String(ham.aciklama || "").trim().slice(0, 500),
    });
  }
  return sonuc;
}

// Kişileri CSV olarak dışa verir (Excel Türkçe ayarı için ";" ve UTF-8 BOM).
function kisileriCsvYap(kisiler) {
  const hucre = (deger) => {
    const metin = String(deger == null ? "" : deger);
    return /[";\n\r]/.test(metin) ? '"' + metin.replace(/"/g, '""') + '"' : metin;
  };
  const satirlar = [["ad", "ilk ad", "telefon", "etiket", "not"].join(";")];
  for (const k of kisiler) satirlar.push([k.ad, k.ilk_ad, k.telefon, k.etiket, k.aciklama].map(hucre).join(";"));
  return "﻿" + satirlar.join("\r\n");
}

/* ---------- Mesaj şablonları ---------- */

const SABLON_DEGISKENLERI = ["ad", "tarih", "saat", "yer", "link"];
const SABLON_TURLERI = [
  { deger: "kabul", etiket: "Kabul" },
  { deger: "davet", etiket: "Davet" },
  { deger: "hatirlatma", etiket: "Hatırlatma" },
  { deger: "duyuru", etiket: "Genel duyuru" },
];

// "Hazır şablonları ekle" düğmesiyle eklenen başlangıç şablonları.
// Değişkenden sonra ek yok ("{saat}'de" gibi): ek, değere göre değişir (17.30'da / 20.00'de).
const VARSAYILAN_SABLONLAR = [
  { ad: "Kabul mesajı", tur: "kabul",
    metin: "Merhaba {ad}, eğitim programımıza kabul edildin, tebrikler! 🎉\n\n" +
      "Tanışma toplantımız: {tarih}, saat {saat}. Yer: {yer}. Seni aramızda görmek isteriz.\n\n" +
      "Ayrıntılar: {link}" },
  { ad: "Toplantı daveti", tur: "davet",
    metin: "Merhaba {ad}, toplantımıza davetlisin.\nTarih: {tarih}, saat {saat}\nYer: {yer}\nKatılabilecek misin?" },
  { ad: "Toplantı hatırlatması", tur: "hatirlatma",
    metin: "Merhaba {ad}, hatırlatma: bir sonraki toplantımız {tarih}, saat {saat}. Yer: {yer}. Görüşmek üzere!" },
  { ad: "Genel duyuru", tur: "duyuru",
    metin: "Merhaba {ad}, kulübümüzden bir duyuru var: {link}" },
];

// Şablondaki {değişken} yerlerini doldurur. Bilinmeyen {x} olduğu gibi kalır.
// Değeri boş olan değişken de olduğu gibi kalır ki kullanıcı eksik olduğunu görsün.
function sablonDoldur(metin, degerler = {}) {
  return String(metin || "").replace(/\{(\w+)\}/g, (butun, ad) =>
    SABLON_DEGISKENLERI.includes(ad) && degerler[ad] ? String(degerler[ad]) : butun);
}

// Metinde doldurulmamış hangi {değişken}ler kaldı? ["saat", "yer"] gibi.
// haric: bilerek sonra doldurulacak olanlar (ör. kişiye göre değişen {ad}).
function eksikDegiskenler(metin, haric = []) {
  const bulunan = (String(metin || "").match(/\{(\w+)\}/g) || []).map((p) => p.slice(1, -1));
  return [...new Set(bulunan)].filter((ad) => SABLON_DEGISKENLERI.includes(ad) && !haric.includes(ad));
}

/* ---------- WhatsApp bağlantıları ----------
   wa.me, WhatsApp'ın resmî "tıkla ve sohbet et" bağlantısıdır: mesajı hazır
   hâlde açar, GÖNDER'e kullanıcı basar. Toplu ve otomatik gönderim resmî
   olarak desteklenmez; bu uygulama da yapmaz. */
function waLinki(telefon, mesaj) {
  return "https://wa.me/" + encodeURIComponent(telefon) + "?text=" + encodeURIComponent(mesaj);
}

// Kişi belirtmeden: WhatsApp açılır, mesajın gideceği sohbeti/grubu kullanıcı seçer.
function waPaylasLinki(mesaj) {
  return "https://wa.me/?text=" + encodeURIComponent(mesaj);
}

/* ---------- Duyuruya bağlantı ve medya ----------
   wa.me bağlantısı yalnızca yazı taşır; fotoğraf ve video telefonun Paylaş
   menüsüyle (Web Share API) gider. Dosyalar hiçbir yere kaydedilmez: yalnızca
   paylaşım anında, cihazın belleğinde kullanılır. */
const MEDYA_EN_FAZLA = 10;
const MEDYA_EN_BUYUK_MB = 100;

// Kullanıcının yazdığı bağlantıyı tıklanabilir hâle getirir: "ornek.test/form"
// -> "https://ornek.test/form". http(s) dışındaki şemalar ve adres olmayan yazılar boş döner.
function baglantiDuzelt(link) {
  const yazi = String(link || "").trim();
  if (!yazi || /\s/.test(yazi)) return "";
  if (/^https?:\/\/[^\s/]+/i.test(yazi)) return yazi;
  if (/^[a-z][a-z0-9+.-]*:/i.test(yazi)) return "";
  return /^[^\s/:?#]+\.[^\s/:?#]+([/?#]\S*)?$/.test(yazi) ? "https://" + yazi : "";
}

// Bağlantı metinde geçmiyorsa metnin sonuna, boş bir satırdan sonra ekler.
function baglantiyiEkle(metin, link) {
  const temiz = baglantiDuzelt(link);
  const yazi = String(metin || "");
  if (!temiz) return yazi;
  const ham = String(link).trim();
  if (yazi.includes(temiz) || yazi.includes(ham)) return yazi;
  const govde = yazi.trimEnd();
  return govde ? govde + "\n\n" + temiz : temiz;
}

// Seçilen dosyalardan paylaşılabilecekleri ayırır. "onceki": zaten seçili olanlar (adet sınırı için).
function medyaSuz(dosyalar, onceki = []) {
  const uygun = [];
  const reddedilen = [];
  for (const dosya of dosyalar || []) {
    const tur = String(dosya.type || "");
    if (!/^(image|video)\//.test(tur)) {
      reddedilen.push({ ad: dosya.name, neden: "yalnızca fotoğraf ya da video eklenebilir" });
    } else if (dosya.size > MEDYA_EN_BUYUK_MB * 1024 * 1024) {
      reddedilen.push({ ad: dosya.name, neden: "dosya " + MEDYA_EN_BUYUK_MB + " MB'tan büyük" });
    } else if (onceki.length + uygun.length >= MEDYA_EN_FAZLA) {
      reddedilen.push({ ad: dosya.name, neden: "en fazla " + MEDYA_EN_FAZLA + " dosya eklenebilir" });
    } else {
      uygun.push(dosya);
    }
  }
  return { uygun, reddedilen };
}

// Hangi yolla paylaşılacak?
//   "baglanti": medya yok, wa.me bağlantısı yeter
//   "dosyali" : tarayıcı dosyayı Paylaş menüsüne verebiliyor (Android Chrome, iPhone Safari)
//   "dosyasiz": medya var ama tarayıcı dosya paylaşamıyor; metin kopyalanır, dosyayı kullanıcı ekler
function paylasimYolu(nav, dosyalar) {
  if (!dosyalar || !dosyalar.length) return "baglanti";
  if (nav && typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: dosyalar })) {
    return "dosyali";
  }
  return "dosyasiz";
}

// Telefon ya da tablet mi? (iPad kendini Mac gibi tanıtır; dokunmatik ekranından anlaşılır)
function mobilCihazMi(nav) {
  if (!nav) return false;
  if (nav.userAgentData && typeof nav.userAgentData.mobile === "boolean" && nav.userAgentData.mobile) return true;
  const ua = String(nav.userAgent || "");
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return /Macintosh/.test(ua) && Number(nav.maxTouchPoints) > 1;
}

// Paylaş menüsüne ne verilecek? WhatsApp masaüstü (Windows / Mac), dosyayla gelen metni
// ayrı bir mesaj olarak gönderiyor. Bu yüzden bilgisayarda yalnızca dosya verilir; metin
// panoya kopyalanır ve WhatsApp'taki "Açıklama ekle" kutusuna yapıştırılınca görselle tek mesaj olur.
// Telefonda WhatsApp metni görselin açıklaması yapar; orada ikisi birlikte verilir.
function paylasimIcerigi(metin, dosyalar, mobil) {
  return mobil ? { text: metin, files: dosyalar.slice() } : { files: dosyalar.slice() };
}

/* ---------- Gönderim listesi (kampanya) ----------
   Her gönderim ayrı kayıttır. Alıcılar o anki hâlleriyle kopyalanır:
   kişi sonradan silinse ya da numarası değişse de liste bozulmaz. */
function kampanyaHazirla({ ad, sablonId, mesaj, degerler }, kisiler) {
  return {
    ad: String(ad || "").trim() || "Gönderim",
    sablon_id: sablonId || "",
    // {ad} dışındaki değişkenler şimdi doldurulur; {ad} her kişi için ayrı doldurulur
    mesaj: sablonDoldur(mesaj, { ...degerler, ad: "" }),
    alicilar: kisiler.map((k) => ({
      kisi_id: k.id || "", ad: k.ad, ilk_ad: k.ilk_ad || ilkAdTahmin(k.ad), telefon: k.telefon,
      gonderildi: false, zaman: "",
    })),
  };
}

// Bir alıcıya gidecek son mesaj
function aliciMesaji(kampanya, alici) {
  return sablonDoldur(kampanya.mesaj, { ad: alici.ilk_ad || ilkAdTahmin(alici.ad) });
}

// Alıcının gönderildi işaretini değiştirir; YENİ alıcı listesi döner (asıl liste değişmez).
function aliciIsaretle(alicilar, sira, gonderildi, zaman) {
  return alicilar.map((a, i) => (i === sira ? { ...a, gonderildi: gonderildi, zaman: gonderildi ? zaman : "" } : a));
}

function kampanyaIlerleme(kampanya) {
  const alicilar = (kampanya && kampanya.alicilar) || [];
  const gonderilen = alicilar.filter((a) => a.gonderildi).length;
  return { gonderilen: gonderilen, toplam: alicilar.length, yazi: gonderilen + "/" + alicilar.length };
}

/* ---------- Tutanakla bağ ---------- */

/* Tutanaktaki "Sonraki Toplantı" serbest yazıdır: "19 Mart 2026 Perşembe, 17.30".
   Buradan saat ve tarihi ayırırız. Saat bulunamazsa hepsi tarih sayılır. */
function sonrakiToplantiCoz(metin) {
  const kaynak = String(metin || "").trim();
  // "17.30" ya da "9:05"; "12.03.2026" gibi bir tarihin parçası saat sayılmaz
  const saat = kaynak.match(/(?:saat\s*)?(?<![\d./])([01]?\d|2[0-3])[.:]([0-5]\d)(?![\d.:/])/i);
  if (!saat) return { tarih: kaynak, saat: "" };
  const tarih = (kaynak.slice(0, saat.index) + kaynak.slice(saat.index + saat[0].length))
    .replace(/\s*[,;–-]\s*$/, "").replace(/^\s*[,;–-]\s*/, "").replace(/\s{2,}/g, " ").trim();
  return { tarih: tarih, saat: saat[1].padStart(2, "0") + ":" + saat[2] };
}

/* Tutanakta adı geçen kişileri rehberde bulur: katılımcılar ve Madde 3
   (görev durumu) satırlarında adı yazanlar. Ad eşleşmesi büyük/küçük harf
   duyarsızdır. Dönüş: rehberden kişi kimlikleri. */
function tutanakKisileri(tutanak, kisiler) {
  const katilimcilar = new Set((tutanak.katilimcilar || []).map(adSade));
  const gorevMetni = adSade((tutanak.gorevler || []).join(" "));
  return kisiler
    .filter((k) => katilimcilar.has(adSade(k.ad)) || (adSade(k.ad).length > 3 && gorevMetni.includes(adSade(k.ad))))
    .map((k) => k.id);
}

// Tutanaktan şablon değerleri: tarih ve saat "Sonraki Toplantı"dan gelir.
function tutanaktanDegerler(tutanak) {
  const { tarih, saat } = sonrakiToplantiCoz(tutanak.sonraki_toplanti);
  return { tarih: tarih, saat: saat };
}

// Etiketlerin listesi (filtre menüsü için), alfabetik
function etiketler(kisiler) {
  return [...new Set(kisiler.map((k) => k.etiket).filter((e) => e))].sort((a, b) => a.localeCompare(b, "tr"));
}

// Arama + etiket filtresi
function kisileriSuz(kisiler, { arama = "", etiket = "" } = {}) {
  const aranan = adSade(arama);
  const rakam = arama.replace(/\D/g, "");
  return kisiler.filter((k) =>
    (!etiket || k.etiket === etiket) &&
    (!aranan || adSade(k.ad).includes(aranan) || adSade(k.ilk_ad).includes(aranan) ||
      (rakam.length >= 3 && String(k.telefon).includes(rakam))));
}

if (typeof module !== "undefined") {
  module.exports = {
    telefonNormallestir, telefonGoster, ilkAdTahmin, adSade,
    ayiriciBul, csvSatiriniBol, csvAyristir, htmlKisiDizisiOku, kisileriHazirla, kisileriCsvYap,
    SABLON_DEGISKENLERI, SABLON_TURLERI, VARSAYILAN_SABLONLAR, sablonDoldur, eksikDegiskenler,
    waLinki, waPaylasLinki, MEDYA_EN_FAZLA, MEDYA_EN_BUYUK_MB, baglantiDuzelt, baglantiyiEkle, medyaSuz, paylasimYolu, mobilCihazMi, paylasimIcerigi,
    kampanyaHazirla, aliciMesaji, aliciIsaretle, kampanyaIlerleme,
    sonrakiToplantiCoz, tutanakKisileri, tutanaktanDegerler, etiketler, kisileriSuz,
  };
}
