// Music starts only inside the first real gesture. Web Audio is used for the gain because
// iOS ignores HTMLMediaElement.volume, so that is the only way to get a real fade.
export function createMusic({ src, volume = 0.55, fadeSeconds = 4 }) {
  let el = null, ctx = null, gain = null, muted = false, ducked = 1, pausedByHide = false;
  let analyser = null, bins = null, smooth = 0, slow = 0, peak = 0.08;
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
      const source = ctx.createMediaElementSource(el);
      source.connect(gain).connect(ctx.destination);
      // Listened to before the gain, so the world keeps moving to the music even when she mutes it.
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      bins = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      ctx.resume().catch(() => {});
      el.play().then(() => ramp(fadeSeconds)).catch(() => {});
      listeners.forEach((fn) => fn());
    },
    toggle() { muted = !muted; ramp(0.5); return muted; },
    /**
     * 0..1: how much the music is swelling right now, read once per frame. Before the track
     * plays (or if it never does) this is a slow resting heartbeat, so nothing waits on it.
     */
    sample(t) {
      if (!analyser || !el || el.paused) {
        const b = (t * 64 / 60) % 1;
        return Math.exp(-b * 9) * 0.8 + (b > 0.22 ? Math.exp(-(b - 0.22) * 9) * 0.45 : 0);
      }
      analyser.getByteFrequencyData(bins);
      let sum = 0;
      const n = 20; // the bottom of the spectrum: the piano's left hand
      for (let i = 1; i <= n; i++) sum += bins[i];
      const bass = sum / (n * 255);
      peak = Math.max(bass, peak * 0.9995, 0.04); // slow automatic gain, so a quiet nocturne still breathes
      const norm = bass / peak;
      slow += (norm - slow) * 0.03;
      smooth += (norm - smooth) * 0.3;
      return Math.min(1, Math.max(0, smooth * 0.55 + Math.max(0, smooth - slow) * 2.2));
    },
    duck(on) { ducked = on ? 0.2 : 1; ramp(0.6); },
    onStart(fn) { listeners.add(fn); },
  };
}
