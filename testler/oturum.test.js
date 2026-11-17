// Giriş (oturum) testleri.  npm test
//
// Gerçek Supabase'e bağlanılmaz. fetch'in yerine, Supabase Auth adreslerini
// taklit eden sahte bir sunucu; saatin yerine elle ilerletilen bir sayaç kullanılır.
const test = require("node:test");
const assert = require("node:assert/strict");
const { oturumOlustur, OTURUM_ANAHTARI, EPOSTA_ANAHTARI, davetEpostasi } = require("../js/oturum.js");

const ADRES = "https://ornek.supabase.co";
const ANAHTAR = "anon-anahtar";

function sahteDepolama() {
  const kutu = {};
  return {
    getItem: (a) => (a in kutu ? kutu[a] : null),
    setItem: (a, d) => { kutu[a] = String(d); },
    removeItem: (a) => { delete kutu[a]; },
    kutu,
  };
}

// Tek kullanıcılı sahte Auth sunucusu: ayse@ornek.com / dogru-sifre
function sahteAuth(secenekler = {}) {
  const istekler = [];
  let jetonSayaci = 0;
  let gecerliYenileme = null;

  const cevap = (durum, govde) => ({ ok: durum < 400, status: durum, json: async () => govde });
  const yeniOturum = (email) => {
    jetonSayaci++;
    gecerliYenileme = "yenileme-" + jetonSayaci;
    return { access_token: "jeton-" + jetonSayaci, refresh_token: gecerliYenileme, expires_in: 3600, user: { email } };
  };

  async function sahteFetch(adres, ayar) {
    const govde = JSON.parse(ayar.body || "{}");
    istekler.push({ adres, govde, headers: ayar.headers });

    if (adres.endsWith("grant_type=password")) {
      if (govde.email === "ayse@ornek.com" && govde.password === "dogru-sifre") return cevap(200, yeniOturum(govde.email));
      return cevap(400, { error_description: "Invalid login credentials" });
    }
    if (adres.endsWith("grant_type=refresh_token")) {
      // Yenileme jetonu tek kullanımlıktır
      if (govde.refresh_token === gecerliYenileme) return cevap(200, yeniOturum("ayse@ornek.com"));
      return cevap(400, { error_description: "Invalid Refresh Token" });
    }
    if (adres.endsWith("/auth/v1/signup") && !govde.email.startsWith("davetsiz")) {
      if (govde.email === "ayse@ornek.com") return cevap(422, { msg: "User already registered" });
      return secenekler.epostaOnayi
        ? cevap(200, { id: "u2", email: govde.email })   // jeton yok: önce e-posta onaylanmalı
        : cevap(200, yeniOturum(govde.email));
    }
    if (adres.endsWith("/auth/v1/logout")) return { ok: true, status: 204, json: async () => null };
    // Kayıt kapısı: davet listesinde olmayan e-posta (schema.sql > kayit_kapisi)
    if (adres.endsWith("/auth/v1/signup") && govde.email === "davetsiz@ornek.com") {
      // Gerçek Supabase'in verdiği cevap (17.11.2026'da denendi)
      return cevap(500, { code: "P0001", message: "KAYIT_DAVETLI_DEGIL" });
    }
    if (adres.endsWith("/auth/v1/signup") && govde.email === "davetsiz-eski@ornek.com") {
      // Bazı Supabase sürümlerinin genel mesajı
      return cevap(500, { code: 500, error_code: "unexpected_failure", msg: "Database error saving new user" });
    }
    if (adres.endsWith("/rest/v1/rpc/rolum")) return cevap(200, secenekler.rol || "uye");
    if (adres.includes("/rest/v1/izinli_epostalar")) {
      if (ayar.method === "GET") return cevap(200, [{ eposta: "ece@ornek.com", takim_id: null, kullanildi: false }]);
      if (ayar.method === "DELETE") return { ok: true, status: 204, json: async () => null };
      if (govde.eposta === "var@ornek.com") return cevap(409, { code: "23505", message: "duplicate key value violates unique constraint" });
      if (secenekler.rol !== "yonetici") return cevap(403, { code: "42501", message: "new row violates row-level security policy for table \"izinli_epostalar\"" });
      return { ok: true, status: 201, json: async () => { throw new Error("gövde yok"); } };
    }
    if (adres.endsWith("/rest/v1/rpc/takima_katil")) {
      return govde.kod === "dogrukod" ? cevap(200, "takim-1") : cevap(400, { message: "Davet kodu geçersiz" });
    }
    return cevap(404, { message: "bilinmeyen adres" });
  }
  return { sahteFetch, istekler };
}

// Elle ilerletilen saat
function sahteSaat() {
  let an = 1_000_000;
  return { simdi: () => an, ilerlet: (ms) => { an += ms; } };
}

function kur(secenekler) {
  const sunucu = sahteAuth(secenekler);
  const depolama = sahteDepolama();
  const saat = sahteSaat();
  const oturum = oturumOlustur(ADRES, ANAHTAR, depolama, sunucu.sahteFetch, saat.simdi);
  return { sunucu, depolama, saat, oturum };
}

test("başlangıçta kimse giriş yapmamış; jeton istemek hata verir", async () => {
  const { oturum } = kur();
  assert.equal(oturum.kullanici(), null);
  await assert.rejects(() => oturum.jeton(), /Giriş yapılmamış/);
});

test("girisYap: doğru bilgiyle oturum açılır, jeton verilir, oturum saklanır", async () => {
  const { oturum, depolama, sunucu } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");

  assert.deepEqual(oturum.kullanici(), { email: "ayse@ornek.com" });
  assert.equal(await oturum.jeton(), "jeton-1");
  assert.ok(depolama.kutu[OTURUM_ANAHTARI]);
  assert.equal(sunucu.istekler[0].headers.apikey, ANAHTAR);
});

test("girisYap: yanlış şifrede Türkçe hata, oturum açılmaz", async () => {
  const { oturum } = kur();
  await assert.rejects(() => oturum.girisYap("ayse@ornek.com", "yanlis"), /E-posta ya da şifre hatalı/);
  assert.equal(oturum.kullanici(), null);
});

test("şifre depolamaya ASLA yazılmaz", async () => {
  const { oturum, depolama } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");
  assert.equal(JSON.stringify(depolama.kutu).includes("dogru-sifre"), false);
});

test("sayfa yenilenince oturum depolamadan geri gelir", async () => {
  const { oturum, depolama, sunucu, saat } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");

  const yeniSayfa = oturumOlustur(ADRES, ANAHTAR, depolama, sunucu.sahteFetch, saat.simdi);
  assert.deepEqual(yeniSayfa.kullanici(), { email: "ayse@ornek.com" });
  assert.equal(await yeniSayfa.jeton(), "jeton-1");
});

test("bozuk kayıtlı oturum uygulamayı çökertmez", () => {
  const depolama = sahteDepolama();
  depolama.setItem(OTURUM_ANAHTARI, "{bozuk");
  const oturum = oturumOlustur(ADRES, ANAHTAR, depolama, sahteAuth().sahteFetch);
  assert.equal(oturum.kullanici(), null);
});

test("jeton: süresi dolmadan yenilenmez; dolmak üzereyken yenilenir", async () => {
  const { oturum, saat, sunucu } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");

  saat.ilerlet(30 * 60 * 1000); // 30 dakika: hâlâ geçerli
  assert.equal(await oturum.jeton(), "jeton-1");
  assert.equal(sunucu.istekler.length, 1);

  saat.ilerlet(29.5 * 60 * 1000); // bitmesine 30 saniye kaldı
  assert.equal(await oturum.jeton(), "jeton-2");
  assert.deepEqual(oturum.kullanici(), { email: "ayse@ornek.com" }); // e-posta korunur
});

test("jeton: aynı anda gelen istekler tek bir yenileme yapar", async () => {
  const { oturum, saat, sunucu } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");
  saat.ilerlet(61 * 60 * 1000);

  // Bir ekran açılırken üç liste birden istenir (Promise.all)
  const jetonlar = await Promise.all([oturum.jeton(), oturum.jeton(), oturum.jeton()]);
  assert.deepEqual(jetonlar, ["jeton-2", "jeton-2", "jeton-2"]);
  assert.equal(sunucu.istekler.filter((i) => i.adres.includes("refresh_token")).length, 1);
});

test("jeton: yenileme başarısızsa oturum kapanır ve yeniden giriş istenir", async () => {
  const { oturum, saat, depolama } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");
  // Yenileme jetonunu boz (ör. başka cihazda çıkış yapıldı)
  const kayit = JSON.parse(depolama.kutu[OTURUM_ANAHTARI]);
  const bozuk = sahteDepolama();
  bozuk.setItem(OTURUM_ANAHTARI, JSON.stringify({ ...kayit, refresh_token: "gecersiz" }));
  const eski = oturumOlustur(ADRES, ANAHTAR, bozuk, sahteAuth().sahteFetch, saat.simdi);

  saat.ilerlet(2 * 60 * 60 * 1000);
  await assert.rejects(() => eski.jeton(), /süresi doldu/);
  assert.equal(eski.kullanici(), null);
  assert.equal(bozuk.kutu[OTURUM_ANAHTARI], undefined);
});

test("kayitOl: e-posta onayı kapalıysa doğrudan giriş yapılır", async () => {
  const { oturum } = kur({ epostaOnayi: false });
  assert.deepEqual(await oturum.kayitOl("yeni@ornek.com", "uzun-bir-sifre"), { girisYapildi: true });
  assert.deepEqual(oturum.kullanici(), { email: "yeni@ornek.com" });
});

test("kayitOl: e-posta onayı açıksa giriş yapılmaz, kullanıcı onaya yönlendirilir", async () => {
  const { oturum } = kur({ epostaOnayi: true });
  assert.deepEqual(await oturum.kayitOl("yeni@ornek.com", "uzun-bir-sifre"), { girisYapildi: false });
  assert.equal(oturum.kullanici(), null);
});

test("kayitOl: kayıtlı e-postada Türkçe hata", async () => {
  const { oturum } = kur();
  await assert.rejects(() => oturum.kayitOl("ayse@ornek.com", "uzun-bir-sifre"), /zaten bir hesap var/);
});

test("cikisYap: oturum silinir; sunucuya ulaşılamasa bile", async () => {
  const { oturum, depolama, sunucu } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");
  await oturum.cikisYap();
  assert.equal(oturum.kullanici(), null);
  assert.equal(depolama.kutu[OTURUM_ANAHTARI], undefined);
  assert.equal(sunucu.istekler.at(-1).headers.Authorization, "Bearer jeton-1"); // çıkış kullanıcı jetonuyla

  const depolama2 = sahteDepolama();
  depolama2.setItem(OTURUM_ANAHTARI, JSON.stringify({ access_token: "j", refresh_token: "y", bitis: 9e15, email: "a@b.c" }));
  const cevrimdisi = oturumOlustur(ADRES, ANAHTAR, depolama2, async () => { throw new Error("ağ yok"); });
  await cevrimdisi.cikisYap();
  assert.equal(cevrimdisi.kullanici(), null);
});

test("takimaKatil: kodu kullanıcının jetonuyla gönderir; geçersiz kodda sunucunun mesajını verir", async () => {
  const { oturum, sunucu } = kur();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");

  assert.equal(await oturum.takimaKatil("  dogrukod "), "takim-1"); // baştaki/sondaki boşluk temizlenir
  const istek = sunucu.istekler.at(-1);
  assert.deepEqual(istek.govde, { kod: "dogrukod" });
  assert.equal(istek.headers.Authorization, "Bearer jeton-1");

  await assert.rejects(() => oturum.takimaKatil("yanlis"), /Davet kodu geçersiz/);
});

/* ---------- Davetle kayıt ve davet listesi (schema.sql > bölüm 5) ---------- */

test("kayitOl: davet listesinde olmayan e-postada anlaşılır Türkçe hata, oturum açılmaz", async () => {
  const sunucu = sahteAuth();
  const oturum = oturumOlustur(ADRES, ANAHTAR, sahteDepolama(), sunucu.sahteFetch);
  await assert.rejects(() => oturum.kayitOl("davetsiz@ornek.com", "uzun-bir-sifre"), /davet listesinde yok/);
  await assert.rejects(() => oturum.kayitOl("davetsiz-eski@ornek.com", "uzun-bir-sifre"), /davet listesinde yok/);
  assert.equal(oturum.kullanici(), null);
});

test("davetEpostasi: küçük harfe çevirir, geçersizi reddeder", () => {
  assert.equal(davetEpostasi("  Ece.Demir@Ornek.COM "), "ece.demir@ornek.com");
  for (const kotu of ["", "ece", "ece@", "@ornek.com", "ece @ornek.com", "ece@ornek"]) assert.equal(davetEpostasi(kotu), null, kotu);
});

test("rolum, davetleriListele, davetEkle, davetSil: doğru adres, yöntem ve kullanıcının jetonu", async () => {
  const sunucu = sahteAuth({ rol: "yonetici" });
  const oturum = oturumOlustur(ADRES, ANAHTAR, sahteDepolama(), sunucu.sahteFetch);
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre");

  assert.equal(await oturum.rolum(), "yonetici");
  assert.deepEqual((await oturum.davetleriListele()).map((d) => d.eposta), ["ece@ornek.com"]);
  assert.equal(await oturum.davetEkle(" Yeni@Ornek.com ", "takim-1"), "yeni@ornek.com");
  await oturum.davetSil("yeni+etiket@ornek.com");

  const son = sunucu.istekler.slice(-4);
  assert.ok(son[0].adres.endsWith("/rest/v1/rpc/rolum"));
  assert.match(son[1].adres, /\/rest\/v1\/izinli_epostalar\?select=.*&order=olusturma\.desc$/);
  assert.deepEqual(son[2].govde, { eposta: "yeni@ornek.com", takim_id: "takim-1" });
  assert.equal(son[2].headers.Prefer, "return=minimal");
  assert.ok(son[3].adres.endsWith("izinli_epostalar?eposta=eq.yeni%2Betiket%40ornek.com")); // + ve @ kodlanır
  for (const istek of son) assert.equal(istek.headers.Authorization, "Bearer jeton-1"); // anon anahtarı değil
});

test("davetEkle: yinelenen e-posta ve yönetici olmayan kullanıcı anlaşılır hata alır", async () => {
  const yonetici = oturumOlustur(ADRES, ANAHTAR, sahteDepolama(), sahteAuth({ rol: "yonetici" }).sahteFetch);
  await yonetici.girisYap("ayse@ornek.com", "dogru-sifre");
  await assert.rejects(() => yonetici.davetEkle("var@ornek.com"), /zaten davet listesinde/);
  await assert.rejects(() => yonetici.davetEkle("gecersiz"), /Geçerli bir e-posta/);

  const uye = oturumOlustur(ADRES, ANAHTAR, sahteDepolama(), sahteAuth({ rol: "uye" }).sahteFetch);
  await uye.girisYap("ayse@ornek.com", "dogru-sifre");
  assert.equal(await uye.rolum(), "uye");
  await assert.rejects(() => uye.davetEkle("yeni@ornek.com"), /row-level security/);
});

/* ---- "Beni hatırla" ----
   kalici = localStorage'ın, gecici = sessionStorage'ın yerine geçen sahte depolar. */
function hatirlaKur() {
  const sunucu = sahteAuth();
  const kalici = sahteDepolama();
  const gecici = sahteDepolama();
  const saat = sahteSaat();
  const yeni = () => oturumOlustur(ADRES, ANAHTAR, kalici, sunucu.sahteFetch, saat.simdi, gecici);
  return { sunucu, kalici, gecici, saat, yeni };
}

test("beni hatırla işaretli: oturum ve e-posta kalıcı depoda, geçicide yok", async () => {
  const { kalici, gecici, yeni } = hatirlaKur();
  await yeni().girisYap("ayse@ornek.com", "dogru-sifre", true);
  assert.ok(kalici.kutu[OTURUM_ANAHTARI]);
  assert.equal(gecici.kutu[OTURUM_ANAHTARI], undefined);
  assert.equal(kalici.kutu[EPOSTA_ANAHTARI], "ayse@ornek.com");
  // "Tarayıcı kapanıp açıldı": geçici depo silinir, oturum yine gelir
  for (const a of Object.keys(gecici.kutu)) delete gecici.kutu[a];
  assert.deepEqual(yeni().kullanici(), { email: "ayse@ornek.com" });
});

test("beni hatırla işaretsiz: oturum yalnızca geçici depoda; tarayıcı kapanınca biter", async () => {
  const { kalici, gecici, yeni } = hatirlaKur();
  const oturum = yeni();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre", false);
  assert.equal(kalici.kutu[OTURUM_ANAHTARI], undefined);
  assert.ok(gecici.kutu[OTURUM_ANAHTARI]);
  assert.equal(oturum.hatirlananEposta(), "");
  assert.equal(await oturum.jeton(), "jeton-1");
  // Aynı sekmede sayfa yenilenince oturum sürer
  assert.deepEqual(yeni().kullanici(), { email: "ayse@ornek.com" });
  // Tarayıcı kapanınca geçici depo boşalır: giriş gerekir
  for (const a of Object.keys(gecici.kutu)) delete gecici.kutu[a];
  assert.equal(yeni().kullanici(), null);
});

test("beni hatırla işaretsiz: jeton yenilenince de geçici depoda kalır", async () => {
  const { kalici, gecici, saat, yeni } = hatirlaKur();
  const oturum = yeni();
  await oturum.girisYap("ayse@ornek.com", "dogru-sifre", false);
  saat.ilerlet(3600 * 1000);
  assert.equal(await oturum.jeton(), "jeton-2");
  assert.equal(kalici.kutu[OTURUM_ANAHTARI], undefined);
  assert.match(gecici.kutu[OTURUM_ANAHTARI], /jeton-2/);
});

test("hatırlamadan girince eski hatırlanan oturum ve e-posta silinir; çıkış e-postayı silmez", async () => {
  const { kalici, gecici, yeni } = hatirlaKur();
  await yeni().girisYap("ayse@ornek.com", "dogru-sifre", true);
  const ikinci = yeni();
  await ikinci.girisYap("ayse@ornek.com", "dogru-sifre", false);
  assert.equal(kalici.kutu[OTURUM_ANAHTARI], undefined);
  assert.equal(kalici.kutu[EPOSTA_ANAHTARI], undefined);

  const ucuncu = yeni();
  await ucuncu.girisYap("ayse@ornek.com", "dogru-sifre", true);
  await ucuncu.cikisYap();
  assert.equal(kalici.kutu[OTURUM_ANAHTARI], undefined);
  assert.equal(gecici.kutu[OTURUM_ANAHTARI], undefined);
  assert.equal(ucuncu.hatirlananEposta(), "ayse@ornek.com"); // bir sonraki girişte hazır gelsin
  assert.equal(JSON.stringify(kalici.kutu).includes("dogru-sifre"), false);
});

test("hatalı giriş denemesi hatırlama ayarını bozmaz", async () => {
  const { kalici, yeni } = hatirlaKur();
  await yeni().girisYap("ayse@ornek.com", "dogru-sifre", true);
  await assert.rejects(() => yeni().girisYap("ayse@ornek.com", "yanlis", false), /hatalı/);
  assert.ok(kalici.kutu[OTURUM_ANAHTARI]);
  assert.equal(kalici.kutu[EPOSTA_ANAHTARI], "ayse@ornek.com");
});