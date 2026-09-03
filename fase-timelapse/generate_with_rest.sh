#!/bin/bash
set -e

if [ -z "$GEMINI_API_KEY" ]; then
    echo "ERROR: GEMINI_API_KEY not set in environment"
    exit 1
fi
API_KEY="$GEMINI_API_KEY"

echo "======================================================================="
echo "FRAME GENERATION VIA GOOGLE IMAGEN API (REST)"
echo "======================================================================="

cd frames

# Function to generate frame using Imagen
generate_frame() {
    local frame_num=$1
    local prompt=$2
    local prev_frame=$3

    echo ""
    echo ">>> Frame $frame_num: Generating..."

    # Encode image to base64
    local img_b64=$(base64 -w 0 "$prev_frame")

    # Call Google Imagen API
    curl -s -X POST \
        "https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/imageGeneratorModels/imageGeneratorModel:predict" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"instances\": [{
                \"prompt\": \"$prompt\",
                \"image\": \"$img_b64\",
                \"editMode\": true
            }]
        }" > "/tmp/frame_$frame_num.json"

    # Extract and save image
    if grep -q "predictions" "/tmp/frame_$frame_num.json"; then
        base64 -d < <(jq -r '.predictions[0].bytesBase64Encoded' "/tmp/frame_$frame_num.json") > "frame_$(printf '%02d' $frame_num).jpg"
        echo "✓ frame_$(printf '%02d' $frame_num).jpg saved"
        return 0
    else
        echo "⚠ Generation may have failed, checking response..."
        cat "/tmp/frame_$frame_num.json" | head -3
        # Fallback: copy previous frame as placeholder
        cp "$prev_frame" "frame_$(printf '%02d' $frame_num).jpg"
        echo "⚠ Using placeholder for frame $frame_num"
        return 1
    fi
}

# Define frame prompts
declare -a PROMPTS=(
    "Aplica textura de cancha deportiva real"
    "Convierte los paneles negros en gradas terminadas"
    "Añade luminarias deportivas en los postes"
    "Añade urbanización alrededor del predio"
    "Añade personas jugando y espectadores"
)

# Generate frames 1-5
current="frame_00.jpg"
for i in {1..5}; do
    generate_frame $i "${PROMPTS[$((i-1))]}" "$current"
    current="frame_$(printf '%02d' $i).jpg"
done

cd ..

echo ""
echo "======================================================================="
echo "✓ FRAMES READY"
echo "======================================================================="
ls -1 frames/frame_*.jpg | head -6
