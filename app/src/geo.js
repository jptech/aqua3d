// Shared geometry helpers: cached chamfered boxes + static-mesh merging.
import * as THREE from 'three';

const cache = new Map();

// Coordinate samples along one half-axis. With a chamfer we place a vertex just
// inside each edge so the rounded band stays narrow and the face stays flat.
function samples(half, rad) {
  return rad > 0 ? [-half, -(half - rad), half - rad, half] : [-half, half];
}

// Box with softened edges: the chamfer is a band of width `rad` around every
// edge, so large faces read flat but each edge catches a highlight. `uvFt > 0`
// emits UVs measured in feet (texture repeats every uvFt feet) instead of 0..1,
// which keeps grain and stone scale constant across differently sized boxes.
function build(w, h, d, rad, uvFt) {
  const half = [w / 2, h / 2, d / 2];
  const inner = half.map((v) => v - rad);
  // per-face in-plane axes chosen so u × v points outward
  const FACES = [
    [0, 1, 1, 2], [0, -1, 2, 1],
    [1, 1, 2, 0], [1, -1, 0, 2],
    [2, 1, 0, 1], [2, -1, 1, 0],
  ];
  const pos = [], nor = [], uv = [], idx = [];
  const p = [0, 0, 0], q = [0, 0, 0];
  for (const [a, s, u, v] of FACES) {
    const su = samples(half[u], rad), sv = samples(half[v], rad);
    const base = pos.length / 3;
    for (let i = 0; i < su.length; i++) {
      for (let j = 0; j < sv.length; j++) {
        p[a] = s * half[a]; p[u] = su[i]; p[v] = sv[j];
        let len = 0;
        for (let k = 0; k < 3; k++) {
          q[k] = Math.max(-inner[k], Math.min(inner[k], p[k]));
          len += (p[k] - q[k]) ** 2;
        }
        len = Math.sqrt(len);
        if (len > 1e-9) {
          for (let k = 0; k < 3; k++) pos.push(q[k] + ((p[k] - q[k]) / len) * rad);
          for (let k = 0; k < 3; k++) nor.push((p[k] - q[k]) / len);
        } else {
          pos.push(p[0], p[1], p[2]);
          nor.push(a === 0 ? s : 0, a === 1 ? s : 0, a === 2 ? s : 0);
        }
        uv.push(
          uvFt ? (su[i] + half[u]) / uvFt : (su[i] + half[u]) / (2 * half[u]),
          uvFt ? (sv[j] + half[v]) / uvFt : (sv[j] + half[v]) / (2 * half[v]),
        );
      }
    }
    const n = sv.length;
    for (let i = 0; i < su.length - 1; i++) {
      for (let j = 0; j < n - 1; j++) {
        const A = base + i * n + j, B = A + n, C = B + 1, D = A + 1;
        idx.push(A, B, C, A, C, D);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export function boxGeometry(w, h, d, bevel = 0, uvFt = 0) {
  const rad = Math.max(0, Math.min(bevel, w * 0.45, h * 0.45, d * 0.45));
  const key = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${rad.toFixed(4)}|${uvFt}`;
  let g = cache.get(key);
  if (!g) { g = build(w, h, d, rad > 0.002 ? rad : 0, uvFt); cache.set(key, g); }
  return g;
}

// Scale a plane/box's UVs into feet so tiled maps keep a constant real-world size.
export function uvFeet(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geo;
}

// ---------- static merging ----------
// Collapses a group of static meshes into one mesh per (material, shadow flags)
// bucket. The apartment is ~500 boxes; merged it draws in ~20 calls, which is
// the difference between smooth and not on a phone. Meshes flagged
// userData.noMerge (or with per-mesh state) are left alone.
function concat(geos) {
  let vCount = 0, iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
    pos.set(p.array.subarray(0, p.count * 3), vo * 3);
    if (n) nor.set(n.array.subarray(0, n.count * 3), vo * 3);
    if (t) uv.set(t.array.subarray(0, t.count * 2), vo * 2);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// Running totals so the cost of the shell is inspectable from the console
// (window.AQUA.merge) instead of guessed at.
export const mergeStats = { before: 0, after: 0 };

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.noMerge) meshes.push(o); });
  if (meshes.length < 2) { mergeStats.before += meshes.length; mergeStats.after += meshes.length; return root; }
  mergeStats.before += meshes.length;

  const buckets = new Map();
  const mats = new Map();
  const mat4 = new THREE.Matrix4();
  for (const mesh of meshes) {
    if (Array.isArray(mesh.material)) continue;
    const key = `${mesh.material.uuid}|${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}`;
    if (!buckets.has(key)) { buckets.set(key, []); mats.set(key, mesh); }
    const g = mesh.geometry.clone();
    // drop attributes the merge doesn't carry, so counts stay in sync
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(mat4.multiplyMatrices(inv, mesh.matrixWorld));
    buckets.get(key).push(g);
    mesh.userData.merged = true;
  }
  for (const mesh of meshes) {
    if (mesh.userData.merged) mesh.removeFromParent();
  }
  for (const [key, geos] of buckets) {
    const src = mats.get(key);
    const m = new THREE.Mesh(concat(geos), src.material);
    m.castShadow = src.castShadow;
    m.receiveShadow = src.receiveShadow;
    root.add(m);
    for (const g of geos) g.dispose();
  }
  mergeStats.after += buckets.size;
  return root;
}
