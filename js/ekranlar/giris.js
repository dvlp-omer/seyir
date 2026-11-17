/* ==========================================================================
   EKRAN: Giriş (yalnızca Supabase kullanılırken görünür)
   localStorage ile çalışırken bu ekran hiç açılmaz; giriş gerekmez.
   Menüde yer almaz: giriş yapılmamışsa uygulama.js doğrudan bunu çizer.
   Şifreler bu uygulamada saklanmaz; doğrudan Supabase'e gönderilir
   (js/oturum.js). Uygulama yalnızca geri gelen jetonu tutar.

   Bu dosyada üç görünüm var:
     girisEkraniCiz       : e-posta + şifre, "Beni hatırla", "Şifremi unuttum"
     sifremiUnuttumCiz    : sıfırlama bağlantısı isteme
     yeniSifreEkraniCiz   : e-postadaki bağlantıyla gelince yeni şifre belirleme
   Ayarlar ekranındaki "Şifreyi değiştir" de buradaki yeniSifreFormu'nu kullanır.
   ========================================================================== */

const SIFRE_EN_AZ = 8;

// Uygulama açılırken e-postadaki bağlantıdan gelen bir hata varsa (ör. süresi
// dolmuş bağlantı) giriş ekranında bir kez gösterilir. uygulama.js doldurur.
let girisNotu = null;

/* ---------- Ortak parçalar ---------- */

// Şifre kutusu + "Göster" düğmesi. Düğme type="button": formu GÖNDERMEZ.
// Etiket <label for> ile bağlı; düğme label'ın dışında ki tıklayınca odak kutuya kaymasın.
function sifreAlaniHtml(id, ad, etiket, autocomplete, ipucu) {
  return '<div class="alan"><label for="' + id + '"><span>' + etiket + "</span></label>" +
    '<div class="sifre-kutu">' +
    '<input type="password" id="' + id + '" name="' + ad + '" autocomplete="' + autocomplete + '" minlength="' + SIFRE_EN_AZ + '" required>' +
    '<button type="button" class="dugme kucuk sifre-goster" aria-controls="' + id + '" aria-pressed="false">Göster</button>' +
    "</div>" + (ipucu ? "<small>" + ipucu + "</small>" : "") + "</div>";
}

// Bir alandaki bütün "Göster" düğmelerini çalıştırır: kutunun türünü password <-> text yapar.
// aria-pressed, ekran okuyucuya düğmenin açık mı kapalı mı olduğunu söyler.
function sifreGosterBagla(kok) {
  kok.querySelectorAll(".sifre-goster").forEach((dugme) => {
    const kutu = kok.querySelector("#" + dugme.getAttribute("aria-controls"));
    dugme.onclick = () => {
      const gorunur = kutu.type === "password";
      kutu.type = gorunur ? "text" : "password";
      dugme.textContent = gorunur ? "Gizle" : "Göster";
      dugme.setAttribute("aria-pressed", String(gorunur));
      kutu.focus(); // yazmaya kalınan yerden devam edilsin
    };
  });
}

// Yeni şifre + tekrarı. Hem "yeni şifre belirle" ekranında hem Ayarlar'da kullanılır.
function yeniSifreAlanlariHtml() {
  return sifreAlaniHtml("yeni-sifre", "yeni", "Yeni şifre", "new-password", "En az " + SIFRE_EN_AZ + " karakter.") +
    sifreAlaniHtml("yeni-sifre-tekrar", "tekrar", "Yeni şifre (tekrar)", "new-password");
}

// İki kutuyu denetler; sorun yoksa null, varsa Türkçe mesaj döner.
function yeniSifreHatasi(yeni, tekrar) {
  if (yeni.length < SIFRE_EN_AZ) return "Şifre en az " + SIFRE_EN_AZ + " karakter olmalı.";
  if (yeni !== tekrar) return "İki şifre aynı değil.";
  return null;
}

// form: yeniSifreAlanlariHtml içeren form. Başarılı olunca tamam() çağrılır.
function yeniSifreFormuBagla(form, tamam) {
  const mesaj = form.querySelector(".form-hata");
  const gonderDugmeleri = [...form.querySelectorAll('button[type="submit"]')];
  sifreGosterBagla(form);
  form.onsubmit = async (olay) => {
    olay.preventDefault();
    const hata = yeniSifreHatasi(form.elements.yeni.value, form.elements.tekrar.value);
    if (hata) { mesaj.textContent = hata; mesaj.hidden = false; return; }
    gonderDugmeleri.forEach((d) => { d.disabled = true; });
    try {
      await durum.oturum.sifreDegistir(form.elements.yeni.value);
      await tamam();
    } catch (hataNesnesi) {
      console.error(hataNesnesi);
      mesaj.textContent = hataNesnesi.message;
      mesaj.hidden = false;
      gonderDugmeleri.forEach((d) => { d.disabled = false; });
    }
  };
}

/* ---------- Giriş ---------- */

function girisEkraniCiz(kok) {
  kok.innerHTML =
    '<form class="kart giris-kart" id="giris-formu" novalidate>' +
    "<h2>Giriş yap</h2>" +
    '<p class="soluk" style="margin:6px 0 16px">Takımının verisi bulutta saklanıyor. Görmek için giriş yap.</p>' +
    '<label class="alan"><span>E-posta</span><input type="email" name="email" autocomplete="email" required></label>' +
    sifreAlaniHtml("giris-sifre", "sifre", "Şifre", "current-password", "En az " + SIFRE_EN_AZ + " karakter.") +
    '<p class="unuttum"><button type="button" class="baglanti-dugme" data-unuttum>Şifremi unuttum</button></p>' +
    // Beni hatırla: işaretsizse oturum tarayıcı kapanınca biter (js/oturum.js)
    '<label class="hatirla"><input type="checkbox" name="hatirla" checked> Beni hatırla</label>' +
    '<p class="soluk kucuk-yazi hatirla-not">Ortak bir bilgisayardaysan işareti kaldır: tarayıcıyı kapatınca çıkış yapılır.</p>' +
    '<p class="form-hata" role="alert" hidden></p>' +
    '<div class="form-dugmeler" style="justify-content:flex-start">' +
    '<button type="submit" class="dugme ana" data-islem="giris">Giriş yap</button>' +
    '<button type="submit" class="dugme" data-islem="kayit">Yeni hesap aç</button>' +
    "</div>" +
    // Kayıt herkese açık değil (schema.sql > bölüm 5). Kullanıcı neden hesap açamadığını bilsin.
    '<p class="soluk kucuk-yazi" style="margin-top:14px">Hesap açmak <b>davetlidir</b>: e-postanı önce takım yöneticisi ' +
    "davet listesine eklemelidir. Uygulamayı kuran ilk kişinin hesabı yönetici olur.</p></form>";

  const form = sec("#giris-formu");
  const mesaj = form.querySelector(".form-hata");
  const goster = (metin) => { mesaj.textContent = metin; mesaj.hidden = false; };

  // E-postadaki bağlantıdan gelen bir uyarı varsa bir kez göster
  if (girisNotu) { goster(girisNotu); girisNotu = null; }

  // Daha önce "beni hatırla" ile girildiyse e-posta hazır gelsin.
  const hatirlanan = durum.oturum.hatirlananEposta();
  if (hatirlanan) form.elements.email.value = hatirlanan;

  sifreGosterBagla(form);
  form.querySelector("[data-unuttum]").onclick = () => sifremiUnuttumCiz(kok, form.elements.email.value.trim());

  form.onsubmit = async (olay) => {
    olay.preventDefault();
    // Hangi düğmeyle gönderildi? (Enter'a basılırsa ilk düğme: giriş)
    const islem = olay.submitter ? olay.submitter.dataset.islem : "giris";
    const email = form.elements.email.value.trim();
    const sifre = form.elements.sifre.value;
    const hatirla = form.elements.hatirla.checked;

    if (!/^\S+@\S+\.\S+$/.test(email)) return goster("Geçerli bir e-posta adresi yaz.");
    if (sifre.length < SIFRE_EN_AZ) return goster("Şifre en az " + SIFRE_EN_AZ + " karakter olmalı.");

    const dugmeler = [...form.querySelectorAll('button[type="submit"]')];
    dugmeler.forEach((d) => { d.disabled = true; }); // çift gönderimi önle
    try {
      if (islem === "kayit") {
        const sonuc = await durum.oturum.kayitOl(email, sifre, hatirla);
        if (!sonuc.girisYapildi) {
          dugmeler.forEach((d) => { d.disabled = false; });
          return goster("Hesap oluşturuldu. E-postana gelen onay bağlantısına tıkla, sonra buradan giriş yap.");
        }
      } else {
        await durum.oturum.girisYap(email, sifre, hatirla);
      }
      await takimlariYukle();
      await yenile();
    } catch (hata) {
      console.error(hata);
      dugmeler.forEach((d) => { d.disabled = false; });
      goster(hata.message);
    }
  };
}

/* ---------- Şifremi unuttum ---------- */

function sifremiUnuttumCiz(kok, eposta) {
  kok.innerHTML =
    '<form class="kart giris-kart" id="unuttum-formu" novalidate>' +
    "<h2>Şifremi unuttum</h2>" +
    '<p class="soluk" style="margin:6px 0 16px">E-postanı yaz; şifreni yenilemen için bir bağlantı gönderelim. ' +
    "Bağlantı tek kullanımlıktır ve kısa süre geçerlidir.</p>" +
    '<label class="alan"><span>E-posta</span><input type="email" name="email" autocomplete="email" required></label>' +
    '<p class="form-hata" role="alert" hidden></p>' +
    '<p class="form-bilgi" role="status" hidden></p>' +
    '<div class="form-dugmeler" style="justify-content:flex-start">' +
    '<button type="submit" class="dugme ana">Bağlantı gönder</button>' +
    '<button type="button" class="dugme" data-geri>Girişe dön</button>' +
    "</div></form>";

  const form = sec("#unuttum-formu");
  const hataKutusu = form.querySelector(".form-hata");
  const bilgiKutusu = form.querySelector(".form-bilgi");
  const gonderDugmesi = form.querySelector('button[type="submit"]');
  form.elements.email.value = eposta || "";
  form.elements.email.focus();
  form.querySelector("[data-geri]").onclick = () => girisEkraniCiz(kok);

  form.onsubmit = async (olay) => {
    olay.preventDefault();
    hataKutusu.hidden = true;
    bilgiKutusu.hidden = true;
    const email = form.elements.email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      hataKutusu.textContent = "Geçerli bir e-posta adresi yaz.";
      hataKutusu.hidden = false;
      return;
    }
    gonderDugmesi.disabled = true;
    try {
      // Bağlantı bu sayfaya dönsün (adresin ekran kısmı "#..." olmadan)
      await durum.oturum.sifreSifirlamaIste(email, location.origin + location.pathname);
      // Kayıtlı olmayan e-postada da aynı mesaj: kimin kayıtlı olduğu belli olmasın.
      bilgiKutusu.textContent = "Bu e-posta kayıtlıysa bir sıfırlama bağlantısı gönderdik. " +
        "Gelen kutunu (ve gereksiz klasörünü) kontrol et; bağlantıya bu cihazda tıkla.";
      bilgiKutusu.hidden = false;
    } catch (hata) {
      console.error(hata);
      hataKutusu.textContent = hata.message;
      hataKutusu.hidden = false;
    } finally {
      gonderDugmesi.disabled = false;
    }
  };
}

/* ---------- Yeni şifre belirle (e-postadaki bağlantıdan gelince) ---------- */

function yeniSifreEkraniCiz(kok) {
  const kullanici = durum.oturum.kullanici();
  kok.innerHTML =
    '<form class="kart giris-kart" id="yeni-sifre-formu" novalidate>' +
    "<h2>Yeni şifre belirle</h2>" +
    '<p class="soluk" style="margin:6px 0 16px">Hesap: <b>' + htmlKacis(kullanici ? kullanici.email : "") + "</b></p>" +
    yeniSifreAlanlariHtml() +
    '<p class="form-hata" role="alert" hidden></p>' +
    '<div class="form-dugmeler" style="justify-content:flex-start">' +
    '<button type="submit" class="dugme ana">Şifreyi kaydet</button>' +
    '<button type="button" class="dugme" data-simdi-degil>Şimdi değil</button>' +
    "</div></form>";

  const form = sec("#yeni-sifre-formu");
  form.elements.yeni.focus();
  const devam = async () => {
    durum.sifreYenileme = false;
    await takimlariYukle();
    await yenile();
  };
  form.querySelector("[data-simdi-degil]").onclick = devam;
  yeniSifreFormuBagla(form, async () => {
    bildir("Şifren değiştirildi");
    await devam();
  });
}

/* ---------- Ayarlar > Şifreyi değiştir (pencere) ---------- */

function sifreDegistirPenceresi() {
  const pencere = sec("#pencere");
  pencere.setAttribute("aria-labelledby", "pencere-baslik");
  pencere.innerHTML =
    '<form class="form" novalidate>' +
    '<h2 id="pencere-baslik">Şifreyi değiştir</h2>' +
    yeniSifreAlanlariHtml() +
    '<p class="form-hata" role="alert" hidden></p>' +
    '<div class="form-dugmeler">' +
    '<button type="button" class="dugme" data-kapat>Vazgeç</button>' +
    '<button type="submit" class="dugme ana">Şifreyi kaydet</button>' +
    "</div></form>";
  const form = pencere.querySelector("form");
  form.querySelector("[data-kapat]").onclick = () => pencere.close();
  yeniSifreFormuBagla(form, async () => {
    pencere.close();
    bildir("Şifren değiştirildi");
  });
  pencere.showModal();
  form.elements.yeni.focus();
}
