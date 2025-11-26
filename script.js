// 1. Initialize Icons
feather.replace();

// 2. Theme Toggle Logic
const themeBtn = document.getElementById("themeBtn");
const body = document.body;
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

const savedTheme = localStorage.getItem("theme") || "dark";
body.setAttribute("data-theme", savedTheme);
updateBtn(savedTheme);

themeBtn.addEventListener("click", () => {
  const current = body.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  body.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateBtn(next);
});

function updateBtn(theme) {
  themeBtn.innerHTML = theme === "dark" ? sunIcon : moonIcon;
}

// 3. Canvas Grid Animation (Improved)
const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");
let width, height;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

let offset = 0;
function animateCanvas() {
  ctx.clearRect(0, 0, width, height);
  const isDark = body.getAttribute("data-theme") === "dark";
  
  // Subtle gradient lines
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  if (isDark) {
    gradient.addColorStop(0, "rgba(0, 242, 234, 0.05)");
    gradient.addColorStop(1, "rgba(168, 85, 247, 0.05)");
  } else {
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.03)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.03)");
  }
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1;

  offset += 0.2;
  if (offset > 40) offset = 0;

  ctx.beginPath();
  // Vertical lines
  for (let x = 0; x <= width; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  // Horizontal lines (moving)
  for (let y = offset; y <= height; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  requestAnimationFrame(animateCanvas);
}
animateCanvas();

// 4. Spotlight Effect (Mouse Follower)
document.addEventListener("mousemove", (e) => {
  const cards = document.querySelectorAll(".bento-card");
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  });
});

// 5. Scroll Reveal Animation
const revealElements = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("active");
    }
  });
}, { threshold: 0.1 });

revealElements.forEach((el) => revealObserver.observe(el));

// 6. Text Scramble Effect for Hero Title
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.update = this.update.bind(this);
  }
  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => this.resolve = resolve);
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }
  update() {
    let output = '';
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="dud">${char}</span>`;
      } else {
        output += from;
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  }
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

// Initialize Text Scramble
const el = document.querySelector('.hero-title');
if (el) {
  const fx = new TextScramble(el);
  // Optional: Scramble on load or hover. For now, just let it be static or simple fade in.
  // To use: fx.setText('Akash G Krishnan');
}

// 7. Defer Analytics
const loadAnalytics = () => {
  const script = document.createElement("script");
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-SKBCVDV7G0";
  script.async = true;
  document.body.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "G-SKBCVDV7G0");
};

if ('requestIdleCallback' in window) {
  requestIdleCallback(() => setTimeout(loadAnalytics, 2000));
} else {
  window.addEventListener("load", () => setTimeout(loadAnalytics, 3000));
}

// Set Year
document.getElementById("year").textContent = new Date().getFullYear();
