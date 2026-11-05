const HEART = 'M12 21s-7.6-4.9-9.7-9.3C.7 8.2 2.6 4 6.6 4c2.3 0 4.2 1.3 5.4 3.3C13.200 5.300 15.100 4 17.400 4c4 0 5.900 4.200 4.300 7.700C19.600 16.100 12 21 12 21z';
const COLORS = ['#ee8fa6', '#f2c879', '#f7b6c4', '#fbe3b0'];
const layer = () => document.getElementById('hearts');

export function burstHearts(x, y, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const count = reduced ? 3 : 11;
  for (let i = 0; i < count; i++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', HEART);
    path.setAttribute('fill', COLORS[i % COLORS.length]);
    svg.appendChild(path);
    layer().appendChild(svg);

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.5;
    const dist = reduced ? 34 : 54 + Math.random() * 84;
    const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
    const s = 0.55 + Math.random() * 0.75, r = (Math.random() - 0.5) * 50;
    const anim = svg.animate([
      { transform: `translate(${x}px,${y}px) scale(.2)`, opacity: 0 },
      { transform: `translate(${x + dx * 0.55}px,${y + dy * 0.55}px) scale(${s}) rotate(${r * 0.4}deg)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${x + dx}px,${y + dy - 34}px) scale(${s * 0.85}) rotate(${r}deg)`, opacity: 0 },
    ], { duration: reduced ? 1000 : 1200 + Math.random() * 800, easing: 'cubic-bezier(.2,.7,.25,1)', delay: reduced ? 0 : i * 18, fill: 'both' });
    anim.onfinish = () => svg.remove();
  }
}
