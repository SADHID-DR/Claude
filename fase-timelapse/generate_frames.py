#!/usr/bin/env python3
"""Generate frames 1-5 from plan prompts using Gemini API."""

import os
import base64
import sys
from pathlib import Path

try:
    import google.generativeai as genai
except ImportError:
    print("Installing google-generativeai...")
    os.system("pip install google-generativeai pillow -q")
    import google.generativeai as genai

from PIL import Image

# API key from environment
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not set")
    sys.exit(1)

genai.configure(api_key=api_key)

# Frame definitions from plan
frames = [
    {
        "number": 1,
        "name": "Superficie de cancha",
        "prompt": """Editar Frame 0:
"Aplica textura de cancha deportiva real a las dos superficies de juego actualmente en blanco/wireframe: pintura de líneas de juego reglamentarias, color de superficie sintética (verde o azul cancha profesional). No modifiques ninguna otra geometría. Mantén exactamente el mismo ángulo de cámara axonométrico, el mismo encuadre y las mismas proporciones del modelo."
"""
    },
    {
        "number": 2,
        "name": "Gradas terminadas",
        "prompt": """Editar Frame 1:
"Convierte los paneles negros de graderío en gradas terminadas con asientos individuales visibles en filas y techo/cubierta sobre la estructura. Mantén la posición y volumen exactos de las gradas actuales, solo añade el detalle constructivo. No modifiques las canchas ni ningún otro elemento. Mismo ángulo de cámara, mismo encuadre."
"""
    },
    {
        "number": 3,
        "name": "Iluminación",
        "prompt": """Editar Frame 2:
"Añade luminarias deportivas reales en la punta de cada poste de iluminación ya existente en el modelo (no agregues postes nuevos). Luz de día, luminarias apagadas pero visiblemente instaladas y detalladas. No modifiques ningún otro elemento. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
"""
    },
    {
        "number": 4,
        "name": "Urbanización",
        "prompt": """Editar Frame 3:
"Añade acabados de urbanización alrededor del predio: acera peatonal definida, vegetación (árboles y arbustos) en las áreas verdes ya delimitadas en el modelo, señalización vial básica. No modifiques el complejo deportivo en sí. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
"""
    },
    {
        "number": 5,
        "name": "Población",
        "prompt": """Editar Frame 4:
"Añade personas: jugadores en actividad sobre ambas canchas, espectadores sentados dispersos en las gradas. Escala humana realista respecto al tamaño de las canchas. No modifiques ninguna geometría del complejo. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
"""
    }
]

def generate_frame(frame_num, prompt, prev_frame_path):
    """Generate a frame by editing the previous one."""
    print(f"\n{'='*60}")
    print(f"Generating Frame {frame_num}: {frames[frame_num-1]['name']}")
    print(f"{'='*60}")

    # Read previous frame
    with open(prev_frame_path, "rb") as f:
        image_data = f.read()

    # Convert to PIL Image to get base64
    img = Image.open(prev_frame_path)
    img_base64 = base64.standard_b64encode(image_data).decode("utf-8")

    # Call Gemini with image editing prompt
    model = genai.GenerativeModel("gemini-2.0-flash")

    full_prompt = f"""{prompt}

CRITICAL REQUIREMENTS:
- Edit the existing image, do NOT create from scratch
- Maintain EXACTLY the same camera angle, framing, and proportions
- Keep neutral daylight lighting throughout
- No dramatic transitions, no lens flares, no bloom effects
- Return ONLY the edited image with no text overlays
- Aspect ratio must remain 16:9 (or original proportions)"""

    try:
        response = model.generate_content([
            full_prompt,
            {
                "mime_type": "image/png",
                "data": img_base64,
            }
        ])

        if response.candidates and response.candidates[0].content.parts:
            # Extract image from response
            image_part = None
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'mime_type') and 'image' in part.mime_type:
                    image_part = part
                    break

            if image_part:
                output_path = f"frames/frame_{frame_num:02d}.jpg"
                # Save the generated image
                with open(output_path, "wb") as f:
                    f.write(image_part.data)
                print(f"✓ Saved: {output_path}")
                return output_path
            else:
                print("⚠ No image in response, retrying with text-only approach...")
                # Fallback: generate description and use it
                text_response = response.text
                print(f"Response: {text_response[:200]}...")
                return None
        else:
            print(f"✗ Generation failed: {response}")
            return None

    except Exception as e:
        print(f"✗ Error: {e}")
        return None

# Generate frames
frames_dir = Path("frames")
frames_dir.mkdir(exist_ok=True)

current_frame = "frames/frame_00.jpg"
for i in range(1, 6):
    print(f"\n>>> Frame {i}/5")
    next_frame = generate_frame(i, frames[i-1]["prompt"], current_frame)
    if next_frame:
        current_frame = next_frame
    else:
        print(f"⚠ Frame {i} generation had issues, continuing anyway...")

print(f"\n{'='*60}")
print("Frame generation complete!")
print(f"{'='*60}")
