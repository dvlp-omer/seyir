// Ortak küçük bileşenler: logo, kaydırınca belirme, ışıklı cam kart, sayaç, bölüm başlığı.
import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate, useReducedMotion } from "framer-motion";

// Adresler: tanıtım ana sayfada (/), uygulama /uygulama adresinde
export const UYGULAMA = "/uygulama";
// Örnek mod: giriş yok, uydurma takım sekmede açılır (js/kolaylik.js > ornekModuMu)
export const ORNEK = "/uygulama?ornek=1";
export const KAYNAK_KOD = "https://github.com/dvlp-omer/seyir";
export const LISANS = KAYNAK_KOD + "/blob/main/LICENSE.md";

// Logo: pusula yıldızı, küre ve önünden geçen yörünge şeridi (ikonlar/logo.svg ile aynı çizim).
// canli: Ömer'in logo GIF'indeki hareketin kodla yapılmış hâli (6 sn'lik döngü, stil.css > .logo-canli):
// halkada ışık döner, yörünge şeridi parlar ve salınır, şerit sönerken kürede pusula iğnesi belirir,
// etrafta parçacıklar yanıp söner. "Hareketi azalt" açıksa logo durağan kalır.
// Aynı kimlikli gradyanlar sayfada birden çok kez olsa da çizim aynı olduğu için sorun olmaz.
const PARCACIKLAR = [[6, 40, .7], [9, 46, .5], [13, 51, .8], [4, 33, .5], [55, 20, .6], [58, 27, .5], [51, 14, .7], [24, 59, .5]];
export function Logo({ boyut = 28, canli = false }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 64 64" aria-hidden="true" className={canli ? "logo-canli" : undefined}>
      <defs>
        <linearGradient id="sy-a" x1="10" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5ee6f2" /><stop offset=".5" stopColor="#5b7cfa" /><stop offset="1" stopColor="#a65cf6" />
        </linearGradient>
        <linearGradient id="sy-y" x1="-28" y1="0" x2="28" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5b7cfa" /><stop offset=".5" stopColor="#4fd8ec" /><stop offset="1" stopColor="#c4f3fa" />
        </linearGradient>
        <radialGradient id="sy-c" cx="40" cy="25" r="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2c4590" /><stop offset=".55" stopColor="#18205a" /><stop offset="1" stopColor="#0c0f26" />
        </radialGradient>
      </defs>
      <path fill="url(#sy-a)" d="M32 1.5l5.6 23.2L62.5 32l-24.9 7.3L32 62.5l-5.6-23.2L1.5 32l24.9-7.3z" />
      <g className="logo-salin"><g transform="rotate(-45 32 32) translate(32 32)">
        <path d="M28 0A28 8 0 0 1-28 0" fill="none" stroke="url(#sy-y)" strokeWidth="1.4" opacity=".55" />
      </g></g>
      <circle cx="32" cy="32" r="18.5" fill="url(#sy-c)" stroke="url(#sy-a)" strokeWidth="3.4" />
      <circle cx="32" cy="32" r="12.5" fill="none" stroke="url(#sy-a)" strokeWidth="1" opacity=".6" />
      {canli && (
        <>
          <circle className="logo-halka-isik" cx="32" cy="32" r="18.5" pathLength="100" fill="none" stroke="#d9fbff" strokeWidth="2.2" strokeLinecap="round" />
          <g className="logo-igne">
            <path d="M41 23l-7.2 10.6-3.6-3.6z" fill="#7cf0f7" />
            <path d="M23 41l7.2-10.6 3.6 3.6z" fill="#a65cf6" />
            <circle cx="32" cy="32" r="1.6" fill="#e9fcff" />
          </g>
          <g className="logo-parcaciklar" fill="#9be9f4">
            {PARCACIKLAR.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} style={{ animationDelay: (i * 0.37).toFixed(2) + "s" }} />)}
          </g>
        </>
      )}
      <g strokeLinecap="round">
        <path d="M10.5 10.5l11 11" stroke="#5ee6f2" strokeWidth="1.2" />
        <path d="M42.5 42.5l11 11" stroke="#a65cf6" strokeWidth="1.2" />
      </g>
      <g fill="#5ee6f2" className="logo-nokta"><circle cx="10.5" cy="10.5" r="1.7" /><circle cx="17" cy="17" r="2" /><circle cx="21.5" cy="21.5" r="1.2" /></g>
      <g fill="#a65cf6" className="logo-nokta"><circle cx="53.5" cy="53.5" r="1.7" /><circle cx="47" cy="47" r="2" /><circle cx="42.5" cy="42.5" r="1.2" /></g>
      <g className="logo-salin"><g className="logo-serit" transform="rotate(-45 32 32) translate(32 32)">
        <path d="M-29 0A29 10.5 0 0 1 29 0A29 6 0 0 0-29 0z" fill="#0c0f26" opacity=".8" transform="translate(0 -1)" />
        <path d="M-29 0A29 10 0 0 1 29 0A29 6.5 0 0 0-29 0z" fill="url(#sy-y)" />
        {canli && <path className="logo-isik" d="M-28.5 -.6A29 9.4 0 0 1 28.5 -.6" pathLength="100" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />}
      </g></g>
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
