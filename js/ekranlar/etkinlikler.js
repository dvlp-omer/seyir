/* ==========================================================================
   EKRAN: Etkinlikler ve faaliyet raporu
   İki görünüm var:
     - Liste: takımın yaptığı etkinliklerin kaydı (ad, tarih, yer, katılımcı
       sayısı, açıklama, takımdan katılanlar)
     - Faaliyet raporu: seçilen tarih aralığındaki etkinliklerden üretilen,
       yazdırılabilir rapor TASLAĞI. Hesap mantik.js > faaliyetOzeti'nde.
   Rapor resmi bir şablonun kopyası değildir; özgün, sade bir düzendir.
   ========================================================================== */

let faaliyetRaporuAcik = false;

// Raporun tarih aralığı. İlk açılışta "son 90 gün" olarak doldurulur.
const raporAraligi = { baslangic: "", bitis: "" };

function etkinlikFormu(etkinlik, uyeler) {
  formAc({
    baslik: etkinlik ? "Etkinliği düzenle" : "Yeni etkinlik",
    alanlar: [
      { ad: "ad", etiket: "Etkinlik adı", tur: "metin", zorunlu: true, ipucu: "Örn: Lise tanıtım ziyareti" },
      { ad: "tarih", etiket: "Tarih", tur: "tarih", zorunlu: true },
      { ad: "yer", etiket: "Yer", tur: "metin" },
      { ad: "katilimci_sayisi", etiket: "Katılımcı sayısı", tur: "sayi", ipucu: "Etkinliğe gelen toplam kişi (ziyaretçiler dahil). Bilinmiyorsa boş bırak." },
      {
        ad: "katilimci_idler", etiket: "Takımdan katılanlar (yoklama)", tur: "coklu", secenekler: uyeSecenekleri(uyeler),
        ipucu: "Yoklama almak istemiyorsan hepsini boş bırak; etkinlik katılım yüzdesine sayılmaz.",
      },
      { ad: "aciklama", etiket: "Açıklama", tur: "uzun", ipucu: "Ne yapıldı, sonuç ne oldu? Faaliyet raporunda aynen görünür." },
    ],
    degerler: etkinlik || { tarih: bugun(), katilimci_idler: [] },
    kaydet: async (degerler) => {
      if (etkinlik) {
        await durum.depo.guncelle("etkinlikler", etkinlik.id, degerler);
      } else {
        await durum.depo.ekle("etkinlikler", { ...degerler, takim_id: durum.takim.id });
      }
    },
  });
}

/* ---------- Liste görünümü ---------- */

function etkinlikSatiriHtml(etkinlik) {
  const ayrinti = [
    tarihYaz(etkinlik.tarih),
    etkinlik.yer,
    etkinlik.katilimci_sayisi ? etkinlik.katilimci_sayisi + " katılımcı" : "",
    (etkinlik.katilimci_idler || []).length ? "takımdan " + etkinlik.katilimci_idler.length + " kişi" : "",
  ].filter((p) => p).join(" · ");

  return '<li class="tarih-satir">' +
    gunKutusuHtml(etkinlik.tarih) +
    '<div class="tarih-bilgi">' +
    "<h4>" + htmlKacis(etkinlik.ad) + "</h4>" +
    "<p>" + htmlKacis(ayrinti) + "</p>" +
    (etkinlik.aciklama ? "<p>" + htmlKacis(etkinlik.aciklama) + "</p>" : "") +
    "</div>" +
    '<div class="satir-dugmeler">' +
    kayitDugmesi("duzenle", etkinlik.id, "Düzenle", etkinlik.ad) +
    kayitDugmesi("sil", etkinlik.id, "Sil", etkinlik.ad, "tehlike") +
    "</div></li>";
}

function etkinlikListesiCiz(kok, etkinlikler, uyeler) {
  const sirali = tariheGoreSirala(etkinlikler, "tarih").reverse(); // en yeni üstte

  kok.innerHTML =
    '<div class="arac-cubugu">' +
    '<button class="dugme" data-eylem="rapor"' + (sirali.length ? "" : " disabled") + ">Faaliyet raporu</button>" +
    '<span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="ekle">+ Yeni etkinlik</button></div>' +
    (sirali.length
      ? '<ul class="tarih-liste">' + sirali.map(etkinlikSatiriHtml).join("") + "</ul>"
      : '<div class="bos"><h3>Kayıtlı etkinlik yok</h3>Tanıtım, ziyaret, test günü gibi etkinlikleri kaydet; dönem sonunda faaliyet raporu taslağı hazır olsun.</div>');

  eylemleriBagla(kok, {
    ekle: () => etkinlikFormu(null, uyeler),
    rapor: () => { faaliyetRaporuAcik = true; return yenile(); },
    duzenle: async (id) => {
      const etkinlik = await durum.depo.oku("etkinlikler", id);
      if (!etkinlik) return yenile();
      etkinlikFormu(etkinlik, uyeler);
    },
    sil: async (id) => {
      const etkinlik = await durum.depo.oku("etkinlikler", id);
      if (!etkinlik) return yenile();
      if (!confirm('"' + etkinlik.ad + '" etkinliği silinsin mi?')) return;
      await durum.depo.sil("etkinlikler", id);
      bildir("Etkinlik silindi");
      await yenile();
    },
  });
}

/* ---------- Faaliyet raporu görünümü ---------- */

function faaliyetRaporuCiz(kok, etkinlikler, toplantilar, uyeler) {
  if (!raporAraligi.baslangic && !raporAraligi.bitis) {
    raporAraligi.baslangic = gunEkle(bugun(), -90);
    raporAraligi.bitis = bugun();
  }
  const { baslangic, bitis } = raporAraligi;
  const aralikTers = baslangic && bitis && baslangic > bitis;
  const ozet = faaliyetOzeti(etkinlikler, toplantilar, baslangic, bitis);
  const kaptanlar = uyeler.filter((u) => u.rol === "kaptan").map((u) => u.ad);

  const donem = (baslangic ? tarihYaz(baslangic, false) : "Başlangıçtan") + " – " + (bitis ? tarihYaz(bitis, false) : "bugüne");

  const tabloSatirlari = ozet.etkinlikler.map((e, sira) =>
    '<tr><td class="sayi-hucre">' + (sira + 1) + "</td>" +
    "<td>" + tarihYaz(e.tarih, false) + "</td>" +
    "<td>" + htmlKacis(e.ad) + "</td>" +
    "<td>" + (htmlKacis(e.yer) || "—") + "</td>" +
    '<td class="sayi-hucre">' + (e.katilimci_sayisi ? e.katilimci_sayisi : "—") + "</td></tr>"
  ).join("");

  const ayrintilar = ozet.etkinlikler.map((e) => {
    const takimdan = (e.katilimci_idler || []).map((id) => uyeAdi(uyeler, id)).filter((ad) => ad);
    return "<h4>" + htmlKacis(e.ad) + "</h4>" +
      '<p class="soluk kucuk-yazi">' + htmlKacis([tarihYaz(e.tarih), e.yer].filter((p) => p).join(" · ")) + "</p>" +
      (e.aciklama ? '<p class="notlar">' + htmlKacis(e.aciklama) + "</p>" : '<p class="soluk">Açıklama girilmedi.</p>') +
      (takimdan.length ? '<p class="kucuk-yazi"><b>Takımdan katılanlar:</b> ' + htmlKacis(takimdan.join(", ")) + "</p>" : "");
  }).join("");

  let govde;
  if (aralikTers) {
    govde = '<p class="hata-kutusu" role="alert">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>';
  } else if (ozet.etkinlik_sayisi === 0) {
    govde = '<p class="soluk" style="margin-top:18px">Bu tarih aralığında kayıtlı etkinlik yok. Aralığı genişletmeyi dene.</p>';
  } else {
    govde =
      "<h3>Etkinlik listesi</h3>" +
      '<div class="tablo-sarici"><table class="tablo"><thead><tr><th>#</th><th>Tarih</th><th>Etkinlik</th><th>Yer</th><th>Katılımcı</th></tr></thead>' +
      "<tbody>" + tabloSatirlari + "</tbody></table></div>" +
      "<h3>Etkinlik ayrıntıları</h3>" + ayrintilar +
      '<div class="imzalar">' +
      '<div class="imza"><b>&nbsp;</b>Hazırlayan</div>' +
      '<div class="imza"><b>' + (htmlKacis(kaptanlar.join(", ")) || "&nbsp;") + "</b>Takım kaptanı</div>" +
      "</div>";
  }

  kok.innerHTML =
    '<div class="arac-cubugu yazdirma">' +
    '<button class="dugme" data-eylem="geri">← Etkinlikler</button>' +
    '<label>Başlangıç <input type="date" id="rapor-baslangic" value="' + htmlKacis(baslangic) + '" min="' + EN_ERKEN_TARIH + '" max="' + EN_GEC_TARIH + '"></label>' +
    '<label>Bitiş <input type="date" id="rapor-bitis" value="' + htmlKacis(bitis) + '" min="' + EN_ERKEN_TARIH + '" max="' + EN_GEC_TARIH + '"></label>' +
    '<span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="yazdir"' + (aralikTers || ozet.etkinlik_sayisi === 0 ? " disabled" : "") + ">Yazdır / PDF</button>" +
    "</div>" +

    '<article class="tutanak">' +
    '<header class="tutanak-ust">' +
    '<div><div class="takim-adi">' + htmlKacis(durum.takim.ad) + "</div><h2>Faaliyet Raporu</h2></div>" +
    '<div class="belge">TASLAK<br>' + tarihYaz(bugun(), false) + "</div>" +
    "</header>" +
    '<dl class="tutanak-kunye">' +
    "<dt>Dönem</dt><dd>" + donem + "</dd>" +
    "<dt>Etkinlik</dt><dd>" + ozet.etkinlik_sayisi + "</dd>" +
    "<dt>Katılımcı</dt><dd>" + ozet.toplam_katilimci + " kişi (toplam)</dd>" +
    "<dt>Toplantı</dt><dd>" + ozet.toplanti_sayisi + "</dd>" +
    "</dl>" +
    govde +
    "</article>";

  // Tarih değişince rapor yeniden hesaplanır. Geçersiz/yarım tarih yazılırken
  // (alan boş döner) aralığın o ucu "sınırsız" sayılır.
  sec("#rapor-baslangic").onchange = (olay) => { raporAraligi.baslangic = olay.target.value; yenile(); };
  sec("#rapor-bitis").onchange = (olay) => { raporAraligi.bitis = olay.target.value; yenile(); };

  eylemleriBagla(kok, {
    geri: () => { faaliyetRaporuAcik = false; return yenile(); },
    yazdir: () => belgeYazdir("Faaliyet Raporu - " + durum.takim.ad + " - " + (baslangic || "bas") + "_" + (bitis || "son")),
  });
}

async function etkinliklerEkraniCiz(kok) {
  const [etkinlikler, toplantilar, uyeler] = await Promise.all([
    takimKayitlari("etkinlikler"), takimKayitlari("toplantilar"), takimKayitlari("uyeler"),
  ]);
  if (faaliyetRaporuAcik) {
    faaliyetRaporuCiz(kok, etkinlikler, toplantilar, uyeler);
  } else {
    etkinlikListesiCiz(kok, etkinlikler, uyeler);
  }
}

ekranKaydet("etkinlikler", {
  baslik: "Etkinlikler ve faaliyet raporu",
  kisaAd: "Etkinlik",
  simge: "M5 21V4M5 4h11l-2 4 2 4H5",
  ciz: etkinliklerEkraniCiz,
  sifirla: () => { faaliyetRaporuAcik = false; },
});
