/* ==========================================================================
   ÖRNEK VERİ
   Uygulamayı boşken denemek (ve mülakatta göstermek) için hayali bir takım
   oluşturur. Tarihler bugüne göre hesaplanır; böylece ne zaman yüklenirse
   yüklensin "yaklaşan" ve "geciken" örnekleri görünür.
   Adların hepsi uydurmadır.
   ========================================================================== */

async function ornekVeriYukle(depo, bugunTarihi) {
  const takim = await depo.ekle("takimlar", { ad: "Örnek Su Altı Takımı" });
  const ortak = { takim_id: takim.id };

  // Üyeler
  const uyeler = {};
  for (const [ad, rol] of [["Deniz Kaya", "kaptan"], ["Elif Aydın", "uye"], ["Mert Şahin", "uye"], ["Zeynep Arslan", "uye"]]) {
    uyeler[ad] = await depo.ekle("uyeler", { ...ortak, ad: ad, rol: rol });
  }
  const deniz = uyeler["Deniz Kaya"].id;
  const elif = uyeler["Elif Aydın"].id;
  const mert = uyeler["Mert Şahin"].id;
  const zeynep = uyeler["Zeynep Arslan"].id;

  // Son tarihler
  const sonTarihler = [
    ["Ön Tasarım Raporu teslimi", "rapor", 9, "Taslak bölümler bir hafta önce toplanacak."],
    ["Havuz kullanım izni başvurusu", "izin", 2, "Dilekçe kaptan tarafından imzalanacak."],
    ["Tanıtım standı", "etkinlik", 20, ""],
    ["Malzeme listesi onayı", "diger", -3, "Danışman onayı bekleniyor."],
  ];
  for (const [baslik, tur, gun, aciklama] of sonTarihler) {
    await depo.ekle("son_tarihler", {
      ...ortak, baslik: baslik, tur: tur, tarih: gunEkle(bugunTarihi, gun), aciklama: aciklama, tamamlandi: false,
    });
  }

  // Toplantı (4 gün önce yapılmış)
  const toplanti = await depo.ekle("toplantilar", {
    ...ortak,
    baslik: "Haftalık ekip toplantısı",
    tarih: gunEkle(bugunTarihi, -4),
    saat: "18:30",
    yer: "Atölye",
    katilimci_idler: [deniz, elif, mert],
    yazan_id: elif,
    gundem: ["Rapor iş bölümü", "İtici motor seçimi", "Havuz testi planı"],
    kararlar: [],
    notlar: "Zeynep mazeretli olarak katılamadı.",
  });

  // Görevler (ilki toplantıdaki bir karardan oluşmuş gibi)
  const motorGorevi = await depo.ekle("gorevler", {
    ...ortak, baslik: "İtici motorlar için fiyat teklifi al", aciklama: "En az iki satıcıdan.",
    durum: "yapiliyor", sorumlu_id: mert, bitis_tarihi: gunEkle(bugunTarihi, 3), toplanti_id: toplanti.id,
  });
  const gorevler = [
    ["Raporun mekanik tasarım bölümünü yaz", "yapilacak", elif, 6],
    ["Gövde sızdırmazlık testini yap", "yapilacak", zeynep, -1],
    ["Sponsorluk dosyasını güncelle", "yapilacak", "", 14],
    ["Kamera görüntüsü aktarımını dene", "yapiliyor", deniz, 1],
    ["Takım logosunu son hâline getir", "bitti", zeynep, -6],
  ];
  for (const [baslik, gorevDurumu, sorumlu, gun] of gorevler) {
    await depo.ekle("gorevler", {
      ...ortak, baslik: baslik, aciklama: "", durum: gorevDurumu, sorumlu_id: sorumlu,
      bitis_tarihi: gunEkle(bugunTarihi, gun), toplanti_id: "",
    });
  }

  // Toplantı kararlarını yaz; ilk karar yukarıdaki göreve bağlı.
  await depo.guncelle("toplantilar", toplanti.id, {
    kararlar: [
      { metin: "İtici motorlar için fiyat teklifi alınacak", gorev_id: motorGorevi.id },
      { metin: "Rapor bölümleri cuma gününe kadar paylaşılacak", gorev_id: null },
      { metin: "Havuz testi izin çıktıktan sonraki ilk hafta sonu yapılacak", gorev_id: null },
    ],
  });

  // Etkinlikler: ikisi geçmişte (yoklaması alınmış), biri gelecekte
  const etkinlikler = [
    ["Lise tanıtım ziyareti", -24, "Atatürk Anadolu Lisesi", 85, [deniz, elif, zeynep],
      "Su altı araçları ve yarışma süreci hakkında sunum yapıldı. Öğrenciler prototipi inceledi."],
    ["Kampüs kulüp tanıtım standı", -10, "Merkez Kampüs", 140, [deniz, mert],
      "Stantta takımın çalışmaları tanıtıldı, 12 yeni gönüllü başvurusu alındı."],
    ["Havuz testi günü", 12, "Üniversite havuzu", 0, [], ""],
  ];
  for (const [ad, gun, yer, sayi, katilanlar, aciklama] of etkinlikler) {
    await depo.ekle("etkinlikler", {
      ...ortak, ad: ad, tarih: gunEkle(bugunTarihi, gun), yer: yer,
      katilimci_sayisi: sayi, katilimci_idler: katilanlar, aciklama: aciklama,
    });
  }

  // Kişi rehberi: adlar UYDURMA, numaralar bilerek kullanılmayan "0500 000 00 xx"
  // aralığından. Gerçek kişi verisi demo ve testlere asla konmaz.
  const kisiler = [
    ["Ece Nur Demir", "Ece Nur", "905000000001", "başvuran"],
    ["Can Öztürk", "Can", "905000000002", "başvuran"],
    ["İpek Yıldız", "İpek", "905000000003", "kabul edildi"],
    ["Mert Şahin", "Mert", "905000000004", "üye"],
    ["Elif Aydın", "Elif", "905000000005", "üye"],
    ["Baran Koç", "Baran", "905000000006", "kabul edildi"],
  ];
  for (const [ad, ilkAd, telefon, etiket] of kisiler) {
    await depo.ekle("kisiler", { ...ortak, ad: ad, ilk_ad: ilkAd, telefon: telefon, etiket: etiket, aciklama: "" });
  }
  // Sponsorlar: kurum adları UYDURMA
  const sponsorlar = [
    ["Mavi Derinlik Mühendislik", "gorusme", 40000, "Teklif dosyasını gönder", 3],
    ["Örnek Elektronik A.Ş.", "anlasildi", 25000, "", 0],
    ["Deniz Feneri Yazılım", "iletisimde", 15000, "Cuma günü tekrar ara", -1],
    ["Pusula Makine", "aday", 0, "İlk tanıtım e-postasını yaz", 7],
  ];
  for (const [ad, asama, tutar, adim, gun] of sponsorlar) {
    await depo.ekle("paydaslar", {
      ...ortak, ad: ad, ilgili: "", iletisim: "", asama: asama, tutar: tutar,
      sonraki_adim: adim, sonraki_tarih: adim ? gunEkle(bugunTarihi, gun) : "", notlar: "",
    });
  }
  for (const sablon of VARSAYILAN_SABLONLAR) {
    await depo.ekle("sablonlar", { ...ortak, ...sablon });
  }

  return takim;
}

// Testlerde kullanılabilsin diye
if (typeof module !== "undefined") {
  module.exports = { ornekVeriYukle };
}
