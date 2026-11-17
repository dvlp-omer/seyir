/* ==========================================================================
   EKRAN: Giriş (yalnızca Supabase kullanılırken görünür)
   localStorage ile çalışırken bu ekran hiç açılmaz; giriş gerekmez.
   Menüde yer almaz: giriş yapılmamışsa uygulama.js doğrudan bunu çizer.
   Şifreler bu uygulamada saklanmaz; doğrudan Supabase'e gönderilir
   (js/oturum.js). Uygulama yalnızca geri gelen jetonu tutar.
   ========================================================================== */

const SIFRE_EN_AZ = 8;

function girisEkraniCiz(kok) {
  kok.innerHTML =
    '<form class="kart giris-kart" id="giris-formu" novalidate>' +
    "<h2>Giriş yap</h2>" +
    '<p class="soluk" style="margin:6px 0 16px">Takımının verisi bulutta saklanıyor. Görmek için giriş yap.</p>' +
    '<label class="alan"><span>E-posta</span><input type="email" name="email" autocomplete="email" required></label>' +
    // Şifre kutusu + "Göster" düğmesi. Düğme type="button": formu GÖNDERMEZ.
    // Etiket <label for> ile bağlı; düğme label'ın dışında ki tıklayınca odak kutuya kaymasın.
    '<div class="alan"><label for="giris-sifre"><span>Şifre</span></label>' +
    '<div class="sifre-kutu">' +
    '<input type="password" id="giris-sifre" name="sifre" autocomplete="current-password" minlength="' + SIFRE_EN_AZ + '" required>' +
    '<button type="button" class="dugme kucuk sifre-goster" aria-controls="giris-sifre" aria-pressed="false">Göster</button>' +
    "</div>" +
    "<small>En az " + SIFRE_EN_AZ + " karakter.</small></div>" +
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

  // Şifreyi göster / gizle: kutunun türünü password <-> text yapar.
  // aria-pressed, ekran okuyucuya düğmenin açık mı kapalı mı olduğunu söyler.
  const sifreKutusu = form.elements.sifre;
  const sifreDugmesi = form.querySelector(".sifre-goster");
  sifreDugmesi.onclick = () => {
    const gorunur = sifreKutusu.type === "password";
    sifreKutusu.type = gorunur ? "text" : "password";
    sifreDugmesi.textContent = gorunur ? "Gizle" : "Göster";
    sifreDugmesi.setAttribute("aria-pressed", String(gorunur));
    sifreKutusu.focus(); // yazmaya kalınan yerden devam edilsin
  };

  form.onsubmit = async (olay) => {
    olay.preventDefault();
    // Hangi düğmeyle gönderildi? (Enter'a basılırsa ilk düğme: giriş)
    const islem = olay.submitter ? olay.submitter.dataset.islem : "giris";
    const email = form.elements.email.value.trim();
    const sifre = form.elements.sifre.value;

    if (!/^\S+@\S+\.\S+$/.test(email)) return goster("Geçerli bir e-posta adresi yaz.");
    if (sifre.length < SIFRE_EN_AZ) return goster("Şifre en az " + SIFRE_EN_AZ + " karakter olmalı.");

    const dugmeler = [...form.querySelectorAll('button[type="submit"]')];
    dugmeler.forEach((d) => { d.disabled = true; }); // çift gönderimi önle
    try {
      if (islem === "kayit") {
        const sonuc = await durum.oturum.kayitOl(email, sifre);
        if (!sonuc.girisYapildi) {
          dugmeler.forEach((d) => { d.disabled = false; });
          return goster("Hesap oluşturuldu. E-postana gelen onay bağlantısına tıkla, sonra buradan giriş yap.");
        }
      } else {
        await durum.oturum.girisYap(email, sifre);
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
