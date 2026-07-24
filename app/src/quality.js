// Render quality tiers. Everything expensive (shadow resolution, normal maps,
// edge chamfers, interior lamps, pixel ratio) is read from here so a phone and a
// desktop run the same scene at very different costs.
//
// Tier is auto-detected once at load; the user can pin it with the ⚙ button
// (stored in localStorage) or ?q=low|med|high in the URL. Because tiers change
// how geometry and textures are BUILT, changing the pin reloads the page.

const STORE = 'aqua3d.quality.v1';

const PRESETS = {
  low: {
    dpr: 1.25, shadowSize: 1024, aniso: 2,
    normalMaps: false, bevel: 0, lamps: 0, contactShadows: true,
    skySize: 512, texSize: 192, mullionEvery: 5.5,
  },
  med: {
    dpr: 1.6, shadowSize: 2048, aniso: 4,
    normalMaps: true, bevel: 0.022, lamps: 3, contactShadows: true,
    skySize: 1024, texSize: 256, mullionEvery: 4.4,
  },
  high: {
    dpr: 2, shadowSize: 3072, aniso: 8,
    normalMaps: true, bevel: 0.03, lamps: 5, contactShadows: true,
    skySize: 2048, texSize: 512, mullionEvery: 4.4,
  },
};

function gpuName() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return String(name || '');
  } catch { return ''; }
}

function autoTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || (coarse ? 4 : 8);
  const gpu = gpuName();
  // software rasterizers and older mobile parts: everything off
  if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(gpu)) return 'low';
  if (/PowerVR|Mali-[TG]?[0-7]\d{2}\b|Adreno \(TM\) [1-5]\d{2}\b/i.test(gpu)) return 'low';
  // Safari reports neither deviceMemory nor a useful core count, and iOS caps
  // hardwareConcurrency low enough that the heuristic below would demote every
  // iPhone. Apple silicon comfortably handles the mid tier.
  if (/Apple/i.test(gpu)) return coarse ? 'med' : 'high';
  if (coarse && (cores <= 4 || mem <= 4)) return 'low';
  if (coarse) return 'med';
  if (cores <= 4 || mem <= 4) return 'med';
  return 'high';
}

let pinned = null;
try { pinned = localStorage.getItem(STORE); } catch { /* private mode */ }
const urlPin = new URLSearchParams(location.search).get('q');
if (PRESETS[urlPin]) pinned = urlPin;

export const AUTO_TIER = autoTier();
export const PINNED = PRESETS[pinned] ? pinned : 'auto';
export const TIER = PINNED === 'auto' ? AUTO_TIER : PINNED;
export const Q = { tier: TIER, ...PRESETS[TIER] };

// max pixel ratio actually used; the adaptive scaler in main.js lowers this
Q.dpr = Math.min(Q.dpr, window.devicePixelRatio || 1);

export function setPin(pref) {
  try {
    if (pref === 'auto') localStorage.removeItem(STORE);
    else localStorage.setItem(STORE, pref);
  } catch { /* private mode */ }
}
