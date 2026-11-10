import * as THREE from 'three';
import { canvasTexture, disposeGroup, glowTexture, heroStar, seeded, heartTheta, heartTexture } from '../util.js';
import { createMotes } from '../fx.js';

const CENTER = new THREE.Vector3(-55, -12, -240);

// ---- number candles: strokes extruded into chunky wax numerals ----
function stroke(points, hw) {
  const left = [], right = [];
  points.forEach((p, i) => {
    const a = points[Math.max(i - 1, 0)], b = points[Math.min(i + 1, points.length - 1)];
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    const n = new THREE.Vector2(-t.y, t.x).multiplyScalar(hw);
    left.push(new THREE.Vector2(p.x + n.x, p.y + n.y));
    right.unshift(new THREE.Vector2(p.x - n.x, p.y - n.y));
  });
  const capped = (from, to, center) => {
    const out = [], a0 = Math.atan2(from.y - center.y, from.x - center.x);
    for (let i = 1; i < 8; i++) { const a = a0 - (i / 8) * Math.PI; out.push(new THREE.Vector2(center.x + Math.cos(a) * hw, center.y + Math.sin(a) * hw)); }
    return out;
  };
  const end = points[points.length - 1], begin = points[0];
  const outline = [...left, ...capped(left[left.length - 1], right[0], end), ...right, ...capped(right[right.length - 1], left[0], begin)];
  return new THREE.Shape(outline);
}
const arc = (cx, cy, r, a0, a1, n = 26) => Array.from({ length: n + 1 }, (_, i) => {
  const a = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * i) / n);
  return new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
});

function numeral(strokes, mat) {
  const g = new THREE.Group();
  strokes.forEach((pts) => {
    const geo = new THREE.ExtrudeGeometry(stroke(pts, 0.135), { depth: 0.2, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 6 });
    geo.translate(0, 0, -0.1);
    g.add(new THREE.Mesh(geo, mat));
  });
  return g;
}

function candleWax() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fbeef0'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#e8628a';
  for (let i = -256; i < 512; i += 64) {
    g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 24, 256); g.lineTo(i + 24 + 256, 0); g.lineTo(i + 256, 0); g.closePath(); g.fill();
  }
  const t = canvasTexture(c, { repeat: true });
  t.repeat.set(1.6, 1.6);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.38, metalness: 0.02 });
}

// ---- icing that runs down the side in uneven drips ----
function icing(r, topY, rng, maxDrip, drips = 15) {
  const bumps = Array.from({ length: drips }, () => ({ at: rng() * Math.PI * 2, len: 0.22 + rng() * maxDrip, w: 0.07 + rng() * 0.06 }));
  const dripAt = (a) => {
    let l = 0.1;
    for (const b of bumps) {
      let d = Math.abs(a - b.at); d = Math.min(d, Math.PI * 2 - d);
      l = Math.max(l, b.len * Math.exp(-(d * d) / (2 * b.w * b.w)));
    }
    return l;
  };
  const seg = 220, rows = 16, pos = [], idx = [];
  for (let j = 0; j <= seg; j++) {
    const a = (j / seg) * Math.PI * 2, L = dripAt(a);
    for (let i = 0; i <= rows; i++) {
      const v = i / rows;
      let rad, y;
      if (v < 0.34) { rad = r * (v / 0.34); y = topY + 0.05; }
      else if (v < 0.52) { const q = ((v - 0.34) / 0.18) * Math.PI / 2; rad = r + Math.sin(q) * 0.07; y = topY + 0.05 - (1 - Math.cos(q)) * 0.1; }
      else { const q = (v - 0.52) / 0.48; rad = r + 0.07 - Math.pow(q, 5) * 0.075; y = topY - 0.05 - q * L; }
      pos.push(Math.sin(a) * rad, y, Math.cos(a) * rad);
    }
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < rows; i++) {
    const p = j * (rows + 1) + i, q = p + rows + 1;
    idx.push(p, p + 1, q, q, p + 1, q + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const beadRing = (r, y, n, size, mat) => {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    o.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    o.scale.set(size, size * 0.86, size);
    o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  }
  return m;
};

function pipedName(name, r, y, h, span) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b5612a';
  g.font = 'italic 200px "Instrument Serif", Georgia, serif';
  g.fillText(name, 512, 124);
  const geo = new THREE.CylinderGeometry(r, r, h, 40, 1, true, -span / 2, span);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: canvasTexture(c), transparent: true, roughness: 0.3, metalness: 0.65, depthWrite: false }));
  mesh.position.y = y;
  return mesh;
}

// ---- flame: a billboard whose shape is entirely in the shader ----
function flame(uniforms, seed) {
  const u = { ...uniforms, uSeed: { value: seed }, uOut: { value: 0 } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uOut; varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(0., 0., 0., 1.);
        vec2 size = vec2(.95, 1.5);
        mv.xy += vec2(position.x, position.y + .43) * size;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uSeed, uOut, uCalm; varying vec2 vUv;
      float n(float x) { return sin(x) * .5 + sin(x * 2.3 + 1.7) * .3 + sin(x * 5.1 + .5) * .2; }
      void main() {
        float y = (vUv.y - .07) / .62;              // 0 at the wick, 1 at the tip
        float t = uTime * mix(1., .25, uCalm);
        float sway = n(t * 3.1 + uSeed * 9. + y * 2.4) * .075 * y * (1. + y);
        float x = (vUv.x - .5) + sway - uOut * y * y * .42;
        float h = 1. + n(t * 5.3 + uSeed * 4.) * .09;
        float yy = y / (h * (1. - uOut * .85) + .001);
        float width = .17 * pow(clamp(yy, 0., 1.), .55) * pow(clamp(1. - yy, 0., 1.), .85) * 2.2 * (1. - uOut * .5);
        float d = abs(x) / max(width, .001);
        float body = smoothstep(1., .45, d) * step(0., yy) * step(yy, 1.);
        float core = smoothstep(.75, .05, d) * smoothstep(.0, .22, yy) * smoothstep(.9, .35, yy);
        vec3 col = mix(vec3(1., .3, .05), vec3(1., .66, .2), smoothstep(.1, .75, yy));
        col = mix(vec3(.16, .25, 1.), col, smoothstep(.0, .16, yy));
        col = mix(col, vec3(1., .88, .58), core);
        float glow = exp(-length(vec2(vUv.x - .5, (vUv.y - .32) * .7)) * 8.) * .34;
        vec3 c = col * body * 1.22 + vec3(1., .5, .16) * glow * .8;
        gl_FragColor = vec4(c * (1. - smoothstep(.7, 1., uOut)), 1.);
      }`,
  }));
  m.frustumCulled = false;
  m.userData.u = u;
  return m;
}

export function createCake(ctx) {
  const { gsap, ui, content, reduced, lights, music } = ctx;
  const cfg = content.cake;
  const group = new THREE.Group();
  group.name = 'cake';
  group.position.copy(CENTER);
  group.visible = false;
  ctx.scene.add(group);
  const rng = seeded(1111);

  // Plate and tiers
  const gold = new THREE.MeshStandardMaterial({ color: 0xf0bd66, metalness: 0.5, roughness: 0.32 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.25, 0.14, 72), gold);
  plate.position.y = 0.07;
  group.add(plate);
  // A dark lacquered table, so the candlelight has something to shine in
  const table = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshPhysicalMaterial({ color: 0x1b1024, roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 0.9 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.01;
  group.add(table);
  // Strings of fairy lights draped behind
  const bulbs = [], wire = [];
  const string = (x0, x1, y0, sag, z, n) => {
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = x0 + (x1 - x0) * u, y = y0 - Math.sin(u * Math.PI) * sag;
      wire.push(x, y, z);
      if (i % 2 === 1) bulbs.push(x, y - 0.12, z, rng());
    }
  };
  string(-13, 13, 9.6, 2.6, -7, 40); string(-14, 11, 7.1, 2.1, -9.5, 36); string(-10, 14, 11.2, 1.8, -11, 38);
  const wireGeo = new THREE.BufferGeometry(); wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  // three separate strings: draw as segments to avoid joining the ends
  const segIdx = []; let off = 0;
  [40, 36, 38].forEach((n) => { for (let i = 0; i < n; i++) segIdx.push(off + i, off + i + 1); off += n + 1; });
  wireGeo.setIndex(segIdx);
  group.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x3a2a30, transparent: true, opacity: 0.6 })));
  const bulbGeo = new THREE.BufferGeometry();
  const bp = new Float32Array(bulbs.length / 4 * 3), bs = new Float32Array(bulbs.length / 4);
  for (let i = 0; i < bulbs.length / 4; i++) { bp.set(bulbs.slice(i * 4, i * 4 + 3), i * 3); bs[i] = bulbs[i * 4 + 3]; }
  bulbGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  bulbGeo.setAttribute('aS', new THREE.BufferAttribute(bs, 1));
  const bulbU = { uTime: ctx.uniforms.uTime, uPx: ctx.uniforms.uPx, uOn: { value: 1 }, uMusic: ctx.uniforms.uMusic };
  const fairy = new THREE.Points(bulbGeo, new THREE.ShaderMaterial({
    uniforms: bulbU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aS; uniform float uTime, uPx, uOn, uMusic; varying float vA; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); float tw = .7 + .3*sin(uTime*(1.2+aS*2.)+aS*40.);
        gl_PointSize = uPx * (5. + tw * 3. + uMusic * 1.5) * clamp(22./-mv.z, .5, 2.); gl_Position = projectionMatrix*mv;
        vA = uOn * (.5 + tw*.5); vC = mix(vec3(1.,.72,.38), vec3(1.,.55,.6), step(.7, aS)); }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.0,d); a = a*a*vA; if (a<.004) discard; gl_FragColor = vec4(vC*a*1.6, a); }`,
  }));
  group.add(fairy);
  const sponge = new THREE.MeshStandardMaterial({ color: 0xf6e4cd, roughness: 0.62 });
  const rose = new THREE.MeshStandardMaterial({ color: 0xc23b67, roughness: 0.24, metalness: 0.03 });
  const T1 = 1.72, T2 = 3.04;
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(2.72, 2.72, 1.58, 72), sponge);
  tier1.position.y = 0.14 + 0.79;
  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 1.32, 64), sponge);
  tier2.position.y = T1 + 0.66;
  group.add(tier1, tier2);
  group.add(new THREE.Mesh(icing(2.72, T1, rng, 0.46, 19), rose), new THREE.Mesh(icing(1.86, T2, rng, 0.72, 15), rose));
  const pearl = new THREE.MeshStandardMaterial({ color: 0xfff1dc, roughness: 0.3, metalness: 0.12 });
  group.add(beadRing(2.76, 0.22, 58, 0.093, pearl), beadRing(1.9, T1 + 0.11, 40, 0.085, gold));
  group.add(pipedName(content.name, 2.735, 0.72, 0.92, 1.345));

  // Sprinkles
  const sprinkleGeo = new THREE.CapsuleGeometry(0.018, 0.075, 2, 6);
  const sprinkleCount = 70;
  const sprinkles = new THREE.InstancedMesh(sprinkleGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 }), sprinkleCount);
  const o = new THREE.Object3D(), col = new THREE.Color();
  const palette = [0xf6d68e, 0xfff1dc, 0xf2c879, 0xffc0cf];
  for (let i = 0; i < sprinkleCount; i++) {
    const a = rng() * Math.PI * 2, top = i < 45, r = top ? 0.5 + rng() * 1.3 : 2.05 + rng() * 0.6;
    o.position.set(Math.sin(a) * r, (top ? T2 : T1) + 0.07, Math.cos(a) * r);
    o.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.3, 0, rng() * Math.PI * 2);
    o.updateMatrix(); sprinkles.setMatrixAt(i, o.matrix);
    sprinkles.setColorAt(i, col.set(palette[i % palette.length]));
  }
  group.add(sprinkles);

  // Candles
  const wax = candleWax();
  const three = numeral([arc(0, 0.95, 0.3, 165, -90), arc(0, 0.34, 0.33, 90, -165)], wax);
  const one = numeral([[new THREE.Vector2(0, -0.1), new THREE.Vector2(0, 1.25)], [new THREE.Vector2(-0.3, 0.92), new THREE.Vector2(0, 1.25)]], wax);
  three.position.set(-0.56, T2 + 0.07, 0.1);
  one.position.set(0.58, T2 + 0.07, 0.1);
  group.add(three, one);
  const tips = [new THREE.Vector3(-0.56, T2 + 0.07 + 1.42, 0.1), new THREE.Vector3(0.58, T2 + 0.07 + 1.42, 0.1)];
  const wickMat = new THREE.MeshBasicMaterial({ color: 0x1f130d });
  tips.forEach((p) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.16, 6), wickMat);
    w.position.copy(p); group.add(w);
  });
  const flameU = { uTime: ctx.uniforms.uTime, uCalm: { value: reduced ? 1 : 0 } };
  const flames = tips.map((p, i) => {
    const f = flame(flameU, i * 1.37 + 0.2);
    f.position.copy(p).add(new THREE.Vector3(0, 0.08, 0));
    group.add(f);
    return f;
  });

  // Soft halos around each flame, breathing with the flicker
  const glowTex = glowTexture(128, false);
  const halos = tips.map((p) => {
    const h = heroStar(glowTex, new THREE.Color('#ffb15c'), 0.42);
    h.material.depthTest = true;
    h.scale.setScalar(2.6);
    h.position.copy(p).add(new THREE.Vector3(0, 0.55, 0.3));
    group.add(h);
    return h;
  });
  const wishMotes = createMotes(ctx, { count: Math.floor(40 * Math.max(0.5, ctx.particles)), radius: 1.9, height: 1.4, speed: reduced ? 0.3 : 0.8, size: 0.8, seed: 41 });
  wishMotes.points.position.set(0, T2 + 1.3, 0.1);
  group.add(wishMotes.points);

  // Warm pool of light under the plate
  const pool = heroStar(glowTex, new THREE.Color('#ff9a57'), 0.14);
  pool.scale.setScalar(19);
  pool.position.set(0, 3.8, -1.5);
  group.add(pool);

  // Smoke: one point cloud per wick's worth of particles, driven by a clock uniform
  const smokeN = Math.floor(260 * Math.max(0.6, ctx.particles));
  const sp = new Float32Array(smokeN * 3), sinfo = new Float32Array(smokeN * 3), sTheta = new Float32Array(smokeN);
  for (let i = 0; i < smokeN; i++) {
    sp.set(tips[i % 2].toArray(), i * 3);
    sinfo.set([rng() * 0.7, rng(), rng()], i * 3);
    sTheta[i] = heartTheta(rng());
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  smokeGeo.setAttribute('aInfo', new THREE.BufferAttribute(sinfo, 3));
  smokeGeo.setAttribute('aTheta', new THREE.BufferAttribute(sTheta, 1));
  const heartAnchor = new THREE.Vector3((tips[0].x + tips[1].x) / 2, T2 + 3.5, 0.1);
  const smokeU = { uT: { value: -1 }, uPx: ctx.uniforms.uPx, uHeart: { value: heartAnchor }, uCalm: { value: reduced ? 1 : 0 } };
  const smoke = new THREE.Points(smokeGeo, new THREE.ShaderMaterial({
    uniforms: smokeU, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute vec3 aInfo; attribute float aTheta; uniform float uT, uPx, uCalm; uniform vec3 uHeart; varying float vA, vH;
      void main() {
        float t = uT - aInfo.x; float life = 5.6 + aInfo.y * 1.6; float k = clamp(t / life, 0., 1.);
        vec3 p = position;
        p.y += k * (3.2 + aInfo.z * 1.4);
        p.x += sin(k * 7. + aInfo.y * 6.) * k * .55;
        p.z += cos(k * 5. + aInfo.z * 6.) * k * .32;
        // on its way up, the smoke gathers for a moment into the shape of a heart
        float s = sin(aTheta), c = cos(aTheta);
        vec2 heart = vec2(16. * s * s * s, 13. * c - 5. * cos(2. * aTheta) - 2. * cos(3. * aTheta) - cos(4. * aTheta) + 2.5) / 16. * 1.9;
        // the heart drifts up as one, on the shared clock, so its shape holds while it rises
        vec3 hp = uHeart + vec3(heart.x * (1. + uT * .04), heart.y + uT * .32 - .6, (aInfo.z - .5) * .4);
        float g = smoothstep(.1, .26, k) * (1. - smoothstep(.52, .74, k)) * (1. - uCalm);
        p = mix(p, hp, g);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = uPx * mix(8. + k * 60., 9., g) * (14. / -mv.z);
        vA = t > 0. ? smoothstep(0., .07, k) * pow(1. - k, 1.6) * (.11 + g * .55) : 0.;
        vH = g;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA, vH; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.0,d)*vA; if (a<.003) discard; gl_FragColor = vec4(mix(vec3(.72,.7,.76), vec3(1.,.6,.72), vH) * (1. + vH * 1.4), a); }`,
  }));
  smoke.frustumCulled = false; smoke.visible = false;
  group.add(smoke);

  // Fireworks: all shells in one draw call, on a repeating clock
  const shells = reduced ? 0 : 7, perShell = Math.floor(220 * Math.max(0.55, ctx.particles));
  let fireworks = null, fireU = null;
  const shellColors = [[1, 0.72, 0.3], [1, 0.42, 0.58], [1, 0.9, 0.72], [0.62, 0.75, 1], [1, 0.55, 0.3], [1, 0.42, 0.7], [1, 0.82, 0.45]];
  if (shells) {
    const n = shells * perShell;
    const p = new Float32Array(n * 3), d = new Float32Array(n * 3), s = new Float32Array(n * 2), c = new Float32Array(n * 3);
    const wide = ctx.portrait ? 3.4 : 12;
    for (let k = 0; k < shells; k++) {
      const o2 = [(rng() - 0.5) * 2 * wide, 5.5 + rng() * 4, -3 - rng() * 7];
      const size = 3 + rng() * 2.2;
      const heartShell = k % 3 === 1; // every third shell bursts as a heart
      for (let i = 0; i < perShell; i++) {
        const j = k * perShell + i;
        const z = rng() * 2 - 1, a = rng() * Math.PI * 2, r = Math.sqrt(1 - z * z), m = size * (0.72 + rng() * 0.28);
        p.set(o2, j * 3);
        if (heartShell) {
          const th = heartTheta(rng()), sn = Math.sin(th), cs = Math.cos(th);
          const hx = 16 * sn * sn * sn / 16, hy = (13 * cs - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th) + 2.5) / 16;
          const inner = 0.75 + rng() * 0.3;
          d.set([hx * m * inner, hy * m * inner, (rng() - 0.5) * m * 0.3], j * 3);
        } else d.set([Math.cos(a) * r * m, Math.sin(a) * r * m, z * m], j * 3);
        s.set([k * 1.02 + rng() * 0.05, rng()], j * 2);
        c.set(shellColors[k % shellColors.length], j * 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(d, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(s, 2));
    g.setAttribute('aColor', new THREE.BufferAttribute(c, 3));
    fireU = { uT: { value: -1 }, uCycle: { value: shells * 1.02 + 1 }, uPx: ctx.uniforms.uPx };
    fireworks = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: fireU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aDir, aColor; attribute vec2 aStart; uniform float uT, uCycle, uPx; varying vec3 vColor; varying float vAlpha;
        void main() {
          float t = mod(uT - aStart.x, uCycle), life = 2.3 + aStart.y * .7, k = t / life;
          vec3 p = position + aDir * (1. - exp(-t * 2.6));
          p.y -= t * t * .36;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          float flick = .75 + .25 * sin(t * 26. + aStart.y * 50.);
          gl_PointSize = uPx * mix(3.6, 1.6, clamp(k, 0., 1.));
          gl_Position = projectionMatrix * mv;
          vColor = aColor * (3.2 - k * 1.7) * flick;
          vAlpha = uT < aStart.x || k >= 1. ? 0. : pow(1. - k, 1.35);
        }`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){ if (vAlpha <= 0.) discard; float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.08,d)*vAlpha; gl_FragColor = vec4(vColor*a, a); }`,
    }));
    fireworks.frustumCulled = false; fireworks.visible = false;
    group.add(fireworks);
  }

  // Confetti: paper squares falling through the shot
  const confN = Math.floor((reduced ? 90 : 300) * ctx.particles);
  const confGeo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(0.1, 0.17);
  confGeo.index = plane.index; confGeo.setAttribute('position', plane.attributes.position); confGeo.setAttribute('uv', plane.attributes.uv);
  const vel = new Float32Array(confN * 3), spinA = new Float32Array(confN * 4), cc = new Float32Array(confN * 3), kind = new Float32Array(confN);
  const confColors = [[0.95, 0.62, 0.2], [0.95, 0.3, 0.46], [1, 0.9, 0.74], [0.98, 0.45, 0.6], [1, 0.76, 0.34]];
  for (let i = 0; i < confN; i++) {
    const a = rng() * Math.PI * 2, r = 1 + rng() * (ctx.portrait ? 5 : 11);
    vel.set([Math.cos(a) * r, 5 + rng() * 9, Math.sin(a) * r * 0.55], i * 3);
    spinA.set([rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1, 1.5 + rng() * 5], i * 4);
    cc.set(confColors[i % confColors.length], i * 3);
    kind[i] = i % 2; // half paper squares, half little hearts
  }
  confGeo.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1));
  confGeo.setAttribute('aVel', new THREE.InstancedBufferAttribute(vel, 3));
  confGeo.setAttribute('aSpin', new THREE.InstancedBufferAttribute(spinA, 4));
  confGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(cc, 3));
  confGeo.instanceCount = confN;
  const confU = { uT: { value: -1 }, uHeart: { value: heartTexture(64) } };
  const confetti = new THREE.Mesh(confGeo, new THREE.ShaderMaterial({
    uniforms: confU, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute vec3 aVel, aColor; attribute vec4 aSpin; attribute float aKind; uniform float uT; varying vec3 vC; varying vec2 vUv; varying float vKind;
      vec3 rot(vec3 v, vec3 a, float t) { a = normalize(a); return v * cos(t) + cross(a, v) * sin(t) + a * dot(a, v) * (1. - cos(t)); }
      void main() {
        float seed = aSpin.w, t = uT - seed * .03;
        vec3 world = vec3(0., 4.6, 0.) + aVel * (1. - exp(-max(t, 0.) * 1.45)) * .8;
        world.y -= max(t, 0.) * (1.05 + seed * .08);
        world.x += sin(t * 1.3 + seed * 5.) * .35;
        float ang = t * seed;
        vUv = uv; vKind = aKind;
        vec3 p = rot(position * (1. + aKind * .9), aSpin.xyz, ang);
        vec3 n = rot(vec3(0., 0., 1.), aSpin.xyz, ang);
        vC = aColor * (.3 + abs(n.z) * .55 + pow(abs(n.y), 8.) * .35) * (1. + aKind * .25);
        float alive = step(0., t) * step(t, 14.);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(world + p * alive, 1.);
      }`,
    fragmentShader: `uniform sampler2D uHeart; varying vec3 vC; varying vec2 vUv; varying float vKind; void main(){ float a = vKind > .5 ? texture2D(uHeart, vUv).a : 1.; if (a < .3) discard; gl_FragColor = vec4(vC, 1.); }`,
  }));
  confetti.frustumCulled = false; confetti.visible = false;
  group.add(confetti);

  let state = 'hidden', micStream = null, micCtx = null, micRaf = 0;
  const stopMic = () => {
    cancelAnimationFrame(micRaf);
    micStream?.getTracks().forEach((t) => t.stop());
    micCtx?.close().catch(() => {});
    micStream = null; micCtx = null;
    music.duck(false);
  };

  const useMic = async () => {
    ui.mic(cfg.micListening);
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
      if (state !== 'lit') { stopMic(); return; }
      music.duck(true);
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const an = micCtx.createAnalyser();
      an.fftSize = 1024;
      micCtx.createMediaStreamSource(micStream).connect(an);
      const data = new Uint8Array(an.fftSize);
      let over = 0, last = performance.now();
      const listen = (now) => {
        an.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        over = rms > 0.13 ? over + (now - last) : Math.max(0, over - (now - last) * 0.6);
        last = now;
        if (over > 170) { blow(); return; }
        micRaf = requestAnimationFrame(listen);
      };
      micRaf = requestAnimationFrame(listen);
    } catch {
      ui.mic(null);
      ui.hint(cfg.micFailed);
    }
  };

  function blow() {
    if (state !== 'lit') return;
    state = 'out';
    stopMic();
    ui.title(null); ui.hint(null); ui.mic(null);
    const tl = gsap.timeline();
    flames.forEach((f, i) => {
      tl.to(f.userData.u.uOut, { value: 1, duration: reduced ? 1.2 : 0.75, ease: 'power2.in' }, i * 0.26);
    });
    halos.forEach((h, i) => tl.to(h.material, { opacity: 0, duration: 0.5 }, i * 0.26));
    tl.call(() => wishMotes.show(false, 0.8), null, 0);
    tl.to(lights.a, { intensity: 0.6, duration: 0.8 }, 0.1);
    tl.to(lights.b, { intensity: 0.6, duration: 0.8 }, 0.35);
    tl.to(pool.material, { opacity: 0.045, duration: 1.1 }, 0.2);
    tl.call(() => { smoke.visible = true; smokeU.uT.value = 0; }, null, 0.45);
    tl.call(() => {
      confetti.visible = true; confU.uT.value = 0;
      if (fireworks) { fireworks.visible = true; fireU.uT.value = 0; }
      gsap.to(lights.key, { intensity: 1.6, duration: 2 });
      gsap.to(lights.hemi, { intensity: 0.85, duration: 2 });
    }, null, reduced ? 2 : 4.2);
    tl.to(bulbU.uOn, { value: 1.6, duration: 1.5 }, reduced ? 2 : 4.2);
    tl.call(() => { inst.done = true; ctx.story.showNext(); }, null, reduced ? 5.5 : 7.2);
  }

  const station = () => {
    const d = ctx.fit(7.9, 11);
    return { pos: CENTER.clone().add(new THREE.Vector3(0, 6.2, d)), look: CENTER.clone().add(new THREE.Vector3(0, 3, 0)) };
  };

  const inst = {
    group, done: false,
    station() { return { ...station(), via: [new THREE.Vector3(48, 5, -118), new THREE.Vector3(2, 8, -175), new THREE.Vector3(-34, 2, -196)], dur: 6, roll: 0.1 }; },
    prepare() {
      lights.a.color.set(0xffa95c); lights.b.color.set(0xffa95c);
      lights.a.position.copy(group.localToWorld(tips[0].clone().add(new THREE.Vector3(-0.3, 1.1, 2.2))));
      lights.b.position.copy(group.localToWorld(tips[1].clone().add(new THREE.Vector3(0.3, 1.1, 2.2))));
      gsap.to(lights.key, { intensity: 0.28, duration: 3 });
      gsap.to(lights.hemi, { intensity: 0.2, duration: 3 });
      lights.a.intensity = 0; lights.b.intensity = 0;
    },
    enter() {
      state = 'lit';
      wishMotes.show(true, 2.5);
      ui.title(cfg.title);
      ui.hint(cfg.hint);
      if (navigator.mediaDevices?.getUserMedia) ui.mic(cfg.micButton, useMic);
    },
    beat() { blow(); },
    onResize() { const s = station(); ctx.setRig(s.pos, s.look); },
    update(t, dt) {
      if (!group.visible) return;
      if (state === 'lit' || state === 'hidden') {
        const fl = reduced ? 1 : 0.86 + Math.sin(t * 11.3) * 0.06 + Math.sin(t * 23.1 + 1) * 0.04 + Math.sin(t * 4.7) * 0.07;
        const fl2 = reduced ? 1 : 0.86 + Math.sin(t * 13.1 + 2) * 0.07 + Math.sin(t * 5.3) * 0.07;
        const m = ctx.uniforms.uMusic.value * 0.12;
        lights.a.intensity = 11 * (fl + m);
        lights.b.intensity = 11 * (fl2 + m);
        if (state === 'lit') { halos[0].scale.setScalar(2.4 + fl * 0.5 + m * 2); halos[1].scale.setScalar(2.4 + fl2 * 0.5 + m * 2); }
      }
      if (smoke.visible) smokeU.uT.value += dt;
      if (confetti.visible) confU.uT.value += dt * (reduced ? 0.5 : 1);
      if (fireworks?.visible) fireU.uT.value += dt;
    },
    left() { gsap.to(lights.a, { intensity: 0, duration: 0.5 }); gsap.to(lights.b, { intensity: 0, duration: 0.5 }); },
    dispose() { stopMic(); wishMotes.dispose(); disposeGroup(group); plane.dispose(); glowTex.dispose(); },
  };
  return inst;
}
