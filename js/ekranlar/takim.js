/* ==========================================================================
   EKRAN: Takım ve üyeler
   - Hiç takım yoksa: karşılama + takım oluşturma
   - Takım varsa: üye listesi (ekle / düzenle / rol ver / sil), takım ayarları
   Kişisel veri olarak sadece AD ve ROL tutulur.
   ========================================================================== */

const ROLLER = [
  { deger: "uye", etiket: "Üye" },
  { deger: "kaptan", etiket: "Kaptan" },
];

// "Ayşe Yılmaz" -> "AY" (avatar dairesi için)
function basHarfler(ad) {
  return ad.split(/\s+/).filter((p) => p).slice(0, 2).map((p) => p[0].toLocaleUpperCase("tr")).join("");
}

async function takimOlustur(ad) {
  const takim = await durum.depo.ekle("takimlar", { ad: ad });
  await takimSec(takim.id);
  return takim;
}

function uyeFormu(uye) {
  formAc({
    baslik: uye ? "Üyeyi düzenle" : "Üye ekle",
    alanlar: [
      { ad: "ad", etiket: "Ad Soyad", tur: "metin", zorunlu: true },
      { ad: "rol", etiket: "Rol", tur: "secim", secenekler: ROLLER },
    ],
    degerler: uye || { rol: "uye" },
    kaydet: async (degerler) => {
      if (uye) {
        await durum.depo.guncelle("uyeler", uye.id, degerler);
      } else {
        await durum.depo.ekle("uyeler", { ...degerler, takim_id: durum.takim.id });
      }
    },
  });
}

// Üye silinirken ona atanmış görevler sahipsiz kalır (silinmez).
async function uyeSil(id) {
  const uye = await durum.depo.oku("uyeler", id);
  if (!uye || !confirm('"' + uye.ad + '" takımdan çıkarılsın mı?\nÜzerindeki görevler silinmez, sorumlusuz kalır.')) return;

  const gorevler = await durum.depo.listele("gorevler", { sorumlu_id: id });
  for (const gorev of gorevler) {
    await durum.depo.guncelle("gorevler", gorev.id, { sorumlu_id: "" });
  }
  await durum.depo.sil("uyeler", id);
  bildir("Üye çıkarıldı");
  await yenile();
}

// Takım silinince ona ait bütün kayıtlar da silinir.
async function takimSil() {
  const takim = durum.takim;
  if (!confirm('"' + takim.ad + '" takımı ve ona ait BÜTÜN üyeler, görevler, son tarihler, tutanaklar ve etkinlikler silinsin mi?\nBu işlem geri alınamaz.')) return;

  // "takimlar" dışındaki bütün koleksiyonlar (yeni koleksiyon eklenince burası kendiliğinden kapsar)
  for (const koleksiyon of KOLEKSIYONLAR.filter((k) => k !== "takimlar")) {
    const kayitlar = await durum.depo.listele(koleksiyon, { takim_id: takim.id });
    for (const kayit of kayitlar) {
      await durum.depo.sil(koleksiyon, kayit.id);
    }
  }
  await durum.depo.sil("takimlar", takim.id);
  await takimlariYukle();
  bildir("Takım silindi");
  await yenile();
}

function takimAdiFormu(takim) {
  formAc({
    baslik: takim ? "Takım adını değiştir" : "Yeni takım",
    alanlar: [{ ad: "ad", etiket: "Takım adı", tur: "metin", zorunlu: true }],
    degerler: takim || {},
    kaydetYazi: takim ? "Kaydet" : "Oluştur",
    kaydet: async (degerler) => {
      if (takim) {
        await durum.depo.guncelle("takimlar", takim.id, { ad: degerler.ad });
        await takimlariYukle();
      } else {
        await takimOlustur(degerler.ad);
      }
    },
  });
}

/* ---------- Çizim ---------- */

function karsilamaCiz(kok) {
  kok.innerHTML =
    '<div class="kart karsilama">' +
    "<h2>Hoş geldin 👋</h2>" +
    "<p>Görevleri, son tarihleri ve toplantı tutanaklarını tek yerde toplamak için önce takımını oluştur.</p>" +
    '<form class="satir-form" id="ilk-takim">' +
    '<label class="gizli" for="ilk-takim-ad">Takım adı</label>' +
    '<input id="ilk-takim-ad" type="text" placeholder="Takım adı (ör. ROTA İSAS)" maxlength="80" required>' +
    '<button class="dugme ana" type="submit">Takımı oluştur</button>' +
    "</form>" +
    '<p class="kucuk-yazi" style="margin-top:16px">Önce nasıl göründüğünü mü merak ediyorsun? ' +
    '<button class="dugme kucuk" type="button" data-eylem="ornek">Örnek veriyle dene</button></p>' +
    "</div>";

  sec("#ilk-takim").onsubmit = async (olay) => {
    olay.preventDefault();
    const ad = sec("#ilk-takim-ad").value.trim();
    if (!ad) return;
    await takimOlustur(ad);
    bildir("Takım oluşturuldu. Şimdi üyeleri ekle.");
    ekranaGit("takim");
  };

  eylemleriBagla(kok, {
    ornek: async () => {
      const takim = await ornekVeriYukle(durum.depo, bugun());
      await takimSec(takim.id);
      bildir("Örnek takım yüklendi");
      ekranaGit("ozet");
    },
  });
}

/* Yoklama kartı: üye bazında katılım yüzdesi.
   Yoklama ayrı bir yerde alınmaz; toplantı ve etkinlik formlarındaki
   "katılanlar" listesi yoklamanın kendisidir. Hesap: mantik.js > katilimOranlari
   (geçmiş + en az bir kişi işaretlenmiş buluşmalar sayılır). */
function katilimKartiHtml(uyeler, toplantilar, etkinlikler) {
  const oranlar = katilimOranlari(uyeler, [...toplantilar, ...etkinlikler], bugun());
  const sayilan = oranlar.length ? oranlar[0].toplam : 0;

  let icerik;
  if (uyeler.length === 0) {
    icerik = '<p class="soluk">Üye ekleyince katılım oranları burada görünür.</p>';
  } else if (sayilan === 0) {
    icerik = '<p class="soluk">Henüz yoklaması alınmış bir toplantı ya da etkinlik yok. ' +
      "Toplantı ve etkinlik formundaki “katılanlar” listesi yoklamadır; geçmiş tarihli kayıtlar buraya yansır.</p>";
  } else {
    const satirlar = oranlar.map((o) =>
      "<tr><td>" + htmlKacis(o.ad) + "</td>" +
      '<td class="sayi-hucre">' + o.katildi + " / " + o.toplam + "</td>" +
      '<td><div class="oran"><span class="oran-cubuk" aria-hidden="true"><span style="width:' + o.yuzde + '%"></span></span>' +
      "<b>%" + o.yuzde + "</b></div></td></tr>"
    ).join("");
    icerik =
      '<p class="soluk kucuk-yazi" style="margin-bottom:10px">Yoklaması alınmış ' + sayilan +
      " toplantı/etkinlik üzerinden hesaplandı (gelecek tarihliler sayılmaz).</p>" +
      '<div class="tablo-sarici"><table class="tablo"><thead><tr><th>Üye</th><th>Katıldı</th><th>Katılım oranı</th></tr></thead>' +
      "<tbody>" + satirlar + "</tbody></table></div>";
  }
  return '<section class="kart genis"><h3>Yoklama: katılım oranları</h3>' + icerik + "</section>";
}

async function takimEkraniCiz(kok) {
  if (!durum.takim) return karsilamaCiz(kok);

  const [uyeler, toplantilar, etkinlikler] = await Promise.all([
    takimKayitlari("uyeler"), takimKayitlari("toplantilar"), takimKayitlari("etkinlikler"),
  ]);
  // Kaptanlar üstte, sonra alfabetik (Türkçe harf sırasına göre)
  uyeler.sort((a, b) =>
    (a.rol === "kaptan" ? 0 : 1) - (b.rol === "kaptan" ? 0 : 1) || a.ad.localeCompare(b.ad, "tr"));

  const uyeSatirlari = uyeler.map((uye) =>
    "<li>" +
    '<span class="avatar" aria-hidden="true">' + htmlKacis(basHarfler(uye.ad)) + "</span>" +
    '<span class="uye-ad">' + htmlKacis(uye.ad) + "</span>" +
    '<span class="rozet ' + (uye.rol === "kaptan" ? "kaptan" : "") + '">' + (uye.rol === "kaptan" ? "Kaptan" : "Üye") + "</span>" +
    kayitDugmesi("uye-duzenle", uye.id, "Düzenle", uye.ad) +
    kayitDugmesi("uye-sil", uye.id, "Çıkar", uye.ad, "tehlike") +
    "</li>"
  ).join("");

  kok.innerHTML =
    '<div class="takim-izgara">' +
    '<section class="kart">' +
    '<div class="arac-cubugu"><h3>Üyeler <span class="soluk">(' + uyeler.length + ")</span></h3>" +
    '<span class="bosluk"></span><button class="dugme ana" data-eylem="uye-ekle">+ Üye ekle</button></div>' +
    (uyeler.length
      ? '<ul class="uye-liste">' + uyeSatirlari + "</ul>"
      : '<div class="bos"><h3>Henüz üye yok</h3>Görevlere sorumlu atayabilmek için üyeleri ekle.</div>') +
    "</section>" +
    '<section class="kart">' +
    "<h3>" + htmlKacis(durum.takim.ad) + "</h3>" +
    '<div class="dikey">' +
    '<button class="dugme" data-eylem="takim-ad">Adını değiştir</button>' +
    '<button class="dugme" data-eylem="takim-yeni">+ Yeni takım oluştur</button>' +
    '<button class="dugme tehlike" data-eylem="takim-sil">Bu takımı sil</button>' +
    "</div>" +
    '<p class="soluk kucuk-yazi" style="margin-top:14px">Üyeler hakkında yalnızca ad ve rol tutulur.</p>' +
    "</section>" +
    katilimKartiHtml(uyeler, toplantilar, etkinlikler) +
    "</div>";

  eylemleriBagla(kok, {
    "uye-ekle": () => uyeFormu(null),
    "uye-duzenle": async (id) => {
      const uye = await durum.depo.oku("uyeler", id);
      if (!uye) return yenile(); // başka sekmede silinmiş olabilir
      uyeFormu(uye);
    },
    "uye-sil": uyeSil,
    "takim-ad": () => takimAdiFormu(durum.takim),
    "takim-yeni": () => takimAdiFormu(null),
    "takim-sil": takimSil,
  });
}

ekranKaydet("takim", {
  baslik: "Takım ve üyeler",
  kisaAd: "Takım",
  simge: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M17 14a5 5 0 0 1 4 6",
  ciz: takimEkraniCiz,
});
