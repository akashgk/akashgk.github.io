import * as THREE from 'three';
import { seeded, SOFT_POINT_FRAG } from './util.js';

// One draw call for the whole sky. About a fifth of the stars are always there; the rest wait
// inside the gift box and pour out of it, each flying to its permanent place in the sky.
// These are literally the same particles for the rest of the journey.
const STATIONS = [[0, 0, 0], [0, 18, -95], [80, 0, -175], [-55, -12, -240], [0, 10, -205]];

export function createStars(ctx, count) {
  const rng = seeded(31);
  const home = new Float32Array(count * 3), start = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4), color = new Float32Array(count * 3);
  const palette = [[1, 0.97, 0.9], [1, 0.97, 0.9], [0.8, 0.87, 1], [1, 0.8, 0.5], [1, 0.62, 0.72]];

  for (let i = 0; i < count; i++) {
    let x, y, z, ok;
    do {
      x = (rng() - 0.5) * 440; y = (rng() - 0.5) * 300; z = 120 - rng() * 500;
      ok = STATIONS.every(([a, b, c]) => (x - a) ** 2 + (y - b) ** 2 + (z - c) ** 2 > 22 * 22);
    } while (!ok);
    home.set([x, y, z], i * 3);
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.85;
    start.set([Math.cos(a) * r, 0.75, Math.sin(a) * r], i * 3);
    const big = rng();
    const burst = rng() > 0.2 ? 1 : 0;
    seed.set([burst, rng(), 0.4 + rng() * 2.2, big * big * big * 2.6 + 0.65], i * 4);
    const c = palette[Math.floor(rng() * palette.length)];
    color.set(c, i * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(home, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));

  const uniforms = { uBurst: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uTwinkle: { value: ctx.reduced ? 0 : 1 },
    uTime: ctx.uniforms.uTime, uPx: ctx.uniforms.uPx };

  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aStart; attribute vec4 aSeed; attribute vec3 aColor;
      uniform float uBurst, uTime, uPx, uTwinkle; uniform vec3 uOrigin;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float isBurst = aSeed.x, delay = aSeed.y;
        float k = isBurst > .5 ? clamp((uBurst - delay * .55) / .45, 0., 1.) : 1.;
        float e = 1. - pow(1. - k, 3.);
        vec3 p = mix(uOrigin + aStart, position, e);
        // on the way out: a rising, turning column, as if poured upward
        float arc = sin(k * 3.14159);
        float ang = (1. - e) * (5. + delay * 5.);
        float c = cos(ang), s = sin(ang);
        vec3 off = p - uOrigin;
        off.xz = mat2(c, -s, s, c) * off.xz;
        p = uOrigin + off;
        p.y += arc * (2.4 + delay * 8.);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float tw = 1. + uTwinkle * .35 * sin(uTime * aSeed.z + delay * 60.);
        float size = aSeed.w * tw * (170. / max(1., -mv.z));
        gl_PointSize = uPx * clamp(size + arc * 2.2, 1.05, 4.6);
        gl_Position = projectionMatrix * mv;
        vColor = aColor * (1. + arc * 2.6);
        vAlpha = (isBurst > .5 ? smoothstep(0., .03, k) : 1.) * clamp(.42 + tw * .5, 0., 1.);
      }`,
    fragmentShader: SOFT_POINT_FRAG,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -5;
  ctx.scene.add(points);

  return {
    points, uniforms,
    reset() { uniforms.uBurst.value = 0; },
    scale(f) { geo.setDrawRange(0, Math.floor(count * f)); },
  };
}
