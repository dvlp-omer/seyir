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

   Parametreler testte sahteleriyle değiştirilebilsin diye dışarıdan verilir:
     depolama (localStorage), istek (fetch), simdi (saat)
   ========================================================================== */

const OTURUM_ANAHTARI = "takim-asistani:oturum";
const JETON_PAYI_MS = 60 * 1000; // bitmesine 1 dakikadan az kaldıysa yenile

// Supabase'in İngilizce hata mesajlarının Türkçeleri
const OTURUM_HATALARI = {
  "Invalid login credentials": "E-posta ya da şifre hatalı.",
  "Email not confirmed": "E-posta adresin henüz onaylanmamış. Gelen kutundaki onay bağlantısına tıkla.",
  "User already registered": "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
  // Kayıt kapısı (schema.sql > kayit_kapisi) hesabı reddedince Supabase bu genel mesajı döner
  "Database error saving new user": "Bu e-posta davet listesinde yok. Hesap açabilmen için takım yöneticisinin " +
    "e-postanı Ayarlar > Erişim bölümünden eklemesi gerekir.",
};

// Davet listesine eklenecek e-posta: küçük harf, boşluksuz, "@" ve nokta içeren
function davetEpostasi(metin) {
  const eposta = String(metin || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta) && eposta.length <= 254 ? eposta : null;
}

function oturumOlustur(url, anahtar, depolama, istek = (...args) => fetch(...args), simdi = () => Date.now()) {
  const taban = url.replace(/\/+$/, "");

  // Kayıtlı oturum: { access_token, refresh_token, bitis (ms), email } ya da null
  let oturum = null;
  try {
    oturum = JSON.parse(depolama.getItem(OTURUM_ANAHTARI) || "null");
  } catch (hata) {
    oturum = null;
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
    depolama.setItem(OTURUM_ANAHTARI, JSON.stringify(oturum));
  }

  function temizle() {
    oturum = null;
    depolama.removeItem(OTURUM_ANAHTARI);
  }

  // yontem: "POST" (varsayılan), "GET" ya da "DELETE". GET/DELETE'te gövde gönderilmez.
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
      body: yontem === "POST" ? JSON.stringify(govde || {}) : undefined,
    });
    // Çıkış, silme gibi istekler gövdesiz (204/201) dönebilir
    const cevap = yanit.status === 204 ? null : await yanit.json().catch(() => null);
    if (!yanit.ok) {
      const ham = (cevap && (cevap.msg || cevap.error_description || cevap.message)) || ("Hata " + yanit.status);
      // Aynı e-posta ikinci kez eklenince veritabanı "duplicate key" der
      if (cevap && cevap.code === "23505") throw new Error("Bu e-posta zaten davet listesinde.");
      throw new Error(OTURUM_HATALARI[ham] || ham);
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

    async girisYap(email, sifre) {
      sakla(await gonder("/auth/v1/token?grant_type=password", { email: email, password: sifre }));
    },

    // Supabase'de "e-posta onayı" açıksa kayıt sonrası jeton gelmez;
    // kullanıcı önce e-postasındaki bağlantıya tıklamalıdır.
    async kayitOl(email, sifre) {
      const cevap = await gonder("/auth/v1/signup", { email: email, password: sifre });
      if (cevap && cevap.access_token) {
        sakla(cevap);
        return { girisYapildi: true };
      }
      return { girisYapildi: false };
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
  };
}

if (typeof module !== "undefined") {
  module.exports = { oturumOlustur, OTURUM_ANAHTARI, davetEpostasi };
}
