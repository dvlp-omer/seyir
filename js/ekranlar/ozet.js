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
  const [gorevler, sonTarihler, uyeler] = await Promise.all([
    takimKayitlari("gorevler"), takimKayitlari("son_tarihler"), takimKayitlari("uyeler"),
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
    "</div>" +
    '<button class="tumu" data-eylem="git" data-id="gorevler">Görev panosunu aç</button>' +
    "</section>";

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

  kok.innerHTML = '<div class="ozet-izgara">' + oneCikan + gorevKarti + akisKarti + "</div>";

  eylemleriBagla(kok, { git: (ekranAdi) => ekranaGit(ekranAdi) });
}

ekranKaydet("ozet", {
  baslik: "Özet",
  kisaAd: "Özet",
  simge: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12l4-4M12 7v0",
  ciz: ozetEkraniCiz,
});
