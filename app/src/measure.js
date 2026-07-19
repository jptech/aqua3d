// Interactive measuring tape: click two points (walls, floors, furniture),
// get the distance in feet-inches. Shift snaps to 1/2 ft on the floor plane.
import * as THREE from 'three';
import { feetLabel } from './plan.js';

export class MeasureTool {
  constructor({ scene, camera, dom, pickTargets }) {
    this.camera = camera;
    this.dom = dom;
    this.pickTargets = pickTargets;
    this.active = false;
    this.planar = false;   // plan mode: measure on the floor plane only (walls are hidden)
    this.a = null;
    this.b = null;
    this.fixed = false;
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const mat = new THREE.LineBasicMaterial({ color: 0x35e0a1 });
    this.line = new THREE.Line(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3)), mat);
    this.line.renderOrder = 6;
    this.line.visible = false;
    scene.add(this.line);
    this.marks = [0, 1].map(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x35e0a1 }));
      m.visible = false;
      scene.add(m);
      return m;
    });
    this.label = document.createElement('div');
    this.label.className = 'measure-label';
    document.body.appendChild(this.label);

    dom.addEventListener('pointerdown', (e) => this.onDown(e));
    dom.addEventListener('pointermove', (e) => this.onMove(e));
  }

  setActive(on) {
    this.active = on;
    if (!on) this.clear();
    this.dom.style.cursor = on ? 'crosshair' : 'default';
  }

  clear() {
    this.a = this.b = null;
    this.fixed = false;
    this.line.visible = false;
    this.marks.forEach((m) => { m.visible = false; });
    this.label.style.display = 'none';
  }

  hit(e) {
    const r = this.dom.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hits = this.planar ? [] : this.ray.intersectObjects(this.pickTargets, true)
      .filter((h) => h.object.visible && (h.object.material?.opacity ?? 1) > 0.15);
    let p = hits.length ? hits[0].point.clone() : null;
    if (!p) {
      p = new THREE.Vector3();
      if (!this.ray.ray.intersectPlane(this.plane, p)) return null;
    }
    if (e.shiftKey) {
      p.x = Math.round(p.x * 2) / 2;
      p.z = Math.round(p.z * 2) / 2;
    }
    return p;
  }

  onDown(e) {
    if (!this.active || e.button !== 0) return;
    const p = this.hit(e);
    if (!p) return;
    if (!this.a || this.fixed) {
      this.clear();
      this.a = p;
      this.marks[0].position.copy(p);
      this.marks[0].visible = true;
    } else {
      this.b = p;
      this.fixed = true;
      this.update();
    }
  }

  onMove(e) {
    if (!this.active || !this.a || this.fixed) return;
    const p = this.hit(e);
    if (p) { this.b = p; this.update(); }
  }

  update() {
    if (!this.a || !this.b) return;
    const pos = this.line.geometry.attributes.position;
    pos.setXYZ(0, this.a.x, this.a.y + 0.08, this.a.z);
    pos.setXYZ(1, this.b.x, this.b.y + 0.08, this.b.z);
    pos.needsUpdate = true;
    this.line.geometry.computeBoundingSphere();
    this.line.visible = true;
    this.marks[1].position.copy(this.b);
    this.marks[1].visible = true;
    this.dist = this.a.distanceTo(this.b);
  }

  // per-frame: project the distance label to screen space
  tick(w, h) {
    if (!this.a || !this.b || !this.line.visible) { this.label.style.display = 'none'; return; }
    const mid = new THREE.Vector3().addVectors(this.a, this.b).multiplyScalar(0.5);
    mid.y = Math.max(this.a.y, this.b.y) + 0.5;
    mid.project(this.camera);
    if (mid.z > 1) { this.label.style.display = 'none'; return; }
    this.label.style.display = 'block';
    this.label.textContent = feetLabel(this.dist);
    this.label.style.left = `${(mid.x * 0.5 + 0.5) * w}px`;
    this.label.style.top = `${(-mid.y * 0.5 + 0.5) * h}px`;
  }
}
