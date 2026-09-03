#!/usr/bin/env python3
"""
Interpola cada par de frames adyacentes con Veo 3.1 (first_frame + last_frame).

Restriccion de la API: last_frame SOLO funciona con clips de 8 segundos.
"""
import argparse
import os
import sys
import time
from pathlib import Path

from google import genai
from google.genai import types

BASE = "time-lapse de construccion, camara completamente estatica, sin movimiento de camara, sin zoom, transicion progresiva y realista"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--frames", default="frames")
    p.add_argument("--salida", default="clips")
    p.add_argument("--resolucion", default="1080p", choices=["720p", "1080p", "4k"])
    p.add_argument("--aspecto", default="16:9", choices=["16:9", "9:16"])
    p.add_argument("--modelo", default="veo-3.1-fast-generate-001")
    p.add_argument("--solo-primero", action="store_true",
                   help="Genera solo el primer tramo, como prueba de costo")
    args = p.parse_args()

    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("Falta GEMINI_API_KEY en el entorno.")

    frames = sorted(Path(args.frames).glob("frame_*.jpg"))
    if len(frames) < 2:
        sys.exit(f"Se necesitan al menos 2 frames en {args.frames}/")

    out = Path(args.salida)
    out.mkdir(parents=True, exist_ok=True)
    client = genai.Client()

    pares = list(zip(frames, frames[1:]))
    if args.solo_primero:
        pares = pares[:1]

    print(f"{len(pares)} tramo(s) x 8s = {len(pares) * 8}s de video final\n")

    for i, (a, b) in enumerate(pares, start=1):
        destino = out / f"clip_{i:02d}.mp4"
        if destino.exists():
            print(f"clip_{i:02d}.mp4 ya existe, saltando.")
            continue

        print(f"[{i}/{len(pares)}] {a.name} -> {b.name} ...")
        first = types.Image(
            image_bytes=a.read_bytes(), mime_type="image/jpeg")
        last = types.Image(
            image_bytes=b.read_bytes(), mime_type="image/jpeg")

        op = client.models.generate_videos(
            model=args.modelo,
            prompt=BASE,
            image=first,
            config=types.GenerateVideosConfig(
                last_frame=last,
                resolution=args.resolucion,
                aspect_ratio=args.aspecto,
            ),
        )

        while not op.done:
            time.sleep(10)
            op = client.operations.get(op)

        if getattr(op, "error", None):
            sys.exit(f"Error de la API en el tramo {i}: {op.error}")

        video = op.response.generated_videos[0]
        client.files.download(file=video.video)
        video.video.save(str(destino))
        print(f"  -> {destino}")

    print("\nListo. Siguiente paso: bash scripts/stitch.sh "
          f"{args.salida}/ timelapse.mp4")


if __name__ == "__main__":
    main()
