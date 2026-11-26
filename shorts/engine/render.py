"""Render a vertical Short from a declarative scene spec + timing.json + narration.wav.

usage: python3 render.py <spec.json> <out_dir> [--preview]
  writes <out_dir>/video.mp4 (or <out_dir>/preview.png contact sheet with --preview)

See shorts/SPEC.md for the element vocabulary.
"""
import json, math, subprocess, sys
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont

spec_path, OUT = sys.argv[1], sys.argv[2]
PREVIEW = "--preview" in sys.argv
spec = json.load(open(spec_path))
T = json.load(open(f"{OUT}/timing.json"))
W, H, FPS = 1080, 1920, 30
TOTAL = T["total"] + 0.3

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FE = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
COL = {"white": (240, 244, 250), "dim": (130, 140, 160), "yellow": (255, 214, 80), "red": (232, 88, 88),
       "blue": (80, 150, 240), "lightblue": (190, 225, 250), "green": (90, 200, 120), "orange": (255, 150, 60),
       "purple": (170, 120, 240), "pink": (240, 120, 180), "bg": (14, 17, 26), "black": (0, 0, 0)}
SIZES = {"xl": 130, "lg": 96, "md": 66, "sm": 46, "xs": 36}

def col(c): return tuple(c) if isinstance(c, (list, tuple)) else COL.get(c, COL["white"])
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease(x): x = clamp(x); return x * x * (3 - 2 * x)
def back(x):
    x = clamp(x); c = 1.9
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def lerp(a, b, t): return a + (b - a) * t

@lru_cache(None)
def font(sz): return ImageFont.truetype(FB, sz)

def wrap(text, f, maxw):
    lines, cur = [], ""
    for w in text.split():
        nxt = (cur + " " + w).strip()
        if cur and f.getlength(nxt) > maxw: lines.append(cur); cur = w
        else: cur = nxt
    return lines + [cur] if cur else lines

@lru_cache(None)
def text_sprite(text, size, color, bg=None, outline=None, stroke=0, maxw=960):
    f = font(size)
    lines = wrap(text, f, maxw - (60 if bg or outline else 0))
    lh = int(size * 1.18)
    tw = int(max(f.getlength(l) for l in lines)) + 2 * stroke
    th = lh * len(lines) + 2 * stroke
    pad = (34, 18) if (bg or outline) else (stroke + 4, stroke + 4)
    im = Image.new("RGBA", (tw + 2 * pad[0], th + 2 * pad[1]), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg: d.rounded_rectangle([0, 0, im.width - 1, im.height - 1], 28, fill=bg)
    if outline: d.rounded_rectangle([3, 3, im.width - 4, im.height - 4], 28, outline=outline, width=6)
    for i, l in enumerate(lines):
        d.text((im.width / 2, pad[1] + stroke + i * lh + lh / 2), l, font=f, fill=color, anchor="mm",
               stroke_width=stroke, stroke_fill=(0, 0, 0))
    return im

@lru_cache(None)
def emoji_sprite(ch, size):
    f = ImageFont.truetype(FE, 109)
    im = Image.new("RGBA", (160 * max(1, len(ch)), 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), ch, font=f, embedded_color=True)
    bb = im.getbbox() or (0, 0, 1, 1)
    im = im.crop(bb)
    s = size / max(im.width, im.height)
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)

def paste(frame, spr, cx, cy, scale=1.0, alpha=1.0, rot=0.0):
    if scale <= 0.01 or alpha <= 0.01: return
    if abs(scale - 1) > 0.01:
        spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BILINEAR)
    if rot: spr = spr.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 0.99:
        a = spr.getchannel("A").point(lambda v: int(v * alpha)); spr = spr.copy(); spr.putalpha(a)
    frame.alpha_composite(spr, (int(cx - spr.width / 2), int(cy - spr.height / 2)))

def motion(el, u, t):
    """Return (dx, dy, scale, alpha, rot) for an element u seconds after it appears."""
    anims = el.get("anim", "pop")
    anims = anims if isinstance(anims, list) else [anims]
    dx = dy = rot = 0.0; sc = al = 1.0
    for a in anims:
        if a == "pop": sc *= back(u / 0.35)
        elif a == "fade": al *= ease(u / 0.4)
        elif a == "float": dy += math.sin(t * 2.2 + el.get("x", 0) * 0.01) * 14
        elif a == "shake": dx += math.sin(u * 45) * 12 * clamp(1 - u / 0.8)
        elif a == "drop":
            p = clamp(u / 0.6); dy += -700 * (1 - p) ** 2 + (math.sin(p * math.pi) * -40 if p < 1 else 0)
        elif a == "bob": dy += 40 * math.exp(-u * 2.5) * math.cos(u * 6)
        elif a == "spin": rot += -u * 120
        elif a == "pulse": sc *= 1 + 0.07 * math.sin(u * 5)
        elif a == "rise": dy += 160 * (1 - ease(u / 0.6)); al *= ease(u / 0.4)
        elif a == "slide_left": dx += 700 * (1 - ease(u / 0.6))
        elif a == "slide_right": dx -= 700 * (1 - ease(u / 0.6))
        elif a == "grow": sc *= ease(u / 1.2)
        elif a == "shrink": sc *= lerp(1, 0.35, ease(u / 1.5))
        elif a == "none": pass
    if "to" in el:  # move from (x,y) to "to" over "move_dur"
        p = ease(u / el.get("move_dur", 1.0))
        dx += (el["to"][0] - el.get("x", 540)) * p; dy += (el["to"][1] - el.get("y", 960)) * p
    return dx, dy, sc, al, rot

def draw_arrow(d, p, q, c, w, frac):
    q2 = (lerp(p[0], q[0], frac), lerp(p[1], q[1], frac))
    d.line([p, q2], fill=c, width=w)
    if frac > 0.95:
        ang = math.atan2(q[1] - p[1], q[0] - p[0]); L = w * 3.2
        pts = [q, (q[0] - L * math.cos(ang - 0.5), q[1] - L * math.sin(ang - 0.5)),
               (q[0] - L * math.cos(ang + 0.5), q[1] - L * math.sin(ang + 0.5))]
        d.polygon(pts, fill=c)

def element(frame, el, u, t):
    typ = el["type"]
    x, y = el.get("x", 540), el.get("y", 960)
    dx, dy, sc, al, rot = motion(el, u, t)
    if typ == "emoji":
        paste(frame, emoji_sprite(el["char"], int(el.get("size", 260))), x + dx, y + dy, sc, al, rot)
    elif typ == "text":
        sz = SIZES.get(el.get("size", "md"), el.get("size")) if isinstance(el.get("size", "md"), str) else el["size"]
        spr = text_sprite(el["text"], int(sz), col(el.get("color", "white")), stroke=int(el.get("stroke", 0)),
                          maxw=int(el.get("maxw", 960)))
        paste(frame, spr, x + dx, y + dy, sc, al, rot)
    elif typ == "badge":
        sz = SIZES.get(el.get("size", "md"), 66)
        if el.get("outline"):
            spr = text_sprite(el["text"], sz, col(el.get("color", "white")), outline=col(el.get("color", "white")))
        else:
            spr = text_sprite(el["text"], sz, col(el.get("text_color", "bg")), bg=col(el.get("color", "yellow")))
        paste(frame, spr, x + dx, y + dy, sc, al, rot)
    elif typ == "steps":
        items, gap, sp = el["items"], el.get("gap", 0.8), el.get("spacing", 190)
        y0 = y - sp * (len(items) - 1) / 2
        for i, it in enumerate(items):
            ui = u - i * gap
            if ui < 0: continue
            c = col(el.get("last_color", "yellow")) if i == len(items) - 1 and el.get("highlight_last", True) else col(el.get("color", "white"))
            spr = text_sprite(it, SIZES.get(el.get("size", "lg"), 96), c, outline=c, maxw=900)
            paste(frame, spr, x, y0 + i * sp + 40 * (1 - ease(ui / 0.4)), 1, ease(ui / 0.35))
    elif typ == "bars":
        items = el["items"]; n = len(items); hmax = el.get("height", 380)
        vmax = el.get("max", max(it["value"] for it in items)) or 1
        bw = min(220, 800 // n - 40); g = ease((u - 0.2) / el.get("dur", 1.3))
        d = ImageDraw.Draw(frame)
        for i, it in enumerate(items):
            cx = 540 + (i - (n - 1) / 2) * (800 / n)
            h = hmax * it["value"] / vmax * g
            d.rectangle([cx - bw / 2, y - h, cx + bw / 2, y], fill=col(it.get("color", "blue")))
            paste(frame, text_sprite(it["label"], 40, col("white"), maxw=300), cx, y + 45)
            v = it.get("text") or el.get("fmt", "{:g}").format(it["value"] * g if el.get("count", True) else it["value"])
            if g > 0.05: paste(frame, text_sprite(v, 42, col("white"), maxw=320), cx, y - h - 38)
    elif typ == "counter":
        p = ease(u / el.get("dur", 1.8))
        v = lerp(el.get("from", 0), el["to"], p)
        s = el.get("prefix", "") + el.get("fmt", "{:,.0f}").format(v) + el.get("suffix", "")
        sz = SIZES.get(el.get("size", "xl"), 130)
        paste(frame, text_sprite(s, sz, col(el.get("color", "yellow")), maxw=1000), x + dx, y + dy)
    elif typ == "grid":
        n, cols = int(el.get("n", 100)), int(el.get("cols", 10)); size = el.get("size", 70)
        hi = int(el.get("highlight", 0)); rows = math.ceil(n / cols); step = size * 1.2
        x0, y0 = x - step * (cols - 1) / 2, y - step * (rows - 1) / 2
        per = el.get("stagger", 0.012)
        hl_at = el.get("highlight_at", 0)
        for k in range(n):
            uk = u - k * per
            if uk < 0: break
            ch = el.get("highlight_char", el["char"]) if (k < hi and u >= hl_at) else el["char"]
            spr = emoji_sprite(ch, size)
            fade = 0.3 if (hi and u >= hl_at and k >= hi and el.get("dim_rest", True)) else 1.0
            paste(frame, spr, x0 + (k % cols) * step, y0 + (k // cols) * step, back(uk / 0.25), fade)
    elif typ == "arrow":
        d = ImageDraw.Draw(frame)
        draw_arrow(d, tuple(el["from"]), tuple(el["to"]), col(el.get("color", "yellow")), el.get("width", 12), ease(u / 0.5))
    elif typ == "cross":
        d = ImageDraw.Draw(frame); s = el.get("size", 200) / 2 * back(u / 0.3); w = 22
        d.line([(x - s, y - s), (x + s, y + s)], fill=col("red"), width=w)
        d.line([(x - s, y + s), (x + s, y - s)], fill=col("red"), width=w)
    elif typ == "check":
        d = ImageDraw.Draw(frame); s = el.get("size", 200) / 2 * back(u / 0.3)
        d.line([(x - s, y), (x - s * 0.3, y + s * 0.7), (x + s, y - s * 0.7)], fill=col("green"), width=24, joint="curve")
    elif typ == "box":
        d = ImageDraw.Draw(frame); w2, h2 = el.get("w", 400) / 2, el.get("h", 300) / 2
        a = ease(u / 0.4)
        d.rounded_rectangle([x - w2, y - h2 * a, x + w2, y + h2 * a], el.get("radius", 26),
                            outline=col(el.get("color", "white")), width=6,
                            fill=col(el["fill"]) if el.get("fill") else None)
    elif typ == "progress":
        d = ImageDraw.Draw(frame); w2 = el.get("w", 800) / 2; p = ease(u / el.get("dur", 2.0)) * el.get("to", 1.0)
        d.rounded_rectangle([x - w2, y - 30, x + w2, y + 30], 30, outline=col("dim"), width=5)
        if p > 0.02: d.rounded_rectangle([x - w2 + 8, y - 22, x - w2 + 8 + (2 * w2 - 16) * p, y + 22], 22, fill=col(el.get("color", "green")))
    else:
        raise ValueError(f"unknown element type {typ}")

# ---- timing ----
lines = T["lines"]
nsc = len(spec["scenes"])
sc_start = [None] * nsc
for ln in lines:
    if sc_start[ln["scene"]] is None: sc_start[ln["scene"]] = ln["start"]
for i in range(nsc):
    if sc_start[i] is None: raise SystemExit(f"scene {i} has no narration lines")
sc_end = [sc_start[i + 1] if i + 1 < nsc else TOTAL for i in range(nsc)]

def el_start(el, si):
    if "at_line" in el: return lines[el["at_line"]]["start"] - sc_start[si]
    if "at_word" in el:  # [line, word index] approximate by char position
        li, wi = el["at_word"]; ln = lines[li]; ws = ln["text"].split()
        frac = len(" ".join(ws[:wi])) / max(1, len(ln["text"]))
        return ln["start"] + (ln["end"] - ln["start"]) * frac - sc_start[si]
    return el.get("at", 0.0)

caps = []
for ln in lines:
    words = [w for w in ln.get("caption", ln["text"]).split() if w not in ("—", "-", "–")]  # English subtitle
    chunks = [[]]
    for w_ in words:
        if chunks[-1] and (font(70).getlength(" ".join(chunks[-1] + [w_])) > 900 or len(chunks[-1]) >= 4):
            chunks.append([])
        chunks[-1].append(w_)
    tot = sum(len(" ".join(c)) for c in chunks); t0 = ln["start"]
    for c in chunks:
        dur = (ln["end"] - ln["start"]) * len(" ".join(c)) / tot
        caps.append((t0, t0 + dur, " ".join(c))); t0 += dur

BG = Image.new("RGBA", (W, H))
dbg = ImageDraw.Draw(BG)
top, bot = col(spec.get("bg_top", [20, 24, 38])), col(spec.get("bg_bottom", [10, 12, 18]))
for yy in range(H):
    dbg.line([(0, yy), (W, yy)], fill=tuple(int(lerp(top[i], bot[i], yy / H)) for i in range(3)) + (255,))
_tsz = 84
while _tsz > 56 and font(_tsz).getlength(spec["title_card"].upper()) > 960: _tsz -= 4
TITLE = text_sprite(spec["title_card"].upper(), _tsz, col("white"), stroke=3, maxw=1040)

def frame_at(t):
    fr = BG.copy()
    paste(fr, TITLE, 540, 230)
    si = max(i for i in range(nsc) if sc_start[i] <= t) if t >= sc_start[0] else 0
    lt = t - sc_start[si]
    for el in spec["scenes"][si].get("elements", []):
        st = el_start(el, si)
        if lt >= st and ("until" not in el or lt < el["until"]):
            element(fr, el, lt - st, t)
    for a, b, c in caps:
        if a <= t < b:
            paste(fr, text_sprite(c, 70, col("white"), stroke=6), 540, 1570); break
    return fr.convert("RGB")

if PREVIEW:
    mids = [(sc_start[i] + sc_end[i]) / 2 + 0.6 for i in range(nsc)] + [sc_end[-1] - 0.4]
    thumbs = [frame_at(min(m, TOTAL - 0.1)).resize((270, 480)) for m in mids]
    cols_ = min(6, len(thumbs)); rows = math.ceil(len(thumbs) / cols_)
    sheet = Image.new("RGB", (270 * cols_, 480 * rows), (0, 0, 0))
    for i, im in enumerate(thumbs): sheet.paste(im, ((i % cols_) * 270, (i // cols_) * 480))
    sheet.save(f"{OUT}/preview.png"); print("preview", f"{OUT}/preview.png"); sys.exit()

ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                       "-r", str(FPS), "-i", "-", "-i", f"{OUT}/narration.wav", "-c:v", "libx264", "-preset", "medium",
                       "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
                       "-movflags", "+faststart", f"{OUT}/video.mp4"], stdin=subprocess.PIPE)
for fi in range(int(TOTAL * FPS)):
    ff.stdin.write(frame_at(fi / FPS).tobytes())
ff.stdin.close(); ff.wait()
print("video", f"{OUT}/video.mp4", "rc", ff.returncode)
