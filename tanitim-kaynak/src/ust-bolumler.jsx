// Sayfanın üst yarısı: menü, hero, kayan bant, bento özellik kartları.
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Github, Search, CalendarPlus, WifiOff, MessageCircle, FileText,
  SquareKanban, Sparkles, Play,
} from "lucide-react";
import { Logo, Belir, IsikliKart, BolumBasligi, UYGULAMA, ORNEK, KAYNAK_KOD } from "./ortak.jsx";
import gorevlerGorseli from "./gorseller/gorevler.png";
import ozetGorseli from "./gorseller/ozet.png";
import tutanakGorseli from "./gorseller/tutanak-gorev.png";

/* ---------- Üst menü: kaydırınca cam efektli olur ---------- */
export function UstMenu() {
  const [kaydi, setKaydi] = useState(false);
  useEffect(() => {
    const izle = () => setKaydi(window.scrollY > 12);
    izle();
    window.addEventListener("scroll", izle, { passive: true });
    return () => window.removeEventListener("scroll", izle);
  }, []);
  return (
    <header className={"fixed inset-x-0 top-0 z-50 transition-all duration-300 " +
      (kaydi ? "border-b border-white/10 bg-obsidyen/70 backdrop-blur-xl" : "border-b border-transparent")}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Ana menü">
        <a href="#" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Logo boyut={30} canli /> <span className="yazi-parilti">Seyir</span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <a className="transition hover:text-white" href="#ozellikler">Özellikler</a>
          <a className="transition hover:text-white" href="#demo">Nasıl çalışır</a>
          <a className="transition hover:text-white" href="#vitrin">Ekranlar</a>
          <a className="transition hover:text-white" href="#hikaye">Hikâye</a>
          <a className="transition hover:text-white" href="#guvenlik">Güvenlik</a>
          <a className="transition hover:text-white" href="#sss">SSS</a>
        </div>
        <div className="flex items-center gap-2">
          <a href={KAYNAK_KOD} className="hidden rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white sm:inline-flex" aria-label="Kaynak kod (GitHub)">
            <Github size={18} />
          </a>
          <a href={UYGULAMA} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-obsidyen transition hover:bg-su-300">
            Uygulamayı aç
          </a>
        </div>
      </nav>
    </header>
  );
}

/* ---------- Hero ---------- */
export function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Kaydırdıkça eğik ürün görüntüsü düzleşir ve yaklaşır
  const egim = useTransform(scrollYProgress, [0, 0.45], [24, 0]);
  const olcek = useTransform(scrollYProgress, [0, 0.45], [0.9, 1]);
  const yukari = useTransform(scrollYProgress, [0, 0.45], [40, -20]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-36 sm:pt-44">
      {/* Arka plan: ızgara + yavaşça dalgalanan ışık lekeleri */}
      <div className="izgara-zemin pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <div className="animate-aurora absolute left-1/2 top-[-12rem] h-[38rem] w-[60rem] -translate-x-1/2 rounded-full bg-su-600/30 blur-[120px]" />
        <div className="animate-aurora-yavas absolute right-[-10rem] top-[8rem] h-[28rem] w-[36rem] rounded-full bg-blue-600/25 blur-[120px]" />
        <div className="animate-aurora absolute left-[-8rem] top-[18rem] h-[20rem] w-[26rem] rounded-full bg-dumen-500/15 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <Belir className="mb-8 flex justify-center">
          <div className="logo-hale relative">
            <Logo boyut={84} canli />
          </div>
        </Belir>
        <Belir>
          <a href="#demo" className="parilti animate-parilti inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 sm:text-sm">
            <Sparkles size={14} className="text-su-300" />
            Yeni: başlıksız notlar da forma kendiliğinden yerleşiyor
            <ArrowRight size={14} />
          </a>
        </Belir>

        <Belir gecikme={0.08} as="h1" className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl md:text-[5.5rem]">
          <span className="parlak-metin">Takımının</span>{" "}
          <span className="su-metin">seyir defteri.</span>
        </Belir>

        <Belir gecikme={0.16} as="p" className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Görevler, son tarihler, resmî toplantı tutanakları ve ekibe giden mesajlar tek yerde.
          Teknofest takımları için yapıldı; ücretsiz, açık kaynak ve internet yokken bile çalışır.
        </Belir>

        <Belir gecikme={0.24} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={UYGULAMA} className="parlak-dugme">
            Uygulamayı aç <ArrowRight size={18} />
          </a>
          <a href={ORNEK} className="ikincil-dugme">
            <Play size={16} /> Örnek takımla dene
          </a>
        </Belir>
        <Belir gecikme={0.3} as="p" className="mt-4 text-sm text-slate-500">
          Hesap açmadan dene: uydurma bir takım açılır, sekmeyi kapatınca silinir.
        </Belir>
      </div>

      {/* Eğik duran ürün görüntüsü; altında ışık havuzu */}
      <div className="relative mx-auto mt-16 max-w-6xl px-5 [perspective:1600px] sm:mt-20">
        <div className="absolute inset-x-10 top-10 h-full rounded-[2rem] bg-su-500/20 blur-[90px]" aria-hidden="true" />
        <motion.div
          style={{ rotateX: egim, scale: olcek, y: yukari }}
          className="relative origin-top rounded-2xl border border-white/10 bg-white/[.03] p-2 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] backdrop-blur"
        >
          <div className="flex items-center gap-1.5 px-3 pb-2 pt-1" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="ml-3 rounded-md bg-white/5 px-3 py-0.5 font-mono text-[11px] text-slate-500">seyir-takim.vercel.app</span>
          </div>
          <img src={ozetGorseli} alt="Seyir özet ekranı: en yakın son tarih, görev ilerlemesi, kimde ne var ve önümüzdeki 7 gün" className="w-full rounded-xl" width="1280" height="860" />
        </motion.div>
        {/* görüntünün altını zemine eriten geçiş */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-obsidyen to-transparent" aria-hidden="true" />
      </div>
    </section>
  );
}

/* ---------- Sonsuz kayan özellik bandı ---------- */
const BANT = ["Görev panosu", "Resmî tutanak", "PDF ve Word", "Takvime aktar (.ics)", "WhatsApp mesajları", "Yoklama",
  "Faaliyet raporu", "Genel arama", "Çevrimdışı çalışır", "Koyu tema", "Davetle kayıt", "Satır düzeyinde güvenlik"];

export function KayanBant() {
  const ogeler = [...BANT, ...BANT]; // iki kopya: biri bitince diğeri devam eder
  return (
    <div className="relative overflow-hidden border-y border-white/5 py-6 [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]" aria-label="Özellikler">
      <div className="animate-kayan flex w-max gap-10">
        {ogeler.map((oge, i) => (
          <span key={i} aria-hidden={i >= BANT.length} className="flex items-center gap-10 whitespace-nowrap text-sm font-medium text-slate-500">
            {oge}<span className="h-1 w-1 rounded-full bg-su-500/60" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Kendi kendine yazan Ctrl+K arama demosu ---------- */
const ARAMA_SONUCLARI = [
  { tur: "Görev", baslik: "Raporun mekanik tasarım bölümünü yaz", ayrinti: "25 Kasım" },
  { tur: "Son tarih", baslik: "Ön Tasarım Raporu teslimi", ayrinti: "28 Kasım" },
  { tur: "Toplantı", baslik: "Haftalık ekip toplantısı", ayrinti: "Atölye" },
];

function AramaDemosu() {
  const azHareket = useReducedMotion();
  const [yazi, setYazi] = useState(azHareket ? "rapor" : "");
  useEffect(() => {
    if (azHareket) return;
    const kelime = "rapor";
    let i = 0, silinecek = false;
    const zamanlayici = setInterval(() => {
      if (!silinecek) {
        i++; setYazi(kelime.slice(0, i));
        if (i === kelime.length) silinecek = "bekle";
      } else if (silinecek === "bekle") {
        i++; if (i > kelime.length + 14) { silinecek = true; i = kelime.length; }
      } else {
        i--; setYazi(kelime.slice(0, Math.max(0, i)));
        if (i <= 0) { silinecek = false; i = 0; }
      }
    }, 140);
    return () => clearInterval(zamanlayici);
  }, [azHareket]);
  const gorunen = yazi.length >= 3 ? ARAMA_SONUCLARI : [];
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-obsidyen/60 p-3" aria-hidden="true">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-sm">
        <Search size={15} className="text-slate-500" />
        <span className="text-slate-200">{yazi}</span>
        <span className="animate-imlec -ml-1.5 h-4 w-px bg-su-300" />
        <span className="kbd ml-auto">Ctrl K</span>
      </div>
      <ul className="mt-2 min-h-[132px] space-y-1">
        <AnimatePresence>
          {gorunen.map((s, i) => (
            <motion.li key={s.baslik} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: i * 0.07 }} className="flex items-baseline gap-3 rounded-lg px-2 py-1.5 text-sm first:bg-white/[.06]">
              <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-500">{s.tur}</span>
              <span className="truncate text-slate-200">{s.baslik}</span>
              <span className="ml-auto shrink-0 text-xs text-slate-500">{s.ayrinti}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ---------- Bento özellik kartları ---------- */
function KartBasligi({ ikon: Ikon, baslik, metin }) {
  return (
    <div>
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-su-300">
        <Ikon size={19} />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-white">{baslik}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{metin}</p>
    </div>
  );
}

export function Bento() {
  return (
    <section id="ozellikler" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <BolumBasligi
        etiket="Özellikler"
        baslik="Toplantıdan teslime, tek akış."
        aciklama="Kararlar göreve, görevler takvime, takvim telefonuna. Arada kopyala-yapıştır yok."
      />

      <div className="mt-16 grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-4 md:grid-cols-6">
        {/* Görev panosu — büyük */}
        <IsikliKart className="flex flex-col p-7 md:col-span-4 md:row-span-2">
          <KartBasligi ikon={SquareKanban} baslik="Sürükle, bırak, bitir."
            metin="Yapılacak, yapılıyor, bitti. Kartı sürükle; sorumlunun baş harfi, kalan gün ve gecikme bir bakışta." />
          <div className="relative mt-7 flex-1 overflow-hidden rounded-xl border border-white/10">
            <img src={gorevlerGorseli} alt="Görev panosu: bir kart Yapılıyor sütununa sürükleniyor" loading="lazy" className="w-full object-cover object-left-top" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-derin to-transparent" />
          </div>
        </IsikliKart>

        {/* Arama */}
        <IsikliKart className="p-7 md:col-span-2" gecikme={0.08}>
          <KartBasligi ikon={Search} baslik="Her şeyi bul." metin="Ctrl+K: görev, tutanak, kişi. “gorev” yazsan da “görev”i bulur." />
          <AramaDemosu />
        </IsikliKart>

        {/* Tutanak */}
        <IsikliKart className="flex flex-col p-7 md:col-span-2" gecikme={0.16}>
          <KartBasligi ikon={FileText} baslik="İmzaya hazır tutanak." metin="A4, çerçeveli, numaralı. PDF ve Word olarak indir; kararlardan tek tıkla görev." />
          <div className="relative mt-6 h-40 overflow-hidden rounded-xl border border-white/10">
            <img src={tutanakGorseli} alt="Resmî tutanak görünümü ve kararlardan görev oluşturma" loading="lazy" className="w-full object-cover object-top" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-derin to-transparent" />
          </div>
        </IsikliKart>

        {/* Küçük kartlar */}
        <IsikliKart className="p-7 md:col-span-2" gecikme={0.05}>
          <KartBasligi ikon={CalendarPlus} baslik="Takvimine aktar." metin="Toplantı ve son tarihleri tek .ics dosyasıyla Google Takvim'e ya da telefonuna gönder." />
        </IsikliKart>
        <IsikliKart className="p-7 md:col-span-2" gecikme={0.12}>
          <KartBasligi ikon={MessageCircle} baslik="WhatsApp'a hazır." metin="Şablonla kişiye özel mesaj, tek dokunuşla WhatsApp'ta açılır. Kime gönderildiği işaretli kalır." />
        </IsikliKart>
        <IsikliKart className="p-7 md:col-span-2" gecikme={0.19}>
          <KartBasligi ikon={WifiOff} baslik="İnternet yokken de." metin="Ana ekrana eklenir, uygulama gibi açılır. Atölyede çekmese bile son hâli elinde." />
        </IsikliKart>
      </div>
    </section>
  );
}
