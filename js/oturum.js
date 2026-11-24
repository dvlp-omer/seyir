/* ==========================================================================
   OTURUM — Supabase ile giriş (yalnızca Supabase kullanılırken devreye girer)
   --------------------------------------------------------------------------
   Neden gerekli? Veritabanındaki güvenlik kuralları (supabase/schema.sql)
   "kullanıcı yalnızca kendi takımının verisini görsün" der. Bunun için
   veritabanının KİMİN istek attığını bilmesi gerekir. Giriş yapınca Supabase
   bize kısa ömürlü bir "jeton" (access token) verir; veri katmanı her istekte
   bu jetonu gönderir (js/veri.js > supabaseDepoOlustur > jetonGetir).

   Supabase Auth'un REST adresleri kullanılır; ek kütüphane yoktur:
     kayıt   : POST /auth/v1/signup
     giriş   : POST /auth/v1/token?grant_type=password
     yenileme: POST /auth/v1/token?grant_type=refresh_token
     çıkış   : POST /auth/v1/logout

   Jeton yaklaşık 1 saat geçerlidir. Süresi dolmak üzereyken "yenileme jetonu"
   ile sessizce yenisi alınır; kullanıcı tekrar şifre girmez.

   "Beni hatırla":
     işaretli   -> oturum KALICI depoda (localStorage): tarayıcı kapanıp açılsa da
                   giriş açık kalır. E-posta da hatırlanır; çıkıştan sonra hazır gelir.
     işaretsiz  -> oturum GEÇİCİ depoda (sessionStorage): yalnızca o sekme açıkken
                   durur, tarayıcı kapanınca silinir. Ortak bilgisayarlar için.
   Oturum hiçbir zaman iki depoda birden durmaz.

   Parametreler testte sahteleriyle değiştirilebilsin diye dışarıdan verilir:
     depolama (localStorage), istek (fetch), simdi (saat),
     geciciDepolama (sessionStorage; verilmezse "beni hatırla" hep açık sayılır)
   ========================================================================== */

const OTURUM_ANAHTARI = "takim-asistani:oturum";
// Hatırlanan e-posta (yalnızca "beni hatırla" işaretliyken; şifre ASLA saklanmaz)
const EPOSTA_ANAHTARI = "takim-asistani:hatirlanan-eposta";
const JETON_PAYI_MS = 60 * 1000; // bitmesine 1 dakikadan az kaldıysa yenile

// Supabase'in İngilizce hata mesajlarının Türkçeleri
const OTURUM_HATALARI = {
  "Invalid login credentials": "E-posta ya da şifre hatalı.",
  "Email not confirmed": "E-posta adresin henüz onaylanmamış. Gelen kutundaki onay bağlantısına tıkla.",
  "User already registered": "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
};

// Kayıt kapısı (schema.sql > kayit_kapisi) hesabı reddedince gelen mesajlar.
// Gerçek Supabase'de denendi: tetikleyicinin kendi mesajı döner
// ({"code":"P0001","message":"KAYIT_DAVETLI_DEGIL"}). Bazı sürümler bunun
// yerine genel "Database error saving new user" mesajını döndürebilir.
const DAVETSIZ_KAYIT = "Bu e-posta davet listesinde yok. Hesap açabilmen için takım yöneticisinin " +
  "e-postanı Ayarlar > Erişim bölümünden eklemesi gerekir.";
OTURUM_HATALARI["KAYIT_DAVETLI_DEGIL"] = DAVETSIZ_KAYIT;
OTURUM_HATALARI["Database error saving new user"] = DAVETSIZ_KAYIT;

// Şifre işlemlerinin hata mesajları
OTURUM_HATALARI["New password should be different from the old password."] = "Yeni şifre eskisiyle aynı olamaz.";
OTURUM_HATALARI["email rate limit exceeded"] = "Kısa sürede çok fazla e-posta istendi. Biraz bekleyip yeniden dene.";
OTURUM_HATALARI["Email link is invalid or has expired"] =
  "Bağlantının süresi dolmuş ya da daha önce kullanılmış. Giriş ekranından yeni bir sıfırlama bağlantısı iste.";

// Supabase'in metni sayı içeren mesajları (tam eşleşme yerine kalıpla çevrilir)
function hataMesajiCevir(ham) {
  if (OTURUM_HATALARI[ham]) return OTURUM_HATALARI[ham];
  const bekle = /only request this after (\d+) seconds/.exec(ham);
  if (bekle) return "Güvenlik için yeni bağlantıyı " + bekle[1] + " saniye sonra isteyebilirsin.";
  return ham;
}

/* E-postadaki bağlantıdan dönüş: Supabase kullanıcıyı siteye şu ekle geri yollar:
     #access_token=...&refresh_token=...&expires_in=3600&type=recovery   (şifre sıfırlama)
     #access_token=...&type=signup                                        (kayıt onayı)
     #error=access_denied&error_code=otp_expired&error_description=...    (süresi dolmuş)
   Uygulamanın kendi ekran adresleri ("#gorevler") bu kalıba uymaz; null döner. */
function adresEkiniCoz(ek) {
  const metin = String(ek || "").replace(/^#/, "");
  if (!/(^|&)(access_token|error_description|error_code)=/.test(metin)) return null;
  const p = new URLSearchParams(metin);
  if (p.get("error") || p.get("error_code") || p.get("error_description")) {
    const kod = p.get("error_code") || "";
    const aciklama = (p.get("error_description") || "").replace(/\+/g, " ");
    const hata = kod === "otp_expired" ? OTURUM_HATALARI["Email link is invalid or has expired"] : hataMesajiCevir(aciklama || "Bağlantı geçersiz.");
    return { hata };
  }
  const sure = Number(p.get("expires_in"));
  if (!p.get("access_token") || !p.get("refresh_token") || !(sure > 0)) return { hata: "Bağlantı eksik ya da bozuk. Yeni bir bağlantı iste." };
  return { access_token: p.get("access_token"), refresh_token: p.get("refresh_token"), expires_in: sure, tur: p.get("type") || "" };
}

// Davet listesine eklenecek e-posta: küçük harf, boşluksuz, "@" ve nokta içeren
function davetEpostasi(metin) {
  const eposta = String(metin || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta) && eposta.length <= 254 ? eposta : null;
}

function oturumOlustur(url, anahtar, depolama, istek = (...args) => fetch(...args), simdi = () => Date.now(), geciciDepolama = null) {
  const taban = url.replace(/\/+$/, "");

  function oku(yer) {
    try {
      return JSON.parse(yer.getItem(OTURUM_ANAHTARI) || "null");
    } catch (hata) {
      return null; // bozuk kayıt: yokmuş gibi davran
    }
  }

  // Kayıtlı oturum: { access_token, refresh_token, bitis (ms), email } ya da null.
  // Önce kalıcı depoya, yoksa geçici depoya bakılır.
  let oturum = oku(depolama);
  let yer = depolama; // oturumun durduğu depo; jeton yenilenince de aynı yere yazılır
  if (!oturum && geciciDepolama) {
    oturum = oku(geciciDepolama);
    if (oturum) yer = geciciDepolama;
  }

  // Aynı anda birden fazla yenileme isteği gitmesin diye süren isteği saklarız.
  let yenilemeSozu = null;

  function sakla(cevap) {
    oturum = {
      access_token: cevap.access_token,
      refresh_token: cevap.refresh_token,
      bitis: simdi() + cevap.expires_in * 1000,
      email: cevap.user && cevap.user.email ? cevap.user.email : (oturum ? oturum.email : ""),
    };
    yer.setItem(OTURUM_ANAHTARI, JSON.stringify(oturum));
  }

  // Giriş/kayıt öncesi: oturum nereye yazılacak? E-posta hatırlansın mı?
  function yeriSec(hatirla, email) {
    yer = hatirla || !geciciDepolama ? depolama : geciciDepolama;
    // Diğer depoda eski bir oturum kalmasın (iki yerde birden durmasın)
    const diger = yer === depolama ? geciciDepolama : depolama;
    if (diger) diger.removeItem(OTURUM_ANAHTARI);
    if (hatirla) depolama.setItem(EPOSTA_ANAHTARI, email);
    else depolama.removeItem(EPOSTA_ANAHTARI);
  }

  function temizle() {
    oturum = null;
    depolama.removeItem(OTURUM_ANAHTARI);
    if (geciciDepolama) geciciDepolama.removeItem(OTURUM_ANAHTARI);
  }

  // yontem: "POST" (varsayılan), "PUT", "GET" ya da "DELETE". GET/DELETE'te gövde gönderilmez.
  async function gonder(yol, govde, jeton, yontem = "POST") {
    const yanit = await istek(taban + yol, {
      method: yontem,
      headers: {
        apikey: anahtar,
        Authorization: "Bearer " + (jeton || anahtar),
        "Content-Type": "application/json",
        // Tabloya yazarken eklenen satırı geri isteme (rpc ve auth adreslerinde etkisiz bırakılır)
        ...(yol.startsWith("/rest/v1/") && !yol.startsWith("/rest/v1/rpc/") ? { Prefer: "return=minimal" } : {}),
      },
      body: yontem === "POST" || yontem === "PUT" ? JSON.stringify(govde || {}) : undefined,
    });
    // Çıkış, silme gibi istekler gövdesiz (204/201) dönebilir
    const cevap = yanit.status === 204 ? null : await yanit.json().catch(() => null);
    if (!yanit.ok) {
      const ham = (cevap && (cevap.msg || cevap.error_description || cevap.message)) || ("Hata " + yanit.status);
      // Aynı e-posta ikinci kez eklenince veritabanı "duplicate key" der
      if (cevap && cevap.code === "23505") throw new Error("Bu e-posta zaten davet listesinde.");
      throw new Error(hataMesajiCevir(ham));
    }
    return cevap;
  }

  async function jetonuYenile() {
    try {
      sakla(await gonder("/auth/v1/token?grant_type=refresh_token", { refresh_token: oturum.refresh_token }));
    } catch (hata) {
      // Yenileme jetonu da geçersiz: oturum bitti, yeniden giriş gerekir.
      temizle();
      throw new Error("Oturumun süresi doldu. Lütfen yeniden giriş yap.");
    }
  }

  return {
    // Giriş yapan kullanıcı ({ email }) ya da null
    kullanici() {
      return oturum ? { email: oturum.email } : null;
    },

    // "Beni hatırla" işaretli miydi? (Giriş ekranı kutuyu buna göre çizer.)
    // Hatırlanan e-posta varsa onu da verir.
    hatirlananEposta() {
      return depolama.getItem(EPOSTA_ANAHTARI) || "";
    },

    // hatirla: "Beni hatırla" kutusu (varsayılan: işaretli)
    async girisYap(email, sifre, hatirla = true) {
      const cevap = await gonder("/auth/v1/token?grant_type=password", { email: email, password: sifre });
      yeriSec(hatirla, email); // yalnızca giriş BAŞARILI olunca; hatalı denemede eski ayar bozulmasın
      sakla(cevap);
    },

    // Supabase'de "e-posta onayı" açıksa kayıt sonrası jeton gelmez;
    // kullanıcı önce e-postasındaki bağlantıya tıklamalıdır.
    async kayitOl(email, sifre, hatirla = true) {
      const cevap = await gonder("/auth/v1/signup", { email: email, password: sifre });
      if (cevap && cevap.access_token) {
        yeriSec(hatirla, email);
        sakla(cevap);
        return { girisYapildi: true };
      }
      return { girisYapildi: false };
    },

    /* ---- Şifre ---- */

    // "Şifremi unuttum": Supabase bu e-postaya bir sıfırlama bağlantısı yollar.
    // Güvenlik için e-posta kayıtlı olmasa da aynı cevabı verir (kimin kayıtlı
    // olduğu böylece sızmaz). donusAdresi: bağlantının açacağı sayfa; Supabase'in
    // izin listesinde değilse panelde ayarlı "Site URL" kullanılır.
    async sifreSifirlamaIste(email, donusAdresi) {
      const ek = donusAdresi ? "?redirect_to=" + encodeURIComponent(donusAdresi) : "";
      await gonder("/auth/v1/recover" + ek, { email: email });
    },

    // E-postadaki bağlantıyla dönüldüyse (adres eki, bkz. adresEkiniCoz) oturum açar.
    // Döner: null (ek yok) ya da { tur: "recovery" | "signup" | ... }.
    // Bu oturum GEÇİCİ depoya yazılır (bağlantı ortak bir bilgisayarda açılmış olabilir).
    async adrestenOturumAc(ek) {
      const cozulen = adresEkiniCoz(ek);
      if (!cozulen) return null;
      if (cozulen.hata) throw new Error(cozulen.hata);
      let kullanici;
      try {
        kullanici = await gonder("/auth/v1/user", null, cozulen.access_token, "GET");
      } catch (hata) {
        // Jeton geçersiz ya da süresi dolmuş: teknik mesaj yerine anlaşılır olanı
        throw new Error(OTURUM_HATALARI["Email link is invalid or has expired"]);
      }
      yer = geciciDepolama || depolama;
      const diger = yer === depolama ? geciciDepolama : depolama;
      if (diger) diger.removeItem(OTURUM_ANAHTARI);
      sakla({ ...cozulen, user: kullanici });
      return { tur: cozulen.tur };
    },

    // Giriş yapmış kullanıcının şifresini değiştirir (sıfırlama bağlantısından
    // gelindiğinde de bu kullanılır).
    async sifreDegistir(yeniSifre) {
      await gonder("/auth/v1/user", { password: yeniSifre }, await this.jeton(), "PUT");
    },

    async cikisYap() {
      try {
        if (oturum) await gonder("/auth/v1/logout", {}, oturum.access_token);
      } catch (hata) {
        // Sunucuya ulaşılamasa da bu cihazdaki oturumu kapat
      } finally {
        temizle();
      }
    },

    // Geçerli jetonu verir; süresi dolmak üzereyse önce yeniler.
    async jeton() {
      if (!oturum) throw new Error("Giriş yapılmamış.");
      if (oturum.bitis - JETON_PAYI_MS < simdi()) {
        if (!yenilemeSozu) {
          yenilemeSozu = jetonuYenile().finally(() => { yenilemeSozu = null; });
        }
        await yenilemeSozu;
      }
      return oturum.access_token;
    },

    // Davet koduyla bir takıma katılır; takımın kimliğini döner.
    // Veritabanındaki takima_katil fonksiyonunu çağırır (schema.sql).
    async takimaKatil(kod) {
      return gonder("/rest/v1/rpc/takima_katil", { kod: kod.trim() }, await this.jeton());
    },

    /* ---- Erişim: rol ve davet listesi (schema.sql > bölüm 5) ----
       Bu istekleri veritabanı da denetler: yönetici olmayan biri listeyi
       okumaya ya da yazmaya çalışırsa boş liste / hata döner (RLS). */

    // "yonetici" ya da "uye"
    async rolum() {
      return (await gonder("/rest/v1/rpc/rolum", {}, await this.jeton())) || "uye";
    },

    async davetleriListele() {
      return (await gonder("/rest/v1/izinli_epostalar?select=eposta,takim_id,kullanildi,olusturma&order=olusturma.desc",
        null, await this.jeton(), "GET")) || [];
    },

    // takimId verilirse davetli, hesabını açınca o takıma kendiliğinden üye olur
    async davetEkle(eposta, takimId) {
      const temiz = davetEpostasi(eposta);
      if (!temiz) throw new Error("Geçerli bir e-posta adresi yaz.");
      await gonder("/rest/v1/izinli_epostalar", { eposta: temiz, takim_id: takimId || null }, await this.jeton());
      return temiz;
    },

    async davetSil(eposta) {
      await gonder("/rest/v1/izinli_epostalar?eposta=eq." + encodeURIComponent(eposta), null, await this.jeton(), "DELETE");
    },

    /* ---- Roller ve yetkiler (schema.sql > 8. bölüm) ----
       Asıl denetim veritabanındadır: yönetici olmayan biri çağırırsa YETKI_YOK hatası döner. */

    // { yonetici, rol_idleri } — ekranın ne göstereceği js/yetki.js > yetkilerimiHesapla ile hesaplanır
    async yetkilerim(takimId) {
      return gonder("/rest/v1/rpc/yetkilerim", { hedef_takim: takimId }, await this.jeton());
    },

    // Yalnızca yönetici: takımdaki hesaplar [{ kullanici_id, eposta, yonetici, kurucu, rol_idleri }]
    async takimHesaplari(takimId) {
      return (await gonder("/rest/v1/rpc/takim_hesaplari", { hedef_takim: takimId }, await this.jeton())) || [];
    },

    async uyelikGuncelle(takimId, kullaniciId, yonetici, rolIdleri) {
      await gonder("/rest/v1/rpc/uyelik_guncelle",
        { hedef_takim: takimId, hedef_kullanici: kullaniciId, yeni_yonetici: Boolean(yonetici), yeni_roller: rolIdleri || [] },
        await this.jeton());
    },

    async uyeligiKaldir(takimId, kullaniciId) {
      await gonder("/rest/v1/rpc/uyeligi_kaldir", { hedef_takim: takimId, hedef_kullanici: kullaniciId }, await this.jeton());
    },
  };
}

if (typeof module !== "undefined") {
  module.exports = { oturumOlustur, OTURUM_ANAHTARI, EPOSTA_ANAHTARI, davetEpostasi, adresEkiniCoz };
}
