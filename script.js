// =====================================================
// Inline SVG icons (no icon CDN)
// =====================================================
const ICONS = {
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  package: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  "volume-2": '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  "volume-x": '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
};

function iconSvg(name, size = 16, strokeWidth = 2) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Live clock — local time in Doha
(function () {
  const el = document.getElementById("doha-time");
  if (!el || typeof Intl === "undefined") return;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Qatar",
    hour: "numeric",
    minute: "2-digit",
  });
  function tick() {
    el.textContent = `${fmt.format(new Date())} in Doha`;
  }
  tick();
  setInterval(tick, 30000);
})();

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

// =====================================================
// Confetti — Apple-colored micro-celebration
// =====================================================
const CONFETTI_COLORS = ["#0894ff", "#c959dd", "#ff2e54", "#ff9004", "#30d158"];
function confettiBurst(x, y, count = 90) {
  if (reducedMotion) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti-canvas";
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  document.body.appendChild(cv);
  const c = cv.getContext("2d");
  const parts = Array.from({ length: count }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 11,
    vy: -(3 + Math.random() * 8),
    w: 4 + Math.random() * 4,
    h: 2.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
  }));
  const start = performance.now();
  const DUR = 1700;
  (function frame(now) {
    const t = now - start;
    c.clearRect(0, 0, cv.width, cv.height);
    c.globalAlpha = clamp(t > DUR - 400 ? (DUR - t) / 400 : 1, 0, 1);
    parts.forEach((p) => {
      p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    });
    if (t < DUR) requestAnimationFrame(frame);
    else cv.remove();
  })(start);
}

// Logo click: confetti + glide home
document.getElementById("nav-logo").addEventListener("click", (e) => {
  e.preventDefault();
  confettiBurst(e.clientX || window.innerWidth / 2, e.clientY || 60, 70);
  window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
});

// Console easter egg for fellow developers
console.log(
  "%cAGK%c Designed in Doha. Built with vanilla everything — no frameworks, no fonts, no fluff.\n%c→ github.com/akashgk",
  "font-weight:700;font-size:13px;background:linear-gradient(90deg,#0894ff,#ff2e54);color:#fff;padding:3px 9px;border-radius:6px",
  "color:#86868b;font-size:12px",
  "color:#2997ff;font-size:12px"
);

// =====================================================
// Scroll choreography engine — one rAF handler drives:
// navbar state · sliding nav indicator · pinned hero scrub
// · statement word lighting · experience deck stacking
// · iPhone 3D entrance
// =====================================================
const navbar = document.querySelector(".navbar");
const navIndicator = document.querySelector(".nav-indicator");
const links = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section[id]");
const heroStage = document.getElementById("hero-stage");
const heroGlow = document.querySelector(".hero-glow");
const statementSection = document.getElementById("statement");
const xpCards = Array.from(document.querySelectorAll(".xp-stack .xp-card"));
const deviceScene = document.getElementById("device-scene");
const iphone = document.getElementById("iphone-device");

if (heroGlow) heroGlow.classList.add("settled");

// Wrap every word of the statement in a span so scroll can light them up
let statementWords = [];
if (statementSection && !reducedMotion) {
  statementSection.querySelectorAll(".statement").forEach((p) => {
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) {
          frag.appendChild(document.createTextNode(tok));
        } else {
          const s = document.createElement("span");
          s.className = "w";
          s.textContent = tok;
          frag.appendChild(s);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  });
  statementWords = Array.from(statementSection.querySelectorAll(".w"));
}

// iPhone 3D pose = scroll entrance (rise + un-tilt) ∘ pointer tilt.
// Frozen flat while the arcade game runs so the canvas buffer and
// touch input map 1:1 to screen pixels.
const devicePose = { scrub: 1, tiltX: 0, tiltY: 0 };
const devicePoseFrozen = () =>
  deviceScene && deviceScene.classList.contains("playing");
function applyDevicePose() {
  if (!iphone || devicePoseFrozen()) return;
  const lift = 1 - devicePose.scrub;
  iphone.style.transform =
    `translateY(${(lift * 70).toFixed(2)}px) ` +
    `scale(${(0.9 + devicePose.scrub * 0.1).toFixed(4)}) ` +
    `rotateX(${(lift * 16 + devicePose.tiltX).toFixed(2)}deg) ` +
    `rotateY(${devicePose.tiltY.toFixed(2)}deg)`;
}

let activeLink = null;
function moveNavIndicator() {
  if (!navIndicator || window.innerWidth <= 768) return;
  if (!activeLink) {
    navIndicator.style.opacity = "0";
    return;
  }
  navIndicator.style.opacity = "1";
  navIndicator.style.width = `${activeLink.offsetWidth}px`;
  navIndicator.style.transform = `translateX(${activeLink.offsetLeft}px) translateY(-50%)`;
}

const deviceScrubEnabled = () => !reducedMotion && window.innerWidth > 350;

let scrollScheduled = false;
function onScrollFrame() {
  scrollScheduled = false;
  const y = window.scrollY;
  const vh = window.innerHeight;

  navbar.classList.toggle("scrolled", y > 40);

  // 1. Pinned hero scrub — one CSS var drives all parallax layers
  if (heroStage && !reducedMotion) {
    const span = heroStage.offsetHeight - vh;
    heroStage.style.setProperty("--hp", clamp(span > 0 ? y / span : 0, 0, 1).toFixed(4));
  }

  // 2. Statement words light up progressively.
  // Floor of 0.3 keeps the text readable before it ignites, and the
  // sweep completes while the section is still mid-screen.
  if (statementWords.length) {
    const r = statementSection.getBoundingClientRect();
    if (r.bottom > -50 && r.top < vh + 50) {
      const p = clamp((vh * 0.92 - r.top) / (r.height * 0.85), 0, 1);
      const thr = p * (statementWords.length + 3);
      for (let i = 0; i < statementWords.length; i++) {
        statementWords[i].style.opacity = clamp(0.3 + (thr - i) * 0.7, 0.3, 1).toFixed(3);
      }
    }
  }

  // 3. Experience deck: earlier cards shrink & dim as the next slides over
  if (xpCards.length && !reducedMotion) {
    for (let i = 0; i < xpCards.length - 1; i++) {
      const card = xpCards[i];
      if (!card.classList.contains("settled")) continue;
      const next = xpCards[i + 1].getBoundingClientRect();
      const cover = clamp((vh * 0.9 - next.top) / (vh * 0.55), 0, 1);
      card.style.transform = `translateY(${(cover * -14).toFixed(2)}px) scale(${(1 - cover * 0.06).toFixed(4)})`;
      card.style.opacity = (1 - cover * 0.5).toFixed(3);
    }
  }

  // 4. iPhone rises and un-tilts into view
  if (deviceScene && deviceScrubEnabled() && !devicePoseFrozen()) {
    const r = deviceScene.getBoundingClientRect();
    const t = clamp((vh * 0.92 - r.top) / (vh * 0.6), 0, 1);
    devicePose.scrub = t * t * (3 - 2 * t); // smoothstep
    applyDevicePose();
  }

  // 5. Active section → nav link + sliding indicator
  const scrollPos = y + vh / 3;
  let currentId = null;
  sections.forEach((section) => {
    if (
      section.offsetTop <= scrollPos &&
      section.offsetTop + section.offsetHeight > scrollPos
    ) {
      currentId = section.id;
    }
  });
  let newActive = null;
  links.forEach((l) => {
    const match = currentId !== null && l.getAttribute("href") === `#${currentId}`;
    l.classList.toggle("active", match);
    if (match) newActive = l;
  });
  if (newActive !== activeLink) {
    activeLink = newActive;
    moveNavIndicator();
  }
}
window.addEventListener("scroll", () => {
  if (!scrollScheduled) {
    scrollScheduled = true;
    requestAnimationFrame(onScrollFrame);
  }
}, { passive: true });
window.addEventListener("resize", () => {
  moveNavIndicator();
  onScrollFrame();
}, { passive: true });
onScrollFrame();

// Pointer tilt on the iPhone (desktop only)
if (deviceScene && window.matchMedia("(pointer: fine)").matches && !reducedMotion) {
  deviceScene.addEventListener("mousemove", (e) => {
    if (!deviceScrubEnabled()) return;
    const r = deviceScene.getBoundingClientRect();
    devicePose.tiltY = ((e.clientX - r.left) / r.width - 0.5) * 10;
    devicePose.tiltX = -((e.clientY - r.top) / r.height - 0.5) * 8;
    applyDevicePose();
  }, { passive: true });
  deviceScene.addEventListener("mouseleave", () => {
    devicePose.tiltX = 0;
    devicePose.tiltY = 0;
    applyDevicePose();
  });
}

// =====================================================
// Blur-up reveal on scroll.
// Scrub targets get .settled afterwards, which switches them
// from transition-driven (entrance) to scroll-driven (scrub).
// =====================================================
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.classList.add("visible");
      if (el.closest(".hero") || el.classList.contains("xp-card")) {
        setTimeout(() => el.classList.add("settled"), 1400);
      }
      observer.unobserve(el);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// =====================================================
// Mobile drawer menu
// =====================================================
const mobileToggle = document.querySelector(".mobile-toggle");
const mobileDrawer = document.getElementById("mobile-drawer");

if (mobileToggle && mobileDrawer) {
  const setDrawer = (open) => {
    mobileDrawer.classList.toggle("open", open);
    mobileToggle.classList.toggle("open", open);
    mobileToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("drawer-locked", open);
  };
  mobileToggle.addEventListener("click", () => {
    setDrawer(!mobileDrawer.classList.contains("open"));
  });
  mobileDrawer.querySelectorAll(".drawer-link").forEach((link) => {
    link.addEventListener("click", () => setDrawer(false));
  });
}

// =====================================================
// Typed role cycling
// =====================================================
(function () {
  const el = document.getElementById("typed-role");
  if (!el) return;
  const roles = ["Senior Flutter Developer", "Mobile Architect", "Fintech Engineer", "Open Source Author"];
  let ri = 0, ci = 0, deleting = false;

  function tick() {
    const word = roles[ri];
    el.textContent = deleting ? word.slice(0, --ci) : word.slice(0, ++ci);

    if (!deleting && ci === word.length) {
      deleting = true;
      setTimeout(tick, 2200);
      return;
    }
    if (deleting && ci === 0) {
      deleting = false;
      ri = (ri + 1) % roles.length;
    }
    setTimeout(tick, deleting ? 40 : 80);
  }
  tick();
})();

// =====================================================
// Stats counter animation
// =====================================================
function countUp(el, target, duration) {
  const start = performance.now();
  (function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(ease * target);
    if (t < 1) requestAnimationFrame(update);
  })(start);
}

const statsBar = document.querySelector(".stats-bar");
if (statsBar) {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll("[data-count]").forEach((el) => {
          countUp(el, parseInt(el.dataset.count, 10), 1500);
          const num = el.closest(".stat-number");
          if (num) num.classList.add("pop");
        });
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  statsObserver.observe(statsBar);
}

// =====================================================
// Apple Arcade Game "Dynamic Bounce"
// =====================================================
(function () {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("game-overlay");
  const startBtn = document.getElementById("start-btn");
  const scoreVal = document.getElementById("game-score");
  const highscoreVal = document.getElementById("game-highscore");
  const livesContainer = document.getElementById("game-lives");
  const soundBtn = document.getElementById("sound-btn");
  const island = document.getElementById("game-island");
  const unlockedCount = document.getElementById("unlocked-count");

  // DOM Elements for notification morph
  const notifIconWrap = document.getElementById("notif-icon-wrap");
  const notifTitle = document.getElementById("notif-title");
  const notifSubtitle = document.getElementById("notif-subtitle");
  const notifBadge = document.getElementById("notif-badge");

  // Game dimensions
  const WIDTH = 300;
  const HEIGHT = 630;
  let dpr = window.devicePixelRatio || 1;

  // Sound state
  let audioCtx = null;
  let soundEnabled = true;

  // Persistence
  let highscore = parseInt(localStorage.getItem("db-highscore") || "0", 10);
  highscoreVal.textContent = highscore;

  // Career milestones — Apple system colors
  const milestones = [
    { id: "cbq", title: "CBQ Portal Live", subtitle: "Mobile Architecture Lead (8+ Devs)", badge: "Architect", icon: "briefcase", color: "#2997ff" },
    { id: "pyjama", title: "PyjamaHR Mobile", subtitle: "App Built from Scratch (Flutter)", badge: "Flutter", icon: "smartphone", color: "#30d158" },
    { id: "packages", title: "dartapi CLI", subtitle: "+50k Pub Downloads globally", badge: "Packages", icon: "package", color: "#ff9f0a" },
    { id: "qatar", title: "Fintech Architect", subtitle: "Secure Clean Code in Qatar", badge: "FinTech", icon: "shield", color: "#bf5af2" },
    { id: "developer", title: "Expert Flutter SDE", subtitle: "BLoC & Riverpod Stack Lead", badge: "Dart/Swift", icon: "cpu", color: "#ff375f" }
  ];
  let unlockedMilestones = new Set();

  // Web Audio Synth Function
  function playSound(type) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "paddle") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "island") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === "catch") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "fail") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(293.66, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === "gameover") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(329.63, now); // E4
        osc.frequency.setValueAtTime(261.63, now + 0.15); // C4
        osc.frequency.linearRampToValueAtTime(196.00, now + 0.5); // G3
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === "unlock") {
        // Apple-like clean triple chime
        const playTone = (freq, startOffset, duration) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.connect(g);
          g.connect(audioCtx.destination);
          o.type = "sine";
          o.frequency.setValueAtTime(freq, now + startOffset);
          g.gain.setValueAtTime(0.08, now + startOffset);
          g.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
          o.start(now + startOffset);
          o.stop(now + startOffset + duration);
        };
        playTone(523.25, 0, 0.15); // C5
        playTone(659.25, 0.08, 0.15); // E5
        playTone(783.99, 0.16, 0.25); // G5
      }
    } catch (e) {
      console.warn("Web Audio Context not initialized yet or not supported", e);
    }
  }

  // Sound controls
  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundBtn.innerHTML =
      iconSvg(soundEnabled ? "volume-2" : "volume-x", 12) +
      `<span>${soundEnabled ? "Sound FX On" : "Sound FX Off"}</span>`;

    // Init Audio context on click to avoid browser restrictions
    if (soundEnabled && !audioCtx) {
      initAudio();
    }
  });

  function initAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error(e);
    }
  }

  // Handle high resolution canvas layout.
  // offsetWidth/offsetHeight give the untransformed layout size —
  // getBoundingClientRect would return the 3D-posed (scaled/tilted)
  // projection and misalign the drawing buffer.
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (!w || !h) return;
    canvas.width = w * dpr;
    // Map physics space (WIDTH×HEIGHT) onto the canvas size
    const scale = (w / WIDTH) * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // Freeze/unfreeze the 3D scroll pose while playing so pointer
  // input and the canvas buffer map 1:1 to screen pixels
  const scene = document.getElementById("device-scene");
  const deviceEl = document.getElementById("iphone-device");
  function freezeDevice(frozen) {
    if (!scene || !deviceEl) return;
    scene.classList.toggle("playing", frozen);
    if (frozen) deviceEl.style.transform = "none";
  }

  // Game state
  let isRunning = false;
  let score = 0;
  let lives = 3;
  let lastTime = 0;
  let activeMilestoneIndex = 0;
  let isIslandExpanded = false;
  let islandExpandTimer = 0;

  // Ball configuration
  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 2.2,
    vy: -4.5,
    radius: 6,
    color: "#2997ff",
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }
  };

  // Paddle configuration
  const paddle = {
    x: WIDTH / 2 - 38,
    y: HEIGHT - 55,
    width: 76,
    height: 8,
    radius: 4,
    color: "#f5f5f7",
    hapticHeight: 8,
    draw() {
      ctx.beginPath();
      ctx.roundRect(this.x, this.y + (this.height - this.hapticHeight), this.width, this.hapticHeight, this.radius);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(245, 245, 247, 0.4)";
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  // Dynamic Island bounding box in physics coordinates
  const islandTarget = {
    x: WIDTH / 2 - 42.5,
    y: 10,
    width: 85,
    height: 25,
    update() {
      if (isIslandExpanded) {
        this.width = 260;
        this.height = 60;
      } else {
        this.width = 85;
        this.height = 25;
      }
      this.x = WIDTH / 2 - this.width / 2;
    }
  };

  // Particle System
  let particles = [];
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 5;
      this.vy = (Math.random() - 0.5) * 5;
      this.radius = Math.random() * 2 + 1;
      this.color = color;
      this.alpha = 1;
      this.life = 1;
      this.decay = Math.random() * 0.04 + 0.02;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.06; // gravity
      this.life -= this.decay;
      this.alpha = Math.max(0, this.life);
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  // Dropping skill/tech tokens
  let tokens = [];
  const tokenLabels = ["Flutter", "Dart", "Swift", "BLoC", "Git", "Node"];
  const tokenColors = {
    "Flutter": "#a78bfa",
    "Dart": "#f59e0b",
    "Swift": "#ef4444",
    "BLoC": "#3b82f6",
    "Git": "#10b981",
    "Node": "#84cc16"
  };
  class SkillToken {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vy = 1.6;
      this.label = tokenLabels[Math.floor(Math.random() * tokenLabels.length)];
      this.color = tokenColors[this.label];
      this.radius = 12;
    }
    update() {
      this.y += this.vy;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = this.color;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.label[0], this.x, this.y); // Draw first letter
    }
  }

  // Trigger floating text points popup inside game
  let pointPopups = [];
  class PointPopup {
    constructor(x, y, text, color) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.alpha = 1;
      this.vy = -0.8;
    }
    update() {
      this.y += this.vy;
      this.alpha -= 0.02;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // Keyboard controls
  let leftPressed = false;
  let rightPressed = false;
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { leftPressed = true; if (isRunning) e.preventDefault(); }
    if (e.key === "ArrowRight") { rightPressed = true; if (isRunning) e.preventDefault(); }
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") leftPressed = false;
    if (e.key === "ArrowRight") rightPressed = false;
  });

  // Pointer controls (covers both mouse drag/move and touch swipes)
  canvas.addEventListener("pointermove", (e) => {
    if (!isRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / WIDTH;
    const pointerX = (e.clientX - rect.left) / scaleX;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, pointerX - paddle.width / 2));
  });

  // Dynamic Island expand/morph control
  function expandIsland(milestone) {
    isIslandExpanded = true;
    islandTarget.update();

    // Set HTML details
    notifTitle.textContent = milestone.title;
    notifSubtitle.textContent = milestone.subtitle;
    notifBadge.textContent = milestone.badge;
    notifIconWrap.style.backgroundColor = milestone.color;

    // Set custom icon
    notifIconWrap.innerHTML = iconSvg(milestone.icon, 14, 2.5);

    island.classList.add("expanded");

    // Sound & unlock logic
    playSound("island");

    // Unlock Milestone on the sidebar list
    const card = document.getElementById(`ms-${milestone.id}`);
    if (card && card.classList.contains("locked")) {
      card.classList.remove("locked");
      card.classList.add("unlocked");
      unlockedMilestones.add(milestone.id);
      unlockedCount.textContent = unlockedMilestones.size;

      // Chime for new unlock
      setTimeout(() => playSound("unlock"), 150);

      // All 5 milestones — celebrate properly
      if (unlockedMilestones.size === 5) {
        setTimeout(() => {
          confettiBurst(window.innerWidth / 2, window.innerHeight * 0.35, 150);
        }, 300);
      }
    }

    clearTimeout(islandExpandTimer);
    islandExpandTimer = setTimeout(() => {
      shrinkIsland();
    }, 2400);
  }

  function shrinkIsland() {
    isIslandExpanded = false;
    islandTarget.update();
    island.classList.remove("expanded");
  }

  // Reset ball position
  function resetBall() {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.vx = (Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 0.8);
    ball.vy = -4.2;
  }

  // Update game lives HUD
  function updateLivesUI() {
    const dots = livesContainer.querySelectorAll(".live-dot");
    dots.forEach((dot, index) => {
      if (index < lives) {
        dot.classList.remove("lost");
      } else {
        dot.classList.add("lost");
      }
    });
  }

  // Reset entire game parameters
  function resetGame() {
    score = 0;
    lives = 3;
    activeMilestoneIndex = 0;
    scoreVal.textContent = "0";
    updateLivesUI();
    resetBall();
    particles = [];
    tokens = [];
    pointPopups = [];
    clearTimeout(islandExpandTimer);
    shrinkIsland();
  }

  // Start Compilation handler
  startBtn.addEventListener("click", () => {
    initAudio();
    freezeDevice(true);
    resize();
    overlay.classList.remove("active");
    resetGame();
    isRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  });

  // Trigger game over state
  function gameOver() {
    isRunning = false;
    freezeDevice(false);
    playSound("gameover");

    // Update high score
    if (score > highscore) {
      highscore = score;
      localStorage.setItem("db-highscore", highscore.toString());
      highscoreVal.textContent = highscore;
    }

    document.getElementById("overlay-title").textContent = "COMPILATION FAIL";
    document.getElementById("overlay-desc").textContent = `Build crashed. Score: ${score}. Best Build: ${highscore}. Unlock all 5 milestones!`;
    startBtn.textContent = "Recompile";
    overlay.classList.add("active");
  }

  // Main game loop
  function gameLoop(timestamp) {
    if (!isRunning) return;

    // Delta timing (limit updates)
    const dt = Math.min((timestamp - lastTime) / 16.666, 2);
    lastTime = timestamp;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Paddle Movement (keyboard input)
    if (leftPressed) {
      paddle.x = Math.max(0, paddle.x - 5.5 * dt);
    }
    if (rightPressed) {
      paddle.x = Math.min(WIDTH - paddle.width, paddle.x + 5.5 * dt);
    }

    // Ball movement
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall bounces
    if (ball.x - ball.radius < 0) {
      ball.vx = Math.abs(ball.vx);
      ball.x = ball.radius;
      playSound("paddle");
    }
    if (ball.x + ball.radius > WIDTH) {
      ball.vx = -Math.abs(ball.vx);
      ball.x = WIDTH - ball.radius;
      playSound("paddle");
    }
    if (ball.y - ball.radius < 0) {
      ball.vy = Math.abs(ball.vy);
      ball.y = ball.radius;
      playSound("paddle");
    }

    // Dynamic Island collision
    if (ball.x + ball.radius > islandTarget.x &&
        ball.x - ball.radius < islandTarget.x + islandTarget.width &&
        ball.y + ball.radius > islandTarget.y &&
        ball.y - ball.radius < islandTarget.y + islandTarget.height) {

      // Bounce down
      ball.vy = Math.abs(ball.vy);
      ball.y = islandTarget.y + islandTarget.height + ball.radius;

      // Speed up slightly as score rises
      const speedCap = 7;
      const speedMult = 1.02;
      ball.vy = Math.min(speedCap, ball.vy * speedMult);
      ball.vx = Math.sign(ball.vx) * Math.min(speedCap, Math.abs(ball.vx) * speedMult);

      // Trigger achievement expand
      const ms = milestones[activeMilestoneIndex];
      expandIsland(ms);

      // Update active milestone for next hit
      activeMilestoneIndex = (activeMilestoneIndex + 1) % milestones.length;

      // Add points
      score += 10;
      scoreVal.textContent = score;

      // Spawn particles
      const pColor = ms.color;
      for (let i = 0; i < 15; i++) {
        particles.push(new Particle(ball.x, ball.y, pColor));
      }

      // Spawn Skill Token
      if (Math.random() > 0.3) {
        tokens.push(new SkillToken(ball.x, ball.y));
      }

      // Add Floating text points popup
      pointPopups.push(new PointPopup(ball.x, ball.y - 12, "+10 Code", "#fff"));
    }

    // Paddle collision
    if (ball.x + ball.radius > paddle.x &&
        ball.x - ball.radius < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height) {

      // Bounce up
      ball.vy = -Math.abs(ball.vy);
      ball.y = paddle.y - ball.radius;

      // Influence angle based on hit location; enforce minimum so ball never goes dead vertical
      const hitSpot = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.vx = hitSpot * 4.5;
      if (Math.abs(ball.vx) < 0.8) ball.vx = ball.vx >= 0 ? 0.8 : -0.8;

      playSound("paddle");

      // Haptic bounce compress
      paddle.hapticHeight = 3;
      setTimeout(() => {
        paddle.hapticHeight = 8;
      }, 80);
    }

    // Ball out of bounds (bottom)
    if (ball.y - ball.radius > HEIGHT) {
      lives--;
      updateLivesUI();
      playSound("fail");

      if (lives > 0) {
        resetBall();
      } else {
        gameOver();
      }
    }

    // Render Entities
    ball.draw();
    paddle.draw();

    // Update & Draw Particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.update();
      p.draw();
    });

    // Update & Draw Skill Tokens
    tokens = tokens.filter(t => {
      t.update();

      // Check collision with paddle
      if (t.x + t.radius > paddle.x &&
          t.x - t.radius < paddle.x + paddle.width &&
          t.y + t.radius > paddle.y &&
          t.y - t.radius < paddle.y + paddle.height) {

        score += 25;
        scoreVal.textContent = score;
        playSound("catch");

        // Spawn float popups
        pointPopups.push(new PointPopup(t.x, paddle.y - 10, `+25 ${t.label}!`, t.color));

        // Unlocked particle ring
        for (let i = 0; i < 8; i++) {
          particles.push(new Particle(t.x, paddle.y, t.color));
        }

        return false; // remove token
      }

      if (t.y - t.radius > HEIGHT) {
        return false; // remove token
      }

      t.draw();
      return true;
    });

    // Update & Draw Floating points
    pointPopups = pointPopups.filter(pt => {
      pt.update();
      if (pt.alpha <= 0) return false;
      pt.draw();
      return true;
    });

    requestAnimationFrame(gameLoop);
  }
})();
