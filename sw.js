/* ==========================================================================
   SERVICE WORKER — çevrimdışı açılma ve "ana ekrana ekle" desteği
   --------------------------------------------------------------------------
   Service worker, sayfadan ayrı çalışan ve ağ isteklerinin arasına girebilen
   küçük bir betiktir. Burada tek işi var: uygulamanın kendi dosyalarını
   önbelleğe almak, internet yokken oradan vermek.

   Strateji: "ÖNCE AĞ, olmazsa önbellek".
     - İnternet varsa her zaman en güncel dosya gelir (eski sürümde takılıp
       kalma sorunu olmaz) ve önbellek tazelenir.
     - İnternet yoksa en son başarılı kopya verilir.
   Veri istekleri (Supabase) başka bir adrese gider; onlara DOKUNULMAZ.
   localStorage verisi zaten cihazdadır; çevrimdışıyken de çalışır.
   ========================================================================== */

// Dosya listesi değişince bu adı da değiştir; eski önbellek silinir.
// (v7: uygulama /uygulama adresine taşındı, ana sayfa tanıtım oldu)
const ONBELLEK = "seyir-v24";

// Uygulamanın açılması için gereken dosyalar ("kabuk").
// uygulama.html'e yeni bir betik eklersen buraya da ekle (testler/pwa.test.js denetler).
const KABUK = [
  "uygulama.html",
  "manifest.webmanifest",
  "css/stil.css",
  "ikonlar/ikon.svg",
  "ikonlar/ikon-192.png",
  "ikonlar/ikon-512.png",
  "ikonlar/ikon-maskable-512.png",
  "js/tema.js",
  "js/veri.js",
  "js/oturum.js",
  "js/mantik.js",
  "js/kurum.js",
  "js/yetki.js",
  "js/yedek.js",
  "js/tutanak.js",
  "js/docx.js",
  "js/kisiler.js",
  "js/paydas.js",
  "js/butce.js",
  "js/malzeme.js",
  "js/proje.js",
  "js/kolaylik.js",
  "js/arayuz.js",
  "js/paylasim.js",
  "js/ornek-veri.js",
  "js/ekranlar/ozet.js",
  "js/ekranlar/gorevler.js",
  "js/ekranlar/sontarihler.js",
  "js/ekranlar/takvim.js",
  "js/ekranlar/toplantilar.js",
  "js/ekranlar/tutanaklar.js",
  "js/ekranlar/etkinlikler.js",
  "js/ekranlar/duyuru.js",
  "js/ekranlar/kisiler.js",
  "js/ekranlar/paydaslar.js",
  "js/ekranlar/butce.js",
  "js/ekranlar/malzemeler.js",
  "js/ekranlar/projeler.js",
  "js/ekranlar/mesajlar.js",
  "js/ekranlar/takim.js",
  "js/ekranlar/yonetim.js",
  "js/ekranlar/ayarlar.js",
  "js/ekranlar/giris.js",
  "js/uygulama.js",
];

// Kurulum: kabuk dosyalarını önbelleğe al.
self.addEventListener("install", (olay) => {
  olay.waitUntil(
    caches.open(ONBELLEK)
      .then((onbellek) => onbellek.addAll(KABUK))
      .then(() => self.skipWaiting()) // yeni sürüm beklemeden devreye girsin
  );
});

// Etkinleşme: eski sürümlerin önbelleklerini temizle.
self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(adlar.filter((ad) => ad !== ONBELLEK).map((ad) => caches.delete(ad))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (olay) => {
  const istek = olay.request;
  // Yalnızca kendi sitemizin GET isteklerine karış; Supabase ve diğerleri doğrudan ağa gider.
  if (istek.method !== "GET" || new URL(istek.url).origin !== self.location.origin) return;

  olay.respondWith(
    // cache: "no-cache" = tarayıcının kendi önbelleğindeki kopyayı sunucuya
    // sormadan kullanma. Böylece dosya değiştiyse hemen yenisi gelir;
    // değişmediyse sunucu "aynı" der (304) ve indirme yapılmaz.
    fetch(new Request(istek, { cache: "no-cache" }))
      .then((yanit) => {
        // Başarılı yanıtın bir kopyasını sakla (yanıt yalnızca bir kez okunabildiği için clone)
        if (yanit.ok) {
          const kopya = yanit.clone();
          caches.open(ONBELLEK).then((onbellek) => onbellek.put(istek, kopya));
        }
        return yanit;
      })
      .catch(async () => {
        // Ağ yok: önbellekteki kopyayı ver. "?x=1" gibi ekler önemsenmez.
        const kayitli = await caches.match(istek, { ignoreSearch: true });
        if (kayitli) return kayitli;
        // Sayfa isteğiyse (adres çubuğu) uygulamayı ver: internet yokken işe yarayan o.
        if (istek.mode === "navigate") return caches.match("uygulama.html");
        return Response.error();
      })
  );
});
