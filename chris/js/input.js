// One gesture layer for the whole page. Scrolling moves the story along; nothing needs a tap.
//
// The page itself never scrolls (the world is a fixed canvas). Instead, a swipe up on a phone
// or a wheel / trackpad scroll on a computer winds up a "pull" from 0 to 1. Crossing 1 is a
// beat: the story takes one step. While the pull is building, scenes and the cue can react
// to it, so the step feels attached to her finger rather than to a button.
//
// Horizontal drags stay drags (the globe spins). A double-tap still bursts hearts.
const SLOP = 10, DOUBLE_MS = 280, DOUBLE_SLOP = 44;
const WHEEL_QUIET = 200; // ms of wheel silence that ends a trackpad flick
const LOCK_MS = 650; // after a beat, ignore input this long so one flick is one step

export function createGestures({ onDoubleTap, onFirstGesture }) {
  const handlers = { beat: null, pull: null, poke: null, tap: null, drag: null, dragEnd: null };
  let start = null, last = null, axis = null, lastTap = null, firstDone = false;
  let pull = 0, lockedUntil = 0, wheelLast = 0, wheelSpent = false, settle = 0;

  const first = () => { if (!firstDone) { firstDone = true; onFirstGesture?.(); } };
  const isUI = (t) => t instanceof Element && t.closest('button,a');
  const distance = () => Math.min(170, Math.max(110, innerHeight * 0.2)); // finger travel for one step

  const setPull = (v) => {
    pull = Math.max(-0.25, Math.min(1, v));
    handlers.pull?.(pull);
  };
  const beat = () => {
    lockedUntil = performance.now() + LOCK_MS;
    setPull(0);
    handlers.beat?.();
  };
  const locked = () => performance.now() < lockedUntil;

  // Let go and the pull eases back to rest.
  const relax = () => {
    cancelAnimationFrame(settle);
    const step = () => {
      if (start && axis === 'v') return;
      if (Math.abs(pull) < 0.004) { setPull(0); return; }
      setPull(pull * 0.8);
      settle = requestAnimationFrame(step);
    };
    settle = requestAnimationFrame(step);
  };

  // ---------- touch and mouse drags ----------
  addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    cancelAnimationFrame(settle);
    // A swipe may start on a button (the cue sits right where a thumb rests); a tap there is the button's.
    start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, pull, ui: !!isUI(e.target) };
    last = { ...start, vx: 0, vy: 0 };
    axis = null;
  }, { passive: true });

  addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    const dt = Math.max(1, e.timeStamp - last.t);
    last = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, vx: dx / dt, vy: dy / dt };
    const ox = e.clientX - start.x, oy = e.clientY - start.y;
    if (!axis && Math.hypot(ox, oy) > SLOP) axis = Math.abs(oy) > Math.abs(ox) * 1.1 ? 'v' : 'h';
    if (axis === 'h') handlers.drag?.(dx, dy);
    else if (axis === 'v' && !locked()) {
      // A mouse drag on a computer reads the same way as a finger: up moves the story on.
      const p = start.pull + (-oy / distance());
      setPull(p < 0 ? p * 0.35 : p); // backwards only gives a little
      if (pull >= 1) { start.pull = 0; start.y = e.clientY; beat(); }
    }
  }, { passive: true });

  const end = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const s = start, l = last, a = axis;
    start = null; axis = null;
    if (e.type === 'pointercancel') { relax(); return; }
    if (!a && s.ui) return; // a press on a button is the button's business (the sound button starts music itself)
    first(); // inside the gesture, so browsers allow the audio to begin

    if (!a) {
      const now = e.timeStamp;
      if (lastTap && now - lastTap.t < DOUBLE_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_SLOP) {
        lastTap = null;
        onDoubleTap?.(e.clientX, e.clientY);
        return;
      }
      lastTap = { t: now, x: e.clientX, y: e.clientY };
      handlers.tap?.(e.clientX, e.clientY); // the world answers a touch, but only a scroll moves the story on
      handlers.poke?.();
      return;
    }
    if (a === 'h') { handlers.dragEnd?.(l?.vx || 0, l?.vy || 0); return; }
    // A quick flick counts even if it was short.
    const flick = -(l?.vy || 0) > 0.45 && pull > 0.3 && e.timeStamp - s.t < 600;
    if (!locked() && (pull >= 1 || flick)) beat();
    else relax();
  };
  addEventListener('pointerup', end, { passive: true });
  addEventListener('pointercancel', end, { passive: true });
  // iOS treats a touchend as the gesture that may start audio, even after the finger moved.
  addEventListener('touchend', (e) => { if (!isUI(e.target)) first(); }, { passive: true });

  // ---------- wheel and trackpad ----------
  addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    const gap = now - wheelLast;
    wheelLast = now;
    if (gap > WHEEL_QUIET) wheelSpent = false; // a fresh flick
    if (locked() || wheelSpent) { lockedUntil = Math.max(lockedUntil, now + 120); return; } // eat trackpad inertia
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 18; else if (e.deltaMode === 2) d *= innerHeight;
    cancelAnimationFrame(settle);
    setPull(pull + Math.max(-60, Math.min(60, d)) / 150);
    if (pull >= 1) { wheelSpent = true; beat(); return; }
    clearTimeout(end.wheelTimer);
    end.wheelTimer = setTimeout(relax, WHEEL_QUIET + 40);
  }, { passive: false });

  addEventListener('dblclick', (e) => e.preventDefault());
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    if (e.repeat || isUI(e.target)) return;
    if ([' ', 'Enter', 'ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) {
      e.preventDefault(); first();
      if (!locked()) beat();
    }
  });

  return {
    on(map) { Object.assign(handlers, map); },
    get pull() { return pull; },
    /** Take one step as if she had scrolled (used by the on-screen cue). */
    beat() { first(); if (!locked()) beat(); },
    first,
  };
}
