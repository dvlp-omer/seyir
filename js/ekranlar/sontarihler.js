/* ==========================================================================
   EKRAN: Son tarihler
   Rapor teslimi, izin başvurusu gibi kaçırılmaması gereken günler.
   Her satırda geri sayım kutusu var; renk aciliyete göre değişir
   (mantik.js > aciliyet). Tamamlananlar ayrı listelenir.
   ========================================================================== */

const TARIH_TURLERI = [
  { deger: "rapor", etiket: "Rapor" },
  { deger: "izin", etiket: "İzin / başvuru" },
  { deger: "etkinlik", etiket: "Etkinlik" },
  { deger: "diger", etiket: "Diğer" },
];

function tarihTuruEtiketi(tur) {
  const bulunan = TARIH_TURLERI.find((t) => t.deger === tur);
  return bulunan ? bulunan.etiket : "Diğer";
}

function sonTarihFormu(kayit) {
  formAc({
    baslik: kayit ? "Son tarihi düzenle" : "Yeni son tarih",
    alanlar: [
      { ad: "baslik", etiket: "Ne?", tur: "metin", zorunlu: true, ipucu: "Örn: Ön Tasarım Raporu teslimi" },
      { ad: "tarih", etiket: "Tarih", tur: "tarih", zorunlu: true },
      { ad: "tur", etiket: "Tür", tur: "secim", secenekler: TARIH_TURLERI },
      { ad: "aciklama", etiket: "Not", tur: "uzun" },
    ],
    degerler: kayit || { tur: "rapor" },
    kaydet: async (degerler) => {
      if (kayit) {
        await durum.depo.guncelle("son_tarihler", kayit.id, degerler);
      } else {
        await durum.depo.ekle("son_tarihler", { ...degerler, tamamlandi: false, takim_id: durum.takim.id });
      }
    },
  });
}

// Geri sayım kutusu: büyük sayı + altında küçük açıklama.
function sayacHtml(tarih, tamamlandi) {
  if (tamamlandi) return '<div class="sayac tamam"><b aria-hidden="true">✓</b><span>tamam</span></div>';
  const gun = kalanGun(tarih, bugun());
  let etiket = "gün";
  if (gun < 0) etiket = "gün geçti";
  if (gun === 0) etiket = "bugün";
  return '<div class="sayac ' + aciliyet(gun) + '" title="' + kalanGunMetni(gun) + '">' +
    "<b>" + Math.abs(gun) + "</b><span>" + etiket + "</span></div>";
}

function sonTarihSatiriHtml(kayit) {
  return '<li class="tarih-satir">' +
    sayacHtml(kayit.tarih, kayit.tamamlandi) +
    '<div class="tarih-bilgi">' +
    "<h4>" + htmlKacis(kayit.baslik) + "</h4>" +
    "<p>" + tarihYaz(kayit.tarih) + " · " + tarihTuruEtiketi(kayit.tur) + "</p>" +
    (kayit.aciklama ? "<p>" + htmlKacis(kayit.aciklama) + "</p>" : "") +
    "</div>" +
    '<div class="satir-dugmeler">' +
    kayitDugmesi("tamam", kayit.id, kayit.tamamlandi ? "Geri al" : "Tamamlandı", kayit.baslik) +
    (kayit.tamamlandi ? "" : kayitDugmesi("duyuru", kayit.id, "Duyuru", kayit.baslik)) +
    kayitDugmesi("duzenle", kayit.id, "Düzenle", kayit.baslik) +
    kayitDugmesi("sil", kayit.id, "Sil", kayit.baslik, "tehlike") +
    "</div></li>";
}

async function sonTarihlerEkraniCiz(kok) {
  const hepsi = tariheGoreSirala(await takimKayitlari("son_tarihler"), "tarih");
  const acik = hepsi.filter((k) => !k.tamamlandi);
  // Tamamlananlarda en son tarihli en üstte
  const tamamlanan = hepsi.filter((k) => k.tamamlandi).reverse();

  let icerik;
  if (hepsi.length === 0) {
    icerik = '<div class="bos"><h3>Takip edilen son tarih yok</h3>Rapor teslimi, izin başvurusu ya da etkinlik tarihi ekle; geri sayımı burada gör.</div>';
  } else {
    icerik =
      (acik.length
        ? '<ul class="tarih-liste">' + acik.map(sonTarihSatiriHtml).join("") + "</ul>"
        : '<div class="bos">Bekleyen son tarih yok. 🎉</div>') +
      (tamamlanan.length
        ? '<h2 class="bolum-baslik">Tamamlanan</h2><ul class="tarih-liste">' + tamamlanan.map(sonTarihSatiriHtml).join("") + "</ul>"
        : "");
  }

  kok.innerHTML =
    '<div class="arac-cubugu"><span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="ekle">+ Yeni son tarih</button></div>' + icerik;

  eylemleriBagla(kok, {
    ekle: () => sonTarihFormu(null),
    duyuru: (id) => duyuruyaGit("hatirlatma", id),
    duzenle: async (id) => {
      const kayit = await durum.depo.oku("son_tarihler", id);
      if (!kayit) return yenile();
      sonTarihFormu(kayit);
    },
    tamam: async (id) => {
      const kayit = await durum.depo.oku("son_tarihler", id);
      // Kayıt bu sırada başka bir sekmede silinmiş olabilir.
      if (kayit) await durum.depo.guncelle("son_tarihler", id, { tamamlandi: !kayit.tamamlandi });
      await yenile();
    },
    sil: async (id) => {
      const kayit = await durum.depo.oku("son_tarihler", id);
      if (!kayit) return yenile();
      if (!confirm('"' + kayit.baslik + '" silinsin mi?')) return;
      await durum.depo.sil("son_tarihler", id);
      bildir("Son tarih silindi");
      await yenile();
    },
  });
}

ekranKaydet("tarihler", {
  baslik: "Son tarihler",
  kisaAd: "Tarihler",
  simge: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  ciz: sonTarihlerEkraniCiz,
});
