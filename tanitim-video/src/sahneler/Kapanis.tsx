// Son sahne: logo, adres, "Ücretsiz · Açık kaynak", deneme çağrısı.
import { interpolate, useCurrentFrame } from "remotion";
import { belir, Logo, RENK, Zemin } from "../ortak";
import { Dil, METIN } from "../metinler";

export const Kapanis: React.FC<{ dil?: Dil }> = ({ dil = "tr" }) => {
  const m = METIN[dil].kapanis;
  const kare = useCurrentFrame();
  return (
    <Zemin>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36, ...belir(kare, 0, 20) }}>
          <div style={{ filter: "drop-shadow(0 0 40px rgba(91,124,250,.5))" }}><Logo boyut={170} /></div>
          <div style={{ fontSize: 140, fontWeight: 700, letterSpacing: ".06em" }}>SEYİR</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 56, color: RENK.soluk, ...belir(kare, 12, 20) }}>{m.alt}</div>
        <div
          style={{
            marginTop: 70, padding: "30px 60px", borderRadius: 999, fontSize: 52, fontWeight: 600, color: "#05070a",
            background: "linear-gradient(90deg, #8be3ee, #5fd3e0)", boxShadow: "0 0 80px -10px rgba(95,211,224,.7)",
            ...belir(kare, 26, 20),
            scale: interpolate(kare, [60, 75, 90], [1, 1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {m.dugme}
        </div>
        <div style={{ marginTop: 44, fontSize: 50, fontFamily: "monospace", color: RENK.suAcik, ...belir(kare, 36, 20) }}>{m.adres}</div>
      </div>
    </Zemin>
  );
};
