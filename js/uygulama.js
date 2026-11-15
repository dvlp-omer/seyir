/* ==========================================================================
   UYGULAMA — başlatma ve ekranlar arası geçiş
   --------------------------------------------------------------------------
   Akış:
     baslat() -> depoyu seç -> takımları yükle -> menüyü çiz -> ilk ekranı çiz
   Bir şey değişince (kayıt eklendi, takım değişti...) yenile() çağrılır ve
   o anki ekran veriyi depodan yeniden okuyup baştan çizilir. Bu "her şeyi
   yeniden çiz" yaklaşımı basittir ve bu boyuttaki bir uygulama için yeterince
   hızlıdır; ekranla verinin birbirinden kopması gibi hataları da önler.
   ========================================================================== */

const AKTIF_TAKIM_ANAHTARI = "takim-asistani:aktif-takim";

// Uygulamanın o anki durumu. Bütün ekranlar buradan okur.
const durum = {
  depo: null,       // veri katmanı (js/veri.js)
  takimlar: [],     // bütün takımlar
  takim: null,      // seçili takım
  ekran: "ozet",    // açık ekranın adı
};

/* ---------- Veri kısayolları ---------- */

// Seçili takıma ait kayıtları getirir. Örn: takimKayitlari("gorevler")
function takimKayitlari(koleksiyon) {
  return durum.depo.listele(koleksiyon, { takim_id: durum.takim.id });
}

/* ---------- Takım seçimi ---------- */

async function takimlariYukle() {
  durum.takimlar = await durum.depo.listele("takimlar");
  const kayitliId = localStorage.getItem(AKTIF_TAKIM_ANAHTARI);
  // Son seçilen takım duruyorsa onu, yoksa ilk takımı seç.
  durum.takim = durum.takimlar.find((t) => t.id === kayitliId) || durum.takimlar[0] || null;
  takimSeciciCiz();
}

async function takimSec(id) {
  localStorage.setItem(AKTIF_TAKIM_ANAHTARI, id);
  await takimlariYukle();
}

function takimSeciciCiz() {
  const secici = sec("#takim-sec");
  secici.hidden = durum.takimlar.length === 0;
  secici.innerHTML = durum.takimlar.map((takim) =>
    '<option value="' + htmlKacis(takim.id) + '"' +
    (durum.takim && takim.id === durum.takim.id ? " selected" : "") + ">" +
    htmlKacis(takim.ad) + "</option>"
  ).join("");
}

/* ---------- Menü ve ekran geçişi ---------- */

function menuCiz() {
  sec("#menu").innerHTML = EKRAN_SIRASI.map((ad) =>
    '<button type="button" data-ekran="' + ad + '"' +
    (ad === durum.ekran ? ' aria-current="page"' : "") + ">" +
    simgeHtml(EKRANLAR[ad].simge) + "<span>" + EKRANLAR[ad].kisaAd + "</span></button>"
  ).join("");
}

// Adres çubuğundaki #gorevler gibi kısmı değiştirir; asıl çizimi
// "hashchange" olayı tetikler. Böylece tarayıcının geri tuşu da çalışır.
function ekranaGit(ad) {
  if (location.hash === "#" + ad) return yenile();
  location.hash = ad;
}

// O anki ekranı güncel veriyle baştan çizer.
async function yenile() {
  let ad = location.hash.slice(1);
  if (!EKRANLAR[ad]) ad = EKRAN_SIRASI[0];
  // Hiç takım yoksa diğer ekranların anlamı yok; takım ekranına yönlendir.
  if (!durum.takim) ad = "takim";
  durum.ekran = ad;

  menuCiz();
  sec("#ekran-baslik").textContent = EKRANLAR[ad].baslik;
  document.title = EKRANLAR[ad].baslik + " · Takım Asistanı";

  const kok = sec("#ekran");
  try {
    await EKRANLAR[ad].ciz(kok);
  } catch (hata) {
    console.error(hata);
    kok.innerHTML = '<div class="hata-kutusu"><b>Veri yüklenemedi.</b><br>' + htmlKacis(hata.message) + "</div>";
  }
}

/* ---------- Başlatma ---------- */

async function baslat() {
  durum.depo = depoSec({}, window.localStorage);
  sec("#depo-rozet").textContent =
    durum.depo.tur === "supabase" ? "Supabase'e bağlı" : "Veriler bu tarayıcıda saklanıyor";

  sec("#menu").onclick = (olay) => {
    const dugme = olay.target.closest("[data-ekran]");
    if (dugme) ekranaGit(dugme.dataset.ekran);
  };
  sec("#takim-sec").onchange = async (olay) => {
    await takimSec(olay.target.value);
    await yenile();
  };
  window.addEventListener("hashchange", yenile);

  try {
    await takimlariYukle();
  } catch (hata) {
    console.error(hata);
    sec("#ekran").innerHTML = '<div class="hata-kutusu"><b>Veri deposuna bağlanılamadı.</b><br>' +
      htmlKacis(hata.message) + "</div>";
    return;
  }
  await yenile();
}

baslat();
