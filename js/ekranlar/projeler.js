/* ==========================================================================
   EKRAN: Projeler
   Her proje bir kart: durum, müşteri / sponsor, teslim tarihi ve geri sayım,
   görevlerden hesaplanan ilerleme çubuğu. "Görevleri gör" panoyu o projeye
   süzerek açar. Mantık: js/proje.js (testli).
   ========================================================================== */

function projeFormu(kayit, paydaslar) {
  const ayar = kurumAyarlari(durum.takim);
  formAc({
    baslik: kayit ? "Projeyi düzenle" : "Yeni proje",
    alanlar: [
      { ad: "ad", etiket: "Proje adı", tur: "metin", zorunlu: true },
      { ad: "durum", etiket: "Durum", tur: "secim", secenekler: PROJE_DURUMLARI },
      ...(paydaslar
        ? [{ ad: "paydas_id", etiket: soz(ayar, "paydas"), tur: "secim",
            secenekler: [{ deger: "", etiket: "—" }, ...paydaslar.map((p) => ({ deger: p.id, etiket: p.ad }))] }]
        : []),
      { ad: "baslangic", etiket: "Başlangıç", tur: "tarih" },
      { ad: "bitis", etiket: "Teslim tarihi", tur: "tarih" },
      { ad: "aciklama", etiket: "Açıklama", tur: "uzun" },
    ],
    degerler: kayit || { durum: "planlama" },
    kaydet: async (degerler) => {
      if (kayit) await durum.depo.guncelle("projeler", kayit.id, degerler);
      else await durum.depo.ekle("projeler", { paydas_id: "", ...degerler, takim_id: durum.takim.id });
    },
  });
}

function projeKartiHtml(p, gorevler, paydaslar, bugunTarihi) {
  const ilerleme = projeIlerleme(p, gorevler);
  const gecikti = projeGecikti(p, bugunTarihi);
  const musteri = paydaslar && (paydaslar.find((x) => x.id === p.paydas_id) || {}).ad;
  const acik = ACIK_PROJE.includes(p.durum);
  return '<article class="kart proje-kart' + (gecikti ? " gecikti" : "") + '">' +
    '<div class="proje-ust"><span class="rozet proje-' + htmlKacis(p.durum) + '">' + projeDurumEtiketi(p.durum) + "</span>" +
    (gecikti ? '<span class="rozet gecikti">gecikti</span>' : "") + "</div>" +
    "<h3>" + htmlKacis(p.ad) + "</h3>" +
    (musteri ? '<p class="soluk kucuk-yazi">' + htmlKacis(musteri) + "</p>" : "") +
    (p.bitis ? "<p>Teslim: <b>" + tarihYaz(p.bitis, false) + "</b>" + (acik ? " " + kalanRozet(p.bitis) : "") + "</p>" : "") +
    '<div class="oran"><span class="oran-cubuk" aria-hidden="true"><span style="width:' + ilerleme.yuzde + '%"></span></span>' +
    "<b>%" + ilerleme.yuzde + "</b></div>" +
    '<p class="soluk kucuk-yazi">' + (ilerleme.toplam ? ilerleme.biten + " / " + ilerleme.toplam + " görev bitti" : "Bağlı görev yok") + "</p>" +
    '<div class="satir-dugmeler">' +
    kayitDugmesi("gorevler", p.id, "Görevleri gör", p.ad) +
    kayitDugmesi("duzenle", p.id, "Düzenle", p.ad) +
    kayitDugmesi("sil", p.id, "Sil", p.ad, "tehlike") +
    "</div></article>";
}

async function projelerEkraniCiz(kok) {
  const ayar = kurumAyarlari(durum.takim);
  const paydasVar = sekmeAcikMi(ayar, "paydaslar") && sekmeGorunurMu(durum.yetki, "paydaslar");
  const [projeler, gorevler, paydaslar] = await Promise.all([
    takimKayitlari("projeler"), takimKayitlari("gorevler"), paydasVar ? takimKayitlari("paydaslar") : null,
  ]);
  const bugunTarihi = bugun();
  const sirali = projeleriSirala(projeler);
  const ozet = projeOzeti(projeler, bugunTarihi);
  const kutu = (deger, etiket, sinif = "") => '<div class="sayi-kutu ' + sinif + '"><b>' + deger + "</b><span>" + etiket + "</span></div>";

  kok.innerHTML =
    '<div class="arac-cubugu"><span class="bosluk"></span><button class="dugme ana" data-eylem="ekle">+ Yeni proje</button></div>' +
    (projeler.length
      ? '<div class="paydas-ozet">' + kutu(String(ozet.acik), "açık proje") + kutu(String(ozet.geciken), "teslimi geçen", ozet.geciken ? "uyari" : "") +
        kutu(String(ozet.tamamlanan), "tamamlanan") + "</div>" +
        '<div class="proje-izgara">' + sirali.map((p) => projeKartiHtml(p, gorevler, paydaslar, bugunTarihi)).join("") + "</div>"
      : '<div class="bos"><h3>Henüz proje yok</h3>Projeyi ekle, görevleri ona bağla; ilerleme biten görevlerden kendiliğinden hesaplanır.</div>');

  eylemleriBagla(kok, {
    ekle: () => projeFormu(null, paydaslar),
    duzenle: async (id) => {
      const kayit = await durum.depo.oku("projeler", id);
      if (!kayit) return yenile();
      projeFormu(kayit, paydaslar);
    },
    gorevler: (id) => {
      gorevProjeFiltresi = id; // js/ekranlar/gorevler.js
      gorevSorumluFiltresi = "";
      ekranaGit("gorevler");
    },
    sil: async (id) => {
      const kayit = await durum.depo.oku("projeler", id);
      if (!kayit) return yenile();
      if (!confirm('"' + kayit.ad + '" projesi silinsin mi?\nBağlı görevler silinmez, projesiz kalır.')) return;
      for (const g of gorevler.filter((x) => x.proje_id === id)) {
        await durum.depo.guncelle("gorevler", g.id, { proje_id: "" }, { zorla: true }); // toplu iş: denetimsiz
      }
      await durum.depo.sil("projeler", id);
      bildir("Proje silindi");
      await yenile();
    },
  });
}

ekranKaydet("projeler", {
  baslik: "Projeler",
  kisaAd: "Projeler",
  simge: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  ciz: projelerEkraniCiz,
});
