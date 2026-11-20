// 1. sahne: logo büyüyerek gelir, "SEYİR" ve slogan belirir.
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { belir, Logo, RENK, Zemin } from "../ortak";
import { Dil, METIN } from "../metinler";

export const Acilis: React.FC<{ dil?: Dil }> = ({ dil = "tr" }) => {
  const m = METIN[dil];
  const kare = useCurrentFrame();
  return (
    <Zemin>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            scale: interpolate(kare, [0, 28], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 14 }) }),
            opacity: interpolate(kare, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            filter: "drop-shadow(0 0 60px rgba(91,124,250,.55))",
          }}
        >
          <Logo boyut={300} />
        </div>
        <div style={{ marginTop: 40, fontSize: 170, fontWeight: 700, letterSpacing: ".06em", lineHeight: 1, ...belir(kare, 16, 20) }}>SEYİR</div>
        <div style={{ marginTop: 28, fontSize: 56, color: RENK.soluk, ...belir(kare, 30, 20) }}>
          {m.slogan[0]} <span style={{ color: RENK.suAcik }}>{m.slogan[1]}</span>
        </div>
      </div>
    </Zemin>
  );
};
