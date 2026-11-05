import * as THREE from 'three';

export const GOLD = new THREE.Color('#f2c879');

/** Small deterministic random so the hand-placed details look the same on every visit. */
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SOFT_POINT_FRAG = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - .5);
    float a = smoothstep(.5, .04, d);
    a *= a * vAlpha;
    if (a < .003) discard;
    gl_FragColor = vec4(vColor * a, a);
  }`;

export function disposeGroup(group) {
  group.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => {
      Object.values(m).forEach((v) => { if (v?.isTexture) v.dispose(); });
      if (m.uniforms) Object.values(m.uniforms).forEach((u) => { if (u.value?.isTexture) u.value.dispose(); });
      m.dispose();
    });
  });
  group.removeFromParent();
}

export function canvasTexture(canvas, { srgb = true, repeat = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** A soft glow with faint diffraction spikes. Shared look for every "hero" star. */
export function glowTexture(size = 128, spikes = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'), m = size / 2;
  const r = g.createRadialGradient(m, m, 0, m, m, m);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.1, 'rgba(255,255,255,.72)');
  r.addColorStop(0.28, 'rgba(255,255,255,.17)');
  r.addColorStop(0.6, 'rgba(255,255,255,.035)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  if (spikes) {
    g.globalCompositeOperation = 'lighter';
    [[1, 0.012], [0, 0.012]].forEach(([h]) => {
      const l = h ? g.createLinearGradient(0, m, size, m) : g.createLinearGradient(m, 0, m, size);
      l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,.8)'); l.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = l;
      if (h) g.fillRect(0, m - 0.8, size, 1.6); else g.fillRect(m - 0.8, 0, 1.6, size);
    });
  }
  return canvasTexture(c);
}

export function heroStar(texture, color, opacity = 1) {
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, color, opacity, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
  }));
}

/** Random points inside drawn text. `em` is the wanted font size in world units. */
export function sampleText(text, { font, count, rng = Math.random, maxWidth = Infinity, em = 1, size = 170 }) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = `${font.replace('SIZE', size)}`;
  const w = Math.ceil(g.measureText(text).width) + 40, h = Math.ceil(size * 1.5);
  c.width = w; c.height = h;
  g.font = `${font.replace('SIZE', size)}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.fillText(text, w / 2, h / 2);
  const data = g.getImageData(0, 0, w, h).data;
  const hits = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (data[(y * w + x) * 4 + 3] > 120) hits.push(x, y);
  const n = hits.length / 2, out = new Float32Array(count * 2);
  const scale = Math.min(em / size, maxWidth / w);
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rng() * n) * 2;
    out[i * 2] = (hits[k] + rng() - w / 2) * scale;
    out[i * 2 + 1] = (h / 2 - hits[k + 1] - rng()) * scale;
  }
  return { points: out, width: w * scale };
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
