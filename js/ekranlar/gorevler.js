/* ==========================================================================
   EKRAN: Görev panosu
   Üç sütun: Yapılacak / Yapılıyor / Bitti. Her görevin sorumlusu ve bitiş
   tarihi olabilir. Kartlar ◀ ▶ düğmeleriyle sütun değiştirir.
   ========================================================================== */

// Panodaki "sorumluya göre süz" seçimi. "" = herkes.
let gorevSorumluFiltresi = "";

/* Görev ekleme/düzenleme formu. Toplantı ekranı da "karardan görev oluştur"
   için bunu kullanır; o yüzden ayrı bir fonksiyon.
     gorev      : düzenlenecek görev (yeni görev için null)
     varsayilan : yeni görevde önceden dolu gelecek alanlar
     kaydedince : kayıttan sonra çağrılacak isteğe bağlı fonksiyon */
function gorevFormu({ gorev = null, varsayilan = {}, uyeler, kaydedince = null }) {
  formAc({
    baslik: gorev ? "Görevi düzenle" : "Yeni görev",
    alanlar: [
      { ad: "baslik", etiket: "Görev", tur: "metin", zorunlu: true },
      { ad: "aciklama", etiket: "Açıklama", tur: "uzun" },
      { ad: "sorumlu_id", etiket: "Sorumlu", tur: "secim", secenekler: uyeSecenekleri(uyeler, "— Sorumlu atanmadı —") },
      { ad: "bitis_tarihi", etiket: "Bitiş tarihi", tur: "tarih" },
      { ad: "durum", etiket: "Durum", tur: "secim", secenekler: GOREV_DURUMLARI },
    ],
    degerler: gorev || { durum: "yapilacak", ...varsayilan },
    kaydet: async (degerler) => {
      let kayit;
      if (gorev) {
        kayit = await durum.depo.guncelle("gorevler", gorev.id, degerler);
      } else {
        kayit = await durum.depo.ekle("gorevler", {
          toplanti_id: "", ...varsayilan, ...degerler, takim_id: durum.takim.id,
        });
      }
      if (kaydedince) await kaydedince(kayit);
    },
  });
}

// Görevi bir sonraki (+1) ya da önceki (-1) sütuna taşır.
async function gorevTasi(id, yon) {
  const gorev = await durum.depo.oku("gorevler", id);
  const sira = GOREV_DURUMLARI.findIndex((d) => d.deger === gorev.durum);
  const yeni = GOREV_DURUMLARI[sira + yon];
  if (!yeni) return;
  await durum.depo.guncelle("gorevler", id, { durum: yeni.deger });
  await yenile();
}

async function gorevSil(id) {
  const gorev = await durum.depo.oku("gorevler", id);
  if (!gorev || !confirm('"' + gorev.baslik + '" görevi silinsin mi?')) return;
  await durum.depo.sil("gorevler", id);
  bildir("Görev silindi");
  await yenile();
}

/* ---------- Çizim ---------- */

function gorevKartiHtml(gorev, uyeler) {
  const id = htmlKacis(gorev.id);
  const sira = GOREV_DURUMLARI.findIndex((d) => d.deger === gorev.durum);
  const bitti = gorev.durum === "bitti";
  const sorumlu = uyeAdi(uyeler, gorev.sorumlu_id);

  // Sol kenar rengi: gecikmişse kırmızı, 3 gün ve altıysa turuncu
  let vurgu = "";
  if (gorevGecikti(gorev, bugun())) vurgu = "gecikti";
  else if (!bitti && gorev.bitis_tarihi && kalanGun(gorev.bitis_tarihi, bugun()) <= 3) vurgu = "yakin";

  // Biten görevde geri sayım göstermenin anlamı yok; sadece tarihi yaz.
  let tarih = "";
  if (gorev.bitis_tarihi) {
    tarih = bitti
      ? '<span class="soluk">' + tarihYaz(gorev.bitis_tarihi, false) + "</span>"
      : '<span class="soluk">' + tarihYaz(gorev.bitis_tarihi, false) + "</span> " + kalanRozet(gorev.bitis_tarihi);
  }

  return '<article class="gorev-kart ' + vurgu + '">' +
    "<h4>" + htmlKacis(gorev.baslik) + "</h4>" +
    (gorev.aciklama ? '<p class="aciklama">' + htmlKacis(gorev.aciklama) + "</p>" : "") +
    '<div class="gorev-alt">' +
    (sorumlu ? '<span class="kisi">' + htmlKacis(sorumlu) + "</span>" : '<span class="soluk">Sorumlu yok</span>') +
    tarih + "</div>" +
    '<div class="gorev-dugmeler">' +
    '<button class="dugme kucuk" data-eylem="geri" data-id="' + id + '"' + (sira === 0 ? " disabled" : "") +
    ' aria-label="Önceki sütuna taşı" title="Önceki sütuna taşı">◀</button>' +
    '<button class="dugme kucuk" data-eylem="ileri" data-id="' + id + '"' + (sira === GOREV_DURUMLARI.length - 1 ? " disabled" : "") +
    ' aria-label="Sonraki sütuna taşı" title="Sonraki sütuna taşı">▶</button>' +
    '<button class="dugme kucuk" data-eylem="duzenle" data-id="' + id + '">Düzenle</button>' +
    '<button class="dugme kucuk tehlike" data-eylem="sil" data-id="' + id + '">Sil</button>' +
    "</div></article>";
}

async function gorevlerEkraniCiz(kok) {
  // İki listeyi aynı anda iste (Supabase'de iki ayrı ağ isteği; beklemeyi kısaltır)
  const [gorevler, uyeler] = await Promise.all([takimKayitlari("gorevler"), takimKayitlari("uyeler")]);

  // Süzgeçteki üye silinmişse süzgeci sıfırla
  if (gorevSorumluFiltresi && !uyeler.some((u) => u.id === gorevSorumluFiltresi)) gorevSorumluFiltresi = "";
  const gorunen = gorevSorumluFiltresi
    ? gorevler.filter((g) => g.sorumlu_id === gorevSorumluFiltresi)
    : gorevler;

  const sutunlar = GOREV_DURUMLARI.map((sutun) => {
    const kartlar = tariheGoreSirala(gorunen.filter((g) => g.durum === sutun.deger), "bitis_tarihi");
    return '<section class="sutun" data-durum="' + sutun.deger + '">' +
      '<h3 class="sutun-baslik">' + sutun.etiket + ' <span class="sayi">' + kartlar.length + "</span></h3>" +
      (kartlar.length
        ? kartlar.map((g) => gorevKartiHtml(g, uyeler)).join("")
        : '<p class="sutun-bos">Burada görev yok</p>') +
      "</section>";
  }).join("");

  const filtreSecenekleri = uyeSecenekleri(uyeler, "Herkes").map((s) =>
    '<option value="' + htmlKacis(s.deger) + '"' + (s.deger === gorevSorumluFiltresi ? " selected" : "") + ">" +
    htmlKacis(s.etiket) + "</option>").join("");

  kok.innerHTML =
    '<div class="arac-cubugu">' +
    '<label><span class="gizli">Sorumluya göre süz</span><select id="gorev-filtre">' + filtreSecenekleri + "</select></label>" +
    '<span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="ekle">+ Yeni görev</button>' +
    "</div>" +
    (gorevler.length === 0
      ? '<div class="bos"><h3>Henüz görev yok</h3>İlk görevi ekle ya da bir toplantı kararından görev oluştur.</div>'
      : '<div class="pano">' + sutunlar + "</div>");

  sec("#gorev-filtre").onchange = (olay) => {
    gorevSorumluFiltresi = olay.target.value;
    yenile();
  };

  eylemleriBagla(kok, {
    ekle: () => gorevFormu({ uyeler: uyeler, varsayilan: { sorumlu_id: gorevSorumluFiltresi } }),
    duzenle: async (id) => gorevFormu({ gorev: await durum.depo.oku("gorevler", id), uyeler: uyeler }),
    ileri: (id) => gorevTasi(id, +1),
    geri: (id) => gorevTasi(id, -1),
    sil: gorevSil,
  });
}

ekranKaydet("gorevler", {
  baslik: "Görev panosu",
  kisaAd: "Görevler",
  simge: "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z",
  ciz: gorevlerEkraniCiz,
});
