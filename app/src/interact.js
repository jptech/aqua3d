// Furniture interactions: pick, drag on floor, rotate, collide, measure.
import * as THREE from 'three';
import { buildItem } from './furniture.js';
import { pointOnFloor, feetLabel } from './plan.js';

const DEG = Math.PI / 180;

// ---- 2D oriented-rectangle intersection (SAT) ----
function corners(it) {
  const { w, d } = it.userData.def;
  const c = Math.cos(it.rotation.y), s = Math.sin(it.rotation.y);
  const hx = w / 2, hz = d / 2;
  const pts = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  return pts.map(([x, z]) => [it.position.x + x * c + z * s, it.position.z - x * s + z * c]);
}
function rectCorners(r) {
  return [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];
}
function polysOverlap(a, b) {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length];
      const nx = z2 - z1, nz = x1 - x2; // axis normal
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const [x, z] of a) { const p = x * nx + z * nz; aMin = Math.min(aMin, p); aMax = Math.max(aMax, p); }
      for (const [x, z] of b) { const p = x * nx + z * nz; bMin = Math.min(bMin, p); bMax = Math.max(bMax, p); }
      if (aMax < bMin + 1e-6 || bMax < aMin + 1e-6) return false;
    }
  }
  return true;
}
function aabbOf(pts) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { x0, z0, x1, z1 };
}

export class Interactions {
  constructor({ scene, camera, dom, controls, world, onChange }) {
    this.scene = scene;
    this.camera = camera;
    this.dom = dom;
    this.controls = controls;
    this.world = world;         // { obstacles, balconyPoly }
    this.onChange = onChange || (() => {});
    this.items = [];
    this.selected = null;
    this.dragging = false;
    this.enabled = true;   // false while measure/walk tools own the pointer
    this.ray = new THREE.Raycaster();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.group = new THREE.Group();
    scene.add(this.group);

    // selection ring
    this.ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3)),
      new THREE.LineBasicMaterial({ color: 0x2ec4ff }));
    this.ring.visible = false;
    this.ring.renderOrder = 5;
    scene.add(this.ring);

    // dimension rays (4 lines + labels)
    this.dimLines = [];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xff8c00, dashSize: 0.35, gapSize: 0.18 }));
      line.visible = false;
      line.renderOrder = 5;
      scene.add(line);
      const div = document.createElement('div');
      div.className = 'dim-label';
      document.body.appendChild(div);
      this.dimLines.push({ line, div, mid: new THREE.Vector3(), show: false });
    }
    this.infoDiv = document.createElement('div');
    this.infoDiv.className = 'item-label';
    document.body.appendChild(this.infoDiv);

    dom.addEventListener('pointerdown', (e) => this.onDown(e));
    dom.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', () => this.onUp());
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  // ---------- item management ----------
  addItem(id, x, z, rotY = 0, silent = false) {
    const it = buildItem(id);
    if (!it) return null;
    it.position.set(x, 0, z);
    it.rotation.y = rotY;
    if (it.userData.def.flat) it.position.y = 0.02;
    this.group.add(it);
    this.items.push(it);
    this.attachCollisionPad(it);
    this.refreshCollisions();
    if (!silent) { this.select(it); this.onChange(); }
    return it;
  }

  attachCollisionPad(it) {
    const { w, d } = it.userData.def;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.1, d + 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.35, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.045;
    pad.visible = false;
    pad.raycast = () => {};   // not pickable
    it.add(pad);
    it.userData.pad = pad;
  }

  removeSelected() {
    if (!this.selected) return;
    const it = this.selected;
    this.deselect();
    this.group.remove(it);
    this.items.splice(this.items.indexOf(it), 1);
    this.refreshCollisions();
    this.onChange();
  }

  duplicateSelected() {
    if (!this.selected) return;
    const s = this.selected;
    const it = this.addItem(s.userData.def.id, s.position.x + 1.5, s.position.z + 1.5, s.rotation.y);
    if (it) this.select(it);
  }

  rotateSelected(deg) {
    if (!this.selected) return;
    this.selected.rotation.y += deg * DEG;
    this.refreshCollisions();
    this.updateOverlays();
    this.onChange();
  }

  clear() {
    this.deselect();
    for (const it of this.items) this.group.remove(it);
    this.items = [];
    this.onChange();
  }

  serialize() {
    return this.items.map((it) => ({
      id: it.userData.def.id,
      x: +it.position.x.toFixed(3),
      z: +it.position.z.toFixed(3),
      r: +it.rotation.y.toFixed(4),
    }));
  }

  load(arr) {
    this.clear();
    for (const e of arr || []) this.addItem(e.id, e.x, e.z, e.r, true);
    this.refreshCollisions();
    this.onChange();
  }

  // ---------- picking / dragging ----------
  setRayFromEvent(e) {
    const r = this.dom.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
  }

  pick(e) {
    this.setRayFromEvent(e);
    const hits = this.ray.intersectObjects(this.group.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.parent !== this.group) o = o.parent;
      if (o) return o;
    }
    return null;
  }

  onDown(e) {
    if (!this.enabled || e.button !== 0) return;
    const it = this.pick(e);
    if (it) {
      this.select(it);
      this.dragging = true;
      this.controls.enabled = false;
      const hit = new THREE.Vector3();
      this.ray.ray.intersectPlane(this.floorPlane, hit);
      this.dragOffset = hit ? new THREE.Vector3().subVectors(it.position, hit) : new THREE.Vector3();
      this.dom.style.cursor = 'grabbing';
    } else {
      this.deselect();
    }
  }

  onMove(e) {
    if (!this.enabled) return;
    if (!this.dragging || !this.selected) {
      if (!this.dragging) this.dom.style.cursor = this.pick(e) ? 'grab' : 'default';
      return;
    }
    this.setRayFromEvent(e);
    const hit = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.floorPlane, hit)) return;
    let nx = hit.x + this.dragOffset.x;
    let nz = hit.z + this.dragOffset.z;
    if (e.shiftKey) { nx = Math.round(nx * 2) / 2; nz = Math.round(nz * 2) / 2; }
    if (pointOnFloor(nx, nz, this.world.balconyPoly)) {
      this.selected.position.x = nx;
      this.selected.position.z = nz;
      this.refreshCollisions();
      this.updateOverlays();
    }
  }

  onUp() {
    if (this.dragging) {
      this.dragging = false;
      this.controls.enabled = true;
      this.dom.style.cursor = 'default';
      this.onChange();
    }
  }

  onKey(e) {
    if (!this.enabled || e.target.tagName === 'INPUT') return;
    if (!this.selected) return;
    const step = e.shiftKey ? 45 : 15;
    if (e.key === 'q' || e.key === 'Q' || e.key === '[') this.rotateSelected(step);
    if (e.key === 'e' || e.key === 'E' || e.key === ']') this.rotateSelected(-step);
    if (e.key === 'Delete' || e.key === 'Backspace') this.removeSelected();
    if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey) this.duplicateSelected();
  }

  // ---------- selection visuals ----------
  select(it) {
    this.selected = it;
    this.ring.visible = true;
    this.updateOverlays();
    this.onSelect?.(it);
  }

  deselect() {
    this.selected = null;
    this.ring.visible = false;
    for (const d of this.dimLines) { d.line.visible = false; d.show = false; }
    this.infoDiv.style.display = 'none';
    this.onSelect?.(null);
  }

  refreshCollisions() {
    const solids = this.items.filter((it) => !it.userData.def.flat);
    for (const it of this.items) {
      const mine = corners(it);
      let hit = false;
      if (!it.userData.def.flat) {
        for (const other of solids) {
          if (other === it) continue;
          const a = it.userData.def, b = other.userData.def;
          if ((a.tuck && b.surface) || (a.surface && b.tuck)) continue; // chairs tuck under tables
          if (polysOverlap(mine, corners(other))) { hit = true; break; }
        }
      }
      if (!hit) {
        for (const r of this.world.obstacles) {
          if (polysOverlap(mine, rectCorners(r))) { hit = true; break; }
        }
      }
      it.userData.pad.visible = hit;
    }
  }

  updateOverlays() {
    const it = this.selected;
    if (!it) return;
    // ring
    const cs = corners(it);
    const pos = this.ring.geometry.attributes.position;
    cs.forEach(([x, z], i) => pos.setXYZ(i, x, 0.08, z));
    pos.needsUpdate = true;
    // dimension rays from the item's AABB to nearest obstacle
    const bb = aabbOf(cs);
    const dirs = [
      { dx: 1, dz: 0, fromX: bb.x1, fromZ: it.position.z },
      { dx: -1, dz: 0, fromX: bb.x0, fromZ: it.position.z },
      { dx: 0, dz: 1, fromX: it.position.x, fromZ: bb.z1 },
      { dx: 0, dz: -1, fromX: it.position.x, fromZ: bb.z0 },
    ];
    dirs.forEach((d, i) => {
      let best = Infinity;
      for (const r of this.world.obstacles) {
        if (d.dx !== 0) {
          if (it.position.z < r.z0 || it.position.z > r.z1) continue;
          const dist = d.dx > 0 ? r.x0 - d.fromX : d.fromX - r.x1;
          if (dist > 0.01 && dist < best) best = dist;
        } else {
          if (it.position.x < r.x0 || it.position.x > r.x1) continue;
          const dist = d.dz > 0 ? r.z0 - d.fromZ : d.fromZ - r.z1;
          if (dist > 0.01 && dist < best) best = dist;
        }
      }
      const dl = this.dimLines[i];
      if (best === Infinity || best > 45) { dl.line.visible = false; dl.show = false; return; }
      const x2 = d.fromX + d.dx * best, z2 = d.fromZ + d.dz * best;
      const p = dl.line.geometry.attributes.position;
      p.setXYZ(0, d.fromX, 0.12, d.fromZ);
      p.setXYZ(1, x2, 0.12, z2);
      p.needsUpdate = true;
      dl.line.computeLineDistances();
      dl.line.visible = true;
      dl.show = true;
      dl.text = feetLabel(best);
      dl.mid.set((d.fromX + x2) / 2, 0.4, (d.fromZ + z2) / 2);
    });
    const def = it.userData.def;
    this.infoText = `${def.name} — ${feetLabel(def.w)} × ${feetLabel(def.d)}`;
  }

  // called every frame: project HTML labels
  update() {
    const w = this.dom.clientWidth, h = this.dom.clientHeight;
    const v = new THREE.Vector3();
    for (const dl of this.dimLines) {
      if (!dl.show) { dl.div.style.display = 'none'; continue; }
      v.copy(dl.mid).project(this.camera);
      if (v.z > 1) { dl.div.style.display = 'none'; continue; }
      dl.div.style.display = 'block';
      dl.div.textContent = dl.text;
      dl.div.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
      dl.div.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
    }
    if (this.selected) {
      const def = this.selected.userData.def;
      v.set(this.selected.position.x, def.h + 0.8, this.selected.position.z).project(this.camera);
      if (v.z <= 1) {
        this.infoDiv.style.display = 'block';
        this.infoDiv.textContent = this.infoText;
        this.infoDiv.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
        this.infoDiv.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      } else {
        this.infoDiv.style.display = 'none';
      }
    } else {
      this.infoDiv.style.display = 'none';
    }
  }
}
