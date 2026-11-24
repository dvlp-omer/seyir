/* ==========================================================================
   EKRAN: Malzeme (takım paketi) / Envanter (şirket paketi)
   Parçanın durumu (İhtiyaç → Sipariş → Yolda → Geldi → Kullanımda / Arızalı),
   kimde ve nerede olduğu, ne zaman geleceği. "İlerlet" bir sonraki duruma
   geçirir; alınan malzeme "Bütçeye ekle" ile gider olur. Mantık: js/malzeme.js.
   ========================================================================== */

const malzemeEkrani = { suzgec: "" };
const MZ = (anahtar) => soz(kurumAyarlari(durum.takim), anahtar);
const SONRAKI_DURUM = { lazim: "siparis", siparis: "yolda", yolda: "geldi", geldi: "kullanimda" };

function malzemeFormu(kayit, uyeler) {
  formAc({
    baslik: kayit ? "Düzenle: " + kayit.ad : "Yeni " + MZ("malzeme_kucuk"),
    alanlar: [
      { ad: "ad", etiket: "Ad", tur: "metin", zorunlu: true, ipucu: "Ör. “İtici motor”, “Basınç sensörü”" },
      { ad: "adet", etiket: "Adet", tur: "sayi" },
      { ad: "birim_fiyat", etiket: "Birim fiyat (₺)", tur: "sayi", en: 1000000000 },
      { ad: "durum", etiket: "Durum", tur: "secim", secenekler: MALZEME_DURUMLARI },
      { ad: "tedarikci", etiket: "Tedarikçi", tur: "metin" },
      { ad: "sorumlu_id", etiket: "Kimde", tur: "secim", secenekler: [{ deger: "", etiket: "—" }, ...uyeler.map((u) => ({ deger: u.id, etiket: u.ad }))] },
      { ad: "konum", etiket: "Nerede", tur: "metin", ipucu: "Ör. “Atölye, 2. raf”" },
      { ad: "siparis_tarihi", etiket: "Sipariş tarihi", tur: "tarih" },
      { ad: "beklenen_tarih", etiket: "Beklenen teslim", tur: "tarih" },
      { ad: "aciklama", etiket: "Not", tur: "uzun" },
    ],
    degerler: kayit || { adet: 1, durum: "lazim" },
    kaydet: async (degerler) => {
      if (kayit) await durum.depo.guncelle("malzemeler", kayit.id, degerler);
      else await durum.depo.ekle("malzemeler", { ...degerler, takim_id: durum.takim.id });
    },
  });
}

function malzemeSatiriHtml(p, uyeler, butceKalemleri, bugunTarihi) {
  const kimde = (uyeler.find((u) => u.id === p.sorumlu_id) || {}).ad;
  const gecikti = ["siparis", "yolda"].includes(p.durum) && p.beklenen_tarih && p.beklenen_tarih < bugunTarihi;
  const butcede = butceKalemleri && butcedeMiMalzeme(p, butceKalemleri);
  const ayrinti = [
    p.tedarikci, kimde ? "Kimde: " + kimde : "", p.konum ? "Nerede: " + p.konum : "",
    p.beklenen_tarih && ["siparis", "yolda"].includes(p.durum) ? "Gelecek: " + tarihYaz(p.beklenen_tarih, false) : "",
  ].filter(Boolean);
  return '<li class="paydas-satir">' +
    '<span class="rozet malzeme-' + htmlKacis(p.durum) + '">' + durumEtiketi(p.durum) + "</span>" +
    '<div class="paydas-bilgi"><h4>' + htmlKacis(p.ad) + (Number(p.adet) > 1 ? ' <span class="soluk">× ' + Number(p.adet) + "</span>" : "") +
    (gecikti ? ' <span class="rozet gecikti">gecikti</span>' : "") + "</h4>" +
    (ayrinti.length ? '<p class="soluk kucuk-yazi">' + ayrinti.map(htmlKacis).join(" · ") + "</p>" : "") + "</div>" +
    '<b class="paydas-tutar">' + tutarYaz(toplamTutar(p)) + "</b>" +
    '<div class="satir-dugmeler">' +
    (SONRAKI_DURUM[p.durum] ? kayitDugmesi("ilerlet", p.id, "→ " + durumEtiketi(SONRAKI_DURUM[p.durum]), p.ad) : "") +
    (butceKalemleri && butceyeEklenebilirMi(p) && !butcede ? kayitDugmesi("butceye", p.id, "Bütçeye ekle", p.ad) : "") +
    (butcede ? '<span class="soluk kucuk-yazi">bütçede</span>' : "") +
    kayitDugmesi("duzenle", p.id, "Düzenle", p.ad) +
    kayitDugmesi("sil", p.id, "Sil", p.ad, "tehlike") +
    "</div></li>";
}

async function malzemelerEkraniCiz(kok) {
  const butceVar = sekmeAcikMi(kurumAyarlari(durum.takim), "butce") && sekmeGorunurMu(durum.yetki, "butce");
  const [kayitlar, uyeler, butceKalemleri] = await Promise.all([
    takimKayitlari("malzemeler"), takimKayitlari("uyeler"), butceVar ? takimKayitlari("butce_kalemleri") : null,
  ]);
  const hepsi = malzemeleriSirala(kayitlar);
  const gorunen = malzemeEkrani.suzgec ? hepsi.filter((p) => p.durum === malzemeEkrani.suzgec) : hepsi;
  const bugunTarihi = bugun();
  const ozet = malzemeOzeti(hepsi, bugunTarihi);
  const kutu = (deger, etiket, sinif = "") => '<div class="sayi-kutu ' + sinif + '"><b>' + deger + "</b><span>" + etiket + "</span></div>";

  kok.innerHTML =
    '<div class="arac-cubugu"><label>Durum <select id="malzeme-suzgec"><option value="">Hepsi</option>' +
    MALZEME_DURUMLARI.map((d) => '<option value="' + d.deger + '"' + (d.deger === malzemeEkrani.suzgec ? " selected" : "") + ">" + d.etiket +
      " (" + ozet.sayilar[d.deger] + ")</option>").join("") + "</select></label>" +
    '<span class="bosluk"></span><button class="dugme ana" data-eylem="ekle">+ Yeni ' + htmlKacis(MZ("malzeme_kucuk")) + "</button></div>" +
    (hepsi.length
      ? '<div class="paydas-ozet">' + kutu(String(ozet.sayilar.lazim), "alınması gereken") +
        kutu(tutarYaz(ozet.bekleyenTutar), "yolda / siparişte (" + (ozet.sayilar.siparis + ozet.sayilar.yolda) + ")") +
        kutu(String(ozet.geciken.length), "teslimi geciken", ozet.geciken.length ? "uyari" : "") + "</div>" +
        (gorunen.length
          ? '<ul class="paydas-liste">' + gorunen.map((p) => malzemeSatiriHtml(p, uyeler, butceKalemleri, bugunTarihi)).join("") + "</ul>"
          : '<p class="soluk">Bu durumda kayıt yok.</p>')
      : '<div class="bos"><h3>Henüz ' + htmlKacis(MZ("malzeme_kucuk")) + " yok</h3>" +
        "Alınması gereken parçaları ekle; siparişten teslime kadar takip et, kimde ve nerede olduğunu kaybetme.</div>");

  sec("#malzeme-suzgec").onchange = (olay) => { malzemeEkrani.suzgec = olay.target.value; yenile(); };
  eylemleriBagla(kok, {
    ekle: () => malzemeFormu(null, uyeler),
    duzenle: async (id) => {
      const kayit = await durum.depo.oku("malzemeler", id);
      if (!kayit) return yenile();
      malzemeFormu(kayit, uyeler);
    },
    ilerlet: async (id) => {
      const kayit = await durum.depo.oku("malzemeler", id);
      if (kayit && SONRAKI_DURUM[kayit.durum]) {
        const degisiklik = { durum: SONRAKI_DURUM[kayit.durum] };
        if (degisiklik.durum === "siparis" && !kayit.siparis_tarihi) degisiklik.siparis_tarihi = bugun();
        await durum.depo.guncelle("malzemeler", id, degisiklik);
        bildir('"' + kayit.ad + '" → ' + durumEtiketi(degisiklik.durum));
      }
      await yenile();
    },
    butceye: async (id) => {
      const kayit = await durum.depo.oku("malzemeler", id);
      if (!kayit) return yenile();
      butceFormu(null, malzemedenGider(kayit, bugun(), kurumAyarlari(durum.takim).tur)); // js/ekranlar/butce.js
    },
    sil: async (id) => {
      const kayit = await durum.depo.oku("malzemeler", id);
      if (!kayit) return yenile();
      if (!confirm('"' + kayit.ad + '" silinsin mi?')) return;
      await durum.depo.sil("malzemeler", id);
      bildir("Silindi");
      await yenile();
    },
  });
}

ekranKaydet("malzemeler", {
  baslik: () => MZ("malzemeler"),
  kisaAd: () => MZ("malzemeler"),
  simge: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  ciz: malzemelerEkraniCiz,
});
