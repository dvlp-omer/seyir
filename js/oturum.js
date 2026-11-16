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
};

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

  async function gonder(yol, govde, jeton) {
    const yanit = await istek(taban + yol, {
      method: "POST",
      headers: {
        apikey: anahtar,
        Authorization: "Bearer " + (jeton || anahtar),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(govde || {}),
    });
    // Çıkış gibi bazı istekler gövdesiz (204) döner
    const cevap = yanit.status === 204 ? null : await yanit.json().catch(() => null);
    if (!yanit.ok) {
      const ham = (cevap && (cevap.msg || cevap.error_description || cevap.message)) || ("Hata " + yanit.status);
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
  };
}

if (typeof module !== "undefined") {
  module.exports = { oturumOlustur, OTURUM_ANAHTARI };
}
