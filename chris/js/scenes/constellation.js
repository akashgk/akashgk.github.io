import * as THREE from 'three';
import { disposeGroup, glowTexture, heroStar, seeded, GOLD, heartAt, heartTheta } from '../util.js';
import { createDrift, createMotes, createNebula, createRipple } from '../fx.js';

const CENTER = new THREE.Vector3(0, 18, -95);
// Hand-placed for ten stars. Note how far apart stars 7 and 8 sit: that gap is the distance.
// Any other count is spread along the same zigzag.
const PLACED = [[-3.4, -13, 1.5], [2.8, -11, -1], [-3.9, -8.3, 2], [3.5, -5.7, 0], [-2.7, -3.1, 1], [4.3, -0.5, -1], [-5.2, 2.5, -2], [4.8, 6.6, 1], [-1.9, 9.2, 0.5], [1.2, 11.6, 0]];
const layoutFor = (n) => n === PLACED.length ? PLACED
  : Array.from({ length: n }, (_, i) => [(i % 2 ? 1 : -1) * (3 + 1.5 * Math.sin(i * 2.3)), -13 + (24.6 * i) / Math.max(1, n - 1), Math.sin(i * 1.7) * 1.5]);

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
  const hearts = home.map((_, i) => heartAt(heartTheta(i / count)));

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
    heartAt(heartTheta(hs), h);
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
        // glints of light travelling along the thread, like a pulse down a wire
        float glint = pow(max(0., sin(t * 28. - uTime * 2.4 + seed * .3)), 48.) * vis * (1. - m) * 2.2;
        float ring = pow(max(0., sin(mod(t, 1.) * 6.283 * 2. - uTime * 1.6)), 30.) * m * (.6 + uBeat * 1.2);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float sparkle = .75 + .25 * sin(uTime * (1. + seed * 2.) + seed * 70.);
        gl_PointSize = uPx * clamp((1.2 + aInfo.z * .9 + head * 3. + glint * .8 + ring * .6) * (46. / max(8., -mv.z)), 1.45, 5.5);
        gl_Position = projectionMatrix * mv;
        vec3 gold = vec3(1., .66, .24), rose = vec3(1., .3, .46);
        vColor = mix(gold, mix(rose, gold, seed * .55), m) * (1.15 + head * 4. + uBeat * .5 + glint + ring) * sparkle;
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
  let pullWant = 0, pullK = 0, turnWant = 0, turn = 0, thump = 0;
  const glow = { halo: 0 };
  const hit = new THREE.Vector3();
  const worldStar = (i) => group.localToWorld(stars[i].position.clone());
  // The same star with the sky turned back to rest: what the camera flies to, since the turn always settles.
  const restStar = (i) => stars[i].position.clone().multiplyScalar(group.scale.x).add(group.position);

  // A veil of nebula far behind the stars
  const nebula = createNebula(ctx, { width: 120, height: 80, strength: reduced ? 0.5 : 0.8, seed: 4.1 });
  nebula.mesh.position.set(0, 2, -34);
  group.add(nebula.mesh);
  // A ring of light that spreads from each star as it wakes
  const ripple = createRipple(ctx, { color: [1, 0.78, 0.42], size: 1 });
  ctx.scene.add(ripple.mesh);
  // Dust that gathers round the star whose card is open
  const motes = createMotes(ctx, { count: Math.floor(34 * Math.max(0.5, ctx.particles)), radius: 1.25, height: 0.7, speed: reduced ? 0.3 : 1.3, size: 0.7, seed: 17 });
  ctx.scene.add(motes.points);
  // The finished heart: a rose glow behind it, and tiny hearts falling from its outline
  const halo = heroStar(tex, new THREE.Color('#ff6f95'), 0);
  halo.scale.setScalar(30);
  halo.position.set(0, 0.5, -3);
  group.add(halo);
  const rimPts = Array.from({ length: 40 }, (_, i) => heartAt(heartTheta(i / 40)));
  const rain = createDrift(ctx, { count: Math.floor((reduced ? 40 : 90) * Math.max(0.5, ctx.particles)), kind: 'heart', size: 0.42,
    colors: ['#ff8fae', '#f2c879', '#ffb9cb', '#ff6f95'], sources: rimPts, fall: reduced ? 0.25 : 0.7, sway: 0.8, spin: 0.5, seed: 33, lit: 0.75 });
  group.add(rain.mesh);

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
    tl.call(() => ripple.fire(worldStar(k), 1.8), null, '<');
    tl.to(s.userData, { size: 4.6, duration: 1.2, ease: 'power2.out' }, '<');
    lit = k + 1;
  };

  // Where the camera sits to read star i's card: close in, star above (portrait) or left (landscape).
  const cardView = (i) => {
    const p = restStar(i);
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
      motes.points.position.copy(worldStar(i)); motes.show(true, 1.5);
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
    motes.show(false, 0.6);
    gsap.to(stars[k].material, { opacity: 1, duration: 0.9, delay: dur * 0.55, ease: 'sine.out' });
    gsap.delayedCall(dur * 0.6, () => ripple.fire(worldStar(k), 1.8));
    stars[k].userData.size = 0.4;
    gsap.to(stars[k].userData, { size: 1.45, duration: 1.1, delay: dur * 0.55, ease: 'power2.out' });
    gsap.to(stars[i].userData, { size: 1.2, duration: dur, ease: 'sine.inOut' });
    ctx.flyTo({ ...to, via: reduced ? [] : [via], dur, ease: 'power2.inOut' }).then(() => {
      state = 'card';
      ui.showCard(milestones[k], cardHint(k));
      motes.points.position.copy(worldStar(k)); motes.show(true, 1.5);
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
      onComplete() {
        state = 'heart'; inst.done = true; ctx.story.showNext();
        ctx.flash(0.45, 2.2); thump = 1; ctx.buzz(14);
        ripple.fire(group.localToWorld(new THREE.Vector3(0, 0.5, 0)), 2.4);
        gsap.to(glow, { halo: 0.2, duration: 3, ease: 'sine.inOut' });
        rain.show(true, 3);
      },
    });
    const s = overview();
    ctx.flyTo({ ...s, dur: reduced ? 1 : 3.4, ease: 'sine.inOut' });
  };

  // After the last card: back out to the whole sky, and the path becomes a heart.
  const closeCard = () => {
    state = 'flying';
    ui.hideCard();
    motes.show(false, 0.6);
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
      nebula.show(true, 4);
      ui.title(title, 'quiet');
      gsap.delayedCall(4.4, () => ui.title(null));
      if (lit === 0) lightStar(0, true);
    },
    beat() {
      if (state === 'await') openCard(lit - 1);
      else if (state === 'card') { if (lit < count) nextCard(); else closeCard(); }
    },
    pull(p) { pullWant = Math.max(0, p); },
    // From far away the whole sky turns a little under her finger, then settles back.
    drag(dx) {
      if (state !== 'await' && state !== 'heart' && state !== 'lighting') return;
      turnWant = THREE.MathUtils.clamp(turnWant + dx * 0.0042, -0.62, 0.62);
    },
    // Touch the heart and it beats. Touch the waiting star and it answers.
    tap(x, y) {
      if (state === 'heart') {
        thump = 1; ctx.buzz(10);
        const p = ctx.hitPlaneZ(x, y, group.position.z, hit);
        ripple.fire(p || group.position, 1.5);
      } else if (state === 'await') {
        const p = worldStar(lit - 1), q = ctx.project(p);
        if (Math.hypot(q.x - x, q.y - y) < 90) { ripple.fire(p, 1.3); ctx.buzz(6); }
      }
    },
    left() { group.visible = false; motes.points.visible = false; ripple.mesh.visible = false; turn = turnWant = 0; group.rotation.y = 0; state = 'gone'; },
    onResize() {
      if (state === 'await' || state === 'heart') { const s = overview(); ctx.setRig(s.pos, s.look); }
      else if (state === 'card') { const v = cardView(openIndex); ctx.setRig(v.pos, v.look); }
    },
    update(t, dt) {
      pullK += (pullWant - pullK) * Math.min(1, dt * (pullWant > pullK ? 16 : 6));
      stars.forEach((s, i) => {
        // the waiting star swells toward her as she scrolls for it
        const pulse = state === 'await' && i === lit - 1 ? 1 + (reduced ? 0 : Math.sin(t * 2.4) * 0.17) + pullK * 0.55 : 1;
        s.scale.setScalar(s.userData.size * pulse);
      });
      // With a card open, the thread creeps out toward the next star under her finger before it commits.
      if (state === 'card' && lit < count) U.uDraw.value = (lit - 1 + pullK * 0.3) / (count - 1);
      if (state !== 'gone') {
        turnWant *= state === 'card' || state === 'flying' || state === 'morph' ? 0 : Math.pow(0.25, dt);
        turn += (turnWant - turn) * Math.min(1, dt * 7);
        group.rotation.y = turn;
      }
      thump *= Math.pow(0.02, dt);
      if (morphed) {
        // the heart beats with the music, and once more whenever she touches it
        const m = Math.min(1.6, (reduced ? 0 : ctx.uniforms.uMusic.value) + thump * 1.5);
        U.uBeat.value = m;
        halo.scale.setScalar(30 + m * 4);
        halo.material.opacity = glow.halo * U.uVis.value * (0.8 + m * 0.4);
      }
      rain.update(dt);
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
      glow.halo = 0.2; rain.show(true, 0.1);
    },
    /** 0..1: how present the whole constellation is. */
    get visibility() { return U.uVis.value; },
    set visibility(v) {
      U.uVis.value = v;
      stars.forEach((s) => { s.material.opacity = v; });
      rain.uniforms.uOn.value = v; rain.mesh.visible = v > 0.001;
      nebula.uniforms.uOn.value = v * 0.7;
    },
    /** For the ending: hang the heart somewhere in the sky behind the letter. */
    placeHeart(worldPos, scale) {
      group.position.copy(worldPos);
      group.scale.setScalar(scale);
      group.visible = true;
    },
    dispose() { nebula.dispose(); ripple.dispose(); ripple.mesh.removeFromParent(); motes.dispose(); motes.points.removeFromParent(); rain.dispose(); disposeGroup(group); tex.dispose(); },
  };
  return inst;
}
