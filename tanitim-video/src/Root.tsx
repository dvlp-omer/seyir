// Kompozisyonlar: ana video ve tek tek önizlenebilen sahneler (Studio'da ayrı zaman çizelgesi)
import { Composition, Folder } from "remotion";
import { Acilis } from "./sahneler/Acilis";
import { Kapanis } from "./sahneler/Kapanis";
import { Ozellik } from "./sahneler/Ozellik";
import { Sorun } from "./sahneler/Sorun";
import { Tutanak } from "./sahneler/Tutanak";
import { OZELLIKLER, TanitimVideosu, TOPLAM_KARE } from "./TanitimVideosu";

const ORTAK = { width: 1920, height: 1080, fps: 30 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SeyirTanitim" component={TanitimVideosu} durationInFrames={TOPLAM_KARE} {...ORTAK} />
    <Folder name="Sahneler">
      <Composition id="Acilis" component={Acilis} durationInFrames={105} {...ORTAK} />
      <Composition id="Sorun" component={Sorun} durationInFrames={130} {...ORTAK} />
      <Composition id="Ozellik" component={Ozellik} durationInFrames={115} defaultProps={OZELLIKLER.ozet} {...ORTAK} />
      <Composition id="Tutanak" component={Tutanak} durationInFrames={160} {...ORTAK} />
      <Composition id="Kapanis" component={Kapanis} durationInFrames={140} {...ORTAK} />
    </Folder>
  </>
);
