#!/usr/bin/env python3
"""
Genera frames intermedios encadenados con Nano Banana (Gemini image).

Regla clave: cada frame se genera EDITANDO EL ANTERIOR, nunca desde cero.
Esto evita la deriva de cámara/luz que hace saltar el video al concatenar.
"""
import argparse
import os
import sys
from pathlib import Path

from google import genai
from google.genai import types

ANCLA = (
    "Mantén exactamente el mismo ángulo de cámara, el mismo encuadre, "
    "la misma altura del horizonte y las mismas condiciones de iluminación "
    "que la imagen de referencia. No muevas la cámara. No cambies la "
    "perspectiva ni las proporciones del espacio. Fotorrealista."
)


def editar(client, imagen_bytes, mime, instruccion, modelo):
    resp = client.models.generate_content(
        model=modelo,
        contents=[
            types.Part.from_bytes(data=imagen_bytes, mime_type=mime),
            f"{instruccion}\n\n{ANCLA}",
        ],
    )
    for part in resp.candidates[0].content.parts:
        if getattr(part, "inline_data", None):
            return part.inline_data.data
    raise RuntimeError("La respuesta no contiene imagen. Texto devuelto: "
                       f"{getattr(resp, 'text', '(sin texto)')}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--inicial", required=True)
    p.add_argument("--final", required=True)
    p.add_argument("--fases", required=True,
                   help="Lista separada por comas, en orden constructivo")
    p.add_argument("--salida", default="frames")
    p.add_argument("--modelo", default="gemini-2.5-flash-image")
    args = p.parse_args()

    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("Falta GEMINI_API_KEY en el entorno.")

    fases = [f.strip() for f in args.fases.split(",") if f.strip()]
    if not fases:
        sys.exit("No se indicaron fases.")

    out = Path(args.salida)
    out.mkdir(parents=True, exist_ok=True)
    client = genai.Client()

    inicial = Path(args.inicial)
    mime = "image/png" if inicial.suffix.lower() == ".png" else "image/jpeg"
    actual = inicial.read_bytes()

    # F0 = imagen inicial tal cual
    (out / "frame_00.jpg").write_bytes(actual)
    print("frame_00.jpg  (inicial, sin modificar)")

    # Las fases intermedias se generan encadenadas.
    # La ultima fase NO se genera: se usa la imagen final real del usuario.
    for i, fase in enumerate(fases[:-1], start=1):
        instruccion = (
            f"Modifica esta imagen aplicando unicamente el siguiente cambio "
            f"constructivo: {fase}. No agregues ningun otro elemento ni "
            f"adelantes fases posteriores."
        )
        print(f"Generando frame_{i:02d} -> {fase} ...")
        actual = editar(client, actual, mime, instruccion, args.modelo)
        (out / f"frame_{i:02d}.jpg").write_bytes(actual)

    # Frame final = imagen real proporcionada por el usuario
    n = len(fases)
    (out / f"frame_{n:02d}.jpg").write_bytes(Path(args.final).read_bytes())
    print(f"frame_{n:02d}.jpg  (final, imagen real del usuario)")
    print(f"\nListo: {n + 1} frames en {out}/")
    print("REVISA LOS FRAMES ANTES DE INTERPOLAR. Regenerar un frame es barato; "
          "un clip de Veo no.")


if __name__ == "__main__":
    main()
