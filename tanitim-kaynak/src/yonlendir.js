// Ana sayfaya gelen ama aslında UYGULAMAYI arayan ziyaretçiyi oraya gönderir.
// Uygulama eskiden ana adresteydi (/), şimdi /uygulama'da; bu yüzden:
//   - eski yer imleri:        /#gorevler, /#tutanaklar ...      -> /uygulama#gorevler
//   - e-posta bağlantıları:   /#access_token=...&type=recovery  -> /uygulama#access_token=...
//     (Supabase'in "Site URL" ayarı hâlâ ana adresi gösteriyorsa)
//   - ana ekrana eklenmiş eski uygulama simgesi (PWA, start_url "/")
//   - örnek veri bağlantısı:  /?ornek=1                         -> /uygulama?ornek=1
// Tanıtım sayfasının kendi bölüm bağlantıları (#ozellikler gibi) yönlendirilmez.
// Dönen değer true ise sayfa çizilmez (tarayıcı zaten başka adrese gidiyor).
const TANITIM_BOLUMLERI = new Set(["", "ozellikler", "demo", "vitrin", "guvenlik"]);

export function uygulamayaYonlendir(konum = window.location, ortam = window) {
  const ek = konum.hash.slice(1);
  const oturumBaglantisi = /(^|&)(access_token|refresh_token|error_code|error)=/.test(ek);
  const eskiEkran = ek !== "" && !TANITIM_BOLUMLERI.has(ek);
  const ornek = new URLSearchParams(konum.search).has("ornek");
  const anaEkranSimgesi = (ortam.matchMedia && ortam.matchMedia("(display-mode: standalone)").matches) ||
    ortam.navigator?.standalone === true;
  if (oturumBaglantisi || eskiEkran || ornek || anaEkranSimgesi) {
    konum.replace("/uygulama" + konum.search + konum.hash);
    return true;
  }
  return false;
}
