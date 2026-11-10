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

/** The classic heart curve, about 22 units tall and 22 wide, centred near the origin. */
export const heartAt = (theta, out = new THREE.Vector3()) => {
  const k = 11 / 16, s = Math.sin(theta), c = Math.cos(theta);
  return out.set(16 * s * s * s * k, (13 * c - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta) + 2.5) * k, 0);
};

// Even spacing along the outline, so points never bunch up in the dip of the heart.
const ARC = (() => {
  const n = 480, table = [0], p = new THREE.Vector3(), q = new THREE.Vector3();
  heartAt(Math.PI, q);
  for (let i = 1; i <= n; i++) { heartAt(Math.PI + (i / n) * Math.PI * 2, p); table.push(table[i - 1] + p.distanceTo(q)); q.copy(p); }
  return { n, table, total: table[n] };
})();
/** Angle for a fraction 0..1 of the way round the heart's outline, by arc length (starts at the bottom tip). */
export const heartTheta = (s) => {
  const want = s * ARC.total;
  let lo = 0, hi = ARC.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ARC.table[m] < want) lo = m; else hi = m; }
  const f = (want - ARC.table[lo]) / Math.max(1e-6, ARC.table[hi] - ARC.table[lo]);
  return Math.PI + ((lo + f) / ARC.n) * Math.PI * 2;
};
/** Random point inside the heart (rejection sampling on the 22x22 box). */
export function heartInside(rng, out = new THREE.Vector3()) {
  for (let i = 0; i < 40; i++) {
    const x = (rng() - 0.5) * 23, y = (rng() - 0.5) * 24 - 1;
    // implicit heart: (x^2 + y^2 - 1)^3 - x^2 y^3 < 0 in a unit-ish frame
    const u = x / 9.8, v = (y + 1.2) / 9.8;
    const f = (u * u + v * v - 1) ** 3 - u * u * v * v * v;
    if (f < 0) return out.set(x, y, 0);
  }
  return out.set(0, 0, 0);
}

/** A soft heart, for sprites and instanced petals of love. */
export function heartTexture(size = 128, soft = false) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const s = size / 24;
  if (soft) { g.shadowColor = 'rgba(255,255,255,1)'; g.shadowBlur = size * 0.16; }
  g.translate(0, size * 0.04);
  const path = new Path2D('M12 21s-7.6-4.9-9.7-9.3C.7 8.2 2.6 4 6.6 4c2.3 0 4.2 1.3 5.4 3.3C13.2 5.3 15.1 4 17.4 4c4 0 5.9 4.2 4.3 7.7C19.6 16.1 12 21 12 21z');
  g.scale(s, s);
  const grad = g.createRadialGradient(10, 9, 1, 12, 12, 11);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.55, 'rgba(255,255,255,.92)'); grad.addColorStop(1, 'rgba(255,255,255,.55)');
  g.fillStyle = grad; g.fill(path);
  return canvasTexture(c);
}

/** A rose petal: a soft teardrop with a darker vein, white so the shader can tint it. */
export function petalTexture(size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), m = size / 2;
  g.translate(m, m);
  g.beginPath();
  g.moveTo(0, -m * 0.9);
  g.bezierCurveTo(m * 0.95, -m * 0.7, m * 0.8, m * 0.6, 0, m * 0.9);
  g.bezierCurveTo(-m * 0.8, m * 0.6, -m * 0.95, -m * 0.7, 0, -m * 0.9);
  const grad = g.createLinearGradient(0, -m, 0, m);
  grad.addColorStop(0, 'rgba(255,255,255,.72)'); grad.addColorStop(0.5, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,.62)');
  g.fillStyle = grad; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = size * 0.02;
  g.beginPath(); g.moveTo(0, -m * 0.75); g.quadraticCurveTo(m * 0.08, 0, 0, m * 0.8); g.stroke();
  return canvasTexture(c);
}
