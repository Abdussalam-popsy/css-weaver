# CSS Weaver v2 — PRD

**One-liner:** A Chrome extension that lets designers click any animated element on a website and see exactly how it was built — the HTML structure, the CSS or GSAP code, the easing curve, and everything needed to recreate it.

---

## Decision: Build on Existing Codebase

We are **not** starting from scratch. The audit of the current codebase identified significant working infrastructure worth preserving:

**Keep (working and solid):**
- CSS @keyframes detection via `CSSKeyframesRule` stylesheet parsing (`scanner.ts:546-595`). Reads actual authored CSS, not just computed values. This is the strongest part of the tool.
- The floating panel UI with Shadow DOM isolation, drag/resize, inspect mode with hover highlighting, and local storage persistence for position/size.
- The page-context injection pattern (`inject.ts` + `pageScript.js`) for accessing the page's JS context. Architecturally correct — uses `chrome.runtime.getURL` to bypass CSP, communicates via `CustomEvent`.
- GSAP monkey-patching in `pageScript.js` — patches `gsap.to`, `gsap.from`, `gsap.fromTo`, `gsap.set`, `gsap.timeline`, `ScrollTrigger.create`, `gsap.context`, and `gsap.registerPlugin`. Thorough, with double-patch guards and GSAP 2.x support.
- Type-safe message passing system (`messages.ts`) with discriminated unions.
- Zustand store (`animationStore.ts`) with coordinated selection (tree expansion, highlighting, scroll-to-element).
- `buildDOMTree()` for capturing pruned HTML structure of animated elements and their ancestors.
- `getCompleteCodeWithHtml()` and "Copy with HTML" functionality that gives designers the HTML + CSS together.

**Delete (dead code, broken, or fabricated):**
- `scanGSAPAnimations()` in `scanner.ts:324-416` — accesses `window.gsap` from the content script's isolated world. Will never work. Dead code.
- `gsapInspector.ts` — same isolated-world problem. Dead code.
- `src/content/injected/pageScript.ts` — abandoned TypeScript version that dispatches a different event name (`css-weaver-animation-detected`) than what the listener expects (`css-weaver-animation`). Diverged from the working `public/pageScript.js`. Remove entirely.
- `AnimationDetails.tsx` — dead component, not imported by `App.tsx`. The panel uses `DetailsSidebar.tsx`.
- Framer Motion fabricated detection in `scanner.ts:461-490` — hardcodes 300ms duration and guesses keyframes. Produces incorrect data. Remove; do not ship bad data.
- Duplicate `getSelector()` implementations (3 copies across scanner, gsapInspector, pageScript). Consolidate to one.
- Duplicate icon components across `AnimationDetails.tsx` and `DetailsSidebar.tsx`.
- Duplicate animation type color/label mappings across `DetailsSidebar.tsx`, `FloatingApp.tsx`, and `cssFormatting.ts`. Consolidate to one source.

**Fix (partially working, broken plumbing):**
- GSAP data pipeline: `pageScript.js` correctly intercepts GSAP calls, but data gets stored inconsistently in both `inject.ts` (line 25) and `animationCache.ts`. Make `animationCache.ts` the single store. Remove the duplicate array in `inject.ts`.
- Event name consistency: `pageScript.js` dispatches `css-weaver-animation`, which `inject.ts` listens for correctly. But the deleted `pageScript.ts` dispatched a different name. After removing the dead `.ts` file, verify the working path is clean end to end.
- Scroll playhead in `ScrollPlayhead.tsx`: maps scroll percentage to a time-based timeline axis, which is conceptually wrong. Remove for MVP — only reintroduce when scroll-driven animation support is properly scoped.

**Cut entirely for v1 (out of scope):**
- Full-page timeline panel (broken iframe preview, confused scroll mapping, layout issues). The floating panel is the primary and only UI for v1.
- Framer Motion detection (would need its own page-context monkey-patching, not fabricated data).
- Canvas/Lottie/Three.js detection (not DOM animations, different problem domain).
- CSS transition from/to values (would need hover state simulation or stylesheet :hover rule parsing — complex, low priority).
- MutationObserver for dynamic elements (valuable but not MVP — users can rescan manually).
- Animation grouping/sequencing for GSAP timelines (v2 feature).
- Export to JSON/Lottie/After Effects/CodePen.

---

## Problem Statement

Designers constantly study motion on the web — on Awwwards sites, competitor products, portfolio references. When they see an animation they want to learn from, they have no way to inspect how it was built. Chrome DevTools' Animations panel is made for developers debugging their own code, not designers studying someone else's. The result: designers screenshot, eyeball easing curves, and approximate. They can't see the actual HTML structure, the authored CSS, or the GSAP configuration behind the animations they admire.

## Target User

Design engineers and motion-focused product designers who regularly study live websites for animation inspiration. They understand easing, duration, and transforms. They want to see how an animation was built so they can learn from it and recreate the feel in their own projects using whatever library they prefer.

## Core Features (v1)

**1. CSS @keyframes Extraction (exists, polish)**
Detects `@keyframes` animations by parsing actual stylesheets via `CSSKeyframesRule`. Captures the full keyframe block as authored, all animation longhand properties, and the element's CSS selector. "Copy with HTML" gives the designer the HTML structure + CSS needed to recreate the animation. This pipeline works today and is the tool's primary value.

**2. GSAP Extraction (exists, fix pipeline)**
Intercepts GSAP calls (`gsap.to`, `gsap.from`, `gsap.fromTo`, `gsap.set`, `gsap.timeline`, `ScrollTrigger.create`) via the page-context script. Captures target element, animated properties, duration, easing, delay, and stagger. Generates reconstructed `gsap.to(...)` code snippets. Fix: clean the data pipeline so intercepted GSAP data flows reliably from `pageScript.js` → `animationCache.ts` → floating panel.

**3. Inspect Mode (exists, keep)**
Click the extension icon to activate. Hover over elements to see which ones have detected animations (highlighted with type badge). Click to select and view details. Crosshair cursor in inspect mode for hover-to-discover.

**4. HTML Structure Capture (exists, keep)**
`buildDOMTree()` constructs a pruned DOM tree showing the animated element and its ancestors. Essential context — many animations depend on parent structure (overflow hidden wrappers, flex containers, split-text spans). Shown alongside the CSS/GSAP code.

**5. Easing Curve Visualization (new, add)**
Render `cubic-bezier(...)` values as a visual curve in the detail panel. Designers need to see the shape of the motion, not just read `cubic-bezier(0.16, 1, 0.3, 1)`. Small SVG component, positioned next to the easing value in the details view.

**6. Copy Code (exists, polish)**
One-click copy of the complete animation code. For CSS: the `@keyframes` block + animation property + selector. For GSAP: the reconstructed `gsap.to(...)` call. "Copy with HTML" includes the element's HTML structure.

## Architecture (Post-Cleanup)

```
User clicks extension icon
        ↓
Background service worker (service-worker.ts)
        ↓ sends TOGGLE_FLOATING_PANEL
Content script (index.ts)
        ↓ renders floating panel in Shadow DOM
Floating panel (FloatingApp.tsx)
        ↓ calls scanAnimations()
        ↓
┌─────────────────────────────────────────────────┐
│ Detection (runs in parallel)                    │
│                                                 │
│ 1. CSS @keyframes: getComputedStyle() for       │
│    animationName + CSSKeyframesRule parsing      │
│    from document.styleSheets                    │
│    → Source: scanner.ts                         │
│                                                 │
│ 2. Web Animations API: document.getAnimations() │
│    filtered to JS-created only                  │
│    → Source: scanner.ts                         │
│                                                 │
│ 3. GSAP: pageScript.js monkey-patches in page   │
│    context → CustomEvent → content script       │
│    → Source: pageScript.js → animationCache.ts  │
│                                                 │
│ 4. CSS transitions: getComputedStyle() for      │
│    transitionProperty (declaration only,         │
│    no from/to values)                           │
│    → Source: scanner.ts                         │
└─────────────────────────────────────────────────┘
        ↓ all results stored in
animationCache.ts (single source of truth)
        ↓ consumed by
Zustand store (animationStore.ts)
        ↓ renders in
Floating panel detail view + easing curve
```

## Tech Stack

- Chrome Extension (Manifest V3)
- Content script: TypeScript (detection engine)
- Page-context script: vanilla JS (GSAP monkey-patching)
- Floating panel UI: React 18 + inline styles (Shadow DOM isolation)
- State: Zustand
- Syntax highlighting: PrismJS
- Build: Vite + @crxjs/vite-plugin
- No Tailwind in the content script (inline styles for Shadow DOM). Tailwind only in the full-page panel if it's reintroduced later.

## User Stories

- As a designer, I open a site with a hero text stagger animation, activate CSS Weaver, hover over the heading, and see it's a GSAP stagger with `translateY`, `opacity`, `easeOutExpo`, and 0.08s stagger. I copy the code and adapt it in my project.
- As a design engineer, I find a scroll-triggered section with CSS keyframe animations, click an element, and get the full `@keyframes` block plus the HTML structure showing the wrapper div with `overflow: hidden`. I copy both and have a working starting point.
- As a motion designer studying easing, I click three different animated elements on the same page and compare their easing curves visually to understand the site's motion system.

## Definition of Done

- Extension installs from local build and activates on any webpage.
- CSS @keyframes: detects animations, shows authored keyframe CSS from stylesheets, shows HTML structure, copy produces working code.
- GSAP: detects `gsap.to/from/fromTo/set` and `ScrollTrigger` calls, shows animated properties + timing + easing, copy produces reconstructed GSAP code.
- Easing curves render visually as an SVG in the detail panel.
- All dead code removed. Single `getSelector()`, single animation cache, single event pipeline.
- Floating panel is the only UI surface. No broken timeline panel, no fabricated Framer Motion data.
- The tool looks like a designer built it. Dark, minimal, precise.

---

## Cleanup Task List (for Claude Code)

### Phase 1: Delete Dead Code
1. Delete `src/content/gsapInspector.ts` entirely
2. Delete `src/content/injected/pageScript.ts` entirely (keep `public/pageScript.js`)
3. Delete `AnimationDetails.tsx` (unused component)
4. Remove `scanGSAPAnimations()` from `scanner.ts` (lines 324-416) and all calls to it
5. Remove `inspectGSAP()` call from `index.ts` (line 199) and its import
6. Remove Framer Motion fabricated detection from `scanner.ts` (lines 422-541)
7. Remove the duplicate `pageDetectedAnimations` array in `inject.ts` (line 25) and the `getPageDetectedAnimations()` export — `animationCache.ts` is the single store

### Phase 2: Fix GSAP Pipeline
8. Verify `pageScript.js` dispatches `css-weaver-animation` CustomEvent with GSAP data
9. Verify content script listener in `index.ts` receives that event and writes to `animationCache.ts`
10. Verify floating panel reads from `animationCache.ts` via the Zustand store
11. Test end-to-end: load a page with GSAP, check that animations appear in the floating panel

### Phase 3: Consolidate Duplicates
12. Create a single `getSelector()` utility function, replace all three implementations
13. Consolidate animation type color/label mappings into one shared constant
14. Remove duplicate icon components, create shared versions

### Phase 4: Add Easing Curve Visualization
15. Create an SVG component that renders a `cubic-bezier(x1, y1, x2, y2)` curve
16. Parse easing strings (named easings like `ease-in-out` map to known cubic-bezier values, GSAP easing names map to approximated curves)
17. Add the curve component to the detail view in the floating panel, next to the easing value

### Phase 5: Remove Broken Features
18. Remove the full-page timeline panel (all files under `src/panel/` related to `Timeline.tsx`, `ScrollPlayhead.tsx`, `WebsitePreview.tsx`)
19. Or: keep the panel page but strip it to just the detail sidebar without the broken iframe and timeline — designer's call on this
20. Remove scroll tracking messages (`SCROLL_UPDATE`) if the timeline is removed

### Phase 6: Visual Polish
21. Audit the floating panel's visual design — typography, spacing, color consistency
22. Ensure the detail view presents CSS and GSAP code with clear hierarchy
23. Make the easing curve visualization feel integrated, not bolted on
24. This is the portfolio moment — the UI should look like a designer built it
