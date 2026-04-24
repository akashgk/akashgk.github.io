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
