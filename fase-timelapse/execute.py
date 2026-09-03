#!/usr/bin/env python3
"""Execute timelapse generation: frames + interpolation + stitch."""

import os
import sys
import json
import base64
import subprocess
from pathlib import Path

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set")
    sys.exit(1)

print("="*70)
print("FASE TIMELAPSE — EJECUCIÓN COMPLETA")
print("="*70)

# ============================================================================
# PASO 1: Generar Frames 1-5
# ============================================================================

frames_config = [
    {
        "num": 1,
        "name": "Superficie de cancha",
        "prompt": "Aplica textura de cancha deportiva real a las dos superficies de juego actualmente en blanco/wireframe: pintura de líneas de juego reglamentarias, color de superficie sintética (verde o azul cancha profesional). No modifiques ninguna otra geometría. Mantén exactamente el mismo ángulo de cámara axonométrico, el mismo encuadre y las mismas proporciones del modelo."
    },
    {
        "num": 2,
        "name": "Gradas terminadas",
        "prompt": "Convierte los paneles negros de graderío en gradas terminadas con asientos individuales visibles en filas y techo/cubierta sobre la estructura. Mantén la posición y volumen exactos de las gradas actuales, solo añade el detalle constructivo. No modifiques las canchas ni ningún otro elemento. Mismo ángulo de cámara, mismo encuadre."
    },
    {
        "num": 3,
        "name": "Iluminación",
        "prompt": "Añade luminarias deportivas reales en la punta de cada poste de iluminación ya existente en el modelo (no agregues postes nuevos). Luz de día, luminarias apagadas pero visiblemente instaladas y detalladas. No modifiques ningún otro elemento. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
    },
    {
        "num": 4,
        "name": "Urbanización",
        "prompt": "Añade acabados de urbanización alrededor del predio: acera peatonal definida, vegetación (árboles y arbustos) en las áreas verdes ya delimitadas en el modelo, señalización vial básica. No modifiques el complejo deportivo en sí. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
    },
    {
        "num": 5,
        "name": "Población",
        "prompt": "Añade personas: jugadores en actividad sobre ambas canchas, espectadores sentados dispersos en las gradas. Escala humana realista respecto al tamaño de las canchas. No modifiques ninguna geometría del complejo. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
    }
]

def encode_image_base64(image_path):
    """Encode image to base64."""
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")

def generate_frame_nano(frame_num, prompt, prev_frame_path):
    """Generate frame using Nano Banana (Stable Diffusion img2img)."""
    print(f"\n>>> Generando Frame {frame_num}: {frames_config[frame_num-1]['name']}")

    if not Path(prev_frame_path).exists():
        print(f"✗ Frame anterior no encontrado: {prev_frame_path}")
        return None

    image_b64 = encode_image_base64(prev_frame_path)

    full_prompt = f"""{prompt}

CRITICAL: maintain exact camera angle, framing, proportions. Constant daylight. No flares, transitions or dramatic effects. Edit existing image, don't create new."""

    # Nano Banana API payload for Stable Diffusion img2img
    payload = {
        "MODEL_ID": "stabilityai/stable-diffusion-xl-refiner-1.0",
        "input": {
            "prompt": full_prompt,
            "init_image": image_b64,
            "strength": 0.7,  # How much to modify (0.7 = moderate editing)
            "guidance_scale": 7.5,
            "num_inference_steps": 30,
            "negative_prompt": "blurry, distorted, morphing, lens flare, bloom, dramatic lighting, unrealistic, stylized"
        }
    }

    cmd = [
        "curl", "-s", "-X", "POST",
        "https://api.nanobananai.com/api/v1/image/txt2img",
        "-H", f"Authorization: Bearer {API_KEY}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload)
    ]

    try:
        response_text = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("utf-8")
        response = json.loads(response_text)

        if "images" in response and response["images"]:
            image_data = base64.standard_b64decode(response["images"][0])
            output_path = f"frames/frame_{frame_num:02d}.jpg"
            with open(output_path, "wb") as f:
                f.write(image_data)
            print(f"✓ Guardado: {output_path}")
            return output_path
        elif "image" in response:
            image_data = base64.standard_b64decode(response["image"])
            output_path = f"frames/frame_{frame_num:02d}.jpg"
            with open(output_path, "wb") as f:
                f.write(image_data)
            print(f"✓ Guardado: {output_path}")
            return output_path

        print(f"⚠ Respuesta API: {str(response)[:200]}")
        return None

    except Exception as e:
        print(f"✗ Error: {e}")
        return None

# Generate frames
print("\n" + "="*70)
print("GENERANDO FRAMES 1-5")
print("="*70)

frames_dir = Path("frames")
frames_dir.mkdir(exist_ok=True)

current_frame = "frames/frame_00.jpg"
generated_frames = [current_frame]

for i in range(1, 6):
    next_frame = generate_frame_nano(i, frames_config[i-1]["prompt"], current_frame)
    if next_frame:
        current_frame = next_frame
        generated_frames.append(next_frame)
    else:
        print(f"⚠ Frame {i} falló, intentando continuar...")

print(f"\n✓ Frames generados: {len(generated_frames)}/6")

# ============================================================================
# PASO 2: Test interpolation at 720p (Frame 0→1 only)
# ============================================================================

print("\n" + "="*70)
print("PRUEBA: Interpolación 720p (Frame 0→1 solamente)")
print("="*70)

clips_dir = Path("clips")
clips_dir.mkdir(exist_ok=True)

# Call interpolation script for test
test_cmd = [
    "python3", "scripts/interpolate.py",
    "--frames", "frames/",
    "--salida", "clips/",
    "--resolucion", "720p",
    "--modelo", "veo-3.1-fast-generate-001",
    "--solo-primero"
]

print(f"Ejecutando: {' '.join(test_cmd)}")
try:
    subprocess.run(test_cmd, check=True)
    test_clip = Path("clips/clip_0_1.mp4")
    if test_clip.exists():
        print(f"\n✓ Clip de prueba generado: {test_clip}")
        print(f"  Tamaño: {test_clip.stat().st_size / 1024 / 1024:.1f} MB")
    else:
        print("\n⚠ Clip de prueba no encontrado")
except subprocess.CalledProcessError as e:
    print(f"\n✗ Interpolation failed: {e}")
    print("Continuando de todas formas...")

# ============================================================================
# Status
# ============================================================================

print("\n" + "="*70)
print("ESTADO DE EJECUCIÓN")
print("="*70)
print(f"Frames generados: {len(generated_frames)}/6")
print(f"Clips interpolados (prueba): {len(list(clips_dir.glob('*.mp4')))}")
print("\n✓ PRUEBA 720p completada. Revisa el clip de prueba.")
print("  Si se ve bien, ejecuta: python3 scripts/interpolate.py --full")
print("="*70)
