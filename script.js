// Initialize Icons
feather.replace();

// Set Year
document.getElementById("year").textContent = new Date().getFullYear();

// Initialize Scroll Observer
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      // Optional: Stop observing once visible to prevent re-triggering
      // observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(".fade-up").forEach((el) => {
  observer.observe(el);
});

// Mobile Menu Toggle
const mobileToggle = document.querySelector(".mobile-toggle");
const navLinks = document.querySelector(".nav-links");
const links = document.querySelectorAll(".nav-link");

if (mobileToggle) {
  mobileToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
    const icon = navLinks.classList.contains("active") ? "x" : "menu";
    mobileToggle.innerHTML = `<i data-feather="${icon}"></i>`;
    feather.replace();
  });

  links.forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      mobileToggle.innerHTML = `<i data-feather="menu"></i>`;
      feather.replace();
    });
  });
}

// Particle Network Animation (Canvas)
const canvas = document.getElementById("hero-canvas");
const ctx = canvas.getContext("2d");

let width, height;
let particles = [];
const particleCount = 60; // Adjust for density
const connectionDistance = 150;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

class Particle {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off edges
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 242, 234, 0.5)"; // Cyan
    ctx.fill();
  }
}

// Initialize Particles
for (let i = 0; i < particleCount; i++) {
  particles.push(new Particle());
}

// Animation Loop
function animate() {
  ctx.clearRect(0, 0, width, height);

  // Update and draw particles
  particles.forEach((p, index) => {
    p.update();
    p.draw();

    // Draw connections
    for (let j = index + 1; j < particles.length; j++) {
      const p2 = particles[j];
      const dx = p.x - p2.x;
      const dy = p.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < connectionDistance) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 242, 234, ${1 - dist / connectionDistance * 0.8})`; // Fade based on distance
        ctx.lineWidth = 0.5;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  });

  requestAnimationFrame(animate);
}

// Only run animation if device is powerful enough / prefs
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  animate();
}
