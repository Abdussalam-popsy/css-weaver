import type { Animation, KeyframeStep } from '../../shared/types';

/**
 * Format the animation property for display based on type
 * Returns type-appropriate code (CSS for animations/transitions, JS for GSAP/Web Animation)
 */
export function formatAnimationProperty(animation: Animation): string {
  switch (animation.type) {
    case 'transition':
      return formatTransitionCode(animation);

    case 'gsap':
      return formatGSAPCode(animation);

    case 'web-animation':
      return formatWebAnimationCode(animation);

    case 'scroll-driven':
      return formatScrollDrivenCode(animation);

    case 'animation':
    default:
      return formatCSSAnimationCode(animation);
  }
}

/**
 * Format CSS transition code
 */
function formatTransitionCode(animation: Animation): string {
  const selector = getDisplaySelector(animation.selector);
  return `${selector} {\n  ${animation.animationShorthand};\n}`;
}

/**
 * Format CSS animation code
 */
function formatCSSAnimationCode(animation: Animation): string {
  const selector = getDisplaySelector(animation.selector);

  if (animation.animationLonghand) {
    const props = animation.animationLonghand;
    return `${selector} {
  animation-name: ${props.name};
  animation-duration: ${props.duration};
  animation-timing-function: ${props.timingFunction};
  animation-delay: ${props.delay};
  animation-iteration-count: ${props.iterationCount};
  animation-direction: ${props.direction};
  animation-fill-mode: ${props.fillMode};
}`;
  }

  // Fallback using shorthand
  return `${selector} {\n  animation: ${animation.animationShorthand};\n}`;
}

/**
 * Format GSAP animation code
 */
export function formatGSAPCode(animation: Animation): string {
  const selector = getDisplaySelector(animation.selector);
  const props = animation.properties || {};
  const propEntries = Object.entries(props);

  // Determine GSAP method from animation name
  let method = 'to';
  if (animation.name.includes('.from')) {
    method = 'from';
  } else if (animation.name.includes('.fromTo')) {
    method = 'fromTo';
  }

  // Build properties string
  const propsLines: string[] = [];
  for (const [key, value] of propEntries) {
    // Check if value needs quotes
    const needsQuotes = typeof value === 'string' && !value.match(/^-?\d+(\.\d+)?$/);
    propsLines.push(`  ${key}: ${needsQuotes ? `"${value}"` : value}`);
  }

  // Add duration and easing
  propsLines.push(`  duration: ${(animation.duration / 1000).toFixed(2)}`);
  if (animation.timingFunction && animation.timingFunction !== 'ease') {
    propsLines.push(`  ease: "${animation.timingFunction}"`);
  }
  if (animation.delay > 0) {
    propsLines.push(`  delay: ${(animation.delay / 1000).toFixed(2)}`);
  }

  const propsStr = propsLines.join(',\n');

  return `// GSAP Animation
gsap.${method}("${selector}", {
${propsStr}
});`;
}

/**
 * Format Web Animation API code
 */
export function formatWebAnimationCode(animation: Animation): string {
  const props = animation.properties || {};
  const propEntries = Object.entries(props);

  // Build keyframes array
  const keyframeProps: string[] = [];
  for (const [key, value] of propEntries) {
    keyframeProps.push(`    ${key}: "${value}"`);
  }

  const keyframesStr = keyframeProps.join(',\n');

  return `// Web Animation API
element.animate([
  { /* start state */ },
  {
${keyframesStr}
  }
], {
  duration: ${animation.duration},
  easing: "${animation.timingFunction}",
  delay: ${animation.delay},
  fill: "${animation.fillMode}"
});`;
}


/**
 * Format scroll-driven animation code
 */
function formatScrollDrivenCode(animation: Animation): string {
  const selector = getDisplaySelector(animation.selector);
  const timeline = animation.scrollTimeline;

  let timelineValue = 'scroll()';
  if (timeline) {
    timelineValue = timeline.source === 'view'
      ? `view(${timeline.axis})`
      : `scroll(${timeline.axis})`;
  }

  return `${selector} {
  animation: ${animation.name} ${animation.duration}ms ${animation.timingFunction};
  animation-timeline: ${timelineValue};
}`;
}

/**
 * Generate @keyframes CSS from parsed data (fallback if raw CSS unavailable)
 */
export function generateKeyframesCss(animation: Animation): string {
  if (!animation.keyframes || animation.keyframes.length === 0) {
    return '/* No keyframes data available */';
  }

  const lines: string[] = [`@keyframes ${animation.name} {`];

  for (const step of animation.keyframes) {
    const percentage =
      step.offset === 0
        ? 'from'
        : step.offset === 1
          ? 'to'
          : `${Math.round(step.offset * 100)}%`;

    lines.push(`  ${percentage} {`);

    for (const [prop, value] of Object.entries(step.properties)) {
      lines.push(`    ${prop}: ${value};`);
    }

    lines.push('  }');
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Get formatted keyframes CSS (prefer raw, fallback to generated)
 */
export function getKeyframesCss(animation: Animation): string {
  if (animation.keyframesData?.rawCssText) {
    return formatRawKeyframes(animation.keyframesData.rawCssText);
  }
  return generateKeyframesCss(animation);
}

/**
 * Format raw keyframes CSS for better readability
 */
function formatRawKeyframes(rawCss: string): string {
  // The raw CSS from cssText is often on one line, let's format it nicely
  return rawCss
    .replace(/\s*{\s*/g, ' {\n  ')
    .replace(/\s*}\s*}/g, '\n  }\n}')
    .replace(/\s*}\s*/g, '\n}\n')
    .replace(/;\s*/g, ';\n    ')
    .replace(/\n    \n/g, '\n')
    .replace(/{\n  \n/g, '{\n  ')
    .trim();
}

/**
 * Get a display-friendly CSS selector
 */
function getDisplaySelector(selector: string): string {
  // If it's a simple selector, return as-is
  if (selector.startsWith('#') || selector.startsWith('.')) {
    return selector;
  }

  // For complex selectors, try to extract a meaningful class
  const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
  if (classMatch) {
    return `.${classMatch[1]}`;
  }

  // Fall back to original
  return selector;
}

/**
 * Get the complete code for copying based on animation type
 */
export function getCompleteCss(animation: Animation): string {
  const code = formatAnimationProperty(animation);

  switch (animation.type) {
    case 'transition':
      return `/* Transition for ${animation.selector} */\n${code}`;

    case 'gsap':
      return `/* GSAP Animation for ${animation.selector} */\n${code}`;

    case 'web-animation':
      return `/* Web Animation API for ${animation.selector} */\n${code}`;

    case 'scroll-driven':
      return `/* Scroll-driven Animation for ${animation.selector} */\n${code}`;

    case 'animation':
    default: {
      const keyframesCss = getKeyframesCss(animation);
      return `/* CSS Animation for ${animation.selector} */\n${code}\n\n${keyframesCss}`;
    }
  }
}

/**
 * Get CSS for a specific keyframe step
 */
export function getKeyframeCss(keyframe: KeyframeStep): string {
  const percentage =
    keyframe.offset === 0
      ? 'from'
      : keyframe.offset === 1
        ? 'to'
        : `${Math.round(keyframe.offset * 100)}%`;

  const props = Object.entries(keyframe.properties)
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n');

  return `${percentage} {\n${props}\n}`;
}

/**
 * Generate HTML structure snippet for an animation's target element
 */
export function getHtmlStructure(animation: Animation): string {
  const selector = animation.selector;
  const tagName = animation.tagName.toLowerCase();

  // Extract classes from selector if present
  const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/g);
  const classes = classMatch
    ? classMatch.map(c => c.slice(1)).join(' ')
    : '';

  // Extract ID from selector if present
  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  const id = idMatch ? idMatch[1] : '';

  // Build attributes string
  let attrs = '';
  if (id) attrs += ` id="${id}"`;
  if (classes) attrs += ` class="${classes}"`;

  // Create a simple HTML structure
  const htmlSnippet = `<${tagName}${attrs}>
  <!-- ${animation.name} -->
</${tagName}>`;

  return htmlSnippet;
}

/**
 * Get complete code with HTML structure for copying
 */
export function getCompleteCodeWithHtml(animation: Animation): string {
  const html = getHtmlStructure(animation);
  const code = getCompleteCss(animation);

  return `<!-- HTML Structure -->
${html}

${code}`;
}
