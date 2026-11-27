"""usage: python3 xmas_music.py <narration.wav> <out.wav> <total_s>
Mixes the narration over a synthesized 'Jingle Bells' (public domain, 1857) bed: bells + bass + sleigh bells, ducked under the voice."""
import sys, numpy as np, soundfile as sf
voice, sr = sf.read(sys.argv[1]); total = float(sys.argv[3]); n = int(total * sr)
if voice.ndim > 1: voice = voice.mean(1)
voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
N = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
hz = lambda name, octv: 440 * 2 ** ((N[name] + 12 * (octv - 4) - 9) / 12)
A = [('E',1),('E',1),('E',2),('E',1),('E',1),('E',2),('E',1),('G',1),('C',1.5),('D',.5),('E',4)]
B1 = [('F',1),('F',1),('F',1.5),('F',.5),('F',1),('E',1),('E',1),('E',.5),('E',.5),('E',1),('D',1),('D',1),('E',1),('D',2),('G',2)]
B2 = [('F',1),('F',1),('F',1.5),('F',.5),('F',1),('E',1),('E',1),('E',.5),('E',.5),('G',1),('G',1),('F',1),('D',1),('C',4)]
song = A + B1 + A + B2; beats = sum(d for _, d in song); bt = total / (beats + 2)  # fits the song into the video, small tail
mus = np.zeros(n); t = 0.0
def add(sig, at, gain):
    i = int(at * sr); j = min(n, i + len(sig))
    if i < n: mus[i:j] += sig[: j - i] * gain
def bell(f, dur):
    tt = np.arange(int(sr * max(dur, 0.6))) / sr; env = np.exp(-tt * 5)
    return env * (np.sin(2*np.pi*f*tt) + 0.45*np.sin(2*np.pi*2.76*f*tt)*np.exp(-tt*8) + 0.25*np.sin(2*np.pi*5.4*f*tt)*np.exp(-tt*14))
for name, d in song:
    add(bell(hz(name, 5 if name != 'C' else 6), d * bt), t, 0.5); t += d * bt
rng = np.random.default_rng(3)
for k in range(int(beats + 2)):  # bass on beats, sleigh bells on eighths
    tt = np.arange(int(sr * bt)) / sr; f = hz('C' if (k // 2) % 2 == 0 else 'G', 2)
    add(np.sin(2*np.pi*f*tt) * np.exp(-tt * 4), k * bt, 0.35)
    for h in (0, 0.5):
        nz = rng.standard_normal(int(sr * 0.08)); nz = np.diff(nz, prepend=0) * np.exp(-np.arange(len(nz)) / sr * 50)
        add(nz, (k + h) * bt, 0.08 if h else 0.12)
mus /= np.abs(mus).max()
env = np.convolve(np.abs(voice), np.ones(int(sr * 0.25)) / int(sr * 0.25), 'same')
duck = np.where(env > 0.01, 0.10, 0.28); duck = np.convolve(duck, np.ones(int(sr * 0.15)) / int(sr * 0.15), 'same')
out = voice * 1.0 + mus * duck
fade = int(sr * 0.8); out[-fade:] *= np.linspace(1, 0, fade)
out /= max(1.0, np.abs(out).max() / 0.95)
sf.write(sys.argv[2], out.astype(np.float32), sr)
print('mixed', len(out) / sr)
