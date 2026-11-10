import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createStars } from './stars.js';
import { createGift } from './scenes/gift.js';
import { canvasTexture, seeded } from './util.js';
import { createShootingStars } from './fx.js';

const DEBUG = new URLSearchParams(location.search);
const IS_DEBUG = DEBUG.has('debug');

function detectTier() {
  const ua = navigator.userAgent;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && coarse);
  const android = /Android/.test(ua);
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  let tier = 2;
  if (android) tier = mem >= 8 && cores >= 8 ? 2 : mem >= 4 && cores >= 6 ? 1 : 0;
  else if (ios) tier = 2;
  else if (coarse) tier = 1;
  const forced = DEBUG.get('tier');
  return forced !== null && forced !== '' ? +forced : tier;
}

const TIERS = [
  { dpr: 1.25, stars: 2800, msaa: 0, bloom: 0.4, particles: 0.45 },
  { dpr: 1.7, stars: 5200, msaa: 2, bloom: 0.5, particles: 0.7 },
  { dpr: 2, stars: 9000, msaa: 4, bloom: 0.5, particles: 1 },
];

const GRADE = {
  uniforms: { tDiffuse: { value: null }, uFade: { value: 0 }, uExposure: { value: 1 }, uTime: { value: 0 }, uWarm: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uFade, uExposure, uTime, uWarm; varying vec2 vUv;
    vec3 tone(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
    vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(.41667)) - .055, step(.0031308, c)); }
    void main() {
      vec2 q = vUv - .5;
      // a whisper of lens colour fringing toward the edges, the way a real glass would
      vec2 off = q * dot(q, q) * .012;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      c *= uExposure * uFade;
      c *= 1. - dot(q, q) * .6;
      // the faintest warm lift in the shadows, so the night never goes dead grey
      c += vec3(.012, .006, .004) * (1. - dot(q, q)) * uFade * (1. + uWarm);
      c = srgb(tone(c));
      float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
      gl_FragColor = vec4(c + (n - .5) / 255., 1.);
    }`,
};

// Value noise on a small grid: enough to paint a Milky Way once, at load, in a few milliseconds.
function noiseField(w, h, seed, octaves = 4, gw = 40, gh = 20) {
  const rng = seeded(seed);
  const grid = Float32Array.from({ length: (gw + 1) * (gh + 1) }, () => rng());
  const at = (x, y, sx, sy) => {
    const fx = (x / w) * gw * sx, fy = (y / h) * gh * sy;
    const ix = Math.floor(fx) % gw, iy = Math.floor(fy) % gh, tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
    const sxx = tx * tx * (3 - 2 * tx), syy = ty * ty * (3 - 2 * ty);
    const g = (a, b) => grid[((b % (gh + 1)) * (gw + 1)) + (a % (gw + 1))];
    return (g(ix, iy) * (1 - sxx) + g(ix + 1, iy) * sxx) * (1 - syy) + (g(ix, iy + 1) * (1 - sxx) + g(ix + 1, iy + 1) * sxx) * syy;
  };
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0, amp = 0.5, sc = 1;
    for (let o = 0; o < octaves; o++) { v += at(x, y, sc, sc) * amp; amp *= 0.5; sc *= 2.1; }
    out[y * w + x] = v;
  }
  return out;
}

function makeSky() {
  const w = 1024, h = 512;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#02030a'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  const blob = (x, y, r, col, a) => {
    for (const ox of [-w, 0, w]) {
      const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, r);
      gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(0.55, col.replace('A', a * 0.36)); gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  };
  blob(250, 240, 300, 'rgba(18,28,84,A)', 0.4);
  blob(310, 190, 150, 'rgba(96,34,78,A)', 0.12);
  blob(760, 280, 330, 'rgba(16,24,78,A)', 0.4);
  blob(700, 200, 170, 'rgba(110,40,84,A)', 0.13);
  blob(520, 360, 240, 'rgba(48,26,80,A)', 0.13);
  blob(40, 330, 240, 'rgba(36,24,70,A)', 0.15);

  // The Milky Way: a tilted band of cloud with dark dust lanes, painted from noise.
  const nw = 256, nh = 128;
  const n1 = noiseField(nw, nh, 11, 5), n2 = noiseField(nw, nh, 29, 5, 56, 28);
  const img = g.createImageData(nw, nh), d = img.data;
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const u = x / nw, v = y / nh;
    const band = Math.exp(-Math.pow((v - (0.47 + Math.sin(u * Math.PI * 2) * 0.1)) * 4.6, 2));
    const i = y * nw + x;
    const cloud = Math.max(0, n1[i] - 0.36) * 2.2 * band;
    const dust = Math.pow(Math.max(0, n2[i] - 0.5) * 2.2, 1.4) * band;
    const k = Math.max(0, cloud - dust * 0.9);
    const warm = n2[i];
    // rose and amber where the cloud is dense, deep blue at its edges
    d[i * 4] = Math.round((150 * warm + 40) * k + 20 * (1 - warm) * k);
    d[i * 4 + 1] = Math.round((70 * warm + 40) * k);
    d[i * 4 + 2] = Math.round((60 * warm + 120 * (1 - warm) + 30) * k);
    d[i * 4 + 3] = Math.round(Math.min(1, k) * 115);
  }
  const small = document.createElement('canvas'); small.width = nw; small.height = nh;
  small.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.globalAlpha = 0.85;
  g.drawImage(small, 0, 0, w, h);
  g.globalAlpha = 1;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 24),
    new THREE.MeshBasicMaterial({ map: canvasTexture(c), side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
  mesh.rotation.z = 0.42;
  mesh.rotation.x = 0.2;
  mesh.renderOrder = -10;
  return mesh;
}

function makeEnvironment(renderer) {
  // A tiny painted studio, so that gold and icing have something to reflect. No HDR download.
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x060818);
  const panel = (color, x, y, z, sx, sy, k = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel('#ffd9a0', 5, 7, 5, 6, 6, 9);
  panel('#ff8fb0', -8, 2, 3, 6, 9, 4);
  panel('#7f9cff', 6, -2, -7, 8, 6, 2.5);
  panel('#fff1dd', 0, 9, -5, 8, 3, 3);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  return rt.texture;
}

const LOADERS = [
  () => Promise.resolve(createGift),
  () => import('./scenes/constellation.js').then((m) => m.createConstellation),
  () => import('./scenes/globe.js').then((m) => m.createGlobe),
  () => import('./scenes/cake.js').then((m) => m.createCake),
  () => import('./scenes/letter.js').then((m) => m.createLetter),
];

export async function startWorld({ content, ui, gestures, music, reduced, onFatal }) {
  const canvas = document.getElementById('gl');
  const tierIndex = detectTier();
  const tier = TIERS[tierIndex];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x04050f, 1);

  let dpr = Math.min(devicePixelRatio || 1, tier.dpr);
  let W = innerWidth, H = innerHeight;
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);

  const scene = new THREE.Scene();
  scene.environment = makeEnvironment(renderer);
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1500);
  const sky = makeSky();
  scene.add(sky);

  // A fixed rig, moved around rather than added and removed: changing the light count
  // would recompile every lit material in the middle of a flight.
  const lights = {
    hemi: new THREE.HemisphereLight(0x8fa2ff, 0x3a2030, 0.55),
    key: new THREE.DirectionalLight(0xffe2c0, 1.5),
    a: new THREE.PointLight(0xffb066, 0, 22, 1.7),
    b: new THREE.PointLight(0xffb066, 0, 22, 1.7),
  };
  lights.key.position.set(4, 9, 7);
  scene.add(lights.hemi, lights.key, lights.key.target, lights.a, lights.b);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W * dpr, H * dpr, { type: THREE.HalfFloatType, samples: tier.msaa }));
  composer.setPixelRatio(dpr);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  let bloomScale = tier.bloom;
  const bloom = new UnrealBloomPass(new THREE.Vector2(W * dpr * bloomScale, H * dpr * bloomScale), 0.62, 0.55, 0.78);
  const bloomSetSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w, h) => bloomSetSize(Math.ceil(w * bloomScale), Math.ceil(h * bloomScale));
  composer.addPass(bloom);
  const grade = new ShaderPass(GRADE);
  composer.addPass(grade);

  // Point sizes never drop below 1.6 device pixels, or particles vanish on 1x screens.
  const pointScale = () => Math.max(dpr, 1.6);
  const uniforms = { uTime: { value: 0 }, uPx: { value: pointScale() }, uMusic: { value: 0 } };
  const tan = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  const ctx = {
    scene, camera, renderer, reduced, content, ui, music, gestures, lights, uniforms, gsap, bloom,
    tierIndex, tier, particles: tier.particles * (reduced ? 0.6 : 1),
    get aspect() { return camera.aspect; },
    get portrait() { return camera.aspect < 1; },
    get width() { return W; },
    get height() { return H; },
    /** Camera distance at which a w by h rectangle just fits on screen. */
    fit(w, h) { return Math.max(h / (2 * tan()), w / (2 * tan() * camera.aspect)); },
    viewAt(d) { const h = 2 * d * tan(); return { w: h * camera.aspect, h }; },
    project(v) {
      const p = v.clone().project(camera);
      return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, behind: p.z > 1 };
    },
    fade(to, dur = 1, ease = 'sine.inOut') {
      return new Promise((resolve) => gsap.to(grade.uniforms.uFade, { value: to, duration: dur, ease, onComplete: resolve }));
    },
  };

  ctx.stars = createStars(ctx, Math.floor(tier.stars * (reduced ? 0.7 : 1)));
  const shooting = createShootingStars(ctx);

  // ---------- camera rig ----------
  const rig = { pos: new THREE.Vector3(), look: new THREE.Vector3(), roll: 0, drift: reduced ? 0 : 1, flying: false };
  ctx.rig = rig;
  ctx.setRig = (pos, look) => { rig.pos.copy(pos); rig.look.copy(look); rig.roll = 0; };

  ctx.flyTo = ({ pos, look, via = [], dur = 5, roll = 0, ease = 'power2.inOut' }) => new Promise((resolve) => {
    gsap.killTweensOf(rig);
    if (reduced) {
      // Calm version: dissolve instead of flying.
      ctx.fade(0, 0.7).then(() => { ctx.setRig(pos, look); ctx.fade(1, 1).then(resolve); });
      return;
    }
    const curve = new THREE.CatmullRomCurve3([rig.pos.clone(), ...via, pos.clone()], false, 'centripetal');
    const look0 = rig.look.clone();
    const o = { p: 0 };
    rig.flying = true;
    gsap.to(o, {
      p: 1, duration: dur, ease, overwrite: false,
      onUpdate() {
        curve.getPoint(o.p, rig.pos);
        const lk = o.p * o.p * (3 - 2 * o.p);
        rig.look.lerpVectors(look0, look, lk);
        rig.roll = Math.sin(o.p * Math.PI) * roll;
      },
      onComplete() { rig.flying = false; rig.roll = 0; resolve(); },
    });
  });

  // ---------- story ----------
  const live = new Map(), ready = new Map();
  let index = -1, current = null, busy = false, stopped = false, generation = 0;
  const get = (i) => {
    if (!live.has(i)) {
      live.set(i, LOADERS[i]().then((make) => make(ctx)).then((inst) => { ready.set(i, inst); return inst; })
        .catch((err) => { live.delete(i); throw err; }));
    }
    return live.get(i);
  };
  const compile = async (inst) => { try { await renderer.compileAsync(inst.group, camera, scene); } catch { /* compiled on first draw instead */ } };

  const story = {
    get index() { return index; },
    get busy() { return busy; },
    get current() { return current; },
    get: (i) => get(i),
    prefetch(i) { if (i < LOADERS.length) get(i).then(compile).catch(() => {}); },
    showNext() { ui.next(true, () => gestures.beat()); },
    advance() { if (!busy && index < LOADERS.length - 1) story.go(index + 1); },
    async go(i) {
      const gen = generation;
      busy = true;
      const prev = current, prevIndex = index;
      ui.clearAll();
      prev?.leaving?.();
      ui.setProgress(i);
      index = i;
      let inst;
      // A lazy scene can fail on a dropped connection: try once more, then finish in 2D.
      try { inst = await get(i); } catch { try { inst = await get(i); } catch { stopped = true; renderer.setAnimationLoop(null); onFatal(); return; } }
      if (gen !== generation) return;
      inst.group.visible = true;
      await compile(inst);
      await inst.prepare?.();
      await ctx.flyTo(inst.station(true));
      if (gen !== generation) return;
      current = inst;
      busy = false;
      if (prev && prevIndex !== i) { prev.left?.(); if (!prev.keep) { prev.dispose(); live.delete(prevIndex); ready.delete(prevIndex); } }
      inst.enter();
      story.prefetch(i + 1);
    },
    /** Skip straight to a scene (debug previews). */
    async jump(i) {
      generation++;
      ctx.stars.uniforms.uBurst.value = 1;
      ui.clearAll();
      ready.forEach((x) => x.dispose());
      ready.clear(); live.clear(); current = null;
      const inst = await get(i);
      inst.group.visible = true;
      if (inst.jumpIn) await inst.jumpIn();
      const st = inst.station(true);
      ctx.setRig(st.pos, st.look);
      index = i; current = inst; busy = false;
      ui.setProgress(i);
      inst.enter();
      grade.uniforms.uFade.value = 1;
    },
    async replay() {
      if (busy) return;
      busy = true;
      generation++;
      ui.clearAll();
      await ctx.fade(0, 1.1);
      await Promise.allSettled([...live.values()]);
      gsap.globalTimeline.clear();
      ready.forEach((x) => x.dispose());
      ready.clear(); live.clear(); current = null;
      lights.a.intensity = lights.b.intensity = 0;
      lights.hemi.intensity = 0.55; lights.key.intensity = 1.5;
      ctx.stars.reset();
      await begin();
    },
  };
  ctx.story = story;

  async function begin() {
    index = 0; busy = false;
    current = await get(0);
    current.group.visible = true;
    const st = current.station();
    ctx.setRig(st.pos, st.look);
    ui.setProgress(0);
    current.enter();
    ctx.fade(1, reduced ? 1 : 1.8);
    story.prefetch(1);
  }

  // Scrolling is the only control: every beat is one step of the story.
  gestures.on({
    beat() {
      if (busy || !current) return;
      if (current.done) story.advance(); else current.beat?.();
    },
    pull(p) {
      ui.pull(busy || !current ? 0 : p);
      current?.pull?.(p);
    },
    poke() { ui.poke(); },
    drag(dx, dy) { if (!busy) current?.drag?.(dx, dy); },
    dragEnd(vx, vy) { if (!busy) current?.dragEnd?.(vx, vy); },
  });

  // ---------- frame loop and adaptive quality ----------
  let fpsFrames = 0, fpsTime = 0, lastT = 0, steps = 0, slowWindows = 0;
  const degrade = () => {
    steps++;
    if (steps <= 3 && dpr > 1) {
      dpr = Math.max(1, dpr * 0.84);
      renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr); uniforms.uPx.value = pointScale();
    } else if (steps === 4) { bloomScale = 0.3; composer.setSize(W, H); ctx.stars.scale(0.72); }
    else if (steps === 5) { bloom.enabled = false; }
    else if (steps === 6) { ctx.stars.scale(0.5); }
    stats.degrades = steps;
  };
  const stats = { degrades: 0, perScene: {} };

  const up = new THREE.Vector3();
  let lean = 0;
  function frame(ms) {
    if (stopped) return;
    const t = ms / 1000, dt = Math.min(0.1, t - lastT || 0.016);
    lastT = t;
    uniforms.uTime.value = t;
    uniforms.uMusic.value = music.sample(t);

    const d = rig.drift;
    camera.position.set(rig.pos.x + Math.sin(t * 0.21) * 0.13 * d, rig.pos.y + Math.cos(t * 0.17) * 0.09 * d, rig.pos.z);
    // While she scrolls, the camera leans into the scene a little and springs back if she lets go.
    const want = busy || reduced ? 0 : gestures.pull;
    lean += (want - lean) * Math.min(1, dt * (want > lean ? 14 : 3.5));
    if (Math.abs(lean) > 1e-4) camera.position.lerp(rig.look, lean * 0.07);
    up.set(Math.sin(rig.roll), Math.cos(rig.roll), 0);
    camera.up.copy(up);
    camera.lookAt(rig.look);
    sky.position.copy(camera.position);

    ready.forEach((inst) => inst.update?.(t, dt));
    shooting.update(dt);
    composer.render(dt);

    fpsFrames++; fpsTime += dt;
    if (fpsFrames >= 90) {
      const avg = fpsTime / fpsFrames;
      const key = index;
      (stats.perScene[key] ||= []).push(+(1 / avg).toFixed(1));
      // Two slow readings in a row, so one loading hitch cannot soften a phone that is fine.
      slowWindows = avg > 1 / 44 && !document.hidden ? slowWindows + 1 : 0;
      if (slowWindows >= 2 && !DEBUG.has('noadapt')) { slowWindows = 0; degrade(); }
      fpsFrames = 0; fpsTime = 0;
    }
  }

  // ---------- resize ----------
  let resizeTimer = 0;
  const applySize = () => {
    W = innerWidth; H = innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    if (current && !busy) current.onResize?.();
  };
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(applySize, 120); });

  // ---------- context loss ----------
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    const restored = new Promise((res) => canvas.addEventListener('webglcontextrestored', () => res(true), { once: true }));
    Promise.race([restored, new Promise((res) => setTimeout(() => res(false), 2500))]).then((ok) => {
      if (!ok) { stopped = true; renderer.setAnimationLoop(null); onFatal(); }
    });
  });

  await begin();
  renderer.setAnimationLoop(frame);

  if (IS_DEBUG) {
    window.__chris = { ctx, story, stats, renderer, music, grade, degrade, THREE };
    const at = DEBUG.get('at');
    if (at !== null) await story.jump(+at);
  }
}
