// Toon-shaded cartoon, episode 3: "Gerald's Christmas". window.renderAt(t) draws time t deterministically.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const W = 1080, H = 1920;
const DATA = await (await fetch('data-gerald3.json')).json();
const font = new FontLoader().parse(await (await fetch('./node_modules/three/examples/fonts/helvetiker_bold.typeface.json')).json());
document.getElementById('title').textContent = DATA.title;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const effect = new OutlineEffect(renderer, { defaultThickness: 0.006, defaultColor: [0.08, 0.05, 0.05] });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const back = x => { x = clamp(x); const c = 2.4; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...o });
const mesh = (geo, color, o) => { const m = new THREE.Mesh(geo, color.isMaterial ? color : toon(color, o)); m.castShadow = true; m.receiveShadow = true; return m; };
const sph = (r, color, sx = 1, sy = 1, sz = 1) => { const m = mesh(new THREE.SphereGeometry(r, 32, 24), color); m.scale.set(sx, sy, sz); return m; };
function text3d(str, size, color, maxW = 0) {
  const g = new TextGeometry(str, { font, size, depth: size * 0.3, curveSegments: 6, bevelEnabled: true, bevelThickness: size * 0.05, bevelSize: size * 0.04, bevelSegments: 2 });
  g.center(); g.computeBoundingBox(); const m = mesh(g, color);
  m.userData.fit = maxW ? Math.min(1, maxW / (g.boundingBox.max.x - g.boundingBox.min.x)) : 1; m.scale.setScalar(m.userData.fit); return m;
}
function gradientBg(top, bottom) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}


// ---------- lights & world (snowy) ----------
scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x6a7a9a, 1.7));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.0); sun.position.set(5, 12, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); scene.add(sun);
const world = new THREE.Group(); scene.add(world);
const ground = mesh(new THREE.CylinderGeometry(40, 40, 0.4, 64), 0xf2f6ff); ground.position.y = -0.2; world.add(ground);
for (let i = 0; i < 14; i++) {
  const a = Math.PI * 1.05 + i / 13 * Math.PI * 0.9, r = 12 + (i % 3) * 3;
  const tr = new THREE.Group(); tr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 6);
  const trunk = mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 10), 0x6b4423); trunk.position.y = 0.6; tr.add(trunk);
  [0, 1, 2].forEach(k => { const c = mesh(new THREE.ConeGeometry(1.8 - k * 0.45, 1.9, 14), 0x1f6b3a); c.position.y = 1.8 + k * 1.1; tr.add(c);
    const cap = mesh(new THREE.ConeGeometry(0.75 - k * 0.15, 0.7, 14), 0xffffff); cap.position.y = 2.5 + k * 1.1; tr.add(cap); });
  world.add(tr);
}
for (let i = 0; i < 7; i++) { const s = sph(1.2 + (i % 3) * 0.5, 0xffffff, 1.6, 0.5, 1); s.position.set(-15 + i * 5, 0, -10 - (i % 2) * 3); world.add(s); }

// ---------- Gerald ----------
function makeTurkey() {
  const T = new THREE.Group(), body = new THREE.Group(); T.add(body);
  const torso = sph(1, 0x8b5a2b, 1, 1.05, 1.1); torso.position.y = 1.7; body.add(torso);
  const belly = sph(0.75, 0xc68b59, 1, 1, 0.6); belly.position.set(0, 1.55, 0.6); body.add(belly);
  const tail = new THREE.Group(); tail.position.set(0, 2.0, -0.7); body.add(tail);
  const tc = [0xe94f37, 0xf28c28, 0xf6c445, 0x8b5a2b, 0xf6c445, 0xf28c28, 0xe94f37];
  tc.forEach((c, i) => { const a = (i - 3) * 0.33; const f = sph(0.55, c, 0.55, 1.6, 0.15); f.position.set(Math.sin(a) * 1.2, Math.cos(a) * 1.2, -0.1 - Math.abs(i - 3) * 0.02); f.rotation.z = -a; tail.add(f); });
  const head = new THREE.Group(); head.position.set(0, 3.05, 0.35); body.add(head);
  head.add(sph(0.55, 0x9c6b3d));
  const beak = mesh(new THREE.ConeGeometry(0.16, 0.45, 16), 0xf6a623); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.05, 0.62); head.add(beak);
  const wattle = sph(0.12, 0xe02b2b, 1, 2.2, 1); wattle.position.set(0.08, -0.38, 0.5); head.add(wattle);
  const eyes = [];
  for (const x of [-0.22, 0.22]) {
    const e = sph(0.17, 0xffffff); e.position.set(x, 0.15, 0.45); head.add(e);
    const p = sph(0.08, 0x111111); p.position.set(x, 0.15, 0.6); head.add(p); eyes.push(e, p);
  }
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * 0.95, 1.9, 0); const f = sph(0.5, 0x6e4422, 0.35, 1, 0.8); f.position.y = -0.4; w.add(f); body.add(w); return w; });
  const legs = [-0.35, 0.35].map(x => { const l = new THREE.Group(); l.position.set(x, 0.85, 0); const s = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 8), 0xf6a623); s.position.y = -0.42; l.add(s); const ft = sph(0.18, 0xf6a623, 1.3, 0.4, 1.6); ft.position.set(0, -0.85, 0.12); l.add(ft); T.add(l); return l; });
  T.userData = { body, head, tail, wings, legs, eyes };
  return T;
}
const gerald = makeTurkey(); scene.add(gerald);
function pose(t, o = {}) {
  const u = gerald.userData; const run = o.run || 0, dance = o.dance || 0, flap = o.flap || 0;
  u.body.position.y = Math.abs(Math.sin(t * (run ? 14 : 3))) * (run ? 0.25 : 0.06) + (dance ? Math.abs(Math.sin(t * 6)) * 0.5 : 0);
  u.body.rotation.z = dance * Math.sin(t * 6) * 0.25; u.body.rotation.x = run * 0.25;
  u.head.rotation.y = (o.look || 0) + Math.sin(t * 1.3) * 0.12; u.head.rotation.x = o.nod ? Math.sin(t * 8) * 0.2 : 0;
  u.tail.rotation.z = Math.sin(t * 2) * 0.05; u.tail.scale.setScalar(o.tail || 1);
  u.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.15 + (flap ? (0.6 + Math.sin(t * 16) * 0.6) : 0) + (o.wave && i === 1 ? 1.3 + Math.sin(t * 9) * 0.5 : 0)) * (i ? 1 : -1) * -1; });
  u.legs.forEach((l, i) => { l.rotation.x = run ? Math.sin(t * 14 + i * Math.PI) * 0.8 : (dance ? Math.sin(t * 6 + i * Math.PI) * 0.3 : 0); });
  const blink = (Math.floor(t * 10) % 31 === 0) ? 0.1 : 1, big = o.bigEyes || 1;
  u.eyes.forEach((e, i) => { e.scale.set(big, big * blink, big); });
}

// Santa hat on Gerald
{ const h = gerald.userData.head, hat = new THREE.Group(); hat.position.set(0, 0.42, -0.05); hat.rotation.set(-0.25, 0, 0.18); h.add(hat);
  const cone = mesh(new THREE.ConeGeometry(0.46, 1.0, 24), 0xd62828); cone.position.y = 0.45; hat.add(cone);
  const band = mesh(new THREE.TorusGeometry(0.44, 0.13, 12, 28), 0xffffff); band.rotation.x = Math.PI / 2; hat.add(band);
  const pom = sph(0.16, 0xffffff); pom.position.set(0.12, 1.0, 0); hat.add(pom); }

// ---------- props ----------
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const WRAP = [[0xd62828, 0xffd23f], [0x2a9d4f, 0xffffff], [0xffd23f, 0xd62828], [0x3a86ff, 0xffffff], [0xff006e, 0xffd23f], [0xffffff, 0xd62828]];
const N = 30, boxes = [];
for (let i = 0; i < N; i++) { const g = new THREE.Group(), s = 0.85 + rnd(i) * 0.25;
  const card = new THREE.Group(); card.add(mesh(new THREE.BoxGeometry(1, 1, 1), 0xc8915a)); const tape = mesh(new THREE.BoxGeometry(1.02, 0.12, 0.25), 0xe8d5a8); tape.position.y = 0.45; card.add(tape); g.add(card);
  const [c1, c2] = WRAP[i % WRAP.length], wrap = new THREE.Group(); wrap.add(mesh(new THREE.BoxGeometry(1, 1, 1), c1));
  wrap.add(mesh(new THREE.BoxGeometry(1.03, 1.03, 0.16), c2)); wrap.add(mesh(new THREE.BoxGeometry(0.16, 1.03, 1.03), c2));
  [-1, 1].forEach(k => { const b = sph(0.16, c2, 1.4, 0.7, 0.6); b.position.set(k * 0.16, 0.56, 0); b.rotation.z = k * 0.5; wrap.add(b); }); g.add(wrap);
  g.scale.setScalar(s); g.userData = { card, wrap, s }; scene.add(g); boxes.push(g); }
// pile (heap) positions
const pile = []; { let i = 0; [9, 8, 6, 4, 2, 1].forEach((n, row) => { for (let k = 0; k < n; k++, i++) pile.push([(k - (n - 1) / 2) * 1.02 + (rnd(i + 50) - 0.5) * 0.2, 0.47 + row * 0.95, -2.2 + (rnd(i + 90) - 0.5) * 0.8, (rnd(i + 7) - 0.5) * 0.5]); }); }
// tree positions: 6 tiers (21 boxes) + 9 presents around the base
const tree = []; { [6, 5, 4, 3, 2, 1].forEach((n, row) => { for (let k = 0; k < n; k++) tree.push([(k - (n - 1) / 2) * 1.0, 0.5 + row * 0.98, -1.5, 0]); });
  for (let k = 0; k < 9; k++) { const a = -1.2 + k / 8 * 2.4; tree.push([Math.sin(a) * 4.2, 0.4, -1.5 + Math.cos(a) * 1.6, rnd(k) - 0.5]); } }
const TOP = 0.5 + 5 * 0.98 + 0.5; // top of the tree
const lights = []; for (let i = 0; i < 26; i++) { const row = Math.floor(i / 5) % 6, w = (6 - row) * 0.5; const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.material.userData.outlineParameters = { visible: false }; m.position.set(-w + rnd(i + 3) * w * 2, 0.15 + row * 0.98 + rnd(i + 9) * 0.7, -0.98); m.userData.c = [0xffd23f, 0xff3b3b, 0x4dff88, 0x5ab0ff][i % 4]; scene.add(m); lights.push(m); }
const star = (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1.05, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 }); g.center(); return mesh(g, toon(0xffd23f, { emissive: 0x7a5a00 })); })(); scene.add(star);
const sign = new THREE.Group(); scene.add(sign);
{ const board = mesh(new THREE.BoxGeometry(5.4, 3.0, 0.3), 0x7a1f1f); board.position.y = 4.6; sign.add(board);
  const fr = mesh(new THREE.BoxGeometry(5.7, 3.3, 0.2), 0x2a9d4f); fr.position.set(0, 4.6, -0.12); sign.add(fr);
  [-2.2, 2.2].forEach(x => { const p = mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), 0x8b5a2b); p.position.set(x, 1.7, -0.2); sign.add(p); });
  const t1 = text3d('CHRISTMAS DINNER', 0.42, 0xffffff, 4.8); t1.position.set(0, 5.35, 0.25); sign.add(t1);
  const t2 = text3d('TONIGHT 6PM', 0.7, 0xffd23f, 4.6); t2.position.set(0, 4.2, 0.25); sign.add(t2); sign.userData.t2 = t2; }
const family = []; for (let i = 0; i < 4; i++) { const p = new THREE.Group(), kid = i === 2, c = [0xd62828, 0x2a9d4f, 0x3a86ff, 0x8338ec][i], k = kid ? 0.65 : 1;
  const bd = mesh(new THREE.CapsuleGeometry(0.45, 1.0, 6, 12), c); bd.position.y = 1.0; p.add(bd); const hd = sph(0.38, [0xf1c27d, 0xc68642, 0xe0ac69, 0x8d5524][i]); hd.position.y = 2.05; p.add(hd);
  const sc = mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 20), 0xffffff); sc.rotation.x = Math.PI / 2; sc.position.y = 1.75; p.add(sc);
  p.scale.setScalar(k); p.userData.i = i; scene.add(p); family.push(p); }
const hearts = family.map(() => { const h = new THREE.Group(); [-0.2, 0.2].forEach(x => { const s = sph(0.25, 0xff006e); s.position.x = x; h.add(s); }); const c = mesh(new THREE.ConeGeometry(0.4, 0.55, 20), 0xff006e); c.rotation.z = Math.PI; c.position.y = -0.32; h.add(c); scene.add(h); return h; });
const snow = []; for (let i = 0; i < 140; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.07 + rnd(i) * 0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); f.material.userData.outlineParameters = { visible: false };
  f.userData = { x: (rnd(i + 1) - 0.5) * 22, z: (rnd(i + 2) - 0.5) * 11 - 2.5, o: rnd(i + 3) * 16, v: 0.8 + rnd(i + 4) * 0.8 }; scene.add(f); snow.push(f); }
const ep = text3d('EPISODE 3', 0.75, 0xffd23f, 4.4); scene.add(ep);
const q = text3d('?', 1.2, 0xffd23f); scene.add(q);
const bang = text3d('!', 1.2, 0xe94f37); scene.add(bang);
const merry = text3d('MERRY CHRISTMAS!', 0.6, 0xffd23f, 4.8); scene.add(merry);
const next = text3d('NEXT: NEW YEAR\'S', 0.42, 0xffffff, 4.2); scene.add(next);
const sweat = sph(0.14, 0x6ec6ff, 1, 1.4, 1); scene.add(sweat);
const sparks = []; for (let i = 0; i < 24; i++) { const s = mesh(new THREE.OctahedronGeometry(0.12), 0xfff3a0); s.castShadow = false; scene.add(s); sparks.push(s); }

const bgs = [gradientBg('#1b2a5c', '#7fb2ff'), gradientBg('#2b3f7a', '#cfe3ff'), gradientBg('#5a2b7a', '#ffc6e0'), gradientBg('#3a0f1f', '#ff6b6b'), gradientBg('#16324f', '#9fd3ff'), gradientBg('#0f1b3d', '#5f7fd1'), gradientBg('#140c2e', '#ff9e6b')];

// ---------- timeline ----------
const capEl = document.getElementById('cap'), titleEl = document.getElementById('title');
const all = [...boxes, ...lights, star, sign, ...family, ...hearts, ep, q, bang, merry, next, sweat, ...sparks];
const placeBox = (b, p) => { b.position.set(p[0], p[1] * b.userData.s / 0.95 * 0 + p[1], p[2]); b.rotation.set(0, p[3], 0); };
const showWrap = (b, w) => { b.userData.card.visible = !w; b.userData.wrap.visible = w; };
const treeLights = (t, on) => lights.forEach((l, i) => { l.visible = on; l.material.color.setHex(Math.floor(t * 3 + i) % 3 === 0 ? 0x332222 : l.userData.c); });
const geraldOnTop = (t, o) => { pose(t, o); gerald.position.set(0, TOP - 0.15, -1.5); gerald.scale.setScalar(0.8);
  star.visible = true; star.position.set(0, TOP + 2.0, -2.2); star.scale.setScalar(1.7 + 0.08 * Math.sin(t * 5)); star.rotation.z = Math.sin(t * 2) * 0.08; };
window.renderAt = t => {
  let si = 0; DATA.sceneStarts.forEach((s, i) => { if (t >= s) si = i; });
  const lt = t - DATA.sceneStarts[si];
  all.forEach(o => o.visible = false);
  scene.background = bgs[si];
  titleEl.style.opacity = si === 6 ? 0 : 1; // the 3D sign-off replaces the title card
  gerald.visible = true; gerald.position.set(0, 0, 0); gerald.rotation.set(0, 0, 0); gerald.scale.setScalar(1);
  snow.forEach(f => { const u = f.userData; f.visible = true; f.position.set(u.x + Math.sin(t * 0.8 + u.o) * 0.4, 15 - ((t * u.v + u.o) % 17), u.z); });
  boxes.forEach(b => b.scale.setScalar(b.userData.s));

  if (si === 0) { // intro, Santa hat, wave
    pose(t, { wave: true, tail: 1 + 0.15 * Math.sin(t * 4) });
    ep.visible = lt > 0.4; ep.position.set(0, 4.9, 0); ep.scale.setScalar(back((lt - 0.4) / 0.5) * ep.userData.fit); ep.rotation.y = Math.sin(t * 2) * 0.15;
    camera.position.set(lerp(1.5, 0, ease(lt / 3.5)), 3.0, lerp(10.5, 12.5, ease(lt / 3.5))); camera.lookAt(0, 3.0, 0);
  } else if (si === 1 || si === 2) { // box mountain, then wrapping
    boxes.forEach((b, i) => { b.visible = true; placeBox(b, pile[i]); showWrap(b, false); });
    if (si === 1) {
      pose(t, { look: Math.sin(t * 2.2) * 0.8 }); gerald.position.set(0, 0, 2.4);
      q.visible = lt > 1.6; q.position.set(0, 4.9 + Math.abs(Math.sin(t * 6)) * 0.15, 2.4); q.scale.setScalar(back((lt - 1.6) / 0.35)); q.rotation.y = Math.sin(t * 3) * 0.3;
      camera.position.set(0, lerp(3.2, 4.2, ease(lt / 3.5)), lerp(10, 16, ease(lt / 3.5))); camera.lookAt(0, lerp(2.8, 3.2, ease(lt / 3.5)), 0);
    } else {
      const k = 0.3 + lt / 2.9; // fraction wrapped
      boxes.forEach((b, i) => { const at = ((i * 7) % N) / N; if (k > at) { showWrap(b, true); const p = clamp((k - at) * 8); b.scale.setScalar(b.userData.s * (1 + 0.25 * Math.sin(p * Math.PI))); } });
      const gx = Math.sin(lt * 2.6) * 2.9; pose(t, { run: 1, flap: 1 }); gerald.position.set(gx, 0, 2.2); gerald.rotation.y = Math.cos(lt * 2.6) > 0 ? Math.PI / 2 : -Math.PI / 2;
      sparks.forEach((s, i) => { const u = (lt * 1.3 + i / sparks.length) % 1; s.visible = true; s.position.set(Math.sin(i * 2.3) * 4 * u, 2 + u * 4 + Math.cos(i) * 1.5, -1 + Math.cos(i * 1.7) * 1.5); s.rotation.set(t * 4, t * 3, 0); s.scale.setScalar(1 - u); });
      camera.position.set(0, 4.2, 15.5); camera.lookAt(0, 3.1, 0);
    }
  } else if (si === 3) { // Christmas dinner sign
    sign.visible = true; sign.position.set(1.1, 0, -2.8);
    const s2 = sign.userData.t2; s2.scale.setScalar(s2.userData.fit * (1 + 0.08 * Math.sin(t * 10)));
    const shock = lt > 2.0; pose(t, { look: 0.25, bigEyes: shock ? 1.55 : 1, tail: shock ? 1.3 : 1 }); gerald.position.set(-1.8, 0, 1.5); gerald.rotation.y = 0.3;
    bang.visible = lt > 1.0; bang.position.set(-2.3, 5.0 + Math.abs(Math.sin(t * 8)) * 0.2, 1.5); bang.scale.setScalar(back((lt - 1.0) / 0.3));
    sweat.visible = shock; const sp = (lt * 1.2) % 1; sweat.position.set(-1.0, 3.9 - sp * 1.2, 2.1);
    if (!shock) { camera.position.set(lerp(-2, 0, ease(lt / 2)), 3.6, 15); camera.lookAt(-0.3, 3.4, -0.5); }
    else { const z = ease((lt - 2.0) / 0.35), sh = Math.sin(t * 70) * 0.05 * (1 - clamp((lt - 2.0) / 1.2)); camera.position.set(-1.4 + sh, 3.2 + sh, lerp(15, 7.5, z)); camera.lookAt(-1.6, 3.0, 1.5); }
  } else if (si === 4) { // presents fly into a tree
    boxes.forEach((b, i) => { b.visible = true; showWrap(b, true); const d = (i < 21 ? i : 21 + (i - 21) * 0.3) * 0.13, u = ease((lt - d) / 0.55);
      const a = pile[i], c = tree[i]; b.position.set(lerp(a[0], c[0], u), lerp(a[1], c[1], u) + Math.sin(u * Math.PI) * 1.5, lerp(a[2], c[2], u)); b.rotation.set(0, lerp(a[3], c[3], u) + Math.sin(u * Math.PI) * 2, 0); });
    pose(t, { flap: 1, look: Math.sin(t * 3) * 0.3 }); gerald.position.set(-3.4, 0, 2.2); gerald.rotation.y = 0.5;
    camera.position.set(0, lerp(3.5, 5.0, ease(lt / 3.5)), lerp(14, 17, ease(lt / 3.5))); camera.lookAt(0, lerp(3.0, 4.2, ease(lt / 3.5)), 0);
  } else if (si === 5) { // hop to the top, become the star
    boxes.forEach((b, i) => { b.visible = true; showWrap(b, true); placeBox(b, tree[i]); }); treeLights(t, lt > 0.3);
    const u = ease(lt / 1.3);
    if (lt < 1.3) { pose(t, { flap: 1 }); gerald.position.set(lerp(-3.4, 0, u), lerp(0, TOP - 0.15, u) + Math.sin(u * Math.PI) * 2.2, lerp(2.2, -1.5, u)); gerald.scale.setScalar(lerp(1, 0.8, u)); }
    else { geraldOnTop(t, { tail: 1.5 }); star.scale.multiplyScalar(back((lt - 1.3) / 0.4)); gerald.userData.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * 1.3); }
    camera.position.set(0, lerp(5, 7.2, ease(lt / 3)), lerp(17, 12.5, ease(lt / 3))); camera.lookAt(0, lerp(4.2, 6.6, ease(lt / 3)), -1.5);
  } else { // family admires the tree; Gerald holds very still
    boxes.forEach((b, i) => { b.visible = true; showWrap(b, true); placeBox(b, tree[i]); }); treeLights(t, true);
    geraldOnTop(t, { tail: 1.5, look: Math.sin(t * 5) * 0.5 * (lt > 3.6 ? 0 : 1) }); gerald.userData.body.position.y = 0; gerald.userData.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * 1.3);
    sweat.visible = true; const sp = (lt * 0.9) % 1; sweat.position.set(0.5, TOP + 2.4 - sp * 1.0, -0.9);
    family.forEach((p, i) => { p.visible = true; const x = [-3.0, -1.2, 0.8, 2.6][i], wu = ease((lt - i * 0.2) / 1.4); p.position.set(lerp(x + (i < 2 ? -6 : 6), x, wu), Math.abs(Math.sin(t * 10 + i)) * 0.15 * (1 - wu), 3.4); p.rotation.y = Math.PI; p.rotation.x = -0.12;
      const h = hearts[i]; h.visible = lt > 1.4 + i * 0.15; h.position.set(x, (i === 2 ? 1.9 : 2.9) + Math.sin(t * 4 + i) * 0.12, 3.4); h.scale.setScalar(back((lt - 1.4 - i * 0.15) / 0.35) * 0.7); });
    merry.visible = lt > 1.0; merry.position.set(0, TOP + 4.6, -1.5); merry.scale.setScalar(back((lt - 1.0) / 0.5) * merry.userData.fit * (1 + 0.04 * Math.sin(t * 7)));
    next.visible = lt > 4.2; next.position.set(0, TOP + 3.75, -1.5); next.scale.setScalar(back((lt - 4.2) / 0.4) * next.userData.fit);
    camera.position.set(0, 5.6, lerp(19, 20.5, ease(lt / 5))); camera.lookAt(0, 4.7, -0.5);
  }
  effect.render(scene, camera);
  const c = DATA.caps.find(c => t >= c[0] && t < c[1]); capEl.textContent = c ? c[2] : '';
};
window.ready = true;
