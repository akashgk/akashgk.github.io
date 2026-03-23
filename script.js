// Init icons & year
feather.replace();
document.getElementById("year").textContent = new Date().getFullYear();

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
