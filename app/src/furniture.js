// Procedural furniture catalog. Dimensions in feet (w = x, d = z, h = y at rot 0).
// Each builder returns a THREE.Group with its origin at floor level, footprint center.
import * as THREE from 'three';
import { artTexture, surfaceMaterial, blobShadow } from './textures.js';
import { boxGeometry, mergeStatic } from './geo.js';
import { Q } from './quality.js';

const CYL = Q.tier === 'low' ? 12 : 20;

let mats = null;
function m() {
  if (mats) return mats;
  mats = {
    fabric: surfaceMaterial('linen', { color: 0x7e8791, roughness: 0.92, normalScale: 0.8 }),
    fabricDark: surfaceMaterial('linen', { color: 0x4d5560, roughness: 0.92, normalScale: 0.8 }),
    accent: surfaceMaterial('linen', { color: 0x8a6d54, roughness: 0.88, normalScale: 0.6 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.45, envMapIntensity: 0.8 }),
    walnut: surfaceMaterial('walnut', { roughness: 0.42, normalScale: 0.5, envMapIntensity: 0.8 }),
    oak: surfaceMaterial('oakFloor', { roughness: 0.45, normalScale: 0.5, envMapIntensity: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.32, metalness: 0.85 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd2d7db, roughness: 0.12, metalness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf6f4f0, roughness: 0.55, envMapIntensity: 0.8 }),
    duvet: surfaceMaterial('linen', { color: 0xdde1e4, roughness: 0.95, normalScale: 0.45 }),
    duvetAccent: surfaceMaterial('linen', { color: 0x5f7286, roughness: 0.95, normalScale: 0.45 }),
    pillow: surfaceMaterial('linen', { color: 0xfbfbfa, roughness: 1, normalScale: 0.5 }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x08090c, roughness: 0.08, metalness: 0.2,
      emissive: 0x101c26, emissiveIntensity: 0.35, envMapIntensity: 0.35,
    }),
    rug1: surfaceMaterial('linen', { color: 0x9aa4a8, roughness: 1, normalScale: 1.2 }),
    rug2: surfaceMaterial('linen', { color: 0x7a8496, roughness: 1, normalScale: 1.2 }),
    plantPot: new THREE.MeshStandardMaterial({ color: 0xcfc8bb, roughness: 0.75 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x3c332a, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4a7247, roughness: 0.65, envMapIntensity: 0.9 }),
    teak: surfaceMaterial('oakFloor', { color: 0xa8825a, roughness: 0.62, normalScale: 0.6 }),
    glassTop: new THREE.MeshPhysicalMaterial({
      color: 0xb8ccd4, transparent: true, opacity: 0.3, roughness: 0.03,
      envMapIntensity: 1.4, reflectivity: 0.6,
    }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.24, metalness: 1 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xdce8ee, roughness: 0.04, metalness: 1, envMapIntensity: 1.2 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.5 }),
    // Flat-pack finishes. Melamine "rustic brown" board on black powder-coated
    // tube is the house style of every VASAGLE / 4NM piece the owner has; the
    // BHG shelf's "fire" colourway is the same board pushed redder.
    rustic: surfaceMaterial('oakFloor', { color: 0xa97a4e, roughness: 0.6, normalScale: 0.45, envMapIntensity: 0.7 }),
    fireWood: surfaceMaterial('oakFloor', { color: 0x93482a, roughness: 0.62, normalScale: 0.45, envMapIntensity: 0.7 }),
    inkSteel: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.44, metalness: 0.6, envMapIntensity: 0.7 }),
    inkPanel: new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.62, envMapIntensity: 0.5 }),
    // carcass sits a shade darker than the fronts so the door reveals read as
    // shadow lines instead of vanishing into one black slab
    inkCarcass: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.7, envMapIntensity: 0.35 }),
  };
  return mats;
}

// `bev` overrides the edge radius: hard-edged case goods keep the tier default,
// while cushions, mattresses and pillows take a fat radius so they read as
// something soft rather than a stack of cardboard boxes.
function B(w, h, d, mat, x = 0, y = 0, z = 0, bev = Q.bevel) {
  const mesh = new THREE.Mesh(boxGeometry(w, h, d, bev, mat.userData.uvFt || 0), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
const SOFT = Q.bevel > 0 ? 1 : 0;   // low tier keeps flat boxes throughout
function C(r, h, mat, x = 0, y = 0, z = 0, rTop = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop ?? r, r, h, CYL), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  return mesh;
}

function legs(g, w, d, h, mat, inset = 0.25, r = 0.08) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(C(r, h, mat, sx * (w / 2 - inset), 0, sz * (d / 2 - inset)));
  }
}

function bed(w, len, name) {
  return () => {
    const g = new THREE.Group(), M2 = m();
    g.add(B(w, 0.85, len, m().walnut, 0, 0.35, 0));                  // platform
    legs(g, w, len, 0.35, M2.metal, 0.35);
    g.add(B(w, 3.6, 0.35, M2.walnut, 0, 0, -len / 2 + 0.18));        // headboard
    g.add(B(w - 0.3, 0.8, len - 0.5, M2.white, 0, 1.2, 0.1, 0.14 * SOFT));       // mattress
    g.add(B(w - 0.25, 0.55, len * 0.62, M2.duvet, 0, 1.95, len * 0.17, 0.2 * SOFT));
    g.add(B(w - 0.25, 0.18, len * 0.2, M2.duvetAccent, 0, 2.0, len * 0.31, 0.07 * SOFT));
    const pw = (w - 0.7) / 2;
    for (const sx of [-1, 1]) {
      g.add(B(pw, 0.45, 1.3, M2.pillow, sx * (pw / 2 + 0.12), 2.0, -len / 2 + 1.1, 0.19 * SOFT));
    }
    return g;
  };
}

// framed placeholder canvas hung at eye level; slide it against a wall.
// The picture plane faces +z (south at rot 0) — rotate to face the room.
function framedArt(w, hgt, seed, yCenter, x = 0) {
  const g = new THREE.Group(), M2 = m();
  g.add(B(w, hgt, 0.12, M2.frame, x, yCenter - hgt / 2, 0));
  const canvas = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.16, hgt - 0.16),
    new THREE.MeshStandardMaterial({ map: artTexture(seed), roughness: 0.92 }));
  canvas.position.set(x, yCenter, 0.07);
  g.add(canvas);
  return g;
}

function seat(w, d, { arms = true, backH = 2.6, name = '' } = {}) {
  return () => {
    const g = new THREE.Group(), M2 = m();
    const aw = arms ? 0.55 : 0;
    const inner = w - 2 * aw;
    g.add(B(w, 0.6, d, M2.fabric, 0, 0.55, 0, 0.1 * SOFT));                      // plinth
    legs(g, w, d, 0.55, M2.metal, 0.3, 0.06);
    g.add(B(w, backH - 1.1, 0.6, M2.fabric, 0, 1.1, -d / 2 + 0.3, 0.14 * SOFT)); // back frame
    // separate seat and back cushions with a visible gap — one continuous slab
    // is what makes a procedural sofa read as a bench
    const n = Math.max(1, Math.round(inner / 2.6));
    const cw = (inner - 0.09 * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const cx = -inner / 2 + cw / 2 + i * (cw + 0.09);
      g.add(B(cw, 0.52, d - 0.75, M2.fabricDark, cx, 1.15, 0.2, 0.17 * SOFT));
      g.add(B(cw, backH - 1.6, 0.42, M2.fabricDark, cx, 1.55, -d / 2 + 0.62, 0.16 * SOFT));
    }
    if (arms) {
      for (const sx of [-1, 1]) {
        g.add(B(aw, 1.15, d, M2.fabric, sx * (w / 2 - aw / 2), 0.55, 0, 0.2 * SOFT));
      }
    }
    return g;
  };
}

// The no-assembly folding bookcases (4NM, BHG) are one design in two sizes:
// laminated boards dropped into a black tube frame whose side panels are
// X-braced — that scissor linkage is what lets the whole thing collapse flat,
// so it's the detail that makes them read as folding shelves and not bookcases.
function foldShelf(W, D, H, tiers, woodKey) {
  return () => {
    const g = new THREE.Group(), M2 = m();
    const wood = M2[woodKey];
    const post = 0.06, bt = 0.06;                 // ~3/4" tube, ~3/4" board
    const y0 = 0.13, step = (H - bt - y0) / (tiers - 1);
    // boards span the full width and notch past the posts, which is how they sit
    // on the real frame — inset boards read as floating slabs
    for (let i = 0; i < tiers; i++) {
      g.add(B(W - 0.02, bt, D - 2 * post, wood, 0, y0 + i * step, 0));
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(B(post, H, post, M2.inkSteel, sx * (W - post) / 2, 0, sz * (D - post) / 2));
    }
    // one X per side bay: bars run corner to corner of the bay, so their length
    // and tilt both fall out of the shelf pitch
    const span = D - post;
    const len = Math.hypot(span, step);
    const tilt = Math.atan2(span, step);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < tiers - 1; i++) {
        const yc = y0 + (i + 0.5) * step + bt / 2;
        for (const s of [-1, 1]) {
          const bar = B(0.038, len, 0.038, M2.inkSteel, sx * (W - post) / 2, yc - len / 2, 0);
          bar.rotation.x = s * tilt;
          g.add(bar);
        }
      }
    }
    return g;
  };
}

// S-hook hung off a wire: two opposed arcs, the upper one over the wire and the
// lower one open for a mug. Cheap enough to place fourteen of.
function sHook(mat, x, y, z) {
  const g = new THREE.Group();
  const r = 0.034, tube = 0.009;
  [[y - r, 0.28], [y - 3 * r, 1.28]].forEach(([cy, rot]) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 5, Q.tier === 'low' ? 6 : 10, Math.PI * 1.45), mat);
    arc.position.set(x, cy, z);
    arc.rotation.z = Math.PI * rot;
    g.add(arc);
  });
  return g;
}

// Open wire basket for the rolling cart: a perforated floor plus four gridded
// walls. The wire pitch is the only thing that sells it as mesh rather than a
// solid tray, so it's the one thing the low tier thins out instead of dropping.
function wireBasket(g, W, D, floorY, rim, mat) {
  const pitch = Q.tier === 'low' ? 0.3 : 0.17;
  g.add(B(W, 0.025, D, mat, 0, floorY, 0));
  for (const [len, axis] of [[W, 'x'], [D, 'z']]) {
    for (const s of [-1, 1]) {
      const off = (axis === 'x' ? D : W) / 2;
      for (const y of [floorY + rim - 0.03, floorY + rim * 0.5]) {           // rails
        const bar = axis === 'x' ? B(len, 0.03, 0.03, mat, 0, y, s * off)
          : B(0.03, 0.03, len, mat, s * off, y, 0);
        g.add(bar);
      }
      const n = Math.max(2, Math.round(len / pitch));
      for (let i = 0; i <= n; i++) {
        const p = -len / 2 + (i * len) / n;
        g.add(axis === 'x' ? B(0.022, rim, 0.022, mat, p, floorY, s * off)
          : B(0.022, rim, 0.022, mat, s * off, floorY, p));
      }
    }
  }
}

export const CATALOG = [
  // ---- owned furniture (real dimensions) ----
  {
    id: 'my-tv', name: 'TV console 64" + 65" TV', cat: 'My Furniture', w: 5.33, d: 1.33, h: 5.1,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(5.33, 1.4, 1.33, M2.walnut, 0, 0.3, 0));
      legs(g, 5.33, 1.33, 0.3, M2.metal, 0.25, 0.06);
      g.add(B(4.72, 2.66, 0.12, M2.screen, 0, 2.4, 0));
      g.add(B(1.2, 0.4, 0.5, M2.metal, 0, 2.0, 0));
      return g;
    },
  },
  {
    id: 'my-dining', name: 'Dining table 47×28', cat: 'My Furniture', w: 3.92, d: 2.33, h: 2.45, surface: true,
    build: () => {
      const g = new THREE.Group();
      g.add(B(3.92, 0.16, 2.33, m().walnut, 0, 2.29, 0));
      legs(g, 3.92, 2.33, 2.29, m().walnut, 0.3, 0.11);
      return g;
    },
  },
  {
    id: 'my-desk-l', name: 'Sit-stand desk 60×29', cat: 'My Furniture', w: 5.0, d: 2.42, h: 3.8, surface: true,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(5.0, 0.15, 2.42, M2.oak, 0, 2.35, 0));
      for (const sx of [-1, 1]) {
        g.add(B(0.25, 2.35, 0.25, M2.metal, sx * 2.1, 0, 0));
        g.add(B(0.3, 0.1, 1.9, M2.metal, sx * 2.1, 0, 0));
      }
      g.add(B(1.9, 1.05, 0.08, M2.screen, 0, 2.75, -0.7));
      g.add(C(0.28, 0.5, M2.metal, 0, 2.5, -0.7, 0.05));
      return g;
    },
  },
  {
    id: 'my-desk-s', name: 'Sit-stand desk 48×23', cat: 'My Furniture', w: 4.0, d: 1.92, h: 3.3, surface: true,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(4.0, 0.14, 1.92, M2.oak, 0, 2.35, 0));
      for (const sx of [-1, 1]) {
        g.add(B(0.22, 2.35, 0.22, M2.metal, sx * 1.65, 0, 0));
        g.add(B(0.26, 0.1, 1.6, M2.metal, sx * 1.65, 0, 0));
      }
      g.add(B(0.95, 0.06, 0.7, M2.metal, 0, 2.49, 0.1));
      const lid = B(0.95, 0.68, 0.05, M2.screen, 0, 2.55, -0.28);
      lid.rotation.x = -0.25;
      g.add(lid);
      return g;
    },
  },
  {
    id: 'my-shelf', name: 'Bookshelf 23×12 (62" tall)', cat: 'My Furniture', w: 1.92, d: 1.0, h: 5.17,
    build: () => {
      const g = new THREE.Group();
      g.add(B(1.92, 5.17, 1.0, m().oak));
      const inset = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 1 });
      for (let i = 0; i < 5; i++) g.add(B(1.7, 0.86, 0.85, inset, 0, 0.16 + i * 0.99, 0.1));
      return g;
    },
  },
  { id: 'my-fullxl', name: 'Full XL bed 54×80', cat: 'My Furniture', w: 4.5, d: 7.2, h: 3.6, build: bed(4.5, 7.2) },
  { id: 'my-queen', name: 'Queen bed 60×80', cat: 'My Furniture', w: 5.0, d: 7.2, h: 3.6, build: bed(5.0, 7.2) },
  {
    // VASAGLE UKKS025B01, 31.5 x 15.7 x 66.9". Five boards: two open shelves
    // below, the microwave/coffee tabletop at counter height, then a two-shelf
    // hutch backed by the wire panel the S-hooks hang off.
    id: 'my-bakers', name: 'Bakers rack 31.5" (hutch)', cat: 'My Furniture', w: 2.63, d: 1.31, h: 5.58,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      const W = 2.63, D = 1.31, H = 5.58, post = 0.08, bt = 0.07;
      const ys = [0.30, 1.40, 2.85, 4.15, H - bt];
      for (const y of ys) g.add(B(W - 0.02, bt, D - 2 * post, M2.rustic, 0, y, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(B(post, H, post, M2.inkSteel, sx * (W - post) / 2, 0, sz * (D - post) / 2));
      }
      // frame rails under every board, plus a foot rail that keeps the base square
      for (const y of [...ys, 0.08]) {
        for (const sz of [-1, 1]) g.add(B(W - 2 * post, 0.045, 0.045, M2.inkSteel, 0, y - 0.05, sz * (D - post) / 2));
      }
      // wire back panel across the hutch: verticals on a ~2.5" pitch between
      // two rails, which is what the hooks clip onto
      const zBack = -(D - post) / 2;
      const wireN = Q.tier === 'low' ? 7 : 13;
      const span = W - 2 * post, wTop = H - bt, wBot = 2.92;
      for (let i = 0; i < wireN; i++) {
        g.add(B(0.022, wTop - wBot, 0.022, M2.inkSteel, -span / 2 + (i * span) / (wireN - 1), wBot, zBack));
      }
      for (const y of [wBot, 4.12, wTop - 0.03]) g.add(B(span, 0.028, 0.028, M2.inkSteel, 0, y, zBack));
      // power strip mounted on the back-right post above the tabletop
      g.add(B(0.55, 0.3, 0.12, M2.inkSteel, W / 2 - 0.45, 2.98, zBack - 0.04));
      // 14 S-hooks: eight clipped over the wire panel's mid rail, three hanging
      // off each hutch side bar
      for (let i = 0; i < 8; i++) {
        g.add(sHook(M2.metal, -0.98 + i * 0.28, 4.1, zBack + 0.05));
      }
      for (const sx of [-1, 1]) for (const y of [3.35, 3.95, 4.55]) {
        g.add(sHook(M2.metal, sx * ((W - post) / 2 + 0.02), y, 0));
      }
      return g;
    },
  },
  {
    // VASAGLE UBBC561B12, 30 x 15.7 x 71.7", ink black. Tall two-door upper over
    // a drawer over a two-door base, all on a recessed plinth.
    id: 'my-pantry', name: 'Pantry cabinet 30" (71.7" tall)', cat: 'My Furniture', w: 2.5, d: 1.31, h: 5.98,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      const W = 2.5, D = 1.31, H = 5.98, ft = 0.07;      // ft = front thickness
      g.add(B(W, H - 0.2, D - ft, M2.inkCarcass, 0, 0.2, -ft / 2));
      g.add(B(W - 0.26, 0.2, D - ft - 0.12, M2.inkSteel, 0, 0, -ft / 2));
      const zf = (D - ft) / 2;
      const dw = (W - 0.12) / 2;                          // two doors, 0.04 reveals
      // [bottom, top] of each front; the drawer sits between the two door pairs
      const pairs = [[0.26, 2.12], [2.87, 5.9]];
      for (const [y0, y1] of pairs) {
        for (const sx of [-1, 1]) {
          g.add(B(dw, y1 - y0, ft, M2.inkPanel, sx * (dw + 0.04) / 2, y0, zf));
          // slim vertical bar pull on the inner stile
          g.add(B(0.05, (y1 - y0) * 0.36, 0.06, M2.metal, sx * 0.16, y0 + (y1 - y0) * 0.32, zf + ft / 2));
        }
      }
      g.add(B(W - 0.08, 0.6, ft, M2.inkPanel, 0, 2.19, zf));
      g.add(B(W * 0.42, 0.05, 0.06, M2.metal, 0, 2.46, zf + ft / 2));
      return g;
    },
  },
  {
    // 4NM 5-tier, 23 x 11.6 x 65.7" expanded, rustic brown boards on black tube.
    id: 'my-fold5', name: 'Folding shelf 5-tier 23"', cat: 'My Furniture', w: 1.92, d: 0.97, h: 5.48,
    build: foldShelf(1.92, 0.97, 5.48, 5, 'rustic'),
  },
  {
    // BHG "Fire" 4-tier, 23.6 x 11.6 x 49.8" expanded — same folding design.
    id: 'my-fold4', name: 'Folding shelf 4-tier 23.6"', cat: 'My Furniture', w: 1.97, d: 0.97, h: 4.15,
    build: foldShelf(1.97, 0.97, 4.15, 4, 'fireWood'),
  },
  {
    // SimpleHouseware 3-tier, 17 x 12.5 x 31.5". Black mesh baskets on a tube
    // frame, four casters, push handle over the top basket.
    id: 'my-cart', name: 'Rolling utility cart 17"', cat: 'My Furniture', w: 1.42, d: 1.04, h: 2.63,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      const W = 1.42, D = 1.04, post = 0.05;
      const bw = W - 0.1, bd = D - 0.1, rim = 0.36;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(B(post, 2.12, post, M2.inkSteel, sx * (W - post) / 2, 0.18, sz * (D - post) / 2));
        // swivel caster: a stub bracket carrying the wheel
        g.add(B(0.09, 0.1, 0.09, M2.inkSteel, sx * (W - post) / 2, 0.18, sz * (D - post) / 2));
        const wheel = C(0.09, 0.06, M2.inkSteel, sx * (W - post) / 2, 0, sz * (D - post) / 2 + 0.03);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.y = 0.09;
        g.add(wheel);
      }
      for (const y of [0.24, 1.02, 1.80]) wireBasket(g, bw, bd, y, rim, M2.inkSteel);
      // push handle on the back edge, clearing the top basket
      for (const sx of [-1, 1]) g.add(B(0.05, 0.32, 0.05, M2.inkSteel, sx * (W - post) / 2, 2.3, -(D - post) / 2));
      g.add(B(W, 0.05, 0.05, M2.inkSteel, 0, 2.58, -(D - post) / 2));
      return g;
    },
  },
  // ---- living ----
  { id: 'sofa', name: 'Sofa 84"', cat: 'Living', w: 7.0, d: 3.1, h: 2.7, build: seat(7.0, 3.1) },
  { id: 'loveseat', name: 'Loveseat 62"', cat: 'Living', w: 5.2, d: 3.0, h: 2.7, build: seat(5.2, 3.0) },
  {
    id: 'sectional', name: 'Sectional L', cat: 'Living', w: 8.8, d: 6.2, h: 2.7,
    build: () => {
      const g = new THREE.Group();
      const a = seat(8.8, 3.0)(); a.position.z = -1.6; g.add(a);
      const b = seat(3.0, 3.2, { arms: false })(); b.rotation.y = Math.PI / 2; b.position.set(-2.9, 0, 1.5); g.add(b);
      return g;
    },
  },
  { id: 'armchair', name: 'Armchair', cat: 'Living', w: 2.9, d: 2.9, h: 2.7, build: seat(2.9, 2.9) },
  {
    id: 'coffee', name: 'Coffee table', cat: 'Living', w: 4.0, d: 2.0, h: 1.35,
    build: () => {
      const g = new THREE.Group();
      g.add(B(4.0, 0.15, 2.0, m().walnut, 0, 1.2, 0));
      legs(g, 4.0, 2.0, 1.2, m().metal, 0.2, 0.06);
      return g;
    },
  },
  {
    id: 'side', name: 'Side table', cat: 'Living', w: 1.7, d: 1.7, h: 1.8,
    build: () => {
      const g = new THREE.Group();
      g.add(C(0.85, 0.12, m().walnut, 0, 1.7, 0));
      g.add(C(0.06, 1.7, m().metal));
      g.add(C(0.5, 0.06, m().metal));
      return g;
    },
  },
  {
    id: 'tv', name: 'TV console + 55" TV', cat: 'Living', w: 6.0, d: 1.5, h: 5.2,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(6.0, 1.7, 1.5, M2.walnut, 0, 0.3, 0));
      legs(g, 6.0, 1.5, 0.3, M2.metal, 0.3, 0.06);
      g.add(B(4.05, 2.35, 0.12, M2.screen, 0, 2.45, 0));
      g.add(B(1.2, 0.4, 0.5, M2.metal, 0, 2.05, 0));
      return g;
    },
  },
  {
    id: 'tv65', name: 'TV console + 65" TV', cat: 'Living', w: 6.8, d: 1.5, h: 5.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(6.8, 1.7, 1.5, M2.oak, 0, 0.3, 0));
      legs(g, 6.8, 1.5, 0.3, M2.metal, 0.3, 0.06);
      g.add(B(4.75, 2.67, 0.12, M2.screen, 0, 2.5, 0));
      g.add(B(1.3, 0.45, 0.5, M2.metal, 0, 2.05, 0));
      return g;
    },
  },
  {
    id: 'ottoman', name: 'Ottoman', cat: 'Living', w: 2.5, d: 2.5, h: 1.55,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(2.5, 0.9, 2.5, M2.fabricDark, 0, 0.35, 0));
      g.add(B(2.35, 0.28, 2.35, M2.fabric, 0, 1.25, 0));
      legs(g, 2.5, 2.5, 0.35, M2.metal, 0.25, 0.06);
      return g;
    },
  },
  {
    id: 'bookshelf', name: 'Bookshelf', cat: 'Living', w: 2.7, d: 1.0, h: 6.0,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(2.7, 6.0, 1.0, M2.oak));
      for (let i = 0; i < 4; i++) g.add(B(2.4, 1.05, 0.85, new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 1 }), 0, 0.55 + i * 1.35, 0.1));
      return g;
    },
  },
  {
    id: 'rug810', name: 'Rug 8×10', cat: 'Living', w: 10.0, d: 8.0, h: 0.06, flat: true,
    build: () => { const g = new THREE.Group(); g.add(B(10, 0.06, 8, m().rug1)); g.add(B(9.0, 0.065, 7.0, m().rug2)); return g; },
  },
  {
    id: 'rug58', name: 'Rug 5×8', cat: 'Living', w: 8.0, d: 5.0, h: 0.06, flat: true,
    build: () => { const g = new THREE.Group(); g.add(B(8, 0.06, 5, m().rug2)); g.add(B(7.1, 0.065, 4.2, m().rug1)); return g; },
  },
  {
    id: 'rug6r', name: 'Round rug 6\'', cat: 'Living', w: 6.0, d: 6.0, h: 0.06, flat: true,
    build: () => { const g = new THREE.Group(); g.add(C(3.0, 0.06, m().rug2)); g.add(C(2.55, 0.065, m().rug1)); return g; },
  },
  {
    id: 'lamp', name: 'Floor lamp', cat: 'Living', w: 1.4, d: 1.4, h: 5.6,
    build: () => {
      const g = new THREE.Group();
      g.add(C(0.55, 0.06, m().metal));
      g.add(C(0.045, 4.6, m().metal));
      g.add(C(0.65, 1.0, new THREE.MeshStandardMaterial({ color: 0xf3ead6, emissive: 0xd9c9a0, emissiveIntensity: 0.5 }), 0, 4.4, 0, 0.5));
      return g;
    },
  },
  {
    id: 'plant', name: 'Plant', cat: 'Living', w: 1.6, d: 1.6, h: 5.0,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(C(0.6, 1.3, M2.plantPot, 0, 0, 0, 0.76));                    // tapered pot
      g.add(C(0.7, 0.14, M2.soil, 0, 1.2, 0));
      // upright blades fanned around the pot: each cone is flattened on one axis
      // and tipped outward from a holder, which reads far better than a ring of
      // fat cones stuck into the rim
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.26;
        const len = 2.1 + (i % 4) * 0.55;
        const tilt = 0.14 + (i % 5) * 0.11;
        const holder = new THREE.Group();
        holder.rotation.y = a;
        holder.position.y = 1.28;
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.24, len, 5), M2.leaf);
        leaf.scale.set(1, 1, 0.3);
        leaf.position.set(Math.sin(tilt) * len * 0.5, Math.cos(tilt) * len * 0.5, 0);
        leaf.rotation.z = -tilt;
        leaf.castShadow = true;
        holder.add(leaf);
        g.add(holder);
      }
      return g;
    },
  },
  // ---- dining ----
  {
    id: 'dining', name: 'Dining table 72"', cat: 'Dining', w: 6.0, d: 3.0, h: 2.5, surface: true,
    build: () => {
      const g = new THREE.Group();
      g.add(B(6.0, 0.18, 3.0, m().walnut, 0, 2.32, 0));
      legs(g, 6.0, 3.0, 2.32, m().walnut, 0.35, 0.12);
      return g;
    },
  },
  {
    id: 'roundtable', name: 'Round table 48"', cat: 'Dining', w: 4.0, d: 4.0, h: 2.5, surface: true,
    build: () => {
      const g = new THREE.Group();
      g.add(C(2.0, 0.16, m().walnut, 0, 2.34, 0));
      g.add(C(0.14, 2.34, m().metal));
      g.add(C(0.9, 0.08, m().metal));
      return g;
    },
  },
  {
    id: 'chair', name: 'Dining chair', cat: 'Dining', w: 1.55, d: 1.7, h: 3.0, tuck: true,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(1.45, 0.25, 1.45, M2.fabricDark, 0, 1.4, 0.08, 0.09 * SOFT));
      legs(g, 1.45, 1.45, 1.4, M2.metal, 0.12, 0.05);
      g.add(B(1.45, 1.5, 0.2, M2.fabricDark, 0, 1.6, -0.65, 0.08 * SOFT));
      return g;
    },
  },
  {
    id: 'stool', name: 'Bar stool', cat: 'Dining', w: 1.35, d: 1.35, h: 3.1, tuck: true,
    build: () => {
      const g = new THREE.Group();
      g.add(C(0.62, 0.18, m().leather, 0, 2.35, 0));
      g.add(C(0.07, 2.35, m().chrome));
      g.add(C(0.55, 0.05, m().chrome));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 20), m().chrome);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.85;
      g.add(ring);
      return g;
    },
  },
  {
    id: 'dining60', name: 'Dining table 60"', cat: 'Dining', w: 5.0, d: 3.0, h: 2.5, surface: true,
    build: () => {
      const g = new THREE.Group();
      g.add(B(5.0, 0.18, 3.0, m().walnut, 0, 2.32, 0));
      legs(g, 5.0, 3.0, 2.32, m().walnut, 0.35, 0.12);
      return g;
    },
  },
  {
    id: 'sideboard', name: 'Sideboard 60"', cat: 'Dining', w: 5.0, d: 1.5, h: 2.7,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(5.0, 2.35, 1.5, M2.walnut, 0, 0.35, 0));
      legs(g, 5.0, 1.5, 0.35, M2.metal, 0.25, 0.06);
      for (const x of [-1.26, -0.42, 0.42, 1.26]) g.add(B(0.04, 1.9, 0.03, M2.metal, x, 0.6, 0.77));
      return g;
    },
  },
  {
    id: 'barcart', name: 'Bar cart', cat: 'Dining', w: 2.5, d: 1.5, h: 3.3,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      for (const y of [0.5, 2.4]) g.add(B(2.3, 0.08, 1.4, M2.walnut, 0, y, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(C(0.04, 2.6, M2.brass, sx * 1.1, 0.12, sz * 0.62));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const wheel = C(0.12, 0.08, M2.metal, sx * 1.1, 0, sz * 0.62);
        wheel.rotation.z = Math.PI / 2;
        g.add(wheel);
      }
      g.add(C(0.09, 0.75, M2.glassTop, -0.5, 2.48, 0.2));
      g.add(C(0.09, 0.6, M2.leaf, -0.15, 2.48, -0.25));
      g.add(C(0.09, 0.7, M2.accent, 0.25, 2.48, 0.15));
      return g;
    },
  },
  // ---- bedroom ----
  { id: 'king', name: 'King bed 76×80', cat: 'Bedroom', w: 6.35, d: 7.2, h: 3.6, build: bed(6.35, 7.2) },
  { id: 'queen', name: 'Queen bed 60×80', cat: 'Bedroom', w: 5.0, d: 7.2, h: 3.6, build: bed(5.0, 7.2) },
  { id: 'full', name: 'Full bed 54×75', cat: 'Bedroom', w: 4.5, d: 6.8, h: 3.6, build: bed(4.5, 6.8) },
  { id: 'twin', name: 'Twin bed 38×75', cat: 'Bedroom', w: 3.2, d: 6.8, h: 3.6, build: bed(3.2, 6.8) },
  {
    id: 'nightstand', name: 'Nightstand', cat: 'Bedroom', w: 1.8, d: 1.5, h: 2.0,
    build: () => {
      const g = new THREE.Group();
      g.add(B(1.8, 1.7, 1.5, m().walnut, 0, 0.3, 0));
      legs(g, 1.8, 1.5, 0.3, m().metal, 0.15, 0.05);
      g.add(B(1.5, 0.06, 0.02, m().chrome, 0, 1.15, 0.76));
      return g;
    },
  },
  {
    id: 'dresser', name: 'Dresser 60"', cat: 'Bedroom', w: 5.0, d: 1.65, h: 2.9,
    build: () => {
      const g = new THREE.Group();
      g.add(B(5.0, 2.6, 1.65, m().walnut, 0, 0.3, 0));
      legs(g, 5.0, 1.65, 0.3, m().metal, 0.25, 0.06);
      for (let i = 0; i < 3; i++) g.add(B(1.1, 0.06, 0.02, m().chrome, -1.55 + i * 1.55, 1.6, 0.84));
      return g;
    },
  },
  {
    id: 'chest', name: 'Tall chest', cat: 'Bedroom', w: 3.1, d: 1.65, h: 4.2,
    build: () => {
      const g = new THREE.Group();
      g.add(B(3.1, 3.9, 1.65, m().oak, 0, 0.3, 0));
      legs(g, 3.1, 1.65, 0.3, m().metal, 0.2, 0.06);
      return g;
    },
  },
  {
    id: 'bench', name: 'Bed bench', cat: 'Bedroom', w: 4.4, d: 1.4, h: 1.35,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(4.4, 0.5, 1.4, M2.fabric, 0, 0.85, 0));
      legs(g, 4.4, 1.4, 0.85, M2.metal, 0.3, 0.06);
      return g;
    },
  },
  {
    id: 'wardrobe', name: 'Wardrobe', cat: 'Bedroom', w: 3.3, d: 2.0, h: 6.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(3.3, 6.6, 2.0, M2.oak));
      g.add(B(0.04, 5.6, 0.03, M2.metal, 0, 0.6, 1.0));
      for (const sx of [-1, 1]) g.add(B(0.05, 1.1, 0.03, M2.metal, sx * 0.35, 2.8, 1.01));
      return g;
    },
  },
  {
    id: 'vanity', name: 'Vanity + mirror', cat: 'Bedroom', w: 3.4, d: 1.6, h: 4.5,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(3.4, 0.14, 1.6, M2.white, 0, 2.1, 0));
      legs(g, 3.4, 1.6, 2.1, M2.metal, 0.2, 0.06);
      g.add(B(1.0, 0.8, 1.2, M2.white, 1.0, 1.25, 0));
      const mir = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 28), M2.mirror);
      mir.rotation.x = Math.PI / 2;
      mir.position.set(0, 3.5, -0.6);
      mir.castShadow = true;
      g.add(mir);
      return g;
    },
  },
  {
    id: 'crib', name: 'Crib', cat: 'Bedroom', w: 4.6, d: 2.55, h: 3.0,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(4.4, 0.7, 2.35, M2.white, 0, 1.0, 0));
      for (const sz of [-1, 1]) for (let i = 0; i < 11; i++)
        g.add(B(0.08, 2.6, 0.08, M2.white, -2.1 + i * 0.42, 0.3, sz * 1.14));
      for (const sx of [-1, 1]) g.add(B(0.12, 3.0, 2.4, M2.white, sx * 2.24, 0, 0));
      for (const sz of [-1, 1]) g.add(B(4.5, 0.12, 0.1, M2.white, 0, 2.8, sz * 1.14));
      return g;
    },
  },
  // ---- office ----
  {
    id: 'desk', name: 'Desk 48"', cat: 'Office', w: 4.0, d: 2.1, h: 2.5, surface: true,
    build: () => {
      const g = new THREE.Group();
      g.add(B(4.0, 0.14, 2.1, m().oak, 0, 2.36, 0));
      for (const sx of [-1, 1]) g.add(B(0.12, 2.36, 1.9, m().metal, sx * 1.85, 0, 0));
      g.add(B(1.65, 1.0, 0.08, m().screen, 0, 2.7, -0.5));
      g.add(C(0.3, 0.55, m().metal, 0, 2.5, -0.5, 0.05));
      return g;
    },
  },
  {
    id: 'taskchair', name: 'Office chair', cat: 'Office', w: 2.1, d: 2.1, h: 3.3, tuck: true,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(1.6, 0.3, 1.6, M2.fabricDark, 0, 1.45, 0.1));
      g.add(B(1.5, 1.7, 0.35, M2.fabricDark, 0, 1.7, -0.75));
      g.add(C(0.09, 1.45, M2.chrome));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const leg = B(0.9, 0.1, 0.15, M2.chrome, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5);
        leg.rotation.y = -a;
        g.add(leg);
      }
      return g;
    },
  },
  {
    id: 'desk60', name: 'Desk 60"', cat: 'Office', w: 5.0, d: 2.5, h: 3.7, surface: true,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(5.0, 0.14, 2.5, M2.walnut, 0, 2.36, 0));
      for (const sx of [-1, 1]) g.add(B(0.12, 2.36, 2.3, M2.metal, sx * 2.35, 0, 0));
      for (const sx of [-1, 1]) {
        const mon = B(1.7, 1.0, 0.08, M2.screen, sx * 0.95, 2.7, -0.65);
        mon.rotation.y = sx * -0.25;
        g.add(mon);
      }
      return g;
    },
  },
  {
    id: 'filecab', name: 'File cabinet', cat: 'Office', w: 1.4, d: 1.7, h: 2.3,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(1.4, 2.05, 1.7, M2.white, 0, 0.15, 0));
      legs(g, 1.4, 1.7, 0.15, M2.metal, 0.12, 0.05);
      for (const y of [0.95, 1.85]) g.add(B(0.6, 0.05, 0.02, M2.metal, 0, y, 0.86));
      return g;
    },
  },
  // ---- entry ----
  {
    id: 'console', name: 'Console table', cat: 'Entry', w: 4.0, d: 1.25, h: 2.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(4.0, 0.15, 1.25, M2.walnut, 0, 2.45, 0));
      g.add(B(3.6, 0.1, 1.0, M2.walnut, 0, 0.8, 0));
      legs(g, 4.0, 1.25, 2.45, M2.metal, 0.15, 0.05);
      return g;
    },
  },
  {
    id: 'mirror', name: 'Floor mirror', cat: 'Entry', w: 2.3, d: 1.0, h: 5.9,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      const t = new THREE.Group();
      t.add(B(2.2, 5.9, 0.18, M2.oak));
      t.add(B(1.9, 5.5, 0.06, M2.mirror, 0, 0.2, 0.1));
      t.rotation.x = 0.12;
      t.position.z = -0.28;
      g.add(t);
      return g;
    },
  },
  {
    id: 'coatrack', name: 'Coat rack', cat: 'Entry', w: 1.5, d: 1.5, h: 5.9,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(C(0.55, 0.08, M2.walnut));
      g.add(C(0.06, 5.6, M2.walnut, 0, 0.08, 0));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const peg = B(0.08, 0.08, 0.9, M2.walnut, Math.cos(a) * 0.35, 5.1, Math.sin(a) * 0.35);
        peg.rotation.y = -a + Math.PI / 2;
        peg.rotation.x = -0.5;
        g.add(peg);
      }
      return g;
    },
  },
  {
    id: 'shoecab', name: 'Shoe cabinet', cat: 'Entry', w: 2.6, d: 1.0, h: 3.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(2.6, 3.3, 1.0, M2.white, 0, 0.3, 0));
      legs(g, 2.6, 1.0, 0.3, M2.metal, 0.15, 0.05);
      for (let i = 0; i < 3; i++) g.add(B(2.3, 0.05, 0.03, M2.metal, 0, 0.85 + i * 0.95, 0.51));
      return g;
    },
  },
  // ---- art (placeholder pieces) ----
  {
    id: 'artL', name: 'Canvas 60×40', cat: 'Art', w: 5.0, d: 0.35, h: 6.5,
    build: () => framedArt(5.0, 3.4, 31, 4.8),
  },
  {
    id: 'artM', name: 'Framed print 30×44', cat: 'Art', w: 2.6, d: 0.35, h: 6.8,
    build: () => framedArt(2.6, 3.6, 47, 5.0),
  },
  {
    id: 'artSet', name: 'Gallery set (3)', cat: 'Art', w: 5.6, d: 0.35, h: 6.0,
    build: () => {
      const g = new THREE.Group();
      [-1.95, 0, 1.95].forEach((x, i) => g.add(framedArt(1.6, 2.0, 61 + i * 17, 5.0, x)));
      return g;
    },
  },
  {
    id: 'artlean', name: 'Leaning canvas', cat: 'Art', w: 4.2, d: 1.0, h: 5.5,
    build: () => {
      const g = new THREE.Group();
      const t = framedArt(4.2, 5.4, 83, 2.7);
      t.rotation.x = 0.12;
      t.position.z = -0.28;
      g.add(t);
      return g;
    },
  },
  {
    id: 'sculpt', name: 'Sculpture + pedestal', cat: 'Art', w: 1.4, d: 1.4, h: 4.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(1.3, 3.2, 1.3, M2.white));
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.42, 0.13, 64, 10), M2.brass);
      knot.position.y = 3.95;
      knot.castShadow = true;
      g.add(knot);
      return g;
    },
  },
  // ---- balcony ----
  {
    id: 'outchair', name: 'Outdoor chair', cat: 'Balcony', w: 2.3, d: 2.5, h: 2.9,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      for (let i = 0; i < 5; i++) {                                  // slatted seat
        g.add(B(1.9, 0.13, 0.28, M2.teak, 0, 0.9, -0.82 + i * 0.42, 0.045 * SOFT));
      }
      for (let i = 0; i < 4; i++) {                                  // slatted back
        g.add(B(1.9, 0.3, 0.13, M2.teak, 0, 1.06 + i * 0.44, -1.02, 0.045 * SOFT));
      }
      for (const sx of [-1, 1]) {
        g.add(B(0.13, 0.11, 2.1, M2.metal, sx * 1.02, 1.5, -0.05));  // arm
        g.add(B(0.11, 1.5, 0.11, M2.metal, sx * 1.02, 0, -1.0));     // rear leg
        g.add(B(0.11, 1.5, 0.11, M2.metal, sx * 1.02, 0, 0.9));      // front leg
        g.add(B(0.11, 0.62, 0.11, M2.metal, sx * 1.02, 2.28, -1.02));
      }
      return g;
    },
  },
  {
    id: 'bistro', name: 'Bistro table', cat: 'Balcony', w: 2.2, d: 2.2, h: 2.4, surface: true,
    build: () => {
      const g = new THREE.Group();
      g.add(C(1.1, 0.08, m().metal, 0, 2.3, 0));
      g.add(C(0.07, 2.3, m().metal));
      g.add(C(0.7, 0.05, m().metal));
      return g;
    },
  },
  {
    id: 'outsofa', name: 'Outdoor loveseat', cat: 'Balcony', w: 4.6, d: 2.6, h: 2.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(4.6, 0.35, 2.6, M2.teak, 0, 0.55, 0));
      for (const sx of [-1, 1]) g.add(B(0.35, 1.3, 2.6, M2.teak, sx * 2.12, 0.3, 0, 0.06 * SOFT));
      g.add(B(4.6, 1.5, 0.35, M2.teak, 0, 0.45, -1.12));
      g.add(B(3.7, 0.45, 2.0, M2.fabric, 0, 0.9, 0.15, 0.14 * SOFT));
      g.add(B(3.7, 1.0, 0.4, M2.fabric, 0, 1.35, -0.82, 0.15 * SOFT));
      legs(g, 4.6, 2.6, 0.55, M2.metal, 0.3, 0.07);
      return g;
    },
  },
  {
    id: 'lounger', name: 'Sun lounger', cat: 'Balcony', w: 2.2, d: 5.4, h: 2.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      for (let i = 0; i < 8; i++) {                                   // slatted deck
        g.add(B(2.0, 0.13, 0.3, M2.teak, 0, 0.78, -0.9 + i * 0.44, 0.045 * SOFT));
      }
      const back = new THREE.Group();                                 // raised backrest
      for (let i = 0; i < 5; i++) back.add(B(2.0, 0.13, 0.3, M2.teak, 0, 0, -0.1 - i * 0.44, 0.045 * SOFT));
      back.rotation.x = -0.62;
      back.position.set(0, 0.85, -0.95);
      g.add(back);
      for (const sx of [-1, 1]) {
        g.add(B(0.12, 0.78, 0.12, M2.metal, sx * 0.96, 0, -0.8));
        g.add(B(0.12, 0.78, 0.12, M2.metal, sx * 0.96, 0, 2.3));
        g.add(B(0.1, 0.1, 4.2, M2.metal, sx * 0.96, 0.72, 0.7));      // side rail
      }
      return g;
    },
  },
  {
    id: 'planter', name: 'Planter box', cat: 'Balcony', w: 2.8, d: 1.1, h: 2.7,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(2.8, 1.4, 1.1, M2.plantPot));
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.5, 6), M2.leaf);
        leaf.position.set(-1.1 + i * 0.44, 2.05, i % 2 ? 0.2 : -0.2);
        leaf.castShadow = true;
        g.add(leaf);
      }
      return g;
    },
  },
];

let blobMat = null;

// Soft ambient-occlusion patch on the floor under a piece. Sits just above rug
// height so items placed on a rug still read as grounded.
function contactShadow(def) {
  if (!blobMat) {
    blobMat = new THREE.MeshBasicMaterial({
      map: blobShadow(), color: 0x0d1015, transparent: true,
      opacity: 0.5, depthWrite: false,
    });
  }
  const s = new THREE.Mesh(new THREE.PlaneGeometry(def.w * 1.35, def.d * 1.35), blobMat);
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.095;
  s.renderOrder = 1;
  s.raycast = () => {};
  return s;
}

export function buildItem(id) {
  const def = CATALOG.find((c) => c.id === id);
  if (!def) return null;
  const g = def.build();
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // a piece only ever moves as a whole, so its parts can collapse to one mesh per
  // material — a furnished plan goes from ~250 draw calls to ~100
  mergeStatic(g);
  // rugs are flat and wall art hangs clear of the floor — neither casts a pool
  if (Q.contactShadows && !def.flat && def.cat !== 'Art') g.add(contactShadow(def));
  g.userData.def = def;
  return g;
}
