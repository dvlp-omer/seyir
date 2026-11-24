// Yenilikler: son eklenen özellikler, tarihe göre. Kaynak git geçmişi; yalnızca kullanıcının
// göreceği değişiklikler yazılır (altyapı, test, belge değişiklikleri yazılmaz).
// Yeni bir özellik eklenince listenin BAŞINA (iki dilde) ekle; en fazla 3 tarih göster.
import { Belir, BolumBasligi, IsikliKart } from "./ortak.jsx";
import { t } from "./dil.js";

const YENI = t("Yeni", "New"), IYI = t("İyileşti", "Improved"), GUV = t("Güvenlik", "Security");

const SURUMLER = [
  {
    tarih: t("24 Kasım 2026", "November 24, 2026"),
    maddeler: [
      [YENI, t("Kurum paketleri: öğrenci takımı ya da şirket ekibi; sözcükler, sekmeler ve hazır roller türe göre.", "Organization packages: student team or company team; words, tabs and ready-made roles follow your type.")],
      [YENI, t("Logo, ana renk ve tutanak bilgileri kurumuna göre; kullanmadığın sekmeleri kapat.", "Your logo, main color and minutes details; hide the tabs you don't use.")],
      [GUV, t("Roller ve yetkiler: her sekme için Gizli / Görür / Düzenler; kurallar veritabanında da geçerli.", "Roles and permissions: Hidden / View / Edit per tab, enforced in the database too.")],
      [YENI, t("Yeni sekmeler: Sponsorlar (Müşteriler), Bütçe, Malzeme (Envanter) ve Projeler.", "New tabs: Sponsors (Customers), Budget, Parts (Inventory) and Projects.")],
      [YENI, t("Anlaşılan sponsor ve alınan malzeme tek tıkla bütçeye; proje ilerlemesi görevlerden hesaplanır.", "Signed sponsors and bought parts go to the budget in one click; project progress comes from tasks.")],
    ],
  },
  {
    tarih: t("22 Kasım 2026", "November 22, 2026"),
    maddeler: [
      [YENI, t("Duyurulara bağlantı, fotoğraf ve video eklenebiliyor; metin görselle tek mesaj olarak gidiyor.", "Announcements can carry a link, photos and videos; the text goes with the image as one message.")],
      [IYI, t("WhatsApp mesajlarında emojiler artık bozulmuyor.", "Emoji no longer break in WhatsApp messages.")],
    ],
  },
  {
    tarih: t("19 Kasım 2026", "November 19, 2026"),
    maddeler: [
      [YENI, t("Hesap açmadan dene: tek tıkla uydurma bir takımla dolu uygulama, sekmeyi kapatınca silinir.", "Try without an account: one click opens the app with a made-up team, deleted when you close the tab.")],
      [YENI, t("Yeni logo ve tanıtım sayfası.", "New logo and landing page.")],
      [IYI, t("Özet ekranı: ilerleme çubuğu, \"Kimde ne var\" ve \"Sıradaki buluşmalar\".", "Overview screen: progress bar, \"Who has what\" and \"Upcoming meetups\".")],
      [IYI, t("Telefonda alt çubukta dört ana ekran; menü gruplara ayrıldı.", "Four main screens in the bottom bar on phones; the menu is now grouped.")],
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
