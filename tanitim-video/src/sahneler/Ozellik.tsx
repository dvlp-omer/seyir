// Özellik sahnesi (3 kez kullanılır): solda başlık, sağda yavaşça yaklaşan ekran görüntüsü.
import { Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { belir, Etiket, Pencere, RENK, Zemin } from "../ortak";

export type OzellikProps = { etiket: string; baslik: string; aciklama: string; gorsel: string };

export const Ozellik: React.FC<OzellikProps> = ({ etiket, baslik, aciklama, gorsel }) => {
  const kare = useCurrentFrame();
  return (
    <Zemin>
      <div style={{ position: "absolute", left: 120, top: 0, bottom: 0, width: 620, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={belir(kare, 4)}><Etiket>{etiket}</Etiket></div>
        <div style={{ marginTop: 34, fontSize: 96, fontWeight: 650, lineHeight: 1.04, letterSpacing: "-.03em", ...belir(kare, 10, 20) }}>{baslik}</div>
        <div style={{ marginTop: 30, fontSize: 44, lineHeight: 1.35, color: RENK.soluk, ...belir(kare, 20, 20) }}>{aciklama}</div>
      </div>
      <div
        style={{
          position: "absolute", left: 790, top: 175,
          translate: interpolate(kare, [0, 26], ["220px 0px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }),
          opacity: interpolate(kare, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          scale: interpolate(kare, [0, 120], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          rotate: interpolate(kare, [0, 26], ["-4deg", "0deg"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }),
          transformOrigin: "left center",
        }}
      >
        <Pencere src={staticFile(gorsel)} genislik={1040} />
      </div>
    </Zemin>
  );
};
