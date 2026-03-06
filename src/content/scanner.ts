import type { Animation, KeyframeStep, KeyframesData, AnimationLonghand, DOMTreeNode, ElementContext, ElementNode, CategorizedStyles } from '../shared/types';
import { getSelector, getMeaningfulClasses } from '../utils/getSelector';
import { categorizeProperty, shouldHideProperty, isDefaultValue, CATEGORY_ORDER } from '../utils/cssCategories';

/**
 * Collected keyframes data including raw CSS text
 */
interface CollectedKeyframes {
  steps: KeyframeStep[];
  rawCssText: string;
}

/**
 * Capture element node data for HTML structure display
 */
function captureElementNode(element: HTMLElement): ElementNode {
  const attributes: Record<string, string> = {};

  // Capture meaningful attributes (data-*, aria-*, role, href, src, alt, title)
  for (const attr of element.attributes) {
    if (
      attr.name.startsWith('data-') ||
      attr.name.startsWith('aria-') ||
      attr.name === 'role' ||
      attr.name === 'href' ||
      attr.name === 'src' ||
      attr.name === 'alt' ||
      attr.name === 'title' ||
      attr.name === 'type' ||
      attr.name === 'name'
    ) {
      // Skip our internal markers
      if (!attr.name.startsWith('data-css-weaver')) {
        attributes[attr.name] = attr.value;
      }
    }
  }

  // Get truncated direct text content (not from children)
  let textContent: string | null = null;
  const directText = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 50);

  if (directText) {
    textContent = directText + (directText.length >= 50 ? '...' : '');
  }

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    classList: Array.from(element.classList),
    attributes,
    textContent,
  };
}

/**
 * Capture ALL computed styles, organized by category
 */
function captureComputedStyles(element: HTMLElement): CategorizedStyles {
  const computed = getComputedStyle(element);
  const categorized: CategorizedStyles = {
    layout: [],
    box: [],
    sizing: [],
    flexbox: [],
    grid: [],
    typography: [],
    visual: [],
    transform: [],
    animation: [],
    other: [],
  };

  // Iterate through ALL computed properties
  for (let i = 0; i < computed.length; i++) {
    const propName = computed[i];

    // Skip browser-prefixed properties
    if (shouldHideProperty(propName)) continue;

    const value = computed.getPropertyValue(propName);
    const category = categorizeProperty(propName);
    const isDefault = isDefaultValue(propName, value);

    categorized[category].push({
      name: propName,
      value,
      isDefault,
    });
  }

  // Sort properties alphabetically within each category
  for (const cat of CATEGORY_ORDER) {
    categorized[cat].sort((a, b) => a.name.localeCompare(b.name));
  }

  return categorized;
}

/**
 * Capture complete element context (HTML structure + computed styles)
 * Includes the element, 1 parent, and 1 grandparent (2 parent levels total)
 */
export function captureElementContext(element: HTMLElement): ElementContext {
  const parent = element.parentElement;
  const grandparent = parent?.parentElement;

  const rect = element.getBoundingClientRect();

  return {
    element: captureElementNode(element),
    parent: parent && parent !== document.body ? captureElementNode(parent) : null,
    grandparent:
      grandparent && grandparent !== document.body && grandparent !== document.documentElement
        ? captureElementNode(grandparent)
        : null,
    computedStyles: captureComputedStyles(element),
    dimensions: {
      width: rect.width,
      height: rect.height,
      offsetTop: element.offsetTop,
      offsetLeft: element.offsetLeft,
    },
  };
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
          elementContext: captureElementContext(element as HTMLElement),
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
            elementContext: captureElementContext(element as HTMLElement),
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
              elementContext: captureElementContext(element as HTMLElement),
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

  // Note: GSAP and Framer Motion detection happens through pageScript.js → CustomEvent → animationCache.ts
  // The content script's isolated world cannot access window.gsap or window.__FRAMER_MOTION__

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
        elementContext: captureElementContext(target as HTMLElement),
      };

      appendWeaverId(target as HTMLElement, webAnim.id);
      existingAnimations.push(webAnim);
    });
  } catch (error) {
    console.debug('CSS Weaver: Web Animations API scan failed:', error);
  }
}

// Note: scanGSAPAnimations and scanFramerMotionAnimations removed
// These functions tried to access window.gsap and window.__FRAMER_MOTION__ from the content script's isolated world
// which doesn't work. GSAP/Framer detection now happens via pageScript.js → CustomEvent → animationCache.ts

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

// getSelector imported from ../utils/getSelector.ts

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
  const classList = getMeaningfulClasses(element, 3);

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
