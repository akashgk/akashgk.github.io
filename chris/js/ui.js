// Thin wrapper around the DOM overlay. No scene touches document directly.
const $ = (id) => document.getElementById(id);

export function createUI(content, music) {
  // Hints say {scroll}; a phone reads "Swipe up", a computer reads "Scroll".
  const coarse = matchMedia('(pointer: coarse)').matches;
  const say = (t) => (t ? t.replace('{scroll}', coarse ? content.ui.scrollTouch : content.ui.scrollMouse) : t);
  const root = document.documentElement;
  root.classList.toggle('coarse', coarse);
  const el = { root, title: $('title'), caption: $('caption'), hint: $('hint'), next: $('next'), replay: $('replay'), mic: $('mic'),
    card: $('card'), cardPhoto: $('card-photo'), cardDate: $('card-date'), cardCaption: $('card-caption'), cardHint: $('card-hint'),
    leader: $('leader'), progress: $('progress'), mute: $('mute'), loader: $('loader'), sr: $('sr-letter') };
  el.next.querySelector('span').textContent = say(content.ui.next);
  el.replay.textContent = content.letter.replay;
  for (let i = 0; i < 5; i++) el.progress.appendChild(document.createElement('li'));

  // Before the music has begun the button reads as "off": on a computer, scrolling with a wheel
  // is not a gesture browsers accept for sound, so this one click is how it starts there.
  const paintMute = () => {
    const off = !music.started || music.muted;
    el.mute.setAttribute('aria-pressed', String(off));
    el.mute.setAttribute('aria-label', off ? content.ui.unmuteLabel : content.ui.muteLabel);
  };
  el.mute.addEventListener('click', () => { if (!music.started) music.start(); else music.toggle(); paintMute(); });
  if (!coarse) { el.mute.hidden = false; paintMute(); }
  music.onStart(() => { el.mute.hidden = false; paintMute(); });

  // Photos are fetched ahead of time and only shown if they really decoded.
  const photos = new Map();
  let captionTimers = [], titleTimer = 0;

  return {
    el,
    say,
    ready() {
      document.documentElement.classList.add('ready');
      el.loader.classList.add('gone');
      setTimeout(() => el.loader.remove(), 1000);
    },
    setProgress(i) {
      [...el.progress.children].forEach((li, n) => { li.className = n < i ? 'past' : n === i ? 'now' : ''; });
      el.progress.setAttribute('aria-label', `Part ${i + 1} of 5`);
    },
    title(text, kind = '') {
      clearTimeout(titleTimer);
      if (!text) { el.title.classList.remove('on'); return; }
      const swap = () => { el.title.textContent = text; el.title.className = `${kind} on`; };
      if (el.title.classList.contains('on')) { el.title.classList.remove('on'); titleTimer = setTimeout(swap, 700); } else swap();
    },
    hint(text) {
      if (text) { el.hint.textContent = say(text); el.hint.classList.add('on'); } else el.hint.classList.remove('on');
    },
    next(show, onClick) {
      el.next.hidden = !show;
      el.next.onclick = show ? onClick : null;
    },
    /** 0..1 as she scrolls toward the next step; the cue fills and leans with it. */
    pull(p) { root.style.setProperty('--pull', Math.max(0, p).toFixed(3)); },
    /** While she is turning something by hand. */
    grab(on) { root.classList.toggle('grabbing', on); },
    /** A tap does not move the story; nudge whatever is telling her how. */
    poke() {
      for (const n of [el.hint, el.next, el.cardHint]) {
        n.classList.remove('poke'); void n.offsetWidth; n.classList.add('poke');
      }
    },
    replay(show, onClick) {
      el.replay.hidden = !show;
      el.replay.onclick = show ? onClick : null;
    },
    mic(text, onClick) {
      el.mic.hidden = !text;
      if (text) el.mic.textContent = text;
      el.mic.onclick = onClick || null;
      el.mic.disabled = !onClick;
    },
    /** Reveal words one at a time; `then` runs when the last word is on screen. */
    caption(text, { perWord = 340, delay = 0, then } = {}) {
      this.clearCaption();
      el.caption.classList.remove('out');
      const spans = text.split(' ').map((w, i, a) => {
        const s = document.createElement('span');
        s.textContent = i < a.length - 1 ? `${w} ` : w;
        el.caption.appendChild(s);
        return s;
      });
      spans.forEach((s, i) => captionTimers.push(setTimeout(() => s.classList.add('on'), delay + i * perWord)));
      captionTimers.push(setTimeout(() => then?.(), delay + spans.length * perWord + 900));
      this._captionThen = then;
    },
    finishCaption() {
      captionTimers.forEach(clearTimeout); captionTimers = [];
      el.caption.querySelectorAll('span').forEach((s) => s.classList.add('on'));
      const then = this._captionThen; this._captionThen = null; then?.();
    },
    clearCaption() {
      captionTimers.forEach(clearTimeout); captionTimers = [];
      this._captionThen = null;
      el.caption.textContent = '';
    },
    hideCaption() { el.caption.classList.add('out'); },
    preloadPhoto(src) {
      if (!src || photos.has(src)) return;
      const img = new Image();
      img.decoding = 'async';
      const entry = { ok: false };
      photos.set(src, entry);
      img.onload = () => { entry.ok = true; entry.ratio = img.naturalWidth / img.naturalHeight; };
      img.onerror = () => {};
      img.src = src;
    },
    showCard(m, hintText) {
      const photo = m.photo && photos.get(m.photo)?.ok ? m.photo : null;
      el.cardDate.textContent = m.date;
      el.cardCaption.textContent = m.caption;
      el.cardHint.textContent = say(hintText) || '';
      el.cardPhoto.hidden = !photo;
      el.card.classList.toggle('text-only', !photo);
      if (photo) { const img = el.cardPhoto.firstElementChild; img.src = photo; img.alt = m.photoAlt || ''; }
      el.card.style.setProperty('--tilt', `${(m.date.length % 3) - 1.2}deg`);
      el.card.hidden = false;
      void el.card.offsetWidth;
      el.card.classList.add('on');
    },
    hideCard() {
      el.card.classList.remove('on');
      el.leader.classList.remove('on');
      setTimeout(() => { if (!el.card.classList.contains('on')) el.card.hidden = true; }, 800);
    },
    /** Hairline from a star on screen to the top of the card. */
    leader(x, y) {
      if (el.card.hidden || !el.card.classList.contains('on')) return;
      const r = el.card.getBoundingClientRect();
      const tx = r.left + r.width * 0.5, ty = r.top + 4;
      const dx = tx - x, dy = ty - y;
      el.leader.style.width = `${Math.hypot(dx, dy)}px`;
      el.leader.style.transform = `translate(${x}px,${y}px) rotate(${Math.atan2(dy, dx)}rad)`;
      el.leader.classList.add('on');
    },
    clearAll() {
      this.title(null); this.hint(null); this.next(false); this.replay(false); this.mic(null);
      this.clearCaption(); this.hideCard(); el.sr.textContent = '';
    },
    srLetter(text) { el.sr.textContent = text; },
  };
}
