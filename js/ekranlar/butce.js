/* ==========================================================================
   EKRAN: Bütçe
   Üstte gelir / gider / kalan; giderlerin kategoriye göre dağılımı; sonra
   kalemler (yeniden eskiye, türe göre süzülebilir). Sponsorlarda "Anlaşıldı"
   olan tutarı bütçeye eklemek için Sponsorlar ekranındaki "Bütçeye ekle" düğmesi.
   Mantık: js/butce.js (testli).
   ========================================================================== */

const butceEkrani = { suzgec: "" }; // "" hepsi, "gelir", "gider"

function butceFormu(kalem, varsayilan) {
  const tur = (kalem || varsayilan || {}).tur || "gider";
  const kategoriListesi = kategoriler(kurumAyarlari(durum.takim).tur);
  formAc({
    baslik: kalem ? "Kalemi düzenle" : tur === "gelir" ? "Yeni gelir" : "Yeni gider",
    alanlar: [
      { ad: "tur", etiket: "Tür", tur: "secim", secenekler: BUTCE_TURLERI },
      { ad: "baslik", etiket: "Ne için?", tur: "metin", zorunlu: true, ipucu: "Ör. “İtici motor (2 adet)”, “Kargo — sensör”" },
      { ad: "tutar", etiket: "Tutar (₺)", tur: "sayi", en: 1000000000, zorunlu: true },
      { ad: "kategori", etiket: "Kategori", tur: "secim", secenekler: kategoriListesi.map((k) => ({ deger: k, etiket: k })) },
      { ad: "tarih", etiket: "Tarih", tur: "tarih", zorunlu: true },
      { ad: "odeyen", etiket: "Ödeyen / fiş kimde", tur: "metin", ipucu: "İsteğe bağlı. Masraf iadesi takibi için." },
      { ad: "aciklama", etiket: "Not", tur: "uzun" },
    ],
    degerler: kalem || { tur, kategori: tur === "gelir" ? kategoriListesi[0] : "Diğer", tarih: bugun(), ...(varsayilan || {}) },
    kaydet: async (degerler) => {
      if (kalem) await durum.depo.guncelle("butce_kalemleri", kalem.id, degerler);
      else await durum.depo.ekle("butce_kalemleri", { paydas_id: "", ...(varsayilan || {}), ...degerler, takim_id: durum.takim.id });
    },
  });
}

function butceSatiriHtml(k) {
  const gelir = k.tur === "gelir";
  return '<li class="butce-satir">' +
    '<span class="rozet ' + (gelir ? "asama-anlasildi" : "") + '">' + (gelir ? "Gelir" : "Gider") + "</span>" +
    '<div class="paydas-bilgi"><h4>' + htmlKacis(k.baslik) + "</h4>" +
    '<p class="soluk kucuk-yazi">' + [k.tarih ? tarihYaz(k.tarih, false) : "", k.kategori, k.odeyen ? "Ödeyen: " + k.odeyen : ""]
      .filter(Boolean).map(htmlKacis).join(" · ") + "</p></div>" +
    '<b class="paydas-tutar ' + (gelir ? "gelir" : "gider") + '">' + (gelir ? "+" : "−") + tutarYaz(k.tutar).replace("—", "₺0") + "</b>" +
    '<div class="satir-dugmeler">' +
    kayitDugmesi("duzenle", k.id, "Düzenle", k.baslik) +
    kayitDugmesi("sil", k.id, "Sil", k.baslik, "tehlike") +
    "</div></li>";
}

async function butceEkraniCiz(kok) {
  const hepsi = kalemleriSirala(await takimKayitlari("butce_kalemleri"));
  const ozet = butceOzeti(hepsi);
  const dagilim = kategoriDagilimi(hepsi);
  const gorunen = butceEkrani.suzgec ? hepsi.filter((k) => k.tur === butceEkrani.suzgec) : hepsi;
  const kutu = (deger, etiket, sinif = "") => '<div class="sayi-kutu ' + sinif + '"><b>' + deger + "</b><span>" + etiket + "</span></div>";
  const para = (n) => (n < 0 ? "−" : "") + "₺" + Math.abs(n).toLocaleString("tr-TR");

  kok.innerHTML =
    '<div class="arac-cubugu">' +
    '<label>Göster <select id="butce-suzgec">' +
    [["", "Hepsi"], ["gider", "Giderler"], ["gelir", "Gelirler"]].map(([d, e]) => '<option value="' + d + '"' + (d === butceEkrani.suzgec ? " selected" : "") + ">" + e + "</option>").join("") +
    "</select></label><span class=\"bosluk\"></span>" +
    '<button class="dugme" data-eylem="gelir">+ Gelir</button>' +
    '<button class="dugme ana" data-eylem="gider">+ Gider</button></div>' +
    (hepsi.length
      ? '<div class="paydas-ozet">' + kutu(para(ozet.gelir), "toplam gelir") + kutu(para(ozet.gider), "toplam gider") +
        kutu(para(ozet.kalan), "kalan", ozet.kalan < 0 ? "uyari" : "") + "</div>" +
        (dagilim.length
          ? '<section class="kart"><h3>Giderler kategoriye göre</h3><ul class="dagilim-liste">' + dagilim.map((d) =>
              "<li><span>" + htmlKacis(d.kategori) + '</span><span class="oran"><span class="oran-cubuk" aria-hidden="true"><span style="width:' + d.yuzde + '%"></span></span>' +
              "<b>" + para(d.tutar) + "</b> <span class=\"soluk kucuk-yazi\">%" + d.yuzde + "</span></span></li>").join("") + "</ul></section>"
          : "") +
        '<ul class="paydas-liste">' + gorunen.map(butceSatiriHtml).join("") + "</ul>"
      : '<div class="bos"><h3>Henüz bütçe kalemi yok</h3>Gelen desteği ve yapılan harcamaları ekle; kalan bütçeyi ve paranın nereye gittiğini burada gör. ' +
        "Sponsorlarda “Anlaşıldı” olanları oradaki “Bütçeye ekle” düğmesiyle gelir olarak ekleyebilirsin.</div>");

  sec("#butce-suzgec").onchange = (olay) => { butceEkrani.suzgec = olay.target.value; yenile(); };
  eylemleriBagla(kok, {
    gelir: () => butceFormu(null, { tur: "gelir" }),
    gider: () => butceFormu(null, { tur: "gider" }),
    duzenle: async (id) => {
      const kalem = await durum.depo.oku("butce_kalemleri", id);
      if (!kalem) return yenile();
      butceFormu(kalem);
    },
    sil: async (id) => {
      const kalem = await durum.depo.oku("butce_kalemleri", id);
      if (!kalem) return yenile();
      if (!confirm('"' + kalem.baslik + '" silinsin mi?')) return;
      await durum.depo.sil("butce_kalemleri", id);
      bildir("Kalem silindi");
      await yenile();
    },
  });
}

ekranKaydet("butce", {
  baslik: "Bütçe",
  kisaAd: "Bütçe",
  simge: "M3 7h18v12H3zM3 11h18M7 15h4",
  ciz: butceEkraniCiz,
});
