import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Series, useVideoConfig } from "remotion";
import { Escena } from "./Escena";

export type EscenaProps = {
  id: string;
  titulo: string;
  puntos: string[];
  foto: string | null;
  foco: number[];
  zoom: number[];
  cartel: boolean;
  audio: string | null;
  frames: number;
};

export type VideoProps = {
  escenas: EscenaProps[];
  musica: string | null;
};

export const Video: React.FC<VideoProps> = ({ escenas, musica }) => {
  const { durationInFrames } = useVideoConfig();
  const narrado = escenas
    .filter((escena) => escena.audio !== null)
    .reduce((suma, escena) => suma + escena.frames, 0);
  const subida = narrado > 0 ? narrado : durationInFrames;

  const volumen = (frame: number) => {
    const nivel = interpolate(frame, [subida - 10, subida + 25], [0.3, 0.85], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const borde = interpolate(
      frame,
      [0, 30, durationInFrames - 40, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return nivel * borde;
  };

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
      {musica ? <Audio src={musica} loop volume={volumen} /> : null}
    </AbsoluteFill>
  );
};
