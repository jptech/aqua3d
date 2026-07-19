// 2D architectural sketch layer for plan mode. Drawn once from the same data
// the 3D build registers: tagged WALL_RECTS (wall/glazing/fixture/door),
// DOOR_ARCS (hinged-door symbols), ROOMS (labels) and the balcony polygon.
// Everything is flat XZ geometry at hairline y offsets, layered with
// depthWrite:false + renderOrder (paper 0 → fills 1 → lines 2 → labels 3);
// furniture plan proxies render at 4 and interaction overlays at 5+.
import * as THREE from 'three';
import { WALL_RECTS, DOOR_ARCS, ROOMS } from './plan.js';

const INK = 0x2b2f33;

function flatRect(x0, z0, x1, z1, y, mat, order) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.renderOrder = order;
  return m;
}

function polyline(pts, y, mat, order, close = false) {
  const geo = new THREE.BufferGeometry().setFromPoints(
    pts.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const l = close ? new THREE.LineLoop(geo, mat) : new THREE.Line(geo, mat);
  l.renderOrder = order;
  return l;
}

export function buildPlanSketch({ balconyPoly }) {
  const g = new THREE.Group();
  g.visible = false;

  const inkFill = new THREE.MeshBasicMaterial({ color: INK, depthWrite: false });
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xf7f4ec, depthWrite: false, fog: false });
  const fixFill = new THREE.MeshBasicMaterial({ color: 0xfdfcf8, depthWrite: false });
  const glzFill = new THREE.MeshBasicMaterial({ color: 0xdfe7ec, depthWrite: false });
  const balcFill = new THREE.MeshBasicMaterial({ color: 0xedeae2, depthWrite: false, side: THREE.DoubleSide });
  const inkLine = new THREE.LineBasicMaterial({ color: INK });
  const grayLine = new THREE.LineBasicMaterial({ color: 0x8a9096 });
  const glzLine = new THREE.LineBasicMaterial({ color: 0x51606b });

  // paper — big enough to cover the ortho frustum at max zoom-out
  g.add(flatRect(-185, -185, 220, 220, 0, paperMat, 0));

  for (const r of WALL_RECTS) {
    const kind = r.kind || 'wall';
    if (kind === 'wall') {
      g.add(flatRect(r.x0, r.z0, r.x1, r.z1, 0.02, inkFill, 1));
    } else if (kind === 'glazing') {
      // classic double-line window symbol
      g.add(flatRect(r.x0, r.z0, r.x1, r.z1, 0.02, glzFill, 1));
      const alongX = (r.x1 - r.x0) >= (r.z1 - r.z0);
      const cm = alongX ? (r.z0 + r.z1) / 2 : (r.x0 + r.x1) / 2;
      for (const off of [-0.1, 0.1]) {
        g.add(polyline(alongX
          ? [[r.x0, cm + off], [r.x1, cm + off]]
          : [[cm + off, r.z0], [cm + off, r.z1]], 0.025, glzLine, 2));
      }
    } else if (kind === 'fixture') {
      g.add(flatRect(r.x0, r.z0, r.x1, r.z1, 0.018, fixFill, 1));
      g.add(polyline([[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]], 0.025, grayLine, 2, true));
    }
    // kind 'door' (closed entry-door obstacle) is drawn by its door symbol
  }

  // door symbols: leaf line + quarter-circle swing arc.
  // rotateY(a) maps the slab's +x run to world direction (cos a, -sin a).
  for (const d of DOOR_ARCS) {
    const [hx, hz] = d.hinge;
    const at = (a) => [hx + d.w * Math.cos(a), hz - d.w * Math.sin(a)];
    const leafAngle = d.arc ? d.closed + d.sweep : d.angle;
    g.add(polyline([[hx, hz], at(leafAngle)], 0.028, inkLine, 2));
    if (d.arc) {
      const pts = [];
      for (let i = 0; i <= 16; i++) pts.push(at(d.closed + (d.sweep * i) / 16));
      g.add(polyline(pts, 0.028, grayLine, 2));
    }
  }

  // balcony slab outline + light fill
  const shape = new THREE.Shape(balconyPoly.map(([x, z]) => new THREE.Vector2(x, z)));
  const balcGeo = new THREE.ShapeGeometry(shape);
  balcGeo.rotateX(Math.PI / 2);   // shape (x, y=z) -> plan (x, z), as in apartment.js
  const balc = new THREE.Mesh(balcGeo, balcFill);
  balc.position.y = 0.015;
  balc.renderOrder = 1;
  g.add(balc);
  g.add(polyline(balconyPoly, 0.025, grayLine, 2, true));

  // ink-styled room labels (same canvas technique as the 3D floor labels)
  const labels = new THREE.Group();
  for (const r of ROOMS) {
    if (!r.name) continue;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(35,38,42,0.92)';
    ctx.font = '600 44px system-ui, sans-serif';
    ctx.fillText(r.name, 256, 56);
    ctx.font = '400 34px system-ui, sans-serif';
    ctx.fillText(r.label || '', 256, 102);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    const lw = Math.min(8, (r.x1 - r.x0) * 0.9);
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(lw, lw / 4),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    lm.rotation.x = -Math.PI / 2;
    lm.position.set((r.x0 + r.x1) / 2, 0.03, (r.z0 + r.z1) / 2);
    lm.renderOrder = 3;
    labels.add(lm);
  }
  g.userData.labels = labels;
  g.add(labels);

  return g;
}
