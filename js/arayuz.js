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

/* ---------- Genel arama penceresi (Ctrl+K, "/" ya da üstteki "Ara") ----------
   Açılınca takımın bütün kayıtları bir kez okunur ve dizin kurulur
   (js/kolaylik.js > aramaDizini). Her tuşta yalnızca bu dizinde aranır;
   ağa istek gitmez. ↑ ↓ sonuçlar arasında gezer, Enter açar. */
async function aramaPenceresiAc() {
  const pencere = sec("#pencere");
  if (pencere.open || !durum.takim) return; // açık bir formun üstüne açma (yazılan kaybolmasın)
  const kayitlar = {};
  const koleksiyonlar = { gorevler: "gorevler", sonTarihler: "son_tarihler", toplantilar: "toplantilar",
    tutanaklar: "tutanaklar", etkinlikler: "etkinlikler", kisiler: "kisiler", uyeler: "uyeler" };
  try {
    await Promise.all(Object.entries(koleksiyonlar).map(async ([ad, koleksiyon]) => {
      kayitlar[ad] = await takimKayitlari(koleksiyon);
    }));
  } catch (hata) {
    return hataGoster(hata);
  }
  const dizin = aramaDizini(kayitlar);

  pencere.setAttribute("aria-labelledby", "pencere-baslik");
  pencere.innerHTML =
    '<div class="form arama-pencere">' +
    '<h2 id="pencere-baslik">Ara</h2>' +
    '<label class="alan"><span class="gizli">Aranacak sözcük</span>' +
    '<input type="search" id="arama-kutu" placeholder="Görev, toplantı, tutanak, kişi…" autocomplete="off" aria-describedby="arama-ipucu"></label>' +
    '<p id="arama-durum" class="soluk kucuk-yazi" role="status"></p>' +
    '<ul id="arama-sonuc" class="arama-sonuc"></ul>' +
    '<p id="arama-ipucu" class="soluk kucuk-yazi">↑ ↓ ile seç, Enter ile aç, Esc ile kapat. Türkçe harf farkı önemsenmez (“gorev” = “görev”).</p>' +
    '<div class="form-dugmeler"><button type="button" class="dugme" data-kapat>Kapat</button></div></div>';

  const kutu = pencere.querySelector("#arama-kutu");
  const liste = pencere.querySelector("#arama-sonuc");
  const durumYazi = pencere.querySelector("#arama-durum");
  let sonuclar = [];

  const ciz = () => {
    sonuclar = aramaYap(dizin, kutu.value);
    liste.innerHTML = sonuclar.map((s, sira) =>
      '<li><button type="button" class="arama-oge" data-sira="' + sira + '">' +
      '<span class="arama-tur">' + htmlKacis(s.turAdi) + "</span>" +
      '<span class="arama-baslik">' + htmlKacis(s.baslik) + "</span>" +
      (s.ayrinti ? '<span class="soluk kucuk-yazi">' +
        // "2026-11-25 · Atölye" -> "25 Kasım 2026 · Atölye"
        htmlKacis(s.ayrinti.replace(/\d{4}-\d{2}-\d{2}/g, (t) => tarihGecerli(t) ? tarihYaz(t, false) : t)) + "</span>" : "") +
      "</button></li>").join("");
    durumYazi.textContent = kutu.value.trim()
      ? (sonuclar.length ? sonuclar.length + " sonuç" : "Sonuç yok")
      : dizin.length + " kayıt içinde ara";
  };
  const ac = (sira) => {
    const sonuc = sonuclar[sira];
    if (!sonuc) return;
    pencere.close();
    aramaSonucunuAc(sonuc, kayitlar);
  };

  kutu.oninput = ciz;
  kutu.onkeydown = (olay) => {
    if (olay.key === "Enter") { olay.preventDefault(); ac(0); }
    if (olay.key === "ArrowDown") { olay.preventDefault(); const ilk = liste.querySelector("button"); if (ilk) ilk.focus(); }
  };
  liste.onclick = (olay) => {
    const dugme = olay.target.closest("[data-sira]");
    if (dugme) ac(Number(dugme.dataset.sira));
  };
  liste.onkeydown = (olay) => {
    const dugmeler = [...liste.querySelectorAll("button")];
    const sira = dugmeler.indexOf(document.activeElement);
    if (olay.key === "ArrowDown" && sira < dugmeler.length - 1) { olay.preventDefault(); dugmeler[sira + 1].focus(); }
    if (olay.key === "ArrowUp") { olay.preventDefault(); (sira > 0 ? dugmeler[sira - 1] : kutu).focus(); }
  };
  pencere.querySelector("[data-kapat]").onclick = () => pencere.close();

  ciz();
  pencere.showModal();
  kutu.focus();
}

// Seçilen sonucun ekranına git; mümkünse kaydın kendisini aç.
function aramaSonucunuAc(sonuc, kayitlar) {
  const bul = (liste) => liste.find((k) => k.id === sonuc.id);
  if (sonuc.tur === "tutanak") Object.assign(tutanakEkrani, { kip: "goruntule", id: sonuc.id, taslak: null });
  if (sonuc.tur === "toplanti") acikToplantiId = sonuc.id;
  if (sonuc.tur === "kisi") Object.assign(kisiEkrani, { arama: sonuc.baslik, etiket: "" });
  ekranaGit(sonuc.ekran);
  if (sonuc.tur === "gorev") {
    const gorev = bul(kayitlar.gorevler);
    if (gorev) gorevFormu({ gorev: gorev, uyeler: kayitlar.uyeler });
  }
}

/* ---------- Klavye kısayolları ----------
   Hangi tuşun ne yaptığı js/kolaylik.js > kisayolBul'da (testli). */
function yaziAlanindaMi(eleman) {
  return !!eleman && (eleman.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(eleman.tagName));
}

function kisayolYardimiAc() {
  const pencere = sec("#pencere");
  if (pencere.open) return;
  pencere.setAttribute("aria-labelledby", "pencere-baslik");
  pencere.innerHTML =
    '<div class="form"><h2 id="pencere-baslik">Klavye kısayolları</h2>' +
    '<dl class="kisayol-liste">' + KISAYOLLAR.map((k) =>
      "<dt><kbd>" + htmlKacis(k.tuslar).replace(/ {2}ya da {2}/g, "</kbd> ya da <kbd>") + "</kbd></dt><dd>" + htmlKacis(k.aciklama) + "</dd>").join("") +
    "</dl>" +
    '<p class="soluk kucuk-yazi">Mac\'te Ctrl yerine ⌘ (Cmd) de olur.</p>' +
    '<div class="form-dugmeler"><button type="button" class="dugme ana" data-kapat>Tamam</button></div></div>';
  pencere.querySelector("[data-kapat]").onclick = () => pencere.close();
  pencere.showModal();
}

function kisayollariKur() {
  document.addEventListener("keydown", (olay) => {
    if (olay.defaultPrevented || olay.isComposing || document.body.classList.contains("oturumsuz")) return;
    const is = kisayolBul({
      key: olay.key, ctrlKey: olay.ctrlKey, metaKey: olay.metaKey, altKey: olay.altKey,
      yaziAlaninda: yaziAlanindaMi(document.activeElement),
    });
    if (is === "arama") {
      olay.preventDefault();
      aramaPenceresiAc();
    } else if (is === "yardim") {
      olay.preventDefault();
      kisayolYardimiAc();
    } else if (is === "kaydet") {
      // Açık pencerede form varsa onu, yoksa sayfadaki tutanak formunu kaydet.
      // Kaydedilecek form yoksa tarayıcının kendi Ctrl+S'si çalışır.
      const pencere = sec("#pencere");
      const form = pencere.open ? pencere.querySelector("form") : sec("#tutanak-formu");
      if (!form) return;
      olay.preventDefault();
      form.requestSubmit();
    }
  });
  sec("#arama-dugme").onclick = aramaPenceresiAc;
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
