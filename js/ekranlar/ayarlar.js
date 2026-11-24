/* ==========================================================================
   EKRAN: Ayarlar
   - Görünüm: açık / koyu / cihaza uy (js/tema.js)
   - Yedekleme: bütün veriyi JSON dosyasına indir, dosyadan geri yükle (js/yedek.js)
   - Veri deposu: verinin nerede durduğu; Supabase kullanılıyorsa hesap ve çıkış
   ========================================================================== */

const YEDEK_DOSYA_SINIRI = 5 * 1024 * 1024; // 5 MB

// İçeriği dosya olarak indirir: bellekte bir dosya (Blob) oluşturur ve
// görünmez bir bağlantıya tıklar. Sunucu gerekmez.
// icerik: metin ya da bayt dizisi (Word dosyası için). tur: dosyanın türü (MIME).
function dosyaIndir(dosyaAdi, icerik, tur = "application/json") {
  const adres = URL.createObjectURL(new Blob([icerik], { type: tur }));
  const baglanti = document.createElement("a");
  baglanti.href = adres;
  baglanti.download = dosyaAdi;
  document.body.appendChild(baglanti);
  baglanti.click();
  baglanti.remove();
  URL.revokeObjectURL(adres);
}

async function yedekIndir() {
  const yedek = await yedekOlustur(durum.depo);
  const adet = KOLEKSIYONLAR.reduce((toplam, k) => toplam + yedek.veriler[k].length, 0);
  dosyaIndir("seyir-yedek-" + bugun() + ".json", JSON.stringify(yedek, null, 2));
  bildir("Yedek indirildi (" + adet + " kayıt)");
}

// Seçilen dosyayı okur, denetler, onay alır ve depoya ekler.
async function yedektenYukle(dosya) {
  if (dosya.size > YEDEK_DOSYA_SINIRI) throw new Error("Dosya çok büyük (en çok 5 MB).");

  const sonuc = yedekCoz(await dosya.text());
  if (!sonuc.gecerli) throw new Error(sonuc.hata);
  if (sonuc.toplam === 0) throw new Error("Dosyada hiç kayıt yok.");

  const onay = confirm(
    "Dosyada " + sonuc.sayilar.takimlar + " takım ve toplam " + sonuc.toplam + " kayıt var.\n\n" +
    "İçe aktarılsın mı? Var olan kayıtların hiçbiri değiştirilmez ya da silinmez; yalnızca eksik olanlar eklenir.");
  if (!onay) return;

  const { eklenen, atlanan } = await yedekYukle(durum.depo, sonuc.veriler);
  await takimlariYukle();
  await yenile();
  bildir(eklenen + " kayıt eklendi" + (atlanan ? ", " + atlanan + " kayıt zaten vardı" : ""));
}

/* ---------- Erişim (yalnızca Supabase) ----------
   Hesap açmak davetlidir (schema.sql > bölüm 5). Yönetici burada davet
   listesini yönetir. Asıl denetim veritabanındadır; bu kart yalnızca arayüzdür:
   yönetici olmayan biri listeyi açmaya çalışsa da veritabanı boş döner. */
async function erisimKartiniDoldur(kart) {
  const icerik = kart.querySelector(".erisim-icerik");
  let rol;
  try {
    rol = await durum.oturum.rolum();
  } catch (hata) {
    icerik.innerHTML = '<p class="soluk">Rol bilgisi alınamadı: ' + htmlKacis(hata.message) +
      "</p><p class=\"soluk kucuk-yazi\">Veritabanına schema.sql'in son hâli uygulanmamış olabilir (SUPABASE_KURULUM.md).</p>";
    return;
  }
  if (rol !== "yonetici") {
    icerik.innerHTML = "<p>Rolün: <b>Üye</b>.</p><p class=\"soluk kucuk-yazi\">Uygulamaya yeni kişileri yönetici davet eder. " +
      "Takımına yeni birini eklemek istersen yöneticiden onu davet etmesini iste; hesabı açıldıktan sonra takımın davet koduyla da katılabilir.</p>";
    return;
  }

  const davetler = await durum.oturum.davetleriListele();
  const takimAdi = (id) => { const t = durum.takimlar.find((x) => x.id === id); return t ? t.ad : ""; };
  icerik.innerHTML =
    "<p>Rolün: <b>Yönetici</b>. Hesap açmak yalnızca davetle: aşağıdaki listede olmayan e-posta ile kimse hesap açamaz.</p>" +
    '<form class="satir-form" id="davet-formu" novalidate style="margin:12px 0 6px">' +
    '<label class="gizli" for="davet-eposta">Davet edilecek e-posta</label>' +
    '<input id="davet-eposta" type="email" placeholder="ornek@ornek.com" maxlength="254" autocomplete="off">' +
    '<button class="dugme ana" type="submit">Davet et</button></form>' +
    (durum.takim
      ? '<label class="kucuk-yazi" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="davet-takim" checked> ' +
        "Hesabını açınca “" + htmlKacis(durum.takim.ad) + "” takımına da üye olsun</label>"
      : "") +
    '<p class="form-hata" id="davet-hata" role="alert" hidden></p>' +
    (davetler.length
      ? '<ul class="davet-liste">' + davetler.map((d) =>
          "<li><span>" + htmlKacis(d.eposta) +
          '<span class="soluk kucuk-yazi">' + (d.kullanildi ? "hesap açıldı" : "bekliyor") +
          (d.takim_id && takimAdi(d.takim_id) ? " · " + htmlKacis(takimAdi(d.takim_id)) : "") + "</span></span>" +
          '<button class="dugme kucuk tehlike" type="button" data-davet-sil="' + htmlKacis(d.eposta) + '" aria-label="Davetten çıkar: ' +
          htmlKacis(d.eposta) + '">Çıkar</button></li>').join("") + "</ul>"
      : '<p class="soluk kucuk-yazi" style="margin-top:8px">Davet listesi boş.</p>') +
    '<p class="soluk kucuk-yazi" style="margin-top:8px">Listeden çıkarmak, açılmış hesabı silmez; hesabı Supabase panelinden ' +
    "(Authentication → Users) silebilirsin. Bir hesabı takımdan çıkarmak şimdilik Supabase panelinden yapılır (takim_uyelikleri tablosu).</p>";

  const hataKutusu = icerik.querySelector("#davet-hata");
  icerik.querySelector("#davet-formu").onsubmit = async (olay) => {
    olay.preventDefault();
    hataKutusu.hidden = true;
    const takimKutusu = icerik.querySelector("#davet-takim");
    try {
      const eposta = await durum.oturum.davetEkle(icerik.querySelector("#davet-eposta").value,
        takimKutusu && takimKutusu.checked ? durum.takim.id : null);
      bildir(eposta + " davet listesine eklendi. Artık bu e-postayla hesap açabilir.");
      await erisimKartiniDoldur(kart);
    } catch (hata) {
      hataKutusu.textContent = hata.message;
      hataKutusu.hidden = false;
    }
  };
  icerik.onclick = async (olay) => {
    const dugme = olay.target.closest("[data-davet-sil]");
    if (!dugme) return;
    const eposta = dugme.dataset.davetSil;
    if (!confirm(eposta + " davet listesinden çıkarılsın mı?")) return;
    try {
      await durum.oturum.davetSil(eposta);
      bildir("Davet kaldırıldı");
      await erisimKartiniDoldur(kart);
    } catch (hata) {
      hataGoster(hata);
    }
  };
}

/* ---------- Kurum (js/kurum.js) ----------
   Kurum türü (paket), logo, ana renk ve ilk tutanağın bilgileri. Ayarlar takım
   kaydının "ayarlar" alanına yazılır; kaydedilince uygulamaya hemen uygulanır
   (js/uygulama.js > kurumuUygula). Şimdilik takımdaki herkes değiştirebilir;
   "yalnızca yönetici" kuralı roller ve yetkiler projesinde gelir (tasarım belgesi). */
const LOGO_PIKSEL = 160;

// Seçilen resmi küçültüp PNG (çok büyükse WebP) data URL'ye çevirir. SVG kabul edilmez.
async function logoHazirla(dosya) {
  if (!/^image\/(png|jpeg|webp)$/.test(dosya.type)) throw new Error("Logo PNG, JPEG ya da WebP olmalı.");
  const resim = await createImageBitmap(dosya);
  const { en, boy } = logoOlcusu(resim.width, resim.height, LOGO_PIKSEL);
  const tuval = document.createElement("canvas");
  tuval.width = en;
  tuval.height = boy;
  tuval.getContext("2d").drawImage(resim, 0, 0, en, boy);
  resim.close();
  for (const [tur, kalite] of [["image/png"], ["image/webp", 0.9], ["image/jpeg", 0.85]]) {
    const adres = tuval.toDataURL(tur, kalite);
    if (adres.startsWith("data:" + tur) && adres.length <= LOGO_EN_BUYUK) return adres;
  }
  throw new Error("Logo küçültüldüğü hâlde çok büyük kaldı; daha sade bir resim dene.");
}

function kurumKartiHtml() {
  const ayar = kurumAyarlari(durum.takim);
  const oneri = tutanakVarsayilani(kurumAyarlari({}), durum.takim.ad); // boş bırakılırsa kullanılacak değerler
  const tutanakAlani = (ad, etiket, ipucu) =>
    '<label class="alan"><span>' + etiket + '</span><input type="text" data-tutanak="' + ad + '" maxlength="300" value="' +
    htmlKacis(ayar.tutanak[ad]) + '" placeholder="' + htmlKacis(oneri[ad] || "") + '">' + (ipucu ? "<small>" + ipucu + "</small>" : "") + "</label>";
  return '<section class="kart kurum-karti" id="kurum-karti"><h3>Kurum</h3>' +
    '<p class="soluk kucuk-yazi">“' + htmlKacis(durum.takim.ad) + "” için görünüm ve resmî bilgiler. Takımdaki herkes aynı ayarları görür.</p>" +
    '<form id="kurum-formu" novalidate>' +
    '<fieldset class="alan"><legend>Kurum türü</legend><div class="secenekler">' +
    KURUM_TURLERI.map((t) => '<label><input type="radio" name="kurum-tur" value="' + t.deger + '"' + (t.deger === ayar.tur ? " checked" : "") + "> " + t.etiket + "</label>").join("") +
    "</div><small>Sözcükleri (Takım / Ekip, Üye / Çalışan) ve başlangıçta açık sekmeleri belirler.</small></fieldset>" +

    '<div class="kurum-gorunum">' +
    '<div class="alan"><span>Logo</span><div class="kurum-logo-satir">' +
    '<span class="kurum-logo-onizleme" id="kurum-logo-onizleme">' + (ayar.logo ? '<img src="' + ayar.logo + '" alt="Kurum logosu">' : '<span class="soluk kucuk-yazi">Logo yok</span>') + "</span>" +
    '<button type="button" class="dugme" data-kurum="logo-sec">Logo yükle…</button>' +
    '<button type="button" class="dugme" data-kurum="logo-kaldir"' + (ayar.logo ? "" : " hidden") + ">Kaldır</button>" +
    '<input type="file" id="kurum-logo-dosya" accept="image/png,image/jpeg,image/webp" hidden></div>' +
    "<small>PNG, JPEG ya da WebP. Kare ya da yatay logo en iyi görünür; " + LOGO_PIKSEL + " piksele küçültülür.</small></div>" +
    '<div class="alan"><label for="kurum-renk">Ana renk</label><div class="kurum-logo-satir">' +
    '<input type="color" id="kurum-renk" value="' + ayar.renk + '">' +
    '<button type="button" class="dugme" data-kurum="renk-sifirla">Varsayılan renk</button></div>' +
    "<small>Düğmeler ve vurgular bu renkte olur. Yazı okunmazsa renk biraz koyulaştırılır.</small></div>" +
    "</div>" +

    '<fieldset class="alan kurum-sekmeler"><legend>Sekmeler</legend><div class="secenekler">' +
    BILINEN_SEKMELER.filter((ad) => EKRANLAR[ad] && !KAPATILAMAZ.includes(ad)).map((ad) =>
      '<label><input type="checkbox" data-sekme="' + ad + '"' + (sekmeAcikMi(ayar, ad) ? " checked" : "") + "> " +
      htmlKacis(ekranMetni(ad, "kisaAd")) + "</label>").join("") +
    "</div><small>İşareti kaldırılan sekme menüden ve aramadan kalkar; kayıtları silinmez, yeniden açınca geri gelir. " +
    "Özet, " + htmlKacis(soz(ayar, "takim")) + " ve Ayarlar hep açıktır.</small></fieldset>" +

    '<details class="kurum-tutanak"><summary>Tutanak bilgileri (ilk tutanakta kullanılır)</summary>' +
    '<p class="soluk kucuk-yazi">Boş bırakılan alan için soluk yazılan öneri kullanılır. Sonraki tutanaklar bir öncekinden devam eder.</p>' +
    '<div class="alan-izgara">' +
    tutanakAlani("kurum", "Üst başlık (kurum adı)") +
    tutanakAlani("alt_baslik", "Alt başlık") +
    tutanakAlani("numara_kalibi", "Numara kalıbı", "{yil} yerine yıl yazılır; sondaki sayı her tutanakta bir artar.") +
    tutanakAlani("ek_etiket", "Ek bilgi etiketi", "İsteğe bağlı, ör. “Seminer/Buluşma”.") +
    tutanakAlani("alt_bilgi", "Alt bilgi") +
    tutanakAlani("sayfa_altligi", "Sayfa altlığı") +
    "</div></details>" +
    '<p class="form-hata" id="kurum-hata" role="alert" hidden></p>' +
    '<p><button type="submit" class="dugme ana">Kurum ayarlarını kaydet</button></p>' +
    "</form></section>";
}

function kurumKartiniBagla() {
  const form = sec("#kurum-formu");
  if (!form) return;
  let logo = kurumAyarlari(durum.takim).logo;
  const hata = sec("#kurum-hata");
  const hataGosterKurum = (mesaj) => { hata.textContent = mesaj; hata.hidden = !mesaj; };
  const logoCiz = () => {
    sec("#kurum-logo-onizleme").innerHTML = logo ? '<img src="' + logo + '" alt="Kurum logosu">' : '<span class="soluk kucuk-yazi">Logo yok</span>';
    form.querySelector('[data-kurum="logo-kaldir"]').hidden = !logo;
  };
  // Tür (paket) değişince sekme işaretleri o paketin başlangıç hâline gelir; kullanıcı yine değiştirebilir.
  for (const radyo of form.querySelectorAll('[name="kurum-tur"]')) {
    radyo.onchange = () => {
      const kapali = paketVarsayilani(radyo.value).kapali_sekmeler;
      for (const kutu of form.querySelectorAll("[data-sekme]")) kutu.checked = !kapali.includes(kutu.dataset.sekme);
    };
  }
  const dosya = sec("#kurum-logo-dosya");
  dosya.onchange = async () => {
    const secilen = dosya.files[0];
    dosya.value = "";
    if (!secilen) return;
    try {
      logo = await logoHazirla(secilen);
      hataGosterKurum("");
      logoCiz();
    } catch (e) {
      hataGosterKurum(e.message);
    }
  };
  form.onclick = (olay) => {
    const dugme = olay.target.closest("[data-kurum]");
    if (!dugme) return;
    const is = dugme.dataset.kurum;
    if (is === "logo-sec") dosya.click();
    if (is === "logo-kaldir") { logo = ""; logoCiz(); }
    if (is === "renk-sifirla") sec("#kurum-renk").value = VARSAYILAN_RENK;
  };
  form.onsubmit = async (olay) => {
    olay.preventDefault();
    const tutanak = {};
    for (const kutu of form.querySelectorAll("[data-tutanak]")) tutanak[kutu.dataset.tutanak] = kutu.value;
    const secilenTur = form.querySelector('[name="kurum-tur"]:checked');
    const ayarlar = kurumAyarlariniBirlestir(durum.takim.ayarlar, {
      tur: secilenTur ? secilenTur.value : undefined, logo, renk: sec("#kurum-renk").value, tutanak,
      kapali_sekmeler: [...form.querySelectorAll("[data-sekme]")].filter((k) => !k.checked).map((k) => k.dataset.sekme),
    });
    try {
      await durum.depo.guncelle("takimlar", durum.takim.id, { ayarlar });
      await takimlariYukle(); // kurumuUygula() burada çalışır
      bildir("Kurum ayarları kaydedildi");
      await yenile();
    } catch (e) {
      console.error(e);
      hataGosterKurum(/ayarlar/.test(e.message)
        ? "Kaydedilemedi: veritabanında kurum ayarları alanı yok. Supabase'de supabase/guncelleme-kurum.sql dosyasını bir kez çalıştır."
        : "Kaydedilemedi: " + e.message);
    }
  };
}

async function ayarlarEkraniCiz(kok) {
  const supabase = durum.depo.tur === "supabase";
  const kullanici = durum.oturum ? durum.oturum.kullanici() : null;

  const temaSecenekleri = TEMA_SECENEKLERI.map((s) =>
    '<label><input type="radio" name="tema" value="' + s.deger + '"' +
    (s.deger === temaTercihi() ? " checked" : "") + "> " + s.etiket + "</label>").join("");

  kok.innerHTML =
    '<div class="kartlar">' +

    // Kurum ayarlarını ve rolleri yalnızca takım yöneticisi görür (yerel kullanımda tek kullanıcı yöneticidir)
    (durum.takim && (!durum.yetki || durum.yetki.yonetici) ? kurumKartiHtml() : "") +
    (yonetimGosterilsinMi() ? yonetimKartiHtml() : "") +

    '<section class="kart"><h3>Görünüm</h3>' +
    '<fieldset class="alan"><legend>Tema</legend><div class="secenekler" id="tema-secenekleri">' + temaSecenekleri + "</div></fieldset>" +
    '<p class="soluk kucuk-yazi">“Cihaza uy” seçiliyken telefonun ya da bilgisayarın gece modu açılınca uygulama da kararır.</p>' +
    "</section>" +

    '<section class="kart"><h3>Yedekleme</h3>' +
    "<p>Bütün takımların verisini tek bir dosyaya indir; başka bir cihaza taşımak ya da saklamak için.</p>" +
    '<p><button class="dugme ana" data-eylem="disa-aktar"' + (durum.takimlar.length ? "" : " disabled") + ">Yedeği indir (.json)</button></p>" +
    '<p style="margin-top:16px">Daha önce indirdiğin bir yedeği geri yükle. Var olan kayıtlara dokunulmaz.</p>' +
    '<p><button class="dugme" data-eylem="ice-aktar">Yedekten yükle…</button>' +
    // Dosya seçici gizlidir; düğme onu tetikler (düğmeyi biçimlendirmek daha kolay)
    '<input type="file" id="yedek-dosyasi" accept="application/json,.json" hidden></p>' +
    (supabase ? "" : '<p class="soluk kucuk-yazi">Veriler yalnızca bu tarayıcıda durduğu için arada bir yedek almak iyi olur.</p>') +
    "</section>" +

    '<section class="kart"><h3>Veri deposu</h3>' +
    (supabase
      ? "<p><b>Supabase</b> — veriler bulutta; takımdaki herkes aynı veriyi görür.</p>" +
        (kullanici
          ? "<p>Giriş yapan: <b>" + htmlKacis(kullanici.email) + "</b></p>" +
            '<p style="display:flex;flex-wrap:wrap;gap:8px"><button class="dugme" data-eylem="sifre-degistir">Şifreyi değiştir</button> ' +
            '<button class="dugme" data-eylem="cikis">Çıkış yap</button></p>'
          : "")
      : "<p><b>Bu tarayıcı (localStorage)</b> — veriler yalnızca bu cihazda ve bu tarayıcıda durur. " +
        "Tarayıcı verisi silinirse kaybolur.</p>" +
        '<p class="soluk kucuk-yazi">Ekip olarak ortak kullanmak için Supabase kurulabilir: SUPABASE_KURULUM.md</p>') +
    "</section>" +

    (supabase && kullanici
      ? '<section class="kart" id="erisim-karti"><h3>Erişim</h3><div class="erisim-icerik"><p class="soluk">Yükleniyor…</p></div></section>'
      : "") +

    '<section class="kart"><h3>Uygulama</h3>' +
    "<p>Seyir — takım asistanı, sürüm 2</p>" +
    '<p class="soluk kucuk-yazi">Telefonda tarayıcı menüsünden “Ana ekrana ekle” ile uygulama gibi kullanılabilir. ' +
    "Bir kez açıldıktan sonra internet yokken de açılır.</p>" +
    "</section>" +

    "</div>";

  if (sec("#erisim-karti")) erisimKartiniDoldur(sec("#erisim-karti"));
  kurumKartiniBagla();
  if (sec("#yonetim-karti")) yonetimKartiniDoldur(sec("#yonetim-karti"));

  sec("#tema-secenekleri").onchange = (olay) => {
    temaSec(olay.target.value);
    bildir("Tema değiştirildi");
  };

  const dosyaSecici = sec("#yedek-dosyasi");
  dosyaSecici.onchange = async () => {
    const dosya = dosyaSecici.files[0];
    dosyaSecici.value = ""; // aynı dosya tekrar seçilebilsin
    if (!dosya) return;
    try {
      await yedektenYukle(dosya);
    } catch (hata) {
      console.error(hata);
      alert("Yedek yüklenemedi.\n\n" + hata.message); // kalıcı mesaj: kullanıcı okumadan kaybolmasın
    }
  };

  eylemleriBagla(kok, {
    "disa-aktar": yedekIndir,
    "ice-aktar": () => dosyaSecici.click(),
    "sifre-degistir": sifreDegistirPenceresi, // js/ekranlar/giris.js
    cikis: async () => {
      await durum.oturum.cikisYap();
      durum.takimlar = [];
      durum.takim = null;
      takimSeciciCiz();
      await yenile();
    },
  });
}

ekranKaydet("ayarlar", {
  baslik: "Ayarlar",
  kisaAd: "Ayarlar",
  simge: "M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6",
  ciz: ayarlarEkraniCiz,
});
