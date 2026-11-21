import json
import os
import subprocess
import sys

with open("src/guion.json", encoding="utf-8") as archivo:
    guion = json.load(archivo)

carpeta = os.path.join("public", "audio")
if not os.path.isdir(carpeta):
    os.makedirs(carpeta)

for escena in guion["escenas"]:
    destino = os.path.join(carpeta, escena["id"] + ".mp3")
    huella = os.path.join(carpeta, escena["id"] + ".txt")
    firma = guion["voz"] + "\n" + escena["narracion"]

    if os.path.isfile(destino) and os.path.isfile(huella):
        with open(huella, encoding="utf-8") as previo:
            if previo.read() == firma:
                print("sin cambios", escena["id"])
                continue

    orden = [
        "edge-tts",
        "--voice",
        guion["voz"],
        "--text",
        escena["narracion"],
        "--write-media",
        destino,
    ]
    resultado = subprocess.run(orden)
    if resultado.returncode != 0 or os.path.getsize(destino) == 0:
        if os.path.isfile(destino):
            os.remove(destino)
        sys.exit("fallo de voz en " + escena["id"])

    with open(huella, "w", encoding="utf-8") as nuevo:
        nuevo.write(firma)
    print("generado", escena["id"])
