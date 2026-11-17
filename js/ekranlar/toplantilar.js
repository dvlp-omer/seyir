/* ==========================================================================
   EKRAN: Toplantılar ve tutanak
   İki görünüm var:
     - Liste: bütün toplantılar (yeniden eskiye)
     - Tutanak: seçilen toplantının kâğıt görünümü. "Yazdır / PDF" düğmesi
       tarayıcının yazdırma penceresini açar; oradan PDF olarak kaydedilir.
   Kararların yanındaki "Görev oluştur" düğmesi, kararı tek tıkla göreve
   çevirir (görev formu karar metniyle dolu açılır).
   Formdaki "Katılanlar" listesi aynı zamanda toplantının YOKLAMASIDIR;
   katılım yüzdeleri buradan hesaplanır (Takım ekranı).
   ========================================================================== */

// Hangi toplantının tutanağı açık? null ise liste gösterilir.
let acikToplantiId = null;

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

// Satırların solundaki tarih kutusu: gün sayısı + ay kısaltması.
function gunKutusuHtml(tarih) {
  const [, ay, gun] = tarih.split("-").map(Number);
  return '<span class="gun-kutu" aria-hidden="true"><b>' + gun + "</b><span>" + (AY_KISA[ay - 1] || "") + "</span></span>";
}

function toplantiFormu(toplanti, uyeler) {
  formAc({
    baslik: toplanti ? "Tutanağı düzenle" : "Yeni toplantı",
    alanlar: [
      { ad: "baslik", etiket: "Konu", tur: "metin", zorunlu: true, ipucu: "Örn: Haftalık ekip toplantısı" },
      { ad: "tarih", etiket: "Tarih", tur: "tarih", zorunlu: true },
      { ad: "saat", etiket: "Saat", tur: "saat" },
      { ad: "yer", etiket: "Yer", tur: "metin" },
      {
        ad: "katilimci_idler", etiket: "Katılanlar (yoklama)", tur: "coklu", secenekler: uyeSecenekleri(uyeler),
        ipucu: "Toplantıya gelenleri işaretli bırak. Katılım yüzdesi buradan hesaplanır.",
      },
      { ad: "yazan_id", etiket: "Tutanağı yazan", tur: "secim", secenekler: uyeSecenekleri(uyeler, "— Seçilmedi —") },
      { ad: "gundem", etiket: "Gündem", tur: "uzun", ipucu: "Her satıra bir madde yaz." },
      { ad: "kararlar", etiket: "Kararlar", tur: "uzun", ipucu: "Her satıra bir karar. Kaydettikten sonra kararlardan görev oluşturabilirsin." },
      { ad: "notlar", etiket: "Notlar", tur: "uzun" },
    ],
    // Listeler formda çok satırlı metin olarak düzenlenir.
    degerler: toplanti
      ? {
          ...toplanti,
          gundem: toplanti.gundem.join("\n"),
          kararlar: toplanti.kararlar.map((karar) => karar.metin).join("\n"),
        }
      : { tarih: bugun(), katilimci_idler: uyeler.map((u) => u.id) },
    kaydet: async (degerler) => {
      const kayit = {
        ...degerler,
        gundem: satirlaraAyir(degerler.gundem),
        // Metni değişmeyen kararların görev bağını koru (mantik.js)
        kararlar: kararlariBirlestir(satirlaraAyir(degerler.kararlar), toplanti ? toplanti.kararlar : []),
      };
      if (toplanti) {
        await durum.depo.guncelle("toplantilar", toplanti.id, kayit);
      } else {
        const yeni = await durum.depo.ekle("toplantilar", { ...kayit, takim_id: durum.takim.id });
        acikToplantiId = yeni.id; // kaydedince doğrudan tutanağı aç
      }
    },
  });
}

async function toplantiSil(toplanti) {
  if (!confirm('"' + toplanti.baslik + '" tutanağı silinsin mi?\nBu toplantıdan oluşturulan görevler silinmez.')) return;
  // Görevlerdeki toplantı bağını temizle
  const gorevler = await durum.depo.listele("gorevler", { toplanti_id: toplanti.id });
  for (const gorev of gorevler) {
    await durum.depo.guncelle("gorevler", gorev.id, { toplanti_id: "" }, { zorla: true }); // toplu iş: denetimsiz
  }
  await durum.depo.sil("toplantilar", toplanti.id);
  acikToplantiId = null;
  bildir("Tutanak silindi");
  await yenile();
}

// Yazdırma penceresini açar. PDF dosya adı sayfa başlığından geldiği için
// başlığı geçici olarak değiştiriyoruz. (Faaliyet raporu da bunu kullanır.)
function belgeYazdir(dosyaAdi) {
  const eskiBaslik = document.title;
  document.title = dosyaAdi;
  window.print();
  document.title = eskiBaslik;
}

/* ---------- Liste görünümü ---------- */

function toplantiListesiCiz(kok, toplantilar, uyeler) {
  const sirali = tariheGoreSirala(toplantilar, "tarih").reverse(); // en yeni üstte

  const satirlar = sirali.map((t) => {
    const ayrinti = [tarihYaz(t.tarih, false), t.saat, t.yer, t.kararlar.length + " karar"].filter((p) => p).join(" · ");
    return '<li><button class="toplanti-satir" data-eylem="ac" data-id="' + htmlKacis(t.id) + '">' +
      gunKutusuHtml(t.tarih) +
      '<span class="bilgi"><b>' + htmlKacis(t.baslik) + "</b><span>" + htmlKacis(ayrinti) + "</span></span>" +
      "</button></li>";
  }).join("");

  kok.innerHTML =
    '<div class="arac-cubugu"><span class="bosluk"></span>' +
    '<button class="dugme ana" data-eylem="ekle">+ Yeni toplantı</button></div>' +
    (sirali.length
      ? '<ul class="toplanti-liste">' + satirlar + "</ul>"
      : '<div class="bos"><h3>Henüz tutanak yok</h3>Toplantı notlarını gir; düzenli, yazdırılabilir bir tutanağa dönüşsün.</div>');

  eylemleriBagla(kok, {
    ekle: () => toplantiFormu(null, uyeler),
    ac: (id) => { acikToplantiId = id; return yenile(); },
  });
}

/* ---------- Tutanak görünümü ---------- */

function tutanakCiz(kok, toplanti, uyeler, gorevler) {
  const toplantiGorevleri = gorevler.filter((g) => g.toplanti_id === toplanti.id);
  const katilimcilar = toplanti.katilimci_idler.map((id) => uyeAdi(uyeler, id)).filter((ad) => ad);
  const yazan = uyeAdi(uyeler, toplanti.yazan_id);
  const kaptanlar = uyeler.filter((u) => u.rol === "kaptan").map((u) => u.ad);

  // Künye satırı; değeri boşsa satır hiç yazılmaz.
  const kunye = (etiket, deger) => (deger ? "<dt>" + etiket + "</dt><dd>" + htmlKacis(deger) + "</dd>" : "");

  const kararlar = toplanti.kararlar.map((karar, sira) => {
    // Bağlı görev silinmiş olabilir; o zaman düğme yeniden görünür.
    const gorev = gorevler.find((g) => g.id === karar.gorev_id);
    const sag = gorev
      ? '<span class="rozet rahat yazdirma">Görev oluşturuldu</span>'
      : '<span class="yazdirma">' + kayitDugmesi("karardan-gorev", String(sira), "+ Görev oluştur", karar.metin) + "</span>";
    return '<li><div class="karar"><span>' + htmlKacis(karar.metin) + "</span>" + sag + "</div></li>";
  }).join("");

  const gorevSatirlari = toplantiGorevleri.map((g) =>
    "<tr><td>" + htmlKacis(g.baslik) + "</td>" +
    "<td>" + (htmlKacis(uyeAdi(uyeler, g.sorumlu_id)) || "—") + "</td>" +
    "<td>" + (g.bitis_tarihi ? tarihYaz(g.bitis_tarihi, false) : "—") + "</td>" +
    "<td>" + gorevDurumEtiketi(g.durum) + "</td></tr>"
  ).join("");

  kok.innerHTML =
    // .yazdirma sınıfı olanlar kâğıda çıkmaz (stil.css > @media print)
    '<div class="arac-cubugu yazdirma">' +
    '<button class="dugme" data-eylem="geri">← Tüm toplantılar</button>' +
    '<span class="bosluk"></span>' +
    '<button class="dugme" data-eylem="duzenle">Düzenle</button>' +
    '<button class="dugme" data-eylem="duyuru">Duyuru hazırla</button>' +
    '<button class="dugme ana" data-eylem="yazdir">Yazdır / PDF</button>' +
    '<button class="dugme tehlike" data-eylem="sil">Sil</button>' +
    "</div>" +

    '<article class="tutanak">' +
    '<header class="tutanak-ust">' +
    '<div><div class="takim-adi">' + htmlKacis(durum.takim.ad) + "</div><h2>Toplantı Tutanağı</h2></div>" +
    '<div class="belge">' + tarihYaz(toplanti.tarih, false) + "</div>" +
    "</header>" +

    '<dl class="tutanak-kunye">' +
    kunye("Konu", toplanti.baslik) +
    kunye("Tarih", tarihYaz(toplanti.tarih)) +
    kunye("Saat", toplanti.saat) +
    kunye("Yer", toplanti.yer) +
    kunye("Katılanlar", katilimcilar.length ? katilimcilar.join(", ") + " (" + katilimcilar.length + " kişi)" : "") +
    kunye("Yazan", yazan) +
    "</dl>" +

    "<h3>Gündem</h3>" +
    (toplanti.gundem.length
      ? "<ol>" + toplanti.gundem.map((madde) => "<li>" + htmlKacis(madde) + "</li>").join("") + "</ol>"
      : '<p class="soluk">Gündem maddesi girilmedi.</p>') +

    "<h3>Kararlar</h3>" +
    (kararlar ? "<ol>" + kararlar + "</ol>" : '<p class="soluk">Karar girilmedi.</p>') +

    "<h3>Görevler</h3>" +
    (gorevSatirlari
      ? '<div class="tablo-sarici"><table class="tablo"><thead><tr><th>Görev</th><th>Sorumlu</th><th>Bitiş</th><th>Durum</th></tr></thead><tbody>' +
        gorevSatirlari + "</tbody></table></div>"
      : '<p class="soluk">Bu toplantıdan görev çıkmadı.</p>') +
    '<p class="yazdirma" style="margin-top:10px"><button class="dugme kucuk" data-eylem="gorev-ekle">+ Görev ekle</button></p>' +

    (toplanti.notlar ? '<h3>Notlar</h3><p class="notlar">' + htmlKacis(toplanti.notlar) + "</p>" : "") +

    '<div class="imzalar">' +
    '<div class="imza"><b>' + (htmlKacis(yazan) || "&nbsp;") + "</b>Tutanağı yazan</div>" +
    '<div class="imza"><b>' + (htmlKacis(kaptanlar.join(", ")) || "&nbsp;") + "</b>Takım kaptanı</div>" +
    "</div>" +
    "</article>";

  eylemleriBagla(kok, {
    geri: () => { acikToplantiId = null; return yenile(); },
    duzenle: () => toplantiFormu(toplanti, uyeler),
    yazdir: () => belgeYazdir("Tutanak - " + toplanti.baslik + " - " + toplanti.tarih),
    // Toplantı henüz yapılmadıysa davet, yapıldıysa özet duyurusu
    duyuru: () => duyuruyaGit(toplanti.tarih >= bugun() ? "davet" : "ozet", toplanti.id),
    sil: () => toplantiSil(toplanti),

    // Toplantıya bağlı, karardan bağımsız görev
    "gorev-ekle": () => gorevFormu({ uyeler: uyeler, varsayilan: { toplanti_id: toplanti.id } }),

    // Karardan görev: form karar metniyle dolu açılır; kaydedilince
    // kararın gorev_id alanına yeni görevin kimliği yazılır.
    "karardan-gorev": (sira) => {
      const karar = toplanti.kararlar[Number(sira)];
      gorevFormu({
        uyeler: uyeler,
        varsayilan: { baslik: karar.metin, toplanti_id: toplanti.id },
        kaydedince: async (gorev) => {
          const yeniKararlar = toplanti.kararlar.map((k, i) =>
            i === Number(sira) ? { ...k, gorev_id: gorev.id } : k);
          await durum.depo.guncelle("toplantilar", toplanti.id, { kararlar: yeniKararlar });
          bildir("Görev panoya eklendi");
        },
      });
    },
  });
}

async function toplantilarEkraniCiz(kok) {
  const [toplantilar, uyeler, gorevler] = await Promise.all([
    takimKayitlari("toplantilar"), takimKayitlari("uyeler"), takimKayitlari("gorevler"),
  ]);

  // Açık tutanak bu takıma ait değilse (takım değişti ya da silindi) listeye dön.
  const acik = toplantilar.find((t) => t.id === acikToplantiId);
  if (acik) {
    tutanakCiz(kok, acik, uyeler, gorevler);
  } else {
    acikToplantiId = null;
    toplantiListesiCiz(kok, toplantilar, uyeler);
  }
}

ekranKaydet("toplantilar", {
  baslik: "Toplantı tutanakları",
  kisaAd: "Toplantı",
  simge: "M7 3h8l4 4v14H7zM10 11h6M10 15h6",
  ciz: toplantilarEkraniCiz,
  // Menüden basılınca açık tutanağı kapatıp listeye dön (RAPOR.md > H3)
  sifirla: () => { acikToplantiId = null; },
});
