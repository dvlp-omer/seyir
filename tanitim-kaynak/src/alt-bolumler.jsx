// Sayfanın alt yarısı: not demosu, vitrin, sayılar, adımlar, güvenlik, kapanış, alt bilgi.
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight, RotateCcw, ShieldCheck, KeyRound, Lock, GitMerge, UserCheck,
  Users, ClipboardList, ListChecks, Play,
} from "lucide-react";
import { Logo, Belir, IsikliKart, BolumBasligi, Sayac, UYGULAMA, ORNEK, KAYNAK_KOD, LISANS } from "./ortak.jsx";
import { t } from "./dil.js";
import ozetGorseli from "./gorseller/ozet.png";
import takvimGorseli from "./gorseller/takvim.png";
import tutanakGorseli from "./gorseller/tutanak-gorev.png";
import aramaGorseli from "./gorseller/arama.png";
import mobilGorseli from "./gorseller/mobil.png";

/* ---------- Not demosu: serbest notlar forma akar ----------
   Uygulamadaki gerçek kurallarla aynı sonucu canlandırır (js/tutanak.js >
   serbestNotuYerlestir). Adlar ve içerik uydurmadır. */
const NOTLAR = t([
  "Toplantı katılımcıları deniz kaya, elif aydın",
  "Bir sonraki toplantı 26 kasım 17.30",
  "(1. toplantı, Karar 2) Kamera kablosu yenilenecek",
  "İtici motor tekliflerini mert şahin toplayacak",
], [
  "Attendees deniz kaya, elif aydın",
  "Next meeting nov 26 17.30",
  "(Meeting 1, Decision 2) Replace the camera cable",
  "mert şahin will collect thruster quotes",
]);
const ALANLAR = [
  { etiket: t("Katılımcılar", "Attendees"), deger: "Deniz Kaya, Elif Aydın" },
  { etiket: t("Sonraki toplantı", "Next meeting"), deger: t("26 Kasım, 17.30", "Nov 26, 17:30") },
  { etiket: t("Devreden karar", "Carried over"), deger: t("Kamera kablosu yenilenecek", "Replace the camera cable"), ek: t("1. toplantı, Karar 2", "Meeting 1, Decision 2") },
  { etiket: t("Karar → Görev", "Decision → Task"), deger: t("İtici motor teklifleri", "Thruster quotes"), kisi: "MŞ" },
];

export function NotDemosu() {
  const ref = useRef(null);
  const gorundu = useInView(ref, { once: true, margin: "-120px" });
  const azHareket = useReducedMotion();
  const [adim, setAdim] = useState(azHareket ? NOTLAR.length * 2 : 0); // 0..4 satır yazılır, 5..8 alan dolar
  const [tur, setTur] = useState(0);

  useEffect(() => {
    if (!gorundu || azHareket) return;
    setAdim(0);
    let i = 0;
    const zamanlayici = setInterval(() => {
      i++; setAdim(i);
      if (i >= NOTLAR.length * 2) clearInterval(zamanlayici);
    }, 520);
    return () => clearInterval(zamanlayici);
  }, [gorundu, tur, azHareket]);

  return (
    <section id="demo" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[30rem] w-[50rem] -translate-x-1/2 rounded-full bg-su-600/10 blur-[120px]" aria-hidden="true" />
      <BolumBasligi
        etiket={t("Nasıl çalışır", "How it works")}
        baslik={t("Notları yapıştır. Gerisi kendiliğinden.", "Paste your notes. The rest falls into place.")}
        aciklama={t("Toplantıda tuttuğun dağınık notları ya da Word dosyasını bırak; katılımcılar, sonraki toplantı, devreden kararlar ve görevler yerine oturur. Yapay zekâ yok, veri dışarı çıkmaz: tamamen tarayıcıda çalışan kurallar.",
          "Drop in your messy meeting notes or a Word file; attendees, the next meeting, carried-over decisions and tasks land in the right fields. No AI and no data leaves the device: just rules running in your browser. (The app reads Turkish notes.)")}
      />

      <div ref={ref} className="mt-16 grid gap-4 lg:grid-cols-2">
        {/* Sol: dağınık notlar */}
        <div className="cam p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">{t("Notlar", "Notes")}</span>
            <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-500">{t("toplanti-3.docx", "meeting-3.docx")}</span>
          </div>
          <div className="min-h-[190px] space-y-2.5 font-mono text-[13px] leading-relaxed sm:text-sm">
            {NOTLAR.map((satir, i) => (
              <motion.p key={satir + tur} initial={{ opacity: 0, x: -8 }} animate={adim > i ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4 }} className="text-slate-300">
                <span className="mr-3 select-none text-slate-600">{i + 1}</span>{satir}
              </motion.p>
            ))}
          </div>
        </div>

        {/* Sağ: dolan form */}
        <div className="cam p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">{t("Resmî tutanak", "Official minutes")}</span>
            <button type="button" onClick={() => setTur((t) => t + 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/25 hover:text-white">
              <RotateCcw size={12} /> {t("Tekrar oynat", "Replay")}
            </button>
          </div>
          <div className="space-y-3">
            {ALANLAR.map((alan, i) => {
              const dolu = adim > NOTLAR.length + i;
              return (
                <div key={alan.etiket} className="grid grid-cols-[120px_1fr] items-center gap-3 sm:grid-cols-[140px_1fr]">
                  <span className="text-xs text-slate-500">{alan.etiket}</span>
                  <div className={"relative flex min-h-[42px] items-center gap-2 overflow-hidden rounded-lg border px-3 text-sm transition-colors duration-500 " +
                    (dolu ? "border-su-500/40 bg-su-500/[.07]" : "border-white/10 bg-white/[.02]")}>
                    <motion.span key={alan.etiket + tur} initial={{ opacity: 0, y: 8 }} animate={dolu ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.45, ease: [0.21, 0.6, 0.35, 1] }} className="flex min-w-0 items-center gap-2 text-slate-100">
                      {alan.kisi && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-600 text-[10px] font-bold">{alan.kisi}</span>}
                      <span className="truncate">{alan.deger}</span>
                      {alan.ek && <span className="hidden shrink-0 rounded bg-white/5 px-1.5 text-[11px] text-slate-400 sm:inline">{alan.ek}</span>}
                    </motion.span>
                    {dolu && <motion.span key={"isik" + tur} className="absolute inset-0 bg-gradient-to-r from-transparent via-su-300/20 to-transparent"
                      initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 0.8 }} aria-hidden="true" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Vitrin: kaydırdıkça yatay akan büyük ekranlar ---------- */
const EKRANLAR = [
  { gorsel: ozetGorseli, baslik: t("Özet", "Overview"), metin: t("En yakın son tarih, ilerleme, kimde ne var.", "Nearest deadline, progress, who has what.") },
  { gorsel: tutanakGorseli, baslik: t("Resmî tutanak", "Official minutes"), metin: t("Kararlardan tek tıkla görev.", "One-click tasks from decisions.") },
  { gorsel: takvimGorseli, baslik: t("Takvim", "Calendar"), metin: t("Toplantı, etkinlik ve son tarihler tek ayda.", "Meetings, events and deadlines in one month.") },
  { gorsel: aramaGorseli, baslik: t("Genel arama", "Global search"), metin: t("Ctrl+K ile her kayıt bir tuş uzağında.", "Every record is one Ctrl+K away.") },
];

function useGenisEkran() {
  const [genis, setGenis] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  useEffect(() => {
    const sorgu = window.matchMedia("(min-width: 900px)");
    const degisti = () => setGenis(sorgu.matches);
    sorgu.addEventListener("change", degisti);
    return () => sorgu.removeEventListener("change", degisti);
  }, []);
  return genis;
}

export function Vitrin() {
  const ref = useRef(null);
  const genis = useGenisEkran();
  const azHareket = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], ["0%", "-58%"]);
  const yatay = genis && !azHareket;

  const kartlar = EKRANLAR.map((e) => (
    <figure key={e.baslik} className={(yatay ? "w-[54vw] max-w-[860px] shrink-0 " : "") + "group"}>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] p-1.5 shadow-[0_30px_100px_-30px_rgba(0,0,0,.9)]">
        <img src={e.gorsel} alt={t("Seyir: " + e.baslik + " ekranı", "Seyir: " + e.baslik + " screen")} loading="lazy" className="w-full rounded-xl transition duration-700 group-hover:scale-[1.015]" />
      </div>
      <figcaption className="mt-5 flex items-baseline gap-3">
        <span className="text-lg font-semibold text-white">{e.baslik}</span>
        <span className="text-sm text-slate-500">{e.metin}</span>
      </figcaption>
    </figure>
  ));

  return (
    <section id="vitrin" ref={ref} className={"relative scroll-mt-16 " + (yatay ? "h-[320vh]" : "")}>
      <div className={yatay ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-16" : "py-28"}>
        <div className={"mx-auto w-full max-w-6xl px-5 " + (yatay ? "mb-8" : "mb-12")}>
          <BolumBasligi etiket={t("Ekranlar", "Screens")} baslik={t("Sade. Hızlı. Karanlıkta da.", "Simple. Fast. In the dark, too.")} ortali={false}
            aciklama={yatay ? t("Aşağı kaydırdıkça ekranlar akar.", "Scroll down and the screens glide by. (The interface is in Turkish.)") : undefined} />
        </div>
        {yatay
          ? <motion.div style={{ x }} className="flex gap-10 pl-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))]">{kartlar}</motion.div>
          : <div className="mx-auto grid max-w-6xl gap-14 px-5">{kartlar}
              <figure className="mx-auto w-full max-w-sm">
                <div className="overflow-hidden rounded-[2rem] border border-white/10 p-1.5"><img src={mobilGorseli} alt={t("Seyir telefonda", "Seyir on a phone")} loading="lazy" className="w-full rounded-[1.6rem]" /></div>
              </figure>
            </div>}
      </div>
    </section>
  );
}

/* ---------- Sayılar ---------- */
const SAYILAR = [
  { hedef: 302, sonek: "", metin: t("otomatik test, her gönderimde", "automated tests on every push") },
  { hedef: 18, sonek: "", metin: t("tablo, hepsi satır düzeyinde korumalı", "tables, all with row-level security") },
  { hedef: 16, sonek: "", metin: t("ekran: görevden bütçeye", "screens, from tasks to budget") },
  { hedef: 0, sonek: t(" ₺", " $"), metin: t("aylık maliyet", "monthly cost") },
];

export function Sayilar() {
  return (
    <section className="border-y border-white/5 bg-white/[.015]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-white/5 px-5 md:grid-cols-4 md:divide-x">
        {SAYILAR.map((s, i) => (
          <Belir key={s.metin} gecikme={i * 0.08} className="px-2 py-12 text-center md:px-6">
            <div className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"><Sayac hedef={s.hedef} sonek={s.sonek} /></div>
            <div className="mt-2 text-sm text-slate-500">{s.metin}</div>
          </Belir>
        ))}
      </div>
    </section>
  );
}

/* ---------- Üç adım ---------- */
const ADIMLAR = [
  { ikon: Users, baslik: t("Takımını kur", "Set up your team"), metin: t("Takımı oluştur, üyeleri ekle. İlk hesap yönetici olur.", "Create the team, add members. The first account becomes admin.") },
  { ikon: UserCheck, baslik: t("Ekibini davet et", "Invite your crew"), metin: t("Yalnızca davet ettiğin e-postalar hesap açabilir.", "Only the emails you invite can sign up.") },
  { ikon: ClipboardList, baslik: t("Toplantıdan göreve", "From meeting to task"), metin: t("Notları bırak, tutanağı al, kararları göreve çevir.", "Drop the notes, get the minutes, turn decisions into tasks.") },
];

export function Adimlar() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-28 sm:py-36">
      <BolumBasligi etiket={t("Başlamak", "Getting started")} baslik={t("Üç adımda hazır.", "Ready in three steps.")} />
      <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
        <div className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" aria-hidden="true" />
        {ADIMLAR.map((a, i) => (
          <Belir key={a.baslik} gecikme={i * 0.12} className="relative text-center">
            <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-obsidyen text-su-300 shadow-[0_0_40px_-10px_rgba(95,211,224,.6)]">
              <a.ikon size={22} />
              <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white font-mono text-[11px] font-bold text-obsidyen">{i + 1}</span>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-white">{a.baslik}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{a.metin}</p>
          </Belir>
        ))}
      </div>
    </section>
  );
}

/* ---------- Güvenlik ---------- */
const GUVENLIK = [
  { ikon: ShieldCheck, baslik: t("Herkes yalnızca kendi takımını görür", "Everyone sees only their own team"), metin: t("Kurallar veritabanında (satır düzeyinde güvenlik); tarayıcıdan aşılamaz.", "The rules live in the database (row-level security); the browser can't bypass them."), genis: true },
  { ikon: ListChecks, baslik: t("Test edilen gizlilik", "Tested privacy"), metin: t("Depoda gerçek görünen bir telefon numarası olursa testler kırmızı yanar.", "If a real-looking phone number ever lands in the repo, the tests turn red."), genis: true },
  { ikon: KeyRound, baslik: t("Yalnızca davetle", "Invite only"), metin: t("Davet listesinde olmayan e-posta hesap açamaz.", "An email that isn't on the invite list can't sign up.") },
  { ikon: Lock, baslik: t("Sıkı içerik politikası", "Strict content policy"), metin: t("Sayfa yalnızca kendi dosyalarını çalıştırır; HTTPS zorunlu.", "The page only runs its own files; HTTPS is enforced.") },
  { ikon: GitMerge, baslik: t("Aynı anda düzenleme", "Simultaneous edits"), metin: t("İki kişi aynı kaydı değiştirirse ikincisi uyarılır, kimsenin yazdığı ezilmez.", "If two people edit the same record, the second is warned; nobody's work gets overwritten.") },
];

export function Guvenlik() {
  return (
    <section id="guvenlik" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <BolumBasligi etiket={t("Güvenlik", "Security")} baslik={t("Takımın verisi, takımda kalır.", "Your team's data stays with your team.")}
        aciklama={t("Öğrenci kulübü uygulaması diye güvenlikten ödün yok. Kurallar sunucuda, testlerle denetleniyor.", "A student club app is no excuse to cut corners on security. The rules live on the server and are checked by tests.")} />
      <div className="mt-16 grid gap-4 md:grid-cols-6">
        {GUVENLIK.map((g, i) => (
          <IsikliKart key={g.baslik} gecikme={i * 0.06} className={"p-7 " + (g.genis ? "md:col-span-3" : "md:col-span-2")}>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-su-300"><g.ikon size={19} /></div>
            <h3 className="text-base font-semibold text-white">{g.baslik}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{g.metin}</p>
          </IsikliKart>
        ))}
      </div>
    </section>
  );
}

/* ---------- Kapanış ve alt bilgi ---------- */
export function Kapanis() {
  return (
    <section className="relative overflow-hidden px-5 pb-28 pt-12 sm:pb-36">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[26rem] max-w-4xl rounded-full bg-su-600/25 blur-[130px]" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[.06] to-white/[.01] px-6 py-20 text-center sm:px-12">
        <div className="izgara-zemin pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <Belir as="h2" className="parlak-metin relative text-4xl font-semibold tracking-tight sm:text-6xl">
          {t("Bir sonraki toplantıya", "Ready for your")}<br />{t("hazır mısın?", "next meeting?")}
        </Belir>
        <Belir gecikme={0.1} as="p" className="relative mx-auto mt-6 max-w-xl text-slate-400">
          {t("Kurulum yok, kart bilgisi yok. Takımını aç, ilk tutanağını beş dakikada çıkar.", "No install, no credit card. Open your team and have your first minutes in five minutes.")}
        </Belir>
        <Belir gecikme={0.2} className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={UYGULAMA} className="parlak-dugme">{t("Uygulamayı aç", "Open the app")} <ArrowRight size={18} /></a>
          <a href={ORNEK} className="ikincil-dugme"><Play size={16} /> {t("Örnek takımla dene", "Try a sample team")}</a>
        </Belir>
      </div>
    </section>
  );
}

export function AltBilgi() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2.5 text-slate-300"><Logo boyut={22} /> Seyir <span className="text-slate-600">·</span> <span className="text-slate-500">{t("takım asistanı", "team assistant")}</span></div>
        <p>{t("ROTA İSAS Teknofest takımı için yapıldı", "Built for the ROTA İSAS Teknofest team")} · © 2026 Seyir · <a className="transition hover:text-white" href={LISANS}>{t("Lisans", "License")}</a></p>
        <div className="flex gap-5">
          <a className="transition hover:text-white" href={UYGULAMA}>{t("Uygulama", "App")}</a>
          <a className="transition hover:text-white" href={KAYNAK_KOD}>GitHub</a>
          <a className="transition hover:text-white" href="#">{t("Başa dön ↑", "Back to top ↑")}</a>
        </div>
      </div>
    </footer>
  );
}
