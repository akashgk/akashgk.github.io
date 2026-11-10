import * as THREE from 'three';
import { canvasTexture, disposeGroup, glowTexture, heroStar, sampleText, seeded, heartInside } from '../util.js';
import { createDrift } from '../fx.js';

const CAM = new THREE.Vector3(0, 10, -232);
const LOOK = new THREE.Vector3(0, 10, -95);
const DIST = 22; // text and letter hang this far in front of the camera

/** Text in the red channel, "when does this pixel appear" in green, signature flag in blue. */
function letterTexture(cfg) {
  const W = 1024, pad = 92, maxW = W - pad * 2, size = 64, lh = 84, gap = 22;
  const probe = document.createElement('canvas').getContext('2d');
  const font = (sig) => `${sig ? 'italic ' : ''}${sig ? size + 8 : size}px "Instrument Serif", Georgia, serif`;
  probe.font = font(false);
  const rows = [];
  cfg.lines.forEach((line) => {
    let cur = '';
    line.split(' ').forEach((w) => {
      const next = cur ? `${cur} ${w}` : w;
      if (probe.measureText(next).width > maxW && cur) { rows.push({ text: cur }); cur = w; } else cur = next;
    });
    rows.push({ text: cur, end: true });
  });
  rows.push({ text: cfg.signature, end: true, sig: true });
  const H = Math.ceil(pad * 1.5 + rows.length * lh + rows.filter((r) => r.end).length * gap + pad * 0.5);

  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  let y = pad * 1.05 + size, total = 0;
  const bands = [];
  rows.forEach((r) => {
    g.font = font(r.sig);
    if (r.sig) { y += 16; }
    const width = g.measureText(r.text).width;
    const x = r.sig ? W - pad - width : pad;
    g.fillText(r.text, x, y);
    const dur = r.text.length * 0.052 + 0.25;
    bands.push({ y0: Math.round(y - size * 0.95), y1: Math.round(y + size * 0.42), x0: x, x1: x + width, t0: total, t1: total + dur, sig: r.sig });
    total += dur + (r.end ? 0.95 : 0.1);
    y += lh + (r.end ? gap : 0);
  });
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i + 1] = 255; d[i + 2] = 0; }
  bands.forEach((b) => {
    for (let yy = Math.max(0, b.y0); yy < Math.min(H, b.y1); yy++) for (let xx = 0; xx < W; xx++) {
      const k = (yy * W + xx) * 4;
      const f = THREE.MathUtils.clamp((xx - b.x0) / (b.x1 - b.x0), 0, 1);
      d[k + 1] = Math.round(((b.t0 + (b.t1 - b.t0) * f) / total) * 245);
      d[k + 2] = b.sig ? 255 : 0;
    }
  });
  g.putImageData(img, 0, 0);
  const tex = canvasTexture(c, { srgb: false });
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  // where the pen is at any moment of the reveal, in 0..1 paper coordinates
  const strokes = bands.map((b) => ({ t0: b.t0 / total, t1: b.t1 / total, x0: b.x0 / W, x1: b.x1 / W, y: (b.y1 - size * 0.42) / H }));
  return { tex, aspect: H / W, seconds: total, strokes };
}

export async function createLetter(ctx) {
  const { gsap, ui, content, reduced } = ctx;
  const cfg = content.letter;
  try {
    await Promise.all([document.fonts.load('italic 170px "Instrument Serif"'), document.fonts.load('64px "Instrument Serif"')]);
  } catch { /* a system serif is an acceptable stand-in */ }

  const group = new THREE.Group();
  group.name = 'letter';
  group.position.copy(CAM).add(new THREE.Vector3(0, 0, DIST));
  group.rotation.y = Math.PI; // local +z points back at the camera, local +x reads left to right
  group.visible = false;
  ctx.scene.add(group);

  const rng = seeded(1115);
  const view = () => ctx.viewAt(DIST);
  const font = 'italic SIZEpx "Instrument Serif", Georgia, serif';

  // ---- particle title ----
  const dens = Math.max(0.62, ctx.particles);
  const leadN = Math.floor(5200 * dens), nameN = Math.floor(6600 * dens), N = leadN + nameN;
  const v0 = view();
  const maxW = v0.w * 0.86;
  const leadEm = Math.min(2.3, maxW * 0.205), nameEm = Math.min(4.8, maxW * 0.42);
  const leadY = nameEm * 0.52, nameY = -nameEm * 0.3;
  const word = (w) => sampleText(w, { font, count: nameN, rng, maxWidth: maxW, em: nameEm }).points;
  const lead = sampleText(cfg.greeting, { font, count: leadN, rng, maxWidth: maxW, em: leadEm }).points;
  const nameSets = [content.name, ...content.nicknames].map(word);

  const from = new Float32Array(N * 3), A = new Float32Array(N * 3), B = new Float32Array(N * 3), info = new Float32Array(N * 3);
  const putName = (array, set) => {
    for (let i = 0; i < nameN; i++) {
      const j = leadN + i;
      array[j * 3] = set[i * 2]; array[j * 3 + 1] = set[i * 2 + 1] + nameY; array[j * 3 + 2] = (rng() - 0.5) * 0.28;
    }
  };
  for (let i = 0; i < leadN; i++) {
    A[i * 3] = B[i * 3] = lead[i * 2];
    A[i * 3 + 1] = B[i * 3 + 1] = lead[i * 2 + 1] + leadY;
    A[i * 3 + 2] = B[i * 3 + 2] = (rng() - 0.5) * 0.2;
  }
  putName(A, nameSets[0]); putName(B, nameSets[0]);
  // Before they are words, the particles are one big heart filling the screen.
  const hs = Math.min(v0.h * 0.78, v0.w * 0.9) / 23, hv = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    heartInside(rng, hv);
    from.set([hv.x * hs, (hv.y + 1) * hs, (rng() - 0.5) * 3], i * 3);
    info.set([rng(), i < leadN ? 0 : 1, rng()], i * 3);
  }
  const textGeo = new THREE.BufferGeometry();
  textGeo.setAttribute('position', new THREE.BufferAttribute(from, 3));
  const attrA = new THREE.BufferAttribute(A, 3), attrB = new THREE.BufferAttribute(B, 3);
  textGeo.setAttribute('aA', attrA); textGeo.setAttribute('aB', attrB);
  textGeo.setAttribute('aInfo', new THREE.BufferAttribute(info, 3));
  const textU = { uAssemble: { value: 0 }, uMix: { value: 0 }, uFade: { value: 1 }, uTime: ctx.uniforms.uTime, uPx: ctx.uniforms.uPx,
    uPtr: { value: new THREE.Vector3() }, uPtrOn: { value: 0 } };
  const text = new THREE.Points(textGeo, new THREE.ShaderMaterial({
    uniforms: textU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aA, aB, aInfo; uniform float uAssemble, uMix, uFade, uTime, uPx, uPtrOn; uniform vec3 uPtr;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float seed = aInfo.x, isName = aInfo.y;
        float k = clamp(uAssemble * 1.5 - seed * .5, 0., 1.);
        float e = k * k * (3. - 2. * k);
        float m = clamp(uMix * 1.4 - seed * .4, 0., 1.); m = m * m * (3. - 2. * m);
        vec3 target = mix(aA, aB, m);
        target.xy += vec2(sin(seed * 40. + m * 6.), cos(seed * 70. + m * 5.)) * sin(m * 3.14159) * 1.15;
        target.z += sin(m * 3.14159) * (seed - .5) * 3.;
        // the heart breathes, then each particle spirals gently into its letter
        vec3 start = position * (1. + .03 * sin(uTime * 1.6 + position.y * .2));
        start.xy += vec2(sin(uTime * .8 + seed * 40.), cos(uTime * .6 + seed * 60.)) * .12;
        vec3 p = mix(start, target, e);
        float ang = sin(e * 3.14159) * (seed - .5) * 1.4;
        float c = cos(ang), s = sin(ang);
        vec2 rel = p.xy - target.xy;
        p.xy = target.xy + mat2(c, -s, s, c) * rel;
        p += .02 * vec3(sin(uTime * .9 + seed * 50.), cos(uTime * .7 + seed * 80.), 0.) * e;
        p.y += (1. - uFade) * (2.6 + seed * 3.);
        // the light parts around her finger like sand, and closes again behind it
        vec2 away = p.xy - uPtr.xy;
        float push = uPtrOn * exp(-dot(away, away) / 1.9);
        p.xy += normalize(away + vec2(1e-4)) * push * (.9 + seed * 1.3);
        p.z += push * (seed - .5) * 2.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = uPx * clamp((1.05 + aInfo.z * .55 + (1. - e) * 1.2 + push * 1.4), 1., 3.6);
        gl_Position = projectionMatrix * mv;
        vec3 gold = vec3(1., .72, .36), rose = vec3(1., .42, .56);
        vec3 wordCol = mix(gold, mix(rose, gold, seed * .4), isName) * (1.28 + isName * .3);
        vec3 heartCol = mix(rose, vec3(1., .62, .7), seed) * 1.2;
        vColor = mix(heartCol, wordCol, e) * (.85 + .15 * sin(uTime * 1.6 + seed * 60.)) * (1. + push * 1.1);
        vAlpha = (.55 + .45 * e) * uFade;
      }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.1,d)*vAlpha; if (a<.004) discard; gl_FragColor = vec4(vColor*a, a); }`,
  }));
  text.frustumCulled = false;
  group.add(text);

  // ---- the letter ----
  const { tex, aspect, seconds, strokes } = letterTexture(cfg);
  const paperU = { uMap: { value: tex }, uReveal: { value: 0 }, uShow: { value: 0 }, uTime: ctx.uniforms.uTime, uCalm: { value: reduced ? 1 : 0 } };
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, aspect, 20, 26), new THREE.ShaderMaterial({
    uniforms: paperU, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: /* glsl */`
      uniform float uTime, uCalm; varying vec2 vUv; varying float vLight;
      void main() {
        vUv = uv;
        vec3 p = position;
        float w = sin(p.x * 3.1 + uTime * .45) * .012 + cos(p.y * 2.7 + uTime * .36) * .012;
        p.z += w * (1. - uCalm) - p.x * p.x * .1;
        vLight = .94 + w * 3.5 * (1. - uCalm) + p.y * .07 - p.x * .05;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform float uReveal, uShow; varying vec2 vUv; varying float vLight;
      float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec4 t = texture2D(uMap, vUv);
        vec2 e = min(vUv, 1. - vUv);
        float rag = vn(vUv * 70.) * .006 + vn(vUv * 19.) * .006;
        float edge = smoothstep(rag, rag + .004, min(e.x, e.y));
        float fibre = vn(vUv * vec2(260., 90.)) * .022 + vn(vUv * 32.) * .025;
        vec3 paper = vec3(.74, .55, .34) * (vLight + fibre);
        vec2 lit = vUv - vec2(.42, .62);
        paper *= 1.04 - dot(lit, lit) * .85;
        paper *= .8 + .2 * smoothstep(0., .1, min(e.x, e.y));
        float vis = smoothstep(t.g, t.g + .012, uReveal) * t.r;
        vec3 ink = mix(vec3(.013, .016, .05), vec3(.32, .03, .09), t.b);
        vec3 c = mix(paper, ink, vis * .97);
        gl_FragColor = vec4(c, edge * uShow);
      }`,
  }));
  paper.visible = false;
  paper.renderOrder = 5;
  group.add(paper);

  const haloTex = glowTexture(128, false);
  const halo = heroStar(haloTex, new THREE.Color('#f2b16b'), 0);
  halo.renderOrder = 4;
  group.add(halo);
  // The pen: a point of gold light that writes each line as the ink appears
  const pen = heroStar(glowTexture(64, true), new THREE.Color('#ffd79a'), 0);
  pen.renderOrder = 6;
  pen.scale.setScalar(0.9);
  group.add(pen);

  // Petals drift down over the whole scene once the letter is out
  const petals = createDrift(ctx, { count: Math.floor((reduced ? 18 : 40) * Math.max(0.5, ctx.particles)), kind: 'petal', size: 0.4,
    colors: ['#f07a9a', '#ff9fb6', '#f6c6cf'], box: [v0.w * 1.1, v0.h * 1.2, 10], fall: reduced ? 0.15 : 0.5, sway: 1.2, spin: reduced ? 0.2 : 0.8, seed: 51, opacity: 0.9, lit: 0.45 });
  petals.mesh.position.set(0, 0, -3);
  petals.mesh.renderOrder = 3;
  group.add(petals.mesh);
  // And at the very end, hearts rise from the page
  const rising = createDrift(ctx, { count: Math.floor((reduced ? 24 : 60) * Math.max(0.5, ctx.particles)), kind: 'heart', size: 0.5,
    colors: ['#ff8fae', '#f2c879', '#ffb9cb'], box: [8, 14, 3], fall: reduced ? -0.2 : -0.6, sway: 0.8, spin: 0.6, seed: 61, lit: 0.8 });
  rising.mesh.renderOrder = 6;
  group.add(rising.mesh);

  // ---- ending: dust drifting upward, slowly ----
  const dustN = Math.floor(320 * ctx.particles);
  const dp = new Float32Array(dustN * 3), ds = new Float32Array(dustN * 2);
  for (let i = 0; i < dustN; i++) {
    dp.set([(rng() - 0.5) * 34, rng() * 28, -2 - rng() * 22], i * 3);
    ds.set([rng(), rng()], i * 2);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dustGeo.setAttribute('aS', new THREE.BufferAttribute(ds, 2));
  const dustU = { uTime: ctx.uniforms.uTime, uPx: ctx.uniforms.uPx, uOn: { value: 0 }, uRate: { value: reduced ? 0.12 : 0.42 } };
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: dustU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aS; uniform float uTime, uPx, uOn, uRate; varying vec3 vColor; varying float vAlpha;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime * uRate * (.4 + aS.x), 28.) - 14.;
        p.x += sin(uTime * .22 + aS.y * 20.) * .7; vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = uPx * (1.2 + aS.y * 2.); gl_Position = projectionMatrix*mv;
        vColor = mix(vec3(1.,.7,.34), vec3(1.,.42,.58), aS.x) * 1.1; vAlpha = uOn * (.35 + .4 * sin(uTime * (.5 + aS.x) + aS.y * 30.) * .5 + .2); }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.05,d); a *= a * vAlpha; if (a<.003) discard; gl_FragColor = vec4(vColor*a, a); }`,
  }));
  dust.frustumCulled = false;
  group.add(dust);

  // ---- layout: portrait stacks heart over letter; landscape puts them side by side ----
  const rest = { x: 0, y: 0, s: 1 };
  const layout = () => {
    const v = view();
    const portrait = ctx.aspect < 1;
    if (portrait) {
      const s = Math.min(v.w * 0.84, (v.h * 0.54) / aspect);
      rest.x = 0; rest.y = -v.h * 0.125; rest.s = s;
    } else {
      const s = Math.min(v.w * 0.42, (v.h * 0.84) / aspect);
      rest.x = v.w * 0.21; rest.y = -v.h * 0.02; rest.s = s;
    }
    paper.scale.setScalar(rest.s);
    if (phase === 'paper' || phase === 'end') paper.position.set(rest.x, rest.y, 0);
    halo.position.set(rest.x, rest.y, -0.5);
    halo.scale.setScalar(rest.s * 1.9);
    rising.mesh.position.set(rest.x, rest.y + rest.s * aspect * 0.2, 0.4);
    rising.uniforms.uBox.value.set(rest.s * 0.9, rest.s * aspect * 1.3, 2);
    petals.uniforms.uBox.value.set(v.w * 1.1, v.h * 1.2, 10);
    placeHeart();
  };
  let constellation = null;
  const placeHeart = () => {
    if (!constellation) return;
    const D = 74, tan = Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
    const vh = 2 * D * tan, vw = vh * ctx.aspect;
    const portrait = ctx.aspect < 1;
    const p = CAM.clone(); p.z += D;
    if (portrait) {
      const s = Math.min(vw * 0.76, vh * 0.3) / 22;
      p.y += vh * 0.3;
      constellation.placeHeart(p, s);
    } else {
      const s = Math.min(vw * 0.42, vh * 0.72) / 22;
      p.x += vw * 0.23; // looking along +z, world +x is screen left
      constellation.placeHeart(p, s);
    }
  };

  let phase = 'hidden', timeline = null, settled = false;
  const ptr = new THREE.Vector3();
  const showEnding = () => {
    phase = 'end';
    ctx.flash(0.3, 2.4);
    gsap.to(pen.material, { opacity: 0, duration: 1 });
    rising.show(true, 2.5);
    gsap.to(halo.material, { opacity: 0.3, duration: 3 });
    ui.replay(true, () => ctx.story.replay());
  };
  // Where on the paper the ink is appearing right now
  const penPos = new THREE.Vector3();
  const movePen = () => {
    const r = paperU.uReveal.value;
    const st = strokes.find((b) => r >= b.t0 && r <= b.t1);
    if (!st) { pen.material.opacity += (0 - pen.material.opacity) * 0.2; return; }
    const f = (r - st.t0) / Math.max(1e-4, st.t1 - st.t0);
    penPos.set((st.x0 + (st.x1 - st.x0) * f - 0.5), (0.5 - st.y) * aspect, 0.02);
    paper.localToWorld(penPos);
    group.worldToLocal(penPos);
    pen.position.copy(penPos);
    pen.material.opacity += (0.85 - pen.material.opacity) * 0.25;
  };
  const revealLetter = () => {
    phase = 'paper';
    timeline?.kill();
    gsap.to(textU.uFade, { value: 0, duration: reduced ? 0.8 : 1.5, ease: 'sine.in', onComplete() { text.visible = false; } });
    paper.visible = true;
    paper.position.set(rest.x, rest.y - (reduced ? 0 : 1.8), reduced ? 0 : -16);
    if (!reduced) paper.rotation.set(0.32, -0.22, 0.05);
    gsap.to(paper.position, { x: rest.x, y: rest.y, z: 0, duration: reduced ? 0.1 : 3, ease: 'power2.out', delay: 0.5 });
    gsap.to(paper.rotation, { x: 0, y: 0, z: 0, duration: 3.2, ease: 'power2.out', delay: 0.5, onComplete() { settled = true; } });
    gsap.to(paperU.uShow, { value: 1, duration: 1.8, delay: 0.5 });
    gsap.to(halo.material, { opacity: 0.2, duration: 2.6, delay: 0.9 });
    gsap.to(dustU.uOn, { value: 1, duration: 4, delay: 0.5 });
    petals.show(true, 4);
    if (constellation) gsap.to(constellation, { visibility: 1, duration: 4, delay: 1, ease: 'sine.inOut' });
    ui.srLetter([...cfg.lines, cfg.signature].join(' '));
    timeline = gsap.timeline({ delay: reduced ? 1 : 3 });
    timeline.to(paperU.uReveal, { value: 1, duration: seconds * (reduced ? 0.7 : 1), ease: 'none', onComplete: showEnding });
  };

  const inst = {
    group, keep: false, parallax: 0.3,
    station() {
      return { pos: CAM.clone(), look: LOOK.clone(), via: [new THREE.Vector3(-46, -3, -226), new THREE.Vector3(-30, 6, -252)], dur: 6.5, roll: -0.12, ease: 'sine.inOut' };
    },
    async prepare() {
      constellation = await ctx.story.get(1);
      constellation.visibility = 0;
      layout();
    },
    async jumpIn() { constellation = await ctx.story.get(1); constellation.finish(); constellation.visibility = 0; layout(); },
    enter() {
      phase = 'text';
      layout();
      const morphTo = (setIndex) => {
        const tl = gsap.timeline();
        tl.call(() => {
          // what is on screen now becomes the start, the next word becomes the target
          A.set(B); attrA.needsUpdate = true;
          putName(B, nameSets[setIndex]); attrB.needsUpdate = true;
          textU.uMix.value = 0;
        });
        tl.to(textU.uMix, { value: 1, duration: reduced ? 1.4 : 2.6, ease: 'sine.inOut' });
        return tl;
      };
      timeline = gsap.timeline({ onComplete: revealLetter });
      timeline.to(textU.uAssemble, { value: 1, duration: reduced ? 1.6 : 4.6, ease: reduced ? 'sine.inOut' : 'power1.inOut' });
      timeline.to({}, { duration: 2.1 });
      timeline.add(morphTo(1)); timeline.to({}, { duration: 1.6 });
      timeline.add(morphTo(2)); timeline.to({}, { duration: 1.6 });
      timeline.add(morphTo(0)); timeline.to({}, { duration: 2.1 });
    },
    beat() {
      if (phase === 'text') { if (textU.uAssemble.value > 0.6) revealLetter(); }
      else if (phase === 'paper') { timeline?.kill(); paperU.uReveal.value = 1; showEnding(); }
    },
    onResize() { const s = inst.station(); ctx.setRig(s.pos, s.look); layout(); },
    update(t, dt) {
      if (phase === 'text' && !reduced) group.rotation.y = Math.PI + Math.sin(t * 0.32) * 0.05;
      else if (phase !== 'hidden') group.rotation.y += (Math.PI - group.rotation.y) * 0.03;
      if (phase === 'paper') movePen();
      // Her finger (or cursor) in the plane of the words
      const P = ctx.pointer;
      const on = phase === 'text' && P.active && !!ctx.hitPlaneZ(P.x, P.y, group.position.z, ptr);
      if (on) textU.uPtr.value.copy(group.worldToLocal(ptr));
      textU.uPtrOn.value += ((on ? 1 : 0) - textU.uPtrOn.value) * Math.min(1, dt * (on ? 10 : 3));
      // Once it has come to rest, the page turns a few degrees toward wherever she is pointing
      if (settled && !reduced) {
        const k = P.mouse && P.active ? 1 : 0;
        paper.rotation.y += (-P.nx * 0.13 * k - paper.rotation.y) * Math.min(1, dt * 4);
        paper.rotation.x += (-P.ny * 0.08 * k - paper.rotation.x) * Math.min(1, dt * 4);
      }
      if (phase !== 'hidden') { const m = ctx.uniforms.uMusic.value; halo.scale.setScalar(rest.s * (1.9 + m * 0.12)); }
      petals.update(dt); rising.update(dt);
    },
    dispose() { timeline?.kill(); petals.dispose(); rising.dispose(); disposeGroup(group); },
  };
  return inst;
}
