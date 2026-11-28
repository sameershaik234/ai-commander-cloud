// Toon-shaded cartoon: "Gerald's Black Friday". window.renderAt(t) draws time t deterministically.
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

// ---------- shared props ----------
function pumpkin() { const p = new THREE.Group();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const s = sph(1.3, 0xf28c28, 0.6, 1, 1); s.position.set(Math.cos(a) * 1.0, 1.25, Math.sin(a) * 1.0); s.rotation.y = -a; p.add(s); }
  const core = sph(1.45, 0xf5a03a, 1, 0.85, 1); core.position.y = 1.25; p.add(core);
  const stem = mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.6, 10), 0x4f8a2b); stem.position.y = 2.6; p.add(stem); return p; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function makePhone(l1, l2, big, col1, col2) { const phone = new THREE.Group(); phone.add(mesh(new THREE.BoxGeometry(1.5, 2.8, 0.18), 0x23232b));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 2.55), new THREE.MeshBasicMaterial({ map: canvasTex(264, 510, c => {
    const g = c.createLinearGradient(0, 0, 0, 510); g.addColorStop(0, col1); g.addColorStop(1, col2); c.fillStyle = g; c.fillRect(0, 0, 264, 510);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 40px DejaVu Sans'; c.fillText(l1, 132, 110); c.fillText(l2, 132, 155);
    c.fillStyle = '#ffd23f'; c.font = 'bold 70px DejaVu Sans'; c.fillText(big, 132, 260);
    c.fillStyle = '#ff3b4f'; c.beginPath(); c.roundRect(42, 360, 180, 80, 40); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 40px DejaVu Sans'; c.fillText('BUY', 132, 414); }) }));
  scr.position.z = 0.095; phone.add(scr); return phone; }
function makeBoxes(n, colors, ribbon) { const out = []; for (let i = 0; i < n; i++) { const b = new THREE.Group(); const sz = 0.8 + (i % 3) * 0.25;
  const plain = mesh(new THREE.BoxGeometry(sz, sz * 0.8, sz), colors ? colors[i % colors.length] : [0xc8955c, 0xb98550, 0xd6a46a][i % 3]); b.add(plain);
  const tape = mesh(new THREE.BoxGeometry(sz * 1.01, sz * 0.82, sz * 0.18), ribbon || 0xe8d7b0); b.add(tape);
  if (ribbon) { const t2 = mesh(new THREE.BoxGeometry(sz * 0.18, sz * 0.82, sz * 1.01), ribbon); b.add(t2); }
  b.userData = { i, sz }; scene.add(b); out.push(b); }
  out.forEach((b, i) => { const ring = Math.floor(i / 12), k = i % 12, a = k / 12 * Math.PI * 2 + ring * 0.4, r = 3.5 - ring * 0.5;
    b.userData.pile = new THREE.Vector3(Math.cos(a) * r, 0.4 + ring * 0.85, Math.sin(a) * r * 0.8); b.userData.rot = (i * 0.7) % 1.5; }); return out; }
function santaHat() { const hat = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(0.5, 1.1, 24), 0xe02b2b); c.position.y = 0.55; c.rotation.z = -0.25; hat.add(c);
  const brim = mesh(new THREE.TorusGeometry(0.5, 0.13, 12, 32), 0xffffff); brim.rotation.x = Math.PI / 2; hat.add(brim);
  const pom = sph(0.17, 0xffffff); pom.position.set(0.28, 1.05, 0); hat.add(pom); return hat; }
function partyHat() { const hat = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(0.38, 1.0, 24), 0x8338ec); c.position.y = 0.5; hat.add(c);
  for (let k = 0; k < 3; k++) { const d = mesh(new THREE.TorusGeometry(0.33 - k * 0.1, 0.04, 8, 24), 0xffd23f); d.rotation.x = Math.PI / 2; d.position.y = 0.15 + k * 0.3; hat.add(d); }
  const pom = sph(0.14, 0xffd23f); pom.position.y = 1.02; hat.add(pom); return hat; }
const snow = []; for (let i = 0; i < 140; i++) { const f = sph(0.07 + (i % 3) * 0.03, 0xffffff); f.castShadow = false; f.userData = { x: ((i * 37) % 160) / 10 - 8, z: ((i * 53) % 100) / 10 - 6, s: 0.6 + (i % 5) * 0.15, o: (i * 0.37) % 12 }; scene.add(f); snow.push(f); }
function showSnow(t, on) { snow.forEach(f => { f.visible = on; if (!on) return; const u = f.userData; f.position.set(u.x + Math.sin(t + u.o) * 0.4, 11 - ((t * u.s + u.o) % 11.5), u.z); }); }
const pump = pumpkin(); scene.add(pump);
function inPump(y = 1.25) { pump.visible = true; pump.position.set(0, 0, 0); pump.scale.setScalar(1.25); gerald.position.set(0, y, 0.2); gerald.scale.setScalar(0.9); }
const capEl = document.getElementById('cap');

const boxes = makeBoxes(60);
const gifts = makeBoxes(60, [0xe02b2b, 0x2a9d4a, 0x3a86ff, 0xffd23f], 0xffffff);
const hat = santaHat(); gerald.userData.head.add(hat); hat.position.set(0, 0.4, 0);
const bulb = new THREE.Group(); { const g = sph(0.45, 0xfff27a); g.material.emissive = new THREE.Color(0xffd23f); g.material.emissiveIntensity = 0.9; bulb.add(g);
  const base = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 16), 0x9aa0a6); base.position.y = -0.5; bulb.add(base); } scene.add(bulb);
const count = text3d('347 BOXES', 0.7, 0xffd23f, 4.4); scene.add(count);
const step = text3d('STEP 1: WRAP', 0.6, 0xffffff, 4.6); scene.add(step);
const roll = new THREE.Group(); { const r = mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 24), 0xe02b2b); r.rotation.z = Math.PI / 2; roll.add(r);
  const sheet = mesh(new THREE.BoxGeometry(2.3, 0.02, 2.0), 0xe02b2b); sheet.position.set(0, -0.3, 1.0); roll.add(sheet); } scene.add(roll);
const ribbons = []; for (let k = 0; k < 5; k++) { const r = mesh(new THREE.TorusGeometry(1.3 - Math.abs(k - 2) * 0.12, 0.1, 10, 40), [0xffd23f, 0x2a9d4a, 0xe02b2b][k % 3]); r.rotation.x = Math.PI / 2 + (k - 2) * 0.35; r.rotation.y = k * 0.5; scene.add(r); ribbons.push(r); }
const bow = new THREE.Group(); [-0.28, 0.28].forEach(x => { const l = sph(0.3, 0xffd23f, 1, 0.6, 0.4); l.position.x = x; bow.add(l); }); bow.add(sph(0.15, 0xffd23f)); scene.add(bow);
const oneGift = makeBoxes(1, [0x2a9d4a], 0xe02b2b)[0]; const oneTxt = text3d('1 / 347', 0.7, 0xffffff, 2.6); scene.add(oneTxt);
const tree = new THREE.Group(); { const tr = mesh(new THREE.CylinderGeometry(0.3, 0.4, 1, 12), 0x8b5a2b); tr.position.y = 0.5; tree.add(tr);
  [[2.2, 2.0, 1.6], [1.75, 1.8, 2.8], [1.25, 1.6, 3.9]].forEach(([r, h, y]) => { const c = mesh(new THREE.ConeGeometry(r, h, 24), 0x1f8a3b); c.position.y = y; tree.add(c); });
  const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? 0.2 : 0.45; k ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const st = mesh(new THREE.ExtrudeGeometry(star, { depth: 0.12, bevelEnabled: false }), new THREE.MeshToonMaterial({ color: 0xffd23f, gradientMap: grad, emissive: 0xffb000, emissiveIntensity: 0.8 })); st.position.y = 4.9; tree.add(st);
  tree.userData.lights = []; for (let k = 0; k < 22; k++) { const y = 1.2 + (k / 22) * 3.2, r = 2.0 - (k / 22) * 1.6, a = k * 2.4;
    const l = sph(0.11, [0xff3b4f, 0xffd23f, 0x3a86ff, 0xffffff][k % 4]); l.material.emissive = new THREE.Color([0xff3b4f, 0xffd23f, 0x3a86ff, 0xffffff][k % 4]); l.position.set(Math.cos(a) * r, y, Math.sin(a) * r); tree.add(l); tree.userData.lights.push(l); } } scene.add(tree);
const merry = text3d('MERRY CHRISTMAS', 0.6, 0xffffff, 4.8); scene.add(merry);
const next = text3d('NEXT: NEW YEAR?', 0.5, 0xffd23f, 4.4); scene.add(next);
const bgs = [gradientBg('#1b2a4a', '#9ecbff'), gradientBg('#ffb86b', '#ffe6b0'), gradientBg('#c1121f', '#ffd6d6'), gradientBg('#7fd3ff', '#e8f7ff'), gradientBg('#0b1d3a', '#6f8fbf'), gradientBg('#0b1d3a', '#6f8fbf'), gradientBg('#0f3d2e', '#c1121f')];
const all = [pump, bulb, count, step, roll, ...ribbons, bow, oneGift, oneTxt, tree, merry, next, ...boxes, ...gifts];
const pileShow = (arr, n = arr.length) => arr.forEach((b, i) => { b.visible = i < n; b.position.copy(b.userData.pile); b.rotation.y = b.userData.rot; });
window.renderAt = t => {
  let si = 0; DATA.sceneStarts.forEach((s, i) => { if (t >= s) si = i; });
  const lt = t - DATA.sceneStarts[si];
  all.forEach(o => o.visible = false); showSnow(t, si >= 4);
  scene.background = bgs[si];
  gerald.visible = true; gerald.position.set(0, 0, 0); gerald.rotation.set(0, 0, 0); gerald.scale.setScalar(1); hat.visible = true;
  (world.userData.clouds || []).forEach(c => { c.position.x = -14 + ((c.userData.i * 5 + t * 0.6) % 30); c.visible = si < 4; });
  if (si === 0) { // the problem: a mountain of boxes
    pileShow(boxes); pump.visible = true; pump.position.set(0, 0, 0); pump.scale.setScalar(1.25);
    pose(t, { look: Math.sin(t * 2) * 0.5 }); gerald.position.set(0, 3.3, 0); gerald.scale.setScalar(0.75);
    count.visible = lt > 1.5; count.position.set(0, 7.9, 0); count.scale.setScalar(back((lt - 1.5) / 0.5) * count.userData.fit);
    camera.position.set(Math.sin(lt * 0.3) * 2, 6.2, 16); camera.lookAt(0, 4.6, 0);
  } else if (si === 1) { // idea
    pose(t, { bigEyes: lt > 0.8 ? 1.35 : 1, flap: lt > 1.5 ? 1 : 0 }); gerald.position.set(0, 0, 1);
    bulb.visible = lt > 0.6; bulb.position.set(0, 5.2 + Math.sin(t * 3) * 0.1, 1); bulb.scale.setScalar(back((lt - 0.6) / 0.4)); bulb.children[0].material.emissiveIntensity = 0.6 + 0.4 * Math.abs(Math.sin(t * 6));
    pileShow(boxes, 20); boxes.forEach(b => b.position.z -= 4);
    camera.position.set(0, 3.3, 13.5); camera.lookAt(0, 3.1, 0);
  } else if (si === 2) { // step one: wrap
    pose(t, { look: 0.3 }); gerald.position.set(-1.4, 0, 1); gerald.rotation.y = 0.5;
    roll.visible = true; roll.position.set(1.2, 1.0, 1.2); roll.rotation.y = Math.sin(t * 2) * 0.2;
    step.visible = lt > 0.3; step.position.set(0, 5.6, 0); step.scale.setScalar(back((lt - 0.3) / 0.5) * step.userData.fit);
    pileShow(boxes, 12); boxes.forEach(b => b.position.z -= 4);
    camera.position.set(0, 3.3, 12.5); camera.lookAt(0, 2.8, 0);
  } else if (si === 3) { // wrapped himself
    pose(t, { flap: 0.3, bigEyes: 1.2 }); gerald.position.set(-0.7, 0, 0.6); gerald.rotation.z = Math.sin(t * 5) * 0.06;
    ribbons.forEach((r, k) => { r.visible = lt > 0.8 + k * 0.25; r.position.set(-0.7, 1.2 + k * 0.38, 0.6); });
    bow.visible = lt > 2.2; bow.position.set(-0.7, 3.5, 1.2); bow.scale.setScalar(back((lt - 2.2) / 0.4));
    oneGift.visible = true; oneGift.position.set(1.6, 0.5, 1); oneGift.rotation.y = 0.4; oneGift.scale.setScalar(1.3);
    oneTxt.visible = lt > 0.4; oneTxt.position.set(1.5, 2.4, 1); oneTxt.scale.setScalar(back((lt - 0.4) / 0.4) * oneTxt.userData.fit);
    camera.position.set(0, 3.2, 14); camera.lookAt(0.1, 2.6, 0);
  } else if (si === 4) { // snow begins
    pose(t, { look: 0.0, bigEyes: 1.3 }); gerald.userData.head.rotation.x = -0.5; gerald.position.set(0, 0, 1);
    tree.visible = lt > 0.8; tree.position.set(-2.4, 0, -2); tree.scale.setScalar(back((lt - 0.8) / 0.6));
    tree.userData.lights.forEach((l, k) => l.material.emissiveIntensity = (Math.floor(t * 3 + k) % 2) ? 1.2 : 0.2);
    camera.position.set(0, 3.0, 12.5); camera.lookAt(0, 3.2, 0);
  } else if (si === 5) { // better than shopping
    pose(t, { dance: 0.6, flap: 0.6 }); gerald.position.set(0.8, 0, 1); gerald.rotation.y = Math.sin(t * 2) * 0.4;
    tree.visible = true; tree.position.set(-2.4, 0, -2); tree.scale.setScalar(1); tree.userData.lights.forEach((l, k) => l.material.emissiveIntensity = (Math.floor(t * 3 + k) % 2) ? 1.2 : 0.2);
    pileShow(gifts, 14); gifts.forEach(b => { b.position.multiplyScalar(0.5); b.position.x -= 2.4; b.position.z -= 0.5; b.position.y = b.userData.sz * 0.4; });
    camera.position.set(Math.sin(lt * 0.3), 3.2, 12.5); camera.lookAt(-0.4, 3.0, 0);
  } else { // merry christmas
    pose(t, { wave: true }); gerald.position.set(0.8, 0, 1);
    tree.visible = true; tree.position.set(-2.2, 0, -2); tree.scale.setScalar(1); tree.userData.lights.forEach((l, k) => l.material.emissiveIntensity = (Math.floor(t * 4 + k) % 2) ? 1.3 : 0.2);
    pileShow(gifts, 14); gifts.forEach(b => { b.position.multiplyScalar(0.5); b.position.x -= 2.2; b.position.z -= 0.5; b.position.y = b.userData.sz * 0.4; });
    merry.visible = lt > 0.2; merry.position.set(0, 6.4, 0); merry.scale.setScalar(back((lt - 0.2) / 0.5) * merry.userData.fit);
    next.visible = lt > 1.8; next.position.set(0, 5.6, 0); next.scale.setScalar(back((lt - 1.8) / 0.5) * next.userData.fit);
    camera.position.set(0, 3.6, 14); camera.lookAt(0, 3.6, 0);
  }
  effect.render(scene, camera);
  const c = DATA.caps.find(c => t >= c[0] && t < c[1]); capEl.textContent = c ? c[2] : '';
};
window.ready = true;
