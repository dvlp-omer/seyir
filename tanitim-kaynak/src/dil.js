// Tanıtım sayfasının dili. Türkçe ana adreste (/), İngilizce /en adresinde.
// İki ayrı adres olması arama motorlarının iki dili ayrı ayrı bulması içindir
// (index.html > hreflang). Dil sayfa açılırken bir kez belirlenir.
//
// Kullanım: t("Türkçe metin", "English text"). Çeviri metnin hemen yanında durur;
// bir metni değiştirirken öteki dili de güncellemeyi unutma.
export const DIL =
  typeof window !== "undefined" && /^\/en(\/|$)/.test(window.location.pathname) ? "en" : "tr";

export const t = (tr, en) => (DIL === "en" ? en : tr);

// Öbür dildeki sayfanın adresi (dil düğmesi için)
export const OBUR_DIL_ADRESI = DIL === "en" ? "/" : "/en";
