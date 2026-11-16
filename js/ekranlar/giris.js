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
    '<label class="alan"><span>Şifre</span><input type="password" name="sifre" autocomplete="current-password" minlength="' + SIFRE_EN_AZ + '" required>' +
    "<small>En az " + SIFRE_EN_AZ + " karakter.</small></label>" +
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

  form.onsubmit = async (olay) => {
    olay.preventDefault();
    // Hangi düğmeyle gönderildi? (Enter'a basılırsa ilk düğme: giriş)
    const islem = olay.submitter ? olay.submitter.dataset.islem : "giris";
    const email = form.elements.email.value.trim();
    const sifre = form.elements.sifre.value;

    if (!/^\S+@\S+\.\S+$/.test(email)) return goster("Geçerli bir e-posta adresi yaz.");
    if (sifre.length < SIFRE_EN_AZ) return goster("Şifre en az " + SIFRE_EN_AZ + " karakter olmalı.");

    const dugmeler = [...form.querySelectorAll("button")];
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
