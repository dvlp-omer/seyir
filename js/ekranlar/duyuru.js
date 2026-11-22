/* ==========================================================================
   EKRAN: Duyuru (WhatsApp metni)
   Kayıtlı bir toplantıdan ya da son tarihten, gruba yapıştırılmaya hazır
   düz metin üretir. Yapay zekâ yok: metin mantik.js'teki şablonlardan gelir.
   Üretilen metin kutuda elle düzeltilebilir, sonra "Kopyala" ile alınır.
   ========================================================================== */

const DUYURU_TURLERI = [
  { deger: "davet", etiket: "Toplantı daveti" },
  { deger: "ozet", etiket: "Toplantı özeti (kararlar ve görevler)" },
  { deger: "hatirlatma", etiket: "Son tarih / etkinlik hatırlatması" },
];

// Ekrandaki seçimler. Başka ekranlar duyuruyaGit() ile önceden doldurabilir.
const duyuruSecimi = { tur: "davet", kaynak_id: "", not: "", link: "" };

// Başka bir ekrandan (tutanak, son tarihler) hazır seçimle bu ekrana gelir.
function duyuruyaGit(tur, kaynakId) {
  duyuruSecimi.tur = tur;
  duyuruSecimi.kaynak_id = kaynakId;
  duyuruSecimi.not = "";
  ekranaGit("duyuru");
}

// Metni panoya kopyalar. Yeni yöntem (navigator.clipboard) çalışmazsa
// — örneğin sayfa file:// ile açıldıysa — eski yönteme düşer.
async function panoyaKopyala(metinKutusu) {
  try {
    await navigator.clipboard.writeText(metinKutusu.value);
  } catch (hata) {
    metinKutusu.select();
    document.execCommand("copy");
  }
}

async function duyuruEkraniCiz(kok) {
  const [toplantilar, sonTarihler, gorevler, uyeler] = await Promise.all([
    takimKayitlari("toplantilar"), takimKayitlari("son_tarihler"),
    takimKayitlari("gorevler"), takimKayitlari("uyeler"),
  ]);

  // Türe göre kaynak listesi: toplantılar (yeniden eskiye) ya da açık son tarihler
  const hatirlatma = duyuruSecimi.tur === "hatirlatma";
  const kaynaklar = hatirlatma
    ? tariheGoreSirala(sonTarihler.filter((k) => !k.tamamlandi), "tarih")
    : tariheGoreSirala(toplantilar, "tarih").reverse();

  // Seçili kaynak listede yoksa ilkini seç
  if (!kaynaklar.some((k) => k.id === duyuruSecimi.kaynak_id)) {
    duyuruSecimi.kaynak_id = kaynaklar.length ? kaynaklar[0].id : "";
  }

  // Seçimlere göre duyuru metnini üretir.
  function metniUret() {
    const kaynak = kaynaklar.find((k) => k.id === duyuruSecimi.kaynak_id);
    if (!kaynak) return "";
    const ortak = { takim: durum.takim.ad, baslik: kaynak.baslik, tarih: kaynak.tarih, not: duyuruSecimi.not };

    if (duyuruSecimi.tur === "davet") {
      return duyuruToplantiDaveti({ ...ortak, saat: kaynak.saat, yer: kaynak.yer, gundem: kaynak.gundem });
    }
    if (duyuruSecimi.tur === "ozet") {
      return duyuruToplantiOzeti({
        ...ortak,
        kararlar: kaynak.kararlar.map((karar) => karar.metin),
        gorevler: gorevler
          .filter((g) => g.toplanti_id === kaynak.id)
          .map((g) => ({ baslik: g.baslik, sorumlu: uyeAdi(uyeler, g.sorumlu_id), bitis_tarihi: g.bitis_tarihi })),
      });
    }
    return duyuruHatirlatma({ ...ortak, bugun: bugun() });
  }
  // Bağlantı alanı doluysa ve metinde yoksa sona eklenir (kisiler.js > baglantiyiEkle).
  const tamMetin = () => baglantiyiEkle(metniUret(), duyuruSecimi.link);

  const kaynakSecenekleri = kaynaklar.map((k) => ({
    deger: k.id, etiket: k.baslik + " — " + tarihYaz(k.tarih, false),
  }));

  kok.innerHTML =
    '<div class="duyuru-izgara">' +
    '<section class="kart"><h3>Ne duyurulacak?</h3>' +
    '<label class="alan"><span>Duyuru türü</span><select id="duyuru-tur">' + secenekHtml(DUYURU_TURLERI, duyuruSecimi.tur) + "</select></label>" +
    (kaynaklar.length
      ? '<label class="alan"><span>' + (hatirlatma ? "Son tarih" : "Toplantı") + '</span><select id="duyuru-kaynak">' +
        secenekHtml(kaynakSecenekleri, duyuruSecimi.kaynak_id) + "</select></label>" +
        '<label class="alan"><span>Ek not</span><textarea id="duyuru-not" maxlength="500" placeholder="İsteğe bağlı; metnin sonuna eklenir.">' +
        htmlKacis(duyuruSecimi.not) + "</textarea></label>" +
        '<label class="alan"><span>Bağlantı</span><input type="text" id="duyuru-link" autocomplete="off" spellcheck="false" maxlength="500" inputmode="url" placeholder="ör. kayıt formu, konum ya da Drive klasörü" value="' +
        htmlKacis(duyuruSecimi.link) + '"><small>İsteğe bağlı; metnin sonuna tıklanabilir olarak eklenir.</small></label>'
      : '<div class="bos">' + (hatirlatma
          ? "Bekleyen son tarih yok. Önce <b>Tarihler</b> ekranından bir tarih ekle."
          : "Kayıtlı toplantı yok. Önce <b>Toplantı</b> ekranından bir toplantı ekle.") + "</div>") +
    "</section>" +

    '<section class="kart"><h3>WhatsApp metni</h3>' +
    '<label class="gizli" for="duyuru-metin">Duyuru metni</label>' +
    '<textarea id="duyuru-metin" class="duyuru-metin" spellcheck="false"></textarea>' +
    (kaynaklar.length ? '<h3 class="medya-baslik">Fotoğraf / video</h3>' + medyaAlaniHtml("duyuru") : "") +
    '<div class="arac-cubugu" style="margin:12px 0 0">' +
    '<button class="dugme ana" data-eylem="kopyala"' + (kaynaklar.length ? "" : " disabled") + ">Kopyala</button>" +
    (kaynaklar.length ? '<a class="dugme" id="duyuru-paylas" target="_blank" rel="noopener">WhatsApp&#39;ta paylaş</a>' : "") +
    '<span class="soluk kucuk-yazi">*Yıldız* arasındaki yazı WhatsApp\'ta kalın görünür. Kopyalamadan önce metni burada düzeltebilirsin.</span>' +
    "</div></section>" +
    "</div>";

  const metinKutusu = sec("#duyuru-metin");
  const paylasDugmesi = sec("#duyuru-paylas");
  // Metin kutusu elle düzeltilebilir; paylaş bağlantısı her zaman kutudaki son metni taşır.
  function metniYaz(metin) {
    metinKutusu.value = metin;
    if (paylasDugmesi) paylasDugmesi.href = waPaylasLinki(metin);
  }
  metniYaz(tamMetin());
  metinKutusu.oninput = () => { if (paylasDugmesi) paylasDugmesi.href = waPaylasLinki(metinKutusu.value); };

  // Tür değişince kaynak listesi de değişir -> ekranı baştan çiz.
  sec("#duyuru-tur").onchange = (olay) => {
    duyuruSecimi.tur = olay.target.value;
    duyuruSecimi.kaynak_id = "";
    yenile();
  };
  // Kaynak ya da not değişince sadece metni yenilemek yeterli.
  if (kaynaklar.length) {
    sec("#duyuru-kaynak").onchange = (olay) => {
      duyuruSecimi.kaynak_id = olay.target.value;
      metniYaz(tamMetin());
    };
    sec("#duyuru-not").oninput = (olay) => {
      duyuruSecimi.not = olay.target.value.trim();
      metniYaz(tamMetin());
    };
    sec("#duyuru-link").oninput = (olay) => {
      duyuruSecimi.link = olay.target.value.trim();
      metniYaz(tamMetin());
    };
    medyaAlaniBagla("duyuru", () => metinKutusu.value, paylasDugmesi);
  }

  eylemleriBagla(kok, {
    kopyala: async () => {
      await panoyaKopyala(metinKutusu);
      bildir("Kopyalandı — WhatsApp'a yapıştırabilirsin");
    },
  });
}

ekranKaydet("duyuru", {
  baslik: "Duyuru hazırla",
  kisaAd: "Duyuru",
  simge: "M4 10v4h3l7 4V6l-7 4H4zM17 9a4 4 0 0 1 0 6",
  ciz: duyuruEkraniCiz,
});
