/* =========================================================================
   DOSSIER — akashgk.com
   No libraries. One rAF loop for scroll, one for the press.
   ========================================================================= */

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ── dates & clocks ─────────────────────────────────────────────────── */
(function stamps() {
  const y = String(new Date().getFullYear());
  const yr = $("#year");
  const sy = $("#stamp-year");
  if (yr) yr.textContent = y;
  if (sy) sy.textContent = y;

  const targets = [$("#doha-time"), $("#doha-time-2")].filter(Boolean);
  if (!targets.length || typeof Intl === "undefined") return;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Qatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const tick = () => {
    const t = `${fmt.format(new Date())} Doha`;
    targets.forEach((el) => (el.textContent = t));
  };
  tick();
  setInterval(tick, 20000);
})();

/* ── ink / paper ────────────────────────────────────────────────────── */
(function lights() {
  const btn = $("#lights");
  const meta = $("#theme-color");
  const root = document.documentElement;

  const apply = (mode) => {
    root.setAttribute("data-mode", mode);
    if (meta) meta.setAttribute("content", mode === "ink" ? "#131210" : "#f2efe9");
    if (btn) {
      btn.setAttribute("aria-pressed", mode === "ink" ? "true" : "false");
      $(".lights-label", btn).textContent = mode === "ink" ? "Paper" : "Ink";
    }
  };

  let saved = null;
  try { saved = localStorage.getItem("agk-mode"); } catch (e) {}
  if (saved) apply(saved);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) apply("ink");

  btn &&
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-mode") === "ink" ? "paper" : "ink";
      apply(next);
      try { localStorage.setItem("agk-mode", next); } catch (e) {}
    });
})();

/* ── letterpress headline: wrap words so they can rise out of the rule ── */
$$("[data-type]").forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  words.forEach((w, i) => {
    const outer = document.createElement("span");
    const inner = document.createElement("i");
    inner.textContent = w;
    inner.style.transitionDelay = `${60 + i * 42}ms`;
    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
  });
});

/* ── reveal on entry ────────────────────────────────────────────────── */
(function reveals() {
  const items = $$(".rise, .type-line");
  if (!("IntersectionObserver" in window) || reduced) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        // stagger siblings that reveal together
        const group = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.classList.contains("rise")) : [];
        const idx = Math.max(0, group.indexOf(el));
        el.style.transitionDelay = `${Math.min(idx, 6) * 70}ms`;
        el.classList.add("in");
        io.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
  );
  items.forEach((el) => io.observe(el));
})();

/* ── counters ───────────────────────────────────────────────────────── */
(function counters() {
  const nums = $$("[data-count]");
  if (!nums.length) return;
  if (reduced || !("IntersectionObserver" in window)) {
    nums.forEach((n) => (n.textContent = n.dataset.count));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.count, 10) || 0;
        const dur = 900;
        const t0 = performance.now();
        const step = (t) => {
          const p = clamp((t - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(target * eased)).padStart(2, "0");
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  nums.forEach((n) => io.observe(n));
})();

/* ── ledger accordion ───────────────────────────────────────────────── */
$$(".entry-row").forEach((row) => {
  row.addEventListener("click", () => {
    const entry = row.closest(".entry");
    const open = row.getAttribute("aria-expanded") === "true";
    $$(".entry").forEach((e) => {
      if (e === entry) return;
      e.classList.remove("open");
      const r = $(".entry-row", e);
      if (r) r.setAttribute("aria-expanded", "false");
    });
    entry.classList.toggle("open", !open);
    row.setAttribute("aria-expanded", String(!open));
  });
});

/* ── mobile index sheet ─────────────────────────────────────────────── */
(function indexSheet() {
  const btn = $("#index-btn");
  const sheet = $("#index-sheet");
  if (!btn || !sheet) return;
  const close = () => {
    sheet.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "Index";
    document.body.style.overflow = "";
  };
  btn.addEventListener("click", () => {
    const open = sheet.hidden;
    sheet.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Close" : "Index";
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$("a", sheet).forEach((a) => a.addEventListener("click", close));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();

/* ── masthead ruler + section readout (single scroll loop) ──────────── */
(function ruler() {
  const ticks = $("#ruler-ticks");
  const fill = $("#ruler-fill");
  const read = $("#ruler-read");
  const links = $$(".mh-nav a");
  const sections = $$("main .folio");

  if (ticks) {
    const n = 48;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      if (i % 4 === 3) s.className = "major";
      ticks.appendChild(s);
    }
  }

  let queued = false;
  const update = () => {
    queued = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    if (fill) fill.style.transform = `scaleX(${p})`;

    const probe = window.scrollY + window.innerHeight * 0.35;
    let current = sections[0];
    sections.forEach((s) => { if (s.offsetTop <= probe) current = s; });
    if (current) {
      const id = current.id;
      const label = $(".rail-label", current);
      const no = $(".rail-no", current);
      if (read && label && no) read.textContent = `${no.textContent} · ${label.textContent}`;
      links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${id}`));
    }
  };

  window.addEventListener(
    "scroll",
    () => { if (!queued) { queued = true; requestAnimationFrame(update); } },
    { passive: true }
  );
  window.addEventListener("resize", update);
  update();
})();

/* ── crosshair readout ──────────────────────────────────────────────── */
(function crosshair() {
  const el = $("#crosshair");
  const read = $("#crosshair-read");
  if (!el || reduced) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let raf = null, x = 0, y = 0;
  window.addEventListener("mousemove", (e) => {
    x = e.clientX; y = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      el.classList.add("on");
      el.style.setProperty("--cx", `${x}px`);
      el.style.setProperty("--cy", `${y}px`);
      if (read) {
        read.textContent = `X ${String(Math.round(x)).padStart(4, "0")}  Y ${String(Math.round(y + window.scrollY)).padStart(4, "0")}`;
      }
    });
  }, { passive: true });
  document.addEventListener("mouseleave", () => el.classList.remove("on"));
})();

/* =========================================================================
   THE PRESS — set the falling words before they cross the baseline
   ========================================================================= */
(function press() {
  const sheet = $("#press-sheet");
  const field = $("#sheet-field");
  const input = $("#press-input");
  const buffer = $("#press-buffer");
  const overlay = $("#press-overlay");
  const startBtn = $("#press-start");
  if (!sheet || !field || !input) return;

  const scoreEl = $("#press-score");
  const bestEl = $("#press-best");
  const livesEl = $("#press-lives");
  const titleEl = $("#press-title");
  const copyEl = $("#press-copy");
  const proofs = $$("#proofs li");
  const proofsCount = $("#proofs-count");

  const WORDS = [
    "flutter", "dart", "bloc", "riverpod", "widget", "isolate", "async",
    "swift", "kotlin", "xcode", "gradle", "provider", "stream", "future",
    "ledger", "escrow", "iban", "swift-mt", "clearing", "settlement",
    "clean", "usecase", "repository", "entity", "adapter", "boundary",
    "docker", "jenkins", "pipeline", "rollback", "canary", "hotfix",
    "fastapi", "firebase", "sqlite", "graphql", "webhook", "token",
    "refactor", "coverage", "regression", "profiler", "jank", "frame",
    "review", "merge", "rebase", "semver", "changelog", "release",
  ];

  const BEST_KEY = "agk-press-best";
  let best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (e) {}
  if (bestEl) bestEl.textContent = String(best);

  let running = false;
  let paused = false;
  let score = 0;
  let lives = 3;
  let live = [];
  let last = 0;
  let sinceSpawn = 0;
  let raf = null;
  let bag = [];

  const bufText = buffer ? buffer.querySelector("span") : null;
  const setBuffer = (v) => { if (bufText) bufText.textContent = v; };

  const nextWord = () => {
    if (!bag.length) {
      bag = WORDS.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  };

  const setLives = () => {
    if (!livesEl) return;
    Array.from(livesEl.children).forEach((em, i) => em.classList.toggle("spent", i >= lives));
  };

  const markProofs = () => {
    let pulled = 0;
    proofs.forEach((li) => {
      const at = parseInt(li.dataset.at, 10);
      const done = score >= at;
      li.classList.toggle("pulled", done);
      if (done) pulled++;
    });
    if (proofsCount) proofsCount.textContent = String(pulled);
  };

  const spawn = () => {
    const text = nextWord();
    if (live.some((w) => w.text[0] === text[0])) return; // keep first letters unique
    const el = document.createElement("span");
    el.className = "word";
    el.textContent = text;
    field.appendChild(el);
    const w = el.offsetWidth || 90;
    const x = Math.random() * Math.max(10, sheet.clientWidth - w - 20) + 10;
    const speed = Math.min(34 + score * 1.6, 116);
    const word = { el, text, x, y: 46, speed };
    el.style.transform = `translate(${x}px, ${word.y}px)`;
    live.push(word);
  };

  const removeWord = (word, cls) => {
    live = live.filter((w) => w !== word);
    word.el.classList.add(cls);
    setTimeout(() => word.el.remove(), 420);
  };

  const floor = () => sheet.clientHeight - 74;

  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    if (!running || paused) { last = t; return; }
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    sinceSpawn += dt;
    const gap = Math.max(0.95, 2.2 - score * 0.035);
    if (sinceSpawn >= gap && live.length < 6) { sinceSpawn = 0; spawn(); }

    for (const w of live.slice()) {
      w.y += w.speed * dt;
      w.el.style.transform = `translate(${w.x}px, ${w.y}px)`;
      if (w.y > floor()) {
        removeWord(w, "miss");
        lives--;
        setLives();
        setBuffer("");
        input.value = "";
        if (lives <= 0) return end();
      }
    }
  };

  const render = () => {
    const buf = input.value.toLowerCase();
    live.forEach((w) => {
      if (buf && w.text.startsWith(buf)) {
        w.el.innerHTML = `<b>${w.text.slice(0, buf.length)}</b>${w.text.slice(buf.length)}`;
      } else if (w.el.firstChild && w.el.firstChild.nodeName === "B") {
        w.el.textContent = w.text;
      }
    });
  };

  input.addEventListener("input", () => {
    if (!running) { input.value = ""; return; }
    const buf = input.value.toLowerCase().replace(/[^a-z-]/g, "");
    input.value = buf;

    const exact = live.find((w) => w.text === buf);
    if (exact) {
      removeWord(exact, "hit");
      score++;
      if (scoreEl) scoreEl.textContent = String(score);
      markProofs();
      input.value = "";
      setBuffer("");
      render();
      return;
    }

    // reject keystrokes that can't lead anywhere — forgiving, not punishing
    if (buf && !live.some((w) => w.text.startsWith(buf))) {
      input.value = buf.slice(0, -1);
    }
    setBuffer(input.value);
    render();
  });

  const start = () => {
    running = true;
    score = 0;
    lives = 3;
    sinceSpawn = 1.6;
    live.forEach((w) => w.el.remove());
    live = [];
    if (scoreEl) scoreEl.textContent = "0";
    setLives();
    markProofs();
    setBuffer("");
    input.value = "";
    overlay && overlay.classList.add("gone");
    input.focus({ preventScroll: true });
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const end = () => {
    running = false;
    live.forEach((w) => removeWord(w, "miss"));
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
      if (bestEl) bestEl.textContent = String(best);
    }
    if (titleEl) titleEl.textContent = `${score} set`;
    if (copyEl) {
      copyEl.textContent =
        score >= 40 ? "The full run. Every proof pulled — that is the whole résumé, typed."
        : score >= 18 ? "Good hands. Three proofs or more are on the wall."
        : score >= 8 ? "Warm. The plate speeds up the longer you hold it."
        : "The press waits. Try again.";
    }
    if (startBtn) startBtn.textContent = "Run it again";
    overlay && overlay.classList.remove("gone");
  };

  startBtn && startBtn.addEventListener("click", start);
  sheet.addEventListener("click", () => { if (running) input.focus({ preventScroll: true }); });

  // start by simply typing while the press is on screen
  document.addEventListener("keydown", (e) => {
    if (running || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!/^[a-z]$/i.test(e.key)) return;
    const r = sheet.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.6 || r.bottom < 120) return;
    start();
  });

  // pause when the sheet leaves the screen or the tab is hidden
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([e]) => { paused = !e.isIntersecting; },
      { threshold: 0.2 }
    ).observe(sheet);
  }
  document.addEventListener("visibilitychange", () => { paused = document.hidden; });
})();

/* ── colophon signature ─────────────────────────────────────────────── */
console.log(
  "%cAKASH G KRISHNAN%c\nThree hand-written files. No frameworks, no webfonts.\nSource: github.com/akashgk/akashgk.github.io",
  "font: 600 13px ui-monospace, monospace; letter-spacing: .18em;",
  "font: 12px ui-monospace, monospace; color:#8d8779;"
);
