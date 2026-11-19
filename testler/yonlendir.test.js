// Tanıtım sayfasının yönlendirme kuralı: ana sayfaya gelen ama uygulamayı
// arayan ziyaretçi /uygulama'ya gider (tanitim-kaynak/src/yonlendir.js).  npm test
const test = require("node:test");
const assert = require("node:assert/strict");

async function dene(hash, search = "", pwa = false) {
  const { uygulamayaYonlendir } = await import("../tanitim-kaynak/src/yonlendir.js");
  let gidilen = null;
  const konum = { hash, search, replace: (adres) => { gidilen = adres; } };
  const ortam = { matchMedia: () => ({ matches: pwa }), navigator: {} };
  const sonuc = uygulamayaYonlendir(konum, ortam);
  return { sonuc, gidilen };
}

test("yönlendirme: eski yer imi (/#gorevler) uygulamaya gider, ekran korunur", async () => {
  assert.deepEqual(await dene("#gorevler"), { sonuc: true, gidilen: "/uygulama#gorevler" });
});

test("yönlendirme: e-postadaki şifre sıfırlama / hata bağlantısı uygulamaya gider", async () => {
  assert.deepEqual(await dene("#access_token=abc&expires_in=3600&type=recovery"),
    { sonuc: true, gidilen: "/uygulama#access_token=abc&expires_in=3600&type=recovery" });
  assert.equal((await dene("#error=access_denied&error_code=otp_expired")).gidilen, "/uygulama#error=access_denied&error_code=otp_expired");
});

test("yönlendirme: örnek veri bağlantısı ve ana ekran simgesi uygulamaya gider", async () => {
  assert.equal((await dene("", "?ornek=1")).gidilen, "/uygulama?ornek=1");
  assert.equal((await dene("", "", true)).gidilen, "/uygulama");
});

test("yönlendirme: tanıtımın kendi bölümleri ve boş adres yerinde kalır", async () => {
  for (const ek of ["", "#", "#ozellikler", "#demo", "#vitrin", "#guvenlik", "#sss", "#hikaye", "#yenilikler"]) {
    assert.deepEqual(await dene(ek), { sonuc: false, gidilen: null }, ek);
  }
});
