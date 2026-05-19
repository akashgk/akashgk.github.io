// Init icons & year
feather.replace();
document.getElementById("year").textContent = new Date().getFullYear();

// Scroll progress bar
const progressBar = document.getElementById("progress-bar");
if (progressBar) {
  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${total > 0 ? scrolled / total : 0})`;
  }, { passive: true });
}

// Navbar scroll state
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 60);
}, { passive: true });

// Fade-up scroll observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));

// Mobile menu
const mobileToggle = document.querySelector(".mobile-toggle");
const navLinks = document.querySelector(".nav-links");
const links = document.querySelectorAll(".nav-link");

if (mobileToggle) {
  mobileToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("active");
    mobileToggle.innerHTML = `<i data-feather="${isOpen ? "x" : "menu"}"></i>`;
    feather.replace();
  });
  links.forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      mobileToggle.innerHTML = `<i data-feather="menu"></i>`;
      feather.replace();
    });
  });
}

// Active nav link on scroll
const sections = document.querySelectorAll("section[id]");
window.addEventListener("scroll", () => {
  const scrollPos = window.scrollY + window.innerHeight / 3;
  sections.forEach((section) => {
    if (
      section.offsetTop <= scrollPos &&
      section.offsetTop + section.offsetHeight > scrollPos
    ) {
      links.forEach((l) => l.classList.remove("active"));
      const match = document.querySelector(`.nav-link[href="#${section.id}"]`);
      if (match) match.classList.add("active");
    }
  });
}, { passive: true });

// Custom cursor — desktop only
if (window.matchMedia("(pointer: fine)").matches) {
  const dot = document.createElement("div");
  const ring = document.createElement("div");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + "px";
    dot.style.top  = my + "px";
  });

  (function animateRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + "px";
    ring.style.top  = ry + "px";
    requestAnimationFrame(animateRing);
  })();

  document.querySelectorAll("a, button, .bento-cell, .pkg-card").forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hovered"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hovered"));
  });
}

// Typed role cycling
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
      setTimeout(tick, 2000);
      return;
    }
    if (deleting && ci === 0) {
      deleting = false;
      ri = (ri + 1) % roles.length;
    }
    setTimeout(tick, deleting ? 45 : 85);
  }
  tick();
})();

// Hero orb mouse parallax
(function () {
  const hero = document.querySelector(".hero");
  const layer = document.querySelector(".orb-layer");
  if (!hero || !layer || window.matchMedia("(pointer: coarse)").matches) return;

  hero.addEventListener("mousemove", (e) => {
    const { left, top, width, height } = hero.getBoundingClientRect();
    const x = ((e.clientX - left) / width  - 0.5) * 38;
    const y = ((e.clientY - top)  / height - 0.5) * 28;
    layer.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });

  hero.addEventListener("mouseleave", () => {
    layer.style.transform = "";
  });
})();

// Button click ripple
document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const rip = document.createElement("span");
    rip.className = "ripple";
    rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;
    btn.appendChild(rip);
    rip.addEventListener("animationend", () => rip.remove());
  });
});

// 3D tilt on cards — desktop pointer only
if (window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {

  function addTilt(selector, maxDeg) {
    document.querySelectorAll(selector).forEach((card) => {
      card.addEventListener("mouseenter", () => card.classList.add("tilt-active"));
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        card.style.transform =
          `perspective(900px) rotateY(${x * maxDeg}deg) rotateX(${-y * maxDeg}deg) translateY(-5px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.classList.remove("tilt-active");
        card.style.transform = "";
      });
    });
  }

  addTilt(".bento-cell", 7);
  addTilt(".pkg-card", 6);
  addTilt(".contact-link", 5);
  addTilt(".os-github-card", 6);

  // Magnetic pull on primary/ghost buttons
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 14;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 14;
      btn.style.transform = `translate(${x}px, ${y}px) translateY(-2px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });
}

// Stats counter animation
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
          countUp(el, parseInt(el.dataset.count, 10), 1400);
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
  const soundIcon = document.getElementById("sound-icon");
  const island = document.getElementById("game-island");
  const islandNotif = document.getElementById("island-notif");
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

  // Career milestones
  const milestones = [
    { id: "cbq", title: "CBQ Portal Live", subtitle: "Mobile Architecture Lead (8+ Devs)", badge: "Architect", icon: "briefcase", color: "#a1a1aa" },
    { id: "pyjama", title: "PyjamaHR Mobile", subtitle: "App Built from Scratch (Flutter)", badge: "Flutter", icon: "smartphone", color: "#bfbba9" },
    { id: "packages", title: "dartapi CLI", subtitle: "+50k Pub Downloads globally", badge: "Packages", icon: "package", color: "#d4d4d8" },
    { id: "qatar", title: "Fintech Architect", subtitle: "Secure Clean Code in Qatar", badge: "FinTech", icon: "shield", color: "#ebd9be" },
    { id: "developer", title: "Expert Flutter SDE", subtitle: "BLoC & Riverpod Stack Lead", badge: "Dart/Swift", icon: "cpu", color: "#c5bfa4" }
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
    soundIcon.setAttribute("data-feather", soundEnabled ? "volume-2" : "volume-x");
    soundBtn.querySelector("span").textContent = soundEnabled ? "Sound FX On" : "Sound FX Off";
    feather.replace();
    
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

  // Handle high resolution canvas layout
  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener("resize", resize);
  resize();

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
    color: "#ebd9be",
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
    color: "#c5bfa4",
    hapticHeight: 8,
    draw() {
      ctx.beginPath();
      ctx.roundRect(this.x, this.y + (this.height - this.hapticHeight), this.width, this.hapticHeight, this.radius);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(197, 191, 180, 0.4)";
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
      ctx.fillStyle = "rgba(7, 8, 15, 0.9)";
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = this.color;
      ctx.font = "bold 9px var(--font-mono)";
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
      ctx.font = "bold 9px var(--font-mono)";
      ctx.textAlign = "center";
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // Keyboard controls
  let leftPressed = false;
  let rightPressed = false;
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") leftPressed = true;
    if (e.key === "ArrowRight") rightPressed = true;
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
    notifIconWrap.innerHTML = `<i data-feather="${milestone.icon}"></i>`;
    feather.replace();

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
    scoreVal.textContent = "0";
    updateLivesUI();
    resetBall();
    particles = [];
    tokens = [];
    pointPopups = [];
    shrinkIsland();
  }

  // Start Compilation handler
  startBtn.addEventListener("click", () => {
    initAudio();
    overlay.classList.remove("active");
    resetGame();
    isRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  });

  // Trigger game over state
  function gameOver() {
    isRunning = false;
    playSound("gameover");
    
    // Update high score
    if (score > highscore) {
      highscore = score;
      localStorage.setItem("db-highscore", highscore.toString());
      highscoreVal.textContent = highscore;
    }

    document.getElementById("overlay-title").textContent = "COMPILATION FAIL";
    document.getElementById("overlay-desc").textContent = `Build crashed. Score: ${score}. Best Build: ${highscore}. Unlock all 5 milestones!`;
    startBtn.innerHTML = `Recompile <i data-feather="refresh-cw"></i>`;
    feather.replace();
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
      ball.vx = ball.vx * speedMult;

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

      // Influence angle based on hit location
      const hitSpot = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.vx = hitSpot * 4.5;

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
