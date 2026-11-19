/* ==========================================================================
   KOLAYLIKLAR — ekranlardan bağımsız, saf (test edilebilir) yardımcılar
     1) Taslak saklama   : yarım kalan form, sayfa yenilense de kaybolmasın
     2) Sorumlu bulma    : karar metnindeki addan takım üyesini tahmin et
     3) Takvim dosyası   : toplantı / son tarih / görev -> .ics (Google, telefon)
     4) Klavye kısayolu  : basılan tuş hangi işe karşılık geliyor
     5) Genel arama      : bütün kayıtlarda Türkçe harfe duyarsız arama
   Ekranlara bağlanması: js/arayuz.js (taslak, arama penceresi, kısayollar),
   js/ekranlar/tutanaklar.js, takvim.js ve gorevler.js.
   ========================================================================== */

/* ---------- Ortak: karşılaştırma için sadeleştirme ----------
   "Şükrü IŞIK," -> "sukru isik"   (küçük harf, Türkçe harfler katlanır,
   noktalama boşluğa döner). Arama ve ad eşleştirme bunu kullanır. */
const HARF_KATLA = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

function sadelestir(metin) {
  return String(metin || "")
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (h) => HARF_KATLA[h])
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* ---------- 1) Taslak saklama ----------
   Taslak, tarayıcının localStorage'ına { veri, zaman } olarak yazılır.
   Yalnızca bu cihazda kalır ve TASLAK_OMRU_GUN sonra kendiliğinden silinir.
   Gizli modda ya da kota dolunca depo hata fırlatabilir: hiçbiri uygulamayı
   durdurmaz, taslak yalnızca saklanmamış olur. */
const TASLAK_ONEKI = "seyir:taslak:";
const TASLAK_OMRU_GUN = 14;

// Küçük, kararlı bir özet (djb2). Anahtarı formun başlangıç değerlerine
// bağlamak için: böylece A kaydının taslağı B kaydının formunda çıkmaz.
function kisaOzet(metin) {
  let h = 5381;
  for (let i = 0; i < metin.length; i++) h = ((h << 5) + h + metin.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function taslakAnahtari(tur, takimId, baslik, baslangic) {
  return tur + ":" + (takimId || "-") + ":" + kisaOzet(baslik + "|" + JSON.stringify(baslangic || {}));
}

function taslakKaydet(depo, anahtar, veri, simdi = Date.now()) {
  try {
    depo.setItem(TASLAK_ONEKI + anahtar, JSON.stringify({ veri: veri, zaman: simdi }));
    return true;
  } catch (hata) {
    return false;
  }
}

function taslakSil(depo, anahtar) {
  try { depo.removeItem(TASLAK_ONEKI + anahtar); } catch (hata) { /* yok say */ }
}

function taslakOku(depo, anahtar, simdi = Date.now()) {
  let ham;
  try { ham = depo.getItem(TASLAK_ONEKI + anahtar); } catch (hata) { return null; }
  if (!ham) return null;
  try {
    const taslak = JSON.parse(ham);
    const gecerli = taslak && typeof taslak.zaman === "number" && taslak.veri &&
      simdi - taslak.zaman <= TASLAK_OMRU_GUN * 86400000;
    if (gecerli) return { veri: taslak.veri, zaman: taslak.zaman };
  } catch (hata) { /* bozuk kayıt: aşağıda silinir */ }
  taslakSil(depo, anahtar);
  return null;
}

/* ---------- 2) Karardan görev: sorumlu tahmini ----------
   "faaliyet raporu takibi çağla öztürk" -> Çağla Öztürk üyesi.
   Önce tam ad aranır (en uzun eşleşen kazanır); bulunmazsa yalnızca ilk ad
   yazılmış olabilir: o ada sahip TEK üye varsa o seçilir, birden çoksa
   tahmin yapılmaz (yanlış kişiye görev atamaktansa boş bırakmak iyidir). */
function sorumluBul(metin, uyeler) {
  const sade = " " + sadelestir(metin) + " ";
  if (sade.trim() === "") return null;

  const tamAdla = (uyeler || [])
    .filter((u) => sadelestir(u.ad) && sade.includes(" " + sadelestir(u.ad) + " "))
    .sort((a, b) => sadelestir(b.ad).length - sadelestir(a.ad).length);
  if (tamAdla.length) return tamAdla[0];

  const sozcukler = new Set(sade.trim().split(" "));
  const ilkAdla = (uyeler || []).filter((u) => sozcukler.has(sadelestir(u.ad).split(" ")[0]));
  return ilkAdla.length === 1 ? ilkAdla[0] : null;
}

/* ---------- 3) Takvim dosyası (.ics, RFC 5545) ----------
   Google Takvim, Outlook ve telefon takvimleri bu dosyayı içe aktarır.
   Kurallar: satır sonu CRLF; ; , \ ve satır sonu kaçışlı; 75 bayttan uzun
   satır "katlanır" (CRLF + boşluk). Saat yerel saattir (saat dilimi yazılmaz:
   takvim, kullanıcının kendi saat dilimini varsayar). Saati olmayan ya da
   anlaşılmayan olay "tüm gün" olur. */
function icsKacis(metin) {
  return String(metin || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Satırı 75 baytlık parçalara böler; çok baytlı harfi (ğ, ş) ortadan bölmez.
function icsKatla(satir) {
  const parcalar = [];
  let parca = "";
  let bayt = 0;
  for (const harf of satir) {
    const harfBayti = new TextEncoder().encode(harf).length;
    const sinir = parcalar.length ? 74 : 75; // devam satırının başındaki boşluk da sayılır
    if (bayt + harfBayti > sinir) {
      parcalar.push(parca);
      parca = "";
      bayt = 0;
    }
    parca += harf;
    bayt += harfBayti;
  }
  parcalar.push(parca);
  return parcalar.join("\r\n ");
}

const iki = (n) => String(n).padStart(2, "0");

// "17:30", "17.30", "9:05" -> { saat: 17, dakika: 30 }; anlaşılmazsa null
function saatCoz(metin) {
  const e = String(metin || "").trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!e) return null;
  const saat = Number(e[1]);
  const dakika = Number(e[2]);
  return saat < 24 && dakika < 60 ? { saat, dakika } : null;
}

// "2026-12-31" + gün -> "20270101"  (UTC ile hesaplanır: saat dilimi kaydırmasın)
function icsGun(tarih, ekGun = 0) {
  const [y, a, g] = tarih.split("-").map(Number);
  const d = new Date(Date.UTC(y, a - 1, g + ekGun));
  return d.getUTCFullYear() + iki(d.getUTCMonth() + 1) + iki(d.getUTCDate());
}

function icsOlustur(olaylar, { takvimAdi = "", simdi = Date.now() } = {}) {
  const d = new Date(simdi);
  const damga = d.getUTCFullYear() + iki(d.getUTCMonth() + 1) + iki(d.getUTCDate()) + "T" +
    iki(d.getUTCHours()) + iki(d.getUTCMinutes()) + iki(d.getUTCSeconds()) + "Z";

  const satirlar = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Seyir//Takim Asistani//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  if (takvimAdi) satirlar.push("X-WR-CALNAME:" + icsKacis(takvimAdi));

  for (const olay of olaylar) {
    satirlar.push("BEGIN:VEVENT", "UID:" + icsKacis(olay.uid), "DTSTAMP:" + damga);
    const saat = saatCoz(olay.saat);
    if (saat) {
      // Bitiş: 1 saat sonra (gece yarısını geçerse ertesi gün)
      const bitisDakika = saat.saat * 60 + saat.dakika + 60;
      satirlar.push(
        "DTSTART:" + icsGun(olay.tarih) + "T" + iki(saat.saat) + iki(saat.dakika) + "00",
        "DTEND:" + icsGun(olay.tarih, Math.floor(bitisDakika / 1440)) + "T" +
          iki(Math.floor((bitisDakika % 1440) / 60)) + iki(bitisDakika % 60) + "00");
    } else {
      satirlar.push("DTSTART;VALUE=DATE:" + icsGun(olay.tarih), "DTEND;VALUE=DATE:" + icsGun(olay.tarih, 1));
    }
    satirlar.push("SUMMARY:" + icsKacis(olay.baslik));
    if (olay.yer) satirlar.push("LOCATION:" + icsKacis(olay.yer));
    if (olay.aciklama) satirlar.push("DESCRIPTION:" + icsKacis(olay.aciklama));
    satirlar.push("END:VEVENT");
  }
  satirlar.push("END:VCALENDAR");
  return satirlar.map(icsKatla).join("\r\n") + "\r\n";
}

// Takımın kayıtlarından takvime aktarılacak olaylar: bugün ve sonrası,
// tamamlanmış son tarihler ve bitmiş görevler hariç. Tarihe göre sıralı.
function takvimOlaylari({ sonTarihler = [], toplantilar = [], etkinlikler = [], gorevler = [] }, bugunTarihi) {
  const olaylar = [];
  for (const t of toplantilar) {
    olaylar.push({ uid: "toplanti-" + t.id + "@seyir", baslik: t.baslik, tarih: t.tarih, saat: t.saat || "", yer: t.yer || "",
      aciklama: (t.gundem || []).length ? "Gündem:\n" + t.gundem.map((m, i) => (i + 1) + ". " + m).join("\n") : "" });
  }
  for (const e of etkinlikler) {
    olaylar.push({ uid: "etkinlik-" + e.id + "@seyir", baslik: e.ad, tarih: e.tarih, yer: e.yer || "", aciklama: e.aciklama || "" });
  }
  for (const s of sonTarihler) {
    if (s.tamamlandi) continue;
    olaylar.push({ uid: "son-tarih-" + s.id + "@seyir", baslik: "Son tarih: " + s.baslik, tarih: s.tarih, aciklama: s.aciklama || "" });
  }
  for (const g of gorevler) {
    if (g.durum === "bitti" || !g.bitis_tarihi) continue;
    olaylar.push({ uid: "gorev-" + g.id + "@seyir", baslik: "Görev: " + g.baslik, tarih: g.bitis_tarihi, aciklama: g.aciklama || "" });
  }
  return olaylar
    .filter((o) => o.tarih && o.tarih >= bugunTarihi)
    .sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));
}

/* ---------- 4) Klavye kısayolları ----------
   Basılan tuşu bir işe çevirir; tarayıcıya bağlı kısım js/arayuz.js'te.
     Ctrl/Cmd + K  -> arama   (yazı yazarken de çalışır)
     /             -> arama   (yazı alanında değilken)
     Ctrl/Cmd + S  -> kaydet  (açık form)
     ?             -> yardım  (kısayol listesi; yazı alanında değilken)
   Esc ile pencere kapatma tarayıcının kendi davranışıdır (<dialog>). */
const KISAYOLLAR = [
  { tuslar: "Ctrl + K  ya da  /", aciklama: "Her yerde ara" },
  { tuslar: "Ctrl + S", aciklama: "Açık formu kaydet" },
  { tuslar: "Esc", aciklama: "Pencereyi kapat" },
  { tuslar: "?", aciklama: "Bu listeyi göster" },
];

function kisayolBul({ key, ctrlKey = false, metaKey = false, altKey = false, yaziAlaninda = false }) {
  if (altKey) return null;
  const tus = String(key || "").toLocaleLowerCase("tr");
  const kontrol = ctrlKey || metaKey;
  if (kontrol && tus === "k") return "arama";
  if (kontrol && tus === "s") return "kaydet";
  if (kontrol || yaziAlaninda) return null;
  if (tus === "/") return "arama";
  if (tus === "?") return "yardim";
  return null;
}

/* ---------- 5) Genel arama ----------
   aramaDizini: her kaydı { tur, turAdi, ekran, id, baslik, ayrinti, baslikSade, metinSade }
   biçimine çevirir (bir kez; pencere açıkken her tuşta yeniden kurulmaz).
   aramaYap: sorgudaki HER sözcük kaydın metninde geçmeli. Başlığında geçen
   kayıtlar önce gelir. */
const ARAMA_TURLERI = {
  gorev: { ad: "Görev", ekran: "gorevler" },
  son_tarih: { ad: "Son tarih", ekran: "sontarihler" },
  toplanti: { ad: "Toplantı", ekran: "toplantilar" },
  tutanak: { ad: "Tutanak", ekran: "tutanaklar" },
  etkinlik: { ad: "Etkinlik", ekran: "etkinlikler" },
  kisi: { ad: "Kişi", ekran: "kisiler" },
  uye: { ad: "Üye", ekran: "takim" },
};

function aramaDizini({ gorevler = [], sonTarihler = [], toplantilar = [], tutanaklar = [], etkinlikler = [], kisiler = [], uyeler = [] }) {
  const dizin = [];
  const ekle = (tur, id, baslik, ayrinti, parcalar) => {
    dizin.push({
      tur: tur, turAdi: ARAMA_TURLERI[tur].ad, ekran: ARAMA_TURLERI[tur].ekran, id: id,
      baslik: baslik || "(adsız)", ayrinti: ayrinti || "",
      baslikSade: sadelestir(baslik),
      metinSade: sadelestir([baslik, ...parcalar].join(" ")),
    });
  };
  for (const g of gorevler) ekle("gorev", g.id, g.baslik, g.bitis_tarihi || "", [g.aciklama]);
  for (const s of sonTarihler) ekle("son_tarih", s.id, s.baslik, s.tarih, [s.aciklama]);
  for (const t of toplantilar) {
    ekle("toplanti", t.id, t.baslik, [t.tarih, t.yer].filter(Boolean).join(" · "),
      [t.yer, t.notlar, ...(t.gundem || []), ...(t.kararlar || []).map((kr) => kr.metin)]);
  }
  for (const t of tutanaklar) {
    ekle("tutanak", t.id, t.numara || t.alt_baslik || t.toplanti_tarihi, [t.toplanti_tarihi, t.alt_baslik].filter(Boolean).join(" · "),
      [t.alt_baslik, t.sonraki_toplanti, ...(t.katilimcilar || []), ...(t.kararlar || []), ...(t.gorevler || []),
        ...(t.devreden || []).map((d) => d.metin)]);
  }
  for (const e of etkinlikler) ekle("etkinlik", e.id, e.ad, [e.tarih, e.yer].filter(Boolean).join(" · "), [e.yer, e.aciklama]);
  for (const kisi of kisiler) ekle("kisi", kisi.id, kisi.ad, kisi.etiket || "", [kisi.etiket, kisi.aciklama]);
  for (const u of uyeler) ekle("uye", u.id, u.ad, "", []);
  return dizin;
}

function aramaYap(dizin, sorgu, sinir = 30) {
  const sozcukler = sadelestir(sorgu).split(" ").filter(Boolean);
  if (!sozcukler.length) return [];
  return dizin
    .filter((oge) => sozcukler.every((s) => oge.metinSade.includes(s)))
    .map((oge) => ({ oge, puan: sozcukler.every((s) => oge.baslikSade.includes(s)) ? 0 : 1 }))
    .sort((a, b) => a.puan - b.puan) // sort kararlıdır: aynı puanda dizin sırası korunur
    .slice(0, sinir)
    .map(({ oge }) => oge);
}

/* ---------- 6) Baş harf yuvarlağı (görev kartındaki sorumlu) ----------
   "Ece Nur Demir" -> "ED" (ilk ve son ad), "şükrü ışık" -> "ŞI", "Can" -> "C".
   Renk, kişinin kimliğinden hesaplanır: aynı kişi her yerde aynı renkte. */
function basHarfler(ad) {
  const parcalar = String(ad || "").trim().split(/\s+/).filter(Boolean);
  if (!parcalar.length) return "?";
  const ilk = parcalar[0].charAt(0);
  const son = parcalar.length > 1 ? parcalar[parcalar.length - 1].charAt(0) : "";
  return (ilk + son).toLocaleUpperCase("tr");
}

function renkSirasi(metin, adet = 6) {
  return parseInt(kisaOzet(String(metin || "")), 36) % adet;
}

/* ---------- Örnek (demo) modu ----------
   Adreste ?ornek varsa (tanıtım sayfasındaki "Örnek takımla dene" düğmesi) uygulama
   ayar dosyasını yok sayar, giriş istemez ve uydurma bir takımı sekmenin geçici
   deposunda (sessionStorage) açar. Böylece:
   - takımın ortak (Supabase) verisine hiçbir şey yazılmaz,
   - aynı tarayıcıdaki gerçek kayıtlarla karışmaz (ayrı ön ek),
   - sekme kapanınca örnek veri kendiliğinden silinir. */
const ORNEK_ONEKI = "seyir-ornek:";
function ornekModuMu(arama) {
  return new URLSearchParams(arama || "").has("ornek");
}

if (typeof module !== "undefined") {
  module.exports = {
    sadelestir,
    ORNEK_ONEKI, ornekModuMu,
    TASLAK_ONEKI, TASLAK_OMRU_GUN, taslakAnahtari, taslakKaydet, taslakOku, taslakSil,
    sorumluBul,
    icsOlustur, takvimOlaylari, saatCoz,
    KISAYOLLAR, kisayolBul,
    aramaDizini, aramaYap,
    basHarfler, renkSirasi,
  };
}
