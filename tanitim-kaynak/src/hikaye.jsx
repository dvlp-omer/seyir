// "Neden yaptık" bölümü: projenin bir sualtı aracı takımında doğuşu, zaman çizelgesi
// olarak. Gerçek kişi adı kullanılmaz; yalnızca takımın adı ve herkese açık GitHub hesabı.
import { MessagesSquare, Hammer, Sprout, Globe2, Github } from "lucide-react";
import { Belir, BolumBasligi, IsikliKart, KAYNAK_KOD } from "./ortak.jsx";
import { t } from "./dil.js";

const DURAKLAR = [
  {
    ikon: MessagesSquare,
    etiket: t("Sorun", "The problem"),
    baslik: t("Kararlar sohbet akışında kayboluyordu", "Decisions got lost in the group chat"),
    metin: t(
      "ROTA İSAS, Teknofest'e sualtı aracı hazırlayan bir öğrenci takımı. Kararlar WhatsApp grubunda alınıyor, görevler bir tabloda, tutanaklar Word dosyalarında duruyordu. Kimin neyi üstlendiği karışıyor, rapor ve izin tarihleri son anda hatırlanıyordu.",
      "ROTA İSAS is a student team building an underwater vehicle for Teknofest, Turkey's national technology festival. Decisions were made in a WhatsApp group, tasks sat in a spreadsheet, minutes in Word files. Who owned what got muddled, and report and permit deadlines were remembered at the last minute."),
  },
  {
    ikon: Hammer,
    etiket: t("İlk sürüm", "First version"),
    baslik: t("Takımın kendi aracı olarak başladı", "It started as the team's own tool"),
    metin: t(
      "Önce yalnızca görevler ve son tarihler vardı: tek sayfa, kurulum yok, herkesin telefonunda açılsın yeter. Hedef, toplantıdan çıkınca \"kim, neyi, ne zamana?\" sorusunun tek bir cevabının olmasıydı.",
      "At first it was just tasks and deadlines: one page, nothing to install, it only had to open on everyone's phone. The goal: after every meeting, \"who does what by when?\" should have exactly one answer."),
  },
  {
    ikon: Sprout,
    etiket: t("Büyüdü", "It grew"),
    baslik: t("Takımın gerçek işleriyle şekillendi", "Shaped by the team's real work"),
    metin: t(
      "Kulübün resmî tutanak formatı, karardan görev çıkarma, başvuranlara giden WhatsApp mesajları, takvim ve yoklama birer birer eklendi. Her özellik takımda tekrar eden bir sıkıntıdan doğdu.",
      "The club's official minutes format, tasks from decisions, WhatsApp messages to applicants, the calendar and attendance were added one by one. Every feature came from a problem the team kept running into."),
  },
  {
    ikon: Globe2,
    etiket: t("Bugün", "Today"),
    baslik: t("Her öğrenci takımı için açık", "Open to every student team"),
    metin: t(
      "Aynı sorunları yaşayan başka takımlar da kullanabilsin diye ücretsiz yayında; kodu, testleri ve kurulum rehberi GitHub'da herkese açık.",
      "It's free so other teams with the same problems can use it too; the code, tests and setup guide are public on GitHub."),
  },
];

export function Hikaye() {
  return (
    <section id="hikaye" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <BolumBasligi etiket={t("Hikâye", "Story")} baslik={t("Bir sualtı takımının not defterinden.", "From an underwater team's notebook.")}
        aciklama={t("Seyir bir girişim fikri olarak değil, bir takımın kendi derdine çözüm olarak doğdu.", "Seyir wasn't born as a startup idea, but as one team's fix for its own problem.")} />

      <div className="mt-16 grid gap-12 lg:grid-cols-[3fr_2fr]">
        {/* Zaman çizelgesi: solda dikey çizgi, her durakta ikon */}
        <ol className="relative border-l border-white/10 pl-8 sm:pl-10">
          {DURAKLAR.map((d, i) => (
            <Belir key={d.etiket} as="li" gecikme={i * 0.08} className="relative pb-12 last:pb-0">
              <span className="absolute -left-[3.25rem] top-0 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-obsidyen text-su-300 shadow-[0_0_30px_-8px_rgba(95,211,224,.55)] sm:-left-[3.75rem]">
                <d.ikon size={18} aria-hidden="true" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-su-300">{d.etiket}</span>
              <h3 className="mt-2 text-xl font-semibold text-white">{d.baslik}</h3>
              <p className="mt-3 max-w-xl leading-relaxed text-slate-400">{d.metin}</p>
            </Belir>
          ))}
        </ol>

        {/* Yapan: kod herkese açık, ilkeler */}
        <IsikliKart gecikme={0.15} className="self-start rounded-3xl p-8">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500">{t("Yapan", "Built by")}</span>
          <p className="mt-4 text-lg leading-relaxed text-slate-200">
            {t("Takımın yazılım tarafındaki bir üniversite öğrencisi tarafından, takım arkadaşlarının geri bildirimleriyle geliştirildi.",
              "A university student on the team's software side, with feedback from teammates.")}
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-400">
            <li className="flex gap-3"><span className="text-su-300" aria-hidden="true">—</span>{t("Uygulama düz HTML, CSS ve JavaScript; framework ve paket yok.", "The app is plain HTML, CSS and JavaScript; no framework, no packages.")}</li>
            <li className="flex gap-3"><span className="text-su-300" aria-hidden="true">—</span>{t("Her değişiklikte otomatik testler çalışır.", "Automated tests run on every change.")}</li>
            <li className="flex gap-3"><span className="text-su-300" aria-hidden="true">—</span>{t("Ücretli servis yok; gerçek kişi verisi örneklerde yok.", "No paid services; no real personal data in examples.")}</li>
          </ul>
          <a href={KAYNAK_KOD} className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:text-white">
            <Github size={16} aria-hidden="true" /> github.com/dvlp-omer/seyir
          </a>
        </IsikliKart>
      </div>
    </section>
  );
}
