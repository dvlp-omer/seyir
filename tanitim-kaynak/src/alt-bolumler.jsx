// Sayfanın alt yarısı: not demosu, vitrin, sayılar, adımlar, güvenlik, kapanış, alt bilgi.
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight, Github, RotateCcw, ShieldCheck, KeyRound, Lock, GitMerge, UserCheck,
  Users, ClipboardList, ListChecks,
} from "lucide-react";
import { Logo, Belir, IsikliKart, BolumBasligi, Sayac, UYGULAMA, KAYNAK_KOD } from "./ortak.jsx";
import ozetGorseli from "./gorseller/ozet.png";
import takvimGorseli from "./gorseller/takvim.png";
import tutanakGorseli from "./gorseller/tutanak-gorev.png";
import aramaGorseli from "./gorseller/arama.png";
import mobilGorseli from "./gorseller/mobil.png";

/* ---------- Not demosu: serbest notlar forma akar ----------
   Uygulamadaki gerçek kurallarla aynı sonucu canlandırır (js/tutanak.js >
   serbestNotuYerlestir). Adlar ve içerik uydurmadır. */
const NOTLAR = [
  "Toplantı katılımcıları deniz kaya, elif aydın",
  "Bir sonraki toplantı 26 kasım 17.30",
  "(1. toplantı, Karar 2) Kamera kablosu yenilenecek",
  "İtici motor tekliflerini mert şahin toplayacak",
];
const ALANLAR = [
  { etiket: "Katılımcılar", deger: "Deniz Kaya, Elif Aydın" },
  { etiket: "Sonraki toplantı", deger: "26 Kasım, 17.30" },
  { etiket: "Devreden karar", deger: "Kamera kablosu yenilenecek", ek: "1. toplantı, Karar 2" },
  { etiket: "Karar → Görev", deger: "İtici motor teklifleri", kisi: "MŞ" },
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
        etiket="Nasıl çalışır"
        baslik="Notları yapıştır. Gerisi kendiliğinden."
        aciklama="Toplantıda tuttuğun dağınık notları ya da Word dosyasını bırak; katılımcılar, sonraki toplantı, devreden kararlar ve görevler yerine oturur. Yapay zekâ yok, veri dışarı çıkmaz: tamamen tarayıcıda çalışan kurallar."
      />

      <div ref={ref} className="mt-16 grid gap-4 lg:grid-cols-2">
        {/* Sol: dağınık notlar */}
        <div className="cam p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Notlar</span>
            <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-500">toplanti-3.docx</span>
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
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Resmî tutanak</span>
            <button type="button" onClick={() => setTur((t) => t + 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/25 hover:text-white">
              <RotateCcw size={12} /> Tekrar oynat
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
  { gorsel: ozetGorseli, baslik: "Özet", metin: "En yakın son tarih, ilerleme, kimde ne var." },
  { gorsel: tutanakGorseli, baslik: "Resmî tutanak", metin: "Kararlardan tek tıkla görev." },
  { gorsel: takvimGorseli, baslik: "Takvim", metin: "Toplantı, etkinlik ve son tarihler tek ayda." },
  { gorsel: aramaGorseli, baslik: "Genel arama", metin: "Ctrl+K ile her kayıt bir tuş uzağında." },
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
        <img src={e.gorsel} alt={"Seyir: " + e.baslik + " ekranı"} loading="lazy" className="w-full rounded-xl transition duration-700 group-hover:scale-[1.015]" />
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
          <BolumBasligi etiket="Ekranlar" baslik="Sade. Hızlı. Karanlıkta da." ortali={false}
            aciklama={yatay ? "Aşağı kaydırdıkça ekranlar akar." : undefined} />
        </div>
        {yatay
          ? <motion.div style={{ x }} className="flex gap-10 pl-[max(1.25rem,calc((100vw-72rem)/2+1.25rem))]">{kartlar}</motion.div>
          : <div className="mx-auto grid max-w-6xl gap-14 px-5">{kartlar}
              <figure className="mx-auto w-full max-w-sm">
                <div className="overflow-hidden rounded-[2rem] border border-white/10 p-1.5"><img src={mobilGorseli} alt="Seyir telefonda" loading="lazy" className="w-full rounded-[1.6rem]" /></div>
              </figure>
            </div>}
      </div>
    </section>
  );
}

/* ---------- Sayılar ---------- */
const SAYILAR = [
  { hedef: 234, sonek: "", metin: "otomatik test, her gönderimde" },
  { hedef: 13, sonek: "", metin: "tablo, hepsi satır düzeyinde korumalı" },
  { hedef: 12, sonek: "", metin: "ekran: görevden WhatsApp'a" },
  { hedef: 0, sonek: " ₺", metin: "aylık maliyet" },
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
  { ikon: Users, baslik: "Takımını kur", metin: "Takımı oluştur, üyeleri ekle. İlk hesap yönetici olur." },
  { ikon: UserCheck, baslik: "Ekibini davet et", metin: "Yalnızca davet ettiğin e-postalar hesap açabilir." },
  { ikon: ClipboardList, baslik: "Toplantıdan göreve", metin: "Notları bırak, tutanağı al, kararları göreve çevir." },
];

export function Adimlar() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-28 sm:py-36">
      <BolumBasligi etiket="Başlamak" baslik="Üç adımda hazır." />
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
  { ikon: ShieldCheck, baslik: "Herkes yalnızca kendi takımını görür", metin: "Kurallar veritabanında (satır düzeyinde güvenlik); tarayıcıdan aşılamaz.", genis: true },
  { ikon: ListChecks, baslik: "Test edilen gizlilik", metin: "Depoda gerçek görünen bir telefon numarası olursa testler kırmızı yanar.", genis: true },
  { ikon: KeyRound, baslik: "Yalnızca davetle", metin: "Davet listesinde olmayan e-posta hesap açamaz." },
  { ikon: Lock, baslik: "Sıkı içerik politikası", metin: "Sayfa yalnızca kendi dosyalarını çalıştırır; HTTPS zorunlu." },
  { ikon: GitMerge, baslik: "Aynı anda düzenleme", metin: "İki kişi aynı kaydı değiştirirse ikincisi uyarılır, kimsenin yazdığı ezilmez." },
];

export function Guvenlik() {
  return (
    <section id="guvenlik" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <BolumBasligi etiket="Güvenlik" baslik="Takımın verisi, takımda kalır."
        aciklama="Öğrenci kulübü uygulaması diye güvenlikten ödün yok. Kurallar sunucuda, testlerle denetleniyor." />
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
          Bir sonraki toplantıya<br />hazır mısın?
        </Belir>
        <Belir gecikme={0.1} as="p" className="relative mx-auto mt-6 max-w-xl text-slate-400">
          Kurulum yok, kart bilgisi yok. Takımını aç, ilk tutanağını beş dakikada çıkar.
        </Belir>
        <Belir gecikme={0.2} className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={UYGULAMA} className="parlak-dugme">Uygulamayı aç <ArrowRight size={18} /></a>
          <a href={KAYNAK_KOD} className="ikincil-dugme"><Github size={18} /> Kaynak kodu incele</a>
        </Belir>
      </div>
    </section>
  );
}

export function AltBilgi() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2.5 text-slate-300"><Logo boyut={22} /> Seyir <span className="text-slate-600">·</span> <span className="text-slate-500">takım asistanı</span></div>
        <p>ROTA İSAS Teknofest takımı için yapıldı · açık kaynak</p>
        <div className="flex gap-5">
          <a className="transition hover:text-white" href={UYGULAMA}>Uygulama</a>
          <a className="transition hover:text-white" href={KAYNAK_KOD}>GitHub</a>
          <a className="transition hover:text-white" href="#">Başa dön ↑</a>
        </div>
      </div>
    </footer>
  );
}
