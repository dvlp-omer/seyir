// "Takımlar ve şirketler için" bölümü: iki kurulum paketi (öğrenci takımı / şirket ekibi),
// kurumun kendine uyarlaması (logo, renk, tutanak, sekmeler) ve rol × sekme yetkileri.
// Uygulamadaki karşılıkları: js/kurum.js (paketler, sözcükler), js/yetki.js (roller).
import { GraduationCap, Building2, Palette, ShieldCheck, Check } from "lucide-react";
import { Belir, BolumBasligi, IsikliKart } from "./ortak.jsx";
import { t } from "./dil.js";

const PAKETLER = [
  {
    ikon: GraduationCap,
    ad: t("Öğrenci takımı / kulüp", "Student team / club"),
    ozet: t("Teknofest ve yarışma takımları, öğrenci kulüpleri için.", "For competition teams and student clubs."),
    maddeler: [
      t("Takım, üye, kaptan", "Team, member, captain"),
      t("Sponsorlar: aday → görüşme → anlaşıldı", "Sponsors: lead → meeting → signed"),
      t("Malzeme: sipariş → yolda → geldi, kimde", "Parts: ordered → shipping → arrived, who has it"),
      t("Bütçe: sponsor geliri, harcamalar, kalan", "Budget: sponsor income, spending, what's left"),
      t("Resmî toplantı tutanağı, yoklama", "Official meeting minutes, attendance"),
    ],
  },
  {
    ikon: Building2,
    ad: t("Şirket / ekip", "Company / team"),
    ozet: t("Küçük şirketler, ajanslar ve proje ekipleri için.", "For small companies, agencies and project teams."),
    maddeler: [
      t("Ekip, çalışan, yönetici", "Team, employee, manager"),
      t("Müşteriler: aday → görüşme → anlaşıldı", "Customers: lead → meeting → closed"),
      t("Projeler: teslim tarihi, görevlerden ilerleme", "Projects: due dates, progress from tasks"),
      t("Envanter: kimde, nerede, ne zaman gelecek", "Inventory: who has it, where, when it arrives"),
      t("Bütçe ve finans sorumlusu rolü", "Budget and a finance role"),
    ],
  },
];

const ROLLER = [
  { ad: t("Üye", "Member"), hucreler: ["gorur", "gorur", "gizli", "gorur"] },
  { ad: t("Görev sorumlusu", "Task lead"), hucreler: ["duzenler", "gorur", "gizli", "gorur"] },
  { ad: t("Sayman", "Treasurer"), hucreler: ["gorur", "gorur", "gizli", "duzenler"] },
  { ad: t("İletişim sorumlusu", "Comms lead"), hucreler: ["gorur", "duzenler", "duzenler", "gorur"] },
];
const SUTUNLAR = [t("Görevler", "Tasks"), t("Sponsorlar", "Sponsors"), t("Kişiler", "Contacts"), t("Bütçe", "Budget")];
const SEVIYE = {
  gizli: { yazi: t("Gizli", "Hidden"), sinif: "border-white/10 text-slate-500" },
  gorur: { yazi: t("Görür", "View"), sinif: "border-su-300/25 bg-su-300/5 text-su-300" },
  duzenler: { yazi: t("Düzenler", "Edit"), sinif: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" },
};

export function Paketler() {
  return (
    <section id="kurumsal" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <BolumBasligi etiket={t("Takımlar ve şirketler", "Teams and companies")}
        baslik={t("Kendi kurumuna uyarla.", "Make it your own.")}
        aciklama={t("Kurulumda türünü seç: sözcükler, sekmeler ve hazır roller ona göre gelir. Logo, renk ve tutanak bilgileri senin; kim neyi görür, sen karar verirsin.",
          "Pick your type at setup: words, tabs and ready-made roles follow. Your logo, colors and minutes details; you decide who sees what.")} />

      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {PAKETLER.map((p, i) => (
          <IsikliKart key={p.ad} gecikme={i * 0.08} className="rounded-3xl p-7 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-su-300"><p.ikon size={20} aria-hidden="true" /></span>
              <div>
                <h3 className="text-lg font-semibold text-white">{p.ad}</h3>
                <p className="text-sm text-slate-400">{p.ozet}</p>
              </div>
            </div>
            <ul className="mt-6 space-y-2.5">
              {p.maddeler.map((m) => (
                <li key={m} className="flex items-start gap-2.5 text-slate-300">
                  <Check size={16} className="mt-1 flex-none text-su-300" aria-hidden="true" />{m}
                </li>
              ))}
            </ul>
          </IsikliKart>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_3fr]">
        <IsikliKart gecikme={0.1} className="rounded-3xl p-7 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-su-300"><Palette size={20} aria-hidden="true" /></span>
          <h3 className="mt-5 text-lg font-semibold text-white">{t("Senin kurumun, senin görünüşün", "Your organization, your look")}</h3>
          <p className="mt-3 leading-relaxed text-slate-400">
            {t("Logonu yükle, ana rengini seç: menü ve düğmeler ona göre değişir (yazılar okunur kalır). Tutanak başlığı, numara kalıbı ve alt bilgi senin kurumuna göre. Kullanmadığın sekmeleri kapat; kayıtlar silinmez.",
              "Upload your logo, pick your main color: menus and buttons follow (text stays readable). Minutes heading, numbering and footer match your organization. Hide tabs you don't use; nothing is deleted.")}
          </p>
        </IsikliKart>

        <IsikliKart gecikme={0.15} className="rounded-3xl p-7 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-su-300"><ShieldCheck size={20} aria-hidden="true" /></span>
            <h3 className="text-lg font-semibold text-white">{t("Kim neyi görür, sen seçersin", "You choose who sees what")}</h3>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[440px] border-separate border-spacing-y-1.5 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-1 font-medium">{t("Rol", "Role")}</th>
                  {SUTUNLAR.map((s) => <th key={s} className="pb-1 font-medium">{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROLLER.map((r) => (
                  <tr key={r.ad}>
                    <th scope="row" className="pr-3 text-left font-medium text-slate-200">{r.ad}</th>
                    {r.hucreler.map((h, i) => (
                      <td key={i} className="pr-2"><span className={"inline-block rounded-full border px-2.5 py-0.5 text-xs " + SEVIYE[h].sinif}>{SEVIYE[h].yazi}</span></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Belir gecikme={0.2} as="p" className="mt-4 text-sm leading-relaxed text-slate-400">
            {t("Kurallar veritabanında da geçerli: gizli sekmenin verisi okunamaz, yalnızca görme yetkisi olan kaydedemez.",
              "Rules are enforced in the database too: hidden data can't be read, view-only users can't save.")}
          </Belir>
        </IsikliKart>
      </div>
    </section>
  );
}
