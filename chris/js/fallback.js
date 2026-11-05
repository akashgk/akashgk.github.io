// The 2D version: same words, same order, no WebGL and no libraries. Also used if the CDN is unreachable.
import { burstHearts } from './hearts.js';

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

const skyPts = (n) => Array.from({ length: n }, (_, i) => [i % 2 ? 66 + 14 * Math.sin(i * 2.3) : 22 - 8 * Math.sin(i * 1.9), 94 - (89 * i) / Math.max(1, n - 1)]);
const HEART = (i, n) => {
  const t = Math.PI + (i / n) * Math.PI * 2, s = Math.sin(t);
  return [50 + 40 * s * s * s, 50 - 2.5 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2)];
};

function starCanvas(root, reduced) {
  const c = document.createElement('canvas');
  c.className = 'sky';
  root.appendChild(c);
  const g = c.getContext('2d');
  const stars = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() ** 3 * 1.5 + 0.35, p: Math.random() * 6.3 }));
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); c.width = innerWidth * d; c.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); };
  size(); addEventListener('resize', size);
  const draw = (ms) => {
    g.clearRect(0, 0, innerWidth, innerHeight);
    stars.forEach((s) => {
      g.globalAlpha = reduced ? 0.7 : 0.45 + Math.sin(ms / 1400 + s.p) * 0.35;
      g.fillStyle = '#fbf0dc';
      g.beginPath(); g.arc(s.x * innerWidth, s.y * innerHeight, s.r, 0, 7); g.fill();
    });
    if (!reduced) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

async function drawGlobe(canvas, cfg, reduced) {
  const { LAND_B64, MASK_W, MASK_H, CITIES } = await import('./data/earth-data.js');
  const bin = atob(LAND_B64);
  const land = (lat, lon) => { const i = Math.min(MASK_H - 1, Math.floor(90 - lat)) * MASK_W + Math.min(MASK_W - 1, Math.floor(lon + 180)); return (bin.charCodeAt(i >> 3) >> (i & 7)) & 1; };
  const d = Math.min(devicePixelRatio || 1, 2), S = canvas.clientWidth * d;
  canvas.width = canvas.height = S;
  const g = canvas.getContext('2d'), R = S * 0.46, cx = S / 2, cy = S / 2;
  const rad = Math.PI / 180, lon0 = 64 * rad, lat0 = 22 * rad;
  const proj = (lat, lon) => {
    const p = lat * rad, l = lon * rad - lon0;
    const x = Math.cos(p) * Math.sin(l), y = Math.sin(p) * Math.cos(lat0) - Math.cos(p) * Math.cos(l) * Math.sin(lat0);
    const z = Math.sin(p) * Math.sin(lat0) + Math.cos(p) * Math.cos(l) * Math.cos(lat0);
    return [cx + x * R, cy - y * R, z];
  };
  const base = g.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.08);
  base.addColorStop(0, '#060a22'); base.addColorStop(0.92, '#0e1a52'); base.addColorStop(1, 'rgba(40,60,160,0)');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let lat = -88; lat < 90; lat += 1.7) {
    const step = 1.7 / Math.max(0.15, Math.cos(lat * rad));
    for (let lon = -180; lon < 180; lon += step) {
      if (!land(lat, lon)) continue;
      const [x, y, z] = proj(lat, lon);
      if (z < 0.04) continue;
      g.fillStyle = `rgba(90,120,210,${0.5 * z})`; g.fillRect(x, y, d, d);
    }
  }
  g.fillStyle = '#ffcf86';
  for (let i = 0; i < CITIES.length; i += 2) { const [x, y, z] = proj(CITIES[i], CITIES[i + 1]); if (z > 0.05) g.fillRect(x, y, d * 1.4, d * 1.4); }
  const a = proj(cfg.from.lat, cfg.from.lon), b = proj(cfg.to.lat, cfg.to.lon);
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - R * 0.2;
  const frame = (ms) => {
    const k = reduced ? 1 : Math.min(1, ms / 2600);
    g.strokeStyle = '#f7b466'; g.lineWidth = 1.8 * d; g.shadowColor = '#f2c879'; g.shadowBlur = 10 * d;
    g.beginPath(); g.moveTo(a[0], a[1]);
    for (let i = 1; i <= 40 * k; i++) { const t = i / 40, q = 1 - t; g.lineTo(q * q * a[0] + 2 * q * t * mx + t * t * b[0], q * q * a[1] + 2 * q * t * my + t * t * b[1]); }
    g.stroke(); g.shadowBlur = 0;
    if (k < 1) requestAnimationFrame((n) => frame(n)); else {
      g.font = `italic ${17 * d}px "Instrument Serif", Georgia, serif`; g.fillStyle = '#fbeed6';
      g.textAlign = 'left'; g.fillText(cfg.from.name, a[0] + 7 * d, a[1] + 4 * d);
      g.textAlign = 'right'; g.fillText(cfg.to.name, b[0] - 7 * d, b[1] + 4 * d);
    }
  };
  frame(reduced ? 1e9 : 0);
  if (!reduced) { const t0 = performance.now(); const run = (n) => { frame(n - t0); }; requestAnimationFrame(run); }
}

function confettiBurst(root, reduced) {
  if (reduced) return;
  const c = document.createElement('canvas'); c.id = 'fbconfetti'; root.appendChild(c);
  const d = Math.min(devicePixelRatio || 1, 2); c.width = innerWidth * d; c.height = innerHeight * d;
  const g = c.getContext('2d'); g.scale(d, d);
  const colors = ['#f2c879', '#ee8fa6', '#fbe3b0', '#f7b6c4'];
  const bits = Array.from({ length: 130 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.5, vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 8, r: Math.random() * 6, s: 3 + Math.random() * 5, c: colors[Math.floor(Math.random() * 4)] }));
  const t0 = performance.now();
  const tick = (now) => {
    g.clearRect(0, 0, innerWidth, innerHeight);
    bits.forEach((b) => {
      b.vy += 0.09; b.vx *= 0.992; b.x += b.vx; b.y += b.vy; b.r += 0.08;
      g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.s / 2, -b.s / 3, b.s, b.s * Math.abs(Math.cos(b.r)) * 0.8 + 1); g.restore();
    });
    if (now - t0 < 7000) requestAnimationFrame(tick); else c.remove();
  };
  requestAnimationFrame(tick);
}

export function startFallback({ content, ui, gestures, reduced }) {
  const root = document.getElementById('fallback');
  root.hidden = false;
  starCanvas(root, reduced);
  const { milestones } = content.story;
  const SKY_PTS = skyPts(milestones.length);
  milestones.forEach((m) => ui.preloadPhoto(m.photo));
  let step = 0, lit = 0, onTap = () => {};

  const scene = (node) => {
    root.querySelectorAll('.fb-scene').forEach((s) => { s.classList.remove('on'); setTimeout(() => s.remove(), 1200); });
    root.appendChild(node);
    void node.offsetWidth;
    node.classList.add('on');
    return node;
  };
  const next = () => { ui.next(false); ui.hint(null); ui.clearCaption(); step++; [gift, sky, globe, cake, letter][step](); };
  const allowNext = () => { onTap = next; ui.next(true, () => gestures.beat()); };

  function gift() {
    ui.setProgress(0);
    const n = scene(h(`<div class="fb-scene"><h1 class="fb-h grand"></h1><div class="fb-gift"><i class="b"></i><i class="l"></i><i class="r"></i></div></div>`));
    n.querySelector('h1').textContent = content.gift.title;
    ui.hint(content.gift.hint);
    onTap = () => {
      onTap = () => {};
      ui.hint(null);
      n.querySelector('.fb-gift').classList.add('open');
      setTimeout(next, 1500);
    };
  }

  function sky() {
    ui.setProgress(1);
    const n = scene(h(`<div class="fb-scene"><h2 class="fb-h" style="font-style:italic;color:var(--gold)"></h2><svg class="fb-sky" viewBox="0 0 100 100" aria-hidden="true"></svg><div class="slot"></div></div>`));
    n.querySelector('h2').textContent = content.story.title;
    const svg = n.querySelector('svg'), slot = n.querySelector('.slot');
    const ns = 'http://www.w3.org/2000/svg';
    const edges = [], dots = SKY_PTS.map(([x, y]) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('class', 'st'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 1.8); return c; });
    for (let i = 0; i < SKY_PTS.length - 1; i++) {
      const e = document.createElementNS(ns, 'line');
      e.setAttribute('class', 'edge'); e.setAttribute('pathLength', 1);
      e.setAttribute('x1', SKY_PTS[i][0]); e.setAttribute('y1', SKY_PTS[i][1]); e.setAttribute('x2', SKY_PTS[i + 1][0]); e.setAttribute('y2', SKY_PTS[i + 1][1]);
      svg.appendChild(e); edges.push(e);
    }
    dots.forEach((d) => svg.appendChild(d));
    const showNextStar = () => {
      if (lit >= milestones.length) return toHeart();
      const m = milestones[lit];
      dots[lit].classList.add('on');
      if (lit > 0) edges[lit - 1].classList.add('on');
      const card = h('<div class="fb-card"><b></b><p></p><small class="fb-hint"></small></div>');
      card.querySelector('small').textContent = ui.say(lit < milestones.length - 1 ? content.story.hintNext : content.story.hintCard);
      card.querySelector('b').textContent = m.date;
      card.querySelector('p').textContent = m.caption;
      if (m.photo) {
        const img = new Image();
        img.alt = m.photoAlt || '';
        img.onload = () => card.prepend(img);
        img.src = m.photo;
      }
      slot.replaceChildren(card);
      lit++;
      ui.hint(null);
    };
    const toHeart = () => {
      slot.replaceChildren();
      ui.hint(null);
      svg.replaceChildren();
      const pts = Array.from({ length: 80 }, (_, i) => HEART(i, 80).map((v) => v.toFixed(2)).join(',')).join(' ');
      const p = document.createElementNS(ns, 'polygon');
      p.setAttribute('points', pts); p.setAttribute('class', 'edge'); p.setAttribute('pathLength', 1);
      p.style.transitionDuration = '2.6s';
      svg.appendChild(p);
      void p.getBoundingClientRect();
      p.classList.add('on');
      allowNext();
    };
    onTap = showNextStar;
    showNextStar();
  }

  function globe() {
    ui.setProgress(2);
    const n = scene(h('<div class="fb-scene" style="justify-content:flex-start"><canvas class="fb-map" aria-hidden="true"></canvas></div>'));
    drawGlobe(n.querySelector('canvas'), content.globe, reduced).catch(() => {});
    onTap = () => ui.finishCaption();
    ui.caption(content.globe.caption, { perWord: reduced ? 150 : 380, delay: 900, then: allowNext });
  }

  function cake() {
    ui.setProgress(3);
    const n = scene(h(`<div class="fb-scene"><h2 class="fb-h" style="transition:opacity .8s"></h2>
      <svg class="fb-cake" viewBox="0 0 200 190" aria-hidden="true">
        <g font-family="Instrument Serif, Georgia, serif" font-size="46" font-weight="700" text-anchor="middle" fill="#fbeef0"><text x="82" y="82">3</text><text x="118" y="82">1</text></g>
        <path class="fb-flame" fill="#ffc266" d="M82 48c-6-7-5-13 0-20 5 7 6 13 0 20z"/><path class="fb-flame" fill="#ffc266" d="M118 48c-6-7-5-13 0-20 5 7 6 13 0 20z"/>
        <rect x="50" y="84" width="100" height="42" rx="3" fill="#f6e4cd"/><path d="M50 84h100v12c-6 10-10 0-16 3-5 2-6 14-12 8-5-6-9-5-14-2s-8 11-13 3-9-6-14-3-7 8-13 2-8-8-18-11z" fill="#c23b67"/>
        <rect x="26" y="126" width="148" height="46" rx="3" fill="#f6e4cd"/><path d="M26 126h148v10c-8 12-13 1-19 4s-8 12-14 6-11-5-17-2-9 12-15 4-12-7-18-3-10 9-16 2-10-8-19-3-15 2-30-8z" fill="#c23b67"/>
        <rect x="14" y="172" width="172" height="7" rx="3.500" fill="#e0a64e"/>
      </svg></div>`));
    n.querySelector('h2').textContent = content.cake.title;
    ui.hint(content.cake.hint);
    const blow = () => {
      onTap = () => {};
      ui.hint(null);
      n.classList.add('out');
      n.querySelector('h2').style.opacity = 0;
      setTimeout(() => { confettiBurst(root, reduced); burstHearts(innerWidth / 2, innerHeight * 0.45, reduced); }, 700);
      setTimeout(allowNext, 2400);
    };
    onTap = blow;
  }

  function letter() {
    ui.setProgress(4);
    const n = scene(h('<div class="fb-scene"><h2 class="fb-h" style="font-style:italic;color:var(--gold)"></h2></div>'));
    const title = n.querySelector('h2');
    const names = [content.name, ...content.nicknames, content.name];
    const paper = h('<div class="fb-paper" hidden></div>');
    [...content.letter.lines, content.letter.signature].forEach((l, i, a) => {
      const p = document.createElement('p'); p.textContent = l;
      if (i === a.length - 1) p.className = 'sig';
      paper.appendChild(p);
    });
    n.appendChild(paper);
    ui.srLetter([...content.letter.lines, content.letter.signature].join(' '));
    let i = 0;
    const setTitle = () => { title.textContent = `${content.letter.greeting} ${names[i]}`; };
    setTitle();
    const lines = [...paper.children];
    let timers = [];
    const showLetter = () => {
      paper.hidden = false;
      title.style.fontSize = '30px';
      lines.forEach((p, k) => timers.push(setTimeout(() => p.classList.add('on'), (reduced ? 200 : 1300) * k)));
      timers.push(setTimeout(ending, (reduced ? 200 : 1300) * lines.length));
      onTap = () => { timers.forEach(clearTimeout); lines.forEach((p) => p.classList.add('on')); ending(); };
    };
    const ending = () => {
      onTap = () => {};
      ui.replay(true, () => { ui.clearAll(); step = 0; lit = 0; gift(); });
    };
    const roll = setInterval(() => {
      i++;
      if (i >= names.length) { clearInterval(roll); showLetter(); return; }
      setTitle();
    }, reduced ? 1200 : 1800);
    onTap = () => { clearInterval(roll); i = names.length - 1; setTitle(); showLetter(); };
  }

  gestures.on({ beat: () => onTap(), pull: (p) => ui.pull(p), poke: () => ui.poke() });
  gift();
}
