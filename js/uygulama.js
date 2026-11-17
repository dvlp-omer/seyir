/* ==========================================================================
   UYGULAMA — başlatma ve ekranlar arası geçiş
   --------------------------------------------------------------------------
   Akış:
     baslat() -> ayarları yükle -> depoyu seç -> takımları yükle -> ilk ekranı çiz
   Bir şey değişince (kayıt eklendi, takım değişti...) yenile() çağrılır ve
   o anki ekran veriyi depodan yeniden okuyup baştan çizilir. Bu "her şeyi
   yeniden çiz" yaklaşımı basittir ve bu boyuttaki bir uygulama için yeterince
   hızlıdır; ekranla verinin birbirinden kopması gibi hataları da önler.
   ========================================================================== */

const AKTIF_TAKIM_ANAHTARI = "takim-asistani:aktif-takim";

// Uygulamanın o anki durumu. Bütün ekranlar buradan okur.
const durum = {
  depo: null,       // veri katmanı (js/veri.js)
  oturum: null,     // giriş yönetimi (js/oturum.js); localStorage kullanılırken null
  takimlar: [],     // bütün takımlar
  takim: null,      // seçili takım
  ekran: null,      // açık ekranın adı (ilk çizimden önce null)
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
  secici.innerHTML = secenekHtml(
    durum.takimlar.map((takim) => ({ deger: takim.id, etiket: takim.ad })),
    durum.takim ? durum.takim.id : "");
}

/* ---------- Menü ---------- */

// Menü bir kez çizilir. Sonradan yalnızca "hangi ekran açık" işareti
// güncellenir; böylece menüdeki klavye odağı kaybolmaz (RAPOR.md > E1).
function menuCiz() {
  sec("#menu").innerHTML = EKRAN_SIRASI.map((ad) =>
    '<button type="button" data-ekran="' + ad + '">' +
    simgeHtml(EKRANLAR[ad].simge) + "<span>" + EKRANLAR[ad].kisaAd + "</span></button>"
  ).join("");
}

function menuGuncelle() {
  for (const dugme of document.querySelectorAll("#menu [data-ekran]")) {
    if (dugme.dataset.ekran === durum.ekran) {
      dugme.setAttribute("aria-current", "page");
      // Mobilde sekme çubuğu yana kayar; açık sekme görünür olsun.
      dugme.scrollIntoView({ block: "nearest", inline: "nearest" });
    } else {
      dugme.removeAttribute("aria-current");
    }
  }
}

// Adres çubuğundaki #gorevler gibi kısmı değiştirir; asıl çizimi
// "hashchange" olayı tetikler. Böylece tarayıcının geri tuşu da çalışır.
function ekranaGit(ad) {
  if (location.hash === "#" + ad) return yenile();
  location.hash = ad;
}

/* ---------- Klavye odağını koruma ----------
   Ekran innerHTML ile baştan çizildiği için, odaktaki düğme yok olur ve
   odak sayfanın başına düşer. Çizimden önce odaktaki elemanı "tarif eden"
   bir seçici saklıyor, çizimden sonra aynı elemanı bulup odağı geri veriyoruz. */
function odakTarifi(kok) {
  const eleman = document.activeElement;
  if (!eleman || !kok.contains(eleman)) return null;
  const id = eleman.dataset.id;
  const idSecici = id ? '[data-id="' + CSS.escape(id) + '"]' : "";
  if (eleman.dataset.eylem) return { secici: '[data-eylem="' + eleman.dataset.eylem + '"]' + idSecici, idSecici: idSecici };
  if (eleman.id) return { secici: "#" + CSS.escape(eleman.id), idSecici: "" };
  return { secici: null, idSecici: "" };
}

function odagiGeriVer(kok, tarif) {
  const kullanilabilir = (e) => e && !e.disabled;
  let hedef = tarif.secici ? kok.querySelector(tarif.secici) : null;
  // Aynı düğme artık yoksa ya da pasifse (ör. görev son sütuna geldi),
  // aynı kayda ait başka bir düğmeyi dene.
  if (!kullanilabilir(hedef) && tarif.idSecici) {
    hedef = [...kok.querySelectorAll(tarif.idSecici)].find(kullanilabilir);
  }
  // O da yoksa (kayıt silindi) içerik alanının kendisine odaklan.
  (kullanilabilir(hedef) ? hedef : kok).focus();
}

/* ---------- Ekranı çizme ---------- */

// Supabase kullanılıyor ve giriş yapılmamış mı?
function girisGerekli() {
  return durum.oturum !== null && durum.oturum.kullanici() === null;
}

// Giriş ekranını gösterir; menü ve takım seçici gizlenir (stil.css > .oturumsuz).
function girisEkraninaDon(kok) {
  document.body.classList.add("oturumsuz");
  durum.ekran = null;
  sec("#ekran-baslik").textContent = "Seyir";
  document.title = "Giriş · Seyir";
  girisEkraniCiz(kok);
}

async function ekraniCiz() {
  if (girisGerekli()) return girisEkraninaDon(sec("#ekran"));
  document.body.classList.remove("oturumsuz");

  let ad = location.hash.slice(1);
  if (!EKRANLAR[ad]) ad = EKRAN_SIRASI[0];
  // Hiç takım yoksa diğer ekranların anlamı yok; takım ekranına yönlendir.
  // (Ayarlar hariç: yedekten geri yükleme takım yokken de gerekebilir.)
  if (!durum.takim && ad !== "ayarlar") ad = "takim";

  const ilkCizim = durum.ekran === null;
  const ekranDegisti = durum.ekran !== ad;
  durum.ekran = ad;

  const kok = sec("#ekran");
  const tarif = odakTarifi(kok);

  menuGuncelle();
  sec("#ekran-baslik").textContent = EKRANLAR[ad].baslik;
  document.title = EKRANLAR[ad].baslik + " · Seyir";

  try {
    await EKRANLAR[ad].ciz(kok);
  } catch (hata) {
    console.error(hata);
    // Oturum bu sırada bittiyse (jeton yenilenemedi) giriş ekranına dön.
    if (girisGerekli()) return girisEkraninaDon(kok);
    kok.innerHTML = '<div class="hata-kutusu" role="alert"><b>Veri yüklenemedi.</b><br>' + htmlKacis(hata.message) + "</div>";
  }

  if (ekranDegisti && !ilkCizim) {
    // Yeni ekrana geçildi: odağı başlığa taşı ki ekran okuyucu yeni ekranı okusun.
    sec("#ekran-baslik").focus();
    window.scrollTo(0, 0);
  } else if (tarif) {
    odagiGeriVer(kok, tarif);
  }
}

/* yenile(): o anki ekranı güncel veriyle baştan çizer.
   Çizimler SIRAYA konur: biri bitmeden diğeri başlamaz. Bu olmadan, yavaş
   bir depoda (Supabase) eski bir çizim yenisinin üstüne yazabiliyordu
   (RAPOR.md > H2). ekraniCiz hatayı kendi içinde yakaladığı için zincir kopmaz. */
let cizimKuyrugu = Promise.resolve();

function yenile() {
  cizimKuyrugu = cizimKuyrugu.then(ekraniCiz);
  return cizimKuyrugu;
}

/* ---------- Başlatma ---------- */

// İsteğe bağlı ayar dosyasını (js/ayarlar.js) yükler. Bu dosya hangi veri
// katmanının kullanılacağını ve Supabase adresini window.TAKIM_AYARLARI
// içine koyar. Dosya depoda YOKTUR (.gitignore'da); anahtarlar koda gömülmez.
// Dosya yoksa uygulama localStorage ile çalışır — konsolda görülen tek
// "404 js/ayarlar.js" satırı bu yüzden normaldir.
function ayarlariYukle() {
  return new Promise((bitti) => {
    const betik = document.createElement("script");
    betik.src = "js/ayarlar.js";
    betik.onload = () => bitti(window.TAKIM_AYARLARI || {});
    betik.onerror = () => bitti({});
    document.head.appendChild(betik);
  });
}

function baslatmaHatasi(baslik, hata) {
  console.error(hata);
  sec("#ekran").innerHTML = '<div class="hata-kutusu" role="alert"><b>' + baslik + "</b><br>" + htmlKacis(hata.message) + "</div>";
}

async function baslat() {
  const ayarlar = await ayarlariYukle();
  try {
    // Bazı gizli modlarda localStorage'a erişmek bile hata fırlatır (RAPOR.md > H6).
    localStorage.getItem(AKTIF_TAKIM_ANAHTARI);
  } catch (hata) {
    return baslatmaHatasi("Tarayıcı bu sayfanın veri saklamasına izin vermiyor. Gizli moddaysan normal pencerede aç.", hata);
  }

  try {
    // Supabase seçildiyse giriş yönetimini kur; depo her istekte jetonu oradan alır.
    if (veriKatmaniTuru(ayarlar) === "supabase") {
      durum.oturum = oturumOlustur(ayarlar.SUPABASE_URL, ayarlar.SUPABASE_ANON_KEY, window.localStorage);
    }
    durum.depo = depoSec(ayarlar, window.localStorage, { jetonGetir: () => durum.oturum.jeton() });
  } catch (hata) {
    return baslatmaHatasi("Ayarlar hatalı (js/ayarlar.js).", hata);
  }

  sec("#depo-rozet").textContent =
    durum.depo.tur === "supabase" ? "Supabase'e bağlı" : "Veriler bu tarayıcıda saklanıyor";

  menuCiz();
  sec("#menu").onclick = (olay) => {
    const dugme = olay.target.closest("[data-ekran]");
    if (!dugme) return;
    const ekran = EKRANLAR[dugme.dataset.ekran];
    // Menüden basılınca ekran ilk hâline döner (ör. açık tutanak kapanır).
    if (ekran.sifirla) ekran.sifirla();
    ekranaGit(dugme.dataset.ekran);
  };
  sec("#takim-sec").onchange = async (olay) => {
    await takimSec(olay.target.value);
    await yenile();
  };
  window.addEventListener("hashchange", yenile);

  // Başka bir sekmede veri değişirse bu sekme de güncellensin (RAPOR.md > H5).
  // Form açıkken yenilemiyoruz; kullanıcının yazdığı kaybolmasın.
  window.addEventListener("storage", async () => {
    if (durum.depo.tur !== "yerel" || sec("#pencere").open) return;
    await takimlariYukle();
    await yenile();
  });

  cevrimdisiDestegiKur();

  // Giriş gerekiyorsa veri isteği atma; yenile() giriş ekranını çizer.
  // Girişten sonra takımları giris.js yükler.
  if (!girisGerekli()) {
    try {
      await takimlariYukle();
      await demoBaglantisiniIsle();
    } catch (hata) {
      if (!girisGerekli()) return baslatmaHatasi("Veri deposuna bağlanılamadı.", hata);
    }
  }
  await yenile();
}

// Demo bağlantısı: adresin sonuna ?ornek=1 eklenirse ve henüz hiç takım yoksa
// örnek takım kendiliğinden yüklenir. CV'ye ya da README'ye konan bağlantıya
// tıklayan kişi boş ekran yerine dolu bir uygulama görsün diye.
// Yalnızca yerel kayıtta çalışır; ortak (Supabase) veriye örnek kayıt eklemez.
async function demoBaglantisiniIsle() {
  const istendi = new URLSearchParams(location.search).has("ornek");
  if (!istendi || durum.depo.tur !== "yerel" || durum.takimlar.length > 0) return;
  const takim = await ornekVeriYukle(durum.depo, bugun());
  await takimSec(takim.id);
}

// Service worker'ı kaydeder (sw.js): uygulama dosyalarını önbelleğe alır,
// böylece internet yokken de açılır ve "ana ekrana ekle" çalışır.
// Yalnızca http(s) üzerinde çalışır; dosyadan (file://) açınca atlanır.
function cevrimdisiDestegiKur() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  navigator.serviceWorker.register("sw.js").catch((hata) => {
    console.warn("Çevrimdışı desteği kurulamadı:", hata);
  });
}

baslat();
