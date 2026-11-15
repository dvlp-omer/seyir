/* ==========================================================================
   MANTIK — saf fonksiyonlar
   --------------------------------------------------------------------------
   Bu dosyadaki fonksiyonlar ekrana ya da depoya DOKUNMAZ: girdi alır, çıktı
   verir. Bu yüzden Node ile kolayca test edilebilirler (testler/ klasörü).

   Tarihler her yerde "YYYY-AA-GG" biçiminde metin olarak tutulur
   (ör. "2026-11-25"). <input type="date"> de bu biçimi verir.
   ========================================================================== */

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

/* ---------- Güvenlik ---------- */

// Kullanıcının yazdığı metni HTML içine koymadan önce zararsız hâle getirir.
// (Biri üye adına <script> yazarsa çalışmasın diye — XSS önlemi.)
function htmlKacis(metin) {
  return String(metin == null ? "" : metin)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Tarih ---------- */

// Date nesnesini "YYYY-AA-GG" metnine çevirir (kullanıcının yerel gününe göre).
function tarihMetni(tarih) {
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, "0");
  const gun = String(tarih.getDate()).padStart(2, "0");
  return yil + "-" + ay + "-" + gun;
}

function bugun() {
  return tarihMetni(new Date());
}

// "YYYY-AA-GG" metnini gün sayısına çevirir. UTC kullanıyoruz ki yaz saati
// gibi kaymalar hesabı bozmasın (her gün tam 24 saat sayılır).
function gunSayisi(tarih) {
  const [yil, ay, gun] = tarih.split("-").map(Number);
  return Math.round(Date.UTC(yil, ay - 1, gun) / 86400000);
}

// Hedef tarihe kaç gün kaldı? Bugünse 0, geçmişse eksi sayı döner.
function kalanGun(hedef, bugunTarihi) {
  return gunSayisi(hedef) - gunSayisi(bugunTarihi);
}

// Kalan gün sayısını okunur metne çevirir.
function kalanGunMetni(gun) {
  if (gun === 0) return "Bugün";
  if (gun === 1) return "Yarın";
  if (gun > 1) return gun + " gün kaldı";
  if (gun === -1) return "1 gün gecikti";
  return Math.abs(gun) + " gün gecikti";
}

// Renk/vurgu için aciliyet sınıfı.
//   gecikti: tarih geçmiş   | yakin: 0-3 gün
//   yaklasiyor: 4-7 gün     | rahat: 7 günden fazla
function aciliyet(gun) {
  if (gun < 0) return "gecikti";
  if (gun <= 3) return "yakin";
  if (gun <= 7) return "yaklasiyor";
  return "rahat";
}

// "2026-11-25" -> "25 Kasım 2026 Çarşamba"
function tarihYaz(tarih, gunAdiyla = true) {
  if (!tarih) return "";
  const [yil, ay, gun] = tarih.split("-").map(Number);
  let sonuc = gun + " " + AYLAR[ay - 1] + " " + yil;
  if (gunAdiyla) {
    sonuc += " " + GUNLER[new Date(Date.UTC(yil, ay - 1, gun)).getUTCDay()];
  }
  return sonuc;
}

// Tarihe gün ekler (eksi sayı geriye götürür). "2026-11-30" + 2 -> "2026-12-02"
function gunEkle(tarih, gun) {
  const [yil, ay, gunu] = tarih.split("-").map(Number);
  // Date, taşan günleri kendisi sonraki aya aktarır.
  return new Date(Date.UTC(yil, ay - 1, gunu + gun)).toISOString().slice(0, 10);
}

// Listeyi verilen tarih alanına göre eskiden yeniye sıralar.
// Tarihi olmayan kayıtlar en sona gider. Asıl listeyi değiştirmez.
function tariheGoreSirala(liste, alan) {
  return [...liste].sort((a, b) => {
    if (!a[alan] && !b[alan]) return 0;
    if (!a[alan]) return 1;
    if (!b[alan]) return -1;
    return a[alan].localeCompare(b[alan]);
  });
}

/* ---------- Görevler ---------- */

const GOREV_DURUMLARI = [
  { deger: "yapilacak", etiket: "Yapılacak" },
  { deger: "yapiliyor", etiket: "Yapılıyor" },
  { deger: "bitti", etiket: "Bitti" },
];

// Bir görev gecikmiş mi? Biten görev asla "gecikmiş" sayılmaz.
function gorevGecikti(gorev, bugunTarihi) {
  return gorev.durum !== "bitti" && !!gorev.bitis_tarihi &&
    kalanGun(gorev.bitis_tarihi, bugunTarihi) < 0;
}

// Özet ekranı için sayılar.
function gorevSayilari(gorevler, bugunTarihi) {
  const sayilar = { yapilacak: 0, yapiliyor: 0, bitti: 0, geciken: 0 };
  for (const gorev of gorevler) {
    if (sayilar[gorev.durum] !== undefined) sayilar[gorev.durum]++;
    if (gorevGecikti(gorev, bugunTarihi)) sayilar.geciken++;
  }
  return sayilar;
}

/* ---------- Toplantı tutanağı ---------- */

// Çok satırlı metni maddelere ayırır. Formda gündem ve kararlar
// "her satıra bir madde" şeklinde yazılır.
// Baştaki "-", "•", "1." gibi işaretleri temizler, boş satırları atar.
function satirlaraAyir(metin) {
  return String(metin || "")
    .split("\n")
    .map((satir) => satir.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").trim())
    .filter((satir) => satir !== "");
}

// Tutanak düzenlenince kararlar yeniden yazılır. Daha önce bir karardan
// görev oluşturulmuşsa (gorev_id), metni aynı kalan kararda bu bağ korunur.
function kararlariBirlestir(yeniSatirlar, eskiKararlar) {
  const kalanEskiler = [...(eskiKararlar || [])];
  return yeniSatirlar.map((metin) => {
    const sira = kalanEskiler.findIndex((karar) => karar.metin === metin);
    if (sira === -1) return { metin: metin, gorev_id: null };
    // Bulduğumuzu listeden çıkar ki aynı eski karar iki kez kullanılmasın.
    return kalanEskiler.splice(sira, 1)[0];
  });
}

/* ---------- Duyuru şablonları (WhatsApp) ----------
   Yapay zekâ yok: düz metin şablonları. WhatsApp'ta *yıldız* arası kalın yazılır.
   Her fonksiyon bir bilgi nesnesi alır, kopyalanmaya hazır metin döner.
   Boş bırakılan alanların satırı metne hiç eklenmez. */

// Numaralı liste: ["a","b"] -> "1. a\n2. b"
function numaraliListe(maddeler) {
  return maddeler.map((madde, sira) => (sira + 1) + ". " + madde).join("\n");
}

// Boş (null / "") parçaları atıp kalanları boş satırla birleştirir.
function bloklariBirlestir(bloklar) {
  return bloklar.filter((blok) => blok).join("\n\n");
}

// Toplantı daveti: { takim, baslik, tarih, saat, yer, gundem: [], not }
function duyuruToplantiDaveti(b) {
  const bilgiSatirlari = [
    b.baslik ? "*Konu:* " + b.baslik : null,
    b.tarih ? "🗓 *Tarih:* " + tarihYaz(b.tarih) : null,
    b.saat ? "🕖 *Saat:* " + b.saat : null,
    b.yer ? "📍 *Yer:* " + b.yer : null,
  ].filter((satir) => satir).join("\n");

  return bloklariBirlestir([
    "📢 *" + b.takim + " — Toplantı Duyurusu*",
    bilgiSatirlari,
    b.gundem && b.gundem.length ? "*Gündem:*\n" + numaraliListe(b.gundem) : null,
    b.not,
    "Katılamayacak olanlar lütfen önceden haber versin.",
  ]);
}

// Toplantı özeti: { takim, baslik, tarih, kararlar: ["..."],
//                   gorevler: [{ baslik, sorumlu, bitis_tarihi }], not }
function duyuruToplantiOzeti(b) {
  const gorevSatirlari = (b.gorevler || []).map((gorev) => {
    let satir = "• " + gorev.baslik + " — " + (gorev.sorumlu || "sorumlu atanmadı");
    if (gorev.bitis_tarihi) satir += " (son: " + tarihYaz(gorev.bitis_tarihi, false) + ")";
    return satir;
  });

  return bloklariBirlestir([
    "📝 *" + b.takim + " — Toplantı Özeti*",
    [b.baslik, b.tarih ? tarihYaz(b.tarih) : null].filter((p) => p).join(" · "),
    b.kararlar && b.kararlar.length ? "*Alınan kararlar:*\n" + numaraliListe(b.kararlar) : null,
    gorevSatirlari.length ? "*Görevler:*\n" + gorevSatirlari.join("\n") : null,
    b.not,
  ]);
}

// Son tarih / etkinlik hatırlatması: { takim, baslik, tarih, bugun, not }
function duyuruHatirlatma(b) {
  let tarihSatiri = null;
  if (b.tarih) {
    tarihSatiri = "🗓 " + tarihYaz(b.tarih);
    if (b.bugun) tarihSatiri += " (" + kalanGunMetni(kalanGun(b.tarih, b.bugun)) + ")";
  }
  return bloklariBirlestir([
    "⏰ *" + b.takim + " — Hatırlatma*",
    ["*" + b.baslik + "*", tarihSatiri].filter((p) => p).join("\n"),
    b.not,
  ]);
}

// Node'da (testlerde) require() ile yüklenebilsin diye. Tarayıcıda atlanır.
if (typeof module !== "undefined") {
  module.exports = {
    htmlKacis, tarihMetni, bugun, kalanGun, kalanGunMetni, aciliyet, tarihYaz, gunEkle,
    tariheGoreSirala, GOREV_DURUMLARI, gorevGecikti, gorevSayilari,
    satirlaraAyir, kararlariBirlestir,
    duyuruToplantiDaveti, duyuruToplantiOzeti, duyuruHatirlatma,
  };
}
