import * as THREE from 'three';
import { LAND_B64, MASK_W, MASK_H, CITIES } from '../data/earth-data.js';
import { disposeGroup, glowTexture, heroStar, seeded, canvasTexture, heartAt, heartTheta } from '../util.js';

const CENTER = new THREE.Vector3(80, 0, -175);
const R = 10;
const toVec = (lat, lon, r = 1, out = new THREE.Vector3()) => {
  const p = THREE.MathUtils.degToRad(lat), l = THREE.MathUtils.degToRad(lon);
  return out.set(Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)).multiplyScalar(r);
};

function landMask() {
  const bin = atob(LAND_B64);
  return (lat, lon) => {
    const row = Math.min(MASK_H - 1, Math.floor(90 - lat)), col = Math.min(MASK_W - 1, Math.floor(lon + 180));
    const i = row * MASK_W + col;
    return (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
  };
}

function label(text) {
  const c = document.createElement('canvas'); c.width = 360; c.height = 120;
  const g = c.getContext('2d');
  g.font = 'italic 84px "Instrument Serif", Georgia, serif';
  g.textBaseline = 'middle'; g.fillStyle = '#fbeed6';
  g.shadowColor = 'rgba(5,6,15,1)'; g.shadowBlur = 16;
  return { c, g, text };
}

export function createGlobe(ctx) {
  const { gsap, ui, content, reduced } = ctx;
  const cfg = content.globe;
  const group = new THREE.Group();
  group.name = 'globe';
  group.position.copy(CENTER);
  group.visible = false;
  ctx.scene.add(group);
  const tilt = new THREE.Group(), spin = new THREE.Group();
  group.add(tilt); tilt.add(spin);

  const latMid = (cfg.from.lat + cfg.to.lat) / 2, lonMid = (cfg.from.lon + cfg.to.lon) / 2;
  const targetSpin = -THREE.MathUtils.degToRad(lonMid), targetTilt = THREE.MathUtils.degToRad(latMid);
  tilt.rotation.x = targetTilt;

  // Night side: nearly black ocean, a thin line of atmosphere.
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 40), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN, vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `varying vec3 vN, vV; void main(){ float f = 1. - max(dot(normalize(vN), normalize(vV)), 0.);
      vec3 c = vec3(.006, .012, .04) + vec3(.05, .1, .34) * pow(f, 3.2) + vec3(.22, .07, .16) * pow(f, 7.); gl_FragColor = vec4(c, 1.); }`,
  }));
  spin.add(earth);
  const air = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 48, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN, vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `varying vec3 vN, vV; void main(){ float d = max(-dot(normalize(vN), normalize(vV)), 0.); float a = pow(clamp(d / .47, 0., 1.), 3.2); gl_FragColor = vec4(mix(vec3(.5,.18,.42), vec3(.2,.38,1.), a) * a * .75, a); }`,
  }));
  group.add(air);

  // A thin, slowly turning layer of cloud, brightest where the night's rim light catches it
  const cloudU = { uTime: ctx.uniforms.uTime };
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.022, 56, 40), new THREE.ShaderMaterial({
    uniforms: cloudU, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vN, vV, vP; void main(){ vN = normalize(normalMatrix*normal); vP = normalize(position); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vN, vV, vP;
      float h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main() {
        vec3 p = vP;
        float a0 = uTime * .012; float c = cos(a0), s = sin(a0);
        p.xz = mat2(c, -s, s, c) * p.xz;
        float n = vn(p * 4.) * .5 + vn(p * 9. + 3.) * .3 + vn(p * 19. + 7.) * .2;
        float cloud = smoothstep(.52, .72, n) * (1. - abs(p.y) * .35);
        float f = 1. - max(dot(normalize(vN), normalize(vV)), 0.);
        float rim = pow(f, 2.2);
        float a = cloud * (.035 + rim * .3);
        gl_FragColor = vec4(mix(vec3(.5, .62, .95), vec3(1., .78, .8), rim) * (.6 + rim), a);
      }`,
  }));
  spin.add(clouds);

  // The moon, keeping its distance
  const moonU = { uTime: ctx.uniforms.uTime, uSun: { value: new THREE.Vector3(0.6, 0.35, 0.72).normalize() } };
  const moon = new THREE.Mesh(new THREE.SphereGeometry(R * 0.26, 40, 28), new THREE.ShaderMaterial({
    uniforms: moonU,
    vertexShader: 'varying vec3 vN, vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: /* glsl */`
      uniform vec3 uSun; varying vec3 vN, vP;
      float h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main() {
        vec3 n = normalize(vN);
        vec3 p = normalize(vP);
        float maria = smoothstep(.5, .62, vn(p * 2.3 + 1.)) * .45;
        float craters = pow(vn(p * 9.), 6.) * 2.5 + pow(vn(p * 23. + 4.), 10.) * 2.;
        float shade = .3 + .75 * max(dot(n, uSun), 0.);
        shade *= 1. - maria;
        shade *= 1. - craters * .35;
        vec3 c = vec3(.95, .93, .86) * shade * 0.95;
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  // In portrait the frame is tight, so the moon sits nearer, in the top corner above the globe's rim.
  if (ctx.portrait) { moon.position.set(-R * 0.69, R * 1.34, -R * 1.6); moon.scale.setScalar(0.72); }
  else moon.position.set(-R * 2.4, R * 1.5, -R * 3.2);
  group.add(moon);
  const moonGlow = heroStar(glowTexture(128, false), new THREE.Color('#dfe4ff'), 0.18);
  moonGlow.scale.setScalar(R * (ctx.portrait ? 1 : 1.5));
  moonGlow.position.copy(moon.position).add(new THREE.Vector3(0, 0, -0.5));
  group.add(moonGlow);

  // Land as a field of dots, city lights on top. Everything is one draw call.
  const isLand = landMask();
  const rng = seeded(2018);
  const samples = Math.floor(30000 * Math.max(0.6, ctx.particles));
  const P = [], C = [], S = [], v = new THREE.Vector3();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i + 0.5) * 2 / samples, r = Math.sqrt(1 - y * y), a = i * golden;
    const lat = THREE.MathUtils.radToDeg(Math.asin(y));
    let lon = THREE.MathUtils.radToDeg(a) % 360; if (lon > 180) lon -= 360;
    if (!isLand(lat, lon)) continue;
    toVec(lat, lon, R * 1.004, v);
    P.push(v.x, v.y, v.z);
    const warm = rng() > 0.93;
    if (warm) C.push(0.72, 0.44, 0.2); else C.push(0.15, 0.25, 0.55);
    S.push(warm ? 1 : 0.85);
  }
  for (let i = 0; i < CITIES.length; i += 2) {
    toVec(CITIES[i], CITIES[i + 1], R * 1.006, v);
    P.push(v.x, v.y, v.z);
    const k = 0.55 + rng() * 0.55;
    C.push(1.25 * k, 0.8 * k, 0.4 * k);
    S.push(0.95 + rng() * 0.45);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(S, 1));
  const dotU = { uPx: ctx.uniforms.uPx, uHit: { value: new THREE.Vector3(0, 1, 0) }, uHitT: { value: 9 }, uNear: { value: new THREE.Vector3(0, 1, 0) }, uHover: { value: 0 } };
  const dots = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: dotU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute vec3 aColor; attribute float aSize; uniform float uPx, uHitT, uHover; uniform vec3 uHit, uNear; varying vec3 vColor; varying float vAlpha;
      void main(){
        vec3 dir = normalize(position);
        // a touch sends a ring of light round the world, lifting the land as it passes
        float ang = acos(clamp(dot(dir, uHit), -1., 1.));
        float wave = exp(-pow((ang - uHitT * 1.15) * 13., 2.)) * (1. - smoothstep(1.1, 2.6, uHitT)) * smoothstep(0., .14, uHitT);
        // and the land under her cursor glows, as if lit from her side of the glass
        float near = exp(-pow(acos(clamp(dot(dir, uNear), -1., 1.)) * 5.5, 2.)) * uHover;
        vec3 p = position * (1. + wave * .035 + near * .012);
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = uPx * aSize * (1. + wave * .75 + near * .5) * clamp(62. / -mv.z, 1., 3.2);
        vColor = aColor * (1. + wave * 1.7 + near * 1.3) + vec3(1., .62, .34) * (wave * .22 + near * .12);
        vec3 n = normalize(normalMatrix*position); vAlpha = smoothstep(0., .34, dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.12,d)*vAlpha; if (a<.01) discard; gl_FragColor = vec4(vColor*a, a); }`,
  }));
  spin.add(dots);

  // The arc
  const A = toVec(cfg.from.lat, cfg.from.lon, 1), B = toVec(cfg.to.lat, cfg.to.lon, 1);
  const pts = [];
  const qa = new THREE.Vector3();
  for (let i = 0; i <= 64; i++) {
    const u = i / 64;
    const angle = A.angleTo(B);
    qa.copy(A).multiplyScalar(Math.sin((1 - u) * angle)).addScaledVector(B, Math.sin(u * angle)).divideScalar(Math.sin(angle));
    pts.push(qa.clone().multiplyScalar(R * (1.008 + Math.sin(u * Math.PI) * 0.135)));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const arcU = { uDraw: { value: 0 }, uHead: { value: -1 } };
  const arc = new THREE.Mesh(new THREE.TubeGeometry(curve, 110, 0.032, 6), new THREE.ShaderMaterial({
    uniforms: arcU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uDraw, uHead; varying vec2 vUv;
      void main(){ float t = vUv.x; if (t > uDraw) discard;
        // two lights set out, one from each end, and leave a glow behind them
        float trailA = exp(-max(uHead - t, 0.) * 7.) * step(t, uHead);
        float trailB = exp(-max(t - (1. - uHead), 0.) * 7.) * step(1. - uHead, t);
        vec3 c = mix(vec3(1., .62, .24), vec3(1., .32, .5), t) * (1.15 + (trailA + trailB) * 3.2);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  arc.frustumCulled = false;
  spin.add(arc);

  const tex = glowTexture(96, true);
  const sparkA = heroStar(tex, new THREE.Color(1, 0.86, 0.62), 0), sparkB = heroStar(tex, new THREE.Color(1, 0.7, 0.8), 0);
  [sparkA, sparkB].forEach((sp) => { sp.material.depthTest = true; sp.scale.setScalar(1.4); spin.add(sp); });
  // Where they meet, a small heart blooms and rises
  const apex = curve.getPoint(0.5);
  const burstN = 150;
  const bTheta = new Float32Array(burstN), bSeed = new Float32Array(burstN * 2);
  for (let i = 0; i < burstN; i++) { bTheta[i] = heartTheta(i / burstN); bSeed.set([rng(), rng()], i * 2); }
  const burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(burstN * 3), 3));
  burstGeo.setAttribute('aTheta', new THREE.BufferAttribute(bTheta, 1));
  burstGeo.setAttribute('aSeed', new THREE.BufferAttribute(bSeed, 2));
  const burstU = { uK: { value: 2 }, uOrigin: { value: apex.clone() }, uPx: ctx.uniforms.uPx };
  const burst = new THREE.Points(burstGeo, new THREE.ShaderMaterial({
    uniforms: burstU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aTheta; attribute vec2 aSeed; uniform float uK, uPx; uniform vec3 uOrigin; varying vec3 vC; varying float vA;
      void main() {
        float k = clamp(uK, 0., 1.);
        float e = 1. - pow(1. - k, 3.);
        float s = sin(aTheta), c = cos(aTheta);
        vec2 heart = vec2(16. * s * s * s, 13. * c - 5. * cos(2. * aTheta) - 2. * cos(3. * aTheta) - cos(4. * aTheta) + 2.5) / 16.;
        heart *= e * (1.6 + aSeed.x * .25);
        heart.y += k * k * 1.8;
        heart += vec2(aSeed.x - .5, aSeed.y - .5) * k * .5;
        vec4 mv = modelViewMatrix * vec4(uOrigin, 1.);
        mv.xy += heart;
        gl_PointSize = uPx * (2.6 - k * 1.2) * clamp(34. / -mv.z, .6, 2.);
        gl_Position = projectionMatrix * mv;
        vC = mix(vec3(1., .5, .62), vec3(1., .82, .5), aSeed.y) * (2.4 - k);
        vA = uK > 1. ? 0. : smoothstep(0., .08, k) * (1. - k) * (1. - k);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ if (vA <= 0.) discard; float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.08,d)*vA; gl_FragColor = vec4(vC*a, a); }`,
  }));
  burst.frustumCulled = false;
  spin.add(burst);

  const marker = (lat, lon) => {
    const m = heroStar(tex, new THREE.Color(1, 0.78, 0.5), 0);
    m.material.depthTest = true;
    m.position.copy(toVec(lat, lon, R * 1.012));
    spin.add(m);
    return m;
  };
  const m1 = marker(cfg.from.lat, cfg.from.lon), m2 = marker(cfg.to.lat, cfg.to.lon);

  const makeLabel = (text, base, alignLeft) => {
    const { c, g } = label(text);
    g.textAlign = alignLeft ? 'left' : 'right';
    g.fillText(text, alignLeft ? 34 : c.width - 34, c.height / 2);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(c), transparent: true, opacity: 0, sizeAttenuation: false, depthWrite: false, depthTest: false }));
    s.center.set(alignLeft ? 0 : 1, 0.5);
    s.position.copy(base);
    spin.add(s);
    return s;
  };
  // Delhi sits to the east (right of the arc), Doha to the west (left of it).
  const l1 = makeLabel(cfg.from.name, m1.position, true), l2 = makeLabel(cfg.to.name, m2.position, false);
  const sizeLabels = () => {
    const tan = Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
    const hpx = 34;
    const sy = (hpx / ctx.height) * 2 * tan;
    [l1, l2].forEach((s) => s.scale.set(sy * 3, sy, 1));
  };
  sizeLabels();

  const wq = new THREE.Quaternion(), facing = new THREE.Vector3();
  let labelsOn = false;
  let velX = 0, velY = 0, lastDrag = -100, now = 0, entered = false, traveling = false, dragging = false;
  const hit = new THREE.Vector3();
  // Where on the turning globe (in its own frame) a point on screen lands, or null if it misses.
  const surface = (x, y, out) => (ctx.hitSphere(x, y, CENTER, R, hit) ? spin.worldToLocal(out.copy(hit)).normalize() : null);
  const far = () => ctx.fit(R * 2.45, R * 2.45);
  const near = () => (ctx.portrait ? Math.min(far(), Math.max(29, ctx.fit(R * 1.2, R * 1))) : ctx.fit(R * 2.2, R * 2.1));
  const shift = () => (ctx.portrait ? 3.1 : 0);
  const stationAt = (d) => ({
    pos: CENTER.clone().add(new THREE.Vector3(0, -shift(), d)),
    look: CENTER.clone().add(new THREE.Vector3(0, -shift(), 0)),
  });

  const inst = {
    group, done: false, captureDrag: true,
    station() {
      return { ...stationAt(far()), via: [new THREE.Vector3(26, 22, -105), new THREE.Vector3(66, 8, -96)], dur: 5.5, roll: -0.09 };
    },
    prepare() {
      spin.rotation.y = reduced ? targetSpin : targetSpin - 2.2;
      if (!reduced) gsap.to(spin.rotation, { y: targetSpin, duration: 7.2, ease: 'power3.out' });
    },
    enter() {
      entered = true;
      ui.el.root.classList.add('can-grab');
      ui.hint(cfg.hint);
      gsap.to([m1.material, l1.material], { opacity: 1, duration: 1.2, delay: 0.1 });
      m1.scale.setScalar(1.05); m2.scale.setScalar(1.05);
      gsap.to(arcU.uDraw, { value: 1, duration: reduced ? 1.2 : 3.4, ease: 'sine.inOut', delay: 0.5,
        onComplete() { traveling = !reduced; } });
      gsap.to([m2.material, l2.material], { opacity: 1, duration: 1.2, delay: reduced ? 1.2 : 3.2, onComplete() { labelsOn = true; } });
      if (!reduced) ctx.flyTo({ ...stationAt(near()), dur: 5, ease: 'sine.inOut' });
      else { const s = stationAt(near()); ctx.flyTo({ ...s }); }
      ui.caption(cfg.caption, { perWord: reduced ? 200 : 440, delay: 1500, then() { inst.done = true; ui.hint(null); ctx.story.showNext(); } });
    },
    beat() { ui.finishCaption(); },
    drag(dx, dy) {
      const k = 0.0058 * (near() / 34);
      spin.rotation.y += dx * k;
      tilt.rotation.x = THREE.MathUtils.clamp(tilt.rotation.x + dy * k * 0.6, -0.55, 1.05);
      velX = dx * k; velY = dy * k * 0.6; lastDrag = now;
      if (!dragging) { dragging = true; ui.grab(true); }
    },
    dragEnd() { lastDrag = now; dragging = false; ui.grab(false); if (reduced) velX = velY = 0; },
    tap(x, y) {
      if (!entered || !surface(x, y, dotU.uHit.value)) return;
      dotU.uHitT.value = 0;
      ctx.buzz(6);
    },
    leaving() { ui.grab(false); ui.el.root.classList.remove('can-grab'); },
    onResize() { const s = stationAt(entered ? near() : far()); ctx.setRig(s.pos, s.look); sizeLabels(); },
    update(t, dt) {
      now = t;
      spin.rotation.y += velX; velX *= Math.pow(0.0025, dt);
      if (!dragging) { tilt.rotation.x = THREE.MathUtils.clamp(tilt.rotation.x + velY, -0.55, 1.05); velY *= Math.pow(0.0025, dt); }
      dotU.uHitT.value += dt;
      const over = entered && ctx.pointer.active && !!surface(ctx.pointer.x, ctx.pointer.y, dotU.uNear.value);
      dotU.uHover.value += ((over ? 1 : 0) - dotU.uHover.value) * Math.min(1, dt * 6);
      // left alone, the globe drifts home so the arc is back in front of her
      if (t - lastDrag > 4 && Math.abs(velX) < 0.0004 && entered) {
        let diff = (targetSpin - spin.rotation.y) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2; else if (diff < -Math.PI) diff += Math.PI * 2;
        spin.rotation.y += diff * (1 - Math.pow(0.4, dt));
        tilt.rotation.x += (targetTilt - tilt.rotation.x) * (1 - Math.pow(0.4, dt));
      }
      if (traveling) {
        // every 5.6 s: 3 s of travel toward each other, then the heart where they meet
        const cycle = (t * (1 / 5.6)) % 1, travel = Math.min(1, cycle / 0.54);
        const u = 0.5 * (1 - Math.pow(1 - travel, 2.2));
        arcU.uHead.value = u;
        const vis = travel < 1;
        const o = vis ? Math.min(1, Math.sin(travel * Math.PI) * 3) : 0;
        sparkA.material.opacity = o; sparkB.material.opacity = o;
        if (vis) { curve.getPoint(u, sparkA.position); curve.getPoint(1 - u, sparkB.position); }
        burstU.uK.value = travel >= 1 ? (cycle - 0.54) / 0.4 : 2;
      }
      // Labels are drawn over the sphere so it can never slice them, so hide them by hand round the back.
      if (labelsOn) {
        spin.getWorldQuaternion(wq);
        [[l1, m1], [l2, m2]].forEach(([l, m]) => {
          facing.copy(m.position).normalize().applyQuaternion(wq);
          const k = THREE.MathUtils.smoothstep(facing.z, 0.28, 0.5);
          l.material.opacity = k;
        });
      }
      if (!reduced) {
        const p = 1.05 + Math.sin(t * 2) * 0.12;
        m1.scale.setScalar(p); m2.scale.setScalar(p + 0.04);
      }
    },
    dispose() { ui.grab(false); ui.el.root.classList.remove('can-grab'); disposeGroup(group); tex.dispose(); },
  };
  return inst;
}
