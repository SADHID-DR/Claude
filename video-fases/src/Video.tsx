import { Audio } from "@remotion/media";
import { AbsoluteFill, Series } from "remotion";
import { Escena } from "./Escena";

export type EscenaProps = {
  id: string;
  titulo: string;
  narracion: string;
  puntos: string[];
  audio: string | null;
  frames: number;
};

export type VideoProps = {
  escenas: EscenaProps[];
};

export const Video: React.FC<VideoProps> = ({ escenas }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1a2b" }}>
      <Series>
        {escenas.map((escena, indice) => (
          <Series.Sequence key={escena.id} durationInFrames={escena.frames}>
            <Escena
              escena={escena}
              numero={indice + 1}
              total={escenas.length}
            />
            {escena.audio ? <Audio src={escena.audio} /> : null}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
