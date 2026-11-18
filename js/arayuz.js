/* ==========================================================================
   ARAYÜZ — bütün ekranların ortak kullandığı parçalar
   - ekranKaydet : bir ekranı menüye ekler
   - eylemleriBagla : düğme tıklamalarını fonksiyonlara bağlar
   - formAc : tek bir fonksiyonla bütün ekle/düzenle formları
   - bildir : kısa bilgi mesajı
   ========================================================================== */

/* ---------- Ekran kaydı ----------
   Her ekran dosyası (js/ekranlar/*.js) kendini buraya kaydeder:
     ekranKaydet("gorevler", { baslik, kisaAd, simge, ciz, sifirla })
   "ciz(kok)" ekranın HTML'ini kok elemanının içine yazar.
   "sifirla()" isteğe bağlıdır: menüden ekrana basılınca alt görünümü
   (ör. açık tutanağı) kapatıp ekranı ilk hâline döndürür.
   Menü bu listeden otomatik oluşur. */
const EKRANLAR = {};
const EKRAN_SIRASI = [];

function ekranKaydet(ad, tanim) {
  EKRANLAR[ad] = tanim;
  EKRAN_SIRASI.push(ad);
}

// Kısayol: document.querySelector
function sec(secici) {
  return document.querySelector(secici);
}

/* ---------- Tıklama eylemleri ----------
   HTML'de:  <button data-eylem="sil" data-id="abc">Sil</button>
   JS'de:    eylemleriBagla(kok, { sil: (id) => ... })
   Her düğmeye ayrı dinleyici yerine kapsayıcıya TEK dinleyici koyuyoruz ve
   tıklanan düğmenin data-eylem değerine bakıyoruz ("olay delegasyonu").

   eylemSuruyor: bir eylem bitmeden ikincisi başlamasın diye kilit. Bu olmadan
   hızlı çift tıklama aynı kaydı iki kez oluşturabiliyordu (RAPOR.md > H1). */
let eylemSuruyor = false;

function eylemleriBagla(kok, eylemler) {
  kok.onclick = async (olay) => {
    const dugme = olay.target.closest("[data-eylem]");
    if (!dugme || !kok.contains(dugme) || dugme.disabled) return;
    const islev = eylemler[dugme.dataset.eylem];
    if (!islev || eylemSuruyor) return;

    eylemSuruyor = true;
    try {
      await islev(dugme.dataset.id, dugme);
    } catch (hata) {
      hataGoster(hata);
    } finally {
      eylemSuruyor = false;
    }
  };
}

function hataGoster(hata) {
  console.error(hata);
  // Başkası bu kaydı değiştirdi: uyar ve ekranı güncel veriyle yeniden çiz
  if (hata && hata.name === "CakismaHatasi") {
    bildir("Bu kayıt başka biri tarafından değiştirilmiş; ekran yenilendi. İşlemi yeniden dene.");
    return yenile();
  }
  bildir("Bir hata oluştu: " + hata.message);
}

/* ---------- Bildirim ---------- */
let bildirimZamanlayici = null;

function bildir(mesaj) {
  const kutu = sec("#bildirim");
  kutu.textContent = mesaj;
  kutu.classList.add("acik");
  clearTimeout(bildirimZamanlayici);
  bildirimZamanlayici = setTimeout(() => kutu.classList.remove("acik"), 3200);
}

/* ---------- Form penceresi ----------
   Kullanım:
     formAc({
       baslik: "Yeni görev",
       alanlar: [
         { ad: "baslik", etiket: "Başlık", tur: "metin", zorunlu: true },
         { ad: "durum", etiket: "Durum", tur: "secim", secenekler: [{ deger, etiket }] },
       ],
       degerler: { baslik: "..." },          // düzenlemede mevcut değerler
       kaydet: async (degerler) => { ... },  // "Kaydet"e basılınca çağrılır
     });
   Alan türleri: metin, uzun (çok satır), tarih, saat, sayi, secim, coklu */
const UZUN_METIN_SINIRI = 2000;

function alanHtml(alan, deger) {
  const ad = htmlKacis(alan.ad);
  const zorunlu = alan.zorunlu ? " required" : "";
  const ipucu = alan.ipucu ? "<small>" + htmlKacis(alan.ipucu) + "</small>" : "";
  const etiket = "<span>" + htmlKacis(alan.etiket) + (alan.zorunlu ? " *" : "") + "</span>";

  if (alan.tur === "coklu") {
    const secili = deger || [];
    const kutular = alan.secenekler.map((s) =>
      '<label><input type="checkbox" name="' + ad + '" value="' + htmlKacis(s.deger) + '"' +
      (secili.includes(s.deger) ? " checked" : "") + "> " + htmlKacis(s.etiket) + "</label>"
    ).join("");
    return '<fieldset class="alan"><legend>' + htmlKacis(alan.etiket) + "</legend>" +
      '<div class="secenekler">' + (kutular || '<span class="soluk kucuk-yazi">Önce Takım ekranından üye ekle.</span>') +
      "</div>" + ipucu + "</fieldset>";
  }

  let giris;
  if (alan.tur === "uzun") {
    giris = '<textarea name="' + ad + '" maxlength="' + UZUN_METIN_SINIRI + '"' + zorunlu + ">" + htmlKacis(deger) + "</textarea>";
  } else if (alan.tur === "secim") {
    const secenekler = alan.secenekler.map((s) =>
      '<option value="' + htmlKacis(s.deger) + '"' + (s.deger === (deger || "") ? " selected" : "") + ">" +
      htmlKacis(s.etiket) + "</option>"
    ).join("");
    giris = '<select name="' + ad + '"' + zorunlu + ">" + secenekler + "</select>";
  } else if (alan.tur === "sayi") {
    giris = '<input type="number" name="' + ad + '" value="' + htmlKacis(deger) + '" min="0" max="100000" step="1" inputmode="numeric"' + zorunlu + ">";
  } else if (alan.tur === "tarih") {
    giris = '<input type="date" name="' + ad + '" value="' + htmlKacis(deger) + '" min="' + EN_ERKEN_TARIH + '" max="' + EN_GEC_TARIH + '"' + zorunlu + ">";
  } else if (alan.tur === "saat") {
    giris = '<input type="time" name="' + ad + '" value="' + htmlKacis(deger) + '"' + zorunlu + ">";
  } else {
    giris = '<input type="text" name="' + ad + '" value="' + htmlKacis(deger) + '" maxlength="200" autocomplete="off"' + zorunlu + ">";
  }
  return '<label class="alan">' + etiket + giris + ipucu + "</label>";
}

// Formdaki değerleri { alanAdi: deger } nesnesi olarak toplar.
function formDegerleri(form, alanlar) {
  const sonuc = {};
  for (const alan of alanlar) {
    if (alan.tur === "coklu") {
      sonuc[alan.ad] = [...form.querySelectorAll('input[name="' + alan.ad + '"]:checked')].map((k) => k.value);
    } else if (alan.tur === "sayi") {
      const ham = form.elements[alan.ad].value.trim();
      sonuc[alan.ad] = ham === "" ? 0 : Number(ham);
    } else {
      sonuc[alan.ad] = form.elements[alan.ad].value.trim();
    }
  }
  return sonuc;
}

// Değerleri denetler; sorun varsa kullanıcıya gösterilecek mesajı döner.
function formHatasi(alanlar, degerler) {
  for (const alan of alanlar) {
    const deger = degerler[alan.ad];
    if (alan.zorunlu && (deger === "" || deger == null)) {
      return '"' + alan.etiket + '" alanı boş bırakılamaz.';
    }
    if (alan.tur === "tarih" && deger && !tarihGecerli(deger)) {
      return '"' + alan.etiket + '" geçerli bir tarih değil (2000–2100 arası olmalı).';
    }
    if (alan.tur === "sayi" && (!Number.isInteger(deger) || deger < 0 || deger > 100000)) {
      return '"' + alan.etiket + '" 0 ile 100000 arasında tam sayı olmalı.';
    }
  }
  return null;
}

/* Taslak: form yazılırken değerler tarayıcıya saklanır (js/kolaylik.js).
   Sayfa yenilenir ya da pencere yanlışlıkla kapanırsa, aynı form yeniden
   açıldığında yazılanlar geri gelir. Taslak; kayıt başarılı olunca ya da
   "Vazgeç"e basılınca silinir. Anahtar formun başlangıç değerlerini de
   içerir: başka bir kaydın formunda bu taslak çıkmaz. */
function tarayiciDeposu() {
  try { return window.localStorage; } catch (hata) { return null; }
}

function saatYaz(zaman) {
  const d = new Date(zaman);
  const gun = d.toDateString() === new Date().toDateString() ? "bugün" : d.toLocaleDateString("tr-TR");
  return gun + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function formAc({ baslik, alanlar, degerler = {}, kaydetYazi = "Kaydet", kaydet }) {
  const pencere = sec("#pencere");
  const depo = tarayiciDeposu();
  const taslakAdi = taslakAnahtari("form", durum.takim && durum.takim.id, baslik, degerler);
  const taslak = depo && taslakOku(depo, taslakAdi);
  const gosterilen = taslak ? { ...degerler, ...taslak.veri } : degerler;

  pencere.setAttribute("aria-labelledby", "pencere-baslik"); // ekran okuyucu pencerenin adını okusun
  pencere.innerHTML =
    '<form class="form" novalidate>' +
    '<h2 id="pencere-baslik">' + htmlKacis(baslik) + "</h2>" +
    (taslak
      ? '<p class="form-bilgi taslak-notu">Kaydedilmemiş taslağın geri yüklendi (' + htmlKacis(saatYaz(taslak.zaman)) + "). " +
        '<button type="button" class="baglanti-dugme" data-taslak-at>Taslağı at</button></p>'
      : "") +
    alanlar.map((alan) => alanHtml(alan, gosterilen[alan.ad])).join("") +
    '<p class="form-hata" role="alert" hidden></p>' +
    '<div class="form-dugmeler">' +
    '<button type="button" class="dugme" data-kapat>Vazgeç</button>' +
    '<button type="submit" class="dugme ana">' + htmlKacis(kaydetYazi) + "</button>" +
    "</div></form>";

  const form = pencere.querySelector("form");
  const hataKutusu = form.querySelector(".form-hata");
  const kaydetDugmesi = form.querySelector('[type="submit"]');
  form.querySelector("[data-kapat]").onclick = () => {
    if (depo) taslakSil(depo, taslakAdi);
    pencere.close();
  };
  const taslakAt = form.querySelector("[data-taslak-at]");
  if (taslakAt) {
    taslakAt.onclick = () => {
      taslakSil(depo, taslakAdi);
      formAc({ baslik, alanlar, degerler, kaydetYazi, kaydet }); // özgün değerlerle yeniden aç
      bildir("Taslak silindi");
    };
  }
  // Her değişiklikte sakla (yazı, seçim, işaret kutusu)
  form.oninput = form.onchange = () => {
    if (depo) taslakKaydet(depo, taslakAdi, formDegerleri(form, alanlar));
  };

  form.onsubmit = async (olay) => {
    olay.preventDefault(); // sayfanın yenilenmesini engelle
    if (kaydetDugmesi.disabled) return; // kayıt sürerken ikinci gönderimi yok say (H1)

    const sonuc = formDegerleri(form, alanlar);
    const hata = formHatasi(alanlar, sonuc);
    if (hata) {
      hataKutusu.textContent = hata;
      hataKutusu.hidden = false;
      return;
    }

    kaydetDugmesi.disabled = true;
    try {
      await kaydet(sonuc);
      if (depo) taslakSil(depo, taslakAdi);
      pencere.close(); // odak, pencereyi açan düğmeye geri döner
      await yenile();  // ekranı güncel veriyle yeniden çiz (uygulama.js)
    } catch (hataNesnesi) {
      console.error(hataNesnesi);
      kaydetDugmesi.disabled = false;
      if (hataNesnesi.name === "CakismaHatasi") {
        // Form açık kalır (yazdıkların kaybolmaz); arkadaki ekran güncel hâliyle
        // yenilenir. İkinci basış bilerek üzerine yazar (js/veri.js).
        hataKutusu.textContent = hataNesnesi.message;
        kaydetDugmesi.textContent = "Yine de kaydet";
        yenile();
      } else {
        hataKutusu.textContent = "Kaydedilemedi: " + hataNesnesi.message;
      }
      hataKutusu.hidden = false;
    }
  };

  if (!pencere.open) pencere.showModal(); // "Taslağı at" formu açıkken yeniden çizer
}

/* ---------- Küçük HTML yardımcıları ---------- */

// Menüde kullanılan çizgi simgeler (24x24 SVG yolu).
function simgeHtml(yol) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + yol + '"/></svg>';
}

// <option> listesi üretir.
function secenekHtml(secenekler, secili) {
  return secenekler.map((s) =>
    '<option value="' + htmlKacis(s.deger) + '"' + (s.deger === secili ? " selected" : "") + ">" +
    htmlKacis(s.etiket) + "</option>"
  ).join("");
}

// Üye listesini form seçeneklerine çevirir.
function uyeSecenekleri(uyeler, bosEtiket) {
  const secenekler = uyeler.map((uye) => ({ deger: uye.id, etiket: uye.ad }));
  if (bosEtiket) secenekler.unshift({ deger: "", etiket: bosEtiket });
  return secenekler;
}

// id'den üye adını bulur; üye silinmişse boş metin döner.
function uyeAdi(uyeler, id) {
  const uye = uyeler.find((u) => u.id === id);
  return uye ? uye.ad : "";
}

// Bitiş tarihi için renkli "3 gün kaldı" rozeti.
function kalanRozet(tarih) {
  if (!tarih) return "";
  const gun = kalanGun(tarih, bugun());
  return '<span class="rozet ' + aciliyet(gun) + '">' + kalanGunMetni(gun) + "</span>";
}

/* Kayıt düğmesi: aynı adlı düğmeler ("Düzenle", "Sil") ekran okuyucuda
   ayırt edilsin diye aria-label'a kaydın adını da ekler (RAPOR.md > E4).
     kayitDugmesi("sil", gorev.id, "Sil", gorev.baslik, "tehlike")
     -> <button ... aria-label="Sil: Rapor taslağı">Sil</button> */
function kayitDugmesi(eylem, id, yazi, kayitAdi, ekSinif) {
  return '<button class="dugme kucuk ' + (ekSinif || "") + '" data-eylem="' + eylem + '" data-id="' + htmlKacis(id) +
    '" aria-label="' + htmlKacis(yazi + ": " + kayitAdi) + '">' + htmlKacis(yazi) + "</button>";
}
