/* ==========================================================================
   VERİ KATMANI
   --------------------------------------------------------------------------
   Uygulamanın geri kalanı veriye SADECE bu dosyadaki "depo" üzerinden ulaşır.
   Bir depo şu beş fonksiyonu sunar (hepsi Promise döner):

     depo.listele(koleksiyon, filtre)   -> kayıt dizisi
     depo.oku(koleksiyon, id)           -> tek kayıt ya da null
     depo.ekle(koleksiyon, kayit)       -> eklenen kayıt (id verilmiş hâli;
                                           kayıtta id varsa o korunur)
     depo.guncelle(koleksiyon, id, degisiklik, secenek) -> güncel kayıt
     depo.sil(koleksiyon, id)           -> (bir şey dönmez)

   AYNI ANDA DÜZENLEME (çakışma) DENETİMİ
   Her kaydın bir "surum" (sürüm) numarası vardır; kayıt her değiştiğinde 1 artar.
   Depo, listele/oku ile EN SON GÖRDÜĞÜ sürümü aklında tutar. guncelle, kaydı
   yalnızca hâlâ o sürümdeyse değiştirir. Arada başka biri değiştirdiyse
   CakismaHatasi fırlatır; ekran "yeniden dene / yine de kaydet" der.
   Hata anında depo kaydın güncel sürümünü öğrenir; böylece kullanıcı ikinci
   kez kaydederse bilerek üzerine yazmış olur.
   secenek.zorla = true: denetimsiz güncelle (programın kendi toplu işleri için;
   ör. silinen üyenin görevlerini sahipsiz bırakmak).
   Sürüm sütunu olmayan eski bir veritabanında denetim kendiliğinden atlanır.

   "koleksiyon" bir tablo adıdır (ör. "gorevler").
   "filtre" isteğe bağlıdır: { takim_id: "abc" } gibi, eşitlik kontrolü yapar.

   Neden hepsi async? localStorage anında cevap verir ama Supabase internet
   üzerinden çalışır. İkisi AYNI arayüzü paylaşsın diye hepsi Promise döner.
   Böylece ekran kodu hangi deponun kullanıldığını bilmek zorunda kalmaz.
   ========================================================================== */

// Uygulamadaki tablolar. Yanlış yazılmış bir ad hemen hata versin diye liste tutuyoruz.
const KOLEKSIYONLAR = ["takimlar", "uyeler", "gorevler", "son_tarihler", "toplantilar", "etkinlikler", "tutanaklar",
  "kisiler", "sablonlar", "kampanyalar", "takim_rolleri", "paydaslar"];

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

// Kayıt, başkası tarafından değiştirildiği için güncellenemedi.
class CakismaHatasi extends Error {
  constructor() {
    super("Bu kaydı sen açtıktan sonra başka biri değiştirdi; senin değişikliğin kaydedilmedi. " +
      "Ekran güncel hâliyle yenilendi. Yine de kaydedersen onun değişikliğinin üzerine yazılır.");
    this.name = "CakismaHatasi";
  }
}

// Depoların "en son görülen sürüm" defteri: "gorevler/abc" -> 3
function surumDefteri() {
  const defter = new Map();
  const anahtar = (koleksiyon, id) => koleksiyon + "/" + id;
  return {
    // Gelen kayıtların sürümünü not et (sürümü olmayan eski kayıtları atla)
    gor(koleksiyon, kayitlar) {
      for (const k of kayitlar) {
        if (k && typeof k.surum === "number") defter.set(anahtar(koleksiyon, k.id), k.surum);
      }
      return kayitlar;
    },
    beklenen(koleksiyon, id) {
      return defter.get(anahtar(koleksiyon, id));
    },
    unut(koleksiyon, id) {
      defter.delete(anahtar(koleksiyon, id));
    },
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
   Not: Proje adı sonradan "Seyir" oldu ama bu ön ek BİLEREK değiştirilmedi.
   Değişseydi tarayıcıda kayıtlı bütün veri (ve tema, oturum, aktif takım
   tercihi) yeni adla aranır, kullanıcıya boş bir uygulama gibi görünürdü.
   Aynı ön ek js/oturum.js, js/tema.js ve js/uygulama.js'te de kullanılır.
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

  const surumler = surumDefteri();

  return {
    tur: "yerel",

    async listele(koleksiyon, filtre) {
      return surumler.gor(koleksiyon, tumunuOku(koleksiyon).filter((kayit) => filtreyeUyar(kayit, filtre)));
    },

    async oku(koleksiyon, id) {
      const kayit = tumunuOku(koleksiyon).find((k) => k.id === id) || null;
      surumler.gor(koleksiyon, [kayit]);
      return kayit;
    },

    async ekle(koleksiyon, kayit) {
      const liste = tumunuOku(koleksiyon);
      const yeni = { ...yeniKayit(kayit), surum: 1 };
      if (liste.some((mevcut) => mevcut.id === yeni.id)) {
        throw new Error("Bu kimlikle bir kayıt zaten var: " + koleksiyon + "/" + yeni.id);
      }
      liste.push(yeni);
      tumunuYaz(koleksiyon, liste);
      surumler.gor(koleksiyon, [yeni]);
      return yeni;
    },

    async guncelle(koleksiyon, id, degisiklik, secenek = {}) {
      const liste = tumunuOku(koleksiyon);
      const sira = liste.findIndex((kayit) => kayit.id === id);
      if (sira === -1) throw new Error("Kayıt bulunamadı: " + koleksiyon + "/" + id);
      const simdiki = liste[sira].surum || 1; // sürümsüz eski kayıt: 1 say
      const beklenen = surumler.beklenen(koleksiyon, id);
      if (!secenek.zorla && beklenen !== undefined && beklenen !== simdiki) {
        surumler.gor(koleksiyon, [{ id: id, surum: simdiki }]); // ikinci deneme bilerek üzerine yazar
        throw new CakismaHatasi();
      }
      // id, oluşturma zamanı ve sürüm dışarıdan değiştirilemez; en sona yazarak koruyoruz.
      liste[sira] = { ...liste[sira], ...degisiklik, id: id, olusturma: liste[sira].olusturma, surum: simdiki + 1 };
      tumunuYaz(koleksiyon, liste);
      surumler.gor(koleksiyon, [liste[sira]]);
      return liste[sira];
    },

    async sil(koleksiyon, id) {
      const liste = tumunuOku(koleksiyon);
      tumunuYaz(koleksiyon, liste.filter((kayit) => kayit.id !== id));
      surumler.unut(koleksiyon, id);
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
     guncelle -> PATCH   ?id=eq.xyz&surum=eq.3   (sürüm tutmazsa 0 satır döner)
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

  const surumler = surumDefteri();

  return {
    tur: "supabase",

    async listele(koleksiyon, filtre) {
      koleksiyonKontrol(koleksiyon);
      const sorgu = filtreSorgusu(filtre);
      return surumler.gor(koleksiyon, await cagir("GET", koleksiyon + "?select=*&order=olusturma.asc" + (sorgu ? "&" + sorgu : "")));
    },

    async oku(koleksiyon, id) {
      koleksiyonKontrol(koleksiyon);
      const satirlar = await cagir("GET", koleksiyon + "?select=*&" + filtreSorgusu({ id: id }));
      surumler.gor(koleksiyon, satirlar);
      return satirlar[0] || null;
    },

    async ekle(koleksiyon, kayit) {
      koleksiyonKontrol(koleksiyon);
      const yeni = yeniKayit(kayit);
      const satirlar = await cagir("POST", koleksiyon, yeni);
      surumler.gor(koleksiyon, satirlar);
      return satirlar[0];
    },

    async guncelle(koleksiyon, id, degisiklik, secenek = {}) {
      koleksiyonKontrol(koleksiyon);
      // id, oluşturma zamanı ve sürüm değiştirilemez (yerel depoyla aynı kural):
      // bu alanları ayırıp geri kalanını gönderiyoruz. Sürümü veritabanı artırır
      // (schema.sql > surum_artir tetikleyicisi).
      const { id: _id, olusturma: _olusturma, surum: _surum, ...govde } = degisiklik;
      const beklenen = secenek.zorla ? undefined : surumler.beklenen(koleksiyon, id);
      // Koşullu güncelleme TEK istekte: "id bu VE sürüm hâlâ bu ise değiştir".
      // Böylece iki kişi aynı anda kaydetse bile ikisi birden geçemez.
      const kosul = filtreSorgusu(beklenen === undefined ? { id: id } : { id: id, surum: beklenen });
      const satirlar = await cagir("PATCH", koleksiyon + "?" + kosul, govde);
      if (satirlar.length === 0) {
        // Ya kayıt silindi ya da sürümü değişti: hangisi olduğuna bak
        const simdiki = await this.oku(koleksiyon, id); // defter güncel sürümü de öğrenir
        if (!simdiki) throw new Error("Kayıt bulunamadı (başka biri silmiş olabilir): " + koleksiyon + "/" + id);
        throw new CakismaHatasi();
      }
      surumler.gor(koleksiyon, satirlar);
      return satirlar[0];
    },

    async sil(koleksiyon, id) {
      koleksiyonKontrol(koleksiyon);
      await cagir("DELETE", koleksiyon + "?" + filtreSorgusu({ id: id }));
      surumler.unut(koleksiyon, id);
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
    veriKatmaniTuru, depoSec, CakismaHatasi,
  };
}
