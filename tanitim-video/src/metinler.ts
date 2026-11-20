// Videodaki bütün yazılar, iki dilde. Sahneler dil'e göre buradan alır.
// SeyirTanitim -> Türkçe, SeyirTanitimEN -> İngilizce (Root.tsx). Ekran görüntüleri her iki
// sürümde de Türkçe arayüzü gösterir (uygulamanın kendisi şimdilik Türkçe).
export type Dil = "tr" | "en";

export const METIN = {
  tr: {
    slogan: ["Takımının", "seyir defteri."],
    sorular: ["Geçen toplantıda ne karar almıştık?", "Motor teklifleri kimdeydi?", "Rapor teslimi ne zamandı??"],
    tekYer: "Hepsi tek yerde.",
    tekYerAlt: "Görev, son tarih, tutanak ve mesaj.",
    ozellikler: {
      ozet: { etiket: "Özet", baslik: "Her şey tek bakışta.", aciklama: "En yakın son tarih, ilerleme ve kimde ne olduğu.", gorsel: "ozet.png" },
      pano: { etiket: "Görev panosu", baslik: "Sürükle, bırak, bitir.", aciklama: "Yapılacak, yapılıyor, bitti. Gecikme bir bakışta.", gorsel: "gorevler.png" },
      arama: { etiket: "Genel arama", baslik: "Aradığını anında bul.", aciklama: "Görev, tutanak, toplantı ve kişi; hepsi tek arama kutusunda.", gorsel: "arama.png" },
    },
    tutanak: { etiket: "Resmî tutanak", baslik: ["Notları bırak, ", "tutanak hazır."], sol: "Dağınık notlar ya da Word dosyası", sag: "Alanlar kendiliğinden dolar" },
    kapanis: { alt: "Ücretsiz · Açık kaynak · Teknofest takımları için", dugme: "Hesap açmadan dene →", adres: "seyir-takim.vercel.app" },
  },
  en: {
    slogan: ["Your team's", "logbook."],
    sorular: ["What did we decide last meeting?", "Who had the thruster quotes?", "When was the report due??"],
    tekYer: "All in one place.",
    tekYerAlt: "Tasks, deadlines, minutes and messages.",
    ozellikler: {
      ozet: { etiket: "Overview", baslik: "Everything at a glance.", aciklama: "Nearest deadline, progress and who has what.", gorsel: "ozet.png" },
      pano: { etiket: "Task board", baslik: "Drag, drop, done.", aciklama: "To do, doing, done. Delays at a glance.", gorsel: "gorevler.png" },
      arama: { etiket: "Search", baslik: "Find anything, instantly.", aciklama: "Tasks, minutes, meetings and people, all in one search box.", gorsel: "arama.png" },
    },
    tutanak: { etiket: "Official minutes", baslik: ["Drop your notes, ", "get the minutes."], sol: "Messy notes or a Word file", sag: "The fields fill themselves" },
    kapanis: { alt: "Free · Open source · Built for student teams", dugme: "Try it, no sign-up →", adres: "seyir-takim.vercel.app/en" },
  },
} as const;
