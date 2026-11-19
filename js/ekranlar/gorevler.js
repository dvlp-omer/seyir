/* ==========================================================================
   EKRAN: Görev panosu
   Üç sütun: Yapılacak / Yapılıyor / Bitti. Her görevin sorumlusu ve bitiş
   tarihi olabilir. Kartlar sürükle-bırakla ya da ◀ ▶ düğmeleriyle sütun değiştirir.
   ========================================================================== */

// Panodaki "sorumluya göre süz" seçimi. "" = herkes.
let gorevSorumluFiltresi = "";

// "yapiliyor" -> "Yapılıyor". Beklenmeyen bir değer gelirse çökmeden yazar.
function gorevDurumEtiketi(deger) {
  const bulunan = GOREV_DURUMLARI.find((d) => d.deger === deger);
  return bulunan ? bulunan.etiket : "Bilinmiyor";
}

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
      {
        ad: "sorumlu_id", etiket: "Sorumlu", tur: "secim",
        secenekler: uyeSecenekleri(uyeler, "— Sorumlu atanmadı —"),
        ipucu: uyeler.length ? "" : "Takımda henüz üye yok. Sorumlu atamak için önce Takım ekranından üye ekle.",
      },
      { ad: "bitis_tarihi", etiket: "Bitiş tarihi", tur: "tarih" },
      { ad: "durum", etiket: "Durum", tur: "secim", secenekler: GOREV_DURUMLARI },
    ],
    degerler: gorev || { durum: "yapilacak", ...varsayilan },
    // Düzenlemede "Sil" düğmesi formun içinde (kartta değil)
    sil: gorev ? async () => {
      if (!confirm('"' + gorev.baslik + '" görevi silinsin mi?')) return false;
      await durum.depo.sil("gorevler", gorev.id);
      bildir("Görev silindi");
      return true;
    } : null,
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

// Görevi verilen sütuna (durum) taşır. Düğmeler ve sürükle-bırak bunu kullanır.
async function gorevDurumunuDegistir(id, yeniDurum) {
  const gorev = await durum.depo.oku("gorevler", id);
  // Görev bu sırada başka bir sekmede silinmiş olabilir.
  if (!gorev) return yenile();
  const yeni = GOREV_DURUMLARI.find((d) => d.deger === yeniDurum);
  if (!yeni || gorev.durum === yeni.deger) return;
  await durum.depo.guncelle("gorevler", id, { durum: yeni.deger });
  await yenile();
  bildir('"' + gorev.baslik + '" → ' + yeni.etiket); // ekran okuyucu da duyar (role=status)
}

// Görevi bir sonraki (+1) ya da önceki (-1) sütuna taşır.
async function gorevTasi(id, yon) {
  const gorev = await durum.depo.oku("gorevler", id);
  if (!gorev) return yenile();
  const sira = GOREV_DURUMLARI.findIndex((d) => d.deger === gorev.durum);
  const yeni = GOREV_DURUMLARI[sira + yon];
  if (yeni) await gorevDurumunuDegistir(id, yeni.deger);
}

/* Sürükle-bırak: kart başka bir sütuna sürüklenip bırakılınca durumu değişir.
   Fareyle çalışır; dokunmatik ekranda ve klavyede ◀ ▶ düğmeleri kullanılır
   (tarayıcıların sürükle-bırakı dokunmatikte çoğunlukla çalışmaz). */
function panoSurukleBirakBagla(pano) {
  let suruklenen = null;
  let surukleSuruyor = false;

  pano.ondragstart = (olay) => {
    const kart = olay.target.closest && olay.target.closest(".gorev-kart[data-id]");
    if (!kart) return;
    suruklenen = kart.dataset.id;
    olay.dataTransfer.effectAllowed = "move";
    olay.dataTransfer.setData("text/plain", suruklenen); // Firefox veri olmadan sürüklemez
    kart.classList.add("suruklenen");
  };
  pano.ondragend = (olay) => {
    if (olay.target.classList) olay.target.classList.remove("suruklenen");
    for (const s of pano.querySelectorAll(".surukle-hedef")) s.classList.remove("surukle-hedef");
    suruklenen = null;
  };
  pano.ondragover = (olay) => {
    const sutun = suruklenen && olay.target.closest(".sutun");
    if (!sutun) return;
    olay.preventDefault(); // bırakmaya izin ver
    olay.dataTransfer.dropEffect = "move";
    for (const s of pano.querySelectorAll(".surukle-hedef")) if (s !== sutun) s.classList.remove("surukle-hedef");
    sutun.classList.add("surukle-hedef");
  };
  pano.ondrop = async (olay) => {
    const sutun = suruklenen && olay.target.closest(".sutun");
    if (!sutun) return;
    olay.preventDefault();
    const id = suruklenen;
    suruklenen = null;
    sutun.classList.remove("surukle-hedef");
    if (surukleSuruyor) return;
    surukleSuruyor = true;
    try {
      await gorevDurumunuDegistir(id, sutun.dataset.durum);
    } catch (hata) {
      hataGoster(hata);
    } finally {
      surukleSuruyor = false;
    }
  };
}

/* ---------- Çizim ---------- */

function gorevKartiHtml(gorev, uyeler) {
  const id = htmlKacis(gorev.id);
  const baslik = htmlKacis(gorev.baslik);
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
    tarih = '<span class="soluk">' + tarihYaz(gorev.bitis_tarihi, false) + "</span>" +
      (bitti ? "" : " " + kalanRozet(gorev.bitis_tarihi));
  }

  // ◀ ▶ düğmeleri: aria-label hem yönü hem görevi söyler.
  const tasiDugmesi = (eylem, simge, hedefSira) => {
    const hedef = GOREV_DURUMLARI[hedefSira];
    const etiket = hedef ? '"' + hedef.etiket + '" sütununa taşı: ' + gorev.baslik : "Taşınamaz";
    return '<button class="dugme kucuk" data-eylem="' + eylem + '" data-id="' + id + '"' + (hedef ? "" : " disabled") +
      ' aria-label="' + htmlKacis(etiket) + '" title="' + htmlKacis(hedef ? hedef.etiket + " sütununa taşı" : "") + '">' + simge + "</button>";
  };

  // Sorumlu: baş harfli renkli yuvarlak + ad (renk kişinin kimliğinden; js/kolaylik.js)
  const kisi = sorumlu
    ? '<span class="kisi"><span class="avatar r' + (renkSirasi(gorev.sorumlu_id) + 1) + '" aria-hidden="true">' +
      htmlKacis(basHarfler(sorumlu)) + "</span>" + htmlKacis(sorumlu) + "</span>"
    : '<span class="soluk">Sorumlu yok</span>';

  // Kartın tamamı düzenlemeyi açar (fare); klavye ve ekran okuyucu için başlık bir düğmedir.
  // Silme, düzenleme penceresinin içindedir.
  return '<article class="gorev-kart ' + vurgu + '" draggable="true" data-eylem="duzenle" data-id="' + id + '">' +
    '<h4><button type="button" class="kart-baslik" data-eylem="duzenle" data-id="' + id + '" aria-label="Düzenle: ' + baslik + '">' + baslik + "</button></h4>" +
    (gorev.aciklama ? '<p class="aciklama">' + htmlKacis(gorev.aciklama) + "</p>" : "") +
    '<div class="gorev-alt">' + kisi + tarih +
    '<span class="gorev-dugmeler">' + tasiDugmesi("geri", "◀", sira - 1) + tasiDugmesi("ileri", "▶", sira + 1) + "</span>" +
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
    return '<section class="sutun" data-durum="' + sutun.deger + '" aria-label="' + sutun.etiket + '">' +
      '<h3 class="sutun-baslik">' + sutun.etiket + ' <span class="sayi" aria-label="' + kartlar.length + ' görev">' + kartlar.length + "</span></h3>" +
      (kartlar.length
        ? kartlar.map((g) => gorevKartiHtml(g, uyeler)).join("")
        : '<p class="sutun-bos">Burada görev yok</p>') +
      "</section>";
  }).join("");

  // Süzgeç etkinken bunu açıkça söyle; yoksa pano "boş" sanılabilir (RAPOR.md > B3).
  const suzgecNotu = gorevSorumluFiltresi
    ? '<p class="bilgi-kutusu">Yalnızca <b>' + htmlKacis(uyeAdi(uyeler, gorevSorumluFiltresi)) + "</b> üzerindeki görevler gösteriliyor (" +
      gorunen.length + " / " + gorevler.length + '). <button class="dugme kucuk" data-eylem="suzgec-kaldir">Hepsini göster</button></p>'
    : "";

  kok.innerHTML =
    '<div class="arac-cubugu">' +
    '<label>Sorumlu <select id="gorev-filtre">' + secenekHtml(uyeSecenekleri(uyeler, "Herkes"), gorevSorumluFiltresi) + "</select></label>" +
    '<span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="ekle">+ Yeni görev</button>' +
    "</div>" + suzgecNotu +
    (gorevler.length === 0
      ? '<div class="bos"><h3>Henüz görev yok</h3>İlk görevi ekle ya da bir toplantı kararından görev oluştur.</div>'
      : '<div class="pano">' + sutunlar + "</div>");

  const pano = kok.querySelector(".pano");
  if (pano) panoSurukleBirakBagla(pano);

  sec("#gorev-filtre").onchange = (olay) => {
    gorevSorumluFiltresi = olay.target.value;
    yenile();
  };

  eylemleriBagla(kok, {
    ekle: () => gorevFormu({ uyeler: uyeler, varsayilan: { sorumlu_id: gorevSorumluFiltresi } }),
    duzenle: async (id) => {
      const gorev = await durum.depo.oku("gorevler", id);
      if (!gorev) return yenile();
      gorevFormu({ gorev: gorev, uyeler: uyeler });
    },
    ileri: (id) => gorevTasi(id, +1),
    geri: (id) => gorevTasi(id, -1),
    "suzgec-kaldir": () => { gorevSorumluFiltresi = ""; return yenile(); },
  });
}

ekranKaydet("gorevler", {
  baslik: "Görev panosu",
  kisaAd: "Görevler",
  simge: "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z",
  ciz: gorevlerEkraniCiz,
});
