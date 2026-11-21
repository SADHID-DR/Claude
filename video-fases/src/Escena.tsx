import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { EscenaProps } from "./Video";

const tinta = "#f4f1ea";
const acento = "#f2a33a";
const fondo = "#0e1a2b";
const fuente = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const rampa = (frame: number, inicio: number, largo: number) =>
  interpolate(frame, [inicio, inicio + largo], [0, 1], {
    easing: Easing.out(Easing.poly(5)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Palabras: React.FC<{
  texto: string;
  inicio: number;
  paso: number;
  largo: number;
  desenfoque: number;
}> = ({ texto, inicio, paso, largo, desenfoque }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {texto.split(" ").map((palabra, indice) => {
        const p = rampa(frame, inicio + indice * paso, largo);
        return (
          <span
            key={palabra + indice}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 0.38}em)`,
              filter: `blur(${(1 - p) * desenfoque}px)`,
            }}
          >
            {palabra}
          </span>
        );
      })}
    </>
  );
};

export const Escena: React.FC<{
  escena: EscenaProps;
  numero: number;
  total: number;
}> = ({ escena, numero, total }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const u = width / 1080;
  const margen = 80 * u;
  const palabras = escena.titulo.split(" ").length;

  const escala = interpolate(frame, [0, escena.frames], escena.zoom, {
    easing: Easing.inOut(Easing.sin),
    extrapolateRight: "clamp",
  });

  const telon = interpolate(
    frame,
    [0, 20, escena.frames - 25, escena.frames],
    [numero === 1 ? 1 : 0, 0, 0, numero === total ? 1 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const salida = escena.cartel
    ? 1
    : interpolate(frame, [escena.frames - 14, escena.frames - 4], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const velo = escena.cartel ? rampa(frame, 0, 30) * 0.62 : 0;
  const inicio = escena.cartel ? 14 : 10;
  const paso = escena.cartel ? 6 : 4;
  const largo = escena.cartel ? 26 : 22;
  const barra = rampa(frame, inicio + palabras * paso + 8, 24);

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
      <AbsoluteFill style={{ backgroundColor: fondo, opacity: velo }} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: escena.cartel ? "center" : "flex-start",
          textAlign: escena.cartel ? "center" : "left",
          padding: `${margen}px ${margen}px ${(escena.cartel ? 260 : 150) * u}px`,
          fontFamily: fuente,
          opacity: salida,
        }}
      >
        {escena.cartel ? null : (
          <div
            style={{
              fontSize: 30 * u,
              letterSpacing: 6 * u,
              color: acento,
              fontVariantNumeric: "tabular-nums",
              opacity: rampa(frame, 6, 18),
            }}
          >
            {String(numero).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>
        )}

        <h1
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: escena.cartel ? "center" : "flex-start",
            gap: `0 0.26em`,
            margin: `${20 * u}px 0 0`,
            fontSize: (escena.cartel ? 168 : 104) * u,
            lineHeight: 1.04,
            fontWeight: escena.cartel ? 800 : 700,
          }}
        >
          <Palabras
            texto={escena.titulo}
            inicio={inicio}
            paso={paso}
            largo={largo}
            desenfoque={(escena.cartel ? 26 : 18) * u}
          />
        </h1>

        <div
          style={{
            width: barra * (escena.cartel ? 320 : 200) * u,
            height: (escena.cartel ? 10 : 8) * u,
            marginTop: (escena.cartel ? 48 : 32) * u,
            backgroundColor: acento,
          }}
        />

        {escena.puntos.map((punto, indice) => {
          const p = rampa(frame, inicio + 34 + indice * 14, 20);
          return (
            <div
              key={punto}
              style={{
                marginTop: 28 * u,
                fontSize: 46 * u,
                opacity: p,
                transform: `translateY(${(1 - p) * 26 * u}px)`,
                filter: `blur(${(1 - p) * 9 * u}px)`,
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
