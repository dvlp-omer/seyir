// Tutanak sahnesi: solda dağınık notlar, ok, sağda kendiliğinden dolan form.
import { Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { belir, Etiket, Pencere, RENK, Zemin } from "../ortak";
import { Dil, METIN } from "../metinler";

export const Tutanak: React.FC<{ dil?: Dil }> = ({ dil = "tr" }) => {
  const m = METIN[dil].tutanak;
  const kare = useCurrentFrame();
  const sagGelis = interpolate(kare, [40, 64], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <Zemin>
      <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center" }}>
        <div style={belir(kare, 2)}><Etiket>{m.etiket}</Etiket></div>
        <div style={{ marginTop: 26, fontSize: 92, fontWeight: 650, letterSpacing: "-.03em", ...belir(kare, 8, 20) }}>
          {m.baslik[0]}<span style={{ color: RENK.suAcik }}>{m.baslik[1]}</span>
        </div>
      </div>
      {/* Sol: notlar */}
      <div style={{ position: "absolute", left: 130, top: 400, ...belir(kare, 18, 20) }}>
        <div style={{ fontSize: 32, color: RENK.soluk, marginBottom: 16 }}>{m.sol}</div>
        <Pencere src={staticFile("tutanak-notlar.png")} genislik={760} />
      </div>
      {/* Ok */}
      <div style={{ position: "absolute", left: 915, top: 560, fontSize: 90, color: RENK.su,
        opacity: interpolate(kare, [34, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: interpolate(kare, [34, 50], ["-30px 0px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>→</div>
      {/* Sağ: dolan form (aşağı doğru kayarak tamamı görünür) */}
      <div style={{ position: "absolute", left: 1030, top: 340, width: 780, height: 700, overflow: "hidden", borderRadius: 24,
        opacity: sagGelis, translate: `${(1 - sagGelis) * 80}px 0px` }}>
        <div style={{ fontSize: 32, color: RENK.soluk, marginBottom: 16, marginTop: 60 }}>{m.sag}</div>
        <div style={{ translate: interpolate(kare, [80, 140], ["0px 0px", "0px -170px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) }}>
          <Pencere src={staticFile("tutanak-yerlesti.png")} genislik={760} />
        </div>
      </div>
    </Zemin>
  );
};
