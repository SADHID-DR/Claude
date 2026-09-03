#!/bin/bash
set -e

API_KEY="${GEMINI_API_KEY}"
if [ -z "$API_KEY" ]; then
    echo "ERROR: GEMINI_API_KEY not set"
    exit 1
fi

# Frame definitions
declare -A FRAMES=(
    [1]="Superficie de cancha|Aplica textura de cancha deportiva real a las dos superficies de juego actualmente en blanco/wireframe: pintura de líneas de juego reglamentarias, color de superficie sintética (verde o azul cancha profesional). No modifiques ninguna otra geometría. Mantén exactamente el mismo ángulo de cámara axonométrico, el mismo encuadre y las mismas proporciones del modelo."
    [2]="Gradas terminadas|Convierte los paneles negros de graderío en gradas terminadas con asientos individuales visibles en filas y techo/cubierta sobre la estructura. Mantén la posición y volumen exactos de las gradas actuales, solo añade el detalle constructivo. No modifiques las canchas ni ningún otro elemento. Mismo ángulo de cámara, mismo encuadre."
    [3]="Iluminación|Añade luminarias deportivas reales en la punta de cada poste de iluminación ya existente en el modelo (no agregues postes nuevos). Luz de día, luminarias apagadas pero visiblemente instaladas y detalladas. No modifiques ningún otro elemento. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
    [4]="Urbanización|Añade acabados de urbanización alrededor del predio: acera peatonal definida, vegetación (árboles y arbustos) en las áreas verdes ya delimitadas en el modelo, señalización vial básica. No modifiques el complejo deportivo en sí. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
    [5]="Población|Añade personas: jugadores en actividad sobre ambas canchas, espectadores sentados dispersos en las gradas. Escala humana realista respecto al tamaño de las canchas. No modifiques ninguna geometría del complejo. Mismo ángulo de cámara, mismo encuadre, misma luz de día neutra."
)

generate_frame() {
    local frame_num=$1
    local frame_name=$(echo "${FRAMES[$frame_num]}" | cut -d'|' -f1)
    local prompt=$(echo "${FRAMES[$frame_num]}" | cut -d'|' -f2-)
    local prev_frame="frames/frame_$(printf "%02d" $((frame_num - 1))).jpg"
    local output_frame="frames/frame_$(printf "%02d" $frame_num).jpg"

    echo ""
    echo "============================================================"
    echo "Generating Frame $frame_num: $frame_name"
    echo "============================================================"

    if [ ! -f "$prev_frame" ]; then
        echo "✗ Previous frame not found: $prev_frame"
        return 1
    fi

    # Encode image to base64
    local image_base64=$(base64 -w 0 "$prev_frame")

    # Full prompt with critical requirements
    local full_prompt="$prompt

CRITICAL REQUIREMENTS:
- Edit the existing image, do NOT create from scratch
- Maintain EXACTLY the same camera angle, framing, and proportions
- Keep neutral daylight lighting throughout
- No dramatic transitions, no lens flares, no bloom effects
- Return ONLY the edited image with no text overlays"

    # Call Gemini API
    local response=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$API_KEY" \
        -H "Content-Type: application/json" \
        -d @- <<EOF
{
  "contents": [{
    "parts": [
      {"text": "$full_prompt"},
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "$image_base64"
        }
      }
    ]
  }]
}
EOF
)

    # Extract image from response (simplified - assumes base64 in response)
    if echo "$response" | grep -q "inlineData"; then
        local image_data=$(echo "$response" | grep -o '"data":"[^"]*"' | cut -d'"' -f4 | head -1)
        if [ -n "$image_data" ]; then
            echo "$image_data" | base64 -d > "$output_frame"
            echo "✓ Saved: $output_frame"
            return 0
        fi
    fi

    echo "⚠ API response: ${response:0:200}..."
    echo "✗ Frame generation may have failed"
    return 1
}

# Generate frames 1-5
for i in {1..5}; do
    generate_frame $i || echo "⚠ Frame $i had issues, continuing..."
done

echo ""
echo "============================================================"
echo "Frame generation complete!"
echo "============================================================"
