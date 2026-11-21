import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import guion from "./guion.json";
import { existe, medirAudio } from "./duracion";
import { Video, VideoProps } from "./Video";

const fps = 30;
const respiro = 15;
const palabrasPorSegundo = 2.5;

const calculateMetadata: CalculateMetadataFunction<VideoProps> = async () => {
  const escenas = await Promise.all(
    guion.escenas.map(async (escena) => {
      const audio = staticFile(`audio/${escena.id}.mp3`);
      const foto = staticFile(escena.foto);
      const medido = await medirAudio(audio);
      const estimado =
        escena.narracion.trim().split(/\s+/).length / palabrasPorSegundo;
      return {
        id: escena.id,
        titulo: escena.titulo,
        puntos: escena.puntos as string[],
        foco: escena.foco,
        zoom: escena.zoom,
        foto: (await existe(foto)) ? foto : null,
        audio: medido === null ? null : audio,
        frames: Math.ceil((medido ?? estimado) * fps) + respiro,
      };
    }),
  );

  return {
    width: guion.ancho,
    height: guion.alto,
    durationInFrames: escenas.reduce((suma, escena) => suma + escena.frames, 0),
    props: { escenas },
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Video"
      component={Video}
      durationInFrames={300}
      fps={fps}
      width={guion.ancho}
      height={guion.alto}
      defaultProps={{ escenas: [] }}
      calculateMetadata={calculateMetadata}
    />
  );
};
