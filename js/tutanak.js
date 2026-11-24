/* ==========================================================================
   RESMÎ TUTANAK — saf mantık
   --------------------------------------------------------------------------
   Kulübün resmî toplantı tutanağı biçimi için her şey burada; ekrana ve
   depoya dokunmaz (testleri: testler/tutanak.test.js).

     1) Varsayılanlar ve küçük yardımcılar
     2) Numara: sıradaki tutanak numarası, sıra sözcükleri ("Dördüncü")
     3) Yeni taslak / kopya / devreden karar adayları
     4) Notlardan yapıya çevirme (yapay zekâ yok, basit kurallar)
     5) Belge çıktısı: HTML ve sayfa (yazdırma) kuralları

   Bir tutanağın alanları (js/yedek.js > YEDEK_SEMASI ile aynı):
     kurum, alt_baslik, numara,
     toplanti_tarihi, tutanak_tarihi (YYYY-AA-GG), sonraki_toplanti (serbest yazı),
     ek_etiket, ek_deger          -> bilgi tablosunun 4. kutusu (ör. Seminer/Buluşma)
     katilimcilar: ["Ad Soyad"]
     devreden_giris, devreden: [{ metin, atif }]   -> MADDE 1
     kararlar: ["..."]                              -> MADDE 2
     gorevler: ["..."]                              -> MADDE 3
     alt_bilgi, sayfa_altligi
   ========================================================================== */

/* ---------- 1) Varsayılanlar ---------- */

// İlk tutanakta formun dolu geleceği GENEL değerler. Uygulama bunun yerine kurumun
// kendi varsayılanlarını verir (js/kurum.js > tutanakVarsayilani: kurum ayarları ya da
// takım adı). Hepsi formda değiştirilebilir; sonraki tutanaklar bir öncekinden
// kopyalanır, buraya bir daha bakılmaz. Kuruma özel sabit (ad, kalıp) burada OLMAZ.
const TUTANAK_VARSAYILAN = {
  kurum: "",
  alt_baslik: "Birinci Toplantı",
  numara_kalibi: "TT-{yil}/01",
  ek_etiket: "",
  devreden_giris: "Önceki toplantılarda alınan ve geçerliliği devam eden kararlar aşağıda sıralanmıştır.",
  alt_bilgi: "Toplantı Tutanağı No. 01",
  sayfa_altligi: "Toplantı Tutanağı 01",
};

const TUTANAK_BASLIGI = "TOPLANTI TUTANAĞI";
const MADDE_BASLIKLARI = [
  "MADDE 1 — DEVREDEN KARARLAR",
  "MADDE 2 — BU TOPLANTIDA ALINAN KARARLAR",
  "MADDE 3 — GÖREV DURUMU VE SONRAKİ TOPLANTI",
];
const IMZA_BASLIGI = "TOPLANTI KATILIMCILARI";

// Boş bir tutanak (bütün alanlar tanımlı; ekran "undefined" ile uğraşmasın).
function bosTutanak() {
  return {
    kurum: "", alt_baslik: "", numara: "",
    toplanti_tarihi: "", tutanak_tarihi: "", sonraki_toplanti: "",
    ek_etiket: "", ek_deger: "",
    katilimcilar: [],
    devreden_giris: "", devreden: [], kararlar: [], gorevler: [],
    alt_bilgi: "", sayfa_altligi: "",
  };
}

// Tutanakları eskiden yeniye sıralar (toplantı tarihi, eşitse oluşturma zamanı).
function tutanaklariSirala(tutanaklar) {
  return [...tutanaklar].sort((a, b) =>
    (a.toplanti_tarihi || "").localeCompare(b.toplanti_tarihi || "") ||
    (a.olusturma || "").localeCompare(b.olusturma || ""));
}

/* ---------- 2) Numara ---------- */

// "ROTA/İSAS-2026/04" -> "04"  (numaradaki SON sayı grubu; yoksa "")
function tutanakSirasi(numara) {
  const eslesme = String(numara || "").match(/(\d+)\D*$/);
  return eslesme ? eslesme[1] : "";
}

/* Bir önceki numaradan sıradakini üretir. Biçim "ayarlanabilir"dir: ayrı bir
   ayar yoktur, kalıp bir önceki numaradan öğrenilir. Numarayı bir kez elle
   değiştirirsen sonrakiler o biçimi izler.
     "ROTA/İSAS-2026/04", 2026 -> "ROTA/İSAS-2026/05"   (sıfır dolgusu korunur)
     "ROTA/İSAS-2026/12", 2027 -> "ROTA/İSAS-2027/01"   (yıl değişti: sayaç sıfırlanır)
     "",                  2026 -> kurumun kalıbı, ör. "ROTA/İSAS-{yil}/01" -> "ROTA/İSAS-2026/01" */
function sonrakiTutanakNo(oncekiNo, yil, ilkKalip = TUTANAK_VARSAYILAN.numara_kalibi) {
  const onceki = String(oncekiNo || "").trim();
  if (!onceki) return (ilkKalip || TUTANAK_VARSAYILAN.numara_kalibi).replace("{yil}", yil);

  const eslesme = onceki.match(/^(.*?)(\d+)(\D*)$/);
  if (!eslesme) return onceki + "-2"; // içinde hiç sayı yok: sonuna ek koy
  const [, onEk, sayi, sonEk] = eslesme;

  // Ön ekte dört haneli bir yıl varsa ve yıl değiştiyse: yılı güncelle, sayacı 1 yap.
  const yilEslesme = onEk.match(/20\d{2}/);
  if (yilEslesme && yil && yilEslesme[0] !== String(yil)) {
    return onEk.replace(yilEslesme[0], String(yil)) + "1".padStart(sayi.length, "0") + sonEk;
  }
  return onEk + String(Number(sayi) + 1).padStart(sayi.length, "0") + sonEk;
}

// 4 -> "Dördüncü", 11 -> "On Birinci", 20 -> "Yirminci". 99'dan büyükse "100."
function sirayiYaziyla(sayi) {
  const birler = ["", "Birinci", "İkinci", "Üçüncü", "Dördüncü", "Beşinci", "Altıncı", "Yedinci", "Sekizinci", "Dokuzuncu"];
  const onlarKok = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const onlarSira = ["", "Onuncu", "Yirminci", "Otuzuncu", "Kırkıncı", "Ellinci", "Altmışıncı", "Yetmişinci", "Sekseninci", "Doksanıncı"];
  if (!Number.isInteger(sayi) || sayi < 1 || sayi > 99) return sayi + ".";
  if (sayi % 10 === 0) return onlarSira[sayi / 10];
  return (onlarKok[Math.floor(sayi / 10)] + " " + birler[sayi % 10]).trim();
}

// Metindeki eski sırayı yenisiyle değiştirir: önce sözcük olarak ("Dördüncü"
// -> "Beşinci"), bulunamazsa sayı olarak ("04" -> "05"). İkisi de yoksa metin aynen kalır.
function sirayiGuncelle(metin, eskiSira, yeniSira) {
  const kaynak = String(metin || "");
  if (!eskiSira || !yeniSira) return kaynak;

  const eskiSozcuk = sirayiYaziyla(Number(eskiSira));
  if (kaynak.includes(eskiSozcuk)) return kaynak.replace(eskiSozcuk, sirayiYaziyla(Number(yeniSira)));

  // Sayı olarak: metindeki SON eşleşme (başka sayıların parçası olmayan)
  const desen = new RegExp("(^|\\D)0*" + Number(eskiSira) + "(?!\\d)(?!.*\\D0*" + Number(eskiSira) + "(?!\\d))");
  return kaynak.replace(desen, (tum, once) => once + yeniSira);
}

/* ---------- 3) Yeni taslak, kopya, devreden kararlar ---------- */

/* Yeni tutanak için dolu bir taslak hazırlar.
   Önceki tutanak varsa: kurum, katılımcılar, etiketler ondan gelir; numara,
   alt başlık ve alt bilgi satırları bir sonraki sıraya göre güncellenir.
   Kararlar BOŞ gelir (her toplantının kararı kendine aittir).
   varsayilan: İLK tutanak için kurumun değerleri (js/kurum.js > tutanakVarsayilani). */
function yeniTutanakTaslagi(oncekiler, bugunTarihi, varsayilan = TUTANAK_VARSAYILAN) {
  const ilk = { ...TUTANAK_VARSAYILAN, ...varsayilan };
  const yil = bugunTarihi.slice(0, 4);
  const sirali = tutanaklariSirala(oncekiler);
  const son = sirali[sirali.length - 1];
  const taslak = bosTutanak();
  taslak.toplanti_tarihi = bugunTarihi;
  taslak.tutanak_tarihi = bugunTarihi;

  if (!son) {
    return {
      ...taslak,
      kurum: ilk.kurum,
      alt_baslik: ilk.alt_baslik,
      numara: sonrakiTutanakNo("", yil, ilk.numara_kalibi),
      ek_etiket: ilk.ek_etiket,
      devreden_giris: ilk.devreden_giris,
      alt_bilgi: ilk.alt_bilgi,
      sayfa_altligi: ilk.sayfa_altligi,
    };
  }

  const numara = sonrakiTutanakNo(son.numara, yil);
  const eskiSira = tutanakSirasi(son.numara);
  const yeniSira = tutanakSirasi(numara);
  return {
    ...taslak,
    kurum: son.kurum,
    alt_baslik: sirayiGuncelle(son.alt_baslik, eskiSira, yeniSira),
    numara: numara,
    ek_etiket: son.ek_etiket,
    katilimcilar: [...(son.katilimcilar || [])],
    devreden_giris: son.devreden_giris || ilk.devreden_giris,
    alt_bilgi: sirayiGuncelle(son.alt_bilgi, eskiSira, yeniSira),
    sayfa_altligi: sirayiGuncelle(son.sayfa_altligi, eskiSira, yeniSira),
  };
}

/* Var olan bir tutanağı şablon olarak kopyalar: İÇERİK (kararlar, görevler
   dahil) kaynaktan gelir; numara ve sıraya bağlı satırlar yeni tutanağa göre
   güncellenir; tarihler bugüne çekilir. */
function tutanakKopyasi(kaynak, oncekiler, bugunTarihi) {
  const taslak = yeniTutanakTaslagi(oncekiler, bugunTarihi);
  const eskiSira = tutanakSirasi(kaynak.numara);
  const yeniSira = tutanakSirasi(taslak.numara);
  return {
    ...bosTutanak(),
    kurum: kaynak.kurum,
    alt_baslik: sirayiGuncelle(kaynak.alt_baslik, eskiSira, yeniSira),
    numara: taslak.numara,
    toplanti_tarihi: bugunTarihi,
    tutanak_tarihi: bugunTarihi,
    sonraki_toplanti: "",
    ek_etiket: kaynak.ek_etiket,
    ek_deger: kaynak.ek_deger,
    katilimcilar: [...(kaynak.katilimcilar || [])],
    devreden_giris: kaynak.devreden_giris,
    devreden: (kaynak.devreden || []).map((d) => ({ metin: d.metin, atif: d.atif })),
    kararlar: [...(kaynak.kararlar || [])],
    gorevler: [...(kaynak.gorevler || [])],
    alt_bilgi: sirayiGuncelle(kaynak.alt_bilgi, eskiSira, yeniSira),
    sayfa_altligi: sirayiGuncelle(kaynak.sayfa_altligi, eskiSira, yeniSira),
  };
}

// Bir kararın hangi tutanaktan geldiğini söyleyen kısa atıf.
//   atifMetni("ROTA/İSAS-2026/03", 2) -> "ROTA/İSAS-2026/03, Karar 2"
function atifMetni(numara, kararSirasi) {
  return numara + ", Karar " + kararSirasi;
}

/* MADDE 1'e taşınabilecek kararların listesi: önceki tutanakların
   "bu toplantıda alınan kararlar"ı (atıf otomatik üretilir) ve hâlâ devreden
   kararları (ilk alındıkları toplantının atfı korunur). En yeni tutanak üstte.
   "haricId": düzenlenmekte olan tutanağın kendisi listeye girmesin diye. */
function devredenAdaylari(tutanaklar, haricId) {
  const adaylar = [];
  for (const tutanak of tutanaklariSirala(tutanaklar).reverse()) {
    if (tutanak.id === haricId) continue;
    (tutanak.kararlar || []).forEach((metin, sira) => {
      adaylar.push({ kaynak_no: tutanak.numara, metin: metin, atif: atifMetni(tutanak.numara, sira + 1) });
    });
    for (const devreden of tutanak.devreden || []) {
      adaylar.push({ kaynak_no: tutanak.numara, metin: devreden.metin, atif: devreden.atif });
    }
  }
  // Aynı karar birkaç tutanakta devretmiş olabilir; (metin + atıf) aynıysa bir kez göster.
  const gorulen = new Set();
  return adaylar.filter((aday) => {
    const anahtar = aday.metin + "|" + aday.atif;
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);
    return true;
  });
}

/* ---------- 4) Notlardan yapıya çevirme ----------
   Serbest yazılmış toplantı notunu tutanak alanlarına dağıtır. Kurallar:
     - "Etiket: değer" satırları alanlara gider     (Toplantı Tarihi: 12.03.2026)
     - Bölüm başlıkları sonraki satırların nereye gideceğini belirler
       (Devreden Kararlar / Kararlar / Görev Durumu / MADDE 1-2-3)
     - Bölüm içinde numaralı satırlar (1. 2) - •) madde başlatır; numarasız
       satır bir önceki maddenin devamıdır. Hiç numara yoksa her satır bir maddedir.
     - Tanınmayan satırlar ATILMAZ; "artan" listesinde kullanıcıya gösterilir.
   Sonuç her zaman elle düzeltilebilir bir formda açılır; bu yüzden kurallar
   basit tutuldu: %100 doğru olması gerekmiyor, kaybetmemesi gerekiyor. */

// Karşılaştırma için sadeleştir: küçük harf (Türkçe), baş/son boşluk ve ":" yok.
function etiketSade(metin) {
  return String(metin).toLocaleLowerCase("tr").replace(/\s+/g, " ").replace(/[:：]\s*$/, "").trim();
}

// "12.03.2026", "12/03/2026", "12 Mart 2026 Perşembe", "2026-03-12" -> "2026-03-12"
// Tanıyamazsa "" döner.
function tarihCoz(metin) {
  const kaynak = String(metin || "").trim();
  let yil, ay, gun;

  let e = kaynak.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (e) [, yil, ay, gun] = e;
  if (!e && (e = kaynak.match(/(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})/))) [, gun, ay, yil] = e;
  if (!e && (e = kaynak.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/))) {
    const aySirasi = AYLAR.findIndex((ad) => ad.toLocaleLowerCase("tr") === e[2].toLocaleLowerCase("tr"));
    if (aySirasi === -1) return "";
    [gun, ay, yil] = [e[1], aySirasi + 1, e[3]];
  }
  if (!e) return "";

  const sonuc = yil + "-" + String(ay).padStart(2, "0") + "-" + String(gun).padStart(2, "0");
  return tarihGecerli(sonuc) ? sonuc : "";
}

// Alan etiketleri: sadeleştirilmiş etiket -> alan adı
const NOT_ALANLARI = {
  "toplantı tarihi": "toplanti_tarihi",
  "tutanak tarihi": "tutanak_tarihi",
  "sonraki toplantı": "sonraki_toplanti",
  "tutanak no": "numara",
  "tutanak numarası": "numara",
  "alt başlık": "alt_baslik",
  "başlık": "alt_baslik",
  "kurum": "kurum",
  "katılımcılar": "katilimcilar",
  "katılanlar": "katilimcilar",
  "seminer/buluşma": "ek",
  "seminer / buluşma": "ek",
  "seminer": "ek",
  "buluşma": "ek",
  "etkinlik": "ek",
};

// Bölüm başlıkları. Baştaki "MADDE 2 —" kısmı isteğe bağlıdır.
const NOT_BOLUMLERI = [
  [/^(madde\s*1\s*[—–:-]?\s*)?devreden kararlar$|^madde\s*1$/, "devreden"],
  [/^(madde\s*2\s*[—–:-]?\s*)?(bu toplantıda )?(alınan )?kararlar$|^madde\s*2$/, "kararlar"],
  [/^(madde\s*3\s*[—–:-]?\s*)?(görev durumu.*|görevler|görev dağılımı)$|^madde\s*3$/, "gorevler"],
  [/^toplantı katılımcıları$/, "katilimcilar"],
];

function bolumBul(sadeMetin) {
  const bulunan = NOT_BOLUMLERI.find(([desen]) => desen.test(sadeMetin));
  return bulunan ? bulunan[1] : null;
}

// "Ali Kaya, Ece Demir; Can Öz" -> ["Ali Kaya", "Ece Demir", "Can Öz"]
function adlariAyir(metin) {
  return String(metin).split(/[,;\n]/)
    .map((ad) => ad.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").replace(/\.\s*$/, "").trim())
    .filter((ad) => ad);
}

// "Karar metni (ROTA/İSAS-2026/03, Karar 2)" -> { metin, atif }   (atıf sonda; eski biçim)
// "(ROTA/İSAS-2026/03, Karar 2) Karar metni" -> { metin, atif }   (atıf başta; referanstaki biçim)
function atifiAyir(metin) {
  const basta = metin.match(/^\(([^()]{3,120})\)\s*(\S.*)$/);
  if (basta) return { metin: basta[2].trim(), atif: basta[1].trim() };
  const sonda = metin.match(/^(.*\S)\s*\(([^()]{3,120})\)\s*\.?$/);
  return sonda ? { metin: sonda[1].trim(), atif: sonda[2].trim() } : { metin: metin, atif: "" };
}

/* Serbest not: hiç bölüm başlığı yazılmamış, elle tutulmuş not.
   Başlık olmadığı için satırları cümlenin kendisine bakarak dağıtır:
     - "…devam eden cümle" + küçük harfle başlayan alt satır -> tek satır
       (Word'den gelen metinde uzun cümleler ikiye bölünür)
     - "Toplantı katılımcıları a, b, c"        -> katılımcılar
     - "Bir sonraki toplantı 9 Kasım …"        -> sonraki toplantı (rakam varsa)
     - "(1. toplantı, Karar 3) …"              -> devreden karar, atıfıyla
     - "… devreden" ile biten satır            -> devreden karar
       ("Yeni devredenler 2. toplantıdan" satırı bunların atıfını verir)
     - "görevlerin …" geçen satır              -> görev durumu
     - tamamı büyük harf başlık satırı         -> artan (kullanıcı görsün)
     - geri kalan her satır                    -> karar
   Her biri tahmindir; sonuç formda elle düzeltilir. */
function kucukMu(metin) {
  return metin === metin.toLocaleLowerCase("tr") && metin !== metin.toLocaleUpperCase("tr");
}

// "çağla öztürk" -> "Çağla Öztürk"; büyük harf içeren ad olduğu gibi kalır.
function adBuyut(ad) {
  if (!kucukMu(ad)) return ad;
  return ad.split(" ").map((s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1)).join(" ");
}

function serbestNotuYerlestir(satirlar, sonuc, ham) {
  // 1) Bölünmüş cümleleri birleştir
  const birlesik = [];
  for (const satir of satirlar) {
    const onceki = birlesik[birlesik.length - 1];
    // Önceki satır uzunsa (Word satır sonu) ya da bu satır tek sözcükse ("kalmıştır.") devamıdır.
    const devamMi = onceki && !/[.!?:;]$/.test(onceki) &&
      /^[a-zçğıöşü]/.test(satir) && !/^https?:/i.test(satir) &&
      (onceki.length >= 60 || !/\s/.test(satir));
    if (devamMi) birlesik[birlesik.length - 1] = onceki + " " + satir;
    else birlesik.push(satir);
  }

  let devredenAtfi = "";
  for (const satir of birlesik) {
    const kucuk = satir.toLocaleLowerCase("tr"); // Türkçe'de harf sayısı değişmez
    let e;
    if ((e = kucuk.match(/^(?:toplantı\s+)?katılımcı(?:ları|lar)?\s*[:–-]?\s*/)) && satir.length > e[0].length) {
      sonuc.katilimcilar.push(...adlariAyir(satir.slice(e[0].length)).map(adBuyut));
    } else if ((e = kucuk.match(/^(?:bir?\s+)?sonraki\s+toplantı\s*[:–-]?\s+/)) && /\d/.test(satir.slice(e[0].length))) {
      sonuc.sonraki_toplanti = satir.slice(e[0].length).trim();
    } else if ((e = kucuk.match(/devredenler?\b.*?(\d+)\s*\.\s*toplantı/)) && satir.length < 60) {
      devredenAtfi = e[1] + ". toplantı";
    } else if (/^\([^()]*karar\s*\d+[^()]*\)/.test(kucuk)) {
      ham.devreden.push({ numarali: false, metin: satir });
    } else if ((e = kucuk.match(/\s*devreden\s*\.?\s*$/)) && e.index > 0) {
      const govde = satir.slice(0, e.index).trim();
      ham.devreden.push({ numarali: false, metin: devredenAtfi ? "(" + devredenAtfi + ") " + govde : govde });
    } else if (/görevler(?:in|i)?(?:\s|$)/.test(kucuk)) {
      ham.gorevler.push({ numarali: false, metin: satir });
    } else if (birlesik[0] === satir && satir === satir.toLocaleUpperCase("tr") && /[A-ZÇĞİÖŞÜ]/.test(satir)) {
      sonuc.artan.push(satir);
    } else {
      // Numaralı yazılmışsa numarayı at; serbest notta her satır ayrı maddedir.
      ham.kararlar.push({ numarali: false, metin: satir.replace(/^\s*(?:[-•*]|\(?\d+[.)])\s+/, "") });
    }
  }
}

function notlariAyristir(metin) {
  const sonuc = { ...bosTutanak(), artan: [] };
  const tanimsiz = [];         // artan içinde hiçbir kurala uymayan satırların sırası
  let kararBolumuVar = false;  // devreden / kararlar / görevler başlığı görüldü mü
  const ham = { devreden: [], kararlar: [], gorevler: [] }; // [{ numarali, metin }]
  let bolum = null;          // şu an içinde olduğumuz bölüm
  let bekleyenAlan = null;   // "Etiket:" yazıp değeri alt satıra bırakılmış alan

  const alanaYaz = (alan, etiket, deger) => {
    if (alan === "katilimcilar") {
      sonuc.katilimcilar.push(...adlariAyir(deger));
    } else if (alan === "ek") {
      sonuc.ek_etiket = etiket;
      sonuc.ek_deger = deger;
    } else if (alan === "toplanti_tarihi" || alan === "tutanak_tarihi") {
      const tarih = tarihCoz(deger);
      if (tarih) sonuc[alan] = tarih;
      else sonuc.artan.push(etiket + ": " + deger); // tarihi anlayamadık: kaybetme, göster
    } else {
      sonuc[alan] = deger;
    }
  };

  let altBaslikBekleniyor = false; // "TOPLANTI TUTANAĞI" başlığından hemen sonraki satır alt başlıktır

  for (const hamSatir of String(metin || "").split(/\r?\n/)) {
    const satir = hamSatir.replace(/\t/g, " ").trim();
    if (!satir) continue;
    const sade = etiketSade(satir);

    // 0) Belgenin kendi başlığı (bu uygulamanın ürettiği Word/PDF'ten kopyalanan metin):
    //    üstündeki tek satır kurum adıdır, altındaki satır alt başlıktır.
    if (sade === etiketSade(TUTANAK_BASLIGI)) {
      if (sonuc.artan.length === 1 && !sonuc.kurum) {
        sonuc.kurum = sonuc.artan.pop();
        if (tanimsiz[tanimsiz.length - 1] === 0) tanimsiz.pop();
      }
      altBaslikBekleniyor = true;
      continue;
    }
    if (altBaslikBekleniyor) {
      altBaslikBekleniyor = false;
      const etiketli = satir.match(/^([^:：]{2,45})[:：]/);
      if (!bolumBul(sade) && !NOT_ALANLARI[sade] && !(etiketli && NOT_ALANLARI[etiketSade(etiketli[1])])) {
        sonuc.alt_baslik = satir;
        continue;
      }
    }

    // 1) Tek başına bölüm başlığı mı?  ("KARARLAR", "MADDE 2 — ...")
    const yeniBolum = bolumBul(sade);
    if (yeniBolum) {
      bolum = yeniBolum;
      if (yeniBolum !== "katilimcilar") kararBolumuVar = true;
      bekleyenAlan = null;
      continue;
    }

    // 2) "Etiket: değer" mi?
    const ikiNokta = satir.match(/^([^:：]{2,45})[:：]\s*(.*)$/);
    if (ikiNokta) {
      const etiket = ikiNokta[1].trim();
      const deger = ikiNokta[2].trim();
      const alan = NOT_ALANLARI[etiketSade(etiket)];
      const etiketBolumu = bolumBul(etiketSade(etiket));
      if (alan) {
        bolum = alan === "katilimcilar" ? "katilimcilar" : null;
        bekleyenAlan = deger ? null : { alan: alan, etiket: etiket };
        if (deger) alanaYaz(alan, etiket, deger);
        continue;
      }
      if (etiketBolumu) { // "Kararlar: 1) ..." gibi: başlık + aynı satırda ilk madde
        bolum = etiketBolumu;
        if (etiketBolumu !== "katilimcilar") kararBolumuVar = true;
        bekleyenAlan = null;
        if (!deger) continue;
        // değer kısmı aşağıda bölüm satırı olarak işlensin
        bolumSatiriEkle(deger);
        continue;
      }
    }

    // 3) İki nokta OLMADAN yazılmış etiket ("Toplantı Tarihi" tek başına).
    //    Değer kuralından ÖNCE bakılır: önceki etiketin değeri boş bırakılmışsa
    //    sıradaki etiket onun değeri sanılmasın.
    if (NOT_ALANLARI[sade]) {
      bolum = NOT_ALANLARI[sade] === "katilimcilar" ? "katilimcilar" : null;
      bekleyenAlan = { alan: NOT_ALANLARI[sade], etiket: satir };
      continue;
    }

    // 3b) Etiketi bir üst satırda kalmış değer mi?  (Word tablosundan gelen metin böyledir)
    if (bekleyenAlan && bekleyenAlan.alan !== "katilimcilar") {
      // Tek başına "—" belgedeki "boş" işaretidir; değer değildir.
      if (/^[—–-]$/.test(satir)) { bekleyenAlan = null; continue; }
      alanaYaz(bekleyenAlan.alan, bekleyenAlan.etiket, satir);
      bekleyenAlan = null;
      continue;
    }

    // 4) Bir bölümün içindeyiz
    if (bolum) {
      bolumSatiriEkle(satir);
      continue;
    }

    // 5) Hiçbir kurala uymadı
    tanimsiz.push(sonuc.artan.length);
    sonuc.artan.push(satir);
  }

  // Notta hiç bölüm başlığı yoksa, kurala uymayan satırları cümlelerine bakarak dağıt.
  if (!kararBolumuVar && tanimsiz.length) {
    const sira = new Set(tanimsiz);
    const serbest = sonuc.artan.filter((_, i) => sira.has(i));
    sonuc.artan = sonuc.artan.filter((_, i) => !sira.has(i));
    serbestNotuYerlestir(serbest, sonuc, ham);
  }

  function bolumSatiriEkle(satir) {
    if (bolum === "katilimcilar") {
      // Ad listesinin içindeki uzun satır ad olamaz; imza bölümünden sonraki alt bilgi satırıdır.
      if (satir.length > 60) sonuc.alt_bilgi = satir;
      else sonuc.katilimcilar.push(...adlariAyir(satir));
      return;
    }
    const numara = satir.match(/^\s*(?:[-•*]|\(?\d+[.)])\s+(.*)$/);
    ham[bolum].push({ numarali: !!numara, metin: (numara ? numara[1] : satir).trim() });
  }

  // Ham satırları maddelere çevir (numara kuralı yukarıda anlatıldı).
  const maddelestir = (satirlar) => {
    const numaraVar = satirlar.some((s) => s.numarali);
    const maddeler = [];
    for (const s of satirlar) {
      if (numaraVar && !s.numarali && maddeler.length) maddeler[maddeler.length - 1] += " " + s.metin;
      else maddeler.push(s.metin);
    }
    return maddeler;
  };

  // Devreden kararlarda, ilk numaralı maddeden ÖNCE gelen numarasız satırlar giriş cümlesidir.
  if (ham.devreden.some((s) => s.numarali)) {
    const giris = [];
    while (ham.devreden.length && !ham.devreden[0].numarali) giris.push(ham.devreden.shift().metin);
    if (giris.length) sonuc.devreden_giris = giris.join(" ");
  }

  sonuc.kararlar = maddelestir(ham.kararlar);
  sonuc.gorevler = maddelestir(ham.gorevler);
  sonuc.devreden = maddelestir(ham.devreden).map(atifiAyir);
  // Aynı ad iki kez yazılmışsa (üstte ve imza bölümünde) bir kez tut.
  sonuc.katilimcilar = [...new Set(sonuc.katilimcilar)];
  return sonuc;
}

/* Ayrıştırma sonucunu formdaki değerlerin üstüne yazar: notta BULUNAN alanlar
   güncellenir, bulunmayanlar formda olduğu gibi kalır (ör. kurum adı, numara). */
function notlariBirlestir(mevcut, ayristirilan) {
  const sonuc = { ...mevcut };
  for (const alan of Object.keys(bosTutanak())) {
    const deger = ayristirilan[alan];
    const dolu = Array.isArray(deger) ? deger.length > 0 : !!deger;
    if (dolu) sonuc[alan] = deger;
  }
  return sonuc;
}

/* ---------- 5) Belge çıktısı ---------- */

// Tutanağın belge görünümü (HTML). Ekrandaki önizleme, yazdırma/PDF ve
// testler aynı çıktıyı kullanır. Görünüm: css/stil.css > "Resmî tutanak".
// "Ali Kaya, Ece Demir" -> "Ali Kaya, Ece Demir."  (referanstaki gibi noktayla biter)
function katilimciSatiri(adlar) {
  const satir = (adlar || []).join(", ");
  return satir && !/[.!?]$/.test(satir) ? satir + "." : satir;
}

function tutanakBelgeHtml(t) {
  const k = htmlKacis;
  const maddeListesi = (maddeler, maddeHtml, bosYazi) => maddeler.length
    ? '<ol class="rt-maddeler">' + maddeler.map((madde, sira) =>
        '<li><span class="rt-sira">' + (sira + 1) + ".</span><span>" + maddeHtml(madde) + "</span></li>").join("") + "</ol>"
    : '<p class="rt-bos">' + bosYazi + "</p>";

  // Bilgi tablosu 2x2. Dördüncü kutu (ek) boşsa üçüncü kutu satırı kaplar.
  const ekVar = !!(t.ek_etiket && t.ek_deger);
  const bilgiTablosu =
    '<table class="rt-bilgi"><tbody>' +
    "<tr><th>Toplantı Tarihi</th><td>" + k(tarihYaz(t.toplanti_tarihi)) + "</td>" +
    "<th>Tutanak Tarihi</th><td>" + k(tarihYaz(t.tutanak_tarihi)) + "</td></tr>" +
    "<tr><th>Sonraki Toplantı</th><td" + (ekVar ? "" : ' colspan="3"') + ">" + (k(t.sonraki_toplanti) || "—") + "</td>" +
    (ekVar ? "<th>" + k(t.ek_etiket).replace(/\//g, "/<wbr>") + "</th><td>" + k(t.ek_deger) + "</td>" : "") + "</tr>" +
    "</tbody></table>";

  const imzalar = (t.katilimcilar || []).map((ad) =>
    '<div class="rt-imza"><span class="rt-imza-ad">' + k(ad) + '</span><span class="rt-imza-cizgi"></span></div>').join("");

  return '<article class="resmi-tutanak">' +
    '<p class="rt-kurum">' + k(t.kurum) + "</p>" +
    '<h2 class="rt-baslik">' + TUTANAK_BASLIGI + "</h2>" +
    (t.alt_baslik ? '<p class="rt-alt-baslik">' + k(t.alt_baslik) + "</p>" : "") +
    (t.numara ? '<p class="rt-no">Tutanak No: ' + k(t.numara) + "</p>" : "") +
    '<hr class="rt-ust-cizgi">' +   // başlık bloğunu tablodan ayıran kalın çizgi
    bilgiTablosu +
    '<p class="rt-katilimcilar">Katılımcılar: ' + (k(katilimciSatiri(t.katilimcilar)) || "—") + "</p>" +

    '<section class="rt-madde"><h3>' + MADDE_BASLIKLARI[0] + "</h3>" +
    ((t.devreden || []).length && t.devreden_giris ? '<p class="rt-giris">' + k(t.devreden_giris) + "</p>" : "") +
    maddeListesi(t.devreden || [], (d) =>
      (d.atif ? '<span class="rt-atif">(' + k(d.atif) + ")</span> " : "") + k(d.metin),
      "Devreden karar bulunmamaktadır.") +
    "</section>" +

    '<section class="rt-madde"><h3>' + MADDE_BASLIKLARI[1] + "</h3>" +
    maddeListesi(t.kararlar || [], k, "Bu toplantıda karar alınmamıştır.") + "</section>" +

    '<section class="rt-madde"><h3>' + MADDE_BASLIKLARI[2] + "</h3>" +
    maddeListesi(t.gorevler || [], k, "Kayıt girilmemiştir.") + "</section>" +

    // Alt bilgi satırı imza bölümünün İÇİNDE: sayfa sonunda tek başına yeni sayfaya düşmesin
    (imzalar
      ? '<section class="rt-imza-bolumu"><h3>' + IMZA_BASLIGI + '</h3><div class="rt-imzalar">' + imzalar + "</div>" +
        (t.alt_bilgi ? '<p class="rt-alt-bilgi">' + k(t.alt_bilgi) + "</p>" : "") + "</section>"
      : (t.alt_bilgi ? '<p class="rt-alt-bilgi">' + k(t.alt_bilgi) + "</p>" : "")) +
    "</article>";
}

// CSS içine güvenle konabilecek tırnaklı metin üretir ( " ve \ kaçırılır,
// satır sonları atılır). Kullanıcı metni CSS kuralını bozamasın diye.
function cssMetni(metin) {
  return '"' + String(metin || "").replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/* Her sayfanın altındaki satır: solda tutanağa özel yazı, sağda "Sayfa N".
   Bu bilgi tutanağa göre değiştiği için stil dosyasında duramaz; ekran bu
   kuralı bir <style> etiketine yazar (ekranlar/tutanaklar.js). Sayfa numarasını
   tarayıcının yazdırma motoru sayar (counter(page)). */
function tutanakSayfaCss(t) {
  return "@page resmi-tutanak {\n" +
    "  @bottom-left { content: " + cssMetni(t.sayfa_altligi) + "; }\n" +
    '  @bottom-right { content: "Sayfa " counter(page); }\n' +
    "}\n";
}

// PDF / Word dosya adı: "Tutanak-ROTA-ISAS-2026-04" (dosya adında sorun çıkaran karakterler temizlenir)
function tutanakDosyaAdi(t) {
  const harfler = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "Ç": "C", "Ğ": "G", "İ": "I", "Ö": "O", "Ş": "S", "Ü": "U" };
  const sade = String(t.numara || t.toplanti_tarihi || "taslak")
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (harf) => harfler[harf])
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return "Tutanak-" + (sade || "taslak");
}

if (typeof module !== "undefined") {
  module.exports = {
    TUTANAK_VARSAYILAN, TUTANAK_BASLIGI, MADDE_BASLIKLARI, IMZA_BASLIGI,
    bosTutanak, tutanaklariSirala, tutanakSirasi, sonrakiTutanakNo, sirayiYaziyla, sirayiGuncelle,
    yeniTutanakTaslagi, tutanakKopyasi, atifMetni, devredenAdaylari,
    tarihCoz, notlariAyristir, notlariBirlestir,
    tutanakBelgeHtml, katilimciSatiri, cssMetni, tutanakSayfaCss, tutanakDosyaAdi,
  };
}
