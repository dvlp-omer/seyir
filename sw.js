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
const ONBELLEK = "takim-asistani-v2";

// Uygulamanın açılması için gereken dosyalar ("kabuk").
// index.html'e yeni bir betik eklersen buraya da ekle (testler/pwa.test.js denetler).
const KABUK = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/stil.css",
  "ikonlar/ikon.svg",
  "ikonlar/ikon-192.png",
  "ikonlar/ikon-512.png",
  "js/tema.js",
  "js/veri.js",
  "js/oturum.js",
  "js/mantik.js",
  "js/yedek.js",
  "js/arayuz.js",
  "js/ornek-veri.js",
  "js/ekranlar/ozet.js",
  "js/ekranlar/gorevler.js",
  "js/ekranlar/sontarihler.js",
  "js/ekranlar/takvim.js",
  "js/ekranlar/toplantilar.js",
  "js/ekranlar/etkinlikler.js",
  "js/ekranlar/duyuru.js",
  "js/ekranlar/takim.js",
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
        // Sayfa isteğiyse (adres çubuğu) ana sayfayı ver; değilse hata dön.
        if (istek.mode === "navigate") return caches.match("index.html");
        return Response.error();
      })
  );
});
