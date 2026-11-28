// Deterministic three.js scenes for "Why is it called Black Friday?" — window.renderAt(t) draws time t.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1080, H = 1920;
const DATA = await (await fetch('data.json')).json();
const font = new FontLoader().parse(await (await fetch('./node_modules/three/examples/fonts/helvetiker_bold.typeface.json')).json());
document.getElementById('title').textContent = DATA.title;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 400);

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const back = x => { x = clamp(x); const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, ...o });
const shadow = m => { m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
function gradient(top, bottom) {
  const c = document.createElement('canvas'); c.width = 2; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function text3d(str, size, material, maxW = 0) {
  const g = new TextGeometry(str, { font, size, depth: size * 0.35, curveSegments: 6, bevelEnabled: true,
    bevelThickness: size * 0.05, bevelSize: size * 0.035, bevelSegments: 3 });
  g.center(); g.computeBoundingBox();
  const m = new THREE.Mesh(g, material.isMaterial ? material : mat(material));
  m.userData.fit = 1;
  if (maxW) { const w = g.boundingBox.max.x - g.boundingBox.min.x; if (w > maxW) m.userData.fit = maxW / w; }
  m.scale.setScalar(m.userData.fit);
  return shadow(m);
}
function person(color) {
  const p = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 6, 12), mat(color)); body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), mat(0xf1c27d)); head.position.y = 1.45;
  p.add(body, head); return shadow(p);
}
function car(color) {
  const c = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.55, 3.2, 3, 0.12), mat(color, { metalness: 0.5, roughness: 0.3 }));
  body.position.y = 0.5;
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.5, 1.6, 3, 0.12), mat(0x223344, { metalness: 0.6, roughness: 0.15 }));
  cab.position.set(0, 0.95, -0.1);
  c.add(body, cab);
  for (const [x, z] of [[-0.8, 1], [0.8, 1], [-0.8, -1], [0.8, -1]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), mat(0x111111));
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.3, z); c.add(w);
  }
  return shadow(c);
}
function bag(color) {
  const b = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.5), mat(color, { roughness: 0.6 })); body.position.y = 0.6;
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 20, Math.PI), mat(0x222222)); h.position.y = 1.2;
  b.add(body, h); return shadow(b);
}
function gift(color, ribbon) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), mat(color)));
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.82, 0.16), mat(ribbon, { metalness: 0.6 }));
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.82, 1.02), mat(ribbon, { metalness: 0.6 }));
  g.add(r1, r2); return shadow(g);
}
function ground(color, size = 80) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat(color, { roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function heroText(lines, size, maxW = 6.2) {
  const grp = new THREE.Group(); const glow = new THREE.MeshStandardMaterial({ color: 0xffd84d, emissive: 0xffb000, emissiveIntensity: 1.4 });
  lines.forEach((str, i) => {
    const y = ((lines.length - 1) / 2 - i) * size * 1.35;
    const front = text3d(str, size, mat(0x16161c, { metalness: 0.7, roughness: 0.28 }), maxW);
    const back_ = text3d(str, size, glow, maxW); back_.scale.multiplyScalar(1.045); back_.position.z = -0.18;
    front.position.y = back_.position.y = y; grp.add(back_, front);
  });
  return grp;
}
const _dir = new THREE.Vector3();
function placeInFront(obj, dist, dy = 0) {
  camera.updateMatrixWorld(); camera.getWorldDirection(_dir);
  obj.position.copy(camera.position).addScaledVector(_dir, dist); obj.position.y += dy; obj.quaternion.copy(camera.quaternion);
}
const BLACKTEXT = () => mat(0x0b0b0f, { metalness: 0.85, roughness: 0.22 });
const GOLD = () => mat(0xffc933, { metalness: 0.9, roughness: 0.25 });

// ---------- global lights ----------
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x202030, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(6, 14, 10); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 60 });
scene.add(sun);
const red = new THREE.PointLight(0xff2030, 0, 30), blue = new THREE.PointLight(0x2060ff, 0, 30);
scene.add(red, blue);

const S = []; // scenes: {group, bg, update(lt, t)}
function addScene(bg, build) { const group = new THREE.Group(); group.visible = false; scene.add(group); const s = { group, bg, ...build(group) }; S.push(s); }
const L = i => DATA.lines[i].start; // global line start

// 0 — dawn queue outside a store
addScene(gradient('#2a1b4a', '#ff9a55'), g => {
  g.add(ground(0x3a3a44));
  const walk = new THREE.Mesh(new THREE.BoxGeometry(60, 0.15, 3), mat(0x777788)); walk.position.set(0, 0.07, -1); walk.receiveShadow = true; g.add(walk);
  const cols = [0x2b3a67, 0x5e2c3d, 0x1f4e5f, 0x3d2c5e, 0x2c5e3d, 0x6b4f2a];
  for (let i = 0; i < 12; i++) {
    const h = 5 + ((i * 37) % 6); const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, h, 3), mat(cols[i % 6]));
    b.position.set(-20 + i * 3.4, h / 2, -4.2); g.add(shadow(b));
    for (let wy = 1.3; wy < h - 0.6; wy += 1.3) for (let wx = -1; wx <= 1; wx++) {
      const lit = (i * 7 + Math.round(wy * 3) + wx * 5) % 3 === 0;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb347, emissiveIntensity: lit ? 1.4 : 0.08 }));
      w.position.set(b.position.x + wx, wy, -2.69); g.add(w);
    }
  }
  const sign = text3d('SALE', 1.0, mat(0xff3355, { emissive: 0xff1133, emissiveIntensity: 1.2 })); sign.position.set(2, 6.2, -2.4); g.add(sign);
  const people = [], pc = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x8ab17d, 0x6d597a, 0x4ea8de, 0xf4a261];
  for (let i = 0; i < 18; i++) { const p = person(pc[i % 7]); p.position.set(1 - i * 1.05, 0.15, -1 + ((i * 13) % 5 - 2) * 0.06); g.add(p); people.push(p); }
  const tags = [];
  for (let i = 0; i < 7; i++) { const tg = text3d(['-50%', '-70%', '-40%', '$9', '-60%', 'DEAL', '-80%'][i], 0.45, mat(0xffd84d, { emissive: 0x664400 })); g.add(tg); tags.push(tg); }
  const title = heroText(['BLACK', 'FRIDAY'], 0.62, 3.3); g.add(title);
  return {
    update(lt, t) {
      const d = ease(lt / 7.2);
      const cx = lerp(-14, -1.5, d);
      camera.position.set(cx + 3.2, lerp(1.4, 2.6, d), lerp(6.5, 9.5, d)); camera.lookAt(cx - 1.2, 2.2, -1.5);
      people.forEach((p, i) => { p.position.y = 0.15 + Math.abs(Math.sin(t * 3 + i)) * 0.05; p.rotation.y = Math.sin(t * 0.8 + i) * 0.3; });
      tags.forEach((tg, i) => {
        const u = lt - 1.0 - i * 0.65; tg.visible = u > 0 && lt < L(1) - L(0) + 0.3;
        const y = Math.max(0.4, 9 - 9.8 * u * u * 0.5);
        tg.position.set(cx - 3.5 + (i % 4) * 1.6, y, 1.2 + (i % 3) * 0.6); tg.rotation.set(u * 2, u * 3 + i, 0);
      });
      const u = lt - (L(1) - L(0)); title.visible = u > 0;
      placeInFront(title, 7, lerp(6, 0.35, back(u / 0.7)));
      sun.color.set(0xffd2a0); hemi.intensity = 1.1;
    }
  };
});

// 1 — the "red to black" ledger myth
addScene(gradient('#0d1326', '#1d2b4f'), g => {
  g.add(ground(0x121a30));
  const zero = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.04, 1.0), mat(0xffffff, { emissive: 0x888888 })); zero.position.y = 3; g.add(zero);
  const bars = [];
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.7), mat(0xd62839, { roughness: 0.35 }));
    b.position.x = -2.75 + i * 0.5; g.add(shadow(b)); bars.push(b);
  }
  const inRed = text3d('IN THE RED', 0.55, mat(0xff3b4f, { emissive: 0x550011 }), 4.4); inRed.position.set(0, 1.7, 2.2); g.add(inRed);
  const inBlack = heroText(['IN THE BLACK'], 0.55, 4.6); inBlack.position.set(0, 7.7, 0.5); g.add(inBlack);
  const myth = text3d('MYTH?', 1.5, mat(0xffd84d, { emissive: 0x806000, emissiveIntensity: 0.6, metalness: 0.4 })); myth.position.set(0, 4.8, 3.5); myth.userData.fit = Math.min(myth.userData.fit, 3.2 / (myth.geometry.boundingBox.max.x - myth.geometry.boundingBox.min.x)); g.add(myth);
  return {
    update(lt, t) {
      const neg = [1.2, 1.6, 1.0, 1.8, 1.4, 1.1, 1.7, 1.3, 1.5, 1.2, 0.9];
      bars.forEach((b, i) => {
        if (i < 11) { const h = neg[i] * ease((lt - 0.3 - i * 0.12) / 0.5) + 0.001; b.scale.y = h; b.position.y = 3 - h / 2; }
        else {
          const h = 4.2 * back((lt - 4.2) / 0.9) + 0.001; b.scale.y = h; b.position.y = 3 + h / 2;
          b.material = lt > 4.2 ? BLACK_BAR : b.material;
        }
      });
      inRed.visible = lt > 1.2; inRed.scale.setScalar(back((lt - 1.2) / 0.4) * inRed.userData.fit);
      inBlack.visible = lt > 4.8;
      const m = lt - (L(3) - L(2)); myth.visible = m > 0; if (m > 0) { const s = back(m / 0.5); myth.scale.setScalar(s * myth.userData.fit); }
      const a = 0.4 + lt * 0.04;
      camera.position.set(Math.sin(a) * 13, 6.2, Math.cos(a) * 13); camera.lookAt(0, 4.2, 0);
      if (m > 0) { placeInFront(myth, 6.5, 0.2); myth.rotateY(Math.sin(t * 2) * 0.25); }
      inRed.quaternion.copy(camera.quaternion); inBlack.quaternion.copy(camera.quaternion);
    }
  };
});
const BLACK_BAR = mat(0x0b0b0f, { metalness: 0.85, roughness: 0.2 });

// 2 — Philadelphia, Liberty Bell, Army–Navy football
addScene(gradient('#3b2a1a', '#d9a066'), g => {
  g.add(ground(0x5a4632));
  const pts = [];
  const prof = [[0.0, 3.0], [0.35, 3.0], [0.55, 2.85], [0.75, 2.5], [0.9, 2.0], [1.05, 1.4], [1.25, 0.9], [1.55, 0.45], [1.75, 0.15], [1.8, 0.0], [1.7, 0.0]];
  prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  const bell = new THREE.Group();
  const bronze = mat(0x8c6a3f, { metalness: 0.85, roughness: 0.32 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), bronze); body.material.side = THREE.DoubleSide; bell.add(body);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.76, 0.08, 10, 64), bronze); lip.rotation.x = Math.PI / 2; lip.position.y = 0.05; bell.add(lip);
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), mat(0x1a1208)); crack.position.set(0.05, 1.1, 1.3); crack.rotation.z = 0.12; crack.rotation.x = -0.35; bell.add(crack);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 0.5), mat(0x5b3a1e, { roughness: 0.8 })); yoke.position.y = 3.25; bell.add(yoke);
  shadow(bell); bell.position.y = 1.1; g.add(bell);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 2), mat(0x8a8a8a, { roughness: 0.7 })); ped.position.y = 0.55; g.add(shadow(ped));
  const city = text3d('PHILADELPHIA', 0.8, mat(0xffffff, { roughness: 0.3 }), 6.6); city.position.set(0, 7.0, 0); g.add(city);
  const yrs = text3d('1950s - 60s', 0.7, GOLD(), 5.2); yrs.position.set(0, 5.9, 0); g.add(yrs);
  const ball = new THREE.Group();
  const lb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), mat(0x7a3b16, { roughness: 0.6 })); lb.scale.set(1, 0.62, 0.62); ball.add(lb);
  const lace = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), mat(0xffffff)); lace.position.set(0, 0.31, 0); ball.add(lace);
  shadow(ball); g.add(ball);
  const vs = text3d('ARMY vs NAVY', 0.6, mat(0xffffff, { emissive: 0x223355, metalness: 0.3 }), 6); vs.position.set(0, 5.9, 0); g.add(vs);
  return {
    update(lt, t) {
      bell.rotation.y = lt * 0.35;
      city.visible = lt > 0.2; city.scale.setScalar(back((lt - 0.2) / 0.5) * city.userData.fit);
      yrs.visible = lt > 0.9 && !(lt - (L(5) - L(4)) > 1.5);
      const u = lt - (L(5) - L(4));
      ball.visible = u > 0 && u < 3.0;
      ball.position.set(lerp(-6, 6, u / 3.0), 3 + Math.sin(clamp(u / 3.0) * Math.PI) * 3.5, 2); ball.rotation.set(0, 0, u * 7);
      vs.visible = u > 1.5;
      camera.position.set(Math.sin(lt * 0.08) * 2, 3.6, 13.5); camera.lookAt(0, 3.4, 0);
    }
  };
});

// 3 — traffic jam + police
addScene(gradient('#0a0f1f', '#2b1d3a'), g => {
  g.add(ground(0x26262e));
  for (let z = -30; z < 12; z += 3) for (const x of [-1.25, 1.25]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 1.4), mat(0xffffff, { emissive: 0x666666 })); m.position.set(x, 0.01, z); g.add(m);
  }
  const cars = [], cc = [0xe63946, 0x457b9d, 0xf1faee, 0xffb703, 0x2a9d8f, 0x8338ec, 0xfb8500];
  for (let r = 0; r < 7; r++) for (let l = -1; l <= 1; l++) {
    if (r === 0 && l === 0) continue;
    const c = car(cc[(r * 3 + l + 7) % 7]); c.position.set(l * 2.5, 0, -r * 3.8 + 2); g.add(c); cars.push(c);
  }
  const cop = car(0xf5f5f5); cop.position.set(0, 0, 2); g.add(cop);
  const lr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 }));
  const lbb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), new THREE.MeshStandardMaterial({ color: 0x0044ff, emissive: 0x0044ff }));
  lr.position.set(-0.3, 1.3, -0.1); lbb.position.set(0.3, 1.3, -0.1); cop.add(lr, lbb);
  const crowd = [];
  for (let i = 0; i < 24; i++) { const p = person([0xe76f51, 0x2a9d8f, 0xe9c46a, 0x6d597a][i % 4]); p.position.set((i % 2 ? 1 : -1) * (4.6 + (i % 3) * 0.6), 0, 3 - Math.floor(i / 2) * 2.2); g.add(p); crowd.push(p); }
  const title = heroText(['BLACK', 'FRIDAY'], 1.1); g.add(title);
  return {
    update(lt, t) {
      const on = Math.floor(t * 6) % 2 === 0;
      lr.material.emissiveIntensity = on ? 3 : 0.1; lbb.material.emissiveIntensity = on ? 0.1 : 3;
      red.position.set(-1, 3, 3); blue.position.set(1, 3, 3); red.intensity = on ? 60 : 4; blue.intensity = on ? 4 : 60;
      cars.forEach((c, i) => { c.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.03; });
      crowd.forEach((p, i) => { p.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.08; });
      const d = ease(lt / 4);
      camera.position.set(lerp(3, 0, d), lerp(15, 8.5, d), lerp(4, 13, d)); camera.lookAt(0, lerp(0, 2.5, d), lerp(-6, -1, d));
      const u = lt - (L(7) - L(6)) - 1.6; title.visible = u > 0;
      placeInFront(title, 13, lerp(9, 1.2, back(u / 0.6)));
    }
  };
});

// 4 — "BIG FRIDAY" rebrand collapses
addScene(gradient('#1a0f2e', '#4a2a6a'), g => {
  g.add(ground(0x2a1f3a));
  const word = 'BIG FRIDAY', letters = [];
  const m = mat(0x4cd964, { emissive: 0x0f6b2a, emissiveIntensity: 0.6, metalness: 0.3 });
  let x = 0; const size = 0.95;
  for (const ch of word) {
    if (ch === ' ') { x += size * 0.55; continue; }
    const geo = new TextGeometry(ch, { font, size, depth: size * 0.35, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 });
    geo.computeBoundingBox(); const w = geo.boundingBox.max.x - geo.boundingBox.min.x; geo.translate(-w / 2, -size / 2, 0);
    const mesh = shadow(new THREE.Mesh(geo, m)); mesh.userData.x = x + w / 2; x += w + size * 0.12; g.add(mesh); letters.push(mesh);
  }
  const k = Math.min(1, 5.2 / x); letters.forEach(l => { l.userData.x = (l.userData.x - x / 2) * k; l.userData.k = k; });
  return {
    update(lt, t) {
      const pop = back((lt - 1.2) / 0.6), fall = lt - 3.6;
      letters.forEach((l, i) => {
        l.visible = lt > 1.2;
        const f = fall - i * 0.07;
        if (f <= 0) { l.position.set(l.userData.x, 4.5 + Math.sin(t * 3 + i) * 0.08, 0); l.rotation.set(0, 0, 0); l.scale.setScalar(pop * l.userData.k); }
        else {
          const y = Math.max(0.5, 4.5 - 0.5 * 12 * f * f);
          l.position.set(l.userData.x + f * (i - 4) * 0.5, y, f * 1.2); l.rotation.set(Math.min(f * 4, Math.PI / 2), 0, (i - 4) * f * 0.5); l.scale.setScalar(l.userData.k);
        }
      });
      camera.position.set(0, 4.4, 12); camera.lookAt(0, 3.6, 0);
    }
  };
});

// 5 — red ink turning black, 1980s
addScene(gradient('#121212', '#3a3a46'), g => {
  g.add(ground(0x1d1d24));
  const stacks = [], coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.14, 32);
  for (let s = 0; s < 5; s++) { const grp = new THREE.Group(); grp.position.set(-2.4 + s * 1.2, 0, 0); g.add(grp); stacks.push(grp);
    for (let k = 0; k < 4 + s * 4; k++) { const c = shadow(new THREE.Mesh(coinGeo, GOLD())); c.position.y = 0.07 + k * 0.15; c.rotation.y = k; c.visible = false; grp.add(c); } }
  const redInk = text3d('RED INK', 1.0, mat(0xe63946, { emissive: 0x4a0010 }), 5.0); redInk.position.set(0, 6.4, 0); g.add(redInk);
  const blackInk = heroText(['BLACK INK'], 1.0, 5.0); blackInk.position.set(0, 6.4, 0); g.add(blackInk);
  const eighties = text3d('1980s', 1.3, mat(0xff4fd8, { emissive: 0x7a1066, emissiveIntensity: 0.9, metalness: 0.4 })); eighties.position.set(0, 4.3, 1); g.add(eighties);
  return {
    update(lt, t) {
      stacks.forEach((grp, s) => grp.children.forEach((c, k) => { c.visible = lt > 0.3 + s * 0.25 + k * 0.05; }));
      const sw = 2.6; redInk.visible = lt < sw; blackInk.visible = lt >= sw;
      const r = lt < sw ? 0 : back((lt - sw) / 0.4); blackInk.rotation.x = (1 - r) * Math.PI / 2;
      const e = lt - 4.3; eighties.visible = e > 0; if (e > 0) { eighties.scale.setScalar(back(e / 0.5)); eighties.rotation.y = Math.sin(t * 1.5) * 0.3; }
      camera.position.set(Math.sin(lt * 0.15) * 2.5, 4.6, 12.5); camera.lookAt(0, 3.8, 0);
    }
  };
});

// 6 — global + phones
addScene(gradient('#020617', '#0b2447'), g => {
  const R = 2.6;
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), mat(0x0b2a5a, { emissive: 0x06142e, roughness: 0.6 }));
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(R, 24, 16)), new THREE.LineBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.55 }));
  const globe = new THREE.Group(); globe.add(core, wire); globe.position.y = 5.2; g.add(globe);
  const cities = [[43.7, -79.4], [49.3, -123.1], [40.7, -74.0], [34.0, -118.2], [51.5, -0.1], [45.5, -73.6], [41.9, -87.6], [-33.9, 151.2]];
  const pins = cities.map(([la, lo]) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd84d, emissive: 0xffb000, emissiveIntensity: 2 }));
    const phi = (90 - la) * Math.PI / 180, th = (lo + 180) * Math.PI / 180;
    p.position.set(-R * Math.sin(phi) * Math.cos(th), R * Math.cos(phi), R * Math.sin(phi) * Math.sin(th)); globe.add(p); return p;
  });
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(2.3, 4.5, 0.25, 4, 0.22), mat(0x111114, { metalness: 0.8, roughness: 0.25 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 4.15), new THREE.MeshBasicMaterial({ map: canvasTex(410, 830, c => {
    const gr = c.createLinearGradient(0, 0, 0, 830); gr.addColorStop(0, '#ff3355'); gr.addColorStop(1, '#5b1aa8'); c.fillStyle = gr; c.fillRect(0, 0, 410, 830);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 64px DejaVu Sans'; c.fillText('BLACK', 205, 220); c.fillText('FRIDAY', 205, 295);
    c.fillStyle = '#ffd84d'; c.font = 'bold 120px DejaVu Sans'; c.fillText('-70%', 205, 480);
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(75, 600, 260, 90, 45); c.fill(); c.fillStyle = '#5b1aa8'; c.font = 'bold 44px DejaVu Sans'; c.fillText('BUY NOW', 205, 660);
  }) }));
  scr.position.z = 0.13; phone.add(scr); shadow(phone); g.add(phone);
  return {
    update(lt, t) {
      globe.rotation.y = 1.9 + lt * 0.25; globe.rotation.x = 0.35;
      pins.forEach((p, i) => { const s = back((lt - 0.6 - i * 0.3) / 0.35); p.scale.setScalar(s * (1 + 0.2 * Math.sin(t * 6 + i))); });
      const u = lt - 3.6; phone.visible = u > 0;
      phone.position.set(1.6, lerp(-4, 2.4, back(u / 0.8)), 3.2); phone.rotation.set(-0.15, -0.35 + Math.sin(t) * 0.08, 0.06);
      camera.position.set(0, 4.2, 12.5); camera.lookAt(0, 4.0, 0);
    }
  };
});

// 7 — finale: bags rain + police lights
addScene(gradient('#07070c', '#2a0f1c'), g => {
  g.add(ground(0x18181f));
  const items = [], bc = [0xe63946, 0xffb703, 0x2a9d8f, 0x8338ec, 0xffffff, 0xfb8500];
  for (let i = 0; i < 26; i++) {
    const it = i % 3 === 0 ? gift(bc[i % 6], 0xffd84d) : bag(bc[(i * 5) % 6]);
    it.userData = { x: ((i * 53) % 13) - 6, z: ((i * 31) % 7) - 4, d: (i * 0.17) % 3.2, r: i };
    g.add(it); items.push(it);
  }
  const title = heroText(['BLACK', 'FRIDAY'], 1.1); g.add(title);
  const badge = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? 0.45 : 1.0; k ? badge.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : badge.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const star = shadow(new THREE.Mesh(new THREE.ExtrudeGeometry(badge, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }), GOLD()));
  g.add(star);
  return {
    update(lt, t) {
      items.forEach(it => { const u = lt - it.userData.d; it.visible = u > 0;
        it.position.set(it.userData.x, Math.max(0, 12 - 0.5 * 14 * u * u), it.userData.z); it.rotation.y = it.userData.r + (u > 0 ? Math.min(u, 1.2) * 3 : 0); });
      const on = Math.floor(t * 6) % 2 === 0;
      red.position.set(-4, 5, 4); blue.position.set(4, 5, 4); red.intensity = on ? 90 : 6; blue.intensity = on ? 6 : 90;
      camera.position.set(Math.sin(lt * 0.2) * 2, 5.2, lerp(15, 13, ease(lt / 4))); camera.lookAt(0, 4.6, 0);
      placeInFront(title, 13, 1.6 + Math.sin(t * 2) * 0.08);
      placeInFront(star, 10, -1.6); star.rotateY(t * 1.6); star.scale.setScalar(back((lt - 1.0) / 0.5) * 0.8);
    }
  };
});

// ---------- timeline ----------
const capEl = document.getElementById('cap');
window.renderAt = t => {
  let si = 0; DATA.sceneStarts.forEach((s, i) => { if (t >= s) si = i; });
  red.intensity = 0; blue.intensity = 0; sun.color.set(0xffffff); hemi.intensity = 1.1;
  S.forEach((s, i) => s.group.visible = i === si);
  scene.background = S[si].bg;
  S[si].update(t - DATA.sceneStarts[si], t);
  renderer.render(scene, camera);
  const c = DATA.caps.find(c => t >= c[0] && t < c[1]);
  capEl.textContent = c ? c[2] : '';
  return si;
};
window.ready = true;
