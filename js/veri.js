/* ==========================================================================
   VERİ KATMANI
   --------------------------------------------------------------------------
   Uygulamanın geri kalanı veriye SADECE bu dosyadaki "depo" üzerinden ulaşır.
   Bir depo şu beş fonksiyonu sunar (hepsi Promise döner):

     depo.listele(koleksiyon, filtre)   -> kayıt dizisi
     depo.oku(koleksiyon, id)           -> tek kayıt ya da null
     depo.ekle(koleksiyon, kayit)       -> eklenen kayıt (id verilmiş hâli)
     depo.guncelle(koleksiyon, id, degisiklik) -> güncel kayıt
     depo.sil(koleksiyon, id)           -> (bir şey dönmez)

   "koleksiyon" bir tablo adıdır (ör. "gorevler").
   "filtre" isteğe bağlıdır: { takim_id: "abc" } gibi, eşitlik kontrolü yapar.

   Neden hepsi async? localStorage anında cevap verir ama Supabase internet
   üzerinden çalışır. İkisi AYNI arayüzü paylaşsın diye hepsi Promise döner.
   Böylece ekran kodu hangi deponun kullanıldığını bilmek zorunda kalmaz.
   ========================================================================== */

// Uygulamadaki tablolar. Yanlış yazılmış bir ad hemen hata versin diye liste tutuyoruz.
const KOLEKSIYONLAR = ["takimlar", "uyeler", "gorevler", "son_tarihler", "toplantilar"];

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
      const yeni = { ...kayit, id: kimlikUret(), olusturma: new Date().toISOString() };
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
   Hangi depo kullanılacak?
   Şimdilik sadece yerel depo var. Supabase sürümü eklendiğinde seçim burada
   yapılacak; uygulamanın geri kalanı değişmeyecek.
   -------------------------------------------------------------------------- */
function depoSec(ayarlar, depolama) {
  return yerelDepoOlustur(depolama);
}

// Node'da (testlerde) bu dosya require() ile yüklenir. Tarayıcıda "module"
// diye bir şey yoktur; orada fonksiyonlar zaten globaldir.
if (typeof module !== "undefined") {
  module.exports = { KOLEKSIYONLAR, kimlikUret, filtreyeUyar, yerelDepoOlustur, depoSec };
}
