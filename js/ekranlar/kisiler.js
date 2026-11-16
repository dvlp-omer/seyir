/* ==========================================================================
   EKRAN: Kişiler (rehber)
   WhatsApp mesajı gönderilecek kişilerin listesi: ad, hitap adı, telefon,
   etiket (başvuran, kabul edilen, üye...), not.
   - Elle ekle / düzenle / sil
   - İçe aktar: CSV dosyası, yapıştırılan liste ya da "kabul mesajları" HTML dosyası
   - CSV olarak dışa ver
   Hesaplar (telefon biçimi, CSV okuma...) js/kisiler.js içinde ve testli.

   KİŞİSEL VERİ: telefon numarası kişisel veridir. Bu ekrandaki veri yalnızca
   tarayıcıda (ya da Supabase'de, yalnızca takım üyelerinin göreceği şekilde)
   durur; kodda, testlerde ve örnek veride gerçek numara yoktur.
   ========================================================================== */

const kisiEkrani = { arama: "", etiket: "" };
const ICE_AKTARMA_SINIRI = 2 * 1024 * 1024; // 2 MB: binlerce kişiye yeter

/* ---------- Ekle / düzenle ---------- */

function kisiFormu(kisi, kisiler) {
  const mevcutEtiketler = etiketler(kisiler);
  formAc({
    baslik: kisi ? "Kişiyi düzenle" : "Yeni kişi",
    alanlar: [
      { ad: "ad", etiket: "Ad soyad", tur: "metin", zorunlu: true },
      { ad: "ilk_ad", etiket: "Hitap adı", tur: "metin", ipucu: "Mesajdaki {ad} yerine bu yazılır. Boşsa adın ilk sözcüğü kullanılır." },
      { ad: "telefon", etiket: "Telefon", tur: "metin", zorunlu: true, ipucu: "0532..., +90 532..., 532... — hepsi olur." },
      { ad: "etiket", etiket: "Etiket / grup", tur: "metin",
        ipucu: mevcutEtiketler.length ? "Kullanılanlar: " + mevcutEtiketler.join(", ") : "Ör. başvuran, kabul edildi, üye" },
      { ad: "aciklama", etiket: "Not", tur: "uzun" },
    ],
    degerler: kisi ? { ...kisi, telefon: telefonGoster(kisi.telefon) } : {},
    kaydet: async (degerler) => {
      const tel = telefonNormallestir(degerler.telefon);
      if (tel.hata) throw new Error("Telefon: " + tel.hata);
      const ayni = kisiler.find((k) => k.telefon === tel.telefon && (!kisi || k.id !== kisi.id));
      if (ayni) throw new Error("Bu numara zaten kayıtlı: " + ayni.ad);
      const kayit = {
        ad: degerler.ad, ilk_ad: degerler.ilk_ad || ilkAdTahmin(degerler.ad), telefon: tel.telefon,
        etiket: degerler.etiket, aciklama: degerler.aciklama,
      };
      if (kisi) await durum.depo.guncelle("kisiler", kisi.id, kayit);
      else await durum.depo.ekle("kisiler", { ...kayit, takim_id: durum.takim.id });
      bildir(kisi ? "Kişi güncellendi" : "Kişi eklendi");
    },
  });
}

async function kisiSil(kisi) {
  if (!kisi || !confirm('"' + kisi.ad + '" rehberden silinsin mi?')) return;
  await durum.depo.sil("kisiler", kisi.id);
  bildir("Kişi silindi");
  await yenile();
}

/* ---------- İçe aktarma ----------
   Tek pencere, üç kaynak: CSV dosyası, yapıştırılan metin, kabul mesajları
   HTML dosyası. Önce "Önizle": kaç kişi eklenecek, hangileri hatalı, hangileri
   zaten var. Kullanıcı görmeden hiçbir şey kaydedilmez. */
function iceAktarmaPenceresi(kisiler) {
  const pencere = sec("#pencere");
  pencere.setAttribute("aria-labelledby", "pencere-baslik");
  pencere.innerHTML =
    '<form class="form"><h2 id="pencere-baslik">Kişileri içe aktar</h2>' +
    '<p class="soluk kucuk-yazi" style="margin-bottom:12px">CSV dosyası seç, Excel\'den satırları yapıştır ya da ' +
    "“kabul mesajları” sayfasını (.html) yükle. İlk satır başlıksa (ad, telefon, etiket, not) sütunlar ona göre okunur; " +
    "başlık yoksa her satırda ad ve numara aranır. HTML dosyasındaki kişi listesi okunur, dosyadaki kod çalıştırılmaz.</p>" +
    '<label class="alan"><span>Liste</span><textarea id="ia-metin" maxlength="2000000" placeholder="Ad Soyad;Telefon;Etiket&#10;Ece Demir;0500 000 00 01;başvuran"></textarea></label>' +
    '<div class="arac-cubugu" style="margin-bottom:12px"><button type="button" class="dugme" id="ia-dosya-sec">Dosya seç (.csv, .txt, .html)…</button>' +
    '<input type="file" id="ia-dosya" accept=".csv,.txt,.html,.htm,text/csv,text/plain,text/html" hidden>' +
    '<span class="soluk kucuk-yazi" id="ia-dosya-adi"></span></div>' +
    '<label class="alan"><span>Etiketi olmayanlara verilecek etiket</span><input type="text" id="ia-etiket" maxlength="40" list="ia-etiketler" placeholder="ör. başvuran">' +
    '<datalist id="ia-etiketler">' + etiketler(kisiler).map((e) => '<option value="' + htmlKacis(e) + '">').join("") + "</datalist></label>" +
    '<div id="ia-sonuc" role="status"></div>' +
    '<p class="form-hata" role="alert" hidden></p>' +
    '<div class="form-dugmeler"><button type="button" class="dugme" data-kapat>Vazgeç</button>' +
    '<button type="button" class="dugme" id="ia-onizle">Önizle</button>' +
    '<button type="submit" class="dugme ana" disabled>Ekle</button></div></form>';

  const form = pencere.querySelector("form");
  const metinKutusu = form.querySelector("#ia-metin");
  const hataKutusu = form.querySelector(".form-hata");
  const ekleDugmesi = form.querySelector('[type="submit"]');
  const sonucKutusu = form.querySelector("#ia-sonuc");
  const dosyaSecici = form.querySelector("#ia-dosya");
  let hazir = null;     // önizlemenin sonucu (kisileriHazirla)
  let dosyaMetni = "";  // seçilen dosyanın içeriği (uzun HTML'i metin kutusuna basmıyoruz)

  const hata = (mesaj) => { hataKutusu.textContent = mesaj; hataKutusu.hidden = !mesaj; };
  // Metin değişince eski önizleme geçersizdir
  const sifirla = () => { hazir = null; ekleDugmesi.disabled = true; ekleDugmesi.textContent = "Ekle"; sonucKutusu.innerHTML = ""; };

  metinKutusu.oninput = () => { dosyaMetni = ""; form.querySelector("#ia-dosya-adi").textContent = ""; sifirla(); };
  form.querySelector("#ia-etiket").oninput = sifirla;
  form.querySelector("[data-kapat]").onclick = () => pencere.close();
  form.querySelector("#ia-dosya-sec").onclick = () => dosyaSecici.click();

  dosyaSecici.onchange = async () => {
    const dosya = dosyaSecici.files[0];
    dosyaSecici.value = "";
    if (!dosya) return;
    if (dosya.size > ICE_AKTARMA_SINIRI) return hata("Dosya çok büyük (en çok 2 MB).");
    hata("");
    dosyaMetni = await dosya.text();
    metinKutusu.value = "";
    form.querySelector("#ia-dosya-adi").textContent = dosya.name;
    sifirla();
    onizle();
  };

  function onizle() {
    hata("");
    const metin = dosyaMetni || metinKutusu.value;
    if (!metin.trim()) return hata("Önce bir dosya seç ya da listeyi yapıştır.");
    let hamlar;
    try {
      // HTML mi? (kabul mesajları sayfası) Değilse CSV / düz liste.
      hamlar = /<script|<html/i.test(metin) ? htmlKisiDizisiOku(metin) : csvAyristir(metin);
    } catch (hataNesnesi) {
      return hata(hataNesnesi.message);
    }
    hazir = kisileriHazirla(hamlar, kisiler, form.querySelector("#ia-etiket").value.trim());
    const liste = (baslik, ogeler, yazi) => ogeler.length
      ? "<details><summary>" + baslik + " (" + ogeler.length + ")</summary><ul class=\"ia-liste\">" +
        ogeler.slice(0, 50).map((o) => "<li>" + htmlKacis(yazi(o)) + "</li>").join("") +
        (ogeler.length > 50 ? "<li>… ve " + (ogeler.length - 50) + " satır daha</li>" : "") + "</ul></details>"
      : "";
    sonucKutusu.innerHTML =
      '<div class="bilgi-kutusu"><b>' + hazir.eklenecek.length + " kişi eklenecek</b>" +
      (hazir.hatali.length ? " · " + hazir.hatali.length + " satır hatalı" : "") +
      (hazir.yinelenen.length ? " · " + hazir.yinelenen.length + " numara zaten var (atlanacak)" : "") + "</div>" +
      liste("Eklenecekler", hazir.eklenecek, (k) => k.ad + " — " + telefonGoster(k.telefon) + (k.etiket ? " — " + k.etiket : "")) +
      liste("Hatalı satırlar", hazir.hatali, (h) => h.satir + ". satır" + (h.ad ? " (" + h.ad + ")" : "") + ": " + h.neden) +
      liste("Zaten olanlar", hazir.yinelenen, (y) => y.satir + ". satır: " + y.ad);
    ekleDugmesi.disabled = hazir.eklenecek.length === 0;
    ekleDugmesi.textContent = hazir.eklenecek.length + " kişiyi ekle";
  }
  form.querySelector("#ia-onizle").onclick = onizle;

  form.onsubmit = async (olay) => {
    olay.preventDefault();
    if (!hazir || ekleDugmesi.disabled) return;
    ekleDugmesi.disabled = true;
    let eklenen = 0;
    try {
      for (const kisi of hazir.eklenecek) {
        await durum.depo.ekle("kisiler", { ...kisi, takim_id: durum.takim.id });
        eklenen++;
      }
      pencere.close();
      bildir(eklenen + " kişi eklendi");
      await yenile();
    } catch (hataNesnesi) {
      console.error(hataNesnesi);
      hata("Kaydedilemedi (" + eklenen + " kişi eklenmişti): " + hataNesnesi.message);
    }
  };
  pencere.showModal();
}

/* ---------- Liste ---------- */

// Her kişi bir satır kartı (diğer listelerle aynı görünüm; dar ekranda da okunur)
function kisiSatirlariHtml(kisiler) {
  if (!kisiler.length) return '<li class="soluk">Aramaya uyan kişi yok.</li>';
  return kisiler.map((k) =>
    '<li class="tarih-satir"><div class="tarih-bilgi"><h4>' + htmlKacis(k.ad) +
    (k.etiket ? ' <span class="rozet">' + htmlKacis(k.etiket) + "</span>" : "") + "</h4>" +
    '<p><span class="telefon">' + htmlKacis(telefonGoster(k.telefon)) + "</span>" +
    (k.ilk_ad && k.ilk_ad !== ilkAdTahmin(k.ad) ? " · Hitap: " + htmlKacis(k.ilk_ad) : "") + "</p>" +
    (k.aciklama ? "<p>" + htmlKacis(k.aciklama) + "</p>" : "") + "</div>" +
    '<div class="satir-dugmeler">' + kayitDugmesi("duzenle", k.id, "Düzenle", k.ad) +
    kayitDugmesi("sil", k.id, "Sil", k.ad, "tehlike") + "</div></li>").join("");
}

async function kisilerEkraniCiz(kok) {
  const kisiler = (await takimKayitlari("kisiler")).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const tumEtiketler = etiketler(kisiler);
  if (kisiEkrani.etiket && !tumEtiketler.includes(kisiEkrani.etiket)) kisiEkrani.etiket = "";

  kok.innerHTML =
    '<div class="arac-cubugu">' +
    '<label><span class="gizli">Kişi ara</span><input type="search" id="kisi-ara" placeholder="Ad ya da numara ara…" value="' + htmlKacis(kisiEkrani.arama) + '"></label>' +
    '<label>Etiket <select id="kisi-etiket"><option value="">Hepsi</option>' +
    tumEtiketler.map((e) => '<option value="' + htmlKacis(e) + '"' + (e === kisiEkrani.etiket ? " selected" : "") + ">" + htmlKacis(e) + "</option>").join("") +
    "</select></label>" +
    '<span class="bosluk"></span>' +
    '<button class="dugme" data-eylem="csv"' + (kisiler.length ? "" : " disabled") + ">CSV indir</button>" +
    '<button class="dugme" data-eylem="ice-aktar">İçe aktar…</button>' +
    '<button class="dugme ana" data-eylem="yeni">+ Kişi ekle</button></div>' +
    (kisiler.length
      ? '<p class="soluk kucuk-yazi" style="margin-bottom:10px"><span id="kisi-sayi"></span> · Telefon numaraları kişisel veridir; ' +
        "CSV ve yedek dosyalarını yalnızca ekip içinde paylaş.</p>" +
        '<ul class="tarih-liste" id="kisi-satirlar"></ul>'
      : '<div class="bos"><h3>Rehber boş</h3>Kişileri tek tek ekleyebilir ya da bir CSV / kabul mesajları dosyasından ' +
        "toplu aktarabilirsin. Sonra <b>Mesajlar</b> ekranından herkese kişisel WhatsApp mesajı hazırlarsın.</div>");

  // Arama ve etiket: ekranı baştan çizmeden yalnızca tablo gövdesi yenilenir (yazarken odak kaybolmasın)
  const tabloyuGuncelle = () => {
    const govde = sec("#kisi-satirlar");
    if (!govde) return;
    const gorunen = kisileriSuz(kisiler, kisiEkrani);
    govde.innerHTML = kisiSatirlariHtml(gorunen);
    sec("#kisi-sayi").textContent = gorunen.length === kisiler.length
      ? kisiler.length + " kişi" : gorunen.length + " / " + kisiler.length + " kişi gösteriliyor";
  };
  tabloyuGuncelle();
  sec("#kisi-ara").oninput = (olay) => { kisiEkrani.arama = olay.target.value; tabloyuGuncelle(); };
  sec("#kisi-etiket").onchange = (olay) => { kisiEkrani.etiket = olay.target.value; tabloyuGuncelle(); };

  const bul = (id) => kisiler.find((k) => k.id === id);
  eylemleriBagla(kok, {
    yeni: () => kisiFormu(null, kisiler),
    duzenle: (id) => bul(id) && kisiFormu(bul(id), kisiler),
    sil: (id) => kisiSil(bul(id)),
    "ice-aktar": () => iceAktarmaPenceresi(kisiler),
    csv: () => {
      dosyaIndir("kisiler-" + bugun() + ".csv", kisileriCsvYap(kisileriSuz(kisiler, kisiEkrani)), "text/csv;charset=utf-8");
      bildir("CSV indirildi");
    },
  });
}

ekranKaydet("kisiler", {
  baslik: "Kişiler",
  kisaAd: "Kişiler",
  simge: "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  ciz: kisilerEkraniCiz,
});
