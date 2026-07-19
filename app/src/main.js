import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { buildApartment } from './apartment.js';
import { CATALOG } from './furniture.js';
import { Interactions } from './interact.js';
import { MeasureTool } from './measure.js';
import { pointInPoly } from './plan.js';
import { skyTexture, towerTexture } from './textures.js';

const CENTER = new THREE.Vector3(14.2, 0, 20);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdde7ef, 500, 1500);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 3000);
camera.position.set(52, 40, 66);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(CENTER).setY(2);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minDistance = 3;
controls.maxDistance = 260;

// ---------- environment ----------
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }));
  scene.add(sky);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ color: 0x71767c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -285;
  scene.add(ground);

  // the tower continues below this unit
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(46, 284, 52),
    new THREE.MeshStandardMaterial({ color: 0x9aa4ab, roughness: 0.7, metalness: 0.3 }));
  shaft.position.set(14, -142.7, 20);
  scene.add(shaft);

  // neighboring towers (positions are [x, z, w, d, h, seed])
  const towers = [
    [-160, -120, 70, 70, 380, 3], [40, -220, 90, 60, 460, 4], [190, -150, 60, 60, 300, 5],
    [230, 40, 75, 75, 520, 6], [180, 190, 55, 55, 260, 7], [-40, 260, 85, 60, 340, 8],
    [-210, 120, 60, 80, 420, 9], [-260, -40, 70, 55, 300, 10], [120, -320, 110, 80, 560, 11],
    [340, -80, 80, 80, 380, 12], [-120, 380, 90, 70, 300, 13], [420, 160, 70, 70, 450, 14],
  ];
  for (const [x, z, w, d, h, seed] of towers) {
    const floors = Math.round(h / 12), bays = Math.round(w / 6);
    const mat = new THREE.MeshStandardMaterial({ map: towerTexture(seed, Math.min(floors, 40), Math.min(bays, 14)), roughness: 0.6, metalness: 0.25 });
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    t.position.set(x, h / 2 - 285, z);
    scene.add(t);
  }
}

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xcadfee, 0x8f8574, 0.85));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
sun.position.set(75, 95, -55);
sun.target.position.copy(CENTER);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -55;
sun.shadow.camera.far = 300;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
scene.add(new THREE.AmbientLight(0xfff6e8, 0.25));

// ---------- apartment ----------
const world = buildApartment(scene);

// grid
const grid = new THREE.GridHelper(64, 64, 0x777777, 0xaaaaaa);
grid.material.transparent = true;
grid.material.opacity = 0.3;
grid.position.set(14, 0.03, 20);
grid.visible = false;
scene.add(grid);

// ---------- interactions ----------
const STORAGE = 'aqua3d.layout.v5';
let saveTimer = null;
const interactions = new Interactions({
  scene, camera, dom: renderer.domElement, controls,
  world: { obstacles: world.obstacles, balconyPoly: world.balconyPoly },
  onChange: () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE, JSON.stringify(interactions.serialize()));
    }, 400);
  },
});

// ---------- camera views ----------
const VIEWS = {
  overview: { pos: [52, 40, 66], tgt: [14.2, 2, 20] },
  top: { pos: [14.2, 82, 20.6], tgt: [14.2, 0, 20] },
  living: { pos: [13.0, 6.0, 13.6], tgt: [23.5, 2.2, 2.5] },
  master: { pos: [10.6, 5.8, 2.0], tgt: [3.0, 2.8, 12.5] },
  kitchen: { pos: [13.2, 5.4, 18.3], tgt: [26, 3.2, 17.8] },
  bed2: { pos: [14.2, 5.8, 31.4], tgt: [24, 2.8, 38] },
  balcony: { pos: [20.0, 5.8, -2.2], tgt: [30, 2.5, 12] },
};
let camAnim = null;
function goView(name) {
  if (walk.on) return;
  const v = VIEWS[name];
  camAnim = {
    t: 0,
    p0: camera.position.clone(), p1: new THREE.Vector3(...v.pos),
    t0: controls.target.clone(), t1: new THREE.Vector3(...v.tgt),
  };
}

// ---------- measure tool ----------
const measure = new MeasureTool({
  scene, camera, dom: renderer.domElement,
  pickTargets: [world.group, interactions.group],
});
let measureOn = false;
function setMeasure(on) {
  measureOn = on;
  measure.setActive(on);
  document.getElementById('t-measure').classList.toggle('on', on);
  interactions.enabled = !on && !walk.on;
  if (on) interactions.deselect();
}

// ---------- walk mode ----------
const EYE = 5.2, WALK_R = 0.25;
const walk = { on: false, yaw: 0, pitch: 0, keys: new Set(), prev: null, ceilWas: false };
function walkable(x, z) {
  const inUnit = x > 0.85 && x < 27.56 && z > 0.85 && z < 39.4;
  if (!inUnit && !pointInPoly(x, z, world.balconyPoly)) return false;
  for (const r of world.obstacles) {
    if (x > r.x0 - WALK_R && x < r.x1 + WALK_R && z > r.z0 - WALK_R && z < r.z1 + WALK_R) return false;
  }
  return true;
}
const hintsEl = document.getElementById('hints');
let hintsHome = null;
function setWalk(on) {
  if (on === walk.on) return;
  if (hintsHome === null) hintsHome = hintsEl.innerHTML;
  walk.on = on;
  document.getElementById('t-walk').classList.toggle('on', on);
  if (on && measureOn) setMeasure(false);
  interactions.enabled = !on && !measureOn;
  if (on) {
    interactions.deselect();
    walk.prev = { pos: camera.position.clone(), tgt: controls.target.clone() };
    walk.ceilWas = world.ceilingGroup.visible;
    world.ceilingGroup.visible = true;
    controls.enabled = false;
    camAnim = null;
    camera.position.set(12.9, EYE, 35.5);  // just inside the entry, by the bedroom door
    walk.yaw = 0.12;                       // facing up the hall toward the kitchen
    walk.pitch = 0;
    walk.keys.clear();
    renderer.domElement.requestPointerLock();
    hintsEl.innerHTML = '<b>WASD / arrows</b> walk · <b>mouse</b> look · <b>Shift</b> run · <b>V</b> or Walk button to exit · click canvas to recapture mouse';
  } else {
    document.exitPointerLock?.();
    world.ceilingGroup.visible = walk.ceilWas;
    controls.enabled = true;
    camera.position.copy(walk.prev.pos);
    controls.target.copy(walk.prev.tgt);
    hintsEl.innerHTML = hintsHome;
  }
}
document.addEventListener('mousemove', (e) => {
  if (!walk.on || document.pointerLockElement !== renderer.domElement) return;
  walk.yaw += e.movementX * 0.0026;
  walk.pitch = Math.max(-1.25, Math.min(1.25, walk.pitch - e.movementY * 0.0026));
});
renderer.domElement.addEventListener('click', () => {
  if (walk.on && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});
window.addEventListener('keydown', (e) => {
  if ((e.key === 'v' || e.key === 'V') && e.target.tagName !== 'INPUT') { setWalk(!walk.on); return; }
  if (!walk.on) return;
  walk.keys.add(e.code);
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => walk.keys.delete(e.code));

// ---------- UI ----------
const $ = (s) => document.querySelector(s);

const catDiv = $('#catalog');
const cats = [...new Set(CATALOG.map((c) => c.cat))];
for (const cat of cats) {
  const h = document.createElement('div');
  h.className = 'cat-head';
  h.textContent = cat;
  catDiv.appendChild(h);
  const wrap = document.createElement('div');
  wrap.className = 'cat-items';
  for (const def of CATALOG.filter((c) => c.cat === cat)) {
    const b = document.createElement('button');
    b.className = 'item-btn';
    b.innerHTML = `${def.name}<span>${fmt(def.w)} × ${fmt(def.d)}</span>`;
    b.onclick = () => {
      const t = controls.target;
      interactions.addItem(def.id, Math.round(t.x * 2) / 2, Math.round(t.z * 2) / 2, 0);
    };
    wrap.appendChild(b);
  }
  catDiv.appendChild(wrap);
}
function fmt(v) {
  const ft = Math.floor(v), inch = Math.round((v - ft) * 12);
  return inch ? `${ft}'${inch}"` : `${ft}'`;
}

document.querySelectorAll('[data-view]').forEach((b) => {
  b.addEventListener('click', () => goView(b.dataset.view));
});

let xray = false;
$('#t-xray').onclick = (e) => { xray = !xray; e.target.classList.toggle('on', xray); };
$('#t-ceiling').onclick = (e) => {
  world.ceilingGroup.visible = !world.ceilingGroup.visible;
  e.target.classList.toggle('on', world.ceilingGroup.visible);
};
$('#t-labels').onclick = (e) => {
  world.labelGroup.visible = !world.labelGroup.visible;
  e.target.classList.toggle('on', world.labelGroup.visible);
};
$('#t-grid').onclick = (e) => { grid.visible = !grid.visible; e.target.classList.toggle('on', grid.visible); };
$('#t-measure').onclick = () => setMeasure(!measureOn);
$('#t-walk').onclick = () => setWalk(!walk.on);

$('#b-sample').onclick = () => interactions.load(SAMPLE);
$('#b-clear').onclick = () => { if (confirm('Remove all furniture?')) interactions.clear(); };

const selPanel = $('#selected');
interactions.onSelect = (it) => {
  selPanel.style.display = it ? 'flex' : 'none';
  if (it) $('#sel-name').textContent = it.userData.def.name;
};
$('#s-rotl').onclick = () => interactions.rotateSelected(15);
$('#s-rotr').onclick = () => interactions.rotateSelected(-15);
$('#s-dup').onclick = () => interactions.duplicateSelected();
$('#s-del').onclick = () => interactions.removeSelected();

// ---------- sample layout ----------
const HPI = Math.PI / 2;
const SAMPLE = [
  // living / dining
  { id: 'tv', x: 13.3, z: 7.3, r: HPI },
  { id: 'sofa', x: 20.2, z: 7.5, r: -HPI },
  { id: 'rug810', x: 17.2, z: 7.3, r: HPI },
  { id: 'coffee', x: 17.4, z: 7.3, r: HPI },
  { id: 'armchair', x: 17.0, z: 12.3, r: -2.4 },
  { id: 'lamp', x: 23.3, z: 10.9, r: 0 },
  { id: 'plant', x: 26.8, z: 6.2, r: 0 },
  { id: 'dining', x: 21.5, z: 3.1, r: 0 },
  { id: 'chair', x: 20.3, z: 1.7, r: 0 }, { id: 'chair', x: 22.7, z: 1.7, r: 0 },
  { id: 'chair', x: 20.3, z: 4.6, r: Math.PI }, { id: 'chair', x: 22.7, z: 4.6, r: Math.PI },
  { id: 'stool', x: 17.6, z: 13.3, r: 0 }, { id: 'stool', x: 20.0, z: 13.3, r: 0 }, { id: 'stool', x: 22.4, z: 13.3, r: 0 },
  // master
  { id: 'king', x: 4.15, z: 8.5, r: HPI },
  { id: 'nightstand', x: 1.5, z: 4.3, r: HPI }, { id: 'nightstand', x: 1.5, z: 12.7, r: HPI },
  { id: 'dresser', x: 6.6, z: 15.3, r: Math.PI },
  { id: 'plant', x: 10.8, z: 1.8, r: 0 },
  // bedroom 2
  { id: 'queen', x: 20.5, z: 34.6, r: 0 },
  { id: 'nightstand', x: 17.0, z: 31.7, r: 0 }, { id: 'nightstand', x: 24.0, z: 31.7, r: 0 },
  { id: 'desk', x: 26.3, z: 37.3, r: HPI },
  { id: 'taskchair', x: 24.1, z: 36.9, r: HPI },
  { id: 'chest', x: 26.9, z: 33.7, r: HPI },
  // balcony
  { id: 'outchair', x: 30.4, z: 3.6, r: -2.0 },
  { id: 'outchair', x: 29.9, z: 8.6, r: -1.1 },
  { id: 'bistro', x: 30.6, z: 6.1, r: 0 },
  { id: 'outchair', x: 19.3, z: -1.5, r: Math.PI },
];

// load saved layout or sample
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
  interactions.load(saved && saved.length ? saved : SAMPLE);
  interactions.deselect();
} catch { interactions.load(SAMPLE); interactions.deselect(); }

// ---------- wall auto-fade ----------
const SIDE_NORMALS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
function updateFade() {
  const dir = new THREE.Vector2(camera.position.x - CENTER.x, camera.position.z - CENTER.z).normalize();
  for (const key of Object.keys(world.sides)) {
    const [nx, nz] = SIDE_NORMALS[key];
    const facing = dir.x * nx + dir.y * nz;
    const fade = !walk.on && (xray || facing > 0.25);
    world.sides[key].traverse((o) => {
      if (!o.isMesh) return;
      const base = o.userData.baseOpacity ?? 1;
      const target = fade ? Math.min(base, 0.1) : base;
      const mat = o.material;
      if (Math.abs((mat.opacity ?? 1) - target) > 0.01) {
        mat.transparent = true;
        mat.opacity += (target - mat.opacity) * 0.18;
        mat.depthWrite = !fade && base === 1;
      } else if (!fade && base === 1 && mat.transparent && mat.opacity > 0.99) {
        mat.transparent = false;
        mat.depthWrite = true;
      }
    });
  }
}

// ---------- loop ----------
const clock = new THREE.Clock();
let lastW = 0, lastH = 0;
function fitViewport() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
function tick() {
  requestAnimationFrame(tick);
  fitViewport();
  const dt = clock.getDelta();
  if (walk.on) {
    const run = walk.keys.has('ShiftLeft') || walk.keys.has('ShiftRight');
    const sp = (run ? 13 : 7.5) * Math.min(dt, 0.05);
    let f = 0, s = 0;
    if (walk.keys.has('KeyW') || walk.keys.has('ArrowUp')) f += 1;
    if (walk.keys.has('KeyS') || walk.keys.has('ArrowDown')) f -= 1;
    if (walk.keys.has('KeyA') || walk.keys.has('ArrowLeft')) s -= 1;
    if (walk.keys.has('KeyD') || walk.keys.has('ArrowRight')) s += 1;
    if (f || s) {
      const dx = (Math.sin(walk.yaw) * f + Math.cos(walk.yaw) * s) * sp;
      const dz = (-Math.cos(walk.yaw) * f + Math.sin(walk.yaw) * s) * sp;
      if (walkable(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
      if (walkable(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    }
    camera.position.y = EYE;
    camera.rotation.order = 'YXZ';
    camera.rotation.set(walk.pitch, -walk.yaw, 0);
  } else {
    if (camAnim) {
      camAnim.t += dt / 0.9;
      const k = camAnim.t >= 1 ? 1 : 1 - Math.pow(1 - camAnim.t, 3);
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, k);
      controls.target.lerpVectors(camAnim.t0, camAnim.t1, k);
      if (camAnim.t >= 1) camAnim = null;
    }
    controls.update();
  }
  updateFade();
  interactions.update();
  measure.tick(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
  renderer.render(scene, camera);
}
tick();

window.addEventListener('resize', fitViewport);
