/* ==========================================================================
   EKRAN: Takvim
   Son tarihleri, toplantıları ve etkinlikleri tek ayda gösterir.
   - Izgara mantik.js > ayIzgarasi'ndan gelir (haftalar Pazartesi başlar).
   - Bir güne basınca o günün kayıtları altta listelenir.
   - Masaüstünde hücrede başlıklar, dar ekranda sadece renkli noktalar görünür.
   Türler renkle birlikte ŞEKİLLE de ayrılır (kare / daire / baklava);
   renkleri ayırt edemeyenler de okuyabilsin diye.
   ========================================================================== */

// Hangi ay ve hangi gün seçili? İlk açılışta bugüne ayarlanır.
const takvimDurumu = { yil: 0, ay: 0, secili: "" };

const TAKVIM_TURLERI = {
  son_tarih: { etiket: "Son tarih", ekran: "tarihler" },
  toplanti: { etiket: "Toplantı", ekran: "toplantilar" },
  etkinlik: { etiket: "Etkinlik", ekran: "etkinlikler" },
};
const GUN_KISA = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const GUN_TAM = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function takvimiBuguneGetir() {
  const [yil, ay] = bugun().split("-").map(Number);
  takvimDurumu.yil = yil;
  takvimDurumu.ay = ay;
  takvimDurumu.secili = bugun();
}

function noktaHtml(tur) {
  return '<span class="nokta ' + tur + '" aria-hidden="true"></span>';
}

// Tek bir gün hücresi
function gunHucresiHtml(tarih, ogeler) {
  const gun = Number(tarih.slice(8));
  const ayDisi = Number(tarih.slice(5, 7)) !== takvimDurumu.ay;
  const siniflar = (ayDisi ? "disari " : "") + (tarih === bugun() ? "bugun" : "");

  // Ekran okuyucu için tam cümle: "18 Kasım 2026 Çarşamba, 2 kayıt"
  const etiket = tarihYaz(tarih) + (tarih === bugun() ? " (bugün)" : "") + ", " +
    (ogeler.length ? ogeler.length + " kayıt" : "kayıt yok");

  // Başlık ayrı bir kutuda: uzunsa "…" ile kısalır; tamamı fareyle üstüne gelince görünür
  const basliklar = ogeler.slice(0, 2).map((oge) =>
    '<span class="gun-oge ' + oge.tur + '" title="' + htmlKacis(oge.baslik) + '">' + noktaHtml(oge.tur) +
    '<span class="gun-oge-ad">' + htmlKacis(oge.baslik) + "</span></span>").join("");
  const fazla = ogeler.length > 2 ? '<span class="gun-fazla">+' + (ogeler.length - 2) + " daha</span>" : "";
  const noktalar = ogeler.length
    ? '<span class="noktalar">' + ogeler.slice(0, 4).map((oge) => noktaHtml(oge.tur)).join("") + "</span>"
    : "";

  return '<td class="' + siniflar + '">' +
    '<button class="gun-dugme" data-eylem="gun" data-id="' + tarih + '" aria-pressed="' + (tarih === takvimDurumu.secili) +
    '" aria-label="' + htmlKacis(etiket) + '">' +
    '<span class="gun-no">' + gun + "</span>" + basliklar + fazla + noktalar +
    "</button></td>";
}

// Seçili günün kayıt listesi
function gunAyrintisiHtml(tarih, ogeler) {
  const satirlar = ogeler.map((oge, sira) =>
    "<li>" + noktaHtml(oge.tur) +
    '<span class="ne">' + htmlKacis(oge.baslik) +
    "<small>" + TAKVIM_TURLERI[oge.tur].etiket + (oge.saat ? " · " + htmlKacis(oge.saat) : "") +
    (oge.tamamlandi ? " · tamamlandı" : "") + "</small></span>" +
    kayitDugmesi("ac", String(sira), "Aç", oge.baslik) + "</li>"
  ).join("");

  return '<section class="kart" aria-live="polite"><h3>' + tarihYaz(tarih) + "</h3>" +
    (ogeler.length ? '<ul class="akis">' + satirlar + "</ul>" : '<p class="soluk">Bu gün için kayıt yok.</p>') +
    "</section>";
}

async function takvimEkraniCiz(kok) {
  if (!takvimDurumu.yil) takvimiBuguneGetir();

  const [sonTarihler, toplantilar, etkinlikler] = await Promise.all([
    takimKayitlari("son_tarihler"), takimKayitlari("toplantilar"), takimKayitlari("etkinlikler"),
  ]);
  const gunler = takvimOgeleri(sonTarihler, toplantilar, etkinlikler);
  const haftalar = ayIzgarasi(takvimDurumu.yil, takvimDurumu.ay);
  const seciliOgeler = gunler[takvimDurumu.secili] || [];

  const govde = haftalar.map((hafta) =>
    "<tr>" + hafta.map((tarih) => gunHucresiHtml(tarih, gunler[tarih] || [])).join("") + "</tr>"
  ).join("");

  kok.innerHTML =
    '<div class="arac-cubugu">' +
    '<button class="dugme" data-eylem="onceki" aria-label="Önceki ay">◀</button>' +
    '<h2 class="ay-adi" aria-live="polite">' + AYLAR[takvimDurumu.ay - 1] + " " + takvimDurumu.yil + "</h2>" +
    '<button class="dugme" data-eylem="sonraki" aria-label="Sonraki ay">▶</button>' +
    '<span class="bosluk"></span>' +
    '<button class="dugme" data-eylem="bugun">Bugün</button>' +
    '<button class="dugme" data-eylem="ics" title="Bugünden sonraki toplantı, etkinlik, son tarih ve görevleri Google Takvim ya da telefon takvimine aktar">Takvimime aktar (.ics)</button>' +
    "</div>" +

    '<table class="takvim">' +
    '<caption class="gizli">' + AYLAR[takvimDurumu.ay - 1] + " " + takvimDurumu.yil + " takvimi</caption>" +
    "<thead><tr>" + GUN_KISA.map((kisa, sira) =>
      '<th scope="col"><abbr title="' + GUN_TAM[sira] + '" style="text-decoration:none">' + kisa + "</abbr></th>").join("") +
    "</tr></thead>" +
    "<tbody>" + govde + "</tbody></table>" +

    '<div class="aciklama-satiri">' +
    Object.keys(TAKVIM_TURLERI).map((tur) => "<span>" + noktaHtml(tur) + TAKVIM_TURLERI[tur].etiket + "</span>").join("") +
    "</div>" +

    gunAyrintisiHtml(takvimDurumu.secili, seciliOgeler);

  const ayDegistir = (fark) => {
    const yeni = ayKaydir(takvimDurumu.yil, takvimDurumu.ay, fark);
    // Uygulamanın kabul ettiği tarih aralığının dışına çıkma
    if (yeni.yil < 2000 || yeni.yil > 2100) return;
    takvimDurumu.yil = yeni.yil;
    takvimDurumu.ay = yeni.ay;
    return yenile();
  };

  eylemleriBagla(kok, {
    onceki: () => ayDegistir(-1),
    sonraki: () => ayDegistir(+1),
    bugun: () => { takvimiBuguneGetir(); return yenile(); },
    // Takvim dosyası (js/kolaylik.js > icsOlustur). Google Takvim: Ayarlar →
    // İçe aktar; telefonda dosyaya dokunmak yeterli. Aynı dosya ikinci kez
    // aktarılırsa olaylar çoğalmaz (her olayın sabit bir UID'si var).
    ics: async () => {
      const gorevler = await takimKayitlari("gorevler");
      const olaylar = takvimOlaylari({ sonTarihler, toplantilar, etkinlikler, gorevler }, bugun());
      if (!olaylar.length) return bildir("Bugünden sonra takvime aktarılacak bir şey yok");
      dosyaIndir("seyir-takvim-" + bugun() + ".ics",
        icsOlustur(olaylar, { takvimAdi: durum.takim.ad + " · Seyir" }), "text/calendar;charset=utf-8");
      bildir(olaylar.length + " olay takvim dosyasına yazıldı. Dosyayı Google Takvim'e ya da telefonuna aktar.");
    },
    gun: (tarih) => {
      takvimDurumu.secili = tarih;
      // Komşu aydan bir güne basıldıysa o aya geç
      takvimDurumu.yil = Number(tarih.slice(0, 4));
      takvimDurumu.ay = Number(tarih.slice(5, 7));
      return yenile();
    },
    // Kaydı kendi ekranında aç
    ac: (sira) => {
      const oge = seciliOgeler[Number(sira)];
      if (oge.tur === "toplanti") acikToplantiId = oge.id; // doğrudan tutanağı göster
      ekranaGit(TAKVIM_TURLERI[oge.tur].ekran);
    },
  });
}

ekranKaydet("takvim", {
  baslik: "Takvim",
  kisaAd: "Takvim",
  simge: "M5 6h14v14H5zM5 10h14M9 3v4M15 3v4",
  ciz: takvimEkraniCiz,
  sifirla: takvimiBuguneGetir,
});
