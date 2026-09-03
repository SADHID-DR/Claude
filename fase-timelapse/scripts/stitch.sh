#!/usr/bin/env bash
# Concatena los clips de Veo en un solo timelapse.
# Uso: bash stitch.sh clips/ timelapse.mp4 [--sin-audio]
set -euo pipefail

DIR="${1:-clips}"
OUT="${2:-timelapse.mp4}"
SIN_AUDIO="${3:-}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg no esta instalado." >&2
  exit 1
fi

LISTA="$(mktemp)"
trap 'rm -f "$LISTA"' EXIT

shopt -s nullglob
CLIPS=("$DIR"/clip_*.mp4)
if [ ${#CLIPS[@]} -eq 0 ]; then
  echo "No se encontraron clips en $DIR/" >&2
  exit 1
fi

for f in "${CLIPS[@]}"; do
  printf "file '%s'\n" "$(realpath "$f")" >> "$LISTA"
done

echo "Concatenando ${#CLIPS[@]} clips..."

if [ "$SIN_AUDIO" = "--sin-audio" ]; then
  ffmpeg -y -f concat -safe 0 -i "$LISTA" -c:v copy -an "$OUT"
else
  ffmpeg -y -f concat -safe 0 -i "$LISTA" -c copy "$OUT"
fi

echo "Listo: $OUT  (~$((${#CLIPS[@]} * 8))s)"
