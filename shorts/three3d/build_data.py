"""usage: python3 build_data.py <timing.json> <title> > data.json — scene starts + caption chunks for the 3D page."""
import json, sys
from PIL import ImageFont
T = json.load(open(sys.argv[1])); f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
starts = {}
for ln in T["lines"]: starts.setdefault(ln["scene"], ln["start"])
caps = []
for ln in T["lines"]:
    words = [w for w in ln.get("caption", ln["text"]).split() if w not in ("—", "-", "–")]
    chunks = [[]]
    for w in words:
        if chunks[-1] and (f.getlength(" ".join(chunks[-1] + [w])) > 940 or len(chunks[-1]) >= 4): chunks.append([])
        chunks[-1].append(w)
    tot = sum(len(" ".join(c)) for c in chunks); t0 = ln["start"]
    for c in chunks:
        d = (ln["end"] - ln["start"]) * len(" ".join(c)) / tot; caps.append([t0, t0 + d, " ".join(c)]); t0 += d
print(json.dumps({"title": sys.argv[2], "total": T["total"] + 0.4, "lines": T["lines"],
                  "sceneStarts": [starts[i] for i in sorted(starts)], "caps": caps}))
