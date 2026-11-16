// Testlerde ve PDF denemesinde kullanılan ÖRNEK tutanak.
// Buradaki bütün kişiler, kararlar ve tarihler UYDURMADIR; gerçek bir
// toplantıyı ya da kişiyi anlatmaz. İçerik bilerek uzun tutuldu (iki sayfaya
// taşsın diye) ve Türkçeye özgü bütün harfleri içerir: ç ğ ı ö ş ü Ç Ğ İ Ö Ş Ü
function ornekTutanak() {
  return {
    id: "ornek-tutanak-04",
    takim_id: "ornek-takim",
    olusturma: "2026-03-12T18:00:00.000Z",
    kurum: "İSTANBUL SABAHATTİN ZAİM ÜNİVERSİTESİ TEKNOFEST KULÜBÜ",
    alt_baslik: "İSAS Akademi — Dördüncü Toplantı",
    numara: "ROTA/İSAS-2026/04",
    toplanti_tarihi: "2026-03-12",
    tutanak_tarihi: "2026-03-13",
    sonraki_toplanti: "19 Mart 2026 Perşembe, 17.30",
    ek_etiket: "Seminer/Buluşma",
    ek_deger: "Sızdırmazlık ve gövde tasarımı semineri — 26 Mart 2026",
    katilimcilar: ["Çağla Öztürk", "Şükrü Işık", "Gökçe Ünal", "İlker Çığ", "Özgür Şahingöz", "Ümran Ağaoğlu"],
    devreden_giris: "Önceki toplantılarda alınan ve geçerliliği devam eden kararlar aşağıda sıralanmıştır.",
    devreden: [
      { metin: "Haftalık toplantıların her perşembe 17.30'da atölyede yapılmasına ve katılamayacak üyelerin en geç bir gün önce yazılı olarak bildirmesine,", atif: "ROTA/İSAS-2026/01, Karar 1" },
      { metin: "Alt ekip sorumlularının her toplantıdan önce ilerleme özetini ortak klasöre yüklemesine,", atif: "ROTA/İSAS-2026/02, Karar 3" },
      { metin: "Malzeme alımlarında en az iki satıcıdan fiyat teklifi alınmasına ve tekliflerin danışman onayına sunulmasına,", atif: "ROTA/İSAS-2026/03, Karar 2" },
    ],
    kararlar: [
      "Ön Tasarım Raporu taslağının bölümler hâlinde yazılmasına; mekanik tasarım bölümünün Gökçe Ünal, elektronik ve güç dağıtımı bölümünün İlker Çığ, yazılım ve görüntü işleme bölümünün Özgür Şahingöz tarafından hazırlanmasına,",
      "Gövde sızdırmazlık testinin üniversite havuzunda yapılabilmesi için gerekli izin yazısının Çağla Öztürk tarafından hazırlanıp kulüp danışmanına iletilmesine,",
      "İtici motorlar için üç ayrı satıcıdan fiyat teklifi alınmasına ve tekliflerin bir karşılaştırma tablosuyla bir sonraki toplantıda sunulmasına,",
      "Aracın ağırlık merkezinin yeniden hesaplanmasına; yüzdürücü köpük yerleşiminin bu hesaba göre güncellenmesine ve sonucun üç boyutlu model üzerinde gösterilmesine,",
      "Kamera muhafazasının akrilik yerine alüminyum gövdeyle üretilmesi seçeneğinin maliyet, ağırlık ve ısı dağılımı açısından değerlendirilmesine,",
      "Görüntü işleme ekibinin şerit takibi ve hedef tanıma görevleri için ortak bir veri kümesi oluşturmasına; çekimlerin farklı ışık koşullarında yapılmasına,",
      "Yeni katılan üyeler için iki oturumluk bir başlangıç eğitimi düzenlenmesine; birinci oturumda atölye güvenliği, ikinci oturumda temel lehimleme ve ölçü aletleri konularının işlenmesine,",
      "Kulüp tanıtım standında kullanılacak afiş ve broşürlerin Ümran Ağaoğlu tarafından tasarlanmasına ve baskıdan önce ekibin görüşüne sunulmasına,",
      "Sponsorluk dosyasının güncellenmesine; dosyaya geçen yılın yarışma sonuçlarının, bütçe özetinin ve iletişim bilgilerinin eklenmesine,",
      "Batarya bölmesinin su sızdırmazlığı için çift conta kullanılmasına ve her dalış öncesinde basınç testi yapılmasına,",
      "Atölyede bulunan ölçü aletlerinin envanterinin çıkarılmasına; eksik ve arızalı olanların listelenerek danışmana bildirilmesine,",
      "Toplantı tutanaklarının bundan sonra en geç iki gün içinde yazılıp bütün üyelere duyurulmasına karar verilmiştir.",
    ],
    gorevler: [
      "Rapor bölümlerinin ilk taslakları 18 Mart 2026 Çarşamba gününe kadar ortak klasöre yüklenecektir.",
      "Fiyat teklifleri ve karşılaştırma tablosu Şükrü Işık tarafından bir sonraki toplantıda sunulacaktır.",
      "Havuz izin yazısının durumu Çağla Öztürk tarafından takip edilecek ve sonucu ekibe bildirilecektir.",
      "Başlangıç eğitiminin tarihi ve katılımcı listesi bir sonraki toplantıda kesinleştirilecektir.",
      "Bir sonraki toplantı 19 Mart 2026 Perşembe günü saat 17.30'da atölyede yapılacaktır.",
    ],
    alt_bilgi: "ROTA: İSAS Akademi — Toplantı Tutanağı No. 04 — İstanbul Sabahattin Zaim Üniversitesi Teknofest Kulübü",
    sayfa_altligi: "İSAS Akademi — Toplantı Tutanağı 04",
  };
}

module.exports = { ornekTutanak };
