import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { EscenaProps } from "./Video";

const tinta = "#f4f1ea";
const acento = "#f2a33a";
const tenue = "rgba(244, 241, 234, 0.55)";

export const Escena: React.FC<{
  escena: EscenaProps;
  numero: number;
  total: number;
}> = ({ escena, numero, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacidad = interpolate(
    frame,
    [0, 10, escena.frames - 10, escena.frames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const entradaTitulo = spring({ frame, fps, config: { damping: 200 } });
  const tramo = (escena.frames - fps) / (escena.puntos.length + 1);
  const avance = interpolate(frame, [0, escena.frames], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: opacidad,
        padding: "120px 140px",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: tinta,
      }}
    >
      <div
        style={{
          fontSize: 30,
          letterSpacing: 6,
          color: acento,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(numero).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>

      <h1
        style={{
          margin: "28px 0 0",
          fontSize: 96,
          lineHeight: 1.05,
          fontWeight: 700,
          maxWidth: 1400,
          opacity: entradaTitulo,
          transform: `translateY(${interpolate(entradaTitulo, [0, 1], [40, 0])}px)`,
        }}
      >
        {escena.titulo}
      </h1>

      <div
        style={{
          width: interpolate(entradaTitulo, [0, 1], [0, 220]),
          height: 8,
          marginTop: 40,
          backgroundColor: acento,
        }}
      />

      <div
        style={{
          marginTop: 64,
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >
        {escena.puntos.map((punto, indice) => {
          const entrada = spring({
            frame: frame - Math.round(tramo * (indice + 1)),
            fps,
            config: { damping: 200 },
          });
          return (
            <div
              key={punto}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                fontSize: 52,
                opacity: entrada,
                transform: `translateX(${interpolate(entrada, [0, 1], [-50, 0])}px)`,
              }}
            >
              <div style={{ width: 18, height: 18, backgroundColor: acento }} />
              {punto}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 140,
          right: 140,
          bottom: 90,
          height: 4,
          backgroundColor: tenue,
        }}
      >
        <div
          style={{ width: `${avance}%`, height: 4, backgroundColor: acento }}
        />
      </div>
    </AbsoluteFill>
  );
};
