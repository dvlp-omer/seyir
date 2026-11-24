/* ==========================================================================
   KURUM AYARLARI (saf mantık, testli: testler/kurum.test.js)
   Her takım (kurum) kendi adını, türünü, logosunu, ana rengini, tutanak
   bilgilerini ve kapalı sekmelerini seçer. Ayarlar takım kaydının "ayarlar"
   alanında durur (Supabase: takimlar.ayarlar jsonb).

   Kurum türü bir "paket"tir: Öğrenci takımı / kulüp ya da Şirket / ekip.
   Pakete göre sözcükler (Takım ↔ Ekip, Üye ↔ Çalışan) ve varsayılan sekmeler değişir.

   Ayarlar kullanıcıdan ve veritabanından gelir; burada HER ZAMAN temizlenir:
   bilinmeyen alan atılır, bozuk değer varsayılana döner. Ekran kodu yalnızca
   kurumAyarlari()'nın döndürdüğü temiz nesneyle çalışır.
   Tasarım: docs/superpowers/specs/2026-11-24-kurum-ozellestirme-design.md
   ========================================================================== */

const KURUM_TURLERI = [
  { deger: "takim", etiket: "Öğrenci takımı / kulüp" },
  { deger: "sirket", etiket: "Şirket / ekip" },
];

// Bugünkü vurgu rengi (css/stil.css > --vurgu)
const VARSAYILAN_RENK = "#b8451a";
// Logo küçültülmüş hâliyle veritabanına yazılır (data URL). Bu sınır, kaydı şişirmesin diye.
const LOGO_EN_BUYUK = 80 * 1024;

// Uygulamadaki sekmeler (ekranlar). Kapatılabilecekler bu listeden seçilir.
const BILINEN_SEKMELER = ["ozet", "gorevler", "tarihler", "takvim", "toplantilar", "tutanaklar", "etkinlikler",
  "kisiler", "paydaslar", "butce", "malzemeler", "mesajlar", "duyuru", "takim", "ayarlar"];
// Kapatılırsa uygulama kullanılamaz hâle gelir: bunlar hep açık.
const KAPATILAMAZ = ["ozet", "takim", "ayarlar"];

// Paketlere göre sözcükler. İki sözlük AYNI anahtarları taşır (testli).
const SOZLUKLER = {
  takim: {
    takim: "Takım", takimi: "takımı", takimlar: "Takımlar", uye: "Üye", uyeler: "Üyeler",
    kaptan: "Kaptan", kurum: "Takım / kulüp",
    takim_kucuk: "takım", takima: "takıma", takimdaki: "takımdaki", uye_kucuk: "üye", uyeler_kucuk: "üyeler", takim_ve_uyeler: "Takım ve üyeler",
    paydaslar: "Sponsorlar", paydas: "Sponsor", paydas_kucuk: "sponsor",
    malzemeler: "Malzeme", malzeme_kucuk: "malzeme",
  },
  sirket: {
    takim: "Ekip", takimi: "ekibi", takimlar: "Ekipler", uye: "Çalışan", uyeler: "Çalışanlar",
    kaptan: "Yönetici", kurum: "Şirket / ekip",
    takim_kucuk: "ekip", takima: "ekibe", takimdaki: "ekipteki", uye_kucuk: "çalışan", uyeler_kucuk: "çalışanlar", takim_ve_uyeler: "Ekip ve çalışanlar",
    paydaslar: "Müşteriler", paydas: "Müşteri", paydas_kucuk: "müşteri",
    malzemeler: "Envanter", malzeme_kucuk: "envanter kalemi",
  },
};

// Paket seçilince başlangıç ayarları
const PAKET_KAPALI_SEKMELER = { takim: [], sirket: ["etkinlikler"] };

const TUTANAK_ALANLARI = ["kurum", "alt_baslik", "numara_kalibi", "ek_etiket", "alt_bilgi", "sayfa_altligi"];
const TUTANAK_ALAN_SINIRI = 300;
const DEVREDEN_GIRIS = "Önceki toplantılarda alınan ve geçerliliği devam eden kararlar aşağıda sıralanmıştır.";

function metinTemizle(deger, sinir) {
  return typeof deger === "string" ? deger.trim().slice(0, sinir) : "";
}

// Yalnızca küçük, raster (PNG / JPEG / WebP) logo kabul edilir. SVG içinde betik
// olabileceği için alınmaz; dış adres de alınmaz (her şey kayıtta dursun).
function logoTemizle(logo) {
  if (typeof logo !== "string" || logo.length > LOGO_EN_BUYUK) return "";
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(logo) ? logo : "";
}

function renkTemizle(renk) {
  return typeof renk === "string" && /^#[0-9a-f]{6}$/i.test(renk.trim()) ? renk.trim().toLowerCase() : VARSAYILAN_RENK;
}

function kapaliSekmeleriTemizle(liste) {
  if (!Array.isArray(liste)) return [];
  return [...new Set(liste.filter((ad) => BILINEN_SEKMELER.includes(ad) && !KAPATILAMAZ.includes(ad)))];
}

// Takım kaydından temiz kurum ayarlarını çıkarır. Ayarı olmayan (eski) takım varsayılanlarla gelir.
function kurumAyarlari(takim) {
  const ham = (takim && takim.ayarlar && typeof takim.ayarlar === "object" && !Array.isArray(takim.ayarlar)) ? takim.ayarlar : {};
  const tur = KURUM_TURLERI.some((t) => t.deger === ham.tur) ? ham.tur : "takim";
  const hamTutanak = ham.tutanak && typeof ham.tutanak === "object" ? ham.tutanak : {};
  const tutanak = {};
  for (const alan of TUTANAK_ALANLARI) tutanak[alan] = metinTemizle(hamTutanak[alan], TUTANAK_ALAN_SINIRI);
  return {
    tur,
    logo: logoTemizle(ham.logo),
    renk: renkTemizle(ham.renk),
    tutanak,
    kapali_sekmeler: kapaliSekmeleriTemizle(ham.kapali_sekmeler),
  };
}

// Yeni kurum ya da paket değişince başlangıç ayarları
function paketVarsayilani(tur) {
  return kurumAyarlari({ ayarlar: { tur, kapali_sekmeler: PAKET_KAPALI_SEKMELER[tur] || [] } });
}

// Ayar formundan gelen değişikliği eski ayarlarla birleştirir ve temizler.
// Tür (paket) değişince kapalı sekmeler yeni paketin varsayılanına döner (açıkça verilmediyse).
function kurumAyarlariniBirlestir(eski, degisiklik) {
  const once = kurumAyarlari({ ayarlar: eski });
  const d = degisiklik || {};
  const birlesik = { ...once, ...d, tutanak: { ...once.tutanak, ...(d.tutanak || {}) } };
  if (d.tur && d.tur !== once.tur && !("kapali_sekmeler" in d)) {
    birlesik.kapali_sekmeler = PAKET_KAPALI_SEKMELER[d.tur] || [];
  }
  return kurumAyarlari({ ayarlar: birlesik });
}

// Yüklenen logonun küçültülmüş ölçüsü: oran korunur, "sinir"a sığar, küçük resim büyütülmez.
function logoOlcusu(en, boy, sinir) {
  if (!(en > 0 && boy > 0)) return { en: 1, boy: 1 };
  const oran = Math.min(1, sinir / Math.max(en, boy));
  return { en: Math.max(1, Math.round(en * oran)), boy: Math.max(1, Math.round(boy * oran)) };
}

// Pakete göre sözcük: soz(ayarlar, "uye") -> "Üye" ya da "Çalışan". Bilinmeyen anahtar aynen döner.
function soz(ayarlar, anahtar) {
  const sozluk = SOZLUKLER[(ayarlar && ayarlar.tur) || "takim"] || SOZLUKLER.takim;
  return anahtar in sozluk ? sozluk[anahtar] : anahtar;
}

function sekmeAcikMi(ayarlar, ad) {
  return KAPATILAMAZ.includes(ad) || !(ayarlar.kapali_sekmeler || []).includes(ad);
}

function acikSekmeler(ayarlar, adlar) {
  return adlar.filter((ad) => sekmeAcikMi(ayarlar, ad));
}

// Menü grupları: kapalı sekmeler düşer, boşalan grup gizlenir; "sozAnahtari" olan
// grubun başlığı paket sözcüğüyle yazılır (ör. "Takım" grubu şirkette "Ekip").
function menuyuSuz(gruplar, ayarlar) {
  return gruplar
    .map((g) => ({ baslik: g.sozAnahtari ? soz(ayarlar, g.sozAnahtari) : g.baslik, ekranlar: acikSekmeler(ayarlar, g.ekranlar) }))
    .filter((g) => g.ekranlar.length);
}

/* ---------- Renk ----------
   Kurum kendi ana rengini seçer. Düğme yazısı beyazdır; seçilen renk beyaz yazı
   okunur kalana kadar (WCAG 2, en az 4,5) koyulaştırılır. Gri gibi orta tonlarda
   ne beyaz ne koyu yazı yeterli olmadığı için yazı rengini değiştirmek yetmiyor. */
function goreliParlaklik(renk) {
  const [k, y, m] = [1, 3, 5]
    .map((i) => parseInt(renk.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k + 0.7152 * y + 0.0722 * m;
}

function kontrastOrani(a, b) {
  const [acik, koyu] = [goreliParlaklik(a), goreliParlaklik(b)].sort((x, y) => y - x);
  return (acik + 0.05) / (koyu + 0.05);
}

// Rengi oranında koyulaştırır: koyulastir("#ffffff", 0.1) -> "#e6e6e6"
function koyulastir(renk, oran) {
  return "#" + [1, 3, 5].map((i) => Math.round(parseInt(renk.slice(i, i + 2), 16) * (1 - oran))
    .toString(16).padStart(2, "0")).join("");
}

// css/stil.css değişkenleri: --vurgu, --vurgu-koyu (üzerine gelince), --vurgu-yazi
function vurguRenkleri(renk) {
  let vurgu = renkTemizle(renk);
  while (kontrastOrani(vurgu, "#ffffff") < 4.5) vurgu = koyulastir(vurgu, 0.05);
  // Siyaha çok yakın renk daha fazla koyulaşamaz; üzerine gelince biraz açılır (beyaz yazı yine okunur)
  const koyu = koyulastir(vurgu, 0.16);
  const vurgu_koyu = koyu !== vurgu ? koyu
    : "#" + [1, 3, 5].map((i) => Math.round(parseInt(vurgu.slice(i, i + 2), 16) + 0x2a).toString(16).padStart(2, "0")).join("");
  return { vurgu, vurgu_koyu, vurgu_yazi: "#ffffff" };
}

/* ---------- Tutanak ----------
   İLK tutanağın varsayılanları. Kurum ayarında yazılan geçerlidir; boşsa takım
   adından üretilir. Sonraki tutanaklar bugünkü gibi bir öncekinden kopyalanır
   (js/tutanak.js > yeniTutanakTaslagi), yani var olan numaralandırma etkilenmez. */
function kisaAd(takimAdi) {
  return String(takimAdi || "").toLocaleUpperCase("tr").replace(/[^A-ZÇĞİÖŞÜ0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "TT";
}

function tutanakVarsayilani(ayarlar, takimAdi) {
  const t = (ayarlar && ayarlar.tutanak) || {};
  const ad = String(takimAdi || "").trim() || "Takım";
  return {
    kurum: t.kurum || ad.toLocaleUpperCase("tr"),
    alt_baslik: t.alt_baslik || "Birinci Toplantı",
    numara_kalibi: t.numara_kalibi || kisaAd(ad) + "-{yil}/01",
    ek_etiket: t.ek_etiket || "",
    devreden_giris: DEVREDEN_GIRIS,
    alt_bilgi: t.alt_bilgi || ad + " — Toplantı Tutanağı No. 01",
    sayfa_altligi: t.sayfa_altligi || "Toplantı Tutanağı 01",
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    KURUM_TURLERI, VARSAYILAN_RENK, LOGO_EN_BUYUK, BILINEN_SEKMELER, KAPATILAMAZ, SOZLUKLER,
    kurumAyarlari, kurumAyarlariniBirlestir, logoOlcusu, paketVarsayilani, soz, sekmeAcikMi, acikSekmeler, menuyuSuz,
    kontrastOrani, vurguRenkleri, tutanakVarsayilani,
  };
}
