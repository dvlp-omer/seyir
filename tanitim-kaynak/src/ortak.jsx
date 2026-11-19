// Ortak küçük bileşenler: logo, kaydırınca belirme, ışıklı cam kart, sayaç, bölüm başlığı.
import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate, useReducedMotion } from "framer-motion";

// Uygulamanın kendi adresleri (tanıtım /tanitim/ altında, uygulama kökte)
export const UYGULAMA = "/";
export const KAYNAK_KOD = "https://github.com/dvlp-omer/seyir";

// Logo: gemi dümeni (uygulamadaki ikonla aynı çizim)
export function Logo({ boyut = 28 }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 40 40" aria-hidden="true">
      <g stroke="#cfe3e8" strokeLinecap="round" fill="none">
        <path strokeWidth="2.4" d="M20 5v30M5 20h30M9.4 9.4l21.2 21.2M30.6 9.4L9.4 30.6" />
        <circle cx="20" cy="20" r="10.5" strokeWidth="2.8" />
      </g>
      <circle cx="20" cy="20" r="4.2" fill="#ee6a2f" />
      <circle cx="20" cy="20" r="1.5" fill="#05070a" />
    </svg>
  );
}

// Kaydırınca aşağıdan yukarı belirir. "gecikme" ile sıralı (staggered) giriş yapılır.
export function Belir({ children, gecikme = 0, y = 24, className = "", as = "div" }) {
  const Etiket = motion[as];
  return (
    <Etiket
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: gecikme, ease: [0.21, 0.6, 0.35, 1] }}
    >
      {children}
    </Etiket>
  );
}

// Cam kart; fare üstündeyken ışık fareyi izler (CSS değişkenleri --x / --y, stil.css > .cam)
export function IsikliKart({ children, className = "", gecikme = 0 }) {
  const ref = useRef(null);
  const izle = (olay) => {
    const kutu = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--x", olay.clientX - kutu.left + "px");
    ref.current.style.setProperty("--y", olay.clientY - kutu.top + "px");
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={izle}
      className={"cam " + className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: gecikme, ease: [0.21, 0.6, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Görünür olunca 0'dan hedefe sayar
export function Sayac({ hedef, sonek = "" }) {
  const ref = useRef(null);
  const gorundu = useInView(ref, { once: true, margin: "-40px" });
  const azHareket = useReducedMotion();
  const [deger, setDeger] = useState(0);
  useEffect(() => {
    if (!gorundu) return;
    if (azHareket) return setDeger(hedef);
    const kontrol = animate(0, hedef, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setDeger(Math.round(v)) });
    return () => kontrol.stop();
  }, [gorundu, hedef, azHareket]);
  return <span ref={ref}>{deger.toLocaleString("tr-TR")}{sonek}</span>;
}

// Bölüm başlığı: küçük etiket + büyük başlık + açıklama
export function BolumBasligi({ etiket, baslik, aciklama, ortali = true }) {
  return (
    <div className={(ortali ? "mx-auto text-center " : "") + "max-w-3xl"}>
      <Belir>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-su-300">
          {etiket}
        </span>
      </Belir>
      <Belir gecikme={0.08} as="h2" className="parlak-metin mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        {baslik}
      </Belir>
      {aciklama && (
        <Belir gecikme={0.16} as="p" className="mt-5 text-base leading-relaxed text-slate-400 sm:text-lg">
          {aciklama}
        </Belir>
      )}
    </div>
  );
}
