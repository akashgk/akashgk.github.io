import * as THREE from 'three';
import { disposeGroup, glowTexture, heroStar, seeded, GOLD } from '../util.js';

const CENTER = new THREE.Vector3(0, 18, -95);
// Hand-placed for ten stars. Note how far apart stars 7 and 8 sit: that gap is the distance.
// Any other count is spread along the same zigzag.
const PLACED = [[-3.4, -13, 1.5], [2.8, -11, -1], [-3.9, -8.3, 2], [3.5, -5.7, 0], [-2.7, -3.1, 1], [4.3, -0.5, -1], [-5.2, 2.5, -2], [4.8, 6.6, 1], [-1.9, 9.2, 0.5], [1.2, 11.6, 0]];
const layoutFor = (n) => n === PLACED.length ? PLACED
  : Array.from({ length: n }, (_, i) => [(i % 2 ? 1 : -1) * (3 + 1.5 * Math.sin(i * 2.3)), -13 + (24.6 * i) / Math.max(1, n - 1), Math.sin(i * 1.7) * 1.5]);

const heartAt = (theta, out = new THREE.Vector3()) => {
  const k = 11 / 16, s = Math.sin(theta), c = Math.cos(theta);
  return out.set(16 * s * s * s * k, (13 * c - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta) + 2.5) * k, 0);
};

// Even spacing along the outline, so the stars do not bunch up in the dip of the heart.
const ARC = (() => {
  const n = 480, table = [0], p = new THREE.Vector3(), q = new THREE.Vector3();
  heartAt(Math.PI, q);
  for (let i = 1; i <= n; i++) { heartAt(Math.PI + (i / n) * Math.PI * 2, p); table.push(table[i - 1] + p.distanceTo(q)); q.copy(p); }
  return { n, table, total: table[n] };
})();
const thetaFor = (s) => {
  const want = s * ARC.total;
  let lo = 0, hi = ARC.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ARC.table[m] < want) lo = m; else hi = m; }
  const f = (want - ARC.table[lo]) / Math.max(1e-6, ARC.table[hi] - ARC.table[lo]);
  return Math.PI + ((lo + f) / ARC.n) * Math.PI * 2;
};

export function createConstellation(ctx) {
  const { gsap, ui, content, reduced } = ctx;
  const { milestones, title, hintFirst, hintNext, hintCard } = content.story;
  const count = milestones.length;
  const group = new THREE.Group();
  group.name = 'constellation';
  group.position.copy(CENTER);
  group.visible = false;
  ctx.scene.add(group);

  const xf = ctx.aspect < 1 ? 1 : Math.min(1.9, 0.9 + ctx.aspect * 0.55);
  const home = layoutFor(count).map(([x, y, z]) => new THREE.Vector3(x * xf, y, z));
  const hearts = home.map((_, i) => heartAt(thetaFor(i / count)));

  // ---- the thread: stardust laid along the path, already knowing where it goes in the heart ----
  const N = Math.floor(1700 * Math.max(0.55, ctx.particles));
  const closing = Math.floor(N / count); // kept hidden until the heart needs closing
  const rng = seeded(1502);
  const pos = new Float32Array(N * 3), heart = new Float32Array(N * 3), info = new Float32Array(N * 3), scatter = new Float32Array(N * 3);
  const a = new THREE.Vector3(), h = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const main = i < N - closing;
    const u = main ? i / (N - closing - 1) : 1;
    const f = u * (count - 1), seg = Math.min(count - 2, Math.floor(f)), fr = f - seg;
    a.lerpVectors(home[seg], home[seg + 1], fr);
    const j = 0.05;
    pos.set([a.x + (rng() - 0.5) * j, a.y + (rng() - 0.5) * j, a.z + (rng() - 0.5) * j], i * 3);
    const hs = main ? (seg + fr) / count : (count - 1 + (i - (N - closing)) / closing) / count;
    heartAt(thetaFor(hs), h);
    heart.set([h.x, h.y, h.z + (rng() - 0.5) * 0.3], i * 3);
    info.set([main ? u : 2, rng(), rng()], i * 3);
    scatter.set([rng() - 0.5, rng() - 0.5, rng() - 0.5], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aHeart', new THREE.BufferAttribute(heart, 3));
  geo.setAttribute('aInfo', new THREE.BufferAttribute(info, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  const U = { uDraw: { value: 0 }, uMorph: { value: 0 }, uBeat: { value: 0 }, uVis: { value: 1 }, uTime: ctx.uniforms.uTime, uPx: ctx.uniforms.uPx };
  const thread = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec3 aHeart, aInfo, aScatter;
      uniform float uDraw, uMorph, uBeat, uVis, uTime, uPx;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float t = aInfo.x, seed = aInfo.y;
        float m = clamp(uMorph * 1.45 - seed * .45, 0., 1.);
        m = m * m * (3. - 2. * m);
        vec3 p = mix(position, aHeart, m) + aScatter * sin(m * 3.14159) * 5.;
        p.xy *= 1. + uBeat * .035;
        p += aScatter * .07 * m * sin(uTime * (.6 + seed) + seed * 40.);
        float head = t <= 1. ? exp(-abs(t - uDraw) * 70.) * step(t, uDraw + .001) : 0.;
        float vis = t <= 1. ? smoothstep(uDraw + .002, uDraw - .004, t) : smoothstep(.25, .7, uMorph);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float sparkle = .75 + .25 * sin(uTime * (1. + seed * 2.) + seed * 70.);
        gl_PointSize = uPx * clamp((1.2 + aInfo.z * .9 + head * 3.) * (46. / max(8., -mv.z)), 1.45, 5.);
        gl_Position = projectionMatrix * mv;
        vec3 gold = vec3(1., .66, .24), rose = vec3(1., .3, .46);
        vColor = mix(gold, mix(rose, gold, seed * .55), m) * (1.15 + head * 4. + uBeat * .5) * sparkle;
        vAlpha = vis * .95 * uVis;
      }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5,.05,d); a *= a * vAlpha; if (a < .003) discard; gl_FragColor = vec4(vColor * a, a); }`,
  }));
  thread.frustumCulled = false;
  group.add(thread);

  // ---- the seven stars ----
  const tex = glowTexture(128, true);
  const stars = home.map((p) => {
    const s = heroStar(tex, GOLD.clone().lerp(new THREE.Color(0xffffff), 0.35), 0.12);
    s.position.copy(p);
    s.scale.setScalar(1.3);
    s.userData.size = 1.3;
    group.add(s);
    return s;
  });
  let state = 'hidden', lit = 0, openIndex = -1, morphed = false;
  const worldStar = (i) => group.localToWorld(stars[i].position.clone());

  const overview = () => {
    const d = morphed ? ctx.fit(27, 28) : ctx.fit(18.5 * xf, 38);
    return { pos: CENTER.clone().add(new THREE.Vector3(0, 0, d)), look: CENTER.clone() };
  };

  const lightStar = (k, first) => {
    state = 'lighting';
    const s = stars[k];
    const tl = gsap.timeline({ onComplete() { state = 'await'; ui.hint(first ? hintFirst : hintNext); } });
    if (k > 0) tl.to(U.uDraw, { value: k / (count - 1), duration: reduced ? 1 : 2.1, ease: 'sine.inOut' });
    tl.to(s.material, { opacity: 1, duration: 1, ease: 'sine.out' }, k > 0 ? '-=.35' : 0.2);
    tl.to(s.userData, { size: 4.6, duration: 1.2, ease: 'power2.out' }, '<');
    lit = k + 1;
  };

  // Where the camera sits to read star i's card: close in, star above (portrait) or left (landscape).
  const cardView = (i) => {
    const p = worldStar(i);
    const dist = 9, v = ctx.viewAt(dist);
    const wide = ctx.aspect >= 1;
    const look = p.clone().add(new THREE.Vector3(wide ? v.w * 0.2 : 0, wide ? 0 : -v.h * 0.29, 0));
    const pos = look.clone(); pos.z += dist;
    return { pos, look };
  };
  const cardHint = (i) => (i < count - 1 ? hintNext : hintCard);

  const openCard = (i) => {
    state = 'flying'; openIndex = i;
    ui.hint(null); ui.title(null);
    ctx.flyTo({ ...cardView(i), dur: 1.9, ease: 'power2.inOut' }).then(() => {
      state = 'card';
      ui.showCard(milestones[i], cardHint(i));
    });
    gsap.to(stars[i].userData, { size: 1.45, duration: 1.4, ease: 'sine.inOut' });
  };

  // One scroll from a card: the thread draws on to the next star while the camera follows it.
  const nextCard = () => {
    const i = openIndex, k = lit;
    state = 'flying';
    ui.hideCard();
    lit = k + 1; openIndex = k;
    const to = cardView(k), from = ctx.rig.pos.clone();
    const via = from.clone().lerp(to.pos, 0.5); via.z += 5;
    const dur = reduced ? 1.4 : 2.7;
    gsap.to(U.uDraw, { value: k / (count - 1), duration: dur * 0.85, ease: 'sine.inOut' });
    gsap.to(stars[k].material, { opacity: 1, duration: 0.9, delay: dur * 0.55, ease: 'sine.out' });
    stars[k].userData.size = 0.4;
    gsap.to(stars[k].userData, { size: 1.45, duration: 1.1, delay: dur * 0.55, ease: 'power2.out' });
    gsap.to(stars[i].userData, { size: 1.2, duration: dur, ease: 'sine.inOut' });
    ctx.flyTo({ ...to, via: reduced ? [] : [via], dur, ease: 'power2.inOut' }).then(() => {
      state = 'card';
      ui.showCard(milestones[k], cardHint(k));
    });
  };

  const morph = () => {
    state = 'morph'; morphed = true;
    const dur = reduced ? 2.5 : 5;
    U.uDraw.value = 1;
    stars.forEach((s, i) => {
      gsap.to(s.position, { x: hearts[i].x, y: hearts[i].y, z: 0, duration: dur, ease: 'sine.inOut', delay: reduced ? 0 : i * 0.06 });
      gsap.to(s.userData, { size: 3, duration: dur, ease: 'sine.inOut' });
    });
    gsap.to(U.uMorph, {
      value: 1, duration: dur, ease: 'sine.inOut',
      onComplete() { state = 'heart'; inst.done = true; ctx.story.showNext(); },
    });
    const s = overview();
    ctx.flyTo({ ...s, dur: reduced ? 1 : 3.4, ease: 'sine.inOut' });
  };

  // After the last card: back out to the whole sky, and the path becomes a heart.
  const closeCard = () => {
    state = 'flying';
    ui.hideCard();
    for (let j = 0; j < lit; j++) gsap.to(stars[j].userData, { size: 4.6, duration: 1.4, ease: 'sine.inOut' });
    ctx.flyTo({ ...overview(), dur: 1.9, ease: 'power2.inOut' }).then(() => {
      openIndex = -1;
      morph();
    });
  };

  const inst = {
    group, keep: true, done: false,
    station() { return { ...overview(), via: [new THREE.Vector3(-7, 8, -22), new THREE.Vector3(5, 15, -52)], dur: 6, roll: 0.1 }; },
    prepare() { milestones.forEach((m) => ui.preloadPhoto(m.photo)); },
    enter() {
      inst.prepare();
      ui.title(title, 'quiet');
      gsap.delayedCall(4.4, () => ui.title(null));
      if (lit === 0) lightStar(0, true);
    },
    beat() {
      if (state === 'await') openCard(lit - 1);
      else if (state === 'card') { if (lit < count) nextCard(); else closeCard(); }
    },
    left() { group.visible = false; },
    onResize() {
      if (state === 'await' || state === 'heart') { const s = overview(); ctx.setRig(s.pos, s.look); }
      else if (state === 'card') { const v = cardView(openIndex); ctx.setRig(v.pos, v.look); }
    },
    update(t) {
      stars.forEach((s, i) => {
        const pulse = state === 'await' && i === lit - 1 && !reduced ? 1 + Math.sin(t * 2.4) * 0.17 : 1;
        s.scale.setScalar(s.userData.size * pulse);
      });
      if (morphed) {
        const beat = (t * 0.75) % 1;
        U.uBeat.value = reduced ? 0 : Math.exp(-beat * 9) + Math.exp(-Math.max(0, beat - 0.2) * 9) * (beat > 0.2 ? 0.6 : 0);
      }
      if (state === 'card' && openIndex >= 0) {
        const q = ctx.project(worldStar(openIndex));
        ui.leader(q.x, q.y);
      }
    },
    /** Skip to the finished heart. */
    finish() {
      lit = count; morphed = true; state = 'heart'; inst.done = true;
      U.uDraw.value = 1; U.uMorph.value = 1;
      stars.forEach((s, i) => { s.position.copy(hearts[i]); s.material.opacity = 1; s.userData.size = 3; });
    },
    /** 0..1: how present the whole constellation is. */
    get visibility() { return U.uVis.value; },
    set visibility(v) {
      U.uVis.value = v;
      stars.forEach((s) => { s.material.opacity = v; });
    },
    /** For the ending: hang the heart somewhere in the sky behind the letter. */
    placeHeart(worldPos, scale) {
      group.position.copy(worldPos);
      group.scale.setScalar(scale);
      group.visible = true;
    },
    dispose() { disposeGroup(group); tex.dispose(); },
  };
  return inst;
}
