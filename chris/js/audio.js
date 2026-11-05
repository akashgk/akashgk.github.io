// Music starts only inside the first real gesture. Web Audio is used for the gain because
// iOS ignores HTMLMediaElement.volume, so that is the only way to get a real fade.
export function createMusic({ src, volume = 0.55, fadeSeconds = 4 }) {
  let el = null, ctx = null, gain = null, muted = false, ducked = 1, pausedByHide = false;
  const listeners = new Set();

  const level = () => (muted ? 0 : volume * ducked);
  const ramp = (seconds) => {
    if (!gain) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(level(), now + seconds);
  };

  document.addEventListener('visibilitychange', () => {
    if (!el) return;
    if (document.hidden) { pausedByHide = !el.paused; el.pause(); }
    else if (pausedByHide) { ctx.resume().catch(() => {}); el.play().catch(() => {}); }
  });

  return {
    get started() { return !!el; },
    get muted() { return muted; },
    get playing() { return !!el && !el.paused; },
    get gainValue() { return gain ? gain.gain.value : 0; },
    start() {
      if (el) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* older Safari */ }
      el = new Audio(src);
      el.loop = true;
      el.preload = 'auto';
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
      gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
      ctx.resume().catch(() => {});
      el.play().then(() => ramp(fadeSeconds)).catch(() => {});
      listeners.forEach((fn) => fn());
    },
    toggle() { muted = !muted; ramp(0.5); return muted; },
    duck(on) { ducked = on ? 0.2 : 1; ramp(0.6); },
    onStart(fn) { listeners.add(fn); },
  };
}
