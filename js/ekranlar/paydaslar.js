/* ==========================================================================
   EKRAN: Sponsorlar (takım paketi) / Müşteriler (şirket paketi)
   Bir kurumla ilişkiyi aşama aşama takip eder: Aday → İletişimde → Görüşme →
   Anlaşıldı / Olmadı. Üstte özet (anlaşılan ve süreçteki tutar), sonra yaklaşan
   adımlar, sonra aşamalara göre liste. Mantık: js/paydas.js (testli).
   ========================================================================== */

const P = (anahtar) => soz(kurumAyarlari(durum.takim), anahtar);

function paydasFormu(kayit) {
  formAc({
    baslik: kayit ? P("paydas") + " bilgisini düzenle" : "Yeni " + P("paydas_kucuk"),
    alanlar: [
      { ad: "ad", etiket: "Kurum / firma adı", tur: "metin", zorunlu: true },
      { ad: "asama", etiket: "Aşama", tur: "secim", secenekler: ASAMALAR },
      { ad: "tutar", etiket: "Tutar (₺)", tur: "sayi", en: 1000000000, ipucu: "Anlaşılan ya da beklenen destek / sözleşme tutarı. Bilinmiyorsa boş bırak." },
      { ad: "ilgili", etiket: "Görüşülen kişi", tur: "metin" },
      { ad: "iletisim", etiket: "İletişim", tur: "metin", ipucu: "E-posta ya da telefon (isteğe bağlı). Kişisel bilgiyi yalnızca gerekiyorsa yaz." },
      { ad: "sonraki_adim", etiket: "Sonraki adım", tur: "metin", ipucu: "Ör. “Teklif dosyasını gönder”, “Cuma günü ara”" },
      { ad: "sonraki_tarih", etiket: "Sonraki adımın tarihi", tur: "tarih" },
      { ad: "notlar", etiket: "Not", tur: "uzun" },
    ],
    degerler: kayit || { asama: "aday" },
    kaydet: async (degerler) => {
      if (kayit) await durum.depo.guncelle("paydaslar", kayit.id, degerler);
      else await durum.depo.ekle("paydaslar", { ...degerler, takim_id: durum.takim.id });
    },
  });
}

function paydasSatiriHtml(k) {
  return '<li class="paydas-satir">' +
    '<span class="rozet asama-' + htmlKacis(k.asama) + '">' + asamaEtiketi(k.asama) + "</span>" +
    '<div class="paydas-bilgi"><h4>' + htmlKacis(k.ad) + "</h4>" +
    "<p>" + [k.ilgili, k.iletisim].filter(Boolean).map(htmlKacis).join(" · ") + "</p>" +
    (k.sonraki_adim || k.sonraki_tarih
      ? '<p class="soluk kucuk-yazi">Sonraki: ' + htmlKacis(k.sonraki_adim || "—") + (k.sonraki_tarih ? " · " + tarihYaz(k.sonraki_tarih, false) : "") + "</p>"
      : "") +
    "</div>" +
    '<b class="paydas-tutar">' + tutarYaz(k.tutar) + "</b>" +
    '<div class="satir-dugmeler">' +
    kayitDugmesi("duzenle", k.id, "Düzenle", k.ad) +
    kayitDugmesi("sil", k.id, "Sil", k.ad, "tehlike") +
    "</div></li>";
}

async function paydaslarEkraniCiz(kok) {
  const kayitlar = paydaslariSirala(await takimKayitlari("paydaslar"));
  const ozet = paydasOzeti(kayitlar);
  const adimlar = yaklasanAdimlar(kayitlar, bugun()).slice(0, 5);

  const kutu = (deger, etiket) => '<div class="sayi-kutu"><b>' + deger + "</b><span>" + etiket + "</span></div>";
  const ozetHtml = '<div class="paydas-ozet">' +
    kutu(tutarYaz(ozet.anlasilan), "anlaşılan (" + ozet.sayilar.anlasildi + ")") +
    kutu(tutarYaz(ozet.surecte), "süreçte (" + (ozet.sayilar.aday + ozet.sayilar.iletisimde + ozet.sayilar.gorusme) + ")") +
    kutu(String(ozet.sayilar.gorusme), "görüşme aşamasında") +
    "</div>";

  const adimHtml = adimlar.length
    ? '<section class="kart"><h3>Yaklaşan adımlar</h3><ul class="adim-liste">' + adimlar.map((a) =>
        "<li" + (a.gecikti ? ' class="gecikti"' : "") + "><b>" + tarihYaz(a.sonraki_tarih, false) + "</b> " +
        htmlKacis(a.ad) + " — " + htmlKacis(a.sonraki_adim || "sonraki adım") + (a.gecikti ? ' <span class="rozet gecikti">gecikti</span>' : "") +
        "</li>").join("") + "</ul></section>"
    : "";

  kok.innerHTML =
    '<div class="arac-cubugu"><span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="ekle">+ Yeni ' + htmlKacis(P("paydas_kucuk")) + "</button></div>" +
    (kayitlar.length
      ? ozetHtml + adimHtml + '<ul class="paydas-liste">' + kayitlar.map(paydasSatiriHtml).join("") + "</ul>"
      : '<div class="bos"><h3>Henüz ' + htmlKacis(P("paydas_kucuk")) + " yok</h3>" +
        "Görüştüğün ya da görüşmek istediğin kurumları ekle; aşamasını, tutarını ve sonraki adımı burada takip et.</div>");

  eylemleriBagla(kok, {
    ekle: () => paydasFormu(null),
    duzenle: async (id) => {
      const kayit = await durum.depo.oku("paydaslar", id);
      if (!kayit) return yenile();
      paydasFormu(kayit);
    },
    sil: async (id) => {
      const kayit = await durum.depo.oku("paydaslar", id);
      if (!kayit) return yenile();
      if (!confirm('"' + kayit.ad + '" silinsin mi?')) return;
      await durum.depo.sil("paydaslar", id);
      bildir(P("paydas") + " silindi");
      await yenile();
    },
  });
}

// Başlık ve menü adı pakete göre: Sponsorlar / Müşteriler
ekranKaydet("paydaslar", {
  baslik: () => P("paydaslar"),
  kisaAd: () => P("paydaslar"),
  simge: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6",
  ciz: paydaslarEkraniCiz,
});
