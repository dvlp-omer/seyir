/* ==========================================================================
   VERİ KATMANI
   --------------------------------------------------------------------------
   Uygulamanın geri kalanı veriye SADECE bu dosyadaki "depo" üzerinden ulaşır.
   Bir depo şu beş fonksiyonu sunar (hepsi Promise döner):

     depo.listele(koleksiyon, filtre)   -> kayıt dizisi
     depo.oku(koleksiyon, id)           -> tek kayıt ya da null
     depo.ekle(koleksiyon, kayit)       -> eklenen kayıt (id verilmiş hâli;
                                           kayıtta id varsa o korunur)
     depo.guncelle(koleksiyon, id, degisiklik) -> güncel kayıt
     depo.sil(koleksiyon, id)           -> (bir şey dönmez)

   "koleksiyon" bir tablo adıdır (ör. "gorevler").
   "filtre" isteğe bağlıdır: { takim_id: "abc" } gibi, eşitlik kontrolü yapar.

   Neden hepsi async? localStorage anında cevap verir ama Supabase internet
   üzerinden çalışır. İkisi AYNI arayüzü paylaşsın diye hepsi Promise döner.
   Böylece ekran kodu hangi deponun kullanıldığını bilmek zorunda kalmaz.
   ========================================================================== */

// Uygulamadaki tablolar. Yanlış yazılmış bir ad hemen hata versin diye liste tutuyoruz.
const KOLEKSIYONLAR = ["takimlar", "uyeler", "gorevler", "son_tarihler", "toplantilar", "etkinlikler"];

function koleksiyonKontrol(koleksiyon) {
  if (!KOLEKSIYONLAR.includes(koleksiyon)) {
    throw new Error("Bilinmeyen koleksiyon: " + koleksiyon);
  }
}

// Her kayda benzersiz bir kimlik (id) üretir.
// Kimliği sunucu değil biz üretiyoruz; böylece iki depo da aynı şekilde çalışır.
function kimlikUret() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Çok eski tarayıcılar için yedek yol
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// Eklenecek kayda kimlik ve oluşturma zamanı verir. Kayıt bunları zaten
// taşıyorsa (yedekten geri yüklenen kayıt) olduğu gibi korur; böylece
// kayıtlar arasındaki bağlar (takim_id, sorumlu_id...) bozulmaz.
function yeniKayit(kayit) {
  return {
    ...kayit,
    id: kayit.id || kimlikUret(),
    olusturma: kayit.olusturma || new Date().toISOString(),
  };
}

// Kayıt, filtredeki bütün alanlarla eşleşiyor mu?
function filtreyeUyar(kayit, filtre) {
  return Object.keys(filtre || {}).every((alan) => kayit[alan] === filtre[alan]);
}

/* --------------------------------------------------------------------------
   1) YEREL DEPO — localStorage
   Her koleksiyon tek bir anahtarda JSON dizisi olarak saklanır:
     "takim-asistani:gorevler" -> "[{...}, {...}]"
   "depolama" parametresi normalde window.localStorage'dır. Testlerde onun
   yerine sahte bir nesne veriyoruz; bu yüzden parametre olarak alıyoruz.
   -------------------------------------------------------------------------- */
function yerelDepoOlustur(depolama, onEk = "takim-asistani:") {
  function tumunuOku(koleksiyon) {
    koleksiyonKontrol(koleksiyon);
    const ham = depolama.getItem(onEk + koleksiyon);
    if (!ham) return [];
    try {
      return JSON.parse(ham);
    } catch (hata) {
      // Kayıt bozulmuşsa uygulama çökmesin; boş listeyle devam et.
      console.error("Yerel kayıt okunamadı:", koleksiyon, hata);
      return [];
    }
  }

  function tumunuYaz(koleksiyon, liste) {
    depolama.setItem(onEk + koleksiyon, JSON.stringify(liste));
  }

  return {
    tur: "yerel",

    async listele(koleksiyon, filtre) {
      return tumunuOku(koleksiyon).filter((kayit) => filtreyeUyar(kayit, filtre));
    },

    async oku(koleksiyon, id) {
      return tumunuOku(koleksiyon).find((kayit) => kayit.id === id) || null;
    },

    async ekle(koleksiyon, kayit) {
      const liste = tumunuOku(koleksiyon);
      const yeni = yeniKayit(kayit);
      if (liste.some((mevcut) => mevcut.id === yeni.id)) {
        throw new Error("Bu kimlikle bir kayıt zaten var: " + koleksiyon + "/" + yeni.id);
      }
      liste.push(yeni);
      tumunuYaz(koleksiyon, liste);
      return yeni;
    },

    async guncelle(koleksiyon, id, degisiklik) {
      const liste = tumunuOku(koleksiyon);
      const sira = liste.findIndex((kayit) => kayit.id === id);
      if (sira === -1) throw new Error("Kayıt bulunamadı: " + koleksiyon + "/" + id);
      // id ve oluşturma zamanı değiştirilemez; en sona yazarak koruyoruz.
      liste[sira] = { ...liste[sira], ...degisiklik, id: id, olusturma: liste[sira].olusturma };
      tumunuYaz(koleksiyon, liste);
      return liste[sira];
    },

    async sil(koleksiyon, id) {
      const liste = tumunuOku(koleksiyon);
      tumunuYaz(koleksiyon, liste.filter((kayit) => kayit.id !== id));
    },
  };
}

/* --------------------------------------------------------------------------
   2) SUPABASE DEPOSU
   Yukarıdaki yerel depoyla BİREBİR aynı beş fonksiyonu sunar; veriyi
   tarayıcı yerine Supabase'deki (PostgreSQL) tablolara yazar. Böylece
   takımdaki herkes aynı veriyi görür.

   Supabase her tablo için hazır bir REST adresi verir:
     https://PROJE.supabase.co/rest/v1/gorevler
   Bu yüzden ek kütüphane yüklemeden, tarayıcının kendi fetch() fonksiyonuyla
   konuşabiliyoruz:
     listele  -> GET     ?takim_id=eq.abc
     ekle     -> POST
     guncelle -> PATCH   ?id=eq.xyz
     sil      -> DELETE  ?id=eq.xyz
   Tablolar ve güvenlik kuralları: supabase/schema.sql

   Seçenekler:
     istek      : normalde fetch; testlerde sahtesini veriyoruz.
     jetonGetir : giriş yapan kullanıcının jetonunu veren fonksiyon
                  (js/oturum.js). Veritabanı bu jetona bakarak "bu kullanıcı
                  hangi takımların üyesi" sorusunu cevaplar ve yalnızca o
                  takımların satırlarını gösterir (schema.sql > RLS).
                  Verilmezse herkese açık anon anahtar kullanılır.
   -------------------------------------------------------------------------- */
function supabaseDepoOlustur(url, anahtar, secenekler = {}) {
  const istek = secenekler.istek || ((...args) => fetch(...args));
  const jetonGetir = secenekler.jetonGetir || (async () => anahtar);
  const taban = url.replace(/\/+$/, "") + "/rest/v1/";

  // Bütün isteklerin geçtiği tek yer: başlıkları ekler, hatayı yakalar.
  async function cagir(yontem, yol, govde) {
    const yanit = await istek(taban + yol, {
      method: yontem,
      headers: {
        apikey: anahtar,                                   // hangi proje
        Authorization: "Bearer " + (await jetonGetir()),   // hangi kullanıcı
        "Content-Type": "application/json",
        // Eklenen/güncellenen satırı cevapta geri iste
        Prefer: "return=representation",
      },
      body: govde ? JSON.stringify(govde) : undefined,
    });
    if (!yanit.ok) {
      throw new Error("Supabase hatası (" + yanit.status + "): " + (await yanit.text()));
    }
    // 204 = "başarılı ama içerik yok"
    return yanit.status === 204 ? [] : yanit.json();
  }

  // { takim_id: "abc" } -> "takim_id=eq.abc"   (birden fazlaysa & ile birleşir)
  function filtreSorgusu(filtre) {
    return Object.keys(filtre || {})
      .map((alan) => encodeURIComponent(alan) + "=eq." + encodeURIComponent(filtre[alan]))
      .join("&");
  }

  return {
    tur: "supabase",

    async listele(koleksiyon, filtre) {
      koleksiyonKontrol(koleksiyon);
      const sorgu = filtreSorgusu(filtre);
      return cagir("GET", koleksiyon + "?select=*&order=olusturma.asc" + (sorgu ? "&" + sorgu : ""));
    },

    async oku(koleksiyon, id) {
      koleksiyonKontrol(koleksiyon);
      const satirlar = await cagir("GET", koleksiyon + "?select=*&" + filtreSorgusu({ id: id }));
      return satirlar[0] || null;
    },

    async ekle(koleksiyon, kayit) {
      koleksiyonKontrol(koleksiyon);
      const yeni = yeniKayit(kayit);
      const satirlar = await cagir("POST", koleksiyon, yeni);
      return satirlar[0];
    },

    async guncelle(koleksiyon, id, degisiklik) {
      koleksiyonKontrol(koleksiyon);
      // id ve oluşturma zamanı değiştirilemez (yerel depoyla aynı kural):
      // bu iki alanı ayırıp geri kalanını gönderiyoruz.
      const { id: _id, olusturma: _olusturma, ...govde } = degisiklik;
      const satirlar = await cagir("PATCH", koleksiyon + "?" + filtreSorgusu({ id: id }), govde);
      if (satirlar.length === 0) throw new Error("Kayıt bulunamadı: " + koleksiyon + "/" + id);
      return satirlar[0];
    },

    async sil(koleksiyon, id) {
      koleksiyonKontrol(koleksiyon);
      await cagir("DELETE", koleksiyon + "?" + filtreSorgusu({ id: id }));
    },
  };
}

/* --------------------------------------------------------------------------
   Hangi depo kullanılacak?
   VERI_KATMANI ortam değişkeni belirler (.env -> js/ayarlar.js):
     VERI_KATMANI=yerel     (varsayılan) -> localStorage
     VERI_KATMANI=supabase               -> Supabase (adres ve anahtar da gerekir)
   Uygulamanın geri kalanı bu seçimden habersizdir; sadece "depo" kullanır.
   Ayarların nereden geldiği: js/uygulama.js > ayarlariYukle
   -------------------------------------------------------------------------- */
function veriKatmaniTuru(ayarlar) {
  const tur = (ayarlar && ayarlar.VERI_KATMANI) || "yerel";
  if (tur !== "yerel" && tur !== "supabase") {
    throw new Error('VERI_KATMANI "yerel" ya da "supabase" olmalı (gelen: "' + tur + '").');
  }
  if (tur === "supabase" && !(ayarlar.SUPABASE_URL && ayarlar.SUPABASE_ANON_KEY)) {
    throw new Error("VERI_KATMANI=supabase seçilmiş ama SUPABASE_URL ya da SUPABASE_ANON_KEY eksik.");
  }
  return tur;
}

function depoSec(ayarlar, depolama, secenekler) {
  if (veriKatmaniTuru(ayarlar) === "supabase") {
    return supabaseDepoOlustur(ayarlar.SUPABASE_URL, ayarlar.SUPABASE_ANON_KEY, secenekler);
  }
  return yerelDepoOlustur(depolama);
}

// Node'da (testlerde) bu dosya require() ile yüklenir. Tarayıcıda "module"
// diye bir şey yoktur; orada fonksiyonlar zaten globaldir.
if (typeof module !== "undefined") {
  module.exports = {
    KOLEKSIYONLAR, kimlikUret, filtreyeUyar, yerelDepoOlustur, supabaseDepoOlustur,
    veriKatmaniTuru, depoSec,
  };
}
