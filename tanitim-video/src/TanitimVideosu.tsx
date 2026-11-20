// Seyir tanıtım videosu (~26 sn, 1920x1080, 30 kare/sn). Sahneler arası yumuşak geçiş.
// Görseller uydurma örnek veriyle çekilmiş ekran görüntüleri (public/).
import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { staticFile } from "remotion";
import { fade } from "@remotion/transitions/fade";
import { Acilis } from "./sahneler/Acilis";
import { Kapanis } from "./sahneler/Kapanis";
import { Ozellik } from "./sahneler/Ozellik";
import { Sorun } from "./sahneler/Sorun";
import { Tutanak } from "./sahneler/Tutanak";
import { Dil, METIN } from "./metinler";

export const GECIS = 15; // her geçiş 0,5 sn; iki sahne üst üste oynar

export const OZELLIKLER = METIN.tr.ozellikler; // sahne önizlemesi için (Root.tsx)

// Fon müziği: araclar/muzik-uret.cjs ile kodla üretildi (telif yok)
export const TanitimVideosu: React.FC<{ dil: Dil }> = ({ dil }) => {
  const oz = METIN[dil].ozellikler;
  return (
  <>
  <Audio src={staticFile("muzik.wav")} volume={0.9} />
  <TransitionSeries>
    <TransitionSeries.Sequence name="Açılış" durationInFrames={105}>
      <Acilis dil={dil} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Sorun" durationInFrames={130}>
      <Sorun dil={dil} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Özet" durationInFrames={115}>
      <Ozellik {...oz.ozet} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Görev panosu" durationInFrames={115}>
      <Ozellik {...oz.pano} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Tutanak" durationInFrames={160}>
      <Tutanak dil={dil} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Arama" durationInFrames={115}>
      <Ozellik {...oz.arama} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Kapanış" durationInFrames={140}>
      <Kapanis dil={dil} />
    </TransitionSeries.Sequence>
  </TransitionSeries>
  </>
  );
};

// Toplam süre: sahneler toplamı eksi geçişlerin üst üste binen kısmı
export const TOPLAM_KARE = 105 + 130 + 115 + 115 + 160 + 115 + 140 - 6 * GECIS;
