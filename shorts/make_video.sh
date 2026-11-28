#!/usr/bin/env bash
# usage: shorts/make_video.sh specs/<slug>.json [--preview]
# Writes out/<slug>/{narration.wav,timing.json,video.mp4|preview.png}
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SPEC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
SLUG="$(basename "$1" .json)"; OUT="$DIR/out/$SLUG"; mkdir -p "$OUT"
if [ ! -s "$OUT/narration.wav" ] || [ "$SPEC" -nt "$OUT/narration.wav" ]; then
  python3 "$DIR/engine/tts.py" "$SPEC" "$OUT" "$DIR/.models"
fi
python3 "$DIR/engine/render.py" "$SPEC" "$OUT" ${2:-}
