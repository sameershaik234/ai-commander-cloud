// Toon-shaded cartoon: "Gerald vs Cyber Monday" (episode 2). window.renderAt(t) draws time t deterministically.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const W = 1080, H = 1920;
const DATA = await (await fetch('data-gerald2.json')).json();
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
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const phone = new THREE.Group(); scene.add(phone);
{ phone.add(mesh(new THREE.BoxGeometry(1.5, 2.8, 0.18), 0x23232b));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 2.55), new THREE.MeshBasicMaterial({ map: canvasTex(264, 510, c => {
    const g = c.createLinearGradient(0, 0, 0, 510); g.addColorStop(0, '#3a86ff'); g.addColorStop(1, '#8338ec'); c.fillStyle = g; c.fillRect(0, 0, 264, 510);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 40px DejaVu Sans'; c.fillText('CYBER', 132, 110); c.fillText('MONDAY', 132, 155);
    c.fillStyle = '#ffd23f'; c.font = 'bold 64px DejaVu Sans'; c.fillText('SALE', 132, 250);
    c.fillStyle = '#ff3b4f'; c.beginPath(); c.roundRect(42, 360, 180, 80, 40); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 40px DejaVu Sans'; c.fillText('BUY', 132, 414);
  }) })); scr.position.z = 0.095; phone.add(scr); }
const button = new THREE.Group(); scene.add(button);
{ const base = mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.5, 40), 0x2b2b33); base.position.y = 0.25; button.add(base);
  const cap = mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.5, 40), 0xff2d3f); cap.position.y = 0.7; button.add(cap); button.userData.cap = cap;
  const lbl = text3d('BUY', 0.42, 0xffffff); lbl.rotation.x = -Math.PI / 2; lbl.position.y = 0.98; cap.add(lbl); lbl.position.y = 0.28; }
const counters = ['x1', 'x2', 'x10', 'x58', 'x347'].map(s => { const m = text3d(s, 0.95, 0xffd23f, 4.0); scene.add(m); return m; });
const boxes = []; for (let i = 0; i < 60; i++) { const b = new THREE.Group(); const sz = 0.8 + (i % 3) * 0.25;
  const bx = mesh(new THREE.BoxGeometry(sz, sz * 0.8, sz), [0xc8955c, 0xb98550, 0xd6a46a][i % 3]); b.add(bx);
  const tape = mesh(new THREE.BoxGeometry(sz * 1.01, sz * 0.82, sz * 0.18), 0xe8d7b0); b.add(tape);
  b.userData = { i, sz }; scene.add(b); boxes.push(b); }
// box pile positions (deterministic mountain around the pumpkin)
boxes.forEach((b, i) => { const ring = Math.floor(i / 12), k = i % 12, a = k / 12 * Math.PI * 2 + ring * 0.4, r = 3.5 - ring * 0.5;
  b.userData.pile = new THREE.Vector3(Math.cos(a) * r, 0.4 + ring * 0.85, Math.sin(a) * r * 0.8); b.userData.rot = (i * 0.7) % 1.5; });
const cyber = text3d('CYBER MONDAY', 0.62, 0x3a86ff, 4.8); scene.add(cyber);
const noShop = text3d('NO MORE SHOPPING', 0.5, 0xe94f37, 4.8); scene.add(noShop);
const ding = text3d('DING DONG!', 0.75, 0xffd23f, 4.4); scene.add(ding);
const next = text3d('NEXT: CHRISTMAS?', 0.55, 0xffd23f, 4.8); scene.add(next);
const hat = new THREE.Group(); { const c = mesh(new THREE.ConeGeometry(0.5, 1.1, 24), 0xe02b2b); c.position.y = 0.55; c.rotation.z = -0.25; hat.add(c);
  const brim = mesh(new THREE.TorusGeometry(0.5, 0.13, 12, 32), 0xffffff); brim.rotation.x = Math.PI / 2; hat.add(brim);
  const pom = sph(0.17, 0xffffff); pom.position.set(0.28, 1.05, 0); hat.add(pom); }
gerald.userData.head.add(hat); hat.position.set(0, 0.4, 0);
const hearts = []; for (let i = 0; i < 6; i++) { const h = new THREE.Group(); [-0.15, 0.15].forEach(x => { const s = sph(0.2, 0xff006e); s.position.x = x; h.add(s); }); const c = mesh(new THREE.ConeGeometry(0.3, 0.45, 16), 0xff006e); c.rotation.z = Math.PI; c.position.y = -0.25; h.add(c); scene.add(h); hearts.push(h); }

const bgs = [gradientBg('#ffb86b', '#ffe6b0'), gradientBg('#3a1c71', '#7fd3ff'), gradientBg('#7fd3ff', '#e8f7ff'), gradientBg('#ff6b6b', '#ffe66d'), gradientBg('#9be7ff', '#fff6d6'), gradientBg('#ffb86b', '#fff2cc'), gradientBg('#0f3d2e', '#c1121f')];

// ---------- timeline ----------
const capEl = document.getElementById('cap');
const all = [pump, phone, button, ...counters, ...boxes, cyber, noShop, ding, next, hat, ...hearts];
const pileUp = (lt, from, dur) => boxes.forEach(b => { const d = from + b.userData.i / boxes.length * dur, u = lt - d; b.visible = u > 0;
  const p = b.userData.pile; b.position.set(p.x, Math.max(p.y, p.y + 9 - 0.5 * 20 * u * u), p.z); b.rotation.y = b.userData.rot; });
window.renderAt = t => {
  let si = 0; DATA.sceneStarts.forEach((s, i) => { if (t >= s) si = i; });
  const lt = t - DATA.sceneStarts[si];
  all.forEach(o => o.visible = false);
  scene.background = bgs[si];
  gerald.visible = true; gerald.position.set(0, 0, 0); gerald.rotation.set(0, 0, 0); gerald.scale.setScalar(1);
  (world.userData.clouds || []).forEach(c => { c.position.x = -14 + ((c.userData.i * 5 + t * 0.6) % 30); });
  const inPump = () => { pump.visible = true; pump.position.set(0, 0, 0); pump.scale.setScalar(1.25); gerald.position.set(0, 1.25, 0.2); gerald.scale.setScalar(0.9); };

  if (si === 0) { // swears off shopping
    inPump(); pose(t, { look: Math.sin(t * 4) * 0.5 }); gerald.userData.head.rotation.y = Math.sin(t * 7) * 0.45; // head shake "no"
    noShop.visible = lt > 1.5; noShop.position.set(0, 5.3, 0); noShop.scale.setScalar(back((lt - 1.5) / 0.5) * noShop.userData.fit);
    camera.position.set(0, 3.4, lerp(15, 13, ease(lt / 4))); camera.lookAt(0, 3.0, 0);
  } else if (si === 1) { // discovers the phone
    inPump(); pose(t, { bigEyes: lt > 0.8 ? 1.5 : 1, flap: lt > 1.2 ? 1 : 0 });
    phone.visible = true; phone.position.set(1.7, lerp(-1, 3.4, back((lt - 0.4) / 0.7)), 1.5); phone.rotation.set(0, -0.35 + Math.sin(t * 1.5) * 0.08, 0.08);
    cyber.visible = lt > 0.6; cyber.position.set(0, 5.6, 0); cyber.scale.setScalar(back((lt - 0.6) / 0.5) * cyber.userData.fit * (1 + 0.04 * Math.sin(t * 8)));
    camera.position.set(0.4, 3.5, 13); camera.lookAt(0.3, 3.1, 0);
  } else if (si === 2) { // calm, one little button
    inPump(); pose(t, {}); gerald.userData.head.rotation.x = 0.25;
    button.visible = true; button.position.set(0, 2.7, 2.6); button.rotation.x = 0.55; button.scale.setScalar(0.8 * back((lt - 2.2) / 0.5));
    hearts.forEach((h, i) => { const u = (lt * 0.6 + i / 6) % 1; h.visible = lt > 0.5; h.position.set(Math.sin(i * 2.1) * 2.2, 3.5 + u * 3, -0.5); h.scale.setScalar(0.6 * Math.sin(u * Math.PI)); });
    camera.position.set(0, 4.6, 12.5); camera.lookAt(0, 3.0, 0);
  } else if (si === 3) { // presses... a lot
    inPump(); pose(t, { flap: lt > 2.8 ? 1 : 0, bigEyes: lt > 2.8 ? 1.4 : 1 });
    button.visible = true; button.position.set(0, 2.7, 2.6); button.rotation.x = 0.55; button.scale.setScalar(0.8);
    const rate = lt < 1.2 ? 1 : lt < 2.6 ? 2.5 : 14; button.userData.cap.position.y = 0.7 - Math.max(0, Math.sin(lt * rate * Math.PI)) * 0.25;
    const ci = lt < 1.2 ? 0 : lt < 2.2 ? 1 : lt < 3.0 ? 2 : lt < 3.6 ? 3 : 4;
    counters.forEach((c, i) => { c.visible = i === ci; c.position.set(0, 5.7, 0); c.scale.setScalar(c.userData.fit * (1 + 0.12 * Math.abs(Math.sin(t * 10)))); });
    const shake = ci === 4 ? Math.sin(t * 50) * 0.05 : 0; camera.position.set(shake, 4.6 + shake, 12.5); camera.lookAt(0, 3.0, 0);
  } else if (si === 4) { // doorbell, first boxes land
    inPump(); pose(t, { look: Math.sin(t * 3) * 0.6 });
    ding.visible = lt > 0.2; ding.position.set(0, 5.6, 3.2); ding.scale.setScalar(back((lt - 0.2) / 0.4) * ding.userData.fit); ding.rotation.z = Math.sin(t * 18) * 0.08;
    pileUp(lt, 0.9, 6.0);
    camera.position.set(0, 3.8, 14); camera.lookAt(0, 2.8, 0);
  } else if (si === 5) { // mountain of boxes
    pileUp(lt + 1.8, 0.9, 2.6);
    pump.visible = true; pump.position.set(0, 0, 0); pump.scale.setScalar(1.25);
    pose(t, { look: Math.sin(t * 2) * 0.5 }); gerald.position.set(0, 3.3, 0); gerald.scale.setScalar(0.75);
    camera.position.set(Math.sin(lt * 0.4) * 3, lerp(5, 7, ease(lt / 3)), lerp(15, 17, ease(lt / 3))); camera.lookAt(0, 3.6, 0);
  } else { // Christmas teaser
    boxes.forEach(b => { b.visible = true; const p = b.userData.pile; b.position.copy(p); b.rotation.y = b.userData.rot; });
    pump.visible = true; pump.position.set(0, 0, 0); pump.scale.setScalar(1.25);
    pose(t, { wave: true }); gerald.position.set(0, 3.3 + back(lt / 0.5) * 0.5, 0); gerald.scale.setScalar(0.75);
    hat.visible = lt > 0.6; hat.scale.setScalar(back((lt - 0.6) / 0.4));
    phone.visible = true; phone.position.set(1.1, 6.0, 0.8); phone.rotation.set(0, -0.3, 0.1); phone.scale.setScalar(0.55);
    next.visible = lt > 1.4; next.position.set(0, 8.4, 0); next.scale.setScalar(back((lt - 1.4) / 0.5) * next.userData.fit);
    camera.position.set(0, 6.6, 16); camera.lookAt(0, 5.0, 0);
  }
  effect.render(scene, camera);
  const c = DATA.caps.find(c => t >= c[0] && t < c[1]); capEl.textContent = c ? c[2] : '';
};
window.ready = true;
