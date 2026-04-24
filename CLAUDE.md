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

**Main page (`index.html` + `styles.css` + `script.js`)** is a single-page portfolio with these sections (in order): Hero → Marquee strip → Stats Bar → About → Experience → Skills (bento grid) → Open Source → Contact → Footer.

**Design system** (defined in `styles.css` `:root`):
- Color palette: Midnight navy (`--bg: #07080f`), indigo/violet (`--violet`, `--violet-light`), amber (`--amber`)
- Fonts: Syne (display/headings), Inter (body), Space Mono (mono)
- CSS variables control all colors, spacing, and easing curves

**JS features** (`script.js`):
- Feather Icons initialization (`feather.replace()`)
- Navbar scroll state (`scrolled` class after 60px)
- `IntersectionObserver`-based `.fade-up` animations
- Mobile menu toggle
- Active nav link tracking on scroll
- Custom cursor (desktop only, `pointer: fine` media query)
- Stats counter animation with easing (`data-count` attribute on `<span>` elements)

**Icons**: [Feather Icons](https://feathericons.com/) loaded from unpkg CDN — add icons using `<i data-feather="icon-name"></i>` and they render after `feather.replace()`.

**Analytics**: Google Analytics (`G-SKBCVDV7G0`) is deferred by 3 seconds to avoid blocking initial render.

## Deployment

Pushing to `main` auto-deploys via GitHub Pages. The `CNAME` file sets the custom domain.
