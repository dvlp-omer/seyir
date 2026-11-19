// Yenilikler: son eklenen özellikler, tarihe göre. Kaynak git geçmişi; yalnızca kullanıcının
// göreceği değişiklikler yazılır (altyapı, test, belge değişiklikleri yazılmaz).
// Yeni bir özellik eklenince listenin BAŞINA (iki dilde) ekle; en fazla 3 tarih göster.
import { Belir, BolumBasligi, IsikliKart } from "./ortak.jsx";
import { t } from "./dil.js";

const YENI = t("Yeni", "New"), IYI = t("İyileşti", "Improved"), GUV = t("Güvenlik", "Security");

const SURUMLER = [
  {
    tarih: t("19 Kasım 2026", "November 19, 2026"),
    maddeler: [
      [YENI, t("Hesap açmadan dene: tek tıkla uydurma bir takımla dolu uygulama, sekmeyi kapatınca silinir.", "Try without an account: one click opens the app with a made-up team, deleted when you close the tab.")],
      [YENI, t("Yeni logo ve tanıtım sayfası.", "New logo and landing page.")],
      [IYI, t("Özet ekranı: ilerleme çubuğu, \"Kimde ne var\" ve \"Sıradaki buluşmalar\".", "Overview screen: progress bar, \"Who has what\" and \"Upcoming meetups\".")],
      [IYI, t("Telefonda alt çubukta dört ana ekran; menü gruplara ayrıldı.", "Four main screens in the bottom bar on phones; the menu is now grouped.")],
    ],
  },
  {
    tarih: t("18 Kasım 2026", "November 18, 2026"),
    maddeler: [
      [YENI, t("Görev panosunda kartları sürükleyip başka sütuna bırak.", "Drag task cards to another column on the board.")],
      [YENI, t("Ctrl+K ile her yerde arama; Ctrl+S kaydet, ? kısayol listesi.", "Search everywhere with Ctrl+K; Ctrl+S to save, ? for shortcuts.")],
      [YENI, t("Takvimi .ics dosyasıyla Google Takvim'e ya da telefona aktar.", "Export the calendar as an .ics file to Google Calendar or your phone.")],
      [YENI, t("Tutanak kararından tek tıkla görev; sorumlu metindeki addan seçilir.", "One-click tasks from minutes decisions; the owner is picked from the name in the text.")],
      [IYI, t("Başlıksız notlar da forma yerleşiyor; Word dosyası sürükleyip bırakılabiliyor.", "Notes without headings now fill the form too; Word files can be dragged in.")],
      [IYI, t("Yarım kalan formlar kaybolmuyor, açınca geri geliyor.", "Half-filled forms no longer get lost; they come back when reopened.")],
    ],
  },
  {
    tarih: t("17 Kasım 2026", "November 17, 2026"),
    maddeler: [
      [YENI, t("Şifremi unuttum, beni hatırla ve şifre değiştirme.", "Forgot password, remember me and password change.")],
      [GUV, t("İki kişi aynı kaydı aynı anda düzenlerse uyarı; kimsenin yazdığı ezilmez.", "A warning when two people edit the same record at once; nobody's work gets overwritten.")],
    ],
  },
];

const ROZET = {
  [YENI]: "border-su-300/30 bg-su-300/10 text-su-300",
  [IYI]: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  [GUV]: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
};

export function Yenilikler() {
  return (
    <section id="yenilikler" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <BolumBasligi etiket={t("Yenilikler", "What's new")} baslik={t("Durmadan gelişiyor.", "Always improving.")}
        aciklama={t("Takımdan gelen her geri bildirim bir sonraki sürüme dönüşüyor. Son eklenenler:", "Every piece of feedback from the team turns into the next release. Latest additions:")} />
      <div className="mx-auto mt-14 max-w-3xl space-y-5">
        {SURUMLER.map((s, i) => (
          <IsikliKart key={s.tarih} gecikme={i * 0.08} className="rounded-3xl p-6 sm:p-8">
            <h3 className="font-mono text-sm tracking-wide text-slate-400">{s.tarih}</h3>
            <ul className="mt-4 space-y-3">
              {s.maddeler.map(([tur, metin]) => (
                <li key={metin} className="flex items-start gap-3">
                  <span className={"mt-0.5 flex-none rounded-full border px-2 py-0.5 text-[11px] font-medium " + ROZET[tur]}>{tur}</span>
                  <span className="leading-relaxed text-slate-300">{metin}</span>
                </li>
              ))}
            </ul>
          </IsikliKart>
        ))}
        <Belir gecikme={0.2} as="p" className="pt-2 text-center text-sm text-slate-500">
          {t("Bütün değişiklikler GitHub'daki geçmişte.", "The full history is on GitHub.")}
        </Belir>
      </div>
    </section>
  );
}
