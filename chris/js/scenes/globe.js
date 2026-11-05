import * as THREE from 'three';
import { LAND_B64, MASK_W, MASK_H, CITIES } from '../data/earth-data.js';
import { disposeGroup, glowTexture, heroStar, seeded, canvasTexture } from '../util.js';

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
  const dots = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uPx: ctx.uniforms.uPx }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aColor; attribute float aSize; uniform float uPx; varying vec3 vColor; varying float vAlpha;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = uPx * aSize * clamp(62. / -mv.z, 1., 3.2);
        vColor = aColor; vec3 n = normalize(normalMatrix*position); vAlpha = smoothstep(0., .34, dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix*mv; }`,
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
        float trail = exp(-max(uHead - t, 0.) * 7.) * step(t, uHead);
        vec3 c = mix(vec3(1., .62, .24), vec3(1., .32, .5), t) * (1.15 + trail * 3.5);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  arc.frustumCulled = false;
  spin.add(arc);

  const tex = glowTexture(96, true);
  const spark = heroStar(tex, new THREE.Color(1, 0.86, 0.62), 0);
  spark.material.depthTest = true;
  spark.scale.setScalar(1.4);
  spin.add(spark);

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
  let velX = 0, lastDrag = -100, now = 0, entered = false, traveling = false;
  const far = () => ctx.fit(R * 2.45, R * 2.45);
  const near = () => (ctx.portrait ? Math.min(far(), Math.max(29, ctx.fit(R * 1.2, R * 1))) : ctx.fit(R * 1.5, R * 1.45));
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
      velX = dx * k; lastDrag = now;
    },
    dragEnd() { lastDrag = now; if (reduced) velX = 0; },
    onResize() { const s = stationAt(entered ? near() : far()); ctx.setRig(s.pos, s.look); sizeLabels(); },
    update(t, dt) {
      now = t;
      spin.rotation.y += velX; velX *= Math.pow(0.0025, dt);
      // left alone, the globe drifts home so the arc is back in front of her
      if (t - lastDrag > 4 && Math.abs(velX) < 0.0004 && entered) {
        let diff = (targetSpin - spin.rotation.y) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2; else if (diff < -Math.PI) diff += Math.PI * 2;
        spin.rotation.y += diff * (1 - Math.pow(0.4, dt));
        tilt.rotation.x += (targetTilt - tilt.rotation.x) * (1 - Math.pow(0.4, dt));
      }
      if (traveling) {
        const u = (t * 0.2) % 1.2;
        arcU.uHead.value = Math.min(u, 1.0);
        const vis = u <= 1;
        spark.material.opacity = vis ? Math.min(1, Math.sin(Math.min(u, 1) * Math.PI) * 4) : 0;
        if (vis) curve.getPoint(u, spark.position);
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
    dispose() { disposeGroup(group); tex.dispose(); },
  };
  return inst;
}
