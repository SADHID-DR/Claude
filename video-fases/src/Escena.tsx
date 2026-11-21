import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { EscenaProps } from "./Video";

const tinta = "#f4f1ea";
const acento = "#f2a33a";
const fondo = "#0e1a2b";

export const Escena: React.FC<{
  escena: EscenaProps;
  numero: number;
  total: number;
}> = ({ escena, numero, total }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const u = width / 1080;
  const margen = 80 * u;

  const escala = interpolate(frame, [0, escena.frames], escena.zoom, {
    easing: Easing.inOut(Easing.ease),
    extrapolateRight: "clamp",
  });

  const telon = interpolate(
    frame,
    [0, 20, escena.frames - 25, escena.frames],
    [numero === 1 ? 1 : 0, 0, 0, numero === total ? 1 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const texto = interpolate(
    frame,
    [8, 22, escena.frames - 14, escena.frames - 4],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const entrada = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  const tramo = (escena.frames - fps) / (escena.puntos.length + 1);

  return (
    <AbsoluteFill style={{ backgroundColor: fondo, color: tinta }}>
      {escena.foto ? (
        <Img
          src={escena.foto}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${escala})`,
            transformOrigin: `${escena.foco[0]}% ${escena.foco[1]}%`,
          }}
        />
      ) : null}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(14,26,43,0.35) 0%, rgba(14,26,43,0) 22%, rgba(14,26,43,0) 52%, rgba(14,26,43,0.92) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: `${margen}px ${margen}px ${150 * u}px`,
          fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          opacity: texto,
        }}
      >
        <div
          style={{
            fontSize: 30 * u,
            letterSpacing: 6 * u,
            color: acento,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(numero).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>

        <h1
          style={{
            margin: `${20 * u}px 0 0`,
            fontSize: 104 * u,
            lineHeight: 1.04,
            fontWeight: 700,
            transform: `translateY(${interpolate(entrada, [0, 1], [40 * u, 0])}px)`,
          }}
        >
          {escena.titulo}
        </h1>

        <div
          style={{
            width: interpolate(entrada, [0, 1], [0, 200 * u]),
            height: 8 * u,
            marginTop: 32 * u,
            backgroundColor: acento,
          }}
        />

        {escena.puntos.map((punto, indice) => {
          const aparece = spring({
            frame: frame - Math.round(tramo * (indice + 1)),
            fps,
            config: { damping: 200 },
          });
          return (
            <div
              key={punto}
              style={{
                marginTop: 28 * u,
                fontSize: 46 * u,
                opacity: aparece,
                transform: `translateX(${interpolate(aparece, [0, 1], [-40 * u, 0])}px)`,
              }}
            >
              {punto}
            </div>
          );
        })}
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: fondo, opacity: telon }} />
    </AbsoluteFill>
  );
};
