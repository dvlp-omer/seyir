/* ==========================================================================
   EKRAN: Özet
   Uygulama açılınca ilk görülen ekran. Üç soruya cevap verir:
     1) En yakın son tarih ne, kaç gün kaldı?
     2) Görevler ne durumda?
     3) Önümüzdeki 7 günde (ve gecikmiş olarak) ne var?
   Yeni veri tutmaz; görevler ve son tarihlerden hesaplar.
   ========================================================================== */

const OZET_GUN_SAYISI = 7;

async function ozetEkraniCiz(kok) {
  const [gorevler, sonTarihler, uyeler, toplantilar, etkinlikler] = await Promise.all([
    takimKayitlari("gorevler"), takimKayitlari("son_tarihler"), takimKayitlari("uyeler"),
    takimKayitlari("toplantilar"), takimKayitlari("etkinlikler"),
  ]);
  const bugunTarihi = bugun();

  /* 1) En yakın (ya da en çok gecikmiş) açık son tarih */
  const acikTarihler = tariheGoreSirala(sonTarihler.filter((k) => !k.tamamlandi), "tarih");
  const ilk = acikTarihler[0];
  let oneCikan;
  if (ilk) {
    const gun = kalanGun(ilk.tarih, bugunTarihi);
    oneCikan =
      '<section class="one-cikan ' + (gun < 0 ? "gecikti" : "") + '">' +
      '<div class="buyuk-sayi">' + Math.abs(gun) + "</div>" +
      "<div>" +
      '<div class="etiket">' + (gun < 0 ? "gün gecikti" : gun === 0 ? "gün — bugün!" : "gün kaldı") + "</div>" +
      "<h2>" + htmlKacis(ilk.baslik) + "</h2>" +
      "<div>" + tarihYaz(ilk.tarih) + "</div>" +
      "</div></section>";
  } else {
    oneCikan =
      '<section class="one-cikan"><div>' +
      '<div class="etiket">Son tarihler</div><h2>Bekleyen son tarih yok</h2>' +
      "<div>Rapor, izin ya da etkinlik tarihi ekleyince geri sayım burada görünür.</div>" +
      "</div></section>";
  }

  /* 2) Görev sayıları */
  const sayilar = gorevSayilari(gorevler, bugunTarihi);
  const gorevKarti =
    '<section class="kart"><h3>Görevler</h3>' +
    '<div class="sayi-kutulari">' +
    '<div class="sayi-kutu"><b>' + sayilar.yapilacak + "</b><span>Yapılacak</span></div>" +
    '<div class="sayi-kutu"><b>' + sayilar.yapiliyor + "</b><span>Yapılıyor</span></div>" +
    '<div class="sayi-kutu"><b>' + sayilar.bitti + "</b><span>Bitti</span></div>" +
    '<div class="sayi-kutu ' + (sayilar.geciken ? "uyari" : "") + '"><b>' + sayilar.geciken + "</b><span>Geciken</span></div>" +
    "</div>" + ilerlemeHtml(sayilar) +
    '<button class="baglanti-dugme" data-eylem="git" data-id="gorevler">Görev panosunu aç</button>' +
    "</section>";

  /* 2b) Sıradaki toplantı ve etkinlikler */
  const bulusmalar = siradakiBulusmalar(toplantilar, etkinlikler, bugunTarihi);
  const bulusmaKarti =
    '<section class="kart"><h3>Sıradaki buluşmalar</h3>' +
    (bulusmalar.length
      ? '<ul class="bulusma-liste">' + bulusmalar.map((b, sira) =>
          '<li><button type="button" class="bulusma" data-eylem="bulusma" data-id="' + sira + '">' +
          gunKutusuHtml(b.tarih) +
          '<span class="ne">' + htmlKacis(b.baslik) +
          "<small>" + htmlKacis([b.tur === "toplanti" ? "Toplantı" : "Etkinlik", b.saat, b.yer].filter(Boolean).join(" · ")) + "</small></span>" +
          kalanRozet(b.tarih) + "</button></li>").join("") + "</ul>"
      : '<p class="soluk">Yaklaşan toplantı ya da etkinlik yok.</p>' +
        '<button class="baglanti-dugme" data-eylem="git" data-id="toplantilar">Toplantı ekle</button>') +
    "</section>";

  /* 2c) Kimde ne var: üye başına açık görev (iş dağılımı bir bakışta) */
  const yukler = uyeYukleri(uyeler, gorevler, bugunTarihi);
  const enCok = Math.max(1, ...yukler.map((y) => y.acik));
  const yukKarti = yukler.length
    ? '<section class="kart"><h3>Kimde ne var</h3><ul class="yuk-liste">' + yukler.map((y) =>
        '<li><button type="button" class="yuk" data-eylem="kisinin-gorevleri" data-id="' + htmlKacis(y.uye_id) + '" aria-label="' +
        htmlKacis(y.ad + ": " + y.acik + " açık görev" + (y.geciken ? ", " + y.geciken + " gecikmiş" : "") + ". Görevlerini göster") + '">' +
        '<span class="avatar r' + (renkSirasi(y.uye_id) + 1) + '" aria-hidden="true">' + htmlKacis(basHarfler(y.ad)) + "</span>" +
        '<span class="yuk-ad">' + htmlKacis(y.ad) + "</span>" +
        '<span class="yuk-cubuk" aria-hidden="true"><span style="width:' + Math.round((y.acik / enCok) * 100) + '%"></span></span>' +
        '<span class="yuk-sayi">' + y.acik + (y.geciken ? ' <span class="rozet gecikti">' + y.geciken + " gecikmiş</span>" : "") + "</span>" +
        "</button></li>").join("") + "</ul>" +
      '<p class="soluk kucuk-yazi">Açık (bitmemiş) görev sayısı. Birine basınca yalnızca onun görevleri gösterilir.</p></section>'
    : "";

  /* 3) Önümüzdeki günler: açık görevler + açık son tarihler tek listede */
  const sinir = gunEkle(bugunTarihi, OZET_GUN_SAYISI);
  const akis = [
    ...gorevler
      .filter((g) => g.durum !== "bitti" && g.bitis_tarihi)
      .map((g) => ({ tarih: g.bitis_tarihi, baslik: g.baslik, alt: "Görev · " + (uyeAdi(uyeler, g.sorumlu_id) || "sorumlu yok") })),
    ...acikTarihler
      .map((k) => ({ tarih: k.tarih, baslik: k.baslik, alt: "Son tarih · " + tarihTuruEtiketi(k.tur) })),
  ].filter((oge) => oge.tarih <= sinir); // "YYYY-AA-GG" metinleri alfabetik karşılaştırılabilir

  const akisKarti =
    '<section class="kart"><h3>Gecikenler ve önümüzdeki ' + OZET_GUN_SAYISI + " gün</h3>" +
    (akis.length
      ? '<ul class="akis">' + tariheGoreSirala(akis, "tarih").map((oge) =>
          "<li>" + kalanRozet(oge.tarih) +
          '<span class="ne">' + htmlKacis(oge.baslik) + "<small>" + htmlKacis(oge.alt) + "</small></span></li>"
        ).join("") + "</ul>"
      : '<p class="soluk">Bu hafta için bekleyen bir şey yok.</p>') +
    "</section>";

  /* Yeni takımda her şey sıfır görünür; kullanıcıya sıradaki adımı göster
     (RAPOR.md > B1). Üye eklenince bu kutu kendiliğinden kaybolur. */
  const baslarken = uyeler.length === 0
    ? '<div class="bilgi-kutusu genis"><b>Başlarken:</b> önce takım üyelerini ekle; sonra görev, son tarih ve toplantı girebilirsin.<br>' +
      '<button class="dugme kucuk" data-eylem="git" data-id="takim">Üye ekle</button>' +
      '<button class="dugme kucuk" data-eylem="git" data-id="tarihler">Son tarih ekle</button></div>'
    : "";

  kok.innerHTML = '<div class="ozet-izgara">' + baslarken + oneCikan +
    '<div class="ozet-sutun">' + gorevKarti + yukKarti + "</div>" +
    '<div class="ozet-sutun">' + akisKarti + bulusmaKarti + "</div></div>";

  eylemleriBagla(kok, {
    git: (ekranAdi) => ekranaGit(ekranAdi),
    bulusma: (sira) => {
      const b = bulusmalar[Number(sira)];
      if (!b) return;
      if (b.tur === "toplanti") acikToplantiId = b.id; // doğrudan o toplantıyı aç
      ekranaGit(b.tur === "toplanti" ? "toplantilar" : "etkinlikler");
    },
    "kisinin-gorevleri": (uyeId) => {
      gorevSorumluFiltresi = uyeId; // görev panosu bu kişiye göre süzülü açılır
      ekranaGit("gorevler");
    },
  });
}

// "7 / 12 görev bitti · %58" ve ilerleme çubuğu
function ilerlemeHtml(sayilar) {
  const toplam = sayilar.yapilacak + sayilar.yapiliyor + sayilar.bitti;
  if (!toplam) return "";
  const yuzde = Math.round((sayilar.bitti / toplam) * 100);
  return '<div class="ilerleme">' +
    '<div class="ilerleme-yazi"><span>İlerleme</span><b>' + sayilar.bitti + " / " + toplam + " görev bitti · %" + yuzde + "</b></div>" +
    '<div class="ilerleme-cubuk" role="progressbar" aria-label="Biten görev oranı" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + yuzde + '">' +
    '<span style="width:' + yuzde + '%"></span></div></div>';
}

ekranKaydet("ozet", {
  baslik: "Özet",
  kisaAd: "Özet",
  simge: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  ciz: ozetEkraniCiz,
});
