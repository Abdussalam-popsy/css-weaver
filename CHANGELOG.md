# CSS Weaver - Development Log

## Overview

CSS Weaver is a Chrome extension that visualizes CSS animations from any website as an interactive timeline, similar to Adobe After Effects or video editing software.

---

## Completed Work

### v1.2.0 - Floating Panel Redesign (January 2026)

Complete redesign of the floating panel with unified design system and improved UX for both technical and non-technical users.

#### Files Modified
- `src/content/floating/FloatingPanel.tsx` - Green design system, Timeline button
- `src/content/floating/FloatingApp.tsx` - Complete redesign
- `src/content/floating/inject.tsx` - Updated styles, timeline handler
- `src/background/service-worker.ts` - Added OPEN_TIMELINE_PANEL handler

#### New Documentation
- `IMPROVEMENTS.md` - Comprehensive roadmap and improvement suggestions

#### Features Added

**Unified Design System**
- Migrated from purple/indigo to v1's green accent theme (`#22c55e`)
- Consistent color tokens across both panel and floating UI
- Dark backgrounds matching v1 (`#1a1a1a`, `#242424`)
- Green accent for interactive elements and highlights

**Human-Readable Descriptions**
- Natural language descriptions for each animation
- Examples: "Fades smoothly with soft landing", "Scales gracefully with custom curve"
- Based on animation name, duration, and timing function
- Searchable - users can search by effect (e.g., "fade", "bounce")

**Mini Timeline Visualization**
- Each animation card shows a mini timeline bar
- Bar position = delay, width = duration
- Color-coded by animation type
- Visual timing comparison at a glance

**Improved Animation Cards**
- Color-coded type badges (Keyframes, Transition, GSAP, Framer, Web API, Scroll)
- Element tag + class name display
- Clear duration and delay display
- Type-specific selection highlighting

**Tabbed Details Panel**
- "Overview" tab: Grid of animation properties
- "Code" tab: Syntax-highlighted CSS
- Animated expand/collapse transition
- Copy button with checkmark feedback

**Open in Timeline Button**
- Header button to launch full v1 timeline panel
- Opens in new tab with current page context
- Preserves source tab reference

**Polish & Accessibility**
- Green focus outlines for keyboard navigation
- Smooth hover transitions
- Improved scrollbar styling
- Loading animation during scan
- Better empty states

---

### v1.1.0 - CSS Export Feature (January 2026)

Added the ability to export detected animations as CSS files.

#### New Files Created
- `src/panel/utils/export.ts` - Export utility functions

#### Files Modified
- `src/panel/components/Header.tsx` - Added "Export CSS" button

#### Features Added

**Bulk Export (Header)**
- New "Export CSS" button next to "Rescan"
- Downloads all animations as a single `.css` file
- Filename includes source domain (e.g., `example.com-animations.css`)
- Visual feedback shows "Exported" for 2 seconds after download
- Button disabled when no animations detected

**Export Utilities**
- `exportAllAsCSS(animations)` - Combines all animations with header comments
- `downloadFile(content, filename)` - Triggers browser file download
- `generateFilename(sourceUrl)` - Creates domain-based filename
- `copyToClipboard(text)` - Clipboard helper with error handling

**Single Animation Export (Already Existed)**
- Copy animation CSS property
- Copy @keyframes rule
- Copy complete CSS (selector + animation + keyframes)

---

## Planned Improvements

### Priority 1: More CSS Property Detection

**Status:** Not Started

**Goal:** Extend the scanner to detect additional CSS animation properties that are currently missed.

#### Properties to Add
| Property | Description |
|----------|-------------|
| `animation-play-state` | Whether animation is running or paused |
| `animation-composition` | How values combine (replace/add/accumulate) |
| `animation-range` | Start/end points for scroll-driven animations |
| CSS custom properties | Animations using `--variable` syntax |
| Filter animations | `blur()`, `brightness()`, `contrast()`, etc. |
| `clip-path` animations | Shape-based reveal animations |
| SVG attribute animations | `cx`, `cy`, `r`, `d`, etc. |

#### Files to Modify
- `src/content/scanner.ts` - Add property extraction
- `src/shared/types.ts` - Extend Animation interface
- `src/panel/components/AnimationDetails.tsx` - Display new properties

#### Implementation Notes
```typescript
// Example additions to scanner.ts
const playState = computed.animationPlayState;
const composition = computed.getPropertyValue('animation-composition');
const range = computed.getPropertyValue('animation-range');
```

---

### Priority 2: Animation Editing with Live Preview

**Status:** Not Started

**Goal:** Allow users to modify animation properties and see changes in real-time on the original page.

#### Features
- Edit duration, delay, timing function
- Modify iteration count, direction, fill mode
- Live preview on the actual webpage
- Non-destructive editing (can cancel)
- Generate updated CSS after changes

#### New Files to Create
- `src/panel/components/EditAnimationModal.tsx` - Edit interface

#### Files to Modify
- `src/shared/messages.ts` - Add PREVIEW_ANIMATION, APPLY_ANIMATION messages
- `src/shared/types.ts` - Add AnimationEditPayload type
- `src/panel/store/animationStore.ts` - Add editing state
- `src/panel/components/DetailsSidebar.tsx` - Add "Edit" button
- `src/content/index.ts` - Handle preview messages

#### Message Flow
```
Panel UI → Background → Content Script
                              ↓
                    Inject temporary <style>
                              ↓
                    Element animates with new values
```

#### Edit Modal Fields
- Duration slider (0-10000ms)
- Delay slider (0-5000ms)
- Timing function dropdown (+ custom cubic-bezier)
- Iteration count (1 to infinite)
- Direction dropdown
- Fill mode dropdown
- Live preview toggle
- Apply / Cancel buttons

---

### Priority 3: Better GSAP Detection

**Status:** Not Started

**Goal:** Capture more comprehensive data from GSAP animations including timeline hierarchy, ScrollTrigger, and playback state.

#### Current Limitations
- Only captures basic tween data (duration, delay, ease, targets)
- Missing playback state (isActive, isPaused, progress)
- No timeline hierarchy visualization
- ScrollTrigger data partially captured
- Stagger configurations not detected

#### Enhancements Planned

**A. Enhanced Tween Metadata**
```typescript
playbackState: {
  isActive: tween.isActive(),
  isPaused: tween.isPaused(),
  progress: tween.progress(),
  reversed: tween.reversed(),
  timeScale: tween.timeScale()
}
```

**B. Timeline Hierarchy**
- Track parent-child relationships between timelines
- Capture timeline labels
- Store timeline nesting depth
- Visualize in panel UI

**C. Stagger Detection**
```typescript
staggerConfig: {
  amount: vars.stagger.amount,
  from: vars.stagger.from,
  ease: vars.stagger.ease
}
```

**D. ScrollTrigger Enhancement**
- Capture trigger element selector
- Store start/end positions
- Track pin configuration
- Record scrub settings

**E. Bi-directional Communication**
- Query mechanism for real-time state updates
- Enable playback control from panel (play/pause/seek)

#### Files to Modify
- `src/content/scanner.ts` - Enhanced GSAP scanning
- `src/content/injected/pageScript.ts` - Better data extraction
- `src/shared/types.ts` - Extended Animation interface
- `src/panel/components/Timeline/TimelineBar.tsx` - Show GSAP-specific info

---

### Priority 4: Additional Export Formats

**Status:** Not Started (Basic CSS export completed)

**Goal:** Add more export format options beyond plain CSS.

#### Formats to Add
| Format | Description |
|--------|-------------|
| SCSS | With variables for timing values |
| JSON | Full animation data structure |
| HTML Snippet | Element + embedded style tag |

#### Example SCSS Output
```scss
$animation-duration: 500ms;
$animation-delay: 100ms;
$animation-easing: ease-out;

.element {
  animation-name: fadeIn;
  animation-duration: $animation-duration;
  animation-timing-function: $animation-easing;
  animation-delay: $animation-delay;
}
```

---

## Architecture Reference

### Project Structure
```
src/
├── content/                 # Content script (injected into pages)
│   ├── index.ts            # Main entry, message handler
│   ├── scanner.ts          # Animation detection engine
│   ├── highlighter.ts      # Element highlighting
│   ├── floating/           # Lightweight overlay UI
│   └── injected/           # Page-context scripts for GSAP
├── background/
│   └── service-worker.ts   # Extension event handler
├── panel/                  # React dashboard
│   ├── components/         # UI components
│   ├── store/              # Zustand state management
│   └── utils/              # Helper functions (including export.ts)
└── shared/
    ├── types.ts            # TypeScript interfaces
    └── messages.ts         # Message type definitions
```

### Key Files for Each Feature
| Feature | Primary Files |
|---------|---------------|
| CSS Detection | `scanner.ts`, `types.ts` |
| Export | `export.ts`, `DetailsSidebar.tsx`, `Header.tsx` |
| Editing | `EditAnimationModal.tsx` (new), `messages.ts`, `animationStore.ts` |
| GSAP | `scanner.ts`, `pageScript.ts`, `inject.ts` |

### Animation Types Supported
- CSS `@keyframes` animations
- CSS transitions
- Web Animations API
- Scroll-driven animations
- GSAP animations
- Framer Motion animations

---

## Testing Checklist

### Export Feature Testing
- [ ] Export single animation via DetailsSidebar copy buttons
- [ ] Export all animations via Header "Export CSS" button
- [ ] Verify exported CSS is valid and works when pasted into new page
- [ ] Test with pages containing 10+ animations
- [ ] Test with different animation types (CSS, GSAP, transitions)

### Future Feature Testing
- [ ] GSAP: Test on greensock.com/showcase
- [ ] CSS Detection: Create test page with all animation properties
- [ ] Editing: Verify live preview updates original page
- [ ] Editing: Verify cancel reverts changes

---

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (watches for changes)
npm run dev

# Production build
npm run build

# Load extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the dist/ folder
```

---

## Contributing

When adding new features:
1. Update `src/shared/types.ts` with new interfaces
2. Update `src/shared/messages.ts` if adding new message types
3. Add detection logic to `src/content/scanner.ts`
4. Add UI components to `src/panel/components/`
5. Update this changelog with completed work

---

*Last updated: January 2026*
