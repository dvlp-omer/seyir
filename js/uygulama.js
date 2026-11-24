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
  demo: false,     // örnek mod (?ornek): giriş yok, veri sekmenin geçici deposunda
  oturum: null,     // giriş yönetimi (js/oturum.js); localStorage kullanılırken null
  takimlar: [],     // bütün takımlar
  takim: null,      // seçili takım
  ekran: null,      // açık ekranın adı (ilk çizimden önce null)
  sifreYenileme: false, // e-postadaki sıfırlama bağlantısıyla gelindi: önce yeni şifre sorulur
};

/* ---------- Veri kısayolları ---------- */

// Seçili takıma ait kayıtları getirir. Örn: takimKayitlari("gorevler")
function takimKayitlari(koleksiyon) {
  return durum.depo.listele(koleksiyon, { takim_id: durum.takim.id });
}

/* ---------- Takım seçimi ---------- */

// Son seçilen takım nerede hatırlanır: örnek modda sekmenin deposunda, yoksa tarayıcıda
function aktifTakimDeposu() {
  return durum.demo ? window.sessionStorage : window.localStorage;
}
function aktifTakimAnahtari() {
  return durum.demo ? ORNEK_ONEKI + "aktif-takim" : AKTIF_TAKIM_ANAHTARI;
}

async function takimlariYukle() {
  durum.takimlar = await durum.depo.listele("takimlar");
  const kayitliId = aktifTakimDeposu().getItem(aktifTakimAnahtari());
  // Son seçilen takım duruyorsa onu, yoksa ilk takımı seç.
  durum.takim = durum.takimlar.find((t) => t.id === kayitliId) || durum.takimlar[0] || null;
  takimSeciciCiz();
  kurumuUygula();
}

/* Etkin takımın kurum ayarlarını ekrana uygular (js/kurum.js):
   - ana renk: --vurgu değişkenleri (beyaz yazı okunur kalacak şekilde, vurguRenkleri)
   - logo: yan menüde Seyir logosunun yerine kurumun logosu ve adı
   Takım değişince ya da ayar kaydedilince yeniden çağrılır. */
const VURGU_DEGISKENLERI = { vurgu: "--vurgu", vurgu_koyu: "--vurgu-koyu", vurgu_yazi: "--vurgu-yazi" };
function kurumuUygula() {
  const ayar = kurumAyarlari(durum.takim);
  // Menü: kapalı sekmeler ve paket sözcükleri (Takım / Ekip) için yeniden çizilir
  if (sec("#menu").childElementCount) { menuCiz(); menuGuncelle(); }
  const stil = document.documentElement.style;
  const renkler = durum.takim && ayar.renk !== VARSAYILAN_RENK ? vurguRenkleri(ayar.renk) : null;
  for (const [anahtar, degisken] of Object.entries(VURGU_DEGISKENLERI)) {
    if (renkler) stil.setProperty(degisken, renkler[anahtar]);
    else stil.removeProperty(degisken);
  }
  const logo = sec("#kurum-logo");
  const seyirLogosu = sec(".marka svg");
  const kurumLogosu = Boolean(durum.takim && ayar.logo);
  logo.hidden = !kurumLogosu;
  if (kurumLogosu) logo.src = ayar.logo; else logo.removeAttribute("src");
  seyirLogosu.style.display = kurumLogosu ? "none" : "";
  sec("#marka-ad").textContent = kurumLogosu ? durum.takim.ad : "Seyir";
  sec("#marka-ad").classList.toggle("yazi-parilti", !kurumLogosu);
  sec("#marka-alt").textContent = kurumLogosu ? "Seyir ile" : soz(ayar, "takim").toLocaleLowerCase("tr") + " asistanı";
}

async function takimSec(id) {
  aktifTakimDeposu().setItem(aktifTakimAnahtari(), id);
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

/* Menü grupları. Masaüstünde yan menü bu başlıklarla bölünür. Telefonda alt
   çubukta yalnızca ALT_CUBUK'taki 4 ekran ve "Daha fazla" düğmesi görünür;
   gerisi "Daha fazla" penceresinde. Gruplarda olmayan bir ekran eklenirse
   menünün sonuna düşer (unutulup kaybolmaz). */
const MENU_GRUPLARI = [
  { baslik: "", ekranlar: ["ozet"] },
  { baslik: "Planlama", ekranlar: ["gorevler", "tarihler", "takvim"] },
  { baslik: "Toplantı ve etkinlik", ekranlar: ["toplantilar", "tutanaklar", "etkinlikler"] },
  { baslik: "İletişim", ekranlar: ["kisiler", "mesajlar", "duyuru"] },
  { baslik: "Takım", sozAnahtari: "takim", ekranlar: ["takim", "ayarlar"] },
];
const ALT_CUBUK = ["ozet", "gorevler", "takvim", "tutanaklar"];
const DAHA_FAZLA_SIMGE = "M5 12h.01M12 12h.01M19 12h.01";

// Kurumun kapattığı sekmeler menüde ve "Daha fazla"da görünmez (js/kurum.js > menuyuSuz).
function menuGruplari() {
  const grupta = new Set(MENU_GRUPLARI.flatMap((g) => g.ekranlar));
  return menuyuSuz([
    ...MENU_GRUPLARI.map((g) => ({ ...g, ekranlar: g.ekranlar.filter((ad) => EKRANLAR[ad]) })),
    { baslik: "", ekranlar: EKRAN_SIRASI.filter((ad) => !grupta.has(ad)) },
  ], kurumAyarlari(durum.takim));
}

// Ekranın başlığı ya da menü adı. Kurum türüne göre değişenler fonksiyon olarak kaydedilir (ör. takim.js).
function ekranMetni(ad, alan) {
  const deger = EKRANLAR[ad][alan];
  return typeof deger === "function" ? deger() : deger;
}

function menuDugmesi(ad, sinif) {
  return '<button type="button" class="' + sinif + '" data-ekran="' + ad + '">' +
    simgeHtml(EKRANLAR[ad].simge) + "<span>" + htmlKacis(ekranMetni(ad, "kisaAd")) + "</span></button>";
}

// Menü bir kez çizilir. Sonradan yalnızca "hangi ekran açık" işareti
// güncellenir; böylece menüdeki klavye odağı kaybolmaz (RAPOR.md > E1).
function menuCiz() {
  sec("#menu").innerHTML = menuGruplari().map((g) =>
    '<div class="menu-grup" role="group"' + (g.baslik ? ' aria-label="' + g.baslik + '"' : "") + ">" +
    (g.baslik ? '<p class="menu-grup-baslik" aria-hidden="true">' + g.baslik + "</p>" : "") +
    g.ekranlar.map((ad) => menuDugmesi(ad, ALT_CUBUK.includes(ad) ? "" : "ikincil")).join("") +
    "</div>").join("") +
    '<button type="button" class="daha-fazla" data-daha-fazla aria-haspopup="dialog">' +
    simgeHtml(DAHA_FAZLA_SIMGE) + "<span>Daha fazla</span></button>";
}

function menuGuncelle() {
  for (const dugme of document.querySelectorAll("#menu [data-ekran]")) {
    if (dugme.dataset.ekran === durum.ekran) dugme.setAttribute("aria-current", "page");
    else dugme.removeAttribute("aria-current");
  }
  // Telefonda açık ekran alt çubukta yoksa "Daha fazla" işaretli görünsün
  const dahaFazla = sec("#menu [data-daha-fazla]");
  if (dahaFazla) dahaFazla.classList.toggle("aktif", !!durum.ekran && !ALT_CUBUK.includes(durum.ekran));
}

// Menüden (ya da "Daha fazla"dan) bir ekrana geçiş: ekran ilk hâline döner (ör. açık tutanak kapanır).
function menudenGit(ad) {
  const ekran = EKRANLAR[ad];
  if (!ekran) return;
  if (ekran.sifirla) ekran.sifirla();
  ekranaGit(ad);
}

// Telefonda "Daha fazla": bütün ekranlar gruplarıyla, dokunmaya uygun karolar hâlinde.
function dahaFazlaAc() {
  const pencere = sec("#pencere");
  if (pencere.open) return;
  pencere.setAttribute("aria-labelledby", "pencere-baslik");
  pencere.innerHTML =
    '<div class="form daha-fazla-panel"><h2 id="pencere-baslik">Bütün ekranlar</h2>' +
    menuGruplari().map((g) =>
      (g.baslik ? "<h3>" + g.baslik + "</h3>" : "") +
      '<div class="ekran-karolari">' + g.ekranlar.map((ad) =>
        menuDugmesi(ad, "ekran-karo").replace("<button", ad === durum.ekran ? '<button aria-current="page"' : "<button")).join("") +
      "</div>").join("") +
    '<div class="form-dugmeler"><button type="button" class="dugme" data-kapat>Kapat</button></div></div>';
  const panel = pencere.querySelector(".daha-fazla-panel");
  panel.onclick = (olay) => {
    if (olay.target.closest("[data-kapat]")) return pencere.close();
    const dugme = olay.target.closest("[data-ekran]");
    if (!dugme) return;
    pencere.close();
    menudenGit(dugme.dataset.ekran);
  };
  pencere.showModal();
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
  if (durum.sifreYenileme) {
    // Sıfırlama bağlantısından gelindi: menü gizli, yalnızca "yeni şifre" formu
    document.body.classList.add("oturumsuz");
    sec("#ekran-baslik").textContent = "Seyir";
    document.title = "Yeni şifre · Seyir";
    return yeniSifreEkraniCiz(sec("#ekran"));
  }
  document.body.classList.remove("oturumsuz");

  let ad = location.hash.slice(1);
  if (!EKRANLAR[ad]) ad = EKRAN_SIRASI[0];
  // Hiç takım yoksa diğer ekranların anlamı yok; takım ekranına yönlendir.
  // (Ayarlar hariç: yedekten geri yükleme takım yokken de gerekebilir.)
  if (!durum.takim && ad !== "ayarlar") ad = "takim";
  // Kurumun kapattığı sekmeye (eski bağlantı, yer imi) gelindiyse Özet açılır.
  if (durum.takim && !sekmeAcikMi(kurumAyarlari(durum.takim), ad)) ad = "ozet";

  const ilkCizim = durum.ekran === null;
  const ekranDegisti = durum.ekran !== ad;
  durum.ekran = ad;

  const kok = sec("#ekran");
  const tarif = odakTarifi(kok);

  menuGuncelle();
  sec("#ekran-baslik").textContent = ekranMetni(ad, "baslik");
  document.title = ekranMetni(ad, "baslik") + " · Seyir";

  try {
    await EKRANLAR[ad].ciz(kok);
  } catch (hata) {
    console.error(hata);
    // Oturum bu sırada bittiyse (jeton yenilenemedi) giriş ekranına dön.
    if (girisGerekli()) return girisEkraninaDon(kok);
    kok.innerHTML = '<div class="hata-kutusu" role="alert"><b>Veri yüklenemedi.</b><br>' + htmlKacis(hata.message) + "</div>";
  }

  // Yeni ekrana geçildiyse kartlar kısa bir belirme animasyonuyla gelsin (css > ekran-yeni)
  if (ekranDegisti) {
    kok.classList.add("ekran-yeni");
    setTimeout(() => kok.classList.remove("ekran-yeni"), 700);
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

  durum.demo = ornekModuMu(location.search);
  try {
    if (durum.demo) {
      // Örnek mod: ayar dosyası ne derse desin yerel, sekmeye ait depo (js/kolaylik.js > ornekModuMu)
      durum.depo = yerelDepoOlustur(window.sessionStorage, ORNEK_ONEKI);
    } else {
      // Supabase seçildiyse giriş yönetimini kur; depo her istekte jetonu oradan alır.
      if (veriKatmaniTuru(ayarlar) === "supabase") {
        // sessionStorage: "Beni hatırla" işaretsizken oturum orada durur (tarayıcı kapanınca silinir)
        let gecici = null;
        try { gecici = window.sessionStorage; } catch (hata) { gecici = null; }
        durum.oturum = oturumOlustur(ayarlar.SUPABASE_URL, ayarlar.SUPABASE_ANON_KEY, window.localStorage,
          undefined, undefined, gecici);
      }
      durum.depo = depoSec(ayarlar, window.localStorage, { jetonGetir: () => durum.oturum.jeton() });
    }
  } catch (hata) {
    return baslatmaHatasi("Ayarlar hatalı (js/ayarlar.js).", hata);
  }

  sec("#depo-rozet").textContent = durum.demo ? "Örnek mod: veriler bu sekmede"
    : durum.depo.tur === "supabase" ? "Supabase'e bağlı" : "Veriler bu tarayıcıda saklanıyor";
  sec("#ornek-bant").hidden = !durum.demo;

  menuCiz();
  sec("#menu").onclick = (olay) => {
    if (olay.target.closest("[data-daha-fazla]")) return dahaFazlaAc();
    const dugme = olay.target.closest("[data-ekran]");
    if (dugme) menudenGit(dugme.dataset.ekran);
  };
  sec("#takim-sec").onchange = async (olay) => {
    await takimSec(olay.target.value);
    await yenile();
  };
  window.addEventListener("hashchange", yenile);
  kisayollariKur(); // Ctrl+K arama, Ctrl+S kaydet, ? yardım (js/arayuz.js)

  // Başka bir sekmede veri değişirse bu sekme de güncellensin (RAPOR.md > H5).
  // Form açıkken yenilemiyoruz; kullanıcının yazdığı kaybolmasın.
  window.addEventListener("storage", async () => {
    if (durum.depo.tur !== "yerel" || sec("#pencere").open) return;
    await takimlariYukle();
    await yenile();
  });

  cevrimdisiDestegiKur();

  // E-postadaki bir bağlantıyla mı gelindi? (şifre sıfırlama ya da kayıt onayı)
  // Supabase adresin sonuna "#access_token=...&type=recovery" ekler; bu ek bir
  // ekran adı değildir. Önce oturum açılır, sonra ek adresten silinir (jeton
  // adres çubuğunda ve tarayıcı geçmişinde kalmasın).
  if (durum.oturum) {
    try {
      const sonuc = await durum.oturum.adrestenOturumAc(location.hash);
      if (sonuc) durum.sifreYenileme = sonuc.tur === "recovery";
    } catch (hata) {
      console.error(hata);
      girisNotu = hata.message; // giriş ekranında gösterilir (giris.js)
    }
    if (girisNotu || durum.sifreYenileme || /access_token=/.test(location.hash)) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

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
