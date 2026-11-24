/* ==========================================================================
   ROLLER VE YETKİLER (saf mantık, testli: testler/yetki.test.js)
   Her rol, her sekme için bir seviye taşır:
     gizli    : sekme görünmez, verisi okunamaz
     gorur    : okunur ama kaydedilemez
     duzenler : okunur ve değiştirilir
   Takımda bir "temel" rol vardır (Üye / Çalışan): herkes onu alır. Kişiye
   atanan roller bunun üstüne eklenir; bir sekme için EN GENİŞ yetki geçerlidir.
   Yönetici (takımı kuran, kurulum yöneticisi ya da yönetici yapılan) her şeyi düzenler.
   Takımda roller henüz kurulmadıysa herkes her şeyi düzenler (eski davranış).

   ASIL DENETİM VERİTABANINDADIR (supabase/schema.sql > 8. bölüm, aynı kurallar).
   Bu dosya ekranın ne göstereceğini ve hazır rolleri belirler; ekranda bir
   düğmeyi gizlemek güvenlik değildir, veritabanı izin vermezse kayıt olmaz.
   Tasarım: docs/superpowers/specs/2026-11-24-kurum-ozellestirme-design.md
   ========================================================================== */

const YETKI_DUZEYLERI = ["gizli", "gorur", "duzenler"];
const YETKI_ETIKETLERI = { gizli: "Gizli", gorur: "Görür", duzenler: "Düzenler" };

// Yetkiye bağlı sekmeler (Özet ve Ayarlar hep açık: herkes görür, kendi içinde ayrıca denetlenir)
const YETKI_SEKMELERI = ["gorevler", "tarihler", "takvim", "toplantilar", "tutanaklar", "etkinlikler",
  "kisiler", "mesajlar", "duyuru", "takim"];
const HEP_ACIK = ["ozet", "ayarlar"];

// Veritabanı tablosu -> o tabloyu yöneten sekme (SQL'deki eşlemeyle aynı; testli).
// Takvim ve Duyuru kendi tablosu olmayan sekmelerdir: yalnızca menüde görünürlüğü belirler.
const TABLO_SEKMESI = {
  uyeler: "takim", gorevler: "gorevler", son_tarihler: "tarihler", toplantilar: "toplantilar",
  etkinlikler: "etkinlikler", tutanaklar: "tutanaklar", kisiler: "kisiler", sablonlar: "mesajlar", kampanyalar: "mesajlar",
};

function yetkileriTemizle(yetkiler) {
  const temiz = {};
  if (!yetkiler || typeof yetkiler !== "object" || Array.isArray(yetkiler)) return temiz;
  for (const sekme of YETKI_SEKMELERI) {
    if (YETKI_DUZEYLERI.includes(yetkiler[sekme])) temiz[sekme] = yetkiler[sekme];
  }
  return temiz;
}

// Rollerin bir sekme için verdiği en geniş seviye (yazılmayan sekme: gizli)
function enGenisSeviye(roller, sekme) {
  let en = 0;
  for (const rol of roller) en = Math.max(en, YETKI_DUZEYLERI.indexOf(yetkileriTemizle(rol.yetkiler)[sekme] || "gizli"));
  return YETKI_DUZEYLERI[en];
}

/* Bir hesabın takımdaki yetkileri.
   uyelik: { yonetici, rolIdleri }  roller: takımın bütün rolleri (temel dahil)
   Dönüş:  { yonetici, rollerKurulu, sekmeler: { ekran: seviye } } */
function yetkilerimiHesapla(uyelik, roller) {
  const temel = roller.filter((r) => r.temel);
  const rollerKurulu = temel.length > 0;
  const herSeyi = Boolean(uyelik && uyelik.yonetici) || !rollerKurulu;
  const benim = [...temel, ...roller.filter((r) => !r.temel && ((uyelik && uyelik.rolIdleri) || []).includes(r.id))];
  const sekmeler = {};
  for (const sekme of YETKI_SEKMELERI) sekmeler[sekme] = herSeyi ? "duzenler" : enGenisSeviye(benim, sekme);
  for (const sekme of HEP_ACIK) sekmeler[sekme] = herSeyi ? "duzenler" : "gorur";
  return { yonetici: Boolean(uyelik && uyelik.yonetici), rollerKurulu, sekmeler };
}

// Sekme bu hesaba görünür mü? Yetki bilgisi yoksa (yerel kullanım) ya da sekme yetkiye bağlı değilse: evet.
function sekmeGorunurMu(yetki, sekme) {
  if (!yetki || !yetki.sekmeler || HEP_ACIK.includes(sekme) || !YETKI_SEKMELERI.includes(sekme)) return true;
  return yetki.sekmeler[sekme] !== "gizli";
}

// Menü gruplarından gizli sekmeleri çıkarır; boşalan grup gizlenir (kurumun kapattıkları js/kurum.js > menuyuSuz).
function menuyuYetkiyleSuz(gruplar, yetki) {
  return gruplar
    .map((g) => ({ ...g, ekranlar: g.ekranlar.filter((ad) => sekmeGorunurMu(yetki, ad)) }))
    .filter((g) => g.ekranlar.length);
}

// Veritabanı "yetkin yok" dedi mi? (satır kuralı, sütun izni ya da yönetim fonksiyonları)
function yetkiHatasiMi(mesaj) {
  return /row-level security|42501|permission denied|YETKI_YOK/i.test(String(mesaj || ""));
}

// Bütün sekmelere aynı seviye
function hepsi(seviye, istisnalar = {}) {
  const yetkiler = {};
  for (const sekme of YETKI_SEKMELERI) yetkiler[sekme] = seviye;
  return { ...yetkiler, ...istisnalar };
}

/* Panelde "Hazır rollerle başla" denince kurulan roller. Temel rol herkesin
   aldığıdır: her şeyi görür, ama kişi rehberi ve mesajlar (telefon numaraları) gizlidir. */
function hazirRoller(tur) {
  const sirket = tur === "sirket";
  return [
    { ad: sirket ? "Çalışan" : "Üye", temel: true, yetkiler: hepsi("gorur", { kisiler: "gizli", mesajlar: "gizli" }) },
    { ad: sirket ? "Proje sorumlusu" : "Görev sorumlusu", temel: false,
      yetkiler: { gorevler: "duzenler", tarihler: "duzenler", takvim: "gorur" } },
    { ad: sirket ? "Toplantı sorumlusu" : "Tutanak sorumlusu", temel: false,
      yetkiler: { toplantilar: "duzenler", tutanaklar: "duzenler", etkinlikler: "duzenler" } },
    { ad: sirket ? "İletişim sorumlusu" : "İletişim sorumlusu", temel: false,
      yetkiler: { kisiler: "duzenler", mesajlar: "duzenler", duyuru: "duzenler" } },
  ];
}

if (typeof module !== "undefined") {
  module.exports = {
    YETKI_DUZEYLERI, YETKI_ETIKETLERI, YETKI_SEKMELERI, HEP_ACIK, TABLO_SEKMESI,
    yetkileriTemizle, enGenisSeviye, yetkilerimiHesapla, hazirRoller, sekmeGorunurMu, menuyuYetkiyleSuz, yetkiHatasiMi,
  };
}
