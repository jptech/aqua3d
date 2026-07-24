// Procedural canvas textures matching the tour photos: gray-blue carpet, beige
// ceramic tile, speckled tan granite, light maple / dark walnut cabinets.
//
// Every surface here is registered with a real-world tile size (`ft`) and the
// meshes that use it emit UVs measured in feet (see geo.js `uvFt`), so grain and
// stone scale stay constant whether they land on a 1-ft drawer or a 20-ft floor.
// Colour maps double as height fields: `normalFromCanvas` runs a Sobel pass over
// their luminance, which is what turns flat plaster/carpet/grout into surfaces
// that actually catch the light.
import * as THREE from 'three';
import { Q } from './quality.js';

// deterministic pseudo-random
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}

function makeCanvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

function colorTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Q.aniso;
  return t;
}

// Sobel over luminance -> tangent-space normal map. Wraps at the edges so the
// derived map tiles exactly like the colour map it came from.
function normalFromCanvas(canvas, strength) {
  const S = canvas.width;
  const src = canvas.getContext('2d').getImageData(0, 0, S, S).data;
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    lum[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  }
  const at = (x, y) => lum[((y + S) % S) * S + ((x + S) % S)];
  const out = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)
        - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) * strength;
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)
        - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      out[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      out[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
      out[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Q.aniso;
  t.needsUpdate = true;
  return t;
}

// ---------- surface registry ----------
// draw(ctx, S, r) paints one tile; `ft` is how many feet that tile covers.
const SURFACES = {
  carpet: {
    ft: 3, size: 1, bump: 2.2,
    draw(ctx, S, r) {
      ctx.fillStyle = '#b7babd';
      ctx.fillRect(0, 0, S, S);
      // broad tonal drift so a big floor doesn't read as one flat colour
      for (let i = 0; i < 60; i++) {
        const g = ctx.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, S * (0.12 + r() * 0.25));
        const v = r() > 0.5 ? 255 : 130;
        g.addColorStop(0, `rgba(${v},${v},${v},0.05)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
      }
      // loop pile: short arcs at mixed angles
      const n = S * S * 0.22;
      for (let i = 0; i < n; i++) {
        const x = r() * S, y = r() * S, a = r() * Math.PI * 2;
        const shade = 160 + Math.floor(r() * 52);
        ctx.strokeStyle = `rgba(${shade - 5},${shade},${shade + 6},0.55)`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4);
        ctx.stroke();
      }
    },
  },
  tile: {
    ft: 2.16, size: 1, bump: 1.3,           // 2 x 2 tiles of ~13"
    draw(ctx, S, r) {
      ctx.fillStyle = '#9d8f78';             // grout
      ctx.fillRect(0, 0, S, S);
      const t = S / 2, g = Math.max(2, S / 96);
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const tone = 210 + Math.floor(r() * 12);
          ctx.fillStyle = `rgb(${tone},${tone - 12},${tone - 38})`;
          ctx.fillRect(i * t + g, j * t + g, t - 2 * g, t - 2 * g);
          // clouded ceramic face — keep it faint, heavy mottling reads as dirt
          for (let k = 0; k < 26; k++) {
            const grad = ctx.createRadialGradient(
              i * t + r() * t, j * t + r() * t, 0,
              i * t + r() * t, j * t + r() * t, t * (0.1 + r() * 0.3));
            grad.addColorStop(0, r() > 0.5 ? 'rgba(255,250,238,0.10)' : 'rgba(168,148,116,0.07)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.save();
            ctx.beginPath();
            ctx.rect(i * t + g, j * t + g, t - 2 * g, t - 2 * g);
            ctx.clip();
            ctx.fillStyle = grad;
            ctx.fillRect(i * t, j * t, t, t);
            ctx.restore();
          }
        }
      }
    },
  },
  granite: {
    // fine-grained speckle: at 2.4 ft per tile the flecks land around 1/4",
    // which is what keeps it reading as stone instead of terrazzo
    ft: 2.4, size: 2, bump: 0.45,
    draw(ctx, S, r) {
      ctx.fillStyle = '#c3a684';
      ctx.fillRect(0, 0, S, S);
      const colors = ['#6a5540', '#e9dcc4', '#9c8264', '#b5885e', '#7b6248', '#d9b98d', '#f0e8d8', '#4a3b2c'];
      const n = S * S * 0.05;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = colors[Math.floor(r() * colors.length)];
        ctx.globalAlpha = 0.25 + r() * 0.45;
        const s = (0.6 + r() * r() * 3.2) * (S / 512);
        ctx.beginPath();
        ctx.ellipse(r() * S, r() * S, s, s * (0.5 + r() * 0.7), r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  },
  maple: {
    ft: 2.6, size: 1, bump: 0.55,
    draw(ctx, S, r) { woodGrain(ctx, S, r, '#d9bb8f', [150, 115, 70], [60, 45, 35], 64); },
  },
  walnut: {
    ft: 2.6, size: 1, bump: 0.6,
    draw(ctx, S, r) { woodGrain(ctx, S, r, '#5e4127', [78, 52, 28], [45, 30, 18], 58); },
  },
  oakFloor: {
    ft: 2.6, size: 1, bump: 0.7,
    draw(ctx, S, r) { woodGrain(ctx, S, r, '#c9a878', [150, 112, 68], [70, 50, 32], 70); },
  },
  plaster: {
    ft: 7, size: 1, bump: 0.3,
    draw(ctx, S, r) { orangePeel(ctx, S, r, '#f1ece1'); },
  },
  plasterExt: {
    ft: 9, size: 1, bump: 0.28,
    draw(ctx, S, r) { orangePeel(ctx, S, r, '#e9e6de'); },
  },
  concrete: {
    ft: 10, size: 1, bump: 0.6,
    draw(ctx, S, r) {
      ctx.fillStyle = '#e6e4de';
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < S * S * 0.08; i++) {
        const v = 205 + Math.floor(r() * 40);
        ctx.fillStyle = `rgba(${v},${v - 2},${v - 8},${0.1 + r() * 0.25})`;
        const s = 1 + r() * 3;
        ctx.fillRect(r() * S, r() * S, s, s);
      }
      for (let i = 0; i < 26; i++) {
        const g = ctx.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, S * (0.08 + r() * 0.2));
        g.addColorStop(0, 'rgba(120,118,112,0.06)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
      }
    },
  },
  glassTile: {
    ft: 1, size: 1, bump: 3.2,               // 4 x 4 mosaic backsplash
    draw(ctx, S, r) {
      ctx.fillStyle = '#8f9a92';
      ctx.fillRect(0, 0, S, S);
      const t = S / 4, g = Math.max(1.5, S / 128);
      const pal = [[196, 208, 198], [172, 190, 186], [208, 214, 200], [150, 172, 172], [220, 222, 210]];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const c = pal[Math.floor(r() * pal.length)];
          ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.fillRect(i * t + g, j * t + g, t - 2 * g, t - 2 * g);
          const grad = ctx.createLinearGradient(i * t, j * t, i * t + t, j * t + t);
          grad.addColorStop(0, 'rgba(255,255,255,0.28)');
          grad.addColorStop(1, 'rgba(0,0,0,0.14)');
          ctx.fillStyle = grad;
          ctx.fillRect(i * t + g, j * t + g, t - 2 * g, t - 2 * g);
        }
      }
    },
  },
  linen: {
    ft: 1.6, size: 1, bump: 1.6,
    draw(ctx, S, r) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, S, S);
      const step = Math.max(2, S / 96);
      for (let y = 0; y < S; y += step) {
        ctx.fillStyle = `rgba(150,150,150,${0.1 + r() * 0.12})`;
        ctx.fillRect(0, y, S, step * 0.45);
      }
      for (let x = 0; x < S; x += step) {
        ctx.fillStyle = `rgba(150,150,150,${0.08 + r() * 0.12})`;
        ctx.fillRect(x, 0, step * 0.45, S);
      }
    },
  },
};

function woodGrain(ctx, S, r, base, dark, knot, lines) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  const k = S / 256;
  for (let i = 0; i < lines; i++) {
    const x = r() * S;
    const c = r() > 0.75 ? knot : dark;
    ctx.strokeStyle = `rgba(${c[0] + r() * 55},${c[1] + r() * 40},${c[2] + r() * 30},${0.1 + r() * 0.22})`;
    ctx.lineWidth = (0.8 + r() * 2.6) * k;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + (r() - 0.5) * 16 * k, S * 0.33,
      x + (r() - 0.5) * 16 * k, S * 0.66,
      x + (r() - 0.5) * 11 * k, S);
    ctx.stroke();
  }
  // pore speckle
  for (let i = 0; i < S * S * 0.05; i++) {
    ctx.fillStyle = `rgba(${dark[0] * 0.7},${dark[1] * 0.7},${dark[2] * 0.7},${0.05 + r() * 0.1})`;
    ctx.fillRect(r() * S, r() * S, 1.2 * k, 1.2 * k);
  }
}

// Painted drywall: almost uniform. A broad roller drift carries most of the
// variation and the fine stipple stays near the noise floor — anything stronger
// reads as stucco or cork rather than paint.
function orangePeel(ctx, S, r, base) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) {
    const g = ctx.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, S * (0.15 + r() * 0.3));
    const v = r() > 0.5 ? 255 : 140;
    g.addColorStop(0, `rgba(${v},${v},${v},0.018)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  for (let i = 0; i < S * S * 0.2; i++) {
    const v = r() > 0.5 ? 255 : 150;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.008 + r() * 0.016})`;
    ctx.beginPath();
    ctx.arc(r() * S, r() * S, 0.7 + r() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

const surfCache = new Map();

// { map, normalMap, ft } for a registered surface, built once and shared.
export function surface(name) {
  let s = surfCache.get(name);
  if (s) return s;
  const def = SURFACES[name];
  const size = Math.max(64, Math.round(Q.texSize * def.size));
  const canvas = makeCanvas(size, (ctx, S) => def.draw(ctx, S, rng(hash(name))));
  s = {
    ft: def.ft,
    map: colorTex(canvas),
    normalMap: Q.normalMaps && def.bump ? normalFromCanvas(canvas, def.bump) : null,
  };
  surfCache.set(name, s);
  return s;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Convenience: a MeshStandardMaterial wired to a registered surface, with the
// feet-per-tile stashed so box()/B() can emit matching UVs.
export function surfaceMaterial(name, opts = {}) {
  const s = surface(name);
  const { normalScale = 1, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({
    map: s.map,
    normalMap: s.normalMap,
    ...rest,
  });
  if (s.normalMap) m.normalScale = new THREE.Vector2(normalScale, normalScale);
  m.userData.uvFt = s.ft;
  return m;
}

// ---------- one-off textures ----------

// placeholder abstract artwork — seeded so each catalog piece is distinct but stable
export function artTexture(seed) {
  return colorTex(makeCanvas(256, (ctx, S) => {
    const r = rng(seed);
    const palettes = [
      ['#e8e0d0', '#2e4a5f', '#7fa8b8', '#d9c9a8', '#c76f4a'],
      ['#ece4d8', '#b45a38', '#d9a08a', '#4a4038', '#8a9a94'],
      ['#e4e2da', '#5f7a5a', '#a8b8a0', '#33413a', '#c9a86a'],
      ['#efe9df', '#3a3f4a', '#9aa8b8', '#c2b49a', '#7a5a48'],
    ];
    const pal = palettes[Math.floor(r() * palettes.length)];
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, S, S);
    const n = 4 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = pal[1 + Math.floor(r() * (pal.length - 1))];
      ctx.globalAlpha = 0.75 + r() * 0.25;
      if (r() > 0.5) {
        ctx.fillRect(r() * S * 0.7, r() * S * 0.7, S * (0.15 + r() * 0.5), S * (0.15 + r() * 0.5));
      } else {
        ctx.beginPath();
        ctx.arc(S * (0.2 + r() * 0.6), S * (0.2 + r() * 0.6), S * (0.08 + r() * 0.22), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = pal[1 + Math.floor(r() * (pal.length - 1))];
    ctx.lineWidth = 2 + r() * 5;
    ctx.beginPath();
    ctx.moveTo(0, S * (0.2 + r() * 0.6));
    ctx.bezierCurveTo(S * 0.33, S * r(), S * 0.66, S * r(), S, S * (0.2 + r() * 0.6));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }));
}

// Equirectangular sky: drawn once, used as both the scene background and the
// source for the PMREM environment map that lights every material.
export function skyEquirect() {
  const W = Q.skySize, H = W / 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = rng(1234);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.00, '#1d4f88');
  g.addColorStop(0.24, '#3d7cb4');
  g.addColorStop(0.42, '#79a8cf');
  g.addColorStop(0.49, '#c3d8e6');
  g.addColorStop(0.50, '#dfe3e0');   // horizon haze
  g.addColorStop(0.56, '#a9a79e');
  g.addColorStop(1.00, '#6b6862');   // ground bounce (warm gray city)
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft cumulus band in the upper sky
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = H * (0.06 + r() * 0.36);
    const rad = W * (0.012 + r() * 0.05);
    const cg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    cg.addColorStop(0, `rgba(255,255,255,${0.13 + r() * 0.16})`);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Sun disc placed where the directional light in main.js actually points
  // (dir ≈ 0.449, 0.701, -0.554), so the highlight in a reflection lines up with
  // the shadows on the floor: u = atan2(z,x)/2π + 0.5, v = asin(y)/π + 0.5.
  const sx = W * 0.358, sy = H * 0.253;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.16);
  sg.addColorStop(0.00, 'rgba(255,252,240,1)');
  sg.addColorStop(0.05, 'rgba(255,244,214,0.85)');
  sg.addColorStop(0.30, 'rgba(255,232,190,0.22)');
  sg.addColorStop(1.00, 'rgba(255,225,180,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// glass-tower facade for the surrounding skyline
export function towerTexture(seed, floors, bays) {
  return colorTex(makeCanvas(256, (ctx, S) => {
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
    // spandrel bands so towers don't read as flat noise at distance
    ctx.fillStyle = 'rgba(40,48,54,0.35)';
    for (let f = 0; f < floors; f++) ctx.fillRect(0, f * fh, S, Math.max(1, fh * 0.16));
  }));
}

// Soft footprint blob used as a contact shadow under furniture. Sun shadow maps
// only reach what the sun reaches; this is what stops interior pieces from
// looking like they hover. Drawn as a rounded rect pushed off-canvas so only its
// blurred drop shadow lands — a Gaussian falloff with no hard edge anywhere.
let blob = null;
export function blobShadow() {
  if (blob) return blob;
  blob = new THREE.CanvasTexture(makeCanvas(128, (ctx, S) => {
    const pad = S * 0.2, w = S - 2 * pad, off = S * 3;
    ctx.shadowColor = 'rgba(0,0,0,0.62)';
    ctx.shadowBlur = S * 0.14;
    ctx.shadowOffsetX = off;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pad - off, pad, w, w, S * 0.12);
    else ctx.rect(pad - off, pad, w, w);           // older Safari
    ctx.fill();
  }));
  blob.colorSpace = THREE.SRGBColorSpace;
  return blob;
}
