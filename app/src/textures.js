// Procedural canvas textures matching the tour photos:
// gray-blue carpet, beige ceramic tile, speckled tan granite, light maple cabinets.
import * as THREE from 'three';

function canvasTex(size, draw, { repeatX = 1, repeatY = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

// deterministic pseudo-random
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}

export function carpetTexture(wFt, hFt) {
  return canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#b7bec6';
    ctx.fillRect(0, 0, S, S);
    const r = rng(7);
    for (let i = 0; i < 9000; i++) {
      const shade = 168 + Math.floor(r() * 40);
      ctx.fillStyle = `rgba(${shade - 6},${shade},${shade + 8},0.5)`;
      ctx.fillRect(r() * S, r() * S, 1.6, 1.6);
    }
  }, { repeatX: wFt / 3, repeatY: hFt / 3 });
}

export function tileTexture(wFt, hFt) {
  // 2 x 2 tiles per canvas, each ~13" -> canvas covers ~2.16 ft
  return canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#b3a48a';           // grout
    ctx.fillRect(0, 0, S, S);
    const r = rng(21);
    const t = S / 2, g = 3;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = '#d9c9ac';
      ctx.fillRect(i * t + g, j * t + g, t - 2 * g, t - 2 * g);
      for (let k = 0; k < 500; k++) {
        const a = 0.05 + r() * 0.1;
        ctx.fillStyle = r() > 0.5 ? `rgba(255,250,235,${a})` : `rgba(150,128,95,${a})`;
        ctx.fillRect(i * t + g + r() * (t - 2 * g), j * t + g + r() * (t - 2 * g), 2.5, 2.5);
      }
    }
  }, { repeatX: wFt / 2.16, repeatY: hFt / 2.16 });
}

export function graniteTexture(repeatX = 1, repeatY = 1) {
  return canvasTex(512, (ctx, S) => {
    ctx.fillStyle = '#c7a685';
    ctx.fillRect(0, 0, S, S);
    const r = rng(99);
    const colors = ['#3b2f26', '#e9dcc4', '#8a6f52', '#b5885e', '#5d4632', '#d9b98d', '#f0e8d8'];
    for (let i = 0; i < 5200; i++) {
      ctx.fillStyle = colors[Math.floor(r() * colors.length)];
      ctx.globalAlpha = 0.35 + r() * 0.6;
      const s = 1 + r() * r() * 7;
      ctx.beginPath();
      ctx.ellipse(r() * S, r() * S, s, s * (0.4 + r() * 0.8), r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, { repeatX, repeatY });
}

export function mapleTexture(repeatX = 1, repeatY = 1) {
  return canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#d9bb8f';
    ctx.fillRect(0, 0, S, S);
    const r = rng(4);
    for (let i = 0; i < 60; i++) {
      const x = r() * S;
      ctx.strokeStyle = `rgba(${150 + r() * 60},${115 + r() * 45},${70 + r() * 35},${0.12 + r() * 0.15})`;
      ctx.lineWidth = 1 + r() * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (r() - 0.5) * 14, S * 0.33, x + (r() - 0.5) * 14, S * 0.66, x + (r() - 0.5) * 10, S);
      ctx.stroke();
    }
  }, { repeatX, repeatY });
}

export function walnutTexture(repeatX = 1, repeatY = 1) {
  return canvasTex(256, (ctx, S) => {
    ctx.fillStyle = '#5e4127';
    ctx.fillRect(0, 0, S, S);
    const r = rng(11);
    for (let i = 0; i < 55; i++) {
      const x = r() * S;
      ctx.strokeStyle = `rgba(${40 + r() * 45},${26 + r() * 30},${12 + r() * 18},${0.2 + r() * 0.3})`;
      ctx.lineWidth = 1 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (r() - 0.5) * 18, S * 0.3, x + (r() - 0.5) * 18, S * 0.7, x + (r() - 0.5) * 12, S);
      ctx.stroke();
    }
  }, { repeatX, repeatY });
}

export function skyTexture() {
  return canvasTex(512, (ctx, S) => {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#4d87c0');
    g.addColorStop(0.55, '#a8c8e2');
    g.addColorStop(0.78, '#dce8f0');
    g.addColorStop(1, '#e8e2d5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  });
}

// glass-tower facade for the surrounding skyline
export function towerTexture(seed, floors, bays) {
  return canvasTex(256, (ctx, S) => {
    const r = rng(seed);
    ctx.fillStyle = '#6f7e88';
    ctx.fillRect(0, 0, S, S);
    const fh = S / floors, bw = S / bays;
    for (let f = 0; f < floors; f++) {
      for (let b = 0; b < bays; b++) {
        const lit = r();
        ctx.fillStyle = lit > 0.9 ? '#ffe9b8' : (lit > 0.45 ? '#9db4c4' : '#54626e');
        ctx.fillRect(b * bw + 1.5, f * fh + 2, bw - 3, fh - 4);
      }
    }
  });
}
