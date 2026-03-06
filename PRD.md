# CSS Weaver - Product Requirements Document

## Executive Summary

CSS Weaver is a Chrome extension that allows designers and developers to visualize CSS animations from any website as an interactive timeline, similar to Adobe After Effects or video editing software. The tool helps users understand animation timing, stagger patterns, and implementation details without diving into code.

---

## Problem Statement

### The Challenge
Designers and developers working with CSS animations face several challenges:

1. **Invisible Timing** - CSS animations happen fast; it's hard to see the relationship between multiple animations, their delays, and durations.

2. **Stagger Pattern Blindness** - When elements animate in sequence (stagger), the pattern is only visible while running. There's no way to "see" the timing statically.

3. **Reverse Engineering Difficulty** - Inspecting animations on other sites requires digging through DevTools, finding stylesheets, and mentally piecing together `@keyframes` with `animation` properties.

4. **No Standard Visualization** - Unlike video timelines, there's no industry-standard way to visualize CSS animation timing.

### The Opportunity
Create a tool that makes CSS animation timing visible, inspectable, and understandable at a glance - like a video editor timeline for web animations.

---

## Product Vision

**For** designers and front-end developers
**Who** need to understand, debug, or learn from CSS animations
**CSS Weaver is** a Chrome extension
**That** visualizes all CSS animations on any webpage as an interactive timeline
**Unlike** browser DevTools or manual inspection
**Our product** shows animation timing as visual bars, reveals stagger patterns instantly, and provides one-click access to animation details.

---

## Target Users

### Primary: Front-End Developers
- Debug animation timing issues
- Understand existing animation implementations
- Learn animation patterns from well-designed sites

### Secondary: UI/UX Designers
- Communicate animation timing to developers
- Validate implemented animations match design specs
- Study animation patterns from inspiration sites

### Tertiary: Motion Designers transitioning to web
- Familiar with timeline interfaces (After Effects, Principle)
- Need to understand CSS animation capabilities
- Bridge the gap between design tools and code

---

## Core Features (MVP)

### 1. One-Click Activation
- User clicks the CSS Weaver extension icon
- New tab opens with the timeline UI
- Automatically scans the current page for animations

### 2. Animation Timeline
- **Horizontal bars** represent each CSS animation
- **Bar position** (x-axis) = animation delay
- **Bar width** = animation duration
- **Stagger patterns** become visually obvious
- **Time ruler** at top shows milliseconds/seconds

### 3. Element Highlighting
- **Hover** on a timeline bar → corresponding element highlights on the original page
- Visual feedback shows which element each animation belongs to

### 4. Animation Details Panel
- **Click** on a timeline bar → slide-up panel appears
- Shows:
  - Animation name
  - Duration, delay, timing function
  - Iteration count, direction, fill mode
  - Full keyframes breakdown (0%, 50%, 100%, etc.)
  - Element selector

### 5. Element Labels
- Each timeline bar shows a label (tag name, class, or generated selector)
- Color-coded by element type or animation name

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                   │
└─────────────────────────────────────────────────────────────────────────┘

1. DISCOVER
   User visits a website with interesting animations
   (e.g., stripe.com, linear.app, vercel.com)
                    │
                    ▼
2. ACTIVATE
   User clicks CSS Weaver extension icon in Chrome toolbar
                    │
                    ▼
3. SCAN
   New tab opens automatically
   Extension scans the original page for CSS animations
   Loading indicator shown briefly
                    │
                    ▼
4. VISUALIZE
   Timeline displays all detected animations
   User sees stagger patterns at a glance
   Time ruler helps understand scale
                    │
                    ▼
5. EXPLORE
   User hovers over bars → elements highlight
   User clicks bar → detail panel slides up
   User studies keyframes, timing functions, etc.
                    │
                    ▼
6. LEARN / DEBUG / ITERATE
   User gains understanding of animation implementation
   Can apply learnings to their own projects
```

---

## Technical Requirements

### Platform
- Chrome Extension (Manifest V3)
- No backend server required
- All processing happens locally in the browser

### Extension Components

| Component | Purpose |
|-----------|---------|
| **Content Script** | Injected into all pages; scans CSS animations; highlights elements |
| **Service Worker** | Handles extension icon click; routes messages; manages tab references |
| **Panel UI** | React app in new tab; displays timeline; handles user interactions |

### CSS Animation Detection

Must parse and extract:
- `@keyframes` rule definitions
- `animation-name`
- `animation-duration`
- `animation-delay`
- `animation-timing-function`
- `animation-iteration-count`
- `animation-direction`
- `animation-fill-mode`

### Communication Protocol

```
Panel ←→ Service Worker ←→ Content Script
        (message routing)     (page access)
```

Messages:
- `SCAN_ANIMATIONS` - Request animation scan
- `ANIMATIONS_FOUND` - Return detected animations
- `HIGHLIGHT_ELEMENT` - Highlight specific element
- `CLEAR_HIGHLIGHT` - Remove highlight

---

## UI/UX Specifications

### Color Palette (Dark Theme)

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark gray | `#1a1a1a` |
| Panel background | Slightly lighter | `#242424` |
| Borders | Subtle gray | `#333333` |
| Primary accent | Green | `#22c55e` |
| Timeline bars | Green variations | `#22c55e` to `#16a34a` |
| Text primary | White | `#ffffff` |
| Text secondary | Gray | `#9ca3af` |

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  CSS Weaver                                    stripe.com           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        (reserved for future:                        │
│                         website preview area)                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ANIMATION TIMELINE                                    0ms    500ms │
├─────────────────────────────────────────────────────────────────────┤
│  │ ▓▓▓▓▓ .hero h1                                                  │
│  │    ▓▓▓▓▓▓▓▓ .hero p                                             │
│  │       ▓▓▓▓▓▓▓▓▓▓▓ .card:nth-child(1)                            │
│  │          ▓▓▓▓▓▓▓▓▓▓▓ .card:nth-child(2)                         │
│  │             ▓▓▓▓▓▓▓▓▓▓▓ .card:nth-child(3)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Timeline Bar Interactions

| Action | Result |
|--------|--------|
| Hover | Bar brightens; element highlights on source page |
| Click | Detail panel slides up from bottom |
| Hover off | Highlight clears |

### Detail Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│  fadeInUp                                                      [×]  │
├─────────────────────────────────────────────────────────────────────┤
│  Element: .hero h1                                                  │
│                                                                     │
│  Duration: 600ms          Delay: 0ms                                │
│  Timing: cubic-bezier(0.4, 0, 0.2, 1)                              │
│  Iterations: 1            Direction: normal                         │
│  Fill Mode: forwards                                                │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  KEYFRAMES                                                          │
│                                                                     │
│  0%    { opacity: 0; transform: translateY(20px) }                 │
│  100%  { opacity: 1; transform: translateY(0) }                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Out of Scope (MVP)

The following features are explicitly **NOT** included in the MVP:

| Feature | Reason |
|---------|--------|
| HTML tree sidebar | Adds complexity; not essential for MVP |
| CSS properties panel | Can be added later; DevTools already does this |
| GSAP/Framer Motion detection | Requires different parsing approach |
| Animation snippet export | Nice-to-have, not core value |
| User accounts | No need for persistence in MVP |
| Animation editing/playback controls | View-only for MVP |
| Cross-browser support | Chrome-only initially |

---

## Success Metrics

### Qualitative
- Users report "aha moments" understanding animation timing
- Positive feedback on timeline visualization clarity
- Users successfully identify stagger patterns

### Quantitative (Post-Launch)
- Extension installs
- Weekly active users
- Average session duration
- Number of pages scanned per session

---

## Technical Constraints

1. **Cross-Origin Stylesheets**
   - `document.styleSheets` throws errors for cross-origin CSS
   - Mitigation: Use `getComputedStyle()` on elements (always works)
   - May miss some keyframe details for external CSS

2. **Dynamic Animations**
   - Animations added via JavaScript after page load won't be detected initially
   - Mitigation: Add "Rescan" button; consider MutationObserver for future

3. **Performance**
   - Pages with hundreds of animated elements may slow scanning
   - Mitigation: Virtualize timeline; limit initial scan depth

4. **Same-Origin Highlighting**
   - Content script can only highlight on pages where it's injected
   - Works on all HTTP/HTTPS pages (per manifest permissions)

---

## Development Phases

### Phase 1: Foundation (Current)
- Project setup (Vite, React, TypeScript, Tailwind)
- Chrome extension configuration (Manifest V3)
- Shared types and message definitions

### Phase 2: Core Detection
- Content script: CSS animation scanner
- Parse stylesheets for @keyframes
- Extract animation properties from elements

### Phase 3: Element Interaction
- Content script: Highlight overlay system
- Message handling for highlight/clear

### Phase 4: Extension Plumbing
- Service worker: Icon click handler
- Tab management and message routing

### Phase 5: Basic UI
- Panel layout and structure
- Header with source URL
- Empty/loading/error states

### Phase 6: Timeline Visualization
- Time ruler component
- Timeline bars with positioning
- Hover interactions

### Phase 7: Detail Panel
- Click-to-expand functionality
- Keyframe display
- All animation properties

### Phase 8: Polish
- Icon design
- Error handling edge cases
- Performance optimization
- Testing on various sites

---

## Future Roadmap (Post-MVP)

| Priority | Feature | Description |
|----------|---------|-------------|
| High | Rescan button | Detect dynamically added animations |
| High | Animation playback | Play/pause/scrub through animations |
| Medium | GSAP detection | Detect GreenSock animations |
| Medium | Export snippets | Copy animation CSS code |
| Medium | Website preview | Show thumbnail of inspected page |
| Low | Firefox support | Cross-browser compatibility |
| Low | Animation editing | Tweak values and see changes |

---

## Appendix: Competitive Analysis

| Tool | Pros | Cons |
|------|------|------|
| **Chrome DevTools** | Built-in; can inspect anything | No timeline view; requires digging |
| **Firefox Animation Inspector** | Has timeline view | Firefox only; cluttered UI |
| **VisBug** | Great for general inspection | Not animation-focused |
| **CSS Peeper** | Good for static CSS | No animation support |

**CSS Weaver's Differentiation:**
- Timeline-first visualization (like video editing)
- Stagger pattern visibility at a glance
- Dedicated to animations, not general CSS
- Clean, focused UI

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | Claude + User | Initial PRD |
