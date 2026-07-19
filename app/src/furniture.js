// Procedural furniture catalog. Dimensions in feet (w = x, d = z, h = y at rot 0).
// Each builder returns a THREE.Group with its origin at floor level, footprint center.
import * as THREE from 'three';
import { walnutTexture, mapleTexture, artTexture } from './textures.js';

let mats = null;
function m() {
  if (mats) return mats;
  mats = {
    fabric: new THREE.MeshStandardMaterial({ color: 0x7e8791, roughness: 0.95 }),
    fabricDark: new THREE.MeshStandardMaterial({ color: 0x4d5560, roughness: 0.95 }),
    accent: new THREE.MeshStandardMaterial({ color: 0x8a6d54, roughness: 0.9 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.6 }),
    walnut: new THREE.MeshStandardMaterial({ map: walnutTexture(1, 1), roughness: 0.55 }),
    oak: new THREE.MeshStandardMaterial({ map: mapleTexture(1, 1), roughness: 0.6 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.4, metalness: 0.7 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc9ced2, roughness: 0.2, metalness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.8 }),
    duvet: new THREE.MeshStandardMaterial({ color: 0xdde1e4, roughness: 0.95 }),
    duvetAccent: new THREE.MeshStandardMaterial({ color: 0x5f7286, roughness: 0.95 }),
    pillow: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.2, metalness: 0.4, emissive: 0x0e1a24, emissiveIntensity: 0.4 }),
    rug1: new THREE.MeshStandardMaterial({ color: 0x9aa4a8, roughness: 1 }),
    rug2: new THREE.MeshStandardMaterial({ color: 0x7a8496, roughness: 1 }),
    plantPot: new THREE.MeshStandardMaterial({ color: 0xcfc8bb, roughness: 0.9 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4a7247, roughness: 0.9 }),
    glassTop: new THREE.MeshPhysicalMaterial({ color: 0xa8c0c8, transparent: true, opacity: 0.35, roughness: 0.1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.35, metalness: 0.8 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.05, metalness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.6 }),
  };
  return mats;
}

function B(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function C(r, h, mat, x = 0, y = 0, z = 0, rTop = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop ?? r, r, h, 20), mat);
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
    g.add(B(w - 0.3, 0.8, len - 0.5, M2.white, 0, 1.2, 0.1));        // mattress
    g.add(B(w - 0.25, 0.55, len * 0.62, M2.duvet, 0, 1.95, len * 0.17)); // duvet
    g.add(B(w - 0.25, 0.18, len * 0.2, M2.duvetAccent, 0, 2.0, len * 0.31)); // throw
    const pw = (w - 0.7) / 2;
    for (const sx of [-1, 1]) {
      g.add(B(pw, 0.45, 1.3, M2.pillow, sx * (pw / 2 + 0.12), 2.0, -len / 2 + 1.1));
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
    g.add(B(w, 0.6, d, M2.fabric, 0, 0.55, 0));                          // base
    legs(g, w, d, 0.55, M2.metal, 0.3, 0.06);
    g.add(B(w - 2 * aw, 0.5, d - 0.6, M2.fabricDark, 0, 1.15, 0.15));    // cushions
    g.add(B(w, backH - 1.1, 0.6, M2.fabric, 0, 1.1, -d / 2 + 0.3));      // back
    if (arms) {
      for (const sx of [-1, 1]) g.add(B(aw, 1.15, d, M2.fabric, sx * (w / 2 - aw / 2), 0.55, 0));
    }
    return g;
  };
}

export const CATALOG = [
  // ---- owned furniture (real dimensions) ----
  {
    id: 'my-tv', name: 'My TV console 64" + 65" TV', cat: 'My Furniture', w: 5.33, d: 1.33, h: 5.1,
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
    id: 'my-dining', name: 'My dining table 47×28', cat: 'My Furniture', w: 3.92, d: 2.33, h: 2.45, surface: true,
    build: () => {
      const g = new THREE.Group();
      g.add(B(3.92, 0.16, 2.33, m().walnut, 0, 2.29, 0));
      legs(g, 3.92, 2.33, 2.29, m().walnut, 0.3, 0.11);
      return g;
    },
  },
  {
    id: 'my-desk-l', name: 'My sit-stand desk 60×29', cat: 'My Furniture', w: 5.0, d: 2.42, h: 3.8, surface: true,
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
    id: 'my-desk-s', name: 'My sit-stand desk 28×23', cat: 'My Furniture', w: 2.33, d: 1.92, h: 3.3, surface: true,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(2.33, 0.14, 1.92, M2.oak, 0, 2.35, 0));
      for (const sx of [-1, 1]) {
        g.add(B(0.22, 2.35, 0.22, M2.metal, sx * 0.9, 0, 0));
        g.add(B(0.26, 0.1, 1.6, M2.metal, sx * 0.9, 0, 0));
      }
      g.add(B(0.95, 0.06, 0.7, M2.metal, 0, 2.49, 0.1));
      const lid = B(0.95, 0.68, 0.05, M2.screen, 0, 2.55, -0.28);
      lid.rotation.x = -0.25;
      g.add(lid);
      return g;
    },
  },
  {
    id: 'my-shelf', name: 'My bookshelf 23×12 (62" tall)', cat: 'My Furniture', w: 1.92, d: 1.0, h: 5.17,
    build: () => {
      const g = new THREE.Group();
      g.add(B(1.92, 5.17, 1.0, m().oak));
      const inset = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 1 });
      for (let i = 0; i < 5; i++) g.add(B(1.7, 0.86, 0.85, inset, 0, 0.16 + i * 0.99, 0.1));
      return g;
    },
  },
  { id: 'my-fullxl', name: 'My Full XL bed 54×80', cat: 'My Furniture', w: 4.5, d: 7.2, h: 3.6, build: bed(4.5, 7.2) },
  { id: 'my-queen', name: 'My Queen bed 60×80', cat: 'My Furniture', w: 5.0, d: 7.2, h: 3.6, build: bed(5.0, 7.2) },
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
      const g = new THREE.Group();
      g.add(C(0.55, 1.1, m().plantPot, 0, 0, 0, 0.65));
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.2, 6), m().leaf);
        const a = (i / 7) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.45, 2.6 + (i % 3) * 0.5, Math.sin(a) * 0.45);
        leaf.rotation.set(Math.cos(a) * 0.5, 0, Math.sin(a) * -0.5);
        leaf.castShadow = true;
        g.add(leaf);
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
      g.add(B(1.45, 0.25, 1.45, M2.fabricDark, 0, 1.4, 0.08));
      legs(g, 1.45, 1.45, 1.4, M2.metal, 0.12, 0.05);
      g.add(B(1.45, 1.5, 0.2, M2.fabricDark, 0, 1.6, -0.65));
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
      g.add(B(2.1, 0.3, 2.1, M2.accent, 0, 0.9, 0.1));
      g.add(B(2.1, 1.7, 0.3, M2.accent, 0, 1.0, -1.0));
      for (const sx of [-1, 1]) g.add(B(0.15, 2.0, 2.3, M2.metal, sx * 1.05, 0, 0));
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
      g.add(B(4.6, 0.35, 2.6, M2.accent, 0, 0.55, 0));
      for (const sx of [-1, 1]) g.add(B(0.35, 1.3, 2.6, M2.accent, sx * 2.12, 0.3, 0));
      g.add(B(4.6, 1.5, 0.35, M2.accent, 0, 0.45, -1.12));
      g.add(B(3.7, 0.45, 2.0, M2.fabric, 0, 0.9, 0.15));
      g.add(B(3.7, 1.0, 0.4, M2.fabric, 0, 1.35, -0.82));
      legs(g, 4.6, 2.6, 0.55, M2.metal, 0.3, 0.07);
      return g;
    },
  },
  {
    id: 'lounger', name: 'Sun lounger', cat: 'Balcony', w: 2.2, d: 5.4, h: 2.6,
    build: () => {
      const g = new THREE.Group(), M2 = m();
      g.add(B(2.2, 0.35, 3.6, M2.accent, 0, 0.75, 0.8));
      const back = B(2.2, 0.35, 2.2, M2.accent);
      back.rotation.x = -0.6;
      back.position.set(0, 1.35, -1.55);
      g.add(back);
      for (const sx of [-1, 1]) for (const z of [-0.9, 2.3]) g.add(C(0.07, 0.75, M2.metal, sx * 0.95, 0, z));
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

export function buildItem(id) {
  const def = CATALOG.find((c) => c.id === id);
  if (!def) return null;
  const g = def.build();
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.def = def;
  return g;
}
