# CSS Weaver v2 — Technical Specification

## 1. Overview

CSS Weaver is a Chrome Extension (Manifest V3) that detects CSS and GSAP animations on any webpage and presents them in a floating inspection panel. Designers hover or click animated elements to see the HTML structure, authored CSS or GSAP code, easing curve, and timing — everything needed to recreate the animation.

This spec builds on the existing codebase. It defines what stays, what gets deleted, what gets fixed, and what's new. Every file reference maps to the current project structure.

---

## 2. Extension Architecture

### 2.1 Component Map

```
┌─────────────────────────────────────────────────────────────┐
│ Chrome Browser                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Web Page (any origin)                               │    │
│  │                                                     │    │
│  │  ┌──────────────────┐  ┌──────────────────────┐     │    │
│  │  │ Page JS Context  │  │ Content Script        │     │    │
│  │  │                  │  │ (Isolated World)      │     │    │
│  │  │ pageScript.js    │  │                       │     │    │
│  │  │ - GSAP patches   │──│→ animationCache.ts    │     │    │
│  │  │ - CustomEvent    │  │   (single store)      │     │    │
│  │  │   dispatch       │  │                       │     │    │
│  │  └──────────────────┘  │ scanner.ts            │     │    │
│  │                        │ - CSS @keyframes      │     │    │
│  │                        │ - Web Animations API  │     │    │
│  │                        │ - CSS transitions     │     │    │
│  │                        │                       │     │    │
│  │                        │ inject.ts             │     │    │
│  │                        │ - injects pageScript  │     │    │
│  │                        │ - listens CustomEvent │     │    │
│  │                        │                       │     │    │
│  │                        │ index.ts              │     │    │
│  │                        │ - message routing     │     │    │
│  │                        │ - scan orchestration  │     │    │
│  │                        │                       │     │    │
│  │                        │ ┌───────────────────┐ │     │    │
│  │                        │ │ Shadow DOM        │ │     │    │
│  │                        │ │ (closed)          │ │     │    │
│  │                        │ │                   │ │     │    │
│  │                        │ │ FloatingApp.tsx   │ │     │    │
│  │                        │ │ - Inspect mode    │ │     │    │
│  │                        │ │ - Animation list  │ │     │    │
│  │                        │ │ - Detail view     │ │     │    │
│  │                        │ │ - Easing curve    │ │     │    │
│  │                        │ └───────────────────┘ │     │    │
│  │                        └──────────────────────┘     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────────────┐                               │
│  │ Background Service Worker│                               │
│  │ service-worker.ts        │                               │
│  │ - action.onClicked       │                               │
│  │ - message routing        │                               │
│  └──────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Execution Contexts

**Page JS Context** (`public/pageScript.js`)
- Runs in the page's actual `window` scope
- Can access `window.gsap`, `window.ScrollTrigger`, `window.TweenMax`, etc.
- Injected by `inject.ts` via `<script src="chrome.runtime.getURL('pageScript.js')">`
- Communicates with content script via `CustomEvent` on `document`
- Cannot use any Chrome extension APIs

**Content Script Isolated World** (`src/content/`)
- Runs in Chrome's isolated world — shares DOM but not `window` with the page
- Can use `document.querySelectorAll`, `getComputedStyle`, `document.styleSheets`, `document.getAnimations()`
- Cannot access page JS variables (`window.gsap` is undefined here)
- Can use `chrome.runtime.sendMessage` to talk to background
- Renders the floating panel inside a closed Shadow DOM to isolate styles

**Background Service Worker** (`src/background/service-worker.ts`)
- Persistent-ish process (Manifest V3 service worker lifecycle)
- Handles `chrome.action.onClicked` to toggle floating panel
- Routes messages between content script and any future panel tabs

### 2.3 Data Flow

```
1. User clicks extension icon
   → Background receives chrome.action.onClicked
   → Sends TOGGLE_FLOATING_PANEL to content script

2. Content script renders floating panel (Shadow DOM)
   → Floating panel calls scanAnimations()

3. Scan runs three detection paths in parallel:
   a. scanner.ts: CSS @keyframes + transitions + Web Animations API
   b. pageScript.js: GSAP interceptions (already captured, or polls for late-loaded GSAP)
   c. pageScript.js → CustomEvent('css-weaver-animation') → content script listener

4. All results merge into animationCache.ts
   → Zustand store (animationStore.ts) reads from cache
   → Floating panel re-renders with detected animations

5. User hovers element in list → content script highlights element on page
   User clicks element → detail view opens with code + easing curve

6. User clicks "Copy Code" or "Copy with HTML"
   → cssFormatting.ts generates appropriate snippet
   → Copied to clipboard
```

### 2.4 Message Protocol

All messages use the existing discriminated union system in `messages.ts`. No changes to the message types are needed for v2 MVP unless the timeline panel messages are removed.

**Messages to keep:**
- `TOGGLE_FLOATING_PANEL` — background → content script
- `SCAN_ANIMATIONS` — panel → content script
- `SCAN_RESULT` — content script → panel
- `HIGHLIGHT_ELEMENT` — panel → content script
- `CLEAR_HIGHLIGHT` — panel → content script

**Messages to remove (if timeline panel is fully cut):**
- `SCROLL_UPDATE` — content script → background → panel tab
- `PLAYBACK_CONTROL_IN_TAB` — panel → background → content script
- `SCAN_TAB` — panel tab → background → content script
- Any message types exclusively used by the full-page panel

---

## 3. Data Models

### 3.1 Core Animation Type

This is the primary data structure that flows through the entire system. The existing codebase has this roughly defined but inconsistently — this spec canonicalizes it.

```typescript
interface DetectedAnimation {
  // Identity
  id: string;                          // unique ID, generated at detection time
  type: AnimationType;                 // 'css-keyframes' | 'css-transition' | 'gsap' | 'web-animation' | 'scroll-driven'

  // Element reference
  selector: string;                    // CSS selector for the animated element
  elementTag: string;                  // e.g. 'div', 'span', 'h1'
  elementClasses: string[];            // up to 3 meaningful classes (Tailwind utility classes filtered out)

  // Timing
  duration: number;                    // milliseconds
  delay: number;                       // milliseconds
  iterationCount: number | 'infinite';
  direction: string;                   // 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  fillMode: string;                    // 'none' | 'forwards' | 'backwards' | 'both'

  // Easing
  easing: string;                      // raw value: 'ease-in-out', 'cubic-bezier(0.16, 1, 0.3, 1)', 'steps(4, end)'
  easingCubicBezier: CubicBezier | null; // parsed { x1, y1, x2, y2 } for curve rendering, null for steps/linear

  // Animation data
  keyframes: Keyframe[] | null;        // array of { offset, properties } — null for transitions
  rawCSS: string | null;               // the actual @keyframes block from stylesheet (CSS only)
  animationProperty: string | null;    // the full animation shorthand or longhand values (CSS only)
  gsapVars: Record<string, any> | null; // the vars object from gsap.to/from/fromTo (GSAP only)
  gsapMethod: string | null;           // 'to' | 'from' | 'fromTo' | 'set' (GSAP only)

  // HTML context
  htmlStructure: DOMNode | null;       // pruned DOM tree from buildDOMTree()

  // Source metadata
  source: AnimationSource;             // 'stylesheet' | 'inline' | 'page-script' | 'web-animation-api'
  libraryFingerprint: string | null;   // 'gsap-3.x' | 'gsap-2.x' | null
}

type AnimationType = 'css-keyframes' | 'css-transition' | 'gsap' | 'web-animation' | 'scroll-driven';

type AnimationSource = 'stylesheet' | 'inline' | 'page-script' | 'web-animation-api';

interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Keyframe {
  offset: number;            // 0 to 1
  properties: Record<string, string>;  // e.g. { transform: 'translateY(40px)', opacity: '0' }
}

interface DOMNode {
  tag: string;
  selector: string;
  classes: string[];
  depth: number;
  children: DOMNode[];
  isAnimated: boolean;       // true if this node is the animated element
}
```

### 3.2 Easing Name Resolution

Map common named easings and GSAP easing strings to cubic-bezier values for curve rendering.

```typescript
const EASING_MAP: Record<string, CubicBezier> = {
  // CSS named easings
  'linear':         { x1: 0,    y1: 0,    x2: 1,    y2: 1    },
  'ease':           { x1: 0.25, y1: 0.1,  x2: 0.25, y2: 1    },
  'ease-in':        { x1: 0.42, y1: 0,    x2: 1,    y2: 1    },
  'ease-out':       { x1: 0,    y1: 0,    x2: 0.58, y2: 1    },
  'ease-in-out':    { x1: 0.42, y1: 0,    x2: 0.58, y2: 1    },

  // GSAP common easings (approximations)
  'power1.out':     { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  'power1.in':      { x1: 0.55, y1: 0.09, x2: 0.68, y2: 0.53 },
  'power1.inOut':   { x1: 0.45, y1: 0.03, x2: 0.51, y2: 0.95 },
  'power2.out':     { x1: 0.22, y1: 0.61, x2: 0.36, y2: 1    },
  'power2.in':      { x1: 0.55, y1: 0.09, x2: 0.68, y2: 0.53 },
  'power2.inOut':   { x1: 0.65, y1: 0.05, x2: 0.36, y2: 1    },
  'power3.out':     { x1: 0.22, y1: 1,    x2: 0.36, y2: 1    },
  'power3.in':      { x1: 0.95, y1: 0.05, x2: 0.80, y2: 0.04 },
  'power3.inOut':   { x1: 0.77, y1: 0,    x2: 0.18, y2: 1    },
  'power4.out':     { x1: 0.16, y1: 1,    x2: 0.3,  y2: 1    },
  'power4.in':      { x1: 0.7,  y1: 0,    x2: 0.84, y2: 0    },
  'power4.inOut':   { x1: 0.87, y1: 0,    x2: 0.13, y2: 1    },
  'back.out':       { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1    },
  'back.in':        { x1: 0.36, y1: 0,    x2: 0.66, y2: -0.56},
  'back.inOut':     { x1: 0.68, y1: -0.6, x2: 0.32, y2: 1.6  },
  'circ.out':       { x1: 0.08, y1: 0.82, x2: 0.17, y2: 1    },
  'circ.in':        { x1: 0.6,  y1: 0.04, x2: 0.98, y2: 0.34 },
  'circ.inOut':     { x1: 0.78, y1: 0.14, x2: 0.15, y2: 0.86 },
  'expo.out':       { x1: 0.16, y1: 1,    x2: 0.3,  y2: 1    },
  'expo.in':        { x1: 0.7,  y1: 0,    x2: 0.84, y2: 0    },
  'expo.inOut':     { x1: 0.87, y1: 0,    x2: 0.13, y2: 1    },

  // GSAP legacy aliases
  'Expo.easeOut':   { x1: 0.16, y1: 1,    x2: 0.3,  y2: 1    },
  'Expo.easeIn':    { x1: 0.7,  y1: 0,    x2: 0.84, y2: 0    },
  'Expo.easeInOut': { x1: 0.87, y1: 0,    x2: 0.13, y2: 1    },
};

// Parser for cubic-bezier strings
function parseCubicBezier(easing: string): CubicBezier | null {
  // Check named easings first
  if (EASING_MAP[easing]) return EASING_MAP[easing];

  // Parse cubic-bezier(x1, y1, x2, y2)
  const match = easing.match(/cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
  if (match) {
    return { x1: parseFloat(match[1]), y1: parseFloat(match[2]), x2: parseFloat(match[3]), y2: parseFloat(match[4]) };
  }

  // Steps, spring, etc. — cannot render as cubic-bezier
  return null;
}
```

---

## 4. Detection Engine — Detailed Specs

### 4.1 CSS @keyframes Detection (scanner.ts — exists, keep)

**How it works:**
1. `document.querySelectorAll('*')` iterates every element
2. `getComputedStyle(el).animationName` checks for non-`none` values
3. If found, reads all animation longhands: `animationDuration`, `animationDelay`, `animationTimingFunction`, `animationIterationCount`, `animationDirection`, `animationFillMode`
4. `collectKeyframes()` iterates `document.styleSheets`, finds matching `CSSKeyframesRule` by name
5. For each keyframe step: iterates `CSSStyleDeclaration` to extract properties, captures `cssText`
6. Builds shorthand via `buildAnimationShorthand()`

**What it produces:**
- Full `@keyframes` block as authored in the stylesheet (`rawCSS`)
- All animation longhand values
- Keyframe steps with offset and properties
- Element selector via `getSelector()`

**Known limitations (accepted for v1):**
- Cross-origin stylesheets fail silently (CORS blocks `sheet.cssRules`)
- Single-pass scan — no detection of dynamically added animations post-scan
- `animationName` from computed style may be overridden by specificity — the detected name might not match the intended keyframes on complex pages

**No changes needed.** This pipeline is solid.

### 4.2 GSAP Detection (pageScript.js — exists, fix pipeline)

**How it works:**
1. `inject.ts` injects `pageScript.js` into the page's JS context via `<script>` tag
2. `pageScript.js` polls for `window.gsap` with `setInterval` (up to 10s, then 1s background poll)
3. When found, monkey-patches:
   - `gsap.to(target, vars)` — captures target selector, vars (animated properties, duration, ease, delay, stagger)
   - `gsap.from(target, vars)` — same, but marks method as 'from'
   - `gsap.fromTo(target, fromVars, toVars)` — captures both from and to states
   - `gsap.set(target, vars)` — captures instant property sets
   - `gsap.timeline()` — patches the returned timeline's `.to()`, `.from()`, `.fromTo()`, `.set()` methods
   - `gsap.context()` — wraps the callback to capture animations created within
   - `ScrollTrigger.create(config)` — captures trigger, start, end, scrub, pin config
   - `gsap.registerPlugin()` — detects when ScrollTrigger is registered, patches it
4. Each intercepted call dispatches `CustomEvent('css-weaver-animation')` with extracted data
5. Content script listener receives the event and writes to `animationCache.ts`

**What needs fixing:**
- `inject.ts` line 25 maintains a separate `pageDetectedAnimations` array. Remove it. `animationCache.ts` is the single store.
- `index.ts` line 199 calls `inspectGSAP()` which tries `window.gsap` from the isolated world. Remove the call and its import.
- `scanner.ts:324-416` `scanGSAPAnimations()` also tries `window.gsap` from isolated world. Remove entirely.
- After cleanup, the only GSAP detection path is: `pageScript.js` → `CustomEvent` → content script listener → `animationCache.ts`.

**GSAP data structure from pageScript.js:**

```typescript
// What pageScript.js sends via CustomEvent detail
interface GSAPAnimationEvent {
  type: 'gsap';
  method: 'to' | 'from' | 'fromTo' | 'set';
  target: string;              // CSS selector of animated element(s)
  vars: {
    duration?: number;
    ease?: string;
    delay?: number;
    stagger?: number | object;
    [property: string]: any;   // x, y, opacity, scale, rotation, etc.
  };
  fromVars?: Record<string, any>; // only for fromTo
  scrollTrigger?: {
    trigger: string;
    start: string;
    end: string;
    scrub: boolean | number;
    pin: boolean | string;
  };
  timeline?: {
    id: string;                // generated timeline ID for grouping
    position: string | number; // position parameter in timeline
  };
}
```

### 4.3 Web Animations API Detection (scanner.ts — exists, keep)

**How it works:**
1. `document.getAnimations()` returns all running animations
2. Filters out `CSSAnimation` and `CSSTransition` instances (to avoid double-counting with CSS detection)
3. For remaining JS-created animations: reads `effect.getKeyframes()` and `effect.getTiming()`
4. Produces keyframes with offset and properties, plus timing data

**No changes needed.** Works correctly for sites using `element.animate()` directly.

### 4.4 CSS Transition Detection (scanner.ts — exists, keep as-is)

**How it works:**
1. Reads `transitionProperty`, `transitionDuration`, `transitionDelay`, `transitionTimingFunction` from `getComputedStyle`
2. Filters out `none` and `all`, only adds transitions with `duration > 0`

**Known limitations (accepted for v1):**
- No from/to values — the extension reads the transition *declaration* but never observes the actual value change
- No trigger detection — doesn't know what causes the transition (:hover, class toggle, JS)
- Reports transitions that exist in CSS but may never fire

**No changes needed.** Low priority detection — kept for completeness but not a selling point.

### 4.5 Scroll-Driven Animation Detection (scanner.ts — exists, keep as-is)

**How it works:**
1. Reads `animation-timeline` from `getComputedStyle`
2. Checks for `scroll()` or `view()` values
3. Sets duration to 0 and endTime to 100 (representing scroll progress percentage)

**No changes needed.** Niche but correct for the CSS `animation-timeline` property.

---

## 5. HTML Structure Extraction

### 5.1 buildDOMTree() (scanner.ts:777-847 — exists, keep)

**How it works:**
1. For each detected animated element, walks up the DOM to `document.body`
2. Constructs a pruned tree containing only the animated element and its ancestors
3. Each node captures: `tagName`, CSS selector, up to 3 class names (Tailwind utility classes filtered), nesting depth
4. Tree is serialized and attached to the `DetectedAnimation` object

**Why this matters:**
Many animations depend on parent structure. A text stagger needs `overflow: hidden` on the parent. A parallax effect needs a specific wrapper hierarchy. Without the HTML context, the CSS alone won't reproduce the animation.

### 5.2 getCompleteCodeWithHtml() (cssFormatting.ts:336-344 — exists, keep)

Generates a combined HTML + CSS snippet for copy. This is the "Copy with HTML" feature that makes the tool genuinely useful for recreating animations.

---

## 6. UI Components

### 6.1 Floating Panel (FloatingApp.tsx — exists, keep + polish)

**Current structure:**
- Title bar: logo, Inspect Mode toggle, minimize, close
- Search input + type filter dropdown
- Stats bar: animation counts by type (CSS, GSAP, Transition, etc.)
- Scrollable animation list: type badge, element info, description, duration, mini timeline bar
- Expandable detail pane (bottom): Overview tab, Code tab, Copy Code button

**Rendering:**
- Rendered inside a closed Shadow DOM (`inject.tsx:60`) to prevent CSS conflicts with the host page
- All styles are inline (required for Shadow DOM isolation — no external stylesheets)
- Position and size persisted via `chrome.storage.local`

**Changes for v2:**
- Add easing curve visualization to the detail pane (see 6.3)
- Remove references to the full-page timeline panel (the "Timeline" button in the title bar)
- Visual polish pass on typography, spacing, and color (Phase 6)
- Consolidate animation type color/label mappings into a shared constants file

### 6.2 Inspect Mode (exists, keep)

**How it works:**
1. User toggles Inspect Mode via button in floating panel title bar
2. Content script adds `mouseover`/`mouseout` listeners on `document`
3. On hover: if the hovered element (or an ancestor) has a detected animation, highlight it with an overlay and show a tooltip with element selector + animation type badge
4. On click: select the element, open detail pane, scroll animation list to it
5. Cursor changes to crosshair

**Zustand coordination:**
`selectAnimationWithSync` in `animationStore.ts` handles the cascading effects of selecting an animation: expands the HTML tree path, highlights the element on the page, scrolls the list, and opens the detail panel. This is well-implemented.

### 6.3 Easing Curve Visualization (new — add)

**Component:** `EasingCurve.tsx`

**Input:** `easing: string` (raw CSS or GSAP easing value)

**Rendering:**
- Parse easing string via `parseCubicBezier()` (see section 3.2)
- If parseable: render SVG showing the cubic-bezier curve
  - Canvas: ~100x100px SVG
  - Axes: subtle grid lines for 0,0 and 1,1
  - Linear reference: dashed diagonal line
  - Curve: solid white line, plotted by evaluating the bezier at ~50 points
  - Control point handles: optional, thin lines from (0,0)→(x1,y1) and (1,1)→(x2,y2)
  - Start/end dots
- If not parseable (steps, spring, custom): show the easing string as text with a "non-bezier" label
- Display the easing name (if known from EASING_MAP) alongside the raw value

**Placement:** Inside the detail pane, between the timing info (duration/delay) and the property list. Prominent but not dominant — roughly 100px tall.

**Styling:** Inline styles only (Shadow DOM constraint). White curve on dark background matching the floating panel's color scheme.

### 6.4 Code Display (exists, polish)

**Current:** `cssFormatting.ts` generates type-appropriate code:
- CSS @keyframes → full `@keyframes` block + `animation` shorthand + selector
- CSS transitions → `transition` shorthand
- GSAP → reconstructed `gsap.to(...)` / `gsap.from(...)` / `gsap.fromTo(...)` call
- Web Animations → `element.animate(keyframes, options)` call

**Syntax highlighting:** PrismJS with CSS and JavaScript grammars.

**Copy actions:**
- "Copy Code" — just the animation code
- "Copy with HTML" — HTML structure + animation code together

**No major changes needed.** Polish the output formatting for GSAP to ensure the reconstructed code is clean and uses modern GSAP 3 syntax consistently.

---

## 7. Shared Utilities (consolidate)

### 7.1 getSelector() — consolidate to one implementation

**Current state:** Three separate implementations in `scanner.ts`, `gsapInspector.ts` (to be deleted), and `pageScript.js`.

**Target:** One canonical implementation in a shared utility file (`src/utils/getSelector.ts`) used by `scanner.ts`. The `pageScript.js` version stays separate since it runs in a different context but should follow the same logic.

**Spec:**
```typescript
function getSelector(element: Element): string {
  // 1. If element has an ID, return '#id'
  // 2. Build path from element up to body, max depth 3
  // 3. Each segment: tagName + up to 2 meaningful classes (filter Tailwind utilities)
  // 4. Use nth-child if needed for uniqueness
  // 5. Return the shortest unique selector
}
```

### 7.2 Animation Type Constants — consolidate

**Current state:** Color/label mappings duplicated across `DetailsSidebar.tsx`, `FloatingApp.tsx`, `cssFormatting.ts`.

**Target:** Single source in `src/constants/animationTypes.ts`:

```typescript
export const ANIMATION_TYPES = {
  'css-keyframes':   { label: 'CSS Keyframes',  color: '#9a82ff', shortLabel: 'CSS' },
  'css-transition':  { label: 'CSS Transition',  color: '#9a82ff', shortLabel: 'Trans' },
  'gsap':            { label: 'GSAP',            color: '#88e681', shortLabel: 'GSAP' },
  'web-animation':   { label: 'Web Animation',   color: '#63b3ed', shortLabel: 'WAAPI' },
  'scroll-driven':   { label: 'Scroll-Driven',   color: '#f6ba5d', shortLabel: 'Scroll' },
} as const;
```

### 7.3 Icon Components — consolidate

**Current state:** `CopyIcon`, `CheckIcon`, `CloseIcon` duplicated between deleted `AnimationDetails.tsx` and `DetailsSidebar.tsx`.

**Target:** Shared icon components in `src/components/icons/`.

---

## 8. File Structure (Post-Cleanup)

```
css-weaver/
├── manifest.json
├── public/
│   └── pageScript.js              # page-context GSAP monkey-patching (KEEP)
├── src/
│   ├── background/
│   │   └── service-worker.ts      # extension lifecycle + message routing (KEEP)
│   ├── content/
│   │   ├── index.ts               # content script entry, scan orchestration (KEEP, remove dead GSAP calls)
│   │   ├── scanner.ts             # CSS + WAAPI + transition detection (KEEP, remove GSAP + Framer sections)
│   │   ├── animationCache.ts      # single animation store (KEEP, becomes sole store)
│   │   ├── injected/
│   │   │   └── inject.ts          # pageScript injection + CustomEvent listener (KEEP, remove duplicate array)
│   │   ├── floating/
│   │   │   ├── FloatingApp.tsx    # main floating panel UI (KEEP, polish)
│   │   │   └── DetailView.tsx     # detail pane with code + easing (KEEP, add EasingCurve)
│   │   └── highlighting/          # element highlight + inspect mode overlays (KEEP)
│   ├── components/
│   │   ├── EasingCurve.tsx        # NEW — SVG easing curve visualization
│   │   └── icons/                 # consolidated icon components
│   ├── constants/
│   │   └── animationTypes.ts      # consolidated type colors/labels
│   ├── utils/
│   │   ├── getSelector.ts         # consolidated selector utility
│   │   ├── cssFormatting.ts       # code generation for copy (KEEP, polish)
│   │   ├── easingMap.ts           # EASING_MAP + parseCubicBezier (NEW)
│   │   └── messages.ts            # message type definitions (KEEP, remove unused types)
│   └── store/
│       └── animationStore.ts      # Zustand store (KEEP)
│
│   # DELETED FILES:
│   # src/content/gsapInspector.ts
│   # src/content/injected/pageScript.ts
│   # src/panel/components/AnimationDetails.tsx
│   # src/panel/components/Timeline.tsx (if full panel cut)
│   # src/panel/components/ScrollPlayhead.tsx (if full panel cut)
│   # src/panel/components/WebsitePreview.tsx (if full panel cut)
```

---

## 9. Implementation Phases

### Phase 1: Delete Dead Code
**Files to delete:**
- `src/content/gsapInspector.ts`
- `src/content/injected/pageScript.ts`
- `AnimationDetails.tsx`

**Code to remove:**
- `scanGSAPAnimations()` function in `scanner.ts` (lines 324-416) and all call sites
- `inspectGSAP()` call in `index.ts` (line 199) and its import
- Framer Motion detection in `scanner.ts` (lines 422-541)
- Duplicate `pageDetectedAnimations` array in `inject.ts` (line 25) and `getPageDetectedAnimations()` export

**Validation:** Extension should still build, load, and detect CSS @keyframes after all deletions. Run on a test page with CSS animations to confirm no regressions.

### Phase 2: Fix GSAP Pipeline
1. Verify `pageScript.js` dispatches `CustomEvent('css-weaver-animation')` with the correct GSAP data shape
2. Verify the content script listener in `index.ts` receives the event
3. Ensure received data writes to `animationCache.ts` and only `animationCache.ts`
4. Verify the Zustand store reads from the cache and the floating panel renders GSAP animations
5. Test on a page with GSAP — confirm animations appear with correct properties, timing, and easing

**Test pages:**
- GSAP homepage (gsap.com) — uses GSAP extensively
- Any Awwwards site with GSAP (check for `window.gsap` in console)

### Phase 3: Consolidate Duplicates
1. Create `src/utils/getSelector.ts` with single implementation
2. Create `src/constants/animationTypes.ts` with consolidated mappings
3. Create `src/components/icons/` with shared icon components
4. Update all imports across the codebase
5. Mirror the `getSelector` logic in `pageScript.js` (can't share code across contexts, but keep logic identical)

### Phase 4: Add Easing Curve Visualization
1. Create `src/utils/easingMap.ts` with `EASING_MAP` and `parseCubicBezier()`
2. Create `src/components/EasingCurve.tsx` — SVG component, inline styles only
3. Integrate into the floating panel's detail view
4. Test with: named CSS easings, cubic-bezier values, GSAP easing names, step functions (should show fallback text)

### Phase 5: Remove Broken Features
Decision: Remove the "Timeline" button from the floating panel header. Keep the panel page files in the codebase but don't expose them in the UI — this preserves the option to rebuild the timeline properly in v2.1 without losing the code.

Remove `SCROLL_UPDATE` message handling from the background service worker if no panel tab consumes it.

### Phase 6: Visual Polish
1. Audit floating panel typography — ensure consistent font sizes, weights, and line heights
2. Audit spacing — consistent padding and margins throughout the panel
3. Audit color — ensure the type badge colors, easing curve, code highlighting, and background all feel cohesive
4. Ensure the detail view hierarchy is clear: element identity → timing → easing curve → properties → code
5. Test at different panel sizes (the panel is resizable) — ensure nothing breaks at minimum or maximum size
6. This is the portfolio moment. The UI needs to look like a designer built it. Dark, minimal, precise.

---

## 10. Testing Strategy

### Manual Test Matrix

| Test Case | Page | Expected Result |
|-----------|------|-----------------|
| CSS @keyframes on page load | Any page with CSS entrance animations | Animations detected with full @keyframes block, correct timing, copyable code |
| CSS @keyframes with multiple steps | Page with multi-step keyframes (0%, 50%, 100%) | All steps captured with correct properties at each offset |
| GSAP gsap.to() | gsap.com or any GSAP site | Animation detected, vars captured, reconstructed code shown |
| GSAP gsap.fromTo() | Page with fromTo tweens | Both from and to states captured |
| GSAP ScrollTrigger | Page with scroll-triggered GSAP | ScrollTrigger config captured (trigger, start, end, scrub) |
| GSAP timeline | Page with gsap.timeline() | Individual tweens detected (grouping is v2) |
| Web Animations API | Page using element.animate() | Keyframes and timing captured |
| CSS transition (declaration only) | Page with transition CSS | Transition property and timing shown (no from/to — expected) |
| Cross-origin stylesheet | Page loading CSS from CDN | Graceful failure — animations from those sheets not detected, no errors |
| Inspect mode hover | Any page with detections | Correct element highlighted, tooltip shows selector + type |
| Copy Code | Select any animation | Clipboard contains valid, usable code |
| Copy with HTML | Select CSS animation | Clipboard contains HTML structure + CSS code |
| Easing curve - named | Animation with `ease-in-out` | Curve renders correctly |
| Easing curve - cubic-bezier | Animation with `cubic-bezier(0.16, 1, 0.3, 1)` | Curve renders correctly |
| Easing curve - GSAP name | GSAP animation with `power4.out` | Curve renders with approximated bezier |
| Easing curve - steps | Animation with `steps(4, end)` | Fallback text shown, no broken SVG |
| Rescan | Navigate SPA, click Rescan | New animations detected |
| No animations | Static page with no animations | Empty state shown, not an error |

---

## 11. Out of Scope (Explicitly)

- Framer Motion detection (fabricated data removed; proper implementation requires page-context patches — v2 feature)
- Canvas / Lottie / Three.js / WebGL (not DOM animations)
- Transition from/to values (requires hover simulation or :hover stylesheet parsing)
- MutationObserver for dynamic elements (users rescan manually for v1)
- Animation grouping / timeline hierarchy for GSAP timelines
- Full-page panel with iframe preview
- Export to JSON / Lottie / After Effects
- Firefox or Safari support
- Any form of animation editing or tweaking
- Video/GIF recording of animations
