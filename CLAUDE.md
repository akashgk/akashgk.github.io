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
| `index.html` | Main portfolio page (single-page layout) |
| `styles.css` | All styles for the main page |
| `script.js` | All JS for the main page |
| `privacy.html` | Privacy policy page |
| `wa.html` | WhatsApp-related utility page |
| `valentines.html` | Personal/fun page |
| `sitemap.xml` | SEO sitemap |
| `CNAME` | GitHub Pages custom domain (`akashgk.com`) |

## Architecture

**Main page (`index.html` + `styles.css` + `script.js`)** is a single-page portfolio with these sections (in order): Hero → Marquee strip → Stats Bar → About → Experience → Skills (bento grid) → Open Source → Playground (canvas arcade game) → Contact → Footer.

**Design system** (defined in `styles.css` `:root`):
- Color palette: Space black (`--bg: #070709`), titanium tones (`--titanium-natural`, `--titanium-silver`); legacy `--violet`/`--amber` variables alias the titanium palette
- Fonts: System font stacks only (SF Pro / Segoe UI / Roboto for display & body, `ui-monospace` for mono) — no webfonts are loaded, by design, for performance
- CSS variables control all colors, spacing, and easing curves

**JS features** (`script.js`, loaded with `defer`):
- Single rAF-throttled scroll handler (progress bar, navbar `scrolled` state, active nav link)
- `IntersectionObserver`-based `.fade-up` animations + text-scramble decode on `.section-tag`
- Mobile menu toggle (CSS class swap on `.mobile-toggle`, no DOM rebuilding)
- Custom cursor (desktop only, `pointer: fine` media query, transform-based)
- Hero cursor spotlight + orb parallax (`--sx`/`--sy` CSS variables on `.hero`)
- Cursor-tracking glow on `.glow` cards (`--mx`/`--my` CSS variables)
- Live "time in Doha" clock in the hero badge (`#doha-time`)
- Stats counter animation with easing (`data-count` attribute on `<span>` elements)
- Canvas arcade game ("Dynamic Bounce") in the Playground section

**Icons**: Inline SVGs using Feather icon paths (stroke-based, `class="icon"`). Static icons are inlined directly in `index.html`; icons set dynamically by JS come from the `ICONS` map at the top of `script.js`. No icon CDN — the page makes zero third-party requests on the critical path.

**Analytics**: Google Analytics (`G-SKBCVDV7G0`) is deferred by 3 seconds to avoid blocking initial render.

## Deployment

Pushing to `main` auto-deploys via GitHub Pages. The `CNAME` file sets the custom domain.
