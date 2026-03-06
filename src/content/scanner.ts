import type { Animation, KeyframeStep, KeyframesData, AnimationLonghand, DOMTreeNode } from '../shared/types';

/**
 * Collected keyframes data including raw CSS text
 */
interface CollectedKeyframes {
  steps: KeyframeStep[];
  rawCssText: string;
}

/**
 * Scans the current page for all CSS animations
 */
export function scanAnimations(): Animation[] {
  const animations: Animation[] = [];
  const keyframesMap = collectKeyframes();

  // Query all elements and check for animations
  const allElements = document.querySelectorAll('*');

  allElements.forEach((element) => {
    const computed = getComputedStyle(element);

    // Check for CSS animations
    const animationNames = computed.animationName;
    if (animationNames && animationNames !== 'none') {
      // Parse multiple animations (comma-separated)
      const names = splitCSSValues(animationNames);
      const durations = splitCSSValues(computed.animationDuration);
      const delays = splitCSSValues(computed.animationDelay);
      const timingFunctions = splitCSSValues(computed.animationTimingFunction);
      const iterationCounts = splitCSSValues(computed.animationIterationCount);
      const directions = splitCSSValues(computed.animationDirection);
      const fillModes = splitCSSValues(computed.animationFillMode);

      // Create an animation entry for each animation on this element
      names.forEach((name, index) => {
        if (name === 'none') return;

        const duration = parseTime(durations[index] || durations[0] || '0s');
        const delay = parseTime(delays[index] || delays[0] || '0s');
        const iterCount = parseIterationCount(
          iterationCounts[index] || iterationCounts[0] || '1'
        );

        // Capture element position
        const rect = element.getBoundingClientRect();
        const position = {
          top: rect.top + window.scrollY,
          bottom: rect.top + window.scrollY + rect.height,
          height: rect.height,
        };

        // Get keyframes data
        const keyframesInfo = keyframesMap.get(name);

        // Build animation longhand values
        const animationLonghand: AnimationLonghand = {
          name,
          duration: durations[index] || durations[0] || '0s',
          timingFunction: timingFunctions[index] || timingFunctions[0] || 'ease',
          delay: delays[index] || delays[0] || '0s',
          iterationCount: iterationCounts[index] || iterationCounts[0] || '1',
          direction: directions[index] || directions[0] || 'normal',
          fillMode: fillModes[index] || fillModes[0] || 'none',
        };

        // Build animation shorthand string
        const animationShorthand = buildAnimationShorthand(animationLonghand);

        // Build keyframes data with raw CSS
        const keyframesData: KeyframesData | null = keyframesInfo
          ? {
              name,
              steps: keyframesInfo.steps,
              rawCssText: keyframesInfo.rawCssText,
            }
          : null;

        const animation: Animation = {
          id: generateId(),
          selector: getSelector(element as HTMLElement),
          tagName: element.tagName,
          name,
          duration,
          delay,
          timingFunction: timingFunctions[index] || timingFunctions[0] || 'ease',
          iterationCount: iterCount,
          direction: (directions[index] || directions[0] || 'normal') as Animation['direction'],
          fillMode: (fillModes[index] || fillModes[0] || 'none') as Animation['fillMode'],
          type: 'animation',
          keyframes: keyframesInfo?.steps || null,
          keyframesData,
          animationShorthand,
          animationLonghand,
          startTime: delay,
          endTime: delay + duration * (iterCount === 'infinite' ? 1 : iterCount),
          position,
        };

        // Store element reference for highlighting (append to support multiple animations)
        appendWeaverId(element as HTMLElement, animation.id);

        animations.push(animation);
      });
    }

    // Check for CSS transitions
    const transitionProperty = computed.transitionProperty;
    if (transitionProperty && transitionProperty !== 'none' && transitionProperty !== 'all') {
      const properties = splitCSSValues(transitionProperty);
      const durations = splitCSSValues(computed.transitionDuration);
      const delays = splitCSSValues(computed.transitionDelay);
      const timingFunctions = splitCSSValues(computed.transitionTimingFunction);

      // Create a transition entry for each transitioned property
      properties.forEach((prop, index) => {
        if (prop === 'none') return;

        const duration = parseTime(durations[index] || durations[0] || '0s');
        const delay = parseTime(delays[index] || delays[0] || '0s');

        // Only add if duration is meaningful
        if (duration > 0) {
          // Capture element position
          const rect = element.getBoundingClientRect();
          const position = {
            top: rect.top + window.scrollY,
            bottom: rect.top + window.scrollY + rect.height,
            height: rect.height,
          };

          const transition: Animation = {
            id: generateId(),
            selector: getSelector(element as HTMLElement),
            tagName: element.tagName,
            name: `transition: ${prop}`,
            duration,
            delay,
            timingFunction: timingFunctions[index] || timingFunctions[0] || 'ease',
            iterationCount: 1,
            direction: 'normal',
            fillMode: 'none',
            type: 'transition',
            keyframes: null,
            keyframesData: null,
            animationShorthand: `transition: ${prop} ${durations[index] || durations[0] || '0s'} ${timingFunctions[index] || timingFunctions[0] || 'ease'} ${delays[index] || delays[0] || '0s'}`,
            animationLonghand: null,
            startTime: delay,
            endTime: delay + duration,
            position,
          };

          // Store element reference for highlighting (append to support multiple animations)
          appendWeaverId(element as HTMLElement, transition.id);

          animations.push(transition);
        }
      });
    }

    // Check for scroll-driven animations
    const animationTimeline = computed.getPropertyValue('animation-timeline');
    if (animationTimeline && animationTimeline !== 'auto' && animationTimeline !== 'none') {
      // This element has a scroll-driven animation
      const animationName = computed.animationName;
      if (animationName && animationName !== 'none') {
        const names = splitCSSValues(animationName);
        const timelines = splitCSSValues(animationTimeline);

        names.forEach((name, index) => {
          if (name === 'none') return;

          const timeline = timelines[index] || timelines[0] || '';
          const isScrollTimeline = timeline.includes('scroll(') || timeline.includes('scroll');
          const isViewTimeline = timeline.includes('view(') || timeline.includes('view');

          if (isScrollTimeline || isViewTimeline) {
            const rect = element.getBoundingClientRect();
            const position = {
              top: rect.top + window.scrollY,
              bottom: rect.top + window.scrollY + rect.height,
              height: rect.height,
            };

            const keyframesInfo = keyframesMap.get(name);

            const scrollAnim: Animation = {
              id: generateId(),
              selector: getSelector(element as HTMLElement),
              tagName: element.tagName,
              name: `scroll: ${name}`,
              duration: 0, // Scroll-driven animations have no fixed duration
              delay: 0,
              timingFunction: computed.animationTimingFunction || 'ease',
              iterationCount: 1,
              direction: 'normal',
              fillMode: 'both',
              type: 'scroll-driven',
              scrollTimeline: {
                source: isViewTimeline ? 'view' : 'scroll',
                axis: 'block', // Default, could parse from timeline value
              },
              keyframes: keyframesInfo?.steps || null,
              keyframesData: keyframesInfo ? {
                name,
                steps: keyframesInfo.steps,
                rawCssText: keyframesInfo.rawCssText,
              } : null,
              animationShorthand: `animation: ${name}; animation-timeline: ${timeline};`,
              animationLonghand: null,
              startTime: 0,
              endTime: 100, // Represent as 0-100% for scroll progress
              position,
            };

            appendWeaverId(element as HTMLElement, scrollAnim.id);
            animations.push(scrollAnim);
          }
        });
      }
    }
  });

  // Also scan for Web Animations API animations
  scanWebAnimations(animations);

  // Scan for GSAP animations
  scanGSAPAnimations(animations);

  // Scan for Framer Motion animations
  scanFramerMotionAnimations(animations);

  return animations;
}

/**
 * Scans for animations created via the Web Animations API
 */
function scanWebAnimations(existingAnimations: Animation[]): void {
  try {
    // Get all animations in the document
    const webAnimations = document.getAnimations();

    // Track which elements already have CSS animations detected
    const existingElements = new Set<Element>();
    existingAnimations.forEach((anim) => {
      const el = document.querySelector(`[data-css-weaver-id="${anim.id}"]`);
      if (el) existingElements.add(el);
    });

    webAnimations.forEach((anim) => {
      // Skip CSS animations (already detected) - they have a CSS animation name
      if (anim instanceof CSSAnimation || anim instanceof CSSTransition) {
        return;
      }

      const effect = anim.effect as KeyframeEffect | null;
      if (!effect || !effect.target) return;

      const target = effect.target as Element;

      // Get timing info
      const timing = effect.getTiming();
      const duration = typeof timing.duration === 'number' ? timing.duration : 0;
      const delay = typeof timing.delay === 'number' ? timing.delay : 0;

      // Get keyframes
      const keyframes = effect.getKeyframes();
      const keyframeSteps: KeyframeStep[] = keyframes.map((kf) => {
        const props: Record<string, string> = {};
        for (const [key, value] of Object.entries(kf)) {
          if (key !== 'offset' && key !== 'easing' && key !== 'composite' && value !== undefined) {
            props[key] = String(value);
          }
        }
        return {
          offset: kf.offset ?? 0,
          properties: props,
          rawCssText: JSON.stringify(props),
        };
      });

      const rect = target.getBoundingClientRect();
      const position = {
        top: rect.top + window.scrollY,
        bottom: rect.top + window.scrollY + rect.height,
        height: rect.height,
      };

      const webAnim: Animation = {
        id: generateId(),
        selector: getSelector(target as HTMLElement),
        tagName: target.tagName,
        name: `Web Animation`,
        duration,
        delay,
        timingFunction: String(timing.easing || 'linear'),
        iterationCount: timing.iterations === Infinity ? 'infinite' : (timing.iterations || 1),
        direction: (timing.direction || 'normal') as Animation['direction'],
        fillMode: (timing.fill || 'none') as Animation['fillMode'],
        type: 'web-animation',
        keyframes: keyframeSteps.length > 0 ? keyframeSteps : null,
        keyframesData: null,
        animationShorthand: `element.animate([...], { duration: ${duration}, delay: ${delay} })`,
        animationLonghand: null,
        startTime: delay,
        endTime: delay + duration,
        position,
      };

      appendWeaverId(target as HTMLElement, webAnim.id);
      existingAnimations.push(webAnim);
    });
  } catch (error) {
    console.debug('CSS Weaver: Web Animations API scan failed:', error);
  }
}

/**
 * Scans for GSAP animations
 * GSAP exposes gsap.globalTimeline which contains all active tweens
 */
function scanGSAPAnimations(existingAnimations: Animation[]): void {
  try {
    // Check if GSAP is available
    const gsap = (window as any).gsap || (window as any).GreenSock;
    if (!gsap) {
      console.debug('CSS Weaver: GSAP not detected on this page');
      return;
    }

    console.log('🎨 CSS Weaver: GSAP detected, scanning animations...');

    // Get the global timeline
    const globalTimeline = gsap.globalTimeline;
    if (!globalTimeline) return;

    // Get all children (tweens and timelines)
    const children = globalTimeline.getChildren(true, true, true);

    children.forEach((tween: any) => {
      // Skip if not a tween with a target
      if (!tween.targets || typeof tween.targets !== 'function') return;

      const targets = tween.targets();
      if (!targets || targets.length === 0) return;

      targets.forEach((target: any) => {
        if (!(target instanceof HTMLElement)) return;

        // Skip if already has an animation ID (avoid duplicates)
        if (target.dataset.cssWeaverId) return;

        const duration = (tween.duration?.() || 0) * 1000; // Convert to ms
        const delay = (tween.delay?.() || 0) * 1000;

        // Try to get the animated properties
        const vars = tween.vars || {};
        const animatedProps: Record<string, string> = {};
        for (const [key, value] of Object.entries(vars)) {
          if (key !== 'ease' && key !== 'duration' && key !== 'delay' && key !== 'onComplete' && key !== 'onStart') {
            animatedProps[key] = String(value);
          }
        }

        const rect = target.getBoundingClientRect();
        const position = {
          top: rect.top + window.scrollY,
          bottom: rect.top + window.scrollY + rect.height,
          height: rect.height,
        };

        // Build a name from the animated properties
        const propNames = Object.keys(animatedProps).slice(0, 3).join(', ');
        const tweenName = propNames ? `gsap: ${propNames}` : 'gsap tween';

        const gsapAnim: Animation = {
          id: generateId(),
          selector: getSelector(target),
          tagName: target.tagName,
          name: tweenName,
          duration,
          delay,
          timingFunction: vars.ease || 'power1.out',
          iterationCount: vars.repeat === -1 ? 'infinite' : (vars.repeat || 0) + 1,
          direction: vars.yoyo ? 'alternate' : 'normal',
          fillMode: 'both',
          type: 'gsap',
          keyframes: Object.keys(animatedProps).length > 0 ? [{
            offset: 0,
            properties: {},
            rawCssText: '/* start state */',
          }, {
            offset: 1,
            properties: animatedProps,
            rawCssText: JSON.stringify(animatedProps),
          }] : null,
          keyframesData: null,
          animationShorthand: `gsap.to(element, { ${Object.entries(animatedProps).map(([k, v]) => `${k}: ${v}`).join(', ')}, duration: ${duration / 1000}s })`,
          animationLonghand: null,
          startTime: delay,
          endTime: delay + duration,
          position,
        };

        appendWeaverId(target, gsapAnim.id);
        existingAnimations.push(gsapAnim);
      });
    });

    console.log(`🎨 CSS Weaver: Found ${existingAnimations.filter(a => a.type === 'gsap').length} GSAP animations`);
  } catch (error) {
    console.debug('CSS Weaver: GSAP scan failed:', error);
  }
}

/**
 * Scans for Framer Motion animations
 * Framer Motion uses data attributes and the Web Animations API under the hood
 */
function scanFramerMotionAnimations(existingAnimations: Animation[]): void {
  try {
    // Check for Framer Motion indicators
    // Framer Motion adds specific data attributes to animated elements
    const motionElements = document.querySelectorAll('[data-framer-component-type], [data-framer-name], [style*="--framer"], [data-motion-pop-id]');

    if (motionElements.length === 0) {
      // Check if React and Framer Motion are loaded
      const hasFramerMotion = (window as any).__FRAMER_MOTION__ ||
                              (window as any).MotionConfig ||
                              document.querySelector('[data-projection-id]');

      if (!hasFramerMotion) {
        console.debug('CSS Weaver: Framer Motion not detected on this page');
        return;
      }
    }

    console.log('🎨 CSS Weaver: Framer Motion detected, scanning animations...');

    // Find elements with Framer Motion's projection system (used for layout animations)
    const projectionElements = document.querySelectorAll('[data-projection-id]');

    projectionElements.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.dataset.cssWeaverId) return; // Skip if already processed

      const rect = element.getBoundingClientRect();
      const position = {
        top: rect.top + window.scrollY,
        bottom: rect.top + window.scrollY + rect.height,
        height: rect.height,
      };

      // Try to extract animation info from computed styles
      const computed = getComputedStyle(element);
      const transform = computed.transform;
      const opacity = computed.opacity;

      const framerAnim: Animation = {
        id: generateId(),
        selector: getSelector(element),
        tagName: element.tagName,
        name: `framer: layout animation`,
        duration: 300, // Default Framer Motion duration
        delay: 0,
        timingFunction: 'ease-out',
        iterationCount: 1,
        direction: 'normal',
        fillMode: 'both',
        type: 'framer-motion',
        keyframes: [{
          offset: 0,
          properties: { transform: 'none', opacity: '0' },
          rawCssText: '/* initial state */',
        }, {
          offset: 1,
          properties: {
            transform: transform !== 'none' ? transform : 'none',
            opacity: opacity,
          },
          rawCssText: `transform: ${transform}; opacity: ${opacity};`,
        }],
        keyframesData: null,
        animationShorthand: `<motion.div animate={{ ... }} />`,
        animationLonghand: null,
        startTime: 0,
        endTime: 300,
        position,
      };

      appendWeaverId(element, framerAnim.id);
      existingAnimations.push(framerAnim);
    });

    // Also look for Framer-specific data attributes
    const framerElements = document.querySelectorAll('[data-framer-component-type], [data-framer-name]');
    framerElements.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.dataset.cssWeaverId) return;

      const rect = element.getBoundingClientRect();
      const position = {
        top: rect.top + window.scrollY,
        bottom: rect.top + window.scrollY + rect.height,
        height: rect.height,
      };

      const componentType = element.dataset.framerComponentType || element.dataset.framerName || 'component';

      const framerAnim: Animation = {
        id: generateId(),
        selector: getSelector(element),
        tagName: element.tagName,
        name: `framer: ${componentType}`,
        duration: 300,
        delay: 0,
        timingFunction: 'ease-out',
        iterationCount: 1,
        direction: 'normal',
        fillMode: 'both',
        type: 'framer-motion',
        keyframes: null,
        keyframesData: null,
        animationShorthand: `<motion.${element.tagName.toLowerCase()} />`,
        animationLonghand: null,
        startTime: 0,
        endTime: 300,
        position,
      };

      appendWeaverId(element, framerAnim.id);
      existingAnimations.push(framerAnim);
    });

    console.log(`🎨 CSS Weaver: Found ${existingAnimations.filter(a => a.type === 'framer-motion').length} Framer Motion animations`);
  } catch (error) {
    console.debug('CSS Weaver: Framer Motion scan failed:', error);
  }
}

/**
 * Collects all @keyframes rules from stylesheets
 */
function collectKeyframes(): Map<string, CollectedKeyframes> {
  const keyframesMap = new Map<string, CollectedKeyframes>();

  // Iterate through all stylesheets
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;

      for (const rule of rules) {
        if (rule instanceof CSSKeyframesRule) {
          const steps: KeyframeStep[] = [];

          // Capture the complete @keyframes block CSS text
          const rawCssText = rule.cssText;

          for (const keyframe of rule.cssRules) {
            if (keyframe instanceof CSSKeyframeRule) {
              // Parse the keyText (e.g., "0%", "50%", "100%", "from", "to")
              const offsets = parseKeyframeSelector(keyframe.keyText);

              // Capture raw CSS text for this keyframe step
              const stepRawCss = keyframe.cssText;

              offsets.forEach((offset) => {
                steps.push({
                  offset,
                  properties: parseKeyframeProperties(keyframe.style),
                  rawCssText: stepRawCss,
                });
              });
            }
          }

          // Sort by offset
          steps.sort((a, b) => a.offset - b.offset);
          keyframesMap.set(rule.name, {
            steps,
            rawCssText,
          });
        }
      }
    } catch (e) {
      // Cross-origin stylesheet - silently skip
      console.debug('CSS Weaver: Skipping cross-origin stylesheet');
    }
  }

  return keyframesMap;
}

/**
 * Parse keyframe selector like "0%", "50%, 100%", "from", "to"
 */
function parseKeyframeSelector(keyText: string): number[] {
  return keyText.split(',').map((part) => {
    const trimmed = part.trim().toLowerCase();
    if (trimmed === 'from') return 0;
    if (trimmed === 'to') return 1;
    return parseFloat(trimmed) / 100;
  });
}

/**
 * Extract CSS properties from a keyframe style
 */
function parseKeyframeProperties(style: CSSStyleDeclaration): Record<string, string> {
  const properties: Record<string, string> = {};

  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    const value = style.getPropertyValue(prop);
    if (value) {
      properties[prop] = value;
    }
  }

  return properties;
}

/**
 * Parse CSS time value to milliseconds
 */
function parseTime(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith('ms')) {
    return parseFloat(trimmed);
  }
  if (trimmed.endsWith('s')) {
    return parseFloat(trimmed) * 1000;
  }
  return parseFloat(trimmed) || 0;
}

/**
 * Append animation ID to element's data attribute (supports multiple animations on same element)
 * Uses comma-separated list to store multiple IDs
 */
function appendWeaverId(element: HTMLElement, id: string): void {
  const existingIds = element.dataset.cssWeaverId || '';
  const ids = existingIds ? existingIds.split(',') : [];
  if (!ids.includes(id)) {
    ids.push(id);
  }
  element.dataset.cssWeaverId = ids.join(',');
}

/**
 * Parse iteration count
 */
function parseIterationCount(value: string): number | 'infinite' {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'infinite') return 'infinite';
  return parseFloat(trimmed) || 1;
}

/**
 * Split CSS comma-separated values, respecting parentheses
 */
function splitCSSValues(value: string): string[] {
  const result: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of value) {
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === ',' && parenDepth === 0) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

/**
 * Generate a unique CSS selector for an element
 */
function getSelector(element: HTMLElement): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Build a path
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body && path.length < 4) {
    let selector = current.tagName.toLowerCase();

    // Add class if available
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        // Use first meaningful class (skip utility classes)
        const meaningfulClass = classes.find(
          (c) => !c.match(/^(w-|h-|p-|m-|flex|grid|text-|bg-|border)/)
        );
        if (meaningfulClass) {
          selector += `.${meaningfulClass}`;
        } else if (classes[0]) {
          selector += `.${classes[0]}`;
        }
      }
    }

    // Add nth-child if needed for uniqueness
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        (el) => el.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Build animation shorthand property string
 */
function buildAnimationShorthand(props: AnimationLonghand): string {
  return `${props.name} ${props.duration} ${props.timingFunction} ${props.delay} ${props.iterationCount} ${props.direction} ${props.fillMode}`;
}

/**
 * Find element by animation ID, checking multiple data attributes for compatibility
 * with both CSS animations (data-css-weaver-id) and JS-detected animations (data-css-weaver-gsap)
 */
export function findElementByAnimationId(animId: string): HTMLElement | null {
  // Primary: check data-css-weaver-id (comma-separated for multiple animations)
  const elements = document.querySelectorAll('[data-css-weaver-id]');
  for (const el of elements) {
    const ids = (el as HTMLElement).dataset.cssWeaverId?.split(',') || [];
    if (ids.includes(animId)) {
      return el as HTMLElement;
    }
  }

  // Fallback: check data-css-weaver-gsap for legacy/backward compatibility
  const gsapEl = document.querySelector(`[data-css-weaver-gsap="${animId}"]`) as HTMLElement;
  if (gsapEl) return gsapEl;

  return null;
}

/**
 * Build a minimal DOM tree containing only animated elements and their ancestors.
 * This is used for the HTML Structure sidebar.
 */
export function buildDOMTree(animations: Animation[]): DOMTreeNode | null {
  if (animations.length === 0) return null;

  // Create a map of elements to their animation IDs
  const animatedElements = new Map<HTMLElement, string[]>();

  animations.forEach((anim) => {
    const element = findElementByAnimationId(anim.id);
    if (element) {
      const existing = animatedElements.get(element) || [];
      existing.push(anim.id);
      animatedElements.set(element, existing);
    }
  });

  // Build tree starting from body
  const tree = buildTreeNode(document.body, animatedElements, 0);
  return tree;
}

/**
 * Recursively build a tree node for an element.
 * Only includes elements that have animations or have animated descendants.
 */
function buildTreeNode(
  element: HTMLElement,
  animatedElements: Map<HTMLElement, string[]>,
  depth: number
): DOMTreeNode | null {
  const animationIds = animatedElements.get(element) || [];

  // Recursively check children
  const childNodes: DOMTreeNode[] = [];
  for (const child of Array.from(element.children)) {
    if (child instanceof HTMLElement) {
      const childNode = buildTreeNode(child, animatedElements, depth + 1);
      if (childNode) {
        childNodes.push(childNode);
      }
    }
  }

  // Include this node if it has animations OR has animated descendants
  const hasAnimatedDescendants = childNodes.length > 0;

  if (animationIds.length === 0 && !hasAnimatedDescendants) {
    return null;
  }

  // Build class list (filter utility classes for cleaner display)
  const classList = element.className && typeof element.className === 'string'
    ? element.className
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .filter((c) => !c.match(/^(w-|h-|p-|m-|flex|grid|text-|bg-|border)/))
        .slice(0, 3) // Limit to 3 classes for display
    : [];

  return {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tagName: element.tagName.toLowerCase(),
    selector: getSelector(element),
    classList,
    children: childNodes,
    depth,
    animationIds,
    hasAnimatedDescendants,
    isExpanded: depth < 2, // Auto-expand first 2 levels
  };
}
