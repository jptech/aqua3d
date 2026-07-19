// Floorplan model for Aqua (Chicago) 2BD/2BA ~1080 sqft unit.
// Units: feet. Origin at exterior NW corner. +x = east, +z = south, +y = up.
// Derived from floorplan.png: Master 11'4" x 15'11", Living/Dining 15'7" x 13'7",
// Bedroom 2 14'3" x 9'0", balcony 17'11" x 23'2" (overall bounding box).

export const H = 9.0;          // ceiling height
export const DOOR_H = 6.8;     // door/opening header height
export const EXT = 0.55;       // exterior wall thickness
export const INT = 0.35;       // interior wall thickness

// ---- key coordinates -------------------------------------------------------
export const X = {
  w0: 0, wi: 0.55,             // west exterior face / interior
  div0: 11.88, div1: 12.28,    // master <-> living divider wall
  ei: 27.86, e1: 28.41,        // east interior / exterior face
};
export const Z = {
  n0: 0, ni: 0.55,             // north face / interior
  mS0: 16.47, mS1: 16.82,      // master south wall
  liS: 14.13,                  // living/dining south edge (open to kitchen)
  ktS0: 22.25, ktS1: 22.6,     // kitchen south wall
  suS0: 22.9, suS1: 23.25,     // walk-in-closet south / master-bath north band
  ba1S0: 32.3, ba1S1: 32.65,   // master bath south wall
  b2N0: 30.35, b2N1: 30.7,     // bedroom 2 north wall band
  b2S0: 39.7, b2S1: 40.25,     // south wall (foyer entry + bedroom 2)
  bumpS: 41.6, bumpS1: 42.15,  // bedroom2 closet bump-out
};

// master suite internals
export const SUITE = {
  passX0: 0.55, passX1: 4.3,       // passage master -> bath (fully open, no doorway)
  clW0: 4.3, clW1: 4.65,           // walk-in west wall (holds closet door)
  chaseX0: 8.9, chaseX1: 10.2,     // plumbing chase east of bath
  ba1E: 8.9,                       // bath east extent
  // the divider wall face runs straight: master inward wall + entry door,
  // walk-in back wall, and hall-closet east wall are all one plane (x 11.88-12.28)
  mDoor0: 13.55, mDoor1: 15.95,    // master entry door opening in the divider
  scDoor0: 23.55, scDoor1: 25.35,  // hall closet bifold opening in the divider
  divEnd: 26.0,                    // divider ends at the hall closet's south wall
};

// The plan's 17'11" x 23'2" are the balcony's OVERALL bounding box: 17'11" from
// the west end (at the SGD) to the curve's east extremity (~5 ft past the east
// facade), 23'2" from the curve's north extremity to where the parapet rejoins
// the facade at the chase column. Neither is measured from the unit's walls.
export const BALCONY = {
  nStartX: 15.5,               // west end, at the sliding glass door
  eEndZ: 19.0,                 // parapet rejoins the east facade at the chase column
  // outer curved edge control points (Catmull-Rom), Aqua's signature wave
  outer: [
    [15.5, 0.0],
    [17.2, -1.7],
    [19.8, -3.1],
    [23.0, -4.0],
    [26.5, -4.2],
    [29.6, -3.4],
    [31.9, -1.4],
    [33.1, 1.5],
    [33.4, 5.0],
    [32.9, 8.8],
    [31.7, 12.6],
    [30.1, 16.2],
    [X.e1, 19.0],
  ],
};

// ---- rooms (floor surfaces + labels) ---------------------------------------
// floor: 'carpet' | 'tile'
export const ROOMS = [
  { id: 'master',  name: 'Master Bedroom', label: `11'4" × 15'11"`, floor: 'carpet',
    x0: X.wi, z0: Z.ni, x1: X.div0, z1: Z.mS0 },
  { id: 'living',  name: 'Living & Dining', label: `15'7" × 13'7"`, floor: 'carpet',
    x0: X.div1, z0: Z.ni, x1: X.ei, z1: Z.liS },
  { id: 'kitchen', name: 'Kitchen', label: '', floor: 'tile',
    x0: X.div1, z0: Z.liS, x1: X.ei, z1: Z.ktS1 },
  { id: 'passage', name: '', label: '', floor: 'carpet',
    x0: X.wi, z0: Z.mS1, x1: SUITE.clW0, z1: Z.suS1 },
  { id: 'walkin',  name: 'Walk-in', label: '', floor: 'carpet',
    x0: SUITE.clW1, z0: Z.mS1, x1: X.div0, z1: Z.suS0 },
  { id: 'bath1',   name: 'Bath', label: '', floor: 'tile',
    x0: X.wi, z0: Z.suS1, x1: SUITE.ba1E, z1: Z.ba1S0 },
  { id: 'smcloset', name: '', label: '', floor: 'tile',
    x0: SUITE.chaseX1, z0: Z.suS1, x1: X.div0, z1: 25.65 },
  { id: 'hall2',   name: '', label: '', floor: 'tile',
    x0: X.div1, z0: Z.ktS1, x1: 16.55, z1: Z.b2N1 },
  { id: 'bath2',   name: 'Bath', label: '', floor: 'tile',
    x0: 16.9, z0: Z.ktS1, x1: X.ei, z1: Z.b2N0 },
  { id: 'foyerN',  name: '', label: '', floor: 'tile',
    x0: SUITE.chaseX1, z0: SUITE.divEnd, x1: X.div1, z1: Z.ba1S1 },
  { id: 'foyerNE', name: '', label: '', floor: 'tile',
    x0: X.div1, z0: Z.b2N1, x1: 13.21, z1: Z.ba1S1 },
  { id: 'foyer',   name: 'Foyer', label: '', floor: 'tile',
    x0: X.wi, z0: Z.ba1S1, x1: 13.21, z1: Z.b2S0 },
  { id: 'bed2',    name: 'Bedroom', label: `14'3" × 9'0"`, floor: 'carpet',
    x0: 13.61, z0: Z.b2N1, x1: X.ei, z1: Z.b2S0 },
  { id: 'bump',    name: '', label: '', floor: 'carpet',
    x0: 15.6, z0: Z.b2S0, x1: 20.1, z1: Z.bumpS },
  // door/opening thresholds (floor continuity through walls)
  { id: 'th-pass',   name: '', label: '', floor: 'carpet',
    x0: SUITE.passX0, z0: Z.mS0, x1: SUITE.passX1, z1: Z.mS1 },
  { id: 'th-mdoor',  name: '', label: '', floor: 'carpet',
    x0: X.div0, z0: SUITE.mDoor0, x1: X.div1, z1: SUITE.mDoor1 },
  { id: 'th-walkin', name: '', label: '', floor: 'carpet',
    x0: SUITE.clW0, z0: 18.8, x1: SUITE.clW1, z1: 21.2 },
  { id: 'th-bath1',  name: '', label: '', floor: 'tile',
    x0: 1.2, z0: Z.suS0, x1: 3.6, z1: Z.suS1 },
  { id: 'th-smclo',  name: '', label: '', floor: 'tile',
    x0: X.div0, z0: SUITE.scDoor0, x1: X.div1, z1: SUITE.scDoor1 },
  { id: 'th-bath2',  name: '', label: '', floor: 'tile',
    x0: 16.55, z0: 25.7, x1: 16.9, z1: 28.0 },
  { id: 'th-bed2',   name: '', label: '', floor: 'carpet',
    x0: 13.21, z0: 36.0, x1: 13.61, z1: 38.5 },
  { id: 'th-wd',     name: '', label: '', floor: 'tile',
    x0: 5.7, z0: 33.6, x1: 6.05, z1: 38.6 },
  { id: 'th-sgd',    name: '', label: '', floor: 'tile',
    x0: 17.6, z0: Z.n0, x1: 18.6, z1: Z.ni },
];

// Rectangular regions where furniture may sit.
export const FLOOR_REGIONS = ROOMS.map((r) => ({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1 }));

export function pointOnFloor(x, z, balconyShapePts) {
  for (const r of FLOOR_REGIONS) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
  }
  if (balconyShapePts && pointInPoly(x, z, balconyShapePts)) return true;
  return false;
}

export function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

// ---- solid obstacle rectangles (for dimension rays + collision tinting) ----
// Filled at build time by apartment.js; each entry {x0,z0,x1,z1,kind} where
// kind is 'wall' | 'glazing' | 'fixture' | 'door' (consumers that only need
// obstacles read just the coords; the 2D sketch reads kind).
export const WALL_RECTS = [];

// ---- hinged-door registry (for the 2D sketch's door symbols) ----
// Filled at build time by apartment.js; each entry
// { w, hinge:[x,z], angle, closed, sweep, arc } — angles are world Y-rotations
// (slab runs +x from hinge at 0); arc:false = bifold/french leaf, no swing arc.
export const DOOR_ARCS = [];

export function feetLabel(v) {
  const ft = Math.floor(v + 1e-6);
  const inch = Math.round((v - ft) * 12);
  if (inch === 12) return `${ft + 1}'0"`;
  return inch === 0 ? `${ft}'` : `${ft}'${inch}"`;
}
