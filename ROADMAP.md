# CSS Weaver Roadmap

## Overview

CSS Weaver is a Chrome DevTools extension that detects, visualizes, and controls animations on web pages. This roadmap outlines planned enhancements to expand animation detection coverage and improve the timeline visualization.

## Current Capabilities (v0.1.0)

✅ **Supported Animation Types:**
- CSS `@keyframes` animations
- CSS transitions
- Web Animations API
- Scroll-driven animations (CSS `animation-timeline`)
- GSAP animations (GreenSock Animation Platform)
- Framer Motion (basic detection via data attributes)

✅ **Core Features:**
- Timeline visualization with animation bars
- Playback controls (play, pause, seek, speed adjustment)
- Details panel with keyframe code and properties
- DOM tree view of animated elements
- Element highlighting on hover
- Floating panel overlay

---

## Phase 1: Critical Bug Fixes (v0.2.0)

**Status:** Planned
**Timeline:** Immediate priority
**Effort:** 2-3 hours

### 🔴 Fix GSAP Detection

**Problem:** GSAP animations not being detected reliably across many websites.

**Root Causes:**
- Limited polling window (5 seconds) misses async-loaded GSAP
- Only checking `window.gsap` - missing bundled/scoped instances
- Not detecting GSAP 2.x (TweenMax/TweenLite)
- Missing dynamically loaded GSAP scripts

**Improvements:**
1. **Extended Detection:**
   - Check multiple globals: `gsap`, `GreenSock`, `gsapVersions.gsap`, `TweenMax`, `TweenLite`
   - Extend polling timeout from 5s to 10s
   - Add background polling (every 1s) for late-loading libraries

2. **Script Tag Detection:**
   - Scan for GSAP script tags in DOM
   - Keep polling aggressively when GSAP script detected

3. **Better Existing Animation Scan:**
   - Recursively scan nested timelines
   - Extract animations from timeline children
   - Support GSAP 3.x data attributes

4. **Diagnostics:**
   - Add `sendDiagnostics()` for troubleshooting
   - Log GSAP version, globals, script tags
   - Help users debug detection issues

**Files Modified:**
- `/src/content/injected/inject.ts`

**Testing:**
- GSAP via CDN (gsap.com examples)
- Bundled GSAP (webpack/vite)
- Async-loaded GSAP
- GSAP 2.x (TweenMax/TweenLite)
- ScrollTrigger plugin

---

## Phase 2: SVG Animation Detection (v0.3.0)

**Status:** Planned
**Timeline:** After Phase 1
**Effort:** 4-5 hours

### 🟢 SVG SMIL Animation Support

**Goal:** Detect native SVG animations used in icons, illustrations, and interactive graphics.

**Animation Types:**
- `<animate>` - Animate SVG attributes over time
- `<animateTransform>` - Animate transform attributes (rotate, scale, translate)
- `<animateMotion>` - Animate along a motion path
- `<set>` - Set attribute values at specific times

**Features:**
1. **Detection:**
   - Query all SMIL elements in DOM
   - Parse timing attributes: `dur`, `begin`, `repeatCount`, `fill`
   - Extract animated properties: `attributeName`, `from`, `to`, `values`, `keyTimes`
   - Generate keyframes from SMIL data

2. **Playback Control:**
   - Use `SVGSVGElement.pauseAnimations()` / `unpauseAnimations()`
   - Seek via `setCurrentTime()`
   - Integrate with existing playback controls

3. **Edge Cases:**
   - Handle self-referencing timing (`begin="other.end"`)
   - Support `repeatCount="indefinite"`
   - Multiple animations on same element
   - Missing or invalid attributes

**Files Modified:**
- `/src/content/scanner.ts` - Add `scanSVGAnimations()` (~250 lines)
- `/src/content/animationController.ts` - Add SMIL playback (~120 lines)
- `/src/shared/types.ts` - Add `'svg-smil'` type

**SMIL Clock Value Support:**
- "2s", "500ms" (standard CSS time)
- "0:30" (MM:SS format)
- "1:30:45.5" (HH:MM:SS.ms format)
- "indefinite" (mapped to 10s default)

**Testing:**
- Simple opacity fade
- Transform rotation
- Motion path animation
- Multiple animations per element
- Chained animations (syncbase timing)

---

## Phase 3: Timeline Enhancements (v0.4.0)

**Status:** Planned
**Timeline:** After Phase 2
**Effort:** 2-3 hours

### 🟡 Property-Based Visual Encoding

**Goal:** Make timeline more informative by showing what properties are being animated.

**Features:**

1. **Color-Coded Animation Bars:**
   - **Transform** (blue `#3b82f6`) - GPU-accelerated, high performance
   - **Opacity** (green `#10b981`) - GPU-accelerated, high performance
   - **Color** (purple `#8b5cf6`) - Paint operation, moderate performance
   - **Layout** (red `#ef4444`) - Reflow/relayout, performance warning
   - **Other** (gray `#6b7280`) - Mixed/unknown properties

2. **Property Filter:**
   - Dropdown to filter by property type
   - Show only transform, opacity, color, or layout animations
   - "All Properties" option for full view

3. **Property Legend:**
   - Visual legend showing color meanings
   - Performance implications for each category
   - Helps users optimize animations

**Property Categorization:**
```typescript
transform, translateX, translateY, translateZ, scale, rotate, skew → Transform
opacity → Opacity
color, backgroundColor, borderColor, fill, stroke → Color
width, height, top, left, right, bottom, margin, padding → Layout
```

**Files Modified:**
- `/src/panel/components/Timeline/TimelineBar.tsx` - Add color coding (~50 lines)
- `/src/panel/components/Timeline/TimelineControls.tsx` - Add filter (~20 lines)
- `/src/panel/store/animationStore.ts` - Add filter state (~15 lines)
- `/src/panel/components/Timeline/PropertyLegend.tsx` - New component (~40 lines)

**Performance:**
- Use `useMemo` to cache property analysis
- Only recalculate when keyframes change
- Minimal rendering overhead

---

## Future Enhancements (v0.5.0+)

### 🔵 Lottie Animation Detection

**Status:** Researched, not scheduled
**Complexity:** Moderate

**Approach:**
- Detect Lottie player library (`window.lottie`, `bodymovin`)
- Monkey-patch `lottie.loadAnimation()` calls
- Parse animation JSON to extract:
  - Layer structure
  - Timing information
  - Animated properties
- Reuse GSAP monkey-patching pattern

**Benefits:**
- Lottie is very common (After Effects exports)
- Used for complex illustrations and animations
- Detectable via library hooks

---

### 🔵 Rive Animation Detection

**Status:** Researched, not scheduled
**Complexity:** High

**Approach:**
- Detect Rive runtime (`window.rive`, `@rive-app/canvas`)
- Hook into Rive player initialization
- Access Rive StateMachine API
- Track state transitions and animation playback
- Possibly inspect canvas for visual changes

**Challenges:**
- Binary .riv format (not human-readable)
- Canvas-based rendering (harder to inspect)
- Complex state machine architecture
- Less common than Lottie

---

### 🔵 Enhanced Framer Motion Detection

**Status:** Needs design
**Complexity:** Moderate

**Current Limitation:**
- Only detects via `data-projection-id` and `data-framer-component-type` attributes
- Misses many Framer Motion animations

**Proposed Improvements:**
- Hook into Framer Motion library (`window.FramerMotion`)
- Detect motion components and variants
- Track animation state changes
- Extract spring/tween configurations

---

### 🔵 Additional JavaScript Libraries

**Status:** Needs design
**Complexity:** Low-Moderate per library

**Candidates:**
1. **jQuery `.animate()`** - Very common on legacy sites
2. **Anime.js** - Popular lightweight library
3. **Velocity.js** - jQuery alternative
4. **Motion One** - Modern web animations
5. **Popmotion** - Functional reactive animations

**Pattern:** Reuse GSAP monkey-patching approach for each library

---

### 🔵 Timeline Advanced Features

**Status:** Ideas, not planned

**Potential Features:**
1. **Conflict Detection:**
   - Highlight when multiple animations target same property
   - Show overlapping animations with warnings
   - Suggest fixes for conflicting timings

2. **Performance Indicators:**
   - Mark non-GPU-accelerated animations
   - Show composite layer hints
   - Estimate FPS impact

3. **Timeline Zoom & Pan:**
   - Zoom in for detailed inspection
   - Pan across long timelines
   - Minimap for overview

4. **Animation Recording:**
   - Record page animations as GIF/video
   - Export timeline data as JSON
   - Share animation reports

5. **Animation Editing:**
   - Adjust timing via drag-and-drop
   - Modify easing curves
   - Real-time preview of changes

---

## Technical Debt & Improvements

### Code Quality
- [ ] Add TypeScript strict mode
- [ ] Improve test coverage (currently minimal)
- [ ] Add E2E tests with Playwright
- [ ] Refactor large functions in scanner.ts
- [ ] Better error handling and logging

### Performance
- [ ] Optimize scan performance for large DOMs
- [ ] Reduce memory footprint
- [ ] Lazy-load timeline components
- [ ] Virtual scrolling for large animation lists

### UX Improvements
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Export/import animation data
- [ ] Animation search/filter
- [ ] Better mobile device detection

### Documentation
- [ ] Architecture documentation
- [ ] Contributing guide
- [ ] API documentation for adding new detectors
- [ ] Video tutorials
- [ ] Example websites gallery

---

## Browser Compatibility

**Currently Supported:**
- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ✅ Arc Browser
- ✅ Brave

**Future Support:**
- ⏳ Firefox (requires Manifest V2 port)
- ⏳ Safari (requires Safari extension adaptation)

---

## Community & Contributions

**How to Contribute:**
1. Report bugs and issues on GitHub
2. Suggest new animation libraries to support
3. Submit test pages with complex animations
4. Contribute code via pull requests

**Priority for Community Input:**
- Which animation libraries should we prioritize?
- What timeline features are most valuable?
- Performance issues on specific websites
- UI/UX improvement suggestions

---

## Version History

### v0.1.0 (Current)
- Initial release
- CSS animations, transitions, Web Animations API
- GSAP detection
- Basic timeline and playback controls

### v0.2.0 (Planned - Critical Fixes)
- Improved GSAP detection
- Better polling and error handling
- Diagnostics logging

### v0.3.0 (Planned - SVG Support)
- SVG SMIL animation detection
- SMIL playback control
- Support for all SMIL timing formats

### v0.4.0 (Planned - Timeline Improvements)
- Property-based color coding
- Property type filtering
- Performance categorization

### v0.5.0+ (Future)
- TBD based on user feedback
- Lottie/Rive support
- Advanced timeline features

---

## Success Metrics

**Detection Coverage:**
- Target: 95%+ of animations on popular websites
- Track: Animation types missed per site
- Improve: Based on user reports

**Performance:**
- Scan time: < 200ms for typical page
- Memory usage: < 10MB for typical page
- FPS impact: < 5% during playback

**User Satisfaction:**
- GitHub stars and feedback
- Bug reports vs feature requests
- Active users (via telemetry opt-in)

---

## License & Credits

**License:** MIT
**Created by:** [Your Name/Team]
**Special Thanks:** GSAP team, Web Animations API spec authors, CSS Weaver community

---

*Last Updated: 2026-02-15*
*Current Version: 0.1.0*
*Next Release: 0.2.0 (GSAP Fixes)*
