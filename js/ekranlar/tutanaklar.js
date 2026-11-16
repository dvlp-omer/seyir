/* ==========================================================================
   EKRAN: Resmî tutanaklar
   Kulübün resmî toplantı tutanağını oluşturur, saklar ve PDF / Word olarak verir.
   Üç görünüm:
     liste     : kayıtlı tutanaklar (aç, düzenle, kopyala, sil)
     goruntule : tutanağın kâğıt görünümü + "PDF indir", "Word indir"
     duzenle   : form. Üç giriş yolu da BU forma gelir:
                   a) elle doldurma
                   b) serbest not yapıştırma  -> "Notları forma yerleştir"
                   c) .txt / .docx yükleme    -> metin aynı ayrıştırıcıdan geçer
   Hesap ve belge üretimi js/tutanak.js ve js/docx.js içindedir; bu dosya
   yalnızca ekranı çizer ve düğmeleri bağlar.

   Not: "Toplantı" ekranındaki tutanak ekip içi hızlı not ve görev takibi
   içindir; buradaki ise imzaya gidecek resmî belgedir. İkisi ayrı kayıtlardır.
   ========================================================================== */

// Ekranın o anki hâli. "taslak": düzenlenmekte olan (henüz kaydedilmemiş) tutanak.
const tutanakEkrani = { kip: "liste", id: null, taslak: null, artan: [], notlar: "" };

const NOT_DOSYASI_SINIRI = 5 * 1024 * 1024; // 5 MB
const DOCX_TURU = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function tutanakListesineDon() {
  Object.assign(tutanakEkrani, { kip: "liste", id: null, taslak: null, artan: [], notlar: "" });
}

// Düzenleme formunu verilen taslakla açar. id null ise kaydedince YENİ tutanak olur.
function tutanakFormunuAc(taslak, id) {
  Object.assign(tutanakEkrani, { kip: "duzenle", id: id, taslak: taslak, artan: [], notlar: "" });
  return yenile();
}

/* ---------- Liste ---------- */

function tutanakListesiCiz(kok, tutanaklar) {
  const sirali = tutanaklariSirala(tutanaklar).reverse(); // en yeni üstte

  const satirlar = sirali.map((t) => {
    const ad = t.numara || tarihYaz(t.toplanti_tarihi, false);
    const ayrinti = [tarihYaz(t.toplanti_tarihi), (t.kararlar || []).length + " karar",
      (t.devreden || []).length ? t.devreden.length + " devreden" : ""].filter((p) => p).join(" · ");
    return '<li class="tarih-satir">' + gunKutusuHtml(t.toplanti_tarihi) +
      '<div class="tarih-bilgi"><h4>' + htmlKacis(ad) + "</h4>" +
      (t.alt_baslik ? "<p>" + htmlKacis(t.alt_baslik) + "</p>" : "") +
      "<p>" + htmlKacis(ayrinti) + "</p></div>" +
      '<div class="satir-dugmeler">' +
      kayitDugmesi("ac", t.id, "Aç", ad) +
      kayitDugmesi("duzenle", t.id, "Düzenle", ad) +
      kayitDugmesi("kopyala", t.id, "Kopyala", ad) +
      kayitDugmesi("sil", t.id, "Sil", ad, "tehlike") +
      "</div></li>";
  }).join("");

  kok.innerHTML =
    '<div class="arac-cubugu"><span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="yeni">+ Yeni tutanak</button></div>' +
    (sirali.length
      ? '<ul class="tarih-liste">' + satirlar + "</ul>"
      : '<div class="bos"><h3>Henüz resmî tutanak yok</h3>Formu elle doldur, toplantı notlarını yapıştır ya da bir Word dosyası yükle; ' +
        "A4 düzeninde, imzaya hazır tutanağı PDF ve Word olarak al.</div>");

  const bul = (id) => tutanaklar.find((t) => t.id === id);
  eylemleriBagla(kok, {
    yeni: () => tutanakFormunuAc(yeniTutanakTaslagi(tutanaklar, bugun()), null),
    ac: (id) => { Object.assign(tutanakEkrani, { kip: "goruntule", id: id }); return yenile(); },
    duzenle: (id) => bul(id) && tutanakFormunuAc({ ...bosTutanak(), ...bul(id) }, id),
    kopyala: (id) => tutanagiKopyala(bul(id), tutanaklar),
    sil: (id) => tutanagiSil(bul(id)),
  });
}

function tutanagiKopyala(kaynak, tutanaklar) {
  if (!kaynak) return yenile();
  bildir("Kopya hazır. Düzenleyip kaydedince yeni bir tutanak olur.");
  return tutanakFormunuAc(tutanakKopyasi(kaynak, tutanaklar, bugun()), null);
}

async function tutanagiSil(tutanak) {
  if (!tutanak) return yenile();
  if (!confirm('"' + (tutanak.numara || "Tutanak") + '" silinsin mi?\nBu işlem geri alınamaz.')) return;
  await durum.depo.sil("tutanaklar", tutanak.id);
  tutanakListesineDon();
  bildir("Tutanak silindi");
  await yenile();
}

/* ---------- Görüntüleme, PDF ve Word ---------- */

/* Sayfa altlığındaki yazı tutanağa göre değişir; stil dosyasında duramaz.
   Bu yüzden <head> içindeki küçük bir <style> etiketine yazılır (yoksa oluşturulur).
   Asıl düzen (A4, çerçeve, yazı tipi) css/stil.css içindedir. */
function tutanakSayfaStiliniYaz(tutanak) {
  let stil = sec("#tutanak-sayfa-stili");
  if (!stil) {
    stil = document.createElement("style");
    stil.id = "tutanak-sayfa-stili";
    document.head.appendChild(stil);
  }
  stil.textContent = tutanakSayfaCss(tutanak);
}

function tutanakGoruntuleCiz(kok, tutanak, tutanaklar) {
  tutanakSayfaStiliniYaz(tutanak);

  kok.innerHTML =
    '<div class="arac-cubugu yazdirma">' +
    '<button class="dugme" data-eylem="geri">← Tüm tutanaklar</button>' +
    '<span class="bosluk"></span>' +
    '<button class="dugme" data-eylem="duzenle">Düzenle</button>' +
    '<button class="dugme" data-eylem="kopyala">Kopyala</button>' +
    '<button class="dugme" data-eylem="mesaj" title="Sonraki toplantı bilgisi ve tutanaktaki kişilerle WhatsApp hatırlatması">Hatırlatma mesajı</button>' +
    '<button class="dugme" data-eylem="word">Word (.docx) indir</button>' +
    '<button class="dugme ana" data-eylem="pdf">PDF indir</button>' +
    '<button class="dugme tehlike" data-eylem="sil">Sil</button>' +
    "</div>" +
    '<p class="soluk kucuk-yazi yazdirma" style="margin-bottom:14px">PDF için açılan yazdırma penceresinde hedef olarak ' +
    "<b>“PDF olarak kaydet”</b>i seç. Kâğıt boyutu A4, kenar boşlukları “Varsayılan” kalsın; “Üst bilgi ve alt bilgiler” " +
    "kutusu işaretliyse kaldır.</p>" +
    '<div class="rt-sarici">' + tutanakBelgeHtml(tutanak) + "</div>";

  eylemleriBagla(kok, {
    geri: () => { tutanakListesineDon(); return yenile(); },
    duzenle: () => tutanakFormunuAc({ ...bosTutanak(), ...tutanak }, tutanak.id),
    kopyala: () => tutanagiKopyala(tutanak, tutanaklar),
    sil: () => tutanagiSil(tutanak),
    // Mesajlar ekranına geçer: tarih/saat "Sonraki Toplantı"dan, kişiler katılımcılardan (mesajlar.js)
    mesaj: () => tutanaktanMesajHazirla(tutanak.id),
    // PDF: tarayıcının yazdırma motoru üretir (sayfalara bölme, çerçeve, "Sayfa N").
    // Dosya adı sayfa başlığından gelir (belgeYazdir: toplantilar.js).
    pdf: () => belgeYazdir(tutanakDosyaAdi(tutanak)),
    word: () => {
      dosyaIndir(tutanakDosyaAdi(tutanak) + ".docx", tutanakDocx(tutanak), DOCX_TURU);
      bildir("Word dosyası indirildi");
    },
  });
}

/* ---------- Düzenleme formu ---------- */

// Tek satırlık / çok satırlık form alanı HTML'i (bu ekrana özel, kısa yardımcılar).
function tfAlan(ad, etiket, deger, ayar = {}) {
  const tur = ayar.tur || "text";
  const giris = tur === "uzun"
    ? '<textarea id="tf-' + ad + '" class="' + (ayar.buyuk ? "uzun" : "") + '" maxlength="20000">' + htmlKacis(deger) + "</textarea>"
    : '<input type="' + tur + '" id="tf-' + ad + '" value="' + htmlKacis(deger) + '"' +
      (tur === "date" ? ' min="' + EN_ERKEN_TARIH + '" max="' + EN_GEC_TARIH + '"' : ' maxlength="300" autocomplete="off"') + ">";
  return '<label class="alan ' + (ayar.tam ? "tam" : "") + '"><span>' + etiket + "</span>" + giris +
    (ayar.ipucu ? "<small>" + ayar.ipucu + "</small>" : "") + "</label>";
}

// Çok satırlı metni maddelere ayırır (her satır bir madde; baştaki numara/işaret temizlenir).
// satirlaraAyir: mantik.js
function tutanakFormuHtml(t) {
  const devredenSatirlari = t.devreden.map((d, sira) =>
    '<div class="devreden-satir">' +
    '<label><span class="gizli">Devreden karar ' + (sira + 1) + '</span><textarea data-devreden="metin" maxlength="5000" placeholder="Karar metni">' + htmlKacis(d.metin) + "</textarea></label>" +
    '<label><span class="gizli">Karar ' + (sira + 1) + ' atfı</span><input type="text" data-devreden="atif" maxlength="300" placeholder="Atıf (ör. ROTA/İSAS-2026/03, Karar 2)" value="' + htmlKacis(d.atif) + '"></label>' +
    '<button type="button" class="dugme kucuk tehlike" data-eylem="devreden-sil" data-id="' + sira + '" aria-label="Devreden karar ' + (sira + 1) + ' satırını kaldır">Kaldır</button>' +
    "</div>").join("");

  const artanKutusu = tutanakEkrani.artan.length
    ? '<div class="bilgi-kutusu" role="status"><b>Yerleştirilemeyen ' + tutanakEkrani.artan.length + " satır</b> — hangi alana ait olduğunu anlayamadım. " +
      'Gerekirse ilgili alana elle taşı:<ul style="list-style:disc;padding-left:20px;margin-top:6px">' +
      tutanakEkrani.artan.map((satir) => "<li>" + htmlKacis(satir) + "</li>").join("") + "</ul></div>"
    : "";

  return '<form class="tutanak-form" id="tutanak-formu" novalidate>' +

    '<section class="kart"><h3>Notlardan ya da dosyadan doldur <span class="soluk kucuk-yazi">(isteğe bağlı)</span></h3>' +
    "<p class=\"soluk kucuk-yazi\">Toplantı notlarını yapıştır ya da bir dosya yükle; tanıdığım başlıklar forma yerleşir. " +
    "Tanınan başlıklar: <i>Toplantı Tarihi, Tutanak Tarihi, Sonraki Toplantı, Katılımcılar, Devreden Kararlar, Kararlar, Görev Durumu</i>. " +
    "Numaralı satırlar (1. 2. ya da -) ayrı madde olur. Sonucu aşağıda elle düzeltebilirsin.</p>" +
    '<label class="alan" style="margin-top:10px"><span>Notlar</span><textarea id="tf-notlar" class="uzun" maxlength="100000" ' +
    'placeholder="Toplantı Tarihi: 12.03.2026&#10;Katılımcılar: ...&#10;&#10;Kararlar:&#10;1. ...&#10;2. ...">' + htmlKacis(tutanakEkrani.notlar) + "</textarea></label>" +
    '<div class="arac-cubugu" style="margin-bottom:0">' +
    '<button type="button" class="dugme" data-eylem="ayristir">Notları forma yerleştir</button>' +
    '<button type="button" class="dugme" data-eylem="dosya-sec">Dosya yükle (.txt, .docx)…</button>' +
    '<input type="file" id="tf-dosya" accept=".txt,.docx,text/plain,' + DOCX_TURU + '" hidden>' +
    "</div></section>" +

    artanKutusu +

    '<section class="kart"><h3>Başlık ve bilgiler</h3><div class="alan-izgara">' +
    tfAlan("kurum", "Üst başlık (kurum)", t.kurum, { tam: true }) +
    tfAlan("alt_baslik", "Alt başlık", t.alt_baslik, { ipucu: "İtalik yazılır. Örn: İSAS Akademi — Dördüncü Toplantı" }) +
    tfAlan("numara", "Tutanak No", t.numara, { ipucu: "Otomatik artar. Biçimi değiştirirsen sonraki tutanaklar yeni biçimi izler." }) +
    tfAlan("toplanti_tarihi", "Toplantı tarihi *", t.toplanti_tarihi, { tur: "date" }) +
    tfAlan("tutanak_tarihi", "Tutanak tarihi", t.tutanak_tarihi, { tur: "date" }) +
    tfAlan("sonraki_toplanti", "Sonraki toplantı", t.sonraki_toplanti, { tam: true, ipucu: "Serbest yazı. Örn: 19 Mart 2026 Perşembe, 17.30" }) +
    tfAlan("ek_etiket", "Dördüncü kutunun etiketi", t.ek_etiket, { ipucu: "Örn: Seminer/Buluşma" }) +
    tfAlan("ek_deger", "Dördüncü kutunun içeriği", t.ek_deger, { ipucu: "Boş bırakılırsa bu kutu belgede hiç görünmez." }) +
    "</div></section>" +

    '<section class="kart"><h3>Katılımcılar</h3>' +
    tfAlan("katilimcilar", "Adlar", t.katilimcilar.join("\n"), { tur: "uzun", ipucu: "Her satıra bir ad (ya da virgülle ayır). İmza bölümü bu listeden oluşur." }) +
    "</section>" +

    '<section class="kart"><h3>Madde 1 — Devreden kararlar</h3>' +
    tfAlan("devreden_giris", "Giriş cümlesi", t.devreden_giris, {}) +
    devredenSatirlari +
    (t.devreden.length ? "" : '<p class="soluk kucuk-yazi" style="margin-bottom:10px">Devreden karar eklenmedi.</p>') +
    '<div class="arac-cubugu" style="margin-bottom:0">' +
    '<button type="button" class="dugme" data-eylem="devreden-sec">Önceki tutanaklardan seç…</button>' +
    '<button type="button" class="dugme" data-eylem="devreden-ekle">+ Boş satır ekle</button>' +
    "</div></section>" +

    '<section class="kart"><h3>Madde 2 — Bu toplantıda alınan kararlar</h3>' +
    tfAlan("kararlar", "Kararlar", t.kararlar.join("\n"), { tur: "uzun", buyuk: true, ipucu: "Her satır bir karar; numarayı belge kendisi verir. Uzun bir karar tek satırda kalsın (Enter yeni karar başlatır)." }) +
    "</section>" +

    '<section class="kart"><h3>Madde 3 — Görev durumu ve sonraki toplantı</h3>' +
    tfAlan("gorevler", "Maddeler", t.gorevler.join("\n"), { tur: "uzun", buyuk: true, ipucu: "Her satır bir madde." }) +
    "</section>" +

    '<section class="kart"><h3>Alt bilgiler</h3>' +
    tfAlan("alt_bilgi", "Belgenin sonundaki satır", t.alt_bilgi, {}) +
    tfAlan("sayfa_altligi", "Her sayfanın altındaki yazı (solda)", t.sayfa_altligi, { ipucu: "Sağ tarafa “Sayfa N” kendiliğinden yazılır." }) +
    "</section>" +

    '<p class="form-hata" id="tf-hata" role="alert" hidden></p>' +
    '<div class="alt-cubuk">' +
    '<button type="submit" class="dugme ana">Kaydet</button>' +
    '<button type="button" class="dugme" data-eylem="onizle">Önizle</button>' +
    '<button type="button" class="dugme" data-eylem="vazgec">Vazgeç</button>' +
    "</div></form>" +
    '<div id="tutanak-onizleme" class="rt-sarici" tabindex="-1" aria-label="Tutanak önizlemesi"></div>';
}

// Formdaki değerleri tutanak nesnesine çevirir (ekran yeniden çizilmeden önce de çağrılır;
// böylece yazılanlar kaybolmaz).
function tutanakFormunuOku() {
  const deger = (ad) => sec("#tf-" + ad).value.trim();
  const devreden = [...document.querySelectorAll(".devreden-satir")].map((satir) => ({
    metin: satir.querySelector('[data-devreden="metin"]').value.replace(/\s*\n\s*/g, " ").trim(),
    atif: satir.querySelector('[data-devreden="atif"]').value.trim(),
  }));
  tutanakEkrani.notlar = sec("#tf-notlar").value;
  return {
    ...tutanakEkrani.taslak,
    kurum: deger("kurum"), alt_baslik: deger("alt_baslik"), numara: deger("numara"),
    toplanti_tarihi: deger("toplanti_tarihi"), tutanak_tarihi: deger("tutanak_tarihi"),
    sonraki_toplanti: deger("sonraki_toplanti"), ek_etiket: deger("ek_etiket"), ek_deger: deger("ek_deger"),
    katilimcilar: [...new Set(deger("katilimcilar").split(/[,;\n]/).map((ad) => ad.trim()).filter((ad) => ad))],
    devreden_giris: deger("devreden_giris"),
    devreden: devreden,
    kararlar: satirlaraAyir(deger("kararlar")),
    gorevler: satirlaraAyir(deger("gorevler")),
    alt_bilgi: deger("alt_bilgi"), sayfa_altligi: deger("sayfa_altligi"),
  };
}

// Formu saklayıp ekranı yeniden çizer (satır ekleme/çıkarma gibi işlemlerden sonra).
function tutanakFormunuYenile(degistir) {
  const taslak = tutanakFormunuOku();
  if (degistir) degistir(taslak);
  tutanakEkrani.taslak = taslak;
  return yenile();
}

// Yapıştırılan / dosyadan gelen metni ayrıştırıp formun üstüne yazar.
function notlariFormaYerlestir(metin) {
  if (!metin.trim()) return bildir("Önce notları yapıştır ya da bir dosya yükle.");
  const ayristirilan = notlariAyristir(metin);
  const bulunan = Object.keys(bosTutanak()).filter((alan) =>
    Array.isArray(ayristirilan[alan]) ? ayristirilan[alan].length : ayristirilan[alan]).length;
  tutanakEkrani.artan = ayristirilan.artan;
  bildir(bulunan ? bulunan + " alan dolduruldu" + (ayristirilan.artan.length ? ", " + ayristirilan.artan.length + " satır yerleştirilemedi" : "")
    : "Tanıdığım bir başlık bulamadım; satırlar aşağıda listelendi.");
  return tutanakFormunuYenile((taslak) => Object.assign(taslak, notlariBirlestir(taslak, ayristirilan)));
}

// .txt ya da .docx dosyasını metne çevirir.
async function notDosyasiniOku(dosya) {
  if (dosya.size > NOT_DOSYASI_SINIRI) throw new Error("Dosya çok büyük (en çok 5 MB).");
  const ad = dosya.name.toLocaleLowerCase("tr");
  if (ad.endsWith(".docx")) return docxOku(new Uint8Array(await dosya.arrayBuffer()));
  if (ad.endsWith(".doc")) throw new Error("Eski .doc biçimi okunamıyor. Dosyayı Word'de “Farklı kaydet → .docx” ile kaydedip yeniden dene.");
  if (ad.endsWith(".txt") || dosya.type.startsWith("text/")) return dosya.text();
  throw new Error("Yalnızca .txt ve .docx dosyaları okunabilir.");
}

// "Önceki tutanaklardan seç" penceresi: işaretlenen kararlar atıflarıyla Madde 1'e eklenir.
function devredenSecimPenceresi(tutanaklar) {
  const mevcut = new Set(tutanakFormunuOku().devreden.map((d) => d.metin + "|" + d.atif));
  const adaylar = devredenAdaylari(tutanaklar, tutanakEkrani.id).filter((a) => !mevcut.has(a.metin + "|" + a.atif));
  const pencere = sec("#pencere");
  pencere.setAttribute("aria-labelledby", "pencere-baslik");
  pencere.innerHTML =
    '<form class="form"><h2 id="pencere-baslik">Devreden kararları seç</h2>' +
    (adaylar.length
      ? '<p class="soluk kucuk-yazi" style="margin-bottom:10px">Seçtiklerin, alındıkları toplantının atfıyla Madde 1\'e eklenir.</p>' +
        '<div class="aday-liste">' + adaylar.map((aday, sira) =>
          '<label><input type="checkbox" value="' + sira + '"><span>' + htmlKacis(aday.metin) +
          "<small>" + htmlKacis(aday.atif) + "</small></span></label>").join("") + "</div>"
      : '<p class="soluk" style="margin-bottom:14px">Eklenebilecek karar yok. Önceki tutanaklarda karar bulunmuyor ya da hepsi zaten eklenmiş.</p>') +
    '<div class="form-dugmeler"><button type="button" class="dugme" data-kapat>Vazgeç</button>' +
    (adaylar.length ? '<button type="submit" class="dugme ana">Seçilenleri ekle</button>' : "") + "</div></form>";

  pencere.querySelector("[data-kapat]").onclick = () => pencere.close();
  pencere.querySelector("form").onsubmit = (olay) => {
    olay.preventDefault();
    const secilen = [...pencere.querySelectorAll("input:checked")].map((kutu) => adaylar[Number(kutu.value)]);
    pencere.close();
    if (!secilen.length) return;
    bildir(secilen.length + " karar Madde 1'e eklendi");
    tutanakFormunuYenile((taslak) => taslak.devreden.push(...secilen.map((a) => ({ metin: a.metin, atif: a.atif }))));
  };
  pencere.showModal();
}

function tutanakDuzenleCiz(kok, tutanaklar) {
  kok.innerHTML =
    '<div class="arac-cubugu"><b>' + (tutanakEkrani.id ? "Tutanağı düzenle" : "Yeni tutanak") + "</b></div>" +
    tutanakFormuHtml(tutanakEkrani.taslak);

  const form = sec("#tutanak-formu");
  const hata = sec("#tf-hata");
  const hataGosterForm = (mesaj) => { hata.textContent = mesaj; hata.hidden = false; hata.scrollIntoView({ block: "center" }); };
  let kaydediliyor = false;

  form.onsubmit = async (olay) => {
    olay.preventDefault();
    if (kaydediliyor) return; // çift tıklama çift kayıt oluşturmasın
    const tutanak = tutanakFormunuOku();

    if (!tarihGecerli(tutanak.toplanti_tarihi)) return hataGosterForm("Toplantı tarihi gerekli (2000–2100 arası geçerli bir tarih).");
    if (tutanak.tutanak_tarihi && !tarihGecerli(tutanak.tutanak_tarihi)) return hataGosterForm("Tutanak tarihi geçerli değil.");
    if (tutanak.devreden.some((d) => !d.metin)) return hataGosterForm("Devreden kararlarda metni boş bir satır var; doldur ya da kaldır.");
    const ayniNumara = tutanak.numara && tutanaklar.some((t) => t.id !== tutanakEkrani.id && t.numara === tutanak.numara);
    if (ayniNumara && !confirm('"' + tutanak.numara + '" numarası başka bir tutanakta kullanılmış. Yine de kaydedilsin mi?')) return;

    kaydediliyor = true;
    try {
      // Kayda yalnızca tutanak alanları gider (id ve olusturma depoya aittir).
      const kayit = { takim_id: durum.takim.id };
      for (const alan of Object.keys(bosTutanak())) kayit[alan] = tutanak[alan];
      const kaydedilen = tutanakEkrani.id
        ? await durum.depo.guncelle("tutanaklar", tutanakEkrani.id, kayit)
        : await durum.depo.ekle("tutanaklar", kayit);
      Object.assign(tutanakEkrani, { kip: "goruntule", id: kaydedilen.id, taslak: null, artan: [], notlar: "" });
      bildir("Tutanak kaydedildi");
      await yenile();
    } catch (hataNesnesi) {
      console.error(hataNesnesi);
      kaydediliyor = false;
      hataGosterForm("Kaydedilemedi: " + hataNesnesi.message);
    }
  };

  const dosyaSecici = sec("#tf-dosya");
  dosyaSecici.onchange = async () => {
    const dosya = dosyaSecici.files[0];
    dosyaSecici.value = ""; // aynı dosya yeniden seçilebilsin
    if (!dosya) return;
    try {
      const metin = await notDosyasiniOku(dosya);
      sec("#tf-notlar").value = metin; // kullanıcı ne okunduğunu görsün
      await notlariFormaYerlestir(metin);
    } catch (hataNesnesi) {
      console.error(hataNesnesi);
      hataGosterForm("Dosya okunamadı: " + hataNesnesi.message);
    }
  };

  eylemleriBagla(kok, {
    ayristir: () => notlariFormaYerlestir(sec("#tf-notlar").value),
    "dosya-sec": () => dosyaSecici.click(),
    "devreden-ekle": () => tutanakFormunuYenile((taslak) => taslak.devreden.push({ metin: "", atif: "" })),
    "devreden-sil": (sira) => tutanakFormunuYenile((taslak) => taslak.devreden.splice(Number(sira), 1)),
    "devreden-sec": () => devredenSecimPenceresi(tutanaklar),
    onizle: () => {
      const onizleme = sec("#tutanak-onizleme");
      onizleme.innerHTML = tutanakBelgeHtml(tutanakFormunuOku());
      onizleme.focus();
      onizleme.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    vazgec: () => {
      if (!confirm("Kaydedilmemiş değişiklikler kaybolacak. Çıkılsın mı?")) return;
      // Var olan bir tutanak düzenleniyorduysa onun görünümüne, yeniyse listeye dön.
      if (tutanakEkrani.id) Object.assign(tutanakEkrani, { kip: "goruntule", taslak: null, artan: [], notlar: "" });
      else tutanakListesineDon();
      return yenile();
    },
  });
}

/* ---------- Ekran ---------- */

async function tutanaklarEkraniCiz(kok) {
  const tutanaklar = await takimKayitlari("tutanaklar");

  if (tutanakEkrani.kip === "duzenle" && tutanakEkrani.taslak) {
    return tutanakDuzenleCiz(kok, tutanaklar);
  }
  const acik = tutanaklar.find((t) => t.id === tutanakEkrani.id);
  if (tutanakEkrani.kip === "goruntule" && acik) {
    return tutanakGoruntuleCiz(kok, acik, tutanaklar);
  }
  // Açık tutanak bu takımda yoksa (takım değişti ya da silindi) listeye dön.
  tutanakListesineDon();
  tutanakListesiCiz(kok, tutanaklar);
}

ekranKaydet("tutanaklar", {
  baslik: "Resmî tutanaklar",
  kisaAd: "Tutanak",
  simge: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7M9 8h3",
  ciz: tutanaklarEkraniCiz,
  // Menüden basılınca listeye dön. Yarım kalmış bir form varsa kaybolmasın diye
  // düzenleme sırasında sıfırlamıyoruz.
  sifirla: () => { if (tutanakEkrani.kip !== "duzenle") tutanakListesineDon(); },
});
