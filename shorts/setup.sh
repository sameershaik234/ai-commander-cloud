#!/usr/bin/env bash
# One-time setup for the Shorts engine (idempotent). Run from anywhere.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y -qq ffmpeg; }
[ -f /usr/share/fonts/truetype/noto/NotoColorEmoji.ttf ] || { apt-get update -qq; apt-get install -y -qq fonts-noto-color-emoji; }
python3 -c "import kokoro_onnx, soundfile, PIL" 2>/dev/null || pip install -q kokoro-onnx soundfile pillow
mkdir -p "$DIR/.models"
R=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -s "$DIR/.models/kokoro.onnx" ] || curl -sSL -o "$DIR/.models/kokoro.onnx" "$R/kokoro-v1.0.int8.onnx"
[ -s "$DIR/.models/voices.bin" ] || curl -sSL -o "$DIR/.models/voices.bin" "$R/voices-v1.0.bin"
echo "shorts engine ready"
