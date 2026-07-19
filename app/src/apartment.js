// Builds the Aqua unit: walls, glazing, curved balcony, fixtures, doors.
import * as THREE from 'three';
import { H, DOOR_H, X, Z, SUITE, BALCONY, ROOMS, WALL_RECTS } from './plan.js';
import * as TEX from './textures.js';

const M = {};   // materials, filled in initMaterials()

function initMaterials() {
  M.plaster = new THREE.MeshStandardMaterial({ color: 0xe6dcc3, roughness: 0.95 });
  M.plasterExt = new THREE.MeshStandardMaterial({ color: 0xd9d5cc, roughness: 0.9 });
  M.white = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.9 });
  M.concrete = new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 0.85 }); // Aqua white slabs
  M.frame = new THREE.MeshStandardMaterial({ color: 0x2c2e30, roughness: 0.5, metalness: 0.4 });
  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0x9fb8c9, transparent: true, opacity: 0.22, roughness: 0.08,
    metalness: 0.1, side: THREE.DoubleSide, depthWrite: false,
  });
  M.railGlass = new THREE.MeshPhysicalMaterial({
    color: 0xc3d6e0, transparent: true, opacity: 0.3, roughness: 0.06,
    side: THREE.DoubleSide, depthWrite: false,
  });
  M.maple = new THREE.MeshStandardMaterial({ map: TEX.mapleTexture(1.4, 1), roughness: 0.55 });
  M.granite = new THREE.MeshStandardMaterial({ map: TEX.graniteTexture(5, 2), roughness: 0.25, metalness: 0.05 });
  M.stainless = new THREE.MeshStandardMaterial({ color: 0xc2c7cb, roughness: 0.35, metalness: 0.85 });
  M.blackAppliance = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.4, metalness: 0.3 });
  M.porcelain = new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.25 });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde0, roughness: 0.18, metalness: 0.95 });
  M.doorSlab = new THREE.MeshStandardMaterial({ color: 0xf1ece1, roughness: 0.7 });
  M.entryDoor = new THREE.MeshStandardMaterial({ map: TEX.walnutTexture(1, 1), roughness: 0.6 });
  M.wire = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, metalness: 0.35 });
  M.mirror = new THREE.MeshStandardMaterial({ color: 0xbfd2da, roughness: 0.05, metalness: 0.9 });
  M.tileWall = new THREE.MeshStandardMaterial({ map: TEX.tileTexture(6, 6), roughness: 0.4 });
}

function box(x0, y0, z0, x1, y1, z1, mat) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const m = new THREE.Mesh(g, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function reg(x0, z0, x1, z1) { WALL_RECTS.push({ x0, z0, x1, z1 }); }

// Solid wall with optional openings along its long axis.
// r = {x0,z0,x1,z1}; openings: [{a0,a1,y0,y1}] in plan coords along the long axis.
function wall(parent, r, openings = [], mat = M.plaster, register = true) {
  const alongX = (r.x1 - r.x0) >= (r.z1 - r.z0);
  const a0 = alongX ? r.x0 : r.z0, a1 = alongX ? r.x1 : r.z1;
  const ops = [...openings].sort((p, q) => p.a0 - q.a0);
  const seg = (s0, s1, y0, y1) => {
    if (s1 - s0 < 0.02 || y1 - y0 < 0.02) return;
    const m = alongX
      ? box(s0, y0, r.z0, s1, y1, r.z1, mat)
      : box(r.x0, y0, s0, r.x1, y1, s1, mat);
    parent.add(m);
    if (register && y0 === 0) {
      if (alongX) reg(s0, r.z0, s1, r.z1); else reg(r.x0, s0, r.x1, s1);
    }
  };
  let cur = a0;
  for (const op of ops) {
    seg(cur, op.a0, 0, H);
    const oy0 = op.y0 ?? 0, oy1 = op.y1 ?? DOOR_H;
    if (oy1 < H) seg(op.a0, op.a1, oy1, H);   // header
    if (oy0 > 0) seg(op.a0, op.a1, 0, oy0);   // sill
    cur = op.a1;
  }
  seg(cur, a1, 0, H);
}

// Floor-to-ceiling window run occupying a wall band.
function glazing(parent, r, { mullionEvery = 4.4, register = true } = {}) {
  const alongX = (r.x1 - r.x0) >= (r.z1 - r.z0);
  const a0 = alongX ? r.x0 : r.z0, a1 = alongX ? r.x1 : r.z1;
  const t0 = alongX ? r.z0 : r.x0, t1 = alongX ? r.z1 : r.x1;
  const tc0 = (t0 + t1) / 2 - 0.06, tc1 = (t0 + t1) / 2 + 0.06;
  const bar = (s0, s1, y0, y1, thick = 0.12) => {
    const c0 = (t0 + t1) / 2 - thick, c1 = (t0 + t1) / 2 + thick;
    parent.add(alongX ? box(s0, y0, c0, s1, y1, c1, M.frame) : box(c0, y0, s0, c1, y1, s1, M.frame));
  };
  bar(a0, a1, 0, 0.3);
  bar(a0, a1, H - 0.35, H);
  const n = Math.max(1, Math.round((a1 - a0) / mullionEvery));
  for (let i = 0; i <= n; i++) {
    const s = a0 + ((a1 - a0) * i) / n;
    bar(Math.max(a0, s - 0.07), Math.min(a1, s + 0.07), 0.3, H - 0.35);
  }
  const glass = alongX
    ? box(a0, 0.3, tc0, a1, H - 0.35, tc1, M.glass)
    : box(tc0, 0.3, a0, tc1, H - 0.35, a1, M.glass);
  glass.castShadow = false;
  parent.add(glass);
  if (register) { if (alongX) reg(a0, t0, a1, t1); else reg(t0, a0, t1, a1); }
}

// Hinged door: slab shown ajar. hinge = [x,z]; angle = world Y-rotation
// (at angle 0 the slab runs +x from the hinge).
function door(parent, width, hinge, angle, mat = M.doorSlab) {
  const g = new THREE.Group();
  g.add(box(0.04, 0, -0.06, width - 0.04, DOOR_H - 0.1, 0.06, mat));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M.chrome);
  knob.position.set(width - 0.35, 3.1, 0.12);
  g.add(knob);
  g.position.set(hinge[0], 0, hinge[1]);
  g.rotation.y = angle;
  parent.add(g);
}

function doorFrame(parent, r, opening) {
  const alongX = (r.x1 - r.x0) >= (r.z1 - r.z0);
  const j = (a) => alongX
    ? box(a - 0.06, 0, r.z0 - 0.02, a + 0.06, DOOR_H, r.z1 + 0.02, M.white)
    : box(r.x0 - 0.02, 0, a - 0.06, r.x1 + 0.02, DOOR_H, a + 0.06, M.white);
  parent.add(j(opening.a0), j(opening.a1));
  parent.add(alongX
    ? box(opening.a0, DOOR_H - 0.12, r.z0 - 0.02, opening.a1, DOOR_H, r.z1 + 0.02, M.white)
    : box(r.x0 - 0.02, DOOR_H - 0.12, opening.a0, r.x1 + 0.02, DOOR_H, opening.a1, M.white));
}

function toilet(parent, cx, cz, rotY) {
  const g = new THREE.Group();
  g.add(box(-0.75, 0.9, -0.35, 0.75, 2.5, 0.05, M.porcelain));
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 1.2, 20), M.porcelain);
  bowl.scale.z = 1.25;
  bowl.position.set(0, 0.6, 0.75);
  bowl.castShadow = true;
  g.add(bowl);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 20), M.porcelain);
  seat.scale.z = 1.25;
  seat.position.set(0, 1.35, 0.72);
  g.add(seat);
  g.position.set(cx, 0, cz);
  g.rotation.y = rotY;
  parent.add(g);
}

function bathtub(parent, x0, z0, x1, z1) {
  const g = new THREE.Group();
  g.add(box(x0, 0, z0, x1, 1.55, z1, M.porcelain));
  g.add(box(x0 + 0.3, 1.0, z0 + 0.3, x1 - 0.3, 1.62, z1 - 0.3,
    new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.3 })));
  parent.add(g);
  reg(x0, z0, x1, z1);
}

function vanity(parent, { x0, z0, x1, z1, sinks, mirrorWall }) {
  parent.add(box(x0, 0, z0, x1, 2.7, z1, M.maple));
  parent.add(box(x0 - 0.06, 2.7, z0 - 0.06, x1 + 0.06, 2.88, z1 + 0.06, M.granite));
  for (const [sx, sz] of sinks) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.25, 20), M.porcelain);
    s.scale.z = 0.75;
    s.position.set(sx, 2.92, sz);
    parent.add(s);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 10), M.chrome);
    f.position.set(sx + (mirrorWall === 'e' ? 0.55 : 0), 3.2, sz + (mirrorWall === 'n' ? -0.5 : 0));
    parent.add(f);
  }
  if (mirrorWall === 'e') parent.add(box(x1 + 0.08, 3.4, z0 + 0.2, x1 + 0.14, 7.2, z1 - 0.2, M.mirror));
  if (mirrorWall === 'n') parent.add(box(x0 + 0.2, 3.4, z0 - 0.14, x1 - 0.2, 7.2, z0 - 0.08, M.mirror));
  reg(x0, z0, x1, z1);
}

function wireShelf(parent, x0, z0, x1, z1, y) {
  parent.add(box(x0, y, z0, x1, y + 0.08, z1, M.wire));
  const alongX = (x1 - x0) > (z1 - z0);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, alongX ? x1 - x0 : z1 - z0, 8), M.wire);
  if (alongX) rod.rotation.z = Math.PI / 2; else rod.rotation.x = Math.PI / 2;
  rod.position.set((x0 + x1) / 2, y - 0.28, (z0 + z1) / 2);
  parent.add(rod);
}

function buildKitchen(g) {
  // --- peninsula (north side, open to living over a raised granite bar) ---
  // runs x 16.2 -> 24.6, dies into the small structural column at its east end
  const px0 = 16.2, px1 = 24.6;
  g.add(box(px0, 0, 14.13, px1, 3.42, 14.45, M.maple));                    // bar back panel
  g.add(box(px0 - 0.15, 3.42, 13.82, px1 + 0.02, 3.58, 14.95, M.granite)); // raised bar cap
  g.add(box(px0, 0, 14.45, px1, 2.95, 16.45, M.maple));                    // base cabinets
  g.add(box(px0 - 0.1, 2.95, 14.45, px1 + 0.02, 3.12, 16.62, M.granite));  // counter
  for (let i = 0; i < 3; i++) {
    g.add(box(px0 + 0.4 + i * 1.05, 0.35, 16.45, px0 + 0.45 + i * 1.05, 2.8, 16.47, M.frame));
  }
  g.add(box(22.1, 0.35, 16.45, 22.15, 2.8, 16.47, M.frame));
  // dishwasher
  g.add(box(17.55, 0.12, 14.6, 19.45, 2.95, 16.5, M.stainless));
  g.add(box(17.6, 2.6, 16.5, 19.4, 2.9, 16.55, M.blackAppliance));
  // sink + faucet
  g.add(box(19.9, 3.12, 15.0, 21.9, 3.16, 16.3, M.stainless));
  g.add(box(20.05, 3.14, 15.15, 21.75, 3.18, 16.15,
    new THREE.MeshStandardMaterial({ color: 0x8f969b, roughness: 0.3, metalness: 0.8 })));
  const fpost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.15, 10), M.chrome);
  fpost.position.set(20.9, 3.7, 14.95);
  g.add(fpost);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 16, Math.PI), M.chrome);
  arc.position.set(20.9, 4.27, 15.15);
  arc.rotation.y = Math.PI / 2;
  g.add(arc);
  reg(px0 - 0.15, 14.13, px1, 16.62);   // base footprint; stools tuck under the bar overhang

  // --- countertop narrows in front of the column (straight south edge) and runs
  // straight to the window; full glass between here and the chase column
  g.add(box(24.6, 0, 15.7, X.ei, 2.95, 16.45, M.maple));         // narrow strip base
  g.add(box(24.6, 2.95, 15.62, X.ei + 0.05, 3.12, 16.62, M.granite));
  g.add(box(25.72, 0.35, 16.45, 25.77, 2.8, 16.47, M.frame));
  reg(24.6, 15.62, X.ei, 16.62);

  // --- south run: fridge, base + upper cabinets, range, microwave ---
  g.add(box(19.3, 0, 20.35, 25.5, 2.95, 22.25, M.maple));
  g.add(box(19.25, 2.95, 20.18, 25.55, 3.12, 22.25, M.granite));
  g.add(box(19.3, 3.12, 22.05, 25.5, 3.5, 22.25, M.granite));               // backsplash curb
  g.add(box(19.3, 3.5, 22.18, 25.5, 4.6, 22.25, M.tileWall));               // glass tile backsplash
  for (let i = 0; i < 2; i++) {
    g.add(box(19.7 + i * 1.35, 0.35, 20.33, 19.75 + i * 1.35, 2.8, 20.35, M.frame));
  }
  g.add(box(24.4, 0.35, 20.33, 24.45, 2.8, 20.35, M.frame));
  // fridge
  g.add(box(16.45, 0, 19.8, 19.25, 5.9, 22.2, M.stainless));
  g.add(box(16.5, 3.62, 19.78, 19.2, 3.68, 19.8, M.blackAppliance));
  g.add(box(17.0, 3.9, 19.68, 17.12, 5.5, 19.8, M.chrome));
  g.add(box(17.0, 2.0, 19.68, 17.12, 3.4, 19.8, M.chrome));
  reg(16.45, 19.78, 25.55, 22.25);
  // range
  g.add(box(21.4, 0.1, 20.3, 23.9, 3.05, 22.25, M.stainless));
  g.add(box(21.45, 3.05, 20.35, 23.85, 3.1, 22.2, M.blackAppliance));
  for (const [bx, bz] of [[22.0, 20.85], [23.3, 20.85], [22.0, 21.7], [23.3, 21.7]]) {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 16), M.frame);
    burner.position.set(bx, 3.12, bz);
    g.add(burner);
  }
  g.add(box(21.5, 1.4, 20.24, 23.8, 1.52, 20.3, M.chrome));                  // oven handle
  // microwave + uppers
  g.add(box(21.4, 4.5, 21.05, 23.9, 5.6, 22.25, M.blackAppliance));
  g.add(box(19.3, 4.6, 21.35, 21.4, 7.3, 22.25, M.maple));
  g.add(box(23.9, 4.6, 21.35, 25.5, 7.3, 22.25, M.maple));
  g.add(box(19.3, 5.6, 21.35, 25.5, 7.3, 22.25, M.maple));

  // pendant light over sink + track light
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 6), M.frame);
  cord.position.set(20.9, H - 1.0, 15.6);
  g.add(cord);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.42, 0.75, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8a13c, emissive: 0xcf7d1e, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  shade.position.set(20.9, H - 2.2, 15.6);
  g.add(shade);
  g.add(box(18.5, H - 0.15, 18.3, 24.5, H - 0.05, 18.45, M.frame));
  for (let i = 0; i < 4; i++) {
    const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.4, 10), M.chrome);
    spot.position.set(19.3 + i * 1.55, H - 0.4, 18.38);
    spot.rotation.x = 0.5;
    g.add(spot);
  }
}

function buildBaths(g) {
  // master bath (x 0.55-8.9, z 23.25-32.3), entered from the suite passage
  bathtub(g, 0.7, 27.15, 3.2, 32.15);                                       // tub, SW corner
  vanity(g, { x0: 7.0, z0: 23.6, x1: 8.84, z1: 28.6, sinks: [[7.95, 24.9], [7.95, 27.3]], mirrorWall: 'e' });
  toilet(g, 7.55, 31.15, -Math.PI / 2);                                     // tank at east chase, faces west
  WALL_RECTS.push({ x0: 6.3, z0: 30.4, x1: 8.8, z1: 31.9 });

  // bath 2 (x 16.9-27.86, z 22.6-30.35)
  vanity(g, { x0: 17.3, z0: 22.75, x1: 20.8, z1: 24.65, sinks: [[19.05, 23.6]], mirrorWall: 'n' });
  toilet(g, 22.15, 23.4, 0);                                                // tank north, faces south
  WALL_RECTS.push({ x0: 21.4, z0: 22.75, x1: 22.9, z1: 24.5 });
  bathtub(g, 25.3, 23.7, 27.8, 28.7);                                       // tub against the east wall
}

function buildClosets(g) {
  // walk-in (x 4.65-11.88, z 16.82-22.9), wire shelving like the tour photo
  wireShelf(g, 4.9, 16.95, 11.6, 17.95, 5.6);     // north side
  wireShelf(g, 4.9, 21.85, 10.5, 22.85, 5.6);     // south side
  for (let i = 0; i < 4; i++) {
    g.add(box(10.75, 1.4 + i * 1.35, 17.15, 11.8, 1.48 + i * 1.35, 22.6, M.wire)); // east tiers
  }
  // hall closet (x 10.2-11.88, z 23.25-25.65)
  wireShelf(g, 10.4, 23.45, 11.75, 24.4, 5.6);
  // bedroom 2 closet bump
  wireShelf(g, 15.8, 40.55, 19.9, 41.45, 5.6);
  // stacked washer/dryer in foyer closet (units at the east face, per the plan;
  // the space behind them at the west is dead/plumbing depth)
  g.add(box(3.3, 0, 34.5, 5.6, 3.1, 36.8, M.white));
  g.add(box(3.3, 3.1, 34.5, 5.6, 6.2, 36.8, M.white));
  const wDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 20), M.frame);
  wDoor.rotation.z = Math.PI / 2;
  wDoor.position.set(5.61, 4.6, 35.65);
  g.add(wDoor);
  reg(3.3, 34.5, 5.6, 36.8);
}

function buildDoors(g) {
  const HPI = Math.PI / 2;
  // master entry door (opening z 13.55-15.95 in the divider wall), hinge north,
  // swings west into the master bedroom
  doorFrame(g, { x0: X.div0, z0: SUITE.mDoor0, x1: X.div1, z1: SUITE.mDoor1 },
    { a0: SUITE.mDoor0, a1: SUITE.mDoor1 });
  door(g, 2.4, [X.div0 + 0.2, SUITE.mDoor0 + 0.07], -HPI - 1.0);
  // walk-in door (opening z 18.8-21.2 in west wall x 4.3-4.65), swings into closet
  doorFrame(g, { x0: SUITE.clW0, z0: 18.8, x1: SUITE.clW1, z1: 21.2 }, { a0: 18.8, a1: 21.2 });
  door(g, 2.4, [(SUITE.clW0 + SUITE.clW1) / 2, 18.86], -1.05);
  // master bath door (opening x 1.2-3.6 in band z 22.9-23.25), swings into bath
  doorFrame(g, { x0: 1.2, z0: Z.suS0, x1: 3.6, z1: Z.suS1 }, { a0: 1.2, a1: 3.6 });
  door(g, 2.3, [1.25, Z.suS1 - 0.05], -1.15);
  // hall closet bifold (opening z 23.55-25.35 in the divider wall)
  doorFrame(g, { x0: X.div0, z0: SUITE.scDoor0, x1: X.div1, z1: SUITE.scDoor1 },
    { a0: SUITE.scDoor0, a1: SUITE.scDoor1 });
  door(g, 0.95, [X.div1 - 0.05, SUITE.scDoor0 + 0.05], -HPI + 0.75);
  door(g, 0.95, [X.div1 - 0.05, SUITE.scDoor1 - 0.05], HPI - 0.75 + Math.PI);
  // bath 2 door (opening z 25.7-28.0 in wall x 16.55-16.9), hinge south, swings into bath
  doorFrame(g, { x0: 16.55, z0: 25.7, x1: 16.9, z1: 28.0 }, { a0: 25.7, a1: 28.0 });
  door(g, 2.3, [16.72, 27.95], HPI + 0.9);
  // bedroom 2 door (opening z 36.0-38.5 in west wall x 13.21-13.61), beside the entry,
  // hinge south, swings into the bedroom
  doorFrame(g, { x0: 13.21, z0: 36.0, x1: 13.61, z1: 38.5 }, { a0: 36.0, a1: 38.5 });
  door(g, 2.5, [13.4, 38.42], Math.PI * 0.25);
  // entry: single 3' door (opening x 7.6-10.6 in south wall z 39.7-40.25),
  // hinged at the west jamb, swings into the foyer — drawn closed
  doorFrame(g, { x0: 7.6, z0: Z.b2S0, x1: 10.6, z1: Z.b2S1 }, { a0: 7.6, a1: 10.6 });
  door(g, 2.94, [7.66, Z.b2S0 + 0.27], 0, M.entryDoor);
  reg(7.6, Z.b2S0, 10.6, Z.b2S1); // closed door blocks movement
  // W/D bifold (opening z 33.6-38.6 in wall x 5.7-6.05)
  doorFrame(g, { x0: 5.7, z0: 33.6, x1: 6.05, z1: 38.6 }, { a0: 33.6, a1: 38.6 });
  door(g, 2.45, [5.88, 33.65], HPI - 0.5);
  door(g, 2.45, [5.88, 38.55], -HPI + 0.5);
  // bedroom 2 closet french doors (opening x 15.6-20.1 in wall z 39.7-40.25)
  doorFrame(g, { x0: 15.6, z0: Z.b2S0, x1: 20.1, z1: Z.b2S1 }, { a0: 15.6, a1: 20.1 });
  door(g, 2.2, [15.68, Z.b2S0 + 0.27], -0.5);
  door(g, 2.2, [20.02, Z.b2S0 + 0.27], Math.PI + 0.5);
}

function buildBalcony(g, ceil) {
  const curve = new THREE.CatmullRomCurve3(
    BALCONY.outer.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
  const pts = curve.getPoints(70).map((p) => [p.x, p.z]);

  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (const [x, z] of pts) shape.lineTo(x, z);
  shape.lineTo(X.e1, BALCONY.eEndZ);
  shape.lineTo(X.e1, 0);
  shape.closePath();

  const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
  slabGeo.rotateX(Math.PI / 2);   // shape (x, y=z) -> plan (x, z), extrude downward
  const slab = new THREE.Mesh(slabGeo, M.concrete);
  slab.castShadow = true;
  slab.receiveShadow = true;
  g.add(slab);

  const roof = new THREE.Mesh(slabGeo.clone(), M.concrete);
  roof.position.y = H + 0.55;
  roof.castShadow = true;
  ceil.add(roof);

  // glass railing along the outer curve
  const rail = new THREE.Group();
  const verts = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    verts.push(x, 0.15, z, x, 3.35, z);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  glassGeo.setIndex(idx);
  glassGeo.computeVertexNormals();
  rail.add(new THREE.Mesh(glassGeo, M.railGlass));
  const railTube = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 3.45, z))), 70, 0.09, 8);
  rail.add(new THREE.Mesh(railTube, M.frame));
  for (let i = 0; i < pts.length; i += 7) {
    const [x, z] = pts[i];
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 8), M.frame);
    post.position.set(x, 1.7, z);
    rail.add(post);
  }
  g.add(rail);

  return [...pts, [X.e1, BALCONY.eEndZ], [X.e1, 0]];
}

export function buildApartment(scene) {
  initMaterials();
  WALL_RECTS.length = 0;

  const group = new THREE.Group();
  const sides = { N: new THREE.Group(), S: new THREE.Group(), E: new THREE.Group(), W: new THREE.Group() };
  const interior = new THREE.Group();
  const ceilingGroup = new THREE.Group();
  const labelGroup = new THREE.Group();

  // ---------- floors / ceilings / labels ----------
  for (const r of ROOMS) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    if (w <= 0 || d <= 0) continue;
    const tex = r.floor === 'carpet' ? TEX.carpetTexture(w, d) : TEX.tileTexture(w, d);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    f.rotation.x = -Math.PI / 2;
    f.position.set((r.x0 + r.x1) / 2, 0.01, (r.z0 + r.z1) / 2);
    f.receiveShadow = true;
    interior.add(f);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.white);
    c.rotation.x = Math.PI / 2;
    c.position.set((r.x0 + r.x1) / 2, H, (r.z0 + r.z1) / 2);
    ceilingGroup.add(c);
    if (r.name) {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 128;
      const ctx = cv.getContext('2d');
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(30,35,40,0.85)';
      ctx.font = '600 44px system-ui, sans-serif';
      ctx.fillText(r.name, 256, 56);
      ctx.font = '400 34px system-ui, sans-serif';
      ctx.fillText(r.label || '', 256, 102);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      const lw = Math.min(8, w * 0.9);
      const lm = new THREE.Mesh(new THREE.PlaneGeometry(lw, lw / 4),
        new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      lm.rotation.x = -Math.PI / 2;
      lm.position.set((r.x0 + r.x1) / 2, 0.06, (r.z0 + r.z1) / 2);
      labelGroup.add(lm);
    }
  }

  // subfloor slab under everything
  group.add(box(X.w0 - 0.2, -0.6, Z.n0 - 0.2, X.e1 + 0.2, -0.02, Z.bumpS1 + 0.2, M.concrete));

  // ---------- perimeter ----------
  // west
  wall(sides.W, { x0: X.w0, z0: Z.n0, x1: X.wi, z1: Z.b2S1 }, [], M.plasterExt);
  // north: solid piers + glazing
  wall(sides.N, { x0: X.w0, z0: Z.n0, x1: 1.5, z1: Z.ni }, [], M.plasterExt);
  glazing(sides.N, { x0: 1.5, z0: Z.n0, x1: 11.5, z1: Z.ni });
  wall(sides.N, { x0: 11.5, z0: Z.n0, x1: 13.7, z1: Z.ni }, [], M.plasterExt);
  glazing(sides.N, { x0: 13.7, z0: Z.n0, x1: 15.6, z1: Z.ni }, { mullionEvery: 3 });
  { // sliding glass door to the north balcony (x 15.6-18.6)
    const fr = sides.N;
    fr.add(box(15.6, 0, Z.n0, 18.6, 0.3, Z.ni, M.frame));
    fr.add(box(15.6, H - 0.35, Z.n0, 18.6, H, Z.ni, M.frame));
    fr.add(box(15.54, 0.3, Z.n0, 15.74, H - 0.35, Z.ni, M.frame));
    fr.add(box(18.46, 0.3, Z.n0, 18.66, H - 0.35, Z.ni, M.frame));
    const p1 = box(15.7, 0.3, Z.n0 + 0.08, 17.2, H - 0.35, Z.n0 + 0.19, M.glass);  // fixed
    const p2 = box(15.9, 0.3, Z.n0 + 0.31, 17.55, H - 0.35, Z.n0 + 0.42, M.glass); // slid open
    p1.castShadow = p2.castShadow = false;
    fr.add(p1, p2);
    fr.add(box(17.4, 0.3, Z.n0 + 0.25, 17.55, H - 0.35, Z.n0 + 0.5, M.frame));
    reg(15.6, Z.n0, 17.6, Z.ni); // fixed panel blocks; x 17.6-18.6 open to balcony
  }
  glazing(sides.N, { x0: 18.6, z0: Z.n0, x1: 24.6, z1: Z.ni });
  wall(sides.N, { x0: 24.6, z0: Z.n0, x1: X.e1, z1: Z.ni }, [], M.plasterExt);
  // NE structural column (interior mass)
  wall(interior, { x0: 24.7, z0: Z.ni, x1: X.ei, z1: 4.8 }, [], M.plaster);
  // column at the north end of the master/living divider
  wall(interior, { x0: 11.5, z0: Z.ni, x1: 13.7, z1: 2.6 }, [], M.plaster);
  // east face, north to south
  wall(sides.E, { x0: X.ei, z0: Z.ni, x1: X.e1, z1: 4.8 }, [], M.plasterExt);
  glazing(sides.E, { x0: X.ei, z0: 4.8, x1: X.e1, z1: 13.85 });              // living
  wall(sides.E, { x0: X.ei, z0: 13.85, x1: X.e1, z1: 15.7 }, [], M.plasterExt); // countertop column back
  glazing(sides.E, { x0: X.ei, z0: 15.7, x1: X.e1, z1: 19.4 }, { mullionEvery: 3 }); // behind return counter
  wall(sides.E, { x0: 26.2, z0: 19.4, x1: X.e1, z1: Z.ktS1 }, [], M.plaster); // chase, against kitchen-bath wall
  wall(sides.E, { x0: X.ei, z0: Z.ktS1, x1: X.e1, z1: Z.b2N0 }, [], M.plasterExt); // bath 2: solid, no windows
  wall(sides.E, { x0: X.ei, z0: Z.b2N0, x1: X.e1, z1: 32.1 }, [], M.plasterExt); // band + bed2 corner column back
  glazing(sides.E, { x0: X.ei, z0: 32.1, x1: X.e1, z1: Z.b2S0 });            // bedroom 2
  wall(sides.E, { x0: X.ei, z0: Z.b2S0, x1: X.e1, z1: Z.b2S1 }, [], M.plasterExt);
  // south: entry side + bedroom 2 with windows both sides of closet bump
  wall(sides.S, { x0: X.w0, z0: Z.b2S0, x1: 13.61, z1: Z.b2S1 },
    [{ a0: 7.6, a1: 10.6 }], M.plasterExt);
  // bedroom 2 south side: solid wall + closet, no windows
  wall(sides.S, { x0: 13.61, z0: Z.b2S0, x1: 15.6, z1: Z.b2S1 }, [], M.plasterExt);
  wall(sides.S, { x0: 20.1, z0: Z.b2S0, x1: X.e1, z1: Z.b2S1 }, [], M.plasterExt);
  // closet bump-out walls
  wall(sides.S, { x0: 15.05, z0: Z.b2S1, x1: 15.6, z1: Z.bumpS1 }, [], M.plasterExt);
  wall(sides.S, { x0: 20.1, z0: Z.b2S1, x1: 20.65, z1: Z.bumpS1 }, [], M.plasterExt);
  wall(sides.S, { x0: 15.05, z0: Z.bumpS, x1: 20.65, z1: Z.bumpS1 }, [], M.plasterExt);

  // ---------- interior walls ----------
  // master/living divider — ONE straight wall face (x 11.88-12.28) running from
  // the north column to the hall closet's south end. Holds the master entry door
  // and the hall closet bifold; its west side is the walk-in's back wall.
  wall(interior, { x0: X.div0, z0: Z.ni, x1: X.div1, z1: SUITE.divEnd },
    [{ a0: SUITE.mDoor0, a1: SUITE.mDoor1 }, { a0: SUITE.scDoor0, a1: SUITE.scDoor1 }]);
  // master south wall: passage fully open at the west (no doorway), solid to divider
  wall(interior, { x0: SUITE.passX1, z0: Z.mS0, x1: X.div0, z1: Z.mS1 });
  // walk-in west wall with door
  wall(interior, { x0: SUITE.clW0, z0: Z.mS1, x1: SUITE.clW1, z1: Z.suS0 },
    [{ a0: 18.8, a1: 21.2 }]);
  // closet-south / bath-north band with bath door at passage
  wall(interior, { x0: X.wi, z0: Z.suS0, x1: X.div0, z1: Z.suS1 },
    [{ a0: 1.2, a1: 3.6 }]);
  // short wall stub at the north edge of the master bath tub (tub alcove)
  wall(interior, { x0: X.wi, z0: 26.75, x1: 3.35, z1: 27.15 });
  // plumbing chase east of bath
  wall(interior, { x0: SUITE.chaseX0, z0: Z.suS1, x1: SUITE.chaseX1, z1: Z.ba1S1 });
  // bath south wall
  wall(interior, { x0: X.wi, z0: Z.ba1S0, x1: SUITE.chaseX0, z1: Z.ba1S1 });
  // hall closet south wall
  wall(interior, { x0: SUITE.chaseX1, z0: 25.65, x1: X.div1, z1: SUITE.divEnd });
  // W/D closet: east wall with bifold spans the full foyer side, no gaps;
  // the closet is ~5.2 ft deep (bifold plane x 5.7-6.05)
  wall(interior, { x0: 5.7, z0: Z.ba1S1, x1: 6.05, z1: Z.b2S0 }, [{ a0: 33.6, a1: 38.6 }]);
  // countertop column: intersects the peninsula's east end and runs to the wall
  wall(interior, { x0: 24.6, z0: 13.85, x1: X.ei, z1: 15.7 });
  // kitchen south wall
  wall(interior, { x0: 16.2, z0: Z.ktS0, x1: X.ei, z1: Z.ktS1 });
  // bath 2 west wall with door (hinge south)
  wall(interior, { x0: 16.55, z0: Z.ktS1, x1: 16.9, z1: Z.b2N0 }, [{ a0: 25.7, a1: 28.0 }]);
  // bedroom 2 north wall — solid
  wall(interior, { x0: 13.21, z0: Z.b2N0, x1: X.ei, z1: Z.b2N1 });
  // bedroom 2 west wall with door beside the entry
  wall(interior, { x0: 13.21, z0: Z.b2N1, x1: 13.61, z1: Z.b2S0 }, [{ a0: 36.0, a1: 38.5 }]);
  // bedroom 2 corner column next to the windows
  wall(interior, { x0: 25.7, z0: Z.b2N1, x1: X.ei, z1: 32.1 });

  // ---------- fixtures, doors, balcony ----------
  buildKitchen(interior);
  buildBaths(interior);
  buildClosets(interior);
  buildDoors(interior);
  const balconyPoly = buildBalcony(group, ceilingGroup);

  // prepare fade: clone materials per perimeter mesh so opacity is independent
  for (const key of Object.keys(sides)) {
    sides[key].traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.userData.baseOpacity = o.material.transparent ? o.material.opacity : 1;
      }
    });
  }

  group.add(interior, sides.N, sides.S, sides.E, sides.W, ceilingGroup, labelGroup);
  scene.add(group);
  ceilingGroup.visible = false;

  return { group, sides, interior, ceilingGroup, labelGroup, balconyPoly, obstacles: WALL_RECTS };
}
