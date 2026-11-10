// Shared effects. Every system here is one draw call, animated entirely on the GPU from a clock,
// so adding petals, motes or a ripple to a scene costs almost nothing per frame.
import * as THREE from 'three';
import { seeded, heartTexture, petalTexture } from './util.js';

const textures = {};
const texture = (kind) => (textures[kind] ||= kind === 'heart' ? heartTexture(128) : petalTexture(128));

/**
 * Drifting petals or little hearts. In "ambient" mode they fall slowly through a box and wrap
 * around; `burst(dir)` sends them flying from the centre; `rain` mode drops them from a set of
 * source points (used under the finished heart).
 */
export function createDrift(ctx, {
  count = 120, kind = 'petal', size = 0.26, colors = ['#f07a9a', '#ff9fb6', '#f6c6cf'],
  box = [10, 10, 6], fall = 0.5, sway = 1, spin = 1, seed = 7, sources = null, opacity = 1, lit = 0.55,
} = {}) {
  const rng = seeded(seed);
  const geo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geo.index = plane.index;
  geo.setAttribute('position', plane.attributes.position);
  geo.setAttribute('uv', plane.attributes.uv);
  const p0 = new Float32Array(count * 3), sd = new Float32Array(count * 4), axis = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const palette = colors.map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    if (sources) {
      const s = sources[Math.floor(rng() * sources.length)];
      p0.set([s.x + (rng() - 0.5) * 0.6, s.y + (rng() - 0.5) * 0.6, s.z + (rng() - 0.5) * 0.6], i * 3);
    } else {
      p0.set([(rng() - 0.5) * box[0], (rng() - 0.5) * box[1], (rng() - 0.5) * box[2]], i * 3);
    }
    sd.set([rng(), 0.6 + rng() * 0.8, rng() * Math.PI * 2, 0.7 + rng() * 0.6], i * 4);
    const ax = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    axis.set([ax.x, ax.y, ax.z], i * 3);
    const c = palette[Math.floor(rng() * palette.length)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('aP0', new THREE.InstancedBufferAttribute(p0, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 4));
  geo.setAttribute('aAxis', new THREE.InstancedBufferAttribute(axis, 3));
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(col, 3));
  geo.instanceCount = count;

  const U = {
    uTime: ctx.uniforms.uTime, uMap: { value: texture(kind) }, uOn: { value: 0 }, uBurst: { value: 0 }, uBurstT: { value: 0 },
    uBox: { value: new THREE.Vector3(...box) }, uFall: { value: fall }, uSway: { value: sway }, uSpin: { value: spin }, uSize: { value: size },
    uRain: { value: sources ? 1 : 0 }, uOpacity: { value: opacity }, uLit: { value: lit }, uMusic: ctx.uniforms.uMusic,
  };
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec3 aP0, aAxis, aColor; attribute vec4 aSeed;
      uniform float uTime, uOn, uBurst, uBurstT, uFall, uSway, uSpin, uSize, uRain, uLit, uMusic; uniform vec3 uBox;
      varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
      vec3 rot(vec3 v, vec3 a, float t) { return v * cos(t) + cross(a, v) * sin(t) + a * dot(a, v) * (1. - cos(t)); }
      void main() {
        vUv = uv;
        float ph = aSeed.x, sp = aSeed.y, ang0 = aSeed.z, sz = aSeed.w;
        float t = uTime * sp;
        vec3 w = aP0;
        // ambient: fall through the box and wrap; rain: fall from the source and fade
        float fallen = t * uFall;
        if (uRain > .5) {
          float cycle = 9. + ph * 6.;
          float k = mod(fallen + ph * cycle, cycle);
          w.y -= k * .9;
          w.x += sin(t * .8 + ph * 20.) * .6 * uSway;
          w.z += cos(t * .6 + ph * 30.) * .4 * uSway;
          vAlpha = smoothstep(0., .8, k) * smoothstep(cycle, cycle * .55, k);
        } else {
          w.y = mod(aP0.y - fallen + uBox.y * .5, uBox.y) - uBox.y * .5;
          w.x += sin(t * .9 + ph * 20.) * .55 * uSway + sin(t * .23 + ph * 7.) * .9 * uSway;
          w.z += cos(t * .7 + ph * 30.) * .4 * uSway;
          float edge = 1. - smoothstep(uBox.y * .36, uBox.y * .5, abs(w.y));
          vAlpha = edge;
        }
        // burst: everything flies out from the centre, upward and spinning, then fades
        if (uBurst > 0.) {
          vec3 dir = normalize(aP0 + vec3(0., .3, 0.) + vec3(sin(ph * 40.), cos(ph * 30.) + 1., cos(ph * 50.)) * .5);
          float e = 1. - exp(-uBurstT * 1.8);
          vec3 b = dir * e * (6. + ph * 9.) + vec3(0., uBurstT * (2. + ph * 2.) - uBurstT * uBurstT * .9, 0.);
          w = mix(w, w * .3 + b, uBurst);
          vAlpha = mix(vAlpha, 1. - smoothstep(2.2, 4.4, uBurstT), uBurst);
        }
        float ang = ang0 + t * (1.2 + sp) * uSpin + uBurstT * 4. * uBurst;
        vec3 local = rot(position * uSize * sz, aAxis, ang);
        vec3 n = rot(vec3(0., 0., 1.), aAxis, ang);
        vec4 mv = modelViewMatrix * vec4(w + local, 1.);
        gl_Position = projectionMatrix * mv;
        float light = uLit + (1. - uLit) * (abs(n.z) * .7 + pow(abs(n.y), 4.) * .5);
        vColor = aColor * light * (1. + uMusic * .12);
        vAlpha *= uOn;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform float uOpacity; varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
      void main() {
        float a = texture2D(uMap, vUv).a * vAlpha * uOpacity;
        if (a < .02) discard;
        gl_FragColor = vec4(vColor, a);
      }`,
  }));
  mesh.frustumCulled = false;
  mesh.visible = false;
  let burstClock = 0, bursting = false;
  return {
    mesh, uniforms: U,
    /** Fade the whole system in or out. */
    show(on, dur = 2) {
      mesh.visible = true;
      ctx.gsap.to(U.uOn, { value: on ? 1 : 0, duration: dur, onComplete() { if (!on) mesh.visible = false; } });
    },
    /** Fling everything outward from the box centre; the system hides itself when the petals are gone. */
    burst() {
      bursting = true; burstClock = 0;
      U.uBurst.value = 1; U.uBurstT.value = 0;
    },
    update(dt) {
      if (bursting) { burstClock += dt; U.uBurstT.value = burstClock; if (burstClock > 4.6) { bursting = false; mesh.visible = false; } }
    },
    dispose() { geo.dispose(); mesh.material.dispose(); plane.dispose(); },
  };
}

/** Golden motes orbiting a point, like fireflies that have found something worth circling. */
export function createMotes(ctx, { count = 50, radius = 2.4, height = 1.2, color = [1, 0.78, 0.4], speed = 1, size = 1, seed = 3 } = {}) {
  const rng = seeded(seed);
  const a = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) a.set([rng() * Math.PI * 2, 0.55 + rng() * 0.75, (rng() - 0.5) * 2, rng()], i * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(a, 4));
  const U = { uTime: ctx.uniforms.uTime, uPx: ctx.uniforms.uPx, uOn: { value: 0 }, uR: { value: radius }, uH: { value: height },
    uColor: { value: new THREE.Vector3(...color) }, uSpeed: { value: speed }, uSize: { value: size }, uMusic: ctx.uniforms.uMusic };
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aS; uniform float uTime, uPx, uOn, uR, uH, uSpeed, uSize, uMusic; varying float vA;
      void main() {
        float ang = aS.x + uTime * aS.y * .35 * uSpeed;
        float r = uR * (.55 + .45 * aS.w) * (1. + .12 * sin(uTime * .7 + aS.x * 3.));
        vec3 p = vec3(cos(ang) * r, aS.z * uH + sin(uTime * (.8 + aS.w) + aS.x * 5.) * .25, sin(ang) * r);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float tw = .55 + .45 * sin(uTime * (2. + aS.w * 3.) + aS.x * 9.);
        gl_PointSize = uPx * uSize * (1.6 + tw * 2.2 + uMusic * .8) * clamp(16. / -mv.z, .5, 2.5);
        gl_Position = projectionMatrix * mv;
        vA = uOn * (.35 + tw * .65);
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.05,d); a *= a * vA; if (a<.003) discard; gl_FragColor = vec4(uColor*a*1.4, a); }`,
  }));
  pts.frustumCulled = false;
  pts.visible = false;
  return {
    points: pts, uniforms: U,
    show(on, dur = 2) { pts.visible = true; ctx.gsap.to(U.uOn, { value: on ? 1 : 0, duration: dur, onComplete() { if (!on) pts.visible = false; } }); },
    dispose() { geo.dispose(); pts.material.dispose(); },
  };
}

/** One expanding ring of light, re-fired wherever something lights up. */
export function createRipple(ctx, { color = [1, 0.8, 0.45], size = 1 } = {}) {
  const U = { uT: { value: 2 }, uColor: { value: new THREE.Vector3(...color) } };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.,0.,0.,1.); mv.xy += position.xy * SIZE; gl_Position = projectionMatrix * mv; }'.replace('SIZE', (size * 7).toFixed(2)),
    fragmentShader: /* glsl */`
      uniform float uT; uniform vec3 uColor; varying vec2 vUv;
      void main() {
        float d = length(vUv - .5) * 2.;
        float r = uT * .95;
        float ring = exp(-pow((d - r) * 14., 2.)) + exp(-pow((d - r * .72) * 24., 2.)) * .4;
        float a = ring * (1. - uT) * (1. - uT) * 1.2;
        if (a < .004) discard;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  }));
  mesh.frustumCulled = false;
  mesh.visible = false;
  return {
    mesh,
    fire(worldPos, dur = 1.6) {
      mesh.position.copy(worldPos);
      mesh.visible = true;
      U.uT.value = 0;
      ctx.gsap.to(U.uT, { value: 1, duration: dur, ease: 'power1.out', overwrite: true, onComplete() { mesh.visible = false; } });
    },
    dispose() { mesh.geometry.dispose(); mesh.material.dispose(); },
  };
}

/** Shooting stars: a streak now and then, always somewhere in front of the camera. */
export function createShootingStars(ctx) {
  const group = new THREE.Group();
  group.name = 'shooting';
  ctx.scene.add(group);
  const pool = [];
  for (let i = 0; i < 2; i++) {
    const U = { uK: { value: 0 } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: /* glsl */`
        uniform float uK; varying vec2 vUv;
        void main() {
          float head = smoothstep(.0, .06, 1. - vUv.x) * pow(vUv.x, 3.);
          float core = exp(-pow((vUv.y - .5) * 9., 2.));
          float a = (head * core + pow(vUv.x, 12.) * core * 1.2) * sin(uK * 3.14159);
          if (a < .004) discard;
          gl_FragColor = vec4(vec3(1., .93, .8) * a * 1.3, a);
        }`,
    }));
    m.frustumCulled = false;
    m.visible = false;
    m.userData.U = U;
    group.add(m);
    pool.push(m);
  }
  let next = 4 + Math.random() * 6, idx = 0;
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), start = new THREE.Vector3(), end = new THREE.Vector3(), dir = new THREE.Vector3();
  const fire = () => {
    const m = pool[idx++ % pool.length];
    const cam = ctx.camera;
    cam.getWorldDirection(fwd);
    right.crossVectors(fwd, cam.up).normalize();
    up.crossVectors(right, fwd).normalize();
    const D = 160, v = ctx.viewAt(D);
    const sx = (Math.random() - 0.5) * v.w * 0.9, sy = (Math.random() * 0.5 + 0.25) * v.h * 0.5;
    start.copy(cam.position).addScaledVector(fwd, D).addScaledVector(right, sx).addScaledVector(up, sy);
    const len = v.w * (0.12 + Math.random() * 0.14);
    const ang = -0.35 - Math.random() * 0.7;
    dir.copy(right).multiplyScalar(Math.cos(ang) * (Math.random() > 0.5 ? 1 : -1)).addScaledVector(up, Math.sin(ang)).normalize();
    end.copy(start).addScaledVector(dir, len);
    m.position.lerpVectors(start, end, 0.5);
    m.scale.set(len, v.h * 0.012, 1);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), fwd.clone().negate(), up));
    // rotate the strip to lie along dir within the view plane
    const a2 = Math.atan2(dir.dot(up), dir.dot(right));
    m.rotateZ(a2);
    m.visible = true;
    m.userData.U.uK.value = 0;
    ctx.gsap.to(m.userData.U.uK, { value: 1, duration: 0.9 + Math.random() * 0.5, ease: 'none', onComplete() { m.visible = false; } });
  };
  return {
    group,
    update(dt) {
      if (ctx.reduced || ctx.rig.flying) return;
      next -= dt;
      if (next <= 0) { fire(); next = 5 + Math.random() * 9; }
    },
    dispose() { pool.forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); group.removeFromParent(); },
  };
}

/** Faint nebula veil: layered value noise in warm and cool inks, drifting slowly. One quad. */
export function createNebula(ctx, { width = 90, height = 60, strength = 1, seed = 2.3 } = {}) {
  const U = { uTime: ctx.uniforms.uTime, uOn: { value: 0 }, uSeed: { value: seed }, uStrength: { value: strength } };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: /* glsl */`
      uniform float uTime, uOn, uSeed, uStrength; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * vn(p); p = p * 2.03 + 7.3; a *= .5; } return v; }
      void main() {
        vec2 p = vUv * vec2(3.2, 2.2);
        float t = uTime * .018;
        float n1 = fbm(p + vec2(t, -t * .6));
        float n2 = fbm(p * 1.7 - vec2(t * .8, t * .3) + n1 * .9);
        vec2 q = vUv - .5;
        float mask = smoothstep(.72, .1, length(q * vec2(1., 1.5)));
        float cloud = smoothstep(.42, .78, n2) * mask;
        vec3 warm = vec3(1., .36, .5), cool = vec3(.2, .36, 1.), gold = vec3(1., .74, .4);
        vec3 c = mix(cool, warm, smoothstep(.3, .7, n1)) * cloud * .13 + gold * pow(cloud, 3.) * .2;
        float a = cloud * .14 * uOn * uStrength;
        gl_FragColor = vec4(c * uOn * uStrength, a);
      }`,
  }));
  mesh.renderOrder = -4;
  mesh.visible = false;
  return {
    mesh, uniforms: U,
    show(on, dur = 3) { mesh.visible = true; ctx.gsap.to(U.uOn, { value: on ? 1 : 0, duration: dur, onComplete() { if (!on) mesh.visible = false; } }); },
    dispose() { mesh.geometry.dispose(); mesh.material.dispose(); },
  };
}

/**
 * Stardust that follows her finger or cursor. A small ring buffer of points: each one is born
 * where the pointer was and then lives out its second or so entirely on the GPU.
 */
export function createTrail(ctx, count = 160) {
  const pos = new Float32Array(count * 3), born = new Float32Array(count * 2).fill(-100);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3), aBorn = new THREE.BufferAttribute(born, 2);
  aPos.setUsage(THREE.DynamicDrawUsage); aBorn.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aPos);
  geo.setAttribute('aBorn', aBorn);
  const U = { uTime: ctx.uniforms.uTime, uPx: ctx.uniforms.uPx };
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec2 aBorn; uniform float uTime, uPx; varying vec3 vColor; varying float vAlpha;
      void main() {
        float seed = aBorn.y, age = uTime - aBorn.x, life = 1. + seed * 1.3, k = clamp(age / life, 0., 1.);
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        // set loose, each mote wanders a little and sinks, in view space so it reads the same from any angle
        mv.xy += vec2(sin(seed * 51. + age * 2.6) * .09, -k * k * .34 + cos(seed * 37.) * .05) * (.4 + k);
        float tw = .7 + .3 * sin(age * 17. + seed * 40.);
        gl_PointSize = uPx * (6. + seed * 10.) * (1. - k * .6) * tw;
        gl_Position = projectionMatrix * mv;
        vColor = mix(vec3(1., .8, .46), vec3(1., .5, .66), fract(seed * 7.3)) * (2.6 - k * 1.2);
        vAlpha = age < 0. || k >= 1. ? 0. : smoothstep(0., .05, k) * pow(1. - k, 1.2);
      }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; void main(){ if (vAlpha <= 0.) discard; float d = length(gl_PointCoord-.5); float a = smoothstep(.5,.0,d); a = (a * a * .7 + pow(a, 8.)) * vAlpha; gl_FragColor = vec4(vColor*a, a); }`,
  }));
  points.frustumCulled = false;
  points.renderOrder = 20;
  ctx.scene.add(points);
  let head = 0;
  const v = new THREE.Vector3();
  return {
    points,
    /** Leave `n` motes at a place on screen (CSS pixels), a few units in front of the lens. */
    emit(x, y, n = 1, spread = 0.05) {
      const cam = ctx.camera;
      for (let i = 0; i < n; i++) {
        v.set((x / ctx.width) * 2 - 1, 1 - (y / ctx.height) * 2, 0.5).unproject(cam).sub(cam.position).normalize();
        v.multiplyScalar(8).add(cam.position);
        pos.set([v.x + (Math.random() - 0.5) * spread, v.y + (Math.random() - 0.5) * spread, v.z + (Math.random() - 0.5) * spread], head * 3);
        born.set([ctx.uniforms.uTime.value - Math.random() * 0.05, Math.random()], head * 2);
        head = (head + 1) % count;
      }
      aPos.needsUpdate = true; aBorn.needsUpdate = true;
    },
    dispose() { geo.dispose(); points.material.dispose(); points.removeFromParent(); },
  };
}
