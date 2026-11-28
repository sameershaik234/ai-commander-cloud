// Toon-shaded cartoon: "Gerald's Black Friday". window.renderAt(t) draws time t deterministically.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const W = 1080, H = 1920;
const DATA = await (await fetch('data-gerald.json')).json();
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

// ---------- lights & world ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(5, 12, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); scene.add(sun);
const world = new THREE.Group(); scene.add(world);
const ground = mesh(new THREE.CylinderGeometry(40, 40, 0.4, 64), 0x8fd16a); ground.position.y = -0.2; world.add(ground);
for (let i = 0; i < 14; i++) {
  const a = Math.PI * 1.05 + i / 13 * Math.PI * 0.9, r = 12 + (i % 3) * 3;
  const tr = new THREE.Group(); tr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 6);
  const trunk = mesh(new THREE.CylinderGeometry(0.25, 0.35, 2, 10), 0x8b5a2b); trunk.position.y = 1; tr.add(trunk);
  const leaf = sph(1.5, [0xf28c28, 0xe94f37, 0xf6c445, 0x6abf4b][i % 4]); leaf.position.y = 2.8; tr.add(leaf); world.add(tr);
}
for (let i = 0; i < 6; i++) { const cl = new THREE.Group(); [0, 0.9, -0.9].forEach((x, k) => { const p = sph(k ? 0.8 : 1.1, 0xffffff); p.position.x = x; cl.add(p); }); cl.position.set(-12 + i * 5, 13 + (i % 2) * 2, -18); cl.userData.i = i; world.add(cl); world.userData.clouds = (world.userData.clouds || []).concat(cl); }

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

// ---------- props ----------
function pumpkin() { const p = new THREE.Group();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const s = sph(1.3, 0xf28c28, 0.6, 1, 1); s.position.set(Math.cos(a) * 1.0, 1.25, Math.sin(a) * 1.0); s.rotation.y = -a; p.add(s); }
  const core = sph(1.45, 0xf5a03a, 1, 0.85, 1); core.position.y = 1.25; p.add(core);
  const stem = mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.6, 10), 0x4f8a2b); stem.position.y = 2.6; p.add(stem); return p; }
const pump = pumpkin(); scene.add(pump);
const sign = new THREE.Group(); scene.add(sign);
{ const board = mesh(new THREE.BoxGeometry(5.2, 3.0, 0.3), 0x1b1b22); board.position.y = 4.6; sign.add(board);
  [-2.1, 2.1].forEach(x => { const p = mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), 0x8b5a2b); p.position.set(x, 1.7, -0.1); sign.add(p); });
  const t1 = text3d('BLACK FRIDAY', 0.5, 0xffffff, 4.6); t1.position.set(0, 5.4, 0.25); sign.add(t1);
  const t2 = text3d('50% OFF', 0.85, 0xffd23f, 4.4); t2.position.set(0, 4.15, 0.25); sign.add(t2); sign.userData.t2 = t2; }
const cart = new THREE.Group(); scene.add(cart);
{ const bm = toon(0xb0b8c8), bars = [[2, 0.08, 0.08, 0, 1.6, 0.6], [2, 0.08, 0.08, 0, 1.6, -0.6], [0.08, 0.08, 1.2, -1, 1.6, 0], [0.08, 0.08, 1.2, 1, 1.6, 0],
    [2, 0.08, 0.08, 0, 0.8, 0.6], [2, 0.08, 0.08, 0, 0.8, -0.6], [2, 0.08, 1.2, 0, 0.8, 0], [0.08, 0.9, 0.08, -1, 1.2, 0.6], [0.08, 0.9, 0.08, -1, 1.2, -0.6], [0.08, 0.9, 0.08, 1, 1.2, 0.6], [0.08, 0.9, 0.08, 1, 1.2, -0.6], [0.08, 0.7, 0.08, -1.3, 1.95, 0]];
  bars.forEach(([w, h, d, x, y, z]) => { const b = mesh(new THREE.BoxGeometry(w, h, d), bm); b.position.set(x, y, z); cart.add(b); });
  const hd = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), 0xe94f37); hd.rotation.x = Math.PI / 2; hd.position.set(-1.45, 2.3, 0); cart.add(hd);
  [[-0.8, 0.5], [0.8, 0.5], [-0.8, -0.5], [0.8, -0.5]].forEach(([x, z]) => { const w = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14), 0x222222); w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, z); cart.add(w); }); }
const crowd = []; for (let i = 0; i < 16; i++) { const p = new THREE.Group(); const c = [0x3a86ff, 0xff006e, 0x8338ec, 0xfb5607, 0x06d6a0][i % 5];
  const bd = mesh(new THREE.CapsuleGeometry(0.45, 1.0, 6, 12), c); bd.position.y = 1.0; p.add(bd); const hd = sph(0.38, 0xf1c27d); hd.position.y = 2.05; p.add(hd);
  const bg = mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), 0xffd23f); bg.position.set(0.55, 0.9, 0); p.add(bg); p.userData.i = i; scene.add(p); crowd.push(p); }
const confetti = []; for (let i = 0; i < 70; i++) { const c = mesh(new THREE.BoxGeometry(0.16, 0.06, 0.1), [0xe94f37, 0xffd23f, 0x3a86ff, 0x06d6a0, 0xff006e][i % 5]); c.castShadow = false; c.userData = { x: ((i * 37) % 80) / 10 - 4, z: ((i * 53) % 40) / 10 - 2, d: (i % 10) * 0.12, s: 1 + (i % 4) * 0.3 }; scene.add(c); confetti.push(c); }
const feathers = []; for (let i = 0; i < 10; i++) { const f = sph(0.25, [0xe94f37, 0xf28c28, 0x8b5a2b][i % 3], 0.4, 1.2, 0.1); scene.add(f); feathers.push(f); }
const name = text3d('GERALD', 0.9, 0xffd23f, 4.4); scene.add(name);
const survived = text3d('SURVIVED!', 0.85, 0x06d6a0, 4.4); scene.add(survived);
const bang = text3d('!', 1.2, 0xe94f37); scene.add(bang);
const heart = new THREE.Group(); [-0.25, 0.25].forEach(x => { const s = sph(0.32, 0xff006e); s.position.x = x; heart.add(s); }); { const c = mesh(new THREE.ConeGeometry(0.5, 0.7, 24), 0xff006e); c.rotation.z = Math.PI; c.position.y = -0.4; heart.add(c); } scene.add(heart);
const seeYou = text3d('SEE YOU NEXT YEAR', 0.55, 0xffffff, 4.6); scene.add(seeYou);
const sweat = sph(0.14, 0x6ec6ff, 1, 1.4, 1); scene.add(sweat);

const bgs = [gradientBg('#7fd3ff', '#fff2cc'), gradientBg('#ffb86b', '#ffe6b0'), gradientBg('#ff9ad5', '#fff0a8'), gradientBg('#6a5acd', '#ffb3c7'), gradientBg('#7fd3ff', '#e8f7ff'), gradientBg('#3b1f4a', '#ff7a59'), gradientBg('#ffb86b', '#fff2cc')];

// ---------- timeline ----------
const capEl = document.getElementById('cap');
const all = [pump, sign, cart, ...crowd, ...confetti, ...feathers, name, survived, bang, heart, seeYou, sweat];
window.renderAt = t => {
  let si = 0; DATA.sceneStarts.forEach((s, i) => { if (t >= s) si = i; });
  const lt = t - DATA.sceneStarts[si];
  all.forEach(o => o.visible = false);
  scene.background = bgs[si];
  gerald.visible = true; gerald.position.set(0, 0, 0); gerald.rotation.set(0, 0, 0); gerald.scale.setScalar(1);
  (world.userData.clouds || []).forEach(c => { c.position.x = -14 + ((c.userData.i * 5 + t * 0.6) % 30); });

  if (si === 0) { // intro + wave
    pose(t, { wave: true, tail: 1 + 0.15 * Math.sin(t * 4) });
    name.visible = lt > 0.5; name.position.set(0, 4.7, 0); name.scale.setScalar(back((lt - 0.5) / 0.5) * name.userData.fit); name.rotation.y = Math.sin(t * 2) * 0.15;
    camera.position.set(lerp(1.5, 0, ease(lt / 3)), 3.0, lerp(11, 13, ease(lt / 3))); camera.lookAt(0, 2.9, 0);
  } else if (si === 1) { // hiding in pumpkin
    pump.visible = true; pump.position.set(0, 0, 0); pump.scale.setScalar(1.25);
    pose(t, { look: Math.sin(t * 2.5) * 0.7 });
    gerald.position.y = 1.2 + Math.max(0, Math.sin(lt * 1.6)) * 0.9 - 0.3; gerald.position.z = 0.2; gerald.scale.setScalar(0.9);
    sweat.visible = true; const sp = (lt * 0.8) % 1; sweat.position.set(0.55, 4.3 - sp * 1.2 + gerald.position.y - 1.2, 0.8);
    camera.position.set(0, 3.4, 13); camera.lookAt(0, 2.8, 0);
  } else if (si === 2) { // survived + dance + confetti
    pump.visible = true; pump.position.set(-3.2, 0, -1.5); pump.scale.setScalar(1.1);
    pose(t, { dance: 1, flap: 1 }); gerald.rotation.y = Math.sin(t * 3) * 0.5;
    survived.visible = lt > 0.3; survived.position.set(0, 5.0, 0); survived.scale.setScalar(back((lt - 0.3) / 0.5) * survived.userData.fit * (1 + 0.05 * Math.sin(t * 8)));
    confetti.forEach(c => { const u = lt - c.userData.d; c.visible = u > 0; c.position.set(c.userData.x + Math.sin(u * 3 + c.userData.x) * 0.4, 9 - u * 2.2 * c.userData.s, c.userData.z); c.rotation.set(u * 5, u * 3, u * 4); });
    camera.position.set(0, 3.2, 13.5); camera.lookAt(0, 3.0, 0);
  } else if (si === 3) { // sees the sign
    sign.visible = true; sign.position.set(0.1, 0, -2.5);
    const s2 = sign.userData.t2; s2.scale.setScalar(s2.userData.fit * (1 + 0.08 * Math.sin(t * 10)));
    pose(t, { look: 0.2, bigEyes: lt > 1.0 ? 1.45 : 1 }); gerald.position.set(-1.6, 0, 1.5); gerald.rotation.y = 0.3;
    bang.visible = lt > 1.0; bang.position.set(-1.6, 4.4 + Math.abs(Math.sin(t * 8)) * 0.2, 1.5); bang.scale.setScalar(back((lt - 1.0) / 0.3));
    camera.position.set(lerp(-2, 0, ease(lt / 2.5)), 3.6, 15); camera.lookAt(-0.3, 3.4, -0.5);
  } else if (si === 4) { // grabs a cart
    const x = lerp(-4.5, 2.5, ease(lt / 3.6));
    pose(t, { run: 0.45 }); gerald.position.set(x - 1.8, 0, 0); gerald.rotation.y = Math.PI / 2;
    cart.visible = true; cart.position.set(x + 0.4, 0, 0); cart.rotation.y = 0;
    heart.visible = lt > 0.8; heart.position.set(x - 1.8, 4.4 + Math.sin(t * 4) * 0.15, 0); heart.scale.setScalar(back((lt - 0.8) / 0.4) * (1 + 0.1 * Math.sin(t * 9)));
    camera.position.set(x * 0.6 - 0.6, 3.2, 14); camera.lookAt(x * 0.6 - 0.6, 2.4, 0);
  } else if (si === 5) { // stampede
    pose(t, { run: 1, flap: 1, bigEyes: 1.5 }); const gx = lerp(0, 1.2, ease(lt / 3)); gerald.position.set(gx, 0, 3.0); gerald.rotation.y = Math.sin(t * 20) * 0.15;
    crowd.forEach((p, i) => { p.visible = true; const z = lerp(-18, 1.5, clamp((lt - (i % 5) * 0.12) / 3.2)) - Math.floor(i / 5) * 1.6;
      p.position.set(-4 + (i % 5) * 2 + Math.sin(t * 9 + i) * 0.2, Math.abs(Math.sin(t * 12 + i)) * 0.35, z); p.rotation.set(0.15, 0, Math.sin(t * 12 + i) * 0.1); });
    feathers.forEach((f, i) => { f.visible = lt > 1.0; const u = (lt - 1.0 + i * 0.13) % 1.6; f.position.set(gx + Math.sin(i * 2.4) * u * 2, 2 + u * 2.5 - u * u * 1.2, 3 + Math.cos(i * 1.7) * u); f.rotation.set(u * 6, i, u * 4); });
    const shake = Math.sin(t * 60) * 0.06; camera.position.set(0.6 + shake, 3.6 + shake, 16); camera.lookAt(0.6, 2.8, 0);
  } else { // back in the pumpkin
    pump.visible = true; pump.position.set(0, 0, 0); pump.scale.setScalar(1.25);
    pose(t, { look: Math.sin(t * 1.5) * 0.4 }); gerald.position.set(0, 1.25, 0.2); gerald.scale.setScalar(0.9);
    seeYou.visible = lt > 2.0; seeYou.position.set(0, 5.6, 0); seeYou.scale.setScalar(back((lt - 2.0) / 0.5) * seeYou.userData.fit);
    camera.position.set(0, lerp(3.4, 3.9, ease(lt / 4)), lerp(13, 15, ease(lt / 4))); camera.lookAt(0, 3.2, 0);
  }
  effect.render(scene, camera);
  const c = DATA.caps.find(c => t >= c[0] && t < c[1]); capEl.textContent = c ? c[2] : '';
};
window.ready = true;
