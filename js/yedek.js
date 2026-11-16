/* ==========================================================================
   YEDEK — bütün veriyi JSON olarak dışa/içe aktarma
   --------------------------------------------------------------------------
   Neden var? localStorage tarayıcıya bağlıdır: tarayıcı verisi silinirse ya da
   cihaz değişirse her şey gider. Yedek dosyası bunun sigortasıdır; aynı
   zamanda veriyi bir cihazdan diğerine (ya da yerelden Supabase'e) taşır.

   Üç iş:
     yedekOlustur(depo)        -> depodaki her şeyi tek nesnede toplar
     yedekCoz(metin)           -> dosya içeriğini DENETLER ve temizler
     yedekYukle(depo, veriler) -> temizlenmiş kayıtları depoya ekler

   En önemli kısım yedekCoz: dışarıdan gelen dosyaya güvenilmez. Her kayıt
   aşağıdaki şemaya göre tek tek denetlenir; şemada olmayan alanlar atılır.
   Bu dosya depo arayüzü dışında hiçbir şeye bağlı değildir; iki depoda da çalışır.
   ========================================================================== */

const YEDEK_UYGULAMA = "takim-asistani";
const YEDEK_SURUMU = 1;
const YEDEK_EN_COK_KAYIT = 20000;
const YEDEK_METIN_SINIRI = 5000;

/* VERİ ŞEMASI — uygulamadaki bütün kayıt türleri ve alanları.
   (Aynı zamanda veri modelinin belgesidir; supabase/schema.sql ile aynıdır.)
   Alan kuralları:
     "metin"     : yazı; yoksa ""             "metin!"  : zorunlu, boş olamaz
     "tarih"     : "" ya da YYYY-AA-GG        "tarih!"  : zorunlu tarih
     "mantik"    : true / false               "sayi"    : 0 ya da pozitif tam sayı
     "liste"     : yazı dizisi                "kararlar": [{ metin, gorev_id }]
     "atifli"    : [{ metin, atif }]  (resmî tutanağın devreden kararları)
     [a, b, c]   : bu değerlerden biri; yoksa ilki */
const YEDEK_SEMASI = {
  takimlar: { ad: "metin!" },
  uyeler: { takim_id: "metin!", ad: "metin!", rol: ["uye", "kaptan"] },
  gorevler: {
    takim_id: "metin!", baslik: "metin!", aciklama: "metin",
    durum: ["yapilacak", "yapiliyor", "bitti"],
    sorumlu_id: "metin", bitis_tarihi: "tarih", toplanti_id: "metin",
  },
  son_tarihler: {
    takim_id: "metin!", baslik: "metin!", tur: ["diger", "rapor", "izin", "etkinlik"],
    tarih: "tarih!", aciklama: "metin", tamamlandi: "mantik",
  },
  toplantilar: {
    takim_id: "metin!", baslik: "metin!", tarih: "tarih!", saat: "metin", yer: "metin",
    katilimci_idler: "liste", yazan_id: "metin", gundem: "liste", kararlar: "kararlar", notlar: "metin",
  },
  etkinlikler: {
    takim_id: "metin!", ad: "metin!", tarih: "tarih!", yer: "metin",
    katilimci_sayisi: "sayi", katilimci_idler: "liste", aciklama: "metin",
  },
  // Resmî toplantı tutanağı (js/tutanak.js). Katılımcılar burada üye kimliği
  // değil, doğrudan ad olarak tutulur (tutanak, yazıldığı günkü hâliyle kalsın).
  tutanaklar: {
    takim_id: "metin!", kurum: "metin", alt_baslik: "metin", numara: "metin",
    toplanti_tarihi: "tarih!", tutanak_tarihi: "tarih", sonraki_toplanti: "metin",
    ek_etiket: "metin", ek_deger: "metin", katilimcilar: "liste",
    devreden_giris: "metin", devreden: "atifli", kararlar: "liste", gorevler: "liste",
    alt_bilgi: "metin", sayfa_altligi: "metin",
  },
};

const metinMi = (deger) => typeof deger === "string" && deger.length <= YEDEK_METIN_SINIRI;

// Tek bir alanı kurala göre denetler. Geçerliyse { deger }, değilse { hata } döner.
function alanTemizle(kural, deger) {
  if (Array.isArray(kural)) {
    if (deger === undefined || deger === null || deger === "") return { deger: kural[0] };
    return kural.includes(deger) ? { deger: deger } : { hata: "izin verilen değerlerden biri değil" };
  }
  switch (kural) {
    case "metin":
      if (deger === undefined || deger === null) return { deger: "" };
      return metinMi(deger) ? { deger: deger } : { hata: "yazı olmalı (en çok " + YEDEK_METIN_SINIRI + " karakter)" };
    case "metin!":
      return metinMi(deger) && deger.trim() !== "" ? { deger: deger } : { hata: "boş olamaz" };
    case "tarih":
      if (deger === undefined || deger === null || deger === "") return { deger: "" };
      return tarihGecerli(deger) ? { deger: deger } : { hata: "geçerli bir tarih değil" };
    case "tarih!":
      return tarihGecerli(deger) ? { deger: deger } : { hata: "geçerli bir tarih değil" };
    case "mantik":
      return { deger: deger === true };
    case "sayi":
      if (deger === undefined || deger === null) return { deger: 0 };
      return Number.isInteger(deger) && deger >= 0 ? { deger: deger } : { hata: "0 ya da pozitif tam sayı olmalı" };
    case "liste":
      if (deger === undefined || deger === null) return { deger: [] };
      return Array.isArray(deger) && deger.every(metinMi) ? { deger: deger } : { hata: "yazı listesi olmalı" };
    case "kararlar":
      if (deger === undefined || deger === null) return { deger: [] };
      if (!Array.isArray(deger) || !deger.every((k) => k && metinMi(k.metin) && (k.gorev_id == null || metinMi(k.gorev_id)))) {
        return { hata: "karar listesi bozuk" };
      }
      // Sadece bilinen iki alanı al
      return { deger: deger.map((k) => ({ metin: k.metin, gorev_id: k.gorev_id || null })) };
    case "atifli":
      if (deger === undefined || deger === null) return { deger: [] };
      if (!Array.isArray(deger) || !deger.every((d) => d && metinMi(d.metin) && (d.atif == null || metinMi(d.atif)))) {
        return { hata: "devreden karar listesi bozuk" };
      }
      return { deger: deger.map((d) => ({ metin: d.metin, atif: d.atif || "" })) };
    default:
      return { hata: "bilinmeyen kural" };
  }
}

// Bir kaydı şemaya göre temizler: sadece bilinen alanlar kalır.
function kayitTemizle(koleksiyon, ham) {
  if (!ham || typeof ham !== "object" || Array.isArray(ham)) return { hata: "kayıt bir nesne değil" };
  if (typeof ham.id !== "string" || ham.id === "" || ham.id.length > 100) return { hata: '"id" eksik ya da geçersiz' };

  const temiz = { id: ham.id };
  if (typeof ham.olusturma === "string" && !Number.isNaN(Date.parse(ham.olusturma))) temiz.olusturma = ham.olusturma;

  for (const [alan, kural] of Object.entries(YEDEK_SEMASI[koleksiyon])) {
    const sonuc = alanTemizle(kural, ham[alan]);
    if (sonuc.hata) return { hata: '"' + alan + '" ' + sonuc.hata };
    temiz[alan] = sonuc.deger;
  }
  return { kayit: temiz };
}

/* Yedek dosyasının içeriğini çözer ve denetler.
   Başarılıysa: { gecerli: true, veriler: { koleksiyon: [temiz kayıtlar] }, sayilar: { koleksiyon: adet } }
   Değilse:     { gecerli: false, hata: "kullanıcıya gösterilecek açıklama" }
   Dosyada tek bir bozuk kayıt bile varsa HİÇBİR ŞEY yüklenmez (ya hep ya hiç). */
function yedekCoz(metin) {
  const reddet = (hata) => ({ gecerli: false, hata: hata });

  let nesne;
  try {
    nesne = JSON.parse(metin);
  } catch (hata) {
    return reddet("Dosya okunamadı: geçerli bir JSON dosyası değil.");
  }
  if (!nesne || typeof nesne !== "object" || nesne.uygulama !== YEDEK_UYGULAMA) {
    return reddet("Bu dosya bir Takım Asistanı yedeği değil.");
  }
  if (nesne.surum !== YEDEK_SURUMU) {
    return reddet("Yedek sürümü desteklenmiyor (dosya: " + nesne.surum + ", beklenen: " + YEDEK_SURUMU + ").");
  }
  if (!nesne.veriler || typeof nesne.veriler !== "object") {
    return reddet('Dosyada "veriler" bölümü yok.');
  }

  const veriler = {};
  const sayilar = {};
  let toplam = 0;
  for (const koleksiyon of KOLEKSIYONLAR) {
    const hamListe = nesne.veriler[koleksiyon] === undefined ? [] : nesne.veriler[koleksiyon];
    if (!Array.isArray(hamListe)) return reddet('"' + koleksiyon + '" bir liste değil.');

    veriler[koleksiyon] = [];
    const gorulen = new Set();
    for (let sira = 0; sira < hamListe.length; sira++) {
      const sonuc = kayitTemizle(koleksiyon, hamListe[sira]);
      if (sonuc.hata) return reddet(koleksiyon + " içindeki " + (sira + 1) + ". kayıt geçersiz: " + sonuc.hata + ".");
      if (gorulen.has(sonuc.kayit.id)) return reddet(koleksiyon + " içinde aynı kimlik iki kez geçiyor.");
      gorulen.add(sonuc.kayit.id);
      veriler[koleksiyon].push(sonuc.kayit);
    }
    sayilar[koleksiyon] = veriler[koleksiyon].length;
    toplam += sayilar[koleksiyon];
  }
  if (toplam > YEDEK_EN_COK_KAYIT) return reddet("Dosyada çok fazla kayıt var (" + toplam + ").");

  // Her kayıt, dosyadaki bir takıma ait olmalı (sahipsiz kayıt ekranda hiç görünmezdi).
  const takimIdleri = new Set(veriler.takimlar.map((t) => t.id));
  for (const koleksiyon of KOLEKSIYONLAR.filter((k) => k !== "takimlar")) {
    if (veriler[koleksiyon].some((kayit) => !takimIdleri.has(kayit.takim_id))) {
      return reddet(koleksiyon + " içinde, dosyada bulunmayan bir takıma ait kayıt var.");
    }
  }

  return { gecerli: true, veriler: veriler, sayilar: sayilar, toplam: toplam };
}

// Depodaki her şeyi tek bir yedek nesnesinde toplar.
async function yedekOlustur(depo) {
  const veriler = {};
  for (const koleksiyon of KOLEKSIYONLAR) {
    veriler[koleksiyon] = await depo.listele(koleksiyon);
  }
  return { uygulama: YEDEK_UYGULAMA, surum: YEDEK_SURUMU, tarih: new Date().toISOString(), veriler: veriler };
}

/* Temizlenmiş kayıtları depoya ekler.
   - Kayıtlar KENDİ kimlikleriyle eklenir; aralarındaki bağlar korunur.
   - Depoda aynı kimlikle kayıt varsa DOKUNULMAZ (atlanır). Yani içe aktarma
     hiçbir şeyin üzerine yazmaz ve aynı dosyayı iki kez yüklemek zararsızdır.
   - KOLEKSIYONLAR listesi "takimlar" ile başlar; önce takımlar eklenir. */
async function yedekYukle(depo, veriler) {
  let eklenen = 0;
  let atlanan = 0;
  for (const koleksiyon of KOLEKSIYONLAR) {
    for (const kayit of veriler[koleksiyon]) {
      if (await depo.oku(koleksiyon, kayit.id)) {
        atlanan++;
      } else {
        await depo.ekle(koleksiyon, kayit);
        eklenen++;
      }
    }
  }
  return { eklenen: eklenen, atlanan: atlanan };
}

if (typeof module !== "undefined") {
  module.exports = { YEDEK_SEMASI, YEDEK_SURUMU, kayitTemizle, yedekCoz, yedekOlustur, yedekYukle };
}
