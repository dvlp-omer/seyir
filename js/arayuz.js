/* ==========================================================================
   ARAYÜZ — bütün ekranların ortak kullandığı parçalar
   - ekranKaydet : bir ekranı menüye ekler
   - eylemleriBagla : düğme tıklamalarını fonksiyonlara bağlar
   - formAc : tek bir fonksiyonla bütün ekle/düzenle formları
   - bildir : kısa bilgi mesajı
   ========================================================================== */

/* ---------- Ekran kaydı ----------
   Her ekran dosyası (js/ekranlar/*.js) kendini buraya kaydeder:
     ekranKaydet("gorevler", { baslik, simge, ciz })
   "ciz(kok)" fonksiyonu ekranın HTML'ini kok elemanının içine yazar.
   Menü bu listeden otomatik oluşur; yeni ekran eklemek için başka bir
   yere dokunmak gerekmez. */
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
   Her düğmeye ayrı ayrı dinleyici eklemek yerine, kapsayıcıya TEK dinleyici
   koyuyoruz ve tıklanan düğmenin data-eylem değerine bakıyoruz
   (buna "olay delegasyonu" denir). Ekran yeniden çizilince de çalışmaya devam eder. */
function eylemleriBagla(kok, eylemler) {
  kok.onclick = (olay) => {
    const dugme = olay.target.closest("[data-eylem]");
    if (!dugme || !kok.contains(dugme)) return;
    const islev = eylemler[dugme.dataset.eylem];
    if (!islev) return;
    // Eylem async olabilir; hata olursa kullanıcıya göster.
    Promise.resolve()
      .then(() => islev(dugme.dataset.id, dugme))
      .catch(hataGoster);
  };
}

function hataGoster(hata) {
  console.error(hata);
  bildir("Bir hata oluştu: " + hata.message);
}

/* ---------- Bildirim ---------- */
let bildirimZamanlayici = null;

function bildir(mesaj) {
  const kutu = sec("#bildirim");
  kutu.textContent = mesaj;
  kutu.classList.add("acik");
  clearTimeout(bildirimZamanlayici);
  bildirimZamanlayici = setTimeout(() => kutu.classList.remove("acik"), 2600);
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
   Alan türleri: metin, uzun (çok satır), tarih, saat, secim, coklu (çoklu seçim) */
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
      '<div class="secenekler">' + (kutular || '<span class="soluk kucuk-yazi">Önce takıma üye ekleyin.</span>') +
      "</div>" + ipucu + "</fieldset>";
  }

  let giris;
  if (alan.tur === "uzun") {
    giris = '<textarea name="' + ad + '"' + zorunlu + ">" + htmlKacis(deger) + "</textarea>";
  } else if (alan.tur === "secim") {
    const secenekler = alan.secenekler.map((s) =>
      '<option value="' + htmlKacis(s.deger) + '"' + (s.deger === (deger || "") ? " selected" : "") + ">" +
      htmlKacis(s.etiket) + "</option>"
    ).join("");
    giris = '<select name="' + ad + '"' + zorunlu + ">" + secenekler + "</select>";
  } else {
    const tip = { tarih: "date", saat: "time" }[alan.tur] || "text";
    giris = '<input type="' + tip + '" name="' + ad + '" value="' + htmlKacis(deger) + '"' + zorunlu +
      (tip === "text" ? ' maxlength="200" autocomplete="off"' : "") + ">";
  }
  return '<label class="alan">' + etiket + giris + ipucu + "</label>";
}

// Formdaki değerleri { alanAdi: deger } nesnesi olarak toplar.
function formDegerleri(form, alanlar) {
  const sonuc = {};
  for (const alan of alanlar) {
    if (alan.tur === "coklu") {
      sonuc[alan.ad] = [...form.querySelectorAll('input[name="' + alan.ad + '"]:checked')].map((k) => k.value);
    } else {
      sonuc[alan.ad] = form.elements[alan.ad].value.trim();
    }
  }
  return sonuc;
}

function formAc({ baslik, alanlar, degerler = {}, kaydetYazi = "Kaydet", kaydet }) {
  const pencere = sec("#pencere");
  pencere.innerHTML =
    '<form class="form">' +
    "<h2>" + htmlKacis(baslik) + "</h2>" +
    alanlar.map((alan) => alanHtml(alan, degerler[alan.ad])).join("") +
    '<p class="form-hata" hidden></p>' +
    '<div class="form-dugmeler">' +
    '<button type="button" class="dugme" data-kapat>Vazgeç</button>' +
    '<button type="submit" class="dugme ana">' + htmlKacis(kaydetYazi) + "</button>" +
    "</div></form>";

  const form = pencere.querySelector("form");
  const hataKutusu = form.querySelector(".form-hata");
  form.querySelector("[data-kapat]").onclick = () => pencere.close();

  form.onsubmit = async (olay) => {
    olay.preventDefault(); // sayfanın yenilenmesini engelle
    const sonuc = formDegerleri(form, alanlar);

    // Sadece boşluk yazılmış zorunlu alanları da yakala
    const eksik = alanlar.find((alan) => alan.zorunlu && !sonuc[alan.ad]);
    if (eksik) {
      hataKutusu.textContent = '"' + eksik.etiket + '" alanı boş bırakılamaz.';
      hataKutusu.hidden = false;
      return;
    }

    try {
      await kaydet(sonuc);
      pencere.close();
      await yenile(); // ekranı güncel veriyle yeniden çiz (uygulama.js)
    } catch (hata) {
      console.error(hata);
      hataKutusu.textContent = "Kaydedilemedi: " + hata.message;
      hataKutusu.hidden = false;
    }
  };

  pencere.showModal();
}

/* ---------- Küçük HTML yardımcıları ---------- */

// Menüde ve başka yerlerde kullanılan çizgi simgeler (24x24 SVG yolu).
function simgeHtml(yol) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + yol + '"/></svg>';
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
