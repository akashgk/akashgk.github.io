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

**Design system** (Apple-inspired, defined in `styles.css` `:root`):
- Alternating section rhythm like apple.com: dark sections (`#000`, cards `#1d1d1f`) and light sections (`.section-light`, `#f5f5f7`, white cards)
- Accents: Apple blue (`--blue: #2997ff` on dark, `--blue-deep: #0066cc` on light), pill buttons (`.btn-pill`, `#0071e3`), chevron text links (`.link-arrow`)
- Signature gradient (`--grad`, Apple Intelligence-style blue→purple→pink→orange) used for the hero headline span, eyebrows, stat numbers, and logo dot
- Shared `.card` class: 28px radius, hover lift + scale with `--ease-out` (expo-out)
- Fonts: System font stacks only (SF Pro / Segoe UI / Roboto, `ui-monospace` for mono) — no webfonts are loaded, by design, for performance
- Motion: transform/opacity only; `.reveal` blur-up rise animation; glass navbar (`saturate(180%) blur(20px)`)

**JS features** (`script.js`, loaded with `defer`):
- Single rAF-throttled scroll handler (navbar state, active nav link, Apple-style hero recede — scales/fades `.hero-content` as you scroll past)
- `IntersectionObserver`-based `.reveal` blur-up animations with inline `transition-delay` staggering
- Mobile menu toggle (full-screen glass overlay with staggered link reveal)
- Typed role cycling in the hero (`#typed-role`)
- Live "time in Doha" clock in the hero badge (`#doha-time`)
- Stats counter animation with easing (`data-count` attribute on `<span>` elements)
- Canvas arcade game ("Dynamic Bounce") in the Playground section, recolored to Apple system colors

**Icons**: Inline SVGs using Feather icon paths (stroke-based, `class="icon"`). Static icons are inlined directly in `index.html`; icons set dynamically by JS come from the `ICONS` map at the top of `script.js`. No icon CDN — the page makes zero third-party requests on the critical path.

**Analytics**: Google Analytics (`G-SKBCVDV7G0`) is deferred by 3 seconds to avoid blocking initial render.

## Deployment

Pushing to `main` auto-deploys via GitHub Pages. The `CNAME` file sets the custom domain.
