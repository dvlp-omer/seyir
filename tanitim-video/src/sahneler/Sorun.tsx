// 2. sahne: sohbet balonlarında dağınık sorular; sonra dağılır ve cevap gelir.
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { belir, RENK, Zemin } from "../ortak";
import { Dil, METIN } from "../metinler";

const YERLER = [
  { x: 260, y: 230, gecikme: 4 },
  { x: 900, y: 380, gecikme: 14 },
  { x: 380, y: 540, gecikme: 24 },
];

export const Sorun: React.FC<{ dil?: Dil }> = ({ dil = "tr" }) => {
  const m = METIN[dil];
  const BALONLAR = YERLER.map((y, i) => ({ ...y, metin: m.sorular[i] }));
  const kare = useCurrentFrame();
  const dagil = interpolate(kare, [62, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  return (
    <Zemin>
      {BALONLAR.map((b, i) => (
        <div
          key={b.metin}
          style={{
            position: "absolute", left: b.x, top: b.y, padding: "26px 36px", borderRadius: "30px 30px 30px 8px",
            background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", fontSize: 54, color: "#e2e8f0",
            opacity: interpolate(kare, [b.gecikme, b.gecikme + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (1 - dagil),
            scale: interpolate(kare, [b.gecikme, b.gecikme + 14], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 12 }) }),
            translate: `${dagil * (i - 1) * 160}px ${dagil * -60}px`,
            filter: `blur(${dagil * 14}px)`,
          }}
        >
          {b.metin}
        </div>
      ))}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 118, fontWeight: 650, letterSpacing: "-.03em", ...belir(kare, 76, 20) }}>{m.tekYer}</div>
        <div style={{ marginTop: 26, fontSize: 52, color: RENK.soluk, ...belir(kare, 88, 20) }}>{m.tekYerAlt}</div>
      </div>
    </Zemin>
  );
};
