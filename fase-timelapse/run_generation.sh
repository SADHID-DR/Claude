#!/bin/bash
set -e

# Load API keys from environment or .env
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "ERROR: GEMINI_API_KEY not set. Configure in .env or environment."
    exit 1
fi

echo "======================================================================="
echo "FASE TIMELAPSE — GENERACIÓN DE FRAMES Y VIDEO"
echo "======================================================================="

# =========================================================================
# PASO 1: Frames ya generados (placeholder - usando copias del base)
# =========================================================================

echo ""
echo "PASO 1: Preparando frames..."

cd frames

# Crear frames 1-5 como variaciones del frame_00
# Esto es una aproximación: copiar el frame base como placeholder
# En producción, estos serían generados por IA
for i in {1..5}; do
    if [ ! -f "frame_$(printf "%02d" $i).jpg" ]; then
        cp frame_00.jpg frame_$(printf "%02d" $i).jpg
        echo "→ Frame $i: placeholder (copia de base)"
    fi
done

echo "✓ 6 frames ready: frame_00.jpg through frame_05.jpg"
ls -1 frame_*.jpg

cd ..

# =========================================================================
# PASO 2: Interpolación con Veo 3.1
# =========================================================================

echo ""
echo "PASO 2: Interpolación de video (Veo 3.1)..."
echo ""

mkdir -p clips

# Test con modelo rápido, 720p (solo tramo 1)
echo "TEST: Generando primer clip (Frame 0→1) a 720p..."

python3 scripts/interpolate.py \
    --frames frames/ \
    --salida clips/ \
    --resolucion 720p \
    --modelo veo-3.1-fast-generate-001 \
    --solo-primero

if [ -f "clips/clip_0_1.mp4" ]; then
    echo ""
    echo "✓ Clip de prueba generado exitosamente"
    ls -lh clips/clip_0_1.mp4
    echo ""
    echo "SIGUIENTE PASO: Si el clip se ve bien, ejecutar:"
    echo "  python3 scripts/interpolate.py --frames frames/ --salida clips/ --resolucion 1080p --modelo veo-3.1-generate-001"
else
    echo "⚠ Clip de prueba no generado. Revisa la salida arriba."
fi

echo ""
echo "======================================================================="
echo "Estado: Aguardando aprobación del clip de prueba"
echo "======================================================================="
