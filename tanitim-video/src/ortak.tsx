// Videonun ortak parçaları: renkler, yazı tipi, kareye bağlı canlı logo, giriş animasyonu.
// Renkler tanıtım sayfasıyla aynı (tanitim-kaynak/tailwind.config.js, ikonlar/logo.svg).
import { loadFont } from "@remotion/fonts";
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

export const RENK = {
  zemin: "#05070a",
  yazi: "#f1f7f9",
  soluk: "#94a3b8",
  su: "#5fd3e0",
  suAcik: "#8be3ee",
  mor: "#a65cf6",
  mavi: "#5b7cfa",
  turuncu: "#ff8a52",
};

export const YAZI_TIPI = "Geist";
loadFont({ family: YAZI_TIPI, url: staticFile("Geist-Variable.woff2"), weight: "100 900" });

const yumusak = Easing.bezier(0.16, 1, 0.3, 1);

// Belirli bir kareden başlayarak aşağıdan yukarı, bulanıktan nete belirme
export const belir = (kare: number, bas: number, sure = 18) => ({
  opacity: interpolate(kare, [bas, bas + sure], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: yumusak }),
  translate: interpolate(kare, [bas, bas + sure], ["0px 40px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: yumusak }),
  filter: `blur(${interpolate(kare, [bas, bas + sure], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
});

// Arka plan: koyu zemin, ince ızgara ve yavaşça kayan renkli ışık lekeleri
export const Zemin: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const kare = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: RENK.zemin, fontFamily: YAZI_TIPI, color: RENK.yazi, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 75%)",
        }}
      />
      <div style={{ position: "absolute", width: 1100, height: 700, left: 420, top: -320, borderRadius: "50%", background: "rgba(29,143,160,.32)", filter: "blur(140px)", translate: `${Math.sin(kare / 40) * 60}px 0px` }} />
      <div style={{ position: "absolute", width: 700, height: 500, right: -200, top: 300, borderRadius: "50%", background: "rgba(91,124,250,.22)", filter: "blur(140px)", translate: `0px ${Math.cos(kare / 50) * 50}px` }} />
      <div style={{ position: "absolute", width: 600, height: 400, left: -200, bottom: -100, borderRadius: "50%", background: "rgba(166,92,246,.16)", filter: "blur(130px)" }} />
      {children}
    </AbsoluteFill>
  );
};

// Logo (ikonlar/logo.svg). Hareket kareye bağlı: halkada ışık döner, iğne belirir,
// yörünge şeridi salınır, parçacıklar yanıp söner. Döngü 120 kare (4 sn).
const PARCACIKLAR: [number, number, number][] = [[6, 40, .7], [9, 46, .5], [13, 51, .8], [4, 33, .5], [55, 20, .6], [58, 27, .5], [51, 14, .7], [24, 59, .5]];

export const Logo: React.FC<{ boyut: number; bas?: number }> = ({ boyut, bas = 0 }) => {
  const kare = useCurrentFrame() - bas;
  const d = ((kare % 120) + 120) % 120; // döngü içindeki kare
  const salinim = interpolate(d, [60, 85, 110], [0, 22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const igne = interpolate(d, [35, 50, 70, 85], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const seritSonuk = interpolate(d, [35, 50, 70, 85], [1, 0.35, 0.35, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 64 64">
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
      <g transform={`rotate(${salinim} 32 32)`}>
        <g transform="rotate(-45 32 32) translate(32 32)">
          <path d="M28 0A28 8 0 0 1-28 0" fill="none" stroke="url(#sy-y)" strokeWidth="1.4" opacity=".55" />
        </g>
      </g>
      <circle cx="32" cy="32" r="18.5" fill="url(#sy-c)" stroke="url(#sy-a)" strokeWidth="3.4" />
      <circle cx="32" cy="32" r="12.5" fill="none" stroke="url(#sy-a)" strokeWidth="1" opacity=".6" />
      <circle cx="32" cy="32" r="18.5" pathLength={100} fill="none" stroke="#d9fbff" strokeWidth="2.2" strokeLinecap="round"
        strokeDasharray="20 80" strokeDashoffset={-(kare * 100) / 90} opacity={0.85} />
      <g opacity={igne} transform={`rotate(${(1 - igne) * -40} 32 32)`}>
        <path d="M41 23l-7.2 10.6-3.6-3.6z" fill="#7cf0f7" />
        <path d="M23 41l7.2-10.6 3.6 3.6z" fill="#a65cf6" />
        <circle cx="32" cy="32" r="1.6" fill="#e9fcff" />
      </g>
      <g strokeLinecap="round">
        <path d="M10.5 10.5l11 11" stroke="#5ee6f2" strokeWidth="1.2" />
        <path d="M42.5 42.5l11 11" stroke="#a65cf6" strokeWidth="1.2" />
      </g>
      <g fill="#5ee6f2"><circle cx="10.5" cy="10.5" r="1.7" /><circle cx="17" cy="17" r="2" /><circle cx="21.5" cy="21.5" r="1.2" /></g>
      <g fill="#a65cf6"><circle cx="53.5" cy="53.5" r="1.7" /><circle cx="47" cy="47" r="2" /><circle cx="42.5" cy="42.5" r="1.2" /></g>
      <g fill="#9be9f4">
        {PARCACIKLAR.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={0.5 + 0.5 * Math.sin((kare + i * 11) / 7)} />
        ))}
      </g>
      <g transform={`rotate(${salinim} 32 32)`} opacity={seritSonuk}>
        <g transform="rotate(-45 32 32) translate(32 32)">
          <path d="M-29 0A29 10.5 0 0 1 29 0A29 6 0 0 0-29 0z" fill="#0c0f26" opacity=".8" transform="translate(0 -1)" />
          <path d="M-29 0A29 10 0 0 1 29 0A29 6.5 0 0 0-29 0z" fill="url(#sy-y)" />
        </g>
      </g>
    </svg>
  );
};

// Küçük etiket rozeti (bölüm başlığının üstündeki)
export const Etiket: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: "inline-block", padding: "10px 24px", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: RENK.suAcik, fontSize: 30, fontWeight: 500, letterSpacing: ".02em", ...style }}>
    {children}
  </div>
);

// Ekran görüntüsü çerçevesi (tarayıcı penceresi gibi)
export const Pencere: React.FC<{ src: string; genislik: number; style?: React.CSSProperties }> = ({ src, genislik, style }) => (
  <div style={{ width: genislik, borderRadius: 22, padding: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", boxShadow: "0 50px 140px -30px rgba(0,0,0,.9), 0 0 120px -40px rgba(95,211,224,.35)", ...style }}>
    <div style={{ display: "flex", gap: 8, padding: "4px 8px 12px" }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 13, height: 13, borderRadius: 99, background: "rgba(255,255,255,.16)" }} />)}
    </div>
    <Img src={src} style={{ width: "100%", display: "block", borderRadius: 14 }} />
  </div>
);
