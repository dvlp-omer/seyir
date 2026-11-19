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

export const GECIS = 15; // her geçiş 0,5 sn; iki sahne üst üste oynar

export const OZELLIKLER = {
  ozet: { etiket: "Özet", baslik: "Her şey tek bakışta.", aciklama: "En yakın son tarih, ilerleme ve kimde ne olduğu.", gorsel: "ozet.png" },
  pano: { etiket: "Görev panosu", baslik: "Sürükle, bırak, bitir.", aciklama: "Yapılacak, yapılıyor, bitti. Gecikme bir bakışta.", gorsel: "gorevler.png" },
  arama: { etiket: "Genel arama", baslik: "Aradığını anında bul.", aciklama: "Görev, tutanak, toplantı ve kişi; hepsi tek arama kutusunda.", gorsel: "arama.png" },
};

// Fon müziği: araclar/muzik-uret.cjs ile kodla üretildi (telif yok)
export const TanitimVideosu: React.FC = () => (
  <>
  <Audio src={staticFile("muzik.wav")} volume={0.9} />
  <TransitionSeries>
    <TransitionSeries.Sequence name="Açılış" durationInFrames={105}>
      <Acilis />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Sorun" durationInFrames={130}>
      <Sorun />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Özet" durationInFrames={115}>
      <Ozellik {...OZELLIKLER.ozet} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Görev panosu" durationInFrames={115}>
      <Ozellik {...OZELLIKLER.pano} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Tutanak" durationInFrames={160}>
      <Tutanak />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Arama" durationInFrames={115}>
      <Ozellik {...OZELLIKLER.arama} />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: GECIS })} />
    <TransitionSeries.Sequence name="Kapanış" durationInFrames={140}>
      <Kapanis />
    </TransitionSeries.Sequence>
  </TransitionSeries>
  </>
);

// Toplam süre: sahneler toplamı eksi geçişlerin üst üste binen kısmı
export const TOPLAM_KARE = 105 + 130 + 115 + 115 + 160 + 115 + 140 - 6 * GECIS;
