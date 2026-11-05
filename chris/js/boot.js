// Smallest possible entry: decide between the 3D world and the 2D version, then load only that.
import { CONTENT } from '../content.js';
import { createMusic } from './audio.js';
import { createUI } from './ui.js';
import { createGestures } from './input.js';
import { burstHearts } from './hearts.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const music = createMusic(CONTENT.music);
const ui = createUI(CONTENT, music);
const gestures = createGestures({ onDoubleTap: burstHearts, onFirstGesture: () => music.start(), reduced });

let fallbackStarted = false;
async function startFallback() {
  if (fallbackStarted) return;
  fallbackStarted = true;
  document.getElementById('gl').hidden = true;
  const { startFallback: run } = await import('./fallback.js');
  run({ content: CONTENT, ui, gestures, music, reduced });
  ui.ready();
}

function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

async function start() {
  if (!hasWebGL2()) return startFallback();
  try {
    const { startWorld } = await import('./app.js');
    await startWorld({ content: CONTENT, ui, gestures, music, reduced, onFatal: startFallback });
    ui.ready();
  } catch (err) {
    // CDN unreachable, shader failure, anything: she still gets her gift.
    if (location.search.includes('debug')) console.info('3D unavailable, using 2D', err);
    startFallback();
  }
}
start();
