/* ==========================================================================
   EKRAN: Mesajlar (WhatsApp)
   Üç görünüm:
     ana      : şablonlar + kayıtlı gönderim listeleri
     yeni     : şablon seç, değerleri doldur, kişileri seç -> gönderim listesi
                (ya da "gruba tek mesaj": kopyala / WhatsApp'ta paylaş)
     kampanya : kişi kişi "WhatsApp'ta aç" düğmeleri, gönderildi işareti, sayaç (12/72)

   NEDEN TEK TEK? WhatsApp otomatik toplu gönderimi resmî olarak desteklemez;
   resmî olmayan otomasyon araçları hesabın kapatılmasına yol açabilir. Bu
   ekran wa.me bağlantısıyla mesajı HAZIR açar, "Gönder"e kullanıcı basar.
   Hesaplar js/kisiler.js içinde ve testli.
   ========================================================================== */

const mesajEkrani = { kip: "ana", id: null, taslak: null, sadeceBekleyen: false };

const WHATSAPP_SINIR_NOTU =
  "WhatsApp, otomatik toplu gönderimi resmî olarak desteklemez; bu yüzden uygulama mesajı kendisi göndermez. " +
  "Her kişi için “WhatsApp'ta aç”a basınca mesaj hazır açılır, <b>Gönder</b>'e sen basarsın. " +
  "Gruba duyuru için mesajı kopyala ya da “WhatsApp'ta paylaş” ile grubu seç.";

function bosMesajTaslagi() {
  return {
    tur: "kisiler",           // "kisiler": kişiye özel liste | "grup": tek mesaj
    sablon_id: "", ad: "", mesaj: "",
    degerler: { tarih: "", saat: "", yer: "", link: "" },
    secili: [],               // seçili kişi kimlikleri
    etiket: "", arama: "",
    tutanak_id: "",           // "Tutanaktan doldur" ile seçilen tutanak
    tutanakUygula: false,     // tutanak ekranından gelindiyse ilk çizimde uygulanır
  };
}

// Tutanak ekranından çağrılır: "Hatırlatma mesajı hazırla"
function tutanaktanMesajHazirla(tutanakId) {
  Object.assign(mesajEkrani, { kip: "yeni", id: null, taslak: { ...bosMesajTaslagi(), tutanak_id: tutanakId, tutanakUygula: true } });
  ekranaGit("mesajlar");
}

/* ---------- Şablonlar ---------- */

function sablonFormu(sablon) {
  formAc({
    baslik: sablon ? "Şablonu düzenle" : "Yeni şablon",
    alanlar: [
      { ad: "ad", etiket: "Şablon adı", tur: "metin", zorunlu: true },
      { ad: "tur", etiket: "Tür", tur: "secim", secenekler: SABLON_TURLERI },
      { ad: "metin", etiket: "Mesaj", tur: "uzun", zorunlu: true,
        ipucu: "Değişkenler: {ad} kişinin hitap adı, {tarih}, {saat}, {yer}, {link}. Gönderirken doldurulur." },
    ],
    degerler: sablon || { tur: "duyuru" },
    kaydet: async (degerler) => {
      if (sablon) await durum.depo.guncelle("sablonlar", sablon.id, degerler);
      else await durum.depo.ekle("sablonlar", { ...degerler, takim_id: durum.takim.id });
      bildir("Şablon kaydedildi");
    },
  });
}

async function hazirSablonlariEkle() {
  for (const sablon of VARSAYILAN_SABLONLAR) {
    await durum.depo.ekle("sablonlar", { ...sablon, takim_id: durum.takim.id });
  }
  bildir(VARSAYILAN_SABLONLAR.length + " hazır şablon eklendi; dilediğin gibi düzenleyebilirsin");
  await yenile();
}

/* ---------- Ana görünüm ---------- */

function mesajAnaCiz(kok, sablonlar, kampanyalar) {
  const turAdi = (tur) => (SABLON_TURLERI.find((t) => t.deger === tur) || { etiket: tur }).etiket;
  const sirali = [...kampanyalar].sort((a, b) => String(b.olusturma).localeCompare(String(a.olusturma)));

  const kampanyaSatirlari = sirali.map((k) => {
    const ilerleme = kampanyaIlerleme(k);
    const yuzde = ilerleme.toplam ? Math.round((100 * ilerleme.gonderilen) / ilerleme.toplam) : 0;
    return '<li class="tarih-satir"><div class="tarih-bilgi"><h4>' + htmlKacis(k.ad) + "</h4>" +
      // olusturma UTC zaman damgasıdır; gün, kullanıcının yerel saatine göre yazılır (gece yarısı kayması olmasın)
      "<p>" + htmlKacis(k.olusturma ? tarihYaz(tarihMetni(new Date(k.olusturma))) : "") + "</p>" +
      '<div class="oran" style="max-width:320px"><span class="oran-cubuk" aria-hidden="true"><span style="width:' + yuzde + '%"></span></span>' +
      "<b>" + ilerleme.yazi + "</b></div></div>" +
      '<div class="satir-dugmeler">' + kayitDugmesi("kampanya-ac", k.id, "Aç", k.ad) +
      kayitDugmesi("kampanya-sil", k.id, "Sil", k.ad, "tehlike") + "</div></li>";
  }).join("");

  const sablonSatirlari = sablonlar.map((s) =>
    '<li class="tarih-satir"><div class="tarih-bilgi"><h4>' + htmlKacis(s.ad) + ' <span class="rozet">' + htmlKacis(turAdi(s.tur)) + "</span></h4>" +
    '<p class="sablon-onizleme">' + htmlKacis(s.metin) + "</p></div>" +
    '<div class="satir-dugmeler">' + kayitDugmesi("sablon-duzenle", s.id, "Düzenle", s.ad) +
    kayitDugmesi("sablon-sil", s.id, "Sil", s.ad, "tehlike") + "</div></li>").join("");

  kok.innerHTML =
    '<p class="bilgi-kutusu">' + WHATSAPP_SINIR_NOTU + "</p>" +
    '<div class="arac-cubugu"><span class="bosluk"></span>' +
    '<button class="dugme" data-eylem="grup">Gruba duyuru</button>' +
    '<button class="dugme ana" data-eylem="yeni">+ Yeni gönderim</button></div>' +

    '<section class="kart" style="margin-bottom:18px"><h3>Gönderim listeleri</h3>' +
    (sirali.length ? '<ul class="tarih-liste">' + kampanyaSatirlari + "</ul>"
      : '<p class="soluk">Henüz gönderim yok. “Yeni gönderim” ile şablon ve kişileri seç; her kişi için hazır bir WhatsApp bağlantısı oluşur.</p>') +
    "</section>" +

    '<section class="kart"><h3>Şablonlar</h3>' +
    (sablonlar.length ? '<ul class="tarih-liste">' + sablonSatirlari + "</ul>"
      : '<p class="soluk" style="margin-bottom:10px">Kayıtlı şablon yok. Kabul, davet, hatırlatma ve genel duyuru için hazır şablonları ekleyebilirsin.</p>' +
        '<button class="dugme" data-eylem="hazir-sablonlar">Hazır şablonları ekle</button>') +
    '<div class="arac-cubugu" style="margin:12px 0 0"><button class="dugme" data-eylem="sablon-yeni">+ Yeni şablon</button></div>' +
    "</section>";

  const bulS = (id) => sablonlar.find((s) => s.id === id);
  const bulK = (id) => kampanyalar.find((k) => k.id === id);
  eylemleriBagla(kok, {
    yeni: () => { Object.assign(mesajEkrani, { kip: "yeni", taslak: bosMesajTaslagi() }); return yenile(); },
    grup: () => { Object.assign(mesajEkrani, { kip: "yeni", taslak: { ...bosMesajTaslagi(), tur: "grup" } }); return yenile(); },
    "hazir-sablonlar": hazirSablonlariEkle,
    "sablon-yeni": () => sablonFormu(null),
    "sablon-duzenle": (id) => bulS(id) && sablonFormu(bulS(id)),
    "sablon-sil": async (id) => {
      const s = bulS(id);
      if (!s || !confirm('"' + s.ad + '" şablonu silinsin mi?')) return;
      await durum.depo.sil("sablonlar", id);
      bildir("Şablon silindi");
      await yenile();
    },
    "kampanya-ac": (id) => { Object.assign(mesajEkrani, { kip: "kampanya", id: id, sadeceBekleyen: false }); return yenile(); },
    "kampanya-sil": async (id) => {
      const k = bulK(id);
      if (!k || !confirm('"' + k.ad + '" gönderim listesi silinsin mi?\n(Gönderilmiş mesajlar WhatsApp\'ta kalır; yalnızca bu liste silinir.)')) return;
      await durum.depo.sil("kampanyalar", id);
      bildir("Gönderim listesi silindi");
      await yenile();
    },
  });
}

/* ---------- Yeni gönderim ---------- */

// Formdaki değerleri taslağa yazar (ekran yeniden çizilmeden önce: yazılanlar kaybolmasın)
function mesajFormunuOku() {
  const t = mesajEkrani.taslak;
  const deger = (id) => (sec(id) ? sec(id).value : "");
  t.ad = deger("#mf-ad").trim();
  t.mesaj = deger("#mf-mesaj");
  for (const alan of ["tarih", "saat", "yer", "link"]) t.degerler[alan] = deger("#mf-" + alan).trim();
  return t;
}

function mesajYeniCiz(kok, sablonlar, kisiler, tutanaklar) {
  const t = mesajEkrani.taslak;
  const grup = t.tur === "grup";
  const tutanakSirali = tutanaklariSirala(tutanaklar).reverse();

  // Tutanak ekranından gelindiyse: hatırlatma şablonu + tutanaktaki tarih/saat + tutanaktaki kişiler
  if (t.tutanakUygula) {
    t.tutanakUygula = false;
    const tutanak = tutanaklar.find((x) => x.id === t.tutanak_id);
    const hatirlatma = sablonlar.find((s) => s.tur === "hatirlatma");
    if (hatirlatma) Object.assign(t, { sablon_id: hatirlatma.id, mesaj: hatirlatma.metin });
    if (tutanak) tutanagiTaslagaUygula(t, tutanak, kisiler);
  }

  const secili = new Set(t.secili);
  const tumEtiketler = etiketler(kisiler);
  const turAdi = (tur) => (SABLON_TURLERI.find((x) => x.deger === tur) || { etiket: tur }).etiket;
  const girdi = (ad, etiket, ipucu) =>
    '<label class="alan"><span>' + etiket + '</span><input type="text" id="mf-' + ad + '" maxlength="300" value="' + htmlKacis(t.degerler[ad]) + '">' +
    (ipucu ? "<small>" + ipucu + "</small>" : "") + "</label>";

  kok.innerHTML =
    '<div class="arac-cubugu"><button class="dugme" data-eylem="geri">← Mesajlar</button>' +
    "<b>" + (grup ? "Gruba duyuru" : "Yeni gönderim") + "</b></div>" +
    '<p class="bilgi-kutusu">' + WHATSAPP_SINIR_NOTU + "</p>" +
    '<form id="mesaj-formu" class="tutanak-form" novalidate>' +

    '<section class="kart"><h3>1. Mesaj</h3>' +
    '<div class="secenekler" role="radiogroup" aria-label="Gönderim biçimi" style="margin-bottom:14px">' +
    '<label><input type="radio" name="mf-tur" value="kisiler"' + (grup ? "" : " checked") + "> Kişilere tek tek (her birine kendi adıyla)</label>" +
    '<label><input type="radio" name="mf-tur" value="grup"' + (grup ? " checked" : "") + "> Gruba tek mesaj</label></div>" +
    '<div class="alan-izgara">' +
    '<label class="alan"><span>Şablon</span><select id="mf-sablon"><option value="">— Şablonsuz —</option>' +
    sablonlar.map((s) => '<option value="' + htmlKacis(s.id) + '"' + (s.id === t.sablon_id ? " selected" : "") + ">" +
      htmlKacis(s.ad + " (" + turAdi(s.tur) + ")") + "</option>").join("") + "</select>" +
    (sablonlar.length ? "" : "<small>Şablon yok; Mesajlar ekranından hazır şablonları ekleyebilirsin.</small>") + "</label>" +
    '<label class="alan"><span>Tutanaktan doldur</span><select id="mf-tutanak"><option value="">— Seç —</option>' +
    tutanakSirali.map((x) => '<option value="' + htmlKacis(x.id) + '"' + (x.id === t.tutanak_id ? " selected" : "") + ">" +
      htmlKacis((x.numara || tarihYaz(x.toplanti_tarihi, false)) + (x.sonraki_toplanti ? " → " + x.sonraki_toplanti : "")) + "</option>").join("") +
    "</select><small>Sonraki toplantının tarih ve saatini alır" + (grup ? "" : "; tutanakta adı geçen kişileri seçer") + ".</small></label>" +
    girdi("tarih", "{tarih}") + girdi("saat", "{saat}") + girdi("yer", "{yer}") + girdi("link", "{link}", "Kayıt formu, konum ya da duyuru bağlantısı") +
    "</div>" +
    '<label class="alan"><span>Mesaj metni</span><textarea id="mf-mesaj" class="uzun" maxlength="4000">' + htmlKacis(t.mesaj) + "</textarea>" +
    "<small>" + (grup ? "Gruba gittiği için {ad} kullanma." : "{ad} her kişide kendi hitap adıyla değişir.") + "</small></label>" +
    '<div class="mesaj-onizleme"><span class="soluk kucuk-yazi">Önizleme</span><p id="mf-onizleme"></p><p class="form-hata" id="mf-eksik" hidden></p></div>' +
    "</section>" +

    (grup
      ? '<section class="kart"><h3>2. Paylaş</h3><p class="soluk kucuk-yazi" style="margin-bottom:10px">' +
        "Kopyalayıp gruba yapıştır ya da “WhatsApp'ta paylaş”a bas; açılan WhatsApp'ta grubu ya da sohbeti seç.</p>" +
        '<div class="arac-cubugu" style="margin:0"><button type="button" class="dugme" data-eylem="kopyala">Mesajı kopyala</button>' +
        '<a class="dugme ana" id="mf-paylas" target="_blank" rel="noopener">WhatsApp\'ta paylaş</a></div></section>'
      : '<section class="kart"><h3>2. Kişiler <span class="soluk kucuk-yazi" id="mf-secili-sayi"></span></h3>' +
        (kisiler.length
          ? '<div class="arac-cubugu"><label>Etiket <select id="mf-etiket"><option value="">Hepsi</option>' +
            tumEtiketler.map((e) => '<option value="' + htmlKacis(e) + '"' + (e === t.etiket ? " selected" : "") + ">" + htmlKacis(e) + "</option>").join("") +
            "</select></label>" +
            '<label><span class="gizli">Kişi ara</span><input type="search" id="mf-ara" placeholder="Ara…" value="' + htmlKacis(t.arama) + '"></label>' +
            '<button type="button" class="dugme kucuk" data-eylem="gorunenleri-sec">Görünenleri seç</button>' +
            '<button type="button" class="dugme kucuk" data-eylem="secimi-temizle">Seçimi temizle</button></div>' +
            '<div class="kisi-secim" id="mf-kisiler"></div>'
          : '<p class="soluk">Rehberde kişi yok. Önce <b>Kişiler</b> ekranından kişi ekle ya da içe aktar.</p>') +
        "</section>" +
        '<section class="kart"><h3>3. Kaydet</h3>' +
        '<label class="alan"><span>Gönderim adı</span><input type="text" id="mf-ad" maxlength="120" value="' + htmlKacis(t.ad) + '" placeholder="ör. Kabul mesajları — Mart"></label>' +
        '<p class="form-hata" id="mf-hata" role="alert" hidden></p>' +
        '<button type="submit" class="dugme ana" id="mf-kaydet">Gönderim listesini oluştur</button></section>') +
    "</form>";

  const form = sec("#mesaj-formu");

  // Seçim listesi ve önizleme: yazarken ekranı baştan çizmeden güncellenir
  function listeyiCiz() {
    const kutu = sec("#mf-kisiler");
    if (!kutu) return;
    const gorunen = kisileriSuz(kisiler, t);
    kutu.innerHTML = gorunen.length
      ? gorunen.map((k) => '<label><input type="checkbox" value="' + htmlKacis(k.id) + '"' + (secili.has(k.id) ? " checked" : "") + ">" +
          "<span>" + htmlKacis(k.ad) + ' <span class="soluk kucuk-yazi">' + htmlKacis(telefonGoster(k.telefon)) +
          (k.etiket ? " · " + htmlKacis(k.etiket) : "") + "</span></span></label>").join("")
      : '<p class="soluk kucuk-yazi">Aramaya uyan kişi yok.</p>';
    sayaciGuncelle();
  }
  function sayaciGuncelle() {
    t.secili = [...secili];
    const sayi = sec("#mf-secili-sayi");
    if (sayi) sayi.textContent = "(" + secili.size + " seçili)";
    const dugme = sec("#mf-kaydet");
    if (dugme) dugme.textContent = "Gönderim listesini oluştur (" + secili.size + " kişi)";
    onizlemeyiGuncelle();
  }
  function onizlemeyiGuncelle() {
    mesajFormunuOku();
    const ilkSecili = kisiler.find((k) => secili.has(k.id));
    const ornekAd = grup ? "" : (ilkSecili ? ilkSecili.ilk_ad || ilkAdTahmin(ilkSecili.ad) : "Ece");
    const metin = sablonDoldur(t.mesaj, { ...t.degerler, ad: ornekAd });
    sec("#mf-onizleme").textContent = metin || "—";
    const eksik = eksikDegiskenler(metin);
    const eksikKutu = sec("#mf-eksik");
    eksikKutu.hidden = !eksik.length;
    eksikKutu.textContent = eksik.length ? "Doldurulmamış: " + eksik.map((e) => "{" + e + "}").join(" ") + " — mesajda olduğu gibi görünür." : "";
    const paylas = sec("#mf-paylas");
    if (paylas) paylas.href = waPaylasLinki(metin);
  }

  listeyiCiz();
  onizlemeyiGuncelle();
  form.oninput = (olay) => {
    if (olay.target.id === "mf-ara") { t.arama = olay.target.value; return listeyiCiz(); }
    onizlemeyiGuncelle();
  };
  form.onchange = (olay) => {
    const hedef = olay.target;
    if (hedef.closest("#mf-kisiler")) {
      if (hedef.checked) secili.add(hedef.value); else secili.delete(hedef.value);
      return sayaciGuncelle();
    }
    if (hedef.id === "mf-etiket") { t.etiket = hedef.value; return listeyiCiz(); }
    if (hedef.name === "mf-tur") { mesajFormunuOku(); t.tur = hedef.value; return yenile(); }
    if (hedef.id === "mf-sablon") {
      mesajFormunuOku();
      const sablon = sablonlar.find((s) => s.id === hedef.value);
      t.sablon_id = hedef.value;
      if (sablon) { t.mesaj = sablon.metin; if (!t.ad) t.ad = sablon.ad + " — " + tarihYaz(bugun(), false); }
      return yenile();
    }
    if (hedef.id === "mf-tutanak") {
      mesajFormunuOku();
      t.tutanak_id = hedef.value;
      const tutanak = tutanaklar.find((x) => x.id === hedef.value);
      if (tutanak) tutanagiTaslagaUygula(t, tutanak, grup ? [] : kisiler);
      return yenile();
    }
  };

  form.onsubmit = async (olay) => {
    olay.preventDefault();
    if (grup) return;
    mesajFormunuOku();
    const hata = sec("#mf-hata");
    const goster = (mesaj) => { hata.textContent = mesaj; hata.hidden = false; };
    const alicilar = kisiler.filter((k) => secili.has(k.id));
    if (!t.mesaj.trim()) return goster("Mesaj metni boş.");
    if (!alicilar.length) return goster("En az bir kişi seç.");
    const dugme = sec("#mf-kaydet");
    if (dugme.disabled) return;
    dugme.disabled = true;
    try {
      const kampanya = kampanyaHazirla({ ad: t.ad || "Gönderim — " + tarihYaz(bugun(), false), sablonId: t.sablon_id, mesaj: t.mesaj, degerler: t.degerler }, alicilar);
      const kayit = await durum.depo.ekle("kampanyalar", { ...kampanya, takim_id: durum.takim.id });
      Object.assign(mesajEkrani, { kip: "kampanya", id: kayit.id, taslak: null, sadeceBekleyen: false });
      bildir("Gönderim listesi oluşturuldu: " + alicilar.length + " kişi");
      await yenile();
    } catch (hataNesnesi) {
      console.error(hataNesnesi);
      dugme.disabled = false;
      goster("Kaydedilemedi: " + hataNesnesi.message);
    }
  };

  eylemleriBagla(kok, {
    geri: () => { Object.assign(mesajEkrani, { kip: "ana", taslak: null }); return yenile(); },
    "gorunenleri-sec": () => { for (const k of kisileriSuz(kisiler, t)) secili.add(k.id); listeyiCiz(); },
    "secimi-temizle": () => { secili.clear(); listeyiCiz(); },
    kopyala: async () => {
      // panoyaKopyala (duyuru.js) bir metin kutusu bekler; önizlemedeki son metni geçici kutuya koyuyoruz
      const kutu = document.createElement("textarea");
      kutu.value = sec("#mf-onizleme").textContent;
      kutu.setAttribute("readonly", "");
      kutu.style.position = "fixed"; kutu.style.opacity = "0";
      document.body.appendChild(kutu);
      await panoyaKopyala(kutu);
      kutu.remove();
      bildir("Mesaj kopyalandı; WhatsApp grubuna yapıştırabilirsin");
    },
  });
}

// Tutanaktaki sonraki toplantı bilgisini ve kişileri taslağa yazar
function tutanagiTaslagaUygula(taslak, tutanak, kisiler) {
  const degerler = tutanaktanDegerler(tutanak);
  if (degerler.tarih) taslak.degerler.tarih = degerler.tarih;
  if (degerler.saat) taslak.degerler.saat = degerler.saat;
  const bulunan = tutanakKisileri(tutanak, kisiler);
  taslak.secili = [...new Set([...taslak.secili, ...bulunan])];
  if (!taslak.ad) taslak.ad = "Hatırlatma — " + (tutanak.numara || tarihYaz(tutanak.toplanti_tarihi, false));
  bildir("Tutanaktan dolduruldu" + (kisiler.length ? ": " + bulunan.length + " kişi rehberde bulundu" : ""));
}

/* ---------- Gönderim listesi (kampanya) ---------- */

function kampanyaCiz(kok, kampanya) {
  const ilerleme = kampanyaIlerleme(kampanya);

  const satirHtml = (a, sira) =>
    '<li class="alici' + (a.gonderildi ? " gonderildi" : "") + '" data-sira="' + sira + '">' +
    '<span class="alici-no">' + (sira + 1) + "</span>" +
    '<label class="alici-isaret"><input type="checkbox" data-isaret="' + sira + '"' + (a.gonderildi ? " checked" : "") + ">" +
    '<span class="gizli">' + htmlKacis(a.ad) + " gönderildi</span></label>" +
    '<span class="alici-ad">' + htmlKacis(a.ad) + '<span class="soluk kucuk-yazi">' + htmlKacis(telefonGoster(a.telefon)) + "</span></span>" +
    '<a class="dugme ana kucuk" target="_blank" rel="noopener" data-wa="' + sira + '" href="' + htmlKacis(waLinki(a.telefon, aliciMesaji(kampanya, a))) + '">' +
    "WhatsApp'ta aç</a></li>";

  kok.innerHTML =
    '<div class="arac-cubugu"><button class="dugme" data-eylem="geri">← Mesajlar</button><span class="bosluk"></span>' +
    '<label><input type="checkbox" id="kp-bekleyen"' + (mesajEkrani.sadeceBekleyen ? " checked" : "") + "> Yalnızca gönderilmeyenler</label>" +
    '<button class="dugme" data-eylem="sifirla">İşaretleri sıfırla</button>' +
    '<button class="dugme tehlike" data-eylem="sil">Sil</button></div>' +
    '<section class="kart" style="margin-bottom:18px"><h3>' + htmlKacis(kampanya.ad) + "</h3>" +
    '<div class="oran ilerleme" style="margin-bottom:10px"><span class="oran-cubuk" aria-hidden="true"><span id="kp-cubuk"></span></span>' +
    '<b id="kp-sayac" aria-live="polite"></b></div>' +
    '<details><summary class="kucuk-yazi">Mesaj metni</summary><p class="sablon-onizleme" style="margin-top:6px">' + htmlKacis(kampanya.mesaj) + "</p></details>" +
    '<p class="soluk kucuk-yazi" style="margin-top:8px">“WhatsApp\'ta aç”a basınca kişi gönderildi olarak işaretlenir. ' +
    "Göndermekten vazgeçtiysen kutudaki işareti kaldır.</p></section>" +
    '<ol class="alici-liste' + (mesajEkrani.sadeceBekleyen ? " sadece-bekleyen" : "") + '" id="kp-liste">' +
    kampanya.alicilar.map(satirHtml).join("") + "</ol>";

  function sayaciGuncelle() {
    const i = kampanyaIlerleme(kampanya);
    sec("#kp-sayac").textContent = i.yazi + " gönderildi";
    sec("#kp-cubuk").style.width = (i.toplam ? (100 * i.gonderilen) / i.toplam : 0) + "%";
  }
  sayaciGuncelle();

  // Tek bir kişinin işaretini kaydeder. Ekranı baştan çizmiyoruz: liste uzunken
  // kaydırma konumu kaybolmasın, kullanıcı kaldığı yerden devam etsin.
  async function isaretle(sira, gonderildi) {
    kampanya.alicilar = aliciIsaretle(kampanya.alicilar, sira, gonderildi, new Date().toISOString());
    const satir = sec('#kp-liste li[data-sira="' + sira + '"]');
    satir.classList.toggle("gonderildi", gonderildi);
    satir.querySelector("[data-isaret]").checked = gonderildi;
    sayaciGuncelle();
    try {
      await durum.depo.guncelle("kampanyalar", kampanya.id, { alicilar: kampanya.alicilar });
    } catch (hata) {
      if (hata.name !== "CakismaHatasi") return hataGoster(hata);
      // Başka biri de aynı listeden gönderiyor: onun işaretlerini koru, yalnızca
      // bu kişinin işaretini güncel listeye ekle (uyarı vermeden birleştir).
      try {
        const guncel = await durum.depo.oku("kampanyalar", kampanya.id);
        guncel.alicilar = aliciIsaretle(guncel.alicilar, sira, gonderildi, new Date().toISOString());
        await durum.depo.guncelle("kampanyalar", kampanya.id, { alicilar: guncel.alicilar });
        await yenile(); // diğer kişinin işaretleri de ekranda görünsün
      } catch (ikinci) {
        hataGoster(ikinci);
      }
    }
  }

  const liste = sec("#kp-liste");
  // Bağlantıya tıklama: varsayılan davranış (WhatsApp'ı yeni sekmede açmak) sürer, ayrıca işaretlenir
  liste.addEventListener("click", (olay) => {
    const baglanti = olay.target.closest("a[data-wa]");
    if (baglanti) isaretle(Number(baglanti.dataset.wa), true);
  });
  liste.addEventListener("change", (olay) => {
    if (olay.target.dataset.isaret !== undefined) isaretle(Number(olay.target.dataset.isaret), olay.target.checked);
  });
  sec("#kp-bekleyen").onchange = (olay) => {
    mesajEkrani.sadeceBekleyen = olay.target.checked;
    liste.classList.toggle("sadece-bekleyen", olay.target.checked);
  };

  eylemleriBagla(kok, {
    geri: () => { Object.assign(mesajEkrani, { kip: "ana", id: null }); return yenile(); },
    sifirla: async () => {
      if (!confirm("Bütün “gönderildi” işaretleri kaldırılsın mı?")) return;
      kampanya.alicilar = kampanya.alicilar.map((a) => ({ ...a, gonderildi: false, zaman: "" }));
      await durum.depo.guncelle("kampanyalar", kampanya.id, { alicilar: kampanya.alicilar });
      await yenile();
    },
    sil: async () => {
      if (!confirm('"' + kampanya.ad + '" gönderim listesi silinsin mi?')) return;
      await durum.depo.sil("kampanyalar", kampanya.id);
      Object.assign(mesajEkrani, { kip: "ana", id: null });
      bildir("Gönderim listesi silindi");
      await yenile();
    },
  });
}

/* ---------- Ekran ---------- */

async function mesajlarEkraniCiz(kok) {
  const [sablonlar, kampanyalar, kisiler, tutanaklar] = await Promise.all([
    takimKayitlari("sablonlar"), takimKayitlari("kampanyalar"), takimKayitlari("kisiler"), takimKayitlari("tutanaklar"),
  ]);
  sablonlar.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  kisiler.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  if (mesajEkrani.kip === "yeni" && mesajEkrani.taslak) return mesajYeniCiz(kok, sablonlar, kisiler, tutanaklar);
  const acik = kampanyalar.find((k) => k.id === mesajEkrani.id);
  if (mesajEkrani.kip === "kampanya" && acik) return kampanyaCiz(kok, acik);
  Object.assign(mesajEkrani, { kip: "ana", id: null, taslak: null });
  mesajAnaCiz(kok, sablonlar, kampanyalar);
}

ekranKaydet("mesajlar", {
  baslik: "WhatsApp mesajları",
  kisaAd: "Mesajlar",
  simge: "M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12zM8.5 12h.01M12 12h.01M15.5 12h.01",
  ciz: mesajlarEkraniCiz,
  // Menüden basılınca ana görünüme dön; yarım kalan yeni gönderim formu korunur
  sifirla: () => { if (mesajEkrani.kip !== "yeni") Object.assign(mesajEkrani, { kip: "ana", id: null }); },
});
