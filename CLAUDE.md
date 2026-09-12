# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static personal portfolio website for Akash G Krishnan, deployed at [akashgk.com](https://akashgk.com) via GitHub Pages.

## Development

No build step or package manager — all files are plain HTML, CSS, and vanilla JS. Open `index.html` directly in a browser or use any local static server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main portfolio page (the dossier) |
| `styles.css` | All styles for the main page |
| `script.js` | All JS for the main page |
| `privacy.html` | Privacy policy page |
| `wa.html` | WhatsApp-related utility page |
| `valentines.html` | Personal/fun page |
| `troy.html` | Standalone Trojan War / Odyssey learning page |
| `sitemap.xml` | SEO sitemap |
| `CNAME` | GitHub Pages custom domain (`akashgk.com`) |

## Architecture

**Main page (`index.html` + `styles.css` + `script.js`)** is a single page laid out as a
printed **dossier** — a numbered document rather than a scrolling brochure. Sections in
order: Masthead (title block) → 01 Opening → 02 Record → 03 Index → 04 Catalogue →
05 Press → 06 Contact → Colophon.

**Design system** ("Dossier", defined in `styles.css` `:root`):
- Two inks, one layout. `:root` is the paper stock (warm off-white `--paper: #f2efe9`,
  near-black `--ink`); `html[data-mode="ink"]` swaps the same tokens for a dark warm
  sheet. The toggle lives in the masthead, persists to `localStorage` under `agk-mode`,
  falls back to `prefers-color-scheme`, and rewrites `<meta name="theme-color">`
- One accent only: a redline vermilion (`--accent`) used for marginal marks, section
  numbers, hover rules and the stamp. No gradients anywhere
- Typography is the whole design: a **system serif** display stack (Iowan Old Style →
  Palatino → Georgia) for headlines and prose, and `ui-monospace` for every label,
  number, nav item and piece of marginalia. Still no webfonts, by design
- Hairline rules (`--rule`) do the work borders and cards used to do. There is no `.card`
  class and no glass; surfaces are flat paper, and `.folio-tint` sections are a slightly
  darker stock painted full-bleed by a `::before` (clipped by `main { overflow-x: clip }`,
  which also clips the `-100vw` row-hover bleeds without creating a scroll container)
- A fixed `.grain` layer applies SVG `feTurbulence` noise (`multiply` on paper,
  `overlay` on ink) so the page reads as stock, not screen
- Every section is a `.folio`: a two-column grid of a sticky numbered `.rail`
  (`01 / OPENING`) plus `.folio-body`, collapsing to a stacked header under 860px

**Motion language** — mechanical, never floaty. No blur-up, no parallax, no pinning:
- `.rise` (translateY + opacity) via one `IntersectionObserver`, staggered by sibling index
- `.type-line` letterpress reveal: JS wraps each word in `span > i` so the words rise out
  of an overflow-hidden box, per-word delay
- Masthead `.ruler`: a tick-marked measuring rule whose fill tracks scroll progress, with
  a mono readout of the current section and a sliding underline on the active nav link
- `.entry` / `.cat-item` hover: a full-bleed tint band plus a padding-left nudge
- Desktop-only `.crosshair`: hairline cursor guides with an `X 0000 Y 0000` mono readout
- All of it is disabled under `prefers-reduced-motion`

**Interactive pieces** (`script.js`, loaded with `defer`, no libraries):
- **The Record** (`#record`): the CV as a ledger table. Rows are `<button>`s that expand a
  detail panel via an animated `grid-template-rows: 0fr → 1fr`; opening one closes the rest
- **The Index** (`#index`): the stack set as a book index with dotted leaders — a flexed
  `.leader` element between term and note
- **The Press** (`#press`): the arcade. Mono words fall down a ruled sheet and you type
  them before they cross the baseline; three misprints ends the run. A visually hidden
  `<input>` captures keystrokes (so mobile keyboards work), keystrokes that can not prefix
  any live word are rejected rather than penalised, matched prefixes bold in place, and
  score thresholds unlock the five career "proofs" in the margin. Best score persists to
  `localStorage` (`agk-press-best`). One rAF loop, paused by `IntersectionObserver` when
  the sheet leaves the screen and by `visibilitychange`
- Vitals counters, Doha clock, mobile index sheet, console colophon

**Icons**: none. The old Feather SVG set and the `ICONS` map are gone — labels, rules and
type carry the meaning instead, which is also why the page makes zero icon requests.

**Analytics**: Google Analytics (`G-SKBCVDV7G0`) is deferred by 3 seconds to avoid blocking
initial render.

## Deployment

Pushing to `main` auto-deploys via GitHub Pages. The `CNAME` file sets the custom domain.
