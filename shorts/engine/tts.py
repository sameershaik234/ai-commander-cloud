"""Narration for a Shorts spec: writes <out>/narration.wav and <out>/timing.json.

usage: python3 tts.py <spec.json> <out_dir> <models_dir>
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

spec_path, out, models = sys.argv[1:4]
spec = json.load(open(spec_path))
os.makedirs(out, exist_ok=True)
k = Kokoro(f"{models}/kokoro.onnx", f"{models}/voices.bin")
voice = spec.get("voice", "am_michael")
speed = float(spec.get("speed", 1.12))
lang = spec.get("lang", "en-us")  # "hi" for Hindi narration

chunks, meta, t, sr = [], [], 0.0, 24000
for i, ln in enumerate(spec["lines"]):
    a, sr = k.create(ln["text"], voice=voice, speed=speed, lang=lang)
    nz = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, nz[0] - 600): nz[-1] + 1200]
    dur = len(a) / sr
    meta.append({"i": i, "scene": ln["scene"], "text": ln["text"], "caption": ln.get("caption", ln["text"]), "start": t, "end": t + dur})
    pause = float(ln.get("pause_after", 0.18))
    chunks += [a, np.zeros(int(sr * pause), dtype=a.dtype)]
    t += dur + pause
audio = np.concatenate(chunks[:-1])
sf.write(f"{out}/narration.wav", audio, sr)
total = len(audio) / sr
json.dump({"lines": meta, "total": total}, open(f"{out}/timing.json", "w"), indent=1)
words = sum(len(l["text"].split()) for l in spec["lines"])
print(f"narration {total:.1f}s, {words} words, {words / total * 60:.0f} wpm")
