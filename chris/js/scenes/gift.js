import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTexture, disposeGroup, seeded, glowTexture, heroStar, heartTexture } from '../util.js';
import { createDrift, createMotes, createRipple } from '../fx.js';

const BW = 2.4, BH = 1.7, LW = 2.62, LH = 0.52, TOP = BH / 2 + LH - 0.05;

function wrappingPaper() {
  const size = 1024, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#b03a64'); bg.addColorStop(1, '#8d2850');
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  // Stars drawn one at a time, a little uneven, the way a hand-printed paper would be.
  const rng = seeded(1111);
  const cell = 92;
  for (let y = -1; y < size / cell + 1; y++) for (let x = -1; x < size / cell + 1; x++) {
    const px = x * cell + (y % 2 ? cell / 2 : 0) + (rng() - 0.5) * 20, py = y * cell + (rng() - 0.5) * 20;
    const r = 5 + rng() * 9, rot = rng() * 1.2;
    g.save(); g.translate(px, py); g.rotate(rot);
    g.fillStyle = rng() > 0.2 ? `rgba(250,214,142,${0.55 + rng() * 0.4})` : 'rgba(255,226,232,.55)';
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * 0.2 : r; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); }
    g.closePath(); g.fill(); g.restore();
  }
  return canvasTexture(c);
}

function giftTag(name) {
  const c = document.createElement('canvas'); c.width = 300; c.height = 170;
  const g = c.getContext('2d');
  g.fillStyle = '#f8eeda'; g.fillRect(0, 0, 300, 170);
  g.strokeStyle = 'rgba(160,72,95,.5)'; g.setLineDash([5, 5]); g.strokeRect(12, 12, 276, 146);
  g.fillStyle = '#7c2146'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 86px "Instrument Serif", Georgia, serif';
  g.fillText(name, 150, 86);
  return canvasTexture(c);
}

// ---- ribbons: flat strips that sit on the box, then peel away from the knot on the GPU ----
const ribbonMaterial = (uniforms) => new THREE.ShaderMaterial({
  uniforms, side: THREE.DoubleSide,
  vertexShader: /* glsl */`
    attribute vec3 aSide, aDir; attribute vec2 aInfo; // aInfo: s along strip, phase
    uniform float uP, uTime; varying vec3 vN; varying float vV, vQ, vS;
    void main() {
      float s = aInfo.x, ph = aInfo.y;
      float q = clamp((uP * 1.7 - s * .7), 0., 1.);
      q = q * q * (3. - 2. * q);
      vec3 free = position;
      free += aDir * q * (1.2 + s * 5.5 + uP * 2.);
      free.y += q * (sin(s * 6. + uTime * 2.2 + ph) * .7 + 2.4 * s - 3.6 * uP * uP * (.4 + s));
      free += cross(aDir, vec3(0., 1., 0.)) * q * sin(s * 9. + uTime * 1.6 + ph) * .55;
      float tw = q * (s * 7. + ph + uTime * 1.3);
      vec3 tang = normalize(aDir + vec3(.001, .2, .001));
      vec3 side = aSide * cos(tw) + cross(tang, aSide) * sin(tw);
      vec3 p = free + side;
      vN = normalize(normalMatrix * mix(normal, normalize(vec3(sin(tw), .5, cos(tw))), q));
      vV = sign(dot(aSide, aSide)) * uv.y; vQ = q; vS = s;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
    }`,
  fragmentShader: /* glsl */`
    uniform float uP; varying vec3 vN; varying float vV, vQ, vS;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      if (uP > .72 && hash(gl_FragCoord.xy) < (uP - .72) / .28) discard;
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      float dif = .3 + .85 * pow(max(dot(n, normalize(vec3(.4, .7, .6))), 0.), 1.4);
      float spec = pow(max(dot(n, normalize(vec3(.1, .6, .8))), 0.), 22.);
      float edge = smoothstep(.0, .06, vV) * smoothstep(1., .94, vV);
      vec3 gold = vec3(.86, .46, .1);
      vec3 c = gold * dif * mix(.68, 1., edge) + vec3(1., .8, .5) * spec * .8;
      gl_FragColor = vec4(c, 1.);
    }`,
});

function strip(points, sideAt, dirOut, phase, out) {
  const n = points.length, base = out.pos.length / 3;
  points.forEach((p, i) => {
    const s = i / (n - 1);
    const side = sideAt(i);
    const tangent = points[Math.min(i + 1, n - 1)].clone().sub(points[Math.max(i - 1, 0)]).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, side).normalize();
    [-1, 1].forEach((m) => {
      out.pos.push(p.x, p.y, p.z);
      out.side.push(side.x * m, side.y * m, side.z * m);
      out.dir.push(dirOut.x, dirOut.y, dirOut.z);
      out.normal.push(normal.x, normal.y, normal.z);
      out.info.push(s, phase);
      out.uv.push(s, m < 0 ? 0 : 1);
    });
    if (i < n - 1) {
      const a = base + i * 2;
      out.index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
}

function buildRibbons() {
  const out = { pos: [], side: [], dir: [], normal: [], info: [], uv: [], index: [] };
  const half = 0.17, eps = 0.012;
  const lidEdge = LW / 2 + eps, bodyEdge = BW / 2 + eps, topY = TOP + eps;
  // Four bands running from the knot down each side.
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz], k) => {
    const d = new THREE.Vector3(dx, 0, dz);
    const side = new THREE.Vector3(-dz, 0, dx).multiplyScalar(half);
    const pts = [];
    const push = (r, y) => pts.push(new THREE.Vector3(dx * r, y, dz * r));
    for (let i = 0; i <= 12; i++) push(lidEdge * i / 12, topY);
    const lidBottom = BH / 2 - 0.05 - eps;
    for (let i = 1; i <= 3; i++) push(lidEdge, topY - (topY - lidBottom) * i / 3);
    push(bodyEdge, lidBottom - 0.02);
    for (let i = 1; i <= 8; i++) push(bodyEdge, lidBottom - (lidBottom + BH / 2) * i / 8);
    strip(pts, () => side, d, k * 1.7, out);
  });
  // The bow: four loops and two tails.
  const loop = (angle, L, H, ph) => {
    const d = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const side = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(half * 0.92);
    const pts = [];
    for (let i = 0; i <= 26; i++) {
      const u = i / 26, a = u * Math.PI * 2;
      const r = L * (1 - Math.cos(a)) * 0.5;
      const y = H * Math.sin(a) * 0.55 + H * 0.55 * (1 - Math.cos(a)) * 0.5;
      pts.push(new THREE.Vector3(d.x * r, topY + 0.05 + y, d.z * r));
    }
    strip(pts, () => side, d, ph, out);
  };
  loop(0.72, 0.98, 0.62, 0.3); loop(0.72 + Math.PI, 0.98, 0.62, 1.4);
  loop(2.3, 0.86, 0.54, 2.2); loop(2.3 + Math.PI, 0.86, 0.54, 3.1);
  [[0.25, 1.32], [2.85, 1.2]].forEach(([angle, L], k) => {
    const d = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const side = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(half * 0.8);
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      pts.push(new THREE.Vector3(d.x * L * u, topY + 0.07 + Math.sin(u * 5) * 0.035, d.z * L * u));
    }
    strip(pts, () => side, d, 4 + k, out);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(out.side, 3));
  geo.setAttribute('aDir', new THREE.Float32BufferAttribute(out.dir, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(out.normal, 3));
  geo.setAttribute('aInfo', new THREE.Float32BufferAttribute(out.info, 2));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  geo.setIndex(out.index);
  return geo;
}

export function createGift(ctx) {
  const { gsap, ui, content, reduced, lights, stars } = ctx;
  const group = new THREE.Group();
  group.name = 'gift';
  group.visible = false;
  ctx.scene.add(group);

  const box = new THREE.Group();
  box.position.y = -0.42;
  box.rotation.set(0.17, -0.55, 0);
  group.add(box);

  const paper = wrappingPaper();
  // Velvet: a sheen layer catches the light along the edges the way crushed fabric does.
  const mat = new THREE.MeshPhysicalMaterial({ map: paper, roughness: 0.58, metalness: 0.02, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ff9fc0'), clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BW, 4, 0.05), mat);
  box.add(body);
  const lid = new THREE.Group();
  const LID_Y = BH / 2 + LH / 2 - 0.05;
  lid.position.y = LID_Y;
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(LW, LH, LW, 4, 0.06), mat);
  lid.add(lidMesh);
  box.add(lid);

  // Hand-written tag on a thread, hanging from the lid.
  const tagPivot = new THREE.Group();
  tagPivot.position.set(0.62, -0.02, LW / 2 + 0.02);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.41), new THREE.MeshStandardMaterial({ map: giftTag(content.name), roughness: 0.8, side: THREE.DoubleSide }));
  tag.position.set(0.02, -0.52, 0.02); tag.rotation.z = 0.12;
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4), new THREE.MeshBasicMaterial({ color: 0xf2c879 }));
  thread.position.set(0, -0.17, 0.01);
  tagPivot.add(tag, thread);
  lid.add(tagPivot);

  // Ribbons
  const ribbonU = { uP: { value: 0 }, uTime: ctx.uniforms.uTime };
  const ribbons = new THREE.Mesh(buildRibbons(), ribbonMaterial(ribbonU));
  ribbons.frustumCulled = false;
  box.add(ribbons);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ color: 0xe5a84f, metalness: 0.75, roughness: 0.3 }));
  knot.scale.set(1.15, 0.72, 1.15);
  knot.position.y = TOP + 0.12;
  box.add(knot);

  // The light inside, seen once the lid is gone
  const mouthU = { uGlow: { value: 0 }, uTime: ctx.uniforms.uTime };
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.96, BW * 0.96), new THREE.ShaderMaterial({
    uniforms: mouthU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uGlow; varying vec2 vUv; void main(){ vec2 p = abs(vUv - .5) * 2.; float d = max(p.x, p.y); float a = smoothstep(1., .2, d); gl_FragColor = vec4(vec3(1., .74, .42) * a * uGlow * 1.35, 1.); }`,
  }));
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.y = BH / 2 + 0.006;
  box.add(mouth);

  const beamU = { uGlow: { value: 0 }, uTime: ctx.uniforms.uTime };
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 0.95, 9, 28, 1, true), new THREE.ShaderMaterial({
    uniforms: beamU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform float uGlow, uTime; varying vec2 vUv; varying vec3 vN, vV;
      void main(){ float rim = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
        float ray = .72 + .28 * sin(vUv.x * 44. + uTime * .5) * sin(vUv.x * 19. - uTime * .3);
        float a = rim * vUv.y * vUv.y * ray * uGlow * .55; gl_FragColor = vec4(vec3(1., .78, .55) * a, a); }`,
  }));
  beam.position.y = BH / 2 + 4.5;
  box.add(beam);

  // Soft presence behind the box, so it does not float in pure black
  const glowTex = glowTexture(128, false);
  const halo = heroStar(glowTex, new THREE.Color('#d84f7e'), 0.2);
  halo.scale.setScalar(13);
  halo.position.set(0, 0.1, -1.6);
  group.add(halo);
  // A warm pool beneath, as if the box sat on something that caught its light
  const pool = heroStar(glowTex, new THREE.Color('#f2a85c'), 0.16);
  pool.scale.set(7.5, 2.2, 1);
  pool.position.set(0, -1.75, 0.4);
  group.add(pool);

  // Rose petals drifting down around the box, and fireflies that have taken a liking to it
  const petals = createDrift(ctx, { count: Math.floor((reduced ? 26 : 54) * Math.max(0.5, ctx.particles)), kind: 'petal', size: 0.3,
    colors: ['#f0789b', '#ff9bb5', '#f7c3cd', '#e4587f'], box: [6.2, 7.5, 3.2], fall: reduced ? 0.1 : 0.34, sway: 0.6, spin: reduced ? 0.2 : 0.8, seed: 21, lit: 0.5 });
  petals.mesh.position.set(0, -0.2, 0);
  group.add(petals.mesh);
  const flies = createMotes(ctx, { count: Math.floor(44 * Math.max(0.5, ctx.particles)), radius: 2.5, height: 1.6, speed: reduced ? 0.25 : 1, seed: 9 });
  flies.points.position.set(0, -0.3, 0);
  group.add(flies.points);

  // The heart of light that leaps out when the lid goes
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture(256, true), color: new THREE.Color('#ffb3c6'), opacity: 0, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  flash.scale.setScalar(0.1);
  flash.position.set(0, BH / 2 + 0.6, 0.2);
  box.add(flash);

  // A ring of light for every time she taps the box
  const ripple = createRipple(ctx, { color: [1, 0.74, 0.5], size: 1.5 });
  ctx.scene.add(ripple.mesh);
  const boxWorld = new THREE.Vector3();

  let state = 'idle', float = true;
  // What her scrolling asks for, and the eased value the box actually follows, so nothing ever snaps.
  let pullWant = 0, pullK = 0, spinVel = 0, hop = 0;
  const inst = {
    group,
    done: false,
    station() {
      const d = ctx.fit(4.7, ctx.aspect > 1.3 ? 9.4 : 7.7);
      return { pos: new THREE.Vector3(0, 1.0, d), look: new THREE.Vector3(0, 0.02, 0) };
    },
    enter() {
      lights.a.position.set(2.4, 3.2, 3.2); lights.a.intensity = 16; lights.a.color.set(0xffc58c);
      lights.b.position.set(-3.2, 0.2, 2.2); lights.b.intensity = 8; lights.b.color.set(0xff8fb0);
      ui.title(content.gift.title, 'grand');
      ui.hint(content.gift.hint);
      petals.show(true, 3);
      flies.show(true, 3);
    },
    onResize() { const s = inst.station(); ctx.setRig(s.pos, s.look); },
    beat() { inst.open(); },
    // Scrolling lifts the lid a touch and loosens the ribbon before it gives way.
    pull(p) { pullWant = Math.max(0, p); },
    // A sideways drag turns the box in her hands, and it keeps turning for a moment after.
    drag(dx) {
      if (state !== 'idle') return;
      spinVel = dx * 0.0075;
      box.rotation.y += spinVel;
    },
    // A tap makes the box jump, as if something inside heard her.
    tap(x, y) {
      if (state !== 'idle' || hop > 0.05 || !ctx.pick(x, y, [body, lidMesh])) return;
      ctx.buzz(6);
      ripple.fire(box.getWorldPosition(boxWorld), 1.1);
      if (reduced) return;
      gsap.timeline()
        .to(inst, { hopping: 1, duration: 0.16, ease: 'power2.out' })
        .to(inst, { hopping: 0, duration: 0.75, ease: 'bounce.out' });
      gsap.fromTo(box.scale, { x: 1.07, y: 0.9, z: 1.07 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'elastic.out(1,.45)' });
    },
    get hopping() { return hop; },
    set hopping(v) { hop = v; },
    open() {
      if (state !== 'idle') return;
      state = 'opening';
      ui.hint(null); ui.title(null);
      gsap.killTweensOf(box.scale); gsap.killTweensOf(inst); hop = 0;
      ctx.buzz(18);
      gsap.delayedCall(0.5, () => { ctx.flash(0.4, 1.8); ctx.shake(0.16); });
      const tl = gsap.timeline();
      const calm = reduced ? 1.5 : 1;
      if (!reduced) tl.to(box.scale, { x: 1.05, y: 0.93, z: 1.05, duration: 0.22, ease: 'sine.out' }, 0)
        .to(box.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'elastic.out(1,.5)' }, 0.22);
      tl.to(ribbonU.uP, { value: 1, duration: 3.1 * calm, ease: 'sine.inOut' }, 0.14);
      tl.to(knot.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power2.in' }, 0.14);
      tl.to(lid.position, { y: reduced ? 3 : 7.6, x: reduced ? 0 : 2.2, z: reduced ? 0 : -1.6, duration: 2.2 * calm, ease: reduced ? 'sine.inOut' : 'power2.out' }, 0.42);
      if (!reduced) tl.to(lid.rotation, { x: 2.2, z: -1.6, y: 0.8, duration: 2.2, ease: 'power1.out' }, 0.42);
      tl.to(lid.scale, { x: 0, y: 0, z: 0, duration: 0.9, ease: 'power2.in' }, 1.3 * calm);
      tl.to(mouthU.uGlow, { value: 1, duration: 1.1, ease: 'sine.out' }, 0.55);
      tl.call(() => { petals.burst(); flies.show(false, 1.2); }, null, 0.7);
      tl.to(flash.material, { opacity: 0.42, duration: 0.3, ease: 'power2.out' }, 0.95);
      tl.to(flash.scale, { x: reduced ? 3.5 : 5, y: reduced ? 3.5 : 5, z: 1, duration: 2, ease: 'power2.out' }, 0.95);
      tl.to(flash.position, { y: BH / 2 + 3.2, duration: 2, ease: 'power1.out' }, 0.95);
      tl.to(flash.material, { opacity: 0, duration: 1.1, ease: 'sine.in' }, 1.5);
      tl.to(pool.material, { opacity: 0, duration: 2.5 }, 1.2);
      tl.to(beamU.uGlow, { value: reduced ? 0.4 : 1, duration: 1.3, ease: 'sine.out' }, 0.7);
      tl.to(lights.a, { intensity: 15, duration: 1.2 }, 0.6);
      tl.call(() => {
        lights.a.position.set(0, 3.3, 1.3); lights.a.color.set(0xffd199);
      }, null, 0.6);
      tl.to(stars.uniforms.uBurst, { value: 1, duration: reduced ? 3.5 : 7.5, ease: 'none' }, 0.82);
      tl.to(halo.material, { opacity: 0, duration: 3 }, 1.2);
      tl.to(beamU.uGlow, { value: 0, duration: 2 }, 3.6);
      tl.to(mouthU.uGlow, { value: 0.25, duration: 2 }, 3.6);
      tl.to(box.position, { y: -7.5, duration: 4, ease: 'power2.in' }, 3.9);
      tl.to(box.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 4, ease: 'power2.in' }, 3.9);
      tl.to(lights.a, { intensity: 0, duration: 2 }, 4.4);
      tl.to(lights.b, { intensity: 0, duration: 2 }, 4.4);
      tl.call(() => { float = false; ctx.story.advance(); }, null, 3.7);
    },
    update(t, dt) {
      if (state === 'idle') {
        // As she scrolls the lid lifts on its light, the ribbon loosens and the whole box trembles to be opened.
        pullK += (pullWant - pullK) * Math.min(1, dt * (pullWant > pullK ? 16 : 6));
        const k = pullK;
        lid.position.y = LID_Y + k * k * 0.3;
        lid.rotation.z = k * 0.07; lid.rotation.x = -k * 0.05;
        ribbonU.uP.value = k * 0.09;
        mouthU.uGlow.value = k * 0.9;
        lights.a.intensity = 16 + k * 14;
        const shiver = reduced ? 0 : k * k * 0.022;
        box.rotation.z = Math.sin(t * 41) * shiver;
        box.position.x = Math.sin(t * 53 + 1) * shiver * 0.8;
        if (!reduced) box.position.y = -0.42 + Math.sin(t * 0.72) * 0.1 + hop * 0.5;
      }
      box.rotation.y += dt * (reduced ? 0.04 : state === 'idle' ? 0.2 : 0.42) + spinVel;
      spinVel *= Math.pow(0.03, dt);
      tagPivot.rotation.z = Math.sin(t * 1.3) * 0.05;
      if (state === 'idle' && float) {
        const m = ctx.uniforms.uMusic.value;
        halo.material.opacity = 0.16 + Math.sin(t * 0.8) * 0.03 + m * 0.07 + pullK * 0.14;
        pool.material.opacity = 0.14 + m * 0.06;
      }
      petals.update(dt);
    },
    dispose() { gsap.killTweensOf(inst); petals.dispose(); flies.dispose(); ripple.dispose(); ripple.mesh.removeFromParent(); disposeGroup(group); glowTex.dispose(); },
  };
  return inst;
}
