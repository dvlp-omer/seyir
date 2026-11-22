/* ==========================================================================
   Duyuruya fotoğraf / video ekleme ve paylaşma
   Duyuru ekranı ve Mesajlar > "Gruba duyuru" aynı parçayı kullanır.

   NEDEN PAYLAŞ MENÜSÜ? wa.me bağlantısı yalnızca yazı taşır. Fotoğraf ve video
   telefonun Paylaş menüsüyle (Web Share API) WhatsApp'a verilir; sohbeti ya da
   grubu kullanıcı seçer. Dosya paylaşamayan tarayıcıda (çoğu bilgisayar) metin
   kopyalanır ve dosyaları WhatsApp'a kendisinin eklemesi söylenir.

   GİZLİLİK: Dosyalar kaydedilmez, sunucuya gitmez. Yalnızca bu ekran açıkken
   cihazın belleğinde durur; sayfa yenilenince kaybolur.
   Kurallar (tür, boyut, adet, paylaşım yolu) kisiler.js'te ve testlidir.
   ========================================================================== */

// Ekran başına seçili dosyalar: ekran yeniden çizilse de (ör. şablon değişince) korunur.
const medyaSecimleri = {};
const medyaAdresleri = {};

// "onEk": alanın kimlik ön eki (ör. "duyuru", "mf"); aynı sayfada iki alan çakışmasın diye.
function medyaAlaniHtml(onEk) {
  return (
    '<div class="medya-alani" id="' + onEk + '-medya">' +
    '<input type="file" id="' + onEk + '-medya-dosya" class="gizli" accept="image/*,video/*" multiple tabindex="-1" aria-hidden="true">' +
    '<div class="arac-cubugu" style="margin:0">' +
    '<button type="button" class="dugme" id="' + onEk + '-medya-ekle">Fotoğraf / video ekle</button>' +
    '<span class="soluk kucuk-yazi">İsteğe bağlı. En fazla ' + MEDYA_EN_FAZLA + " dosya, her biri " + MEDYA_EN_BUYUK_MB +
    " MB'a kadar. Dosyalar kaydedilmez, yalnızca paylaşırken kullanılır.</span></div>" +
    '<ul class="medya-liste" id="' + onEk + '-medya-liste" aria-label="Eklenen dosyalar"></ul>' +
    '<p class="form-hata" id="' + onEk + '-medya-hata" role="alert" hidden></p>' +
    "</div>"
  );
}

// Alanı çalıştırır. metniAl(): o anki duyuru metni. paylasDugmesi: "WhatsApp'ta paylaş" bağlantısı (<a>).
// Medya yoksa bağlantı her zamanki gibi wa.me'yi açar; medya varsa Paylaş menüsü açılır.
function medyaAlaniBagla(onEk, metniAl, paylasDugmesi) {
  const secili = (medyaSecimleri[onEk] = medyaSecimleri[onEk] || []);
  const girdi = sec("#" + onEk + "-medya-dosya");
  const liste = sec("#" + onEk + "-medya-liste");
  const hata = sec("#" + onEk + "-medya-hata");

  function ciz() {
    // Önizleme adresleri ekran başına tutulur; eskileri bırakılır ki bellek dolmasın.
    (medyaAdresleri[onEk] || []).forEach((adres) => URL.revokeObjectURL(adres));
    const adresler = (medyaAdresleri[onEk] = secili.map((dosya) => URL.createObjectURL(dosya)));
    liste.innerHTML = secili.map((dosya, i) => {
      const video = dosya.type.startsWith("video/");
      const onizleme = video
        ? '<video src="' + adresler[i] + '" muted playsinline preload="metadata"></video><span class="medya-rozet">Video</span>'
        : '<img src="' + adresler[i] + '" alt="">';
      return "<li>" + onizleme +
        '<span class="medya-ad" title="' + htmlKacis(dosya.name) + '">' + htmlKacis(dosya.name) + "</span>" +
        '<button type="button" class="dugme kucuk" data-sil="' + i + '" aria-label="' + htmlKacis(dosya.name) + ' dosyasını kaldır">Kaldır</button></li>';
    }).join("");
    if (paylasDugmesi) paylasDugmesi.textContent = secili.length ? "Paylaş (" + secili.length + " dosya ile)" : "WhatsApp'ta paylaş";
  }

  sec("#" + onEk + "-medya-ekle").onclick = () => girdi.click();
  girdi.onchange = () => {
    const { uygun, reddedilen } = medyaSuz([...girdi.files], secili);
    secili.push(...uygun);
    girdi.value = "";
    hata.hidden = !reddedilen.length;
    hata.textContent = reddedilen.map((r) => r.ad + ": " + r.neden).join(" · ");
    ciz();
  };
  liste.onclick = (olay) => {
    const dugme = olay.target.closest("[data-sil]");
    if (!dugme) return;
    secili.splice(Number(dugme.dataset.sil), 1);
    hata.hidden = true;
    ciz();
  };

  if (paylasDugmesi) {
    paylasDugmesi.addEventListener("click", async (olay) => {
      const yol = paylasimYolu(navigator, secili);
      if (yol === "baglanti") return; // bağlantı wa.me'yi kendisi açar
      olay.preventDefault();
      const metin = metniAl();
      if (yol === "dosyasiz") {
        await metniKopyala(metin);
        bildir("Bu tarayıcı dosya paylaşamıyor. Metni kopyaladım: WhatsApp'ta yapıştır, fotoğraf / videoyu kendin ekle.");
        return;
      }
      // Bazı WhatsApp sürümleri dosyayla gelen metni almaz; yapıştırabilsin diye metin panoya da kopyalanır.
      // Kopyalamayı beklemiyoruz: Paylaş menüsü, tıklamadan hemen sonra açılmalı (tarayıcı kuralı).
      metniKopyala(metin);
      try {
        await navigator.share({ text: metin, files: secili.slice() });
        bildir("Paylaşıldı. Metin gelmediyse WhatsApp'ta yapıştır; panoya kopyalandı.");
      } catch (hataNesnesi) {
        if (hataNesnesi && hataNesnesi.name === "AbortError") return; // kullanıcı vazgeçti
        bildir("Paylaşım açılamadı. Metni kopyaladım; dosyaları WhatsApp'a kendin ekle.");
      }
    });
  }

  ciz();
}

// Metni panoya kopyalar (duyuru.js > panoyaKopyala bir metin kutusu bekler).
async function metniKopyala(metin) {
  const kutu = document.createElement("textarea");
  kutu.value = metin;
  kutu.setAttribute("readonly", "");
  kutu.style.position = "fixed";
  kutu.style.opacity = "0";
  document.body.appendChild(kutu);
  try {
    await panoyaKopyala(kutu);
  } finally {
    kutu.remove();
  }
}
