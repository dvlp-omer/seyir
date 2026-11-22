/* ==========================================================================
   Duyuruya fotoğraf / video ekleme ve paylaşma
   Duyuru ekranı ve Mesajlar > "Gruba duyuru" aynı parçayı kullanır.

   NEDEN PAYLAŞ MENÜSÜ? WhatsApp bağlantısı yalnızca yazı taşır. Fotoğraf ve video
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
    '<p class="medya-ipucu" id="' + onEk + '-medya-ipucu" hidden></p>' +
    '<p class="form-hata" id="' + onEk + '-medya-hata" role="alert" hidden></p>' +
    "</div>"
  );
}

// Alanı çalıştırır. metniAl(): o anki duyuru metni. paylasDugmesi: "WhatsApp'ta paylaş" bağlantısı (<a>).
// Medya yoksa bağlantı her zamanki gibi WhatsApp'ı metinle açar. Medya varsa: bilgisayarda tek görsel
// panoya kopyalanıp WhatsApp metinle açılır; öbür durumlarda Paylaş menüsü açılır.
function medyaAlaniBagla(onEk, metniAl, paylasDugmesi) {
  const secili = (medyaSecimleri[onEk] = medyaSecimleri[onEk] || []);
  const girdi = sec("#" + onEk + "-medya-dosya");
  const liste = sec("#" + onEk + "-medya-liste");
  const hata = sec("#" + onEk + "-medya-hata");
  const panoyaGorselKullan = () => panoyaGorselUygunMu(secili, mobilCihazMi(navigator),
    typeof ClipboardItem === "function" && navigator.clipboard && typeof navigator.clipboard.write === "function");

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
    const ipucu = sec("#" + onEk + "-medya-ipucu");
    ipucu.hidden = !secili.length;
    ipucu.innerHTML = panoyaGorselKullan()
      ? "<b>Görsel ve metin tek mesaj olur:</b> Paylaş&#39;a bas → WhatsApp metin yazılı açılır → sohbeti seç → " +
        "yazı kutusunda <b>Ctrl+V</b> yap (görsel eklenir, metin altına açıklama olur) → gönder."
      : mobilCihazMi(navigator)
        ? "<b>Görsel ve metin tek mesaj olur:</b> Paylaş&#39;a bas, WhatsApp&#39;ı ve sohbeti seç. " +
          "Metin gelmezse açıklama kutusuna yapıştır; panoya kopyalanır."
        : "<b>Metin ve görsel tek mesaj olsun:</b> Paylaş&#39;a basınca metin panoya kopyalanır. " +
          "WhatsApp'ta görselin altındaki <b>açıklama</b> kutusuna Ctrl+V ile yapıştır, sonra gönder. " +
          "Birden çok dosyada açıklama ilk görselin altına yazılır.";
    if (paylasDugmesi) {
      paylasDugmesi.textContent = secili.length ? "Paylaş (" + secili.length + " dosya ile)" : "WhatsApp'ta paylaş";
    }
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
      if (yol === "baglanti") return; // bağlantı WhatsApp'ı metinle kendisi açar
      olay.preventDefault();
      const metin = metniAl();
      // Bilgisayarda tek görsel: görsel panoya, WhatsApp metin yazılı açılır (api.whatsapp.com: emojiler sağlam).
      // Sohbette Ctrl+V yapılınca WhatsApp yazı kutusundaki metni görselin açıklamasına taşır: tek mesaj.
      // Önce pano: yeni sekme açılınca sayfa odağı kaybeder ve tarayıcı panoya yazdırmaz.
      if (panoyaGorselKullan()) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": pngYap(secili[0]) })]);
          window.open(waPaylasLinki(metin), "_blank", "noopener");
          bildir("Görsel kopyalandı. WhatsApp'ta sohbeti seç, yazı kutusunda Ctrl+V yap, gönder.");
          return;
        } catch (hataNesnesi) {
          // Pano izin vermezse aşağıdaki Paylaş menüsü yoluna düşer
        }
      }
      if (yol === "dosyasiz") {
        await metniKopyala(metin);
        bildir("Metni kopyaladım. WhatsApp'ta fotoğraf / videoyu ekle, altındaki açıklama kutusuna yapıştır: tek mesaj olur.");
        return;
      }
      // Metin her durumda panoya kopyalanır: görselin açıklama kutusuna yapıştırılınca tek mesaj olur.
      // Bilgisayarda metin Paylaş menüsüne verilmez; WhatsApp masaüstü onu ayrı mesaj yapıyor (kisiler.js > paylasimIcerigi).
      const mobil = mobilCihazMi(navigator);
      if (mobil) {
        metniKopyala(metin); // beklenmez: Paylaş menüsü tıklamadan hemen sonra açılmalı (tarayıcı kuralı)
      } else {
        await metniKopyala(metin);
        bildir("Metin kopyalandı. WhatsApp'ta görselin altındaki açıklama kutusuna Ctrl+V ile yapıştır, sonra gönder.");
      }
      try {
        await navigator.share(paylasimIcerigi(metin, secili, mobil));
      } catch (hataNesnesi) {
        if (hataNesnesi && hataNesnesi.name === "AbortError") return; // kullanıcı vazgeçti
        bildir("Paylaşım açılamadı. Metni kopyaladım; dosyaları WhatsApp'a kendin ekleyip açıklamaya yapıştır.");
      }
    });
  }

  ciz();
}

// Görseli PNG'ye çevirir: tarayıcılar panoya yalnızca PNG görsel yazabiliyor (JPEG, WebP olmaz).
async function pngYap(dosya) {
  if (dosya.type === "image/png") return dosya;
  const resim = await createImageBitmap(dosya);
  const tuval = document.createElement("canvas");
  tuval.width = resim.width;
  tuval.height = resim.height;
  tuval.getContext("2d").drawImage(resim, 0, 0);
  resim.close();
  return new Promise((coz, reddet) => tuval.toBlob((blob) => (blob ? coz(blob) : reddet(new Error("PNG yapılamadı"))), "image/png"));
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
