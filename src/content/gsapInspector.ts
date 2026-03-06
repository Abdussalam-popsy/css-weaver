/**
 * GSAP Inspector
 *
 * Deep inspection of GSAP animations including:
 * - Timeline hierarchy
 * - ScrollTrigger configurations
 * - Stagger patterns
 * - Actual GSAP code generation
 */

export interface GSAPTweenData {
  id: string;
  type: 'tween' | 'timeline';
  method: 'to' | 'from' | 'fromTo' | 'set';
  targets: string[];
  duration: number;
  delay: number;
  ease: string;
  repeat: number;
  yoyo: boolean;
  stagger: GSAPStaggerConfig | null;
  scrollTrigger: GSAPScrollTriggerConfig | null;
  properties: Record<string, any>;
  startTime: number;
  endTime: number;
  progress: number;
  isActive: boolean;
  isPaused: boolean;
  timelinePosition: string | number | null;
  parentTimeline: string | null;
  children: GSAPTweenData[];
  // Generated code
  code: string;
  codeWithOptions: string;
}

export interface GSAPStaggerConfig {
  amount: number;
  each: number;
  from: string | number;
  grid: [number, number] | null;
  ease: string;
}

export interface GSAPScrollTriggerConfig {
  trigger: string;
  start: string;
  end: string;
  scrub: boolean | number;
  pin: boolean | string;
  markers: boolean;
  toggleActions: string;
  onEnter: boolean;
  onLeave: boolean;
  onEnterBack: boolean;
  onLeaveBack: boolean;
}

/**
 * Inspect GSAP and extract detailed animation data
 */
export function inspectGSAP(): GSAPTweenData[] {
  const gsap = (window as any).gsap;
  if (!gsap) {
    console.log('🔍 GSAP Inspector: GSAP not found');
    return [];
  }

  console.log('🔍 GSAP Inspector: Starting deep inspection...');

  const results: GSAPTweenData[] = [];

  try {
    // Get global timeline
    const globalTimeline = gsap.globalTimeline;
    if (!globalTimeline) return results;

    // Get all children recursively
    const allTweens = globalTimeline.getChildren(true, true, true);
    console.log(`🔍 GSAP Inspector: Found ${allTweens.length} tweens/timelines`);

    allTweens.forEach((tween: any, index: number) => {
      const data = extractTweenData(tween, index);
      if (data) {
        results.push(data);
      }
    });

    // Also check for standalone ScrollTriggers
    inspectScrollTriggers(results);

  } catch (error) {
    console.error('🔍 GSAP Inspector: Error during inspection:', error);
  }

  return results;
}

/**
 * Extract detailed data from a single tween
 */
function extractTweenData(tween: any, index: number): GSAPTweenData | null {
  try {
    // Check if it's a timeline
    const isTimeline = tween.getChildren !== undefined;

    // Get targets
    const targets = tween.targets?.() || [];
    if (targets.length === 0 && !isTimeline) return null;

    // Get selectors for targets
    const targetSelectors = targets.map((t: any) => {
      if (t instanceof HTMLElement) {
        return getSelector(t);
      }
      return String(t);
    });

    // Get timing
    const duration = (tween.duration?.() || 0) * 1000;
    const delay = (tween.delay?.() || 0) * 1000;
    const progress = tween.progress?.() || 0;

    // Get vars (animation properties)
    const vars = tween.vars || {};

    // Extract animated properties
    const properties = extractAnimatedProperties(vars);

    // Extract stagger config
    const stagger = extractStaggerConfig(vars);

    // Extract ScrollTrigger config
    const scrollTrigger = extractScrollTriggerConfig(vars.scrollTrigger);

    // Determine method type
    const method = determineMethod(tween);

    // Get parent timeline info
    const parent = tween.parent;
    const parentTimeline = parent && parent !== (window as any).gsap?.globalTimeline
      ? `timeline_${parent._id || 'unknown'}`
      : null;

    // Get timeline children if this is a timeline
    const children: GSAPTweenData[] = [];
    if (isTimeline) {
      const timelineChildren = tween.getChildren(false, true, true);
      timelineChildren.forEach((child: any, childIndex: number) => {
        const childData = extractTweenData(child, childIndex);
        if (childData) {
          children.push(childData);
        }
      });
    }

    // Generate code
    const code = generateGSAPCode(method, targetSelectors, properties, vars);
    const codeWithOptions = generateGSAPCodeWithOptions(method, targetSelectors, properties, vars, stagger, scrollTrigger);

    const data: GSAPTweenData = {
      id: `gsap_${index}_${Date.now()}`,
      type: isTimeline ? 'timeline' : 'tween',
      method,
      targets: targetSelectors,
      duration,
      delay,
      ease: vars.ease || 'power1.out',
      repeat: vars.repeat ?? 0,
      yoyo: vars.yoyo ?? false,
      stagger,
      scrollTrigger,
      properties,
      startTime: delay,
      endTime: delay + duration,
      progress,
      isActive: tween.isActive?.() ?? false,
      isPaused: tween.paused?.() ?? false,
      timelinePosition: vars.position ?? null,
      parentTimeline,
      children,
      code,
      codeWithOptions,
    };

    return data;

  } catch (error) {
    console.debug('🔍 GSAP Inspector: Error extracting tween:', error);
    return null;
  }
}

/**
 * Extract animated properties from vars object
 */
function extractAnimatedProperties(vars: any): Record<string, any> {
  const gsapKeys = new Set([
    'ease', 'duration', 'delay', 'onComplete', 'onStart', 'onUpdate', 'onRepeat',
    'repeat', 'yoyo', 'stagger', 'scrollTrigger', 'id', 'paused', 'reversed',
    'immediateRender', 'lazy', 'overwrite', 'data', 'inherit', 'callbackScope',
    'onCompleteParams', 'onStartParams', 'onUpdateParams', 'onRepeatParams',
    'autoAlpha', 'clearProps', 'keyframes', 'runBackwards', 'startAt'
  ]);

  const properties: Record<string, any> = {};

  for (const [key, value] of Object.entries(vars)) {
    if (!gsapKeys.has(key) && value !== undefined) {
      properties[key] = value;
    }
  }

  // Handle autoAlpha specially (it's opacity + visibility)
  if (vars.autoAlpha !== undefined) {
    properties.opacity = vars.autoAlpha;
    properties.visibility = vars.autoAlpha > 0 ? 'visible' : 'hidden';
  }

  return properties;
}

/**
 * Extract stagger configuration
 */
function extractStaggerConfig(vars: any): GSAPStaggerConfig | null {
  const stagger = vars.stagger;
  if (!stagger) return null;

  if (typeof stagger === 'number') {
    return {
      amount: 0,
      each: stagger,
      from: 'start',
      grid: null,
      ease: 'none',
    };
  }

  if (typeof stagger === 'object') {
    return {
      amount: stagger.amount || 0,
      each: stagger.each || 0,
      from: stagger.from || 'start',
      grid: stagger.grid || null,
      ease: stagger.ease || 'none',
    };
  }

  return null;
}

/**
 * Extract ScrollTrigger configuration
 */
function extractScrollTriggerConfig(st: any): GSAPScrollTriggerConfig | null {
  if (!st) return null;

  // Get trigger element selector
  let trigger = 'unknown';
  if (st.trigger) {
    if (st.trigger instanceof HTMLElement) {
      trigger = getSelector(st.trigger);
    } else if (typeof st.trigger === 'string') {
      trigger = st.trigger;
    }
  }

  return {
    trigger,
    start: st.start || 'top bottom',
    end: st.end || 'bottom top',
    scrub: st.scrub ?? false,
    pin: st.pin ?? false,
    markers: st.markers ?? false,
    toggleActions: st.toggleActions || 'play none none none',
    onEnter: !!st.onEnter,
    onLeave: !!st.onLeave,
    onEnterBack: !!st.onEnterBack,
    onLeaveBack: !!st.onLeaveBack,
  };
}

/**
 * Inspect standalone ScrollTriggers
 */
function inspectScrollTriggers(results: GSAPTweenData[]): void {
  const ScrollTrigger = (window as any).ScrollTrigger;
  if (!ScrollTrigger) return;

  try {
    const allTriggers = ScrollTrigger.getAll?.() || [];
    console.log(`🔍 GSAP Inspector: Found ${allTriggers.length} ScrollTriggers`);

    allTriggers.forEach((st: any, index: number) => {
      // Check if this trigger is already associated with a tween
      const animation = st.animation;
      if (animation) {
        // Already captured via tween
        return;
      }

      // Standalone ScrollTrigger (no animation, just callbacks)
      const trigger = st.trigger instanceof HTMLElement
        ? getSelector(st.trigger)
        : String(st.trigger || 'unknown');

      const data: GSAPTweenData = {
        id: `scrolltrigger_${index}_${Date.now()}`,
        type: 'tween',
        method: 'to',
        targets: [trigger],
        duration: 0,
        delay: 0,
        ease: 'none',
        repeat: 0,
        yoyo: false,
        stagger: null,
        scrollTrigger: {
          trigger,
          start: st.start || 'top bottom',
          end: st.end || 'bottom top',
          scrub: st.scrub ?? false,
          pin: st.pin ?? false,
          markers: st.markers ?? false,
          toggleActions: st.toggleActions || 'play none none none',
          onEnter: !!st.onEnter,
          onLeave: !!st.onLeave,
          onEnterBack: !!st.onEnterBack,
          onLeaveBack: !!st.onLeaveBack,
        },
        properties: {},
        startTime: 0,
        endTime: 0,
        progress: st.progress || 0,
        isActive: st.isActive || false,
        isPaused: false,
        timelinePosition: null,
        parentTimeline: null,
        children: [],
        code: `ScrollTrigger.create({ trigger: "${trigger}" })`,
        codeWithOptions: generateScrollTriggerCode(st),
      };

      results.push(data);
    });
  } catch (error) {
    console.debug('🔍 GSAP Inspector: Error inspecting ScrollTriggers:', error);
  }
}

/**
 * Determine the GSAP method used
 */
function determineMethod(tween: any): 'to' | 'from' | 'fromTo' | 'set' {
  const vars = tween.vars || {};

  // Check for fromTo (has startAt or explicit from/to structure)
  if (vars.startAt || tween._from === 'fromTo') {
    return 'fromTo';
  }

  // Check for from
  if (tween._from || vars.runBackwards) {
    return 'from';
  }

  // Check for set (duration is 0)
  if ((tween.duration?.() || 0) === 0 && !vars.scrollTrigger) {
    return 'set';
  }

  return 'to';
}

/**
 * Generate GSAP code string
 */
function generateGSAPCode(
  method: string,
  targets: string[],
  properties: Record<string, any>,
  vars: any
): string {
  const targetStr = targets.length === 1 ? `"${targets[0]}"` : JSON.stringify(targets);
  const propsStr = formatProperties(properties);

  const duration = vars.duration ?? 1;

  if (method === 'set') {
    return `gsap.set(${targetStr}, { ${propsStr} })`;
  }

  return `gsap.${method}(${targetStr}, { ${propsStr}, duration: ${duration} })`;
}

/**
 * Generate GSAP code with all options
 */
function generateGSAPCodeWithOptions(
  method: string,
  targets: string[],
  properties: Record<string, any>,
  vars: any,
  stagger: GSAPStaggerConfig | null,
  scrollTrigger: GSAPScrollTriggerConfig | null
): string {
  const targetStr = targets.length === 1 ? `"${targets[0]}"` : JSON.stringify(targets);

  const options: string[] = [];

  // Add animated properties
  for (const [key, value] of Object.entries(properties)) {
    options.push(`  ${key}: ${formatValue(value)}`);
  }

  // Add timing
  if (vars.duration !== undefined) {
    options.push(`  duration: ${vars.duration}`);
  }
  if (vars.delay) {
    options.push(`  delay: ${vars.delay}`);
  }
  if (vars.ease && vars.ease !== 'power1.out') {
    options.push(`  ease: "${vars.ease}"`);
  }

  // Add repeat/yoyo
  if (vars.repeat) {
    options.push(`  repeat: ${vars.repeat === -1 ? -1 : vars.repeat}`);
  }
  if (vars.yoyo) {
    options.push(`  yoyo: true`);
  }

  // Add stagger
  if (stagger) {
    if (stagger.each) {
      options.push(`  stagger: ${stagger.each}`);
    } else if (stagger.amount) {
      options.push(`  stagger: { amount: ${stagger.amount}, from: "${stagger.from}" }`);
    }
  }

  // Add ScrollTrigger
  if (scrollTrigger) {
    const stOptions = [];
    stOptions.push(`    trigger: "${scrollTrigger.trigger}"`);
    if (scrollTrigger.start !== 'top bottom') {
      stOptions.push(`    start: "${scrollTrigger.start}"`);
    }
    if (scrollTrigger.end !== 'bottom top') {
      stOptions.push(`    end: "${scrollTrigger.end}"`);
    }
    if (scrollTrigger.scrub) {
      stOptions.push(`    scrub: ${typeof scrollTrigger.scrub === 'number' ? scrollTrigger.scrub : 'true'}`);
    }
    if (scrollTrigger.pin) {
      stOptions.push(`    pin: true`);
    }
    if (scrollTrigger.markers) {
      stOptions.push(`    markers: true`);
    }
    options.push(`  scrollTrigger: {\n${stOptions.join(',\n')}\n  }`);
  }

  if (method === 'set') {
    return `gsap.set(${targetStr}, {\n${options.join(',\n')}\n})`;
  }

  return `gsap.${method}(${targetStr}, {\n${options.join(',\n')}\n})`;
}

/**
 * Generate ScrollTrigger.create code
 */
function generateScrollTriggerCode(st: any): string {
  const options: string[] = [];

  if (st.trigger) {
    const trigger = st.trigger instanceof HTMLElement
      ? getSelector(st.trigger)
      : String(st.trigger);
    options.push(`  trigger: "${trigger}"`);
  }

  if (st.start) options.push(`  start: "${st.start}"`);
  if (st.end) options.push(`  end: "${st.end}"`);
  if (st.scrub) options.push(`  scrub: ${typeof st.scrub === 'number' ? st.scrub : 'true'}`);
  if (st.pin) options.push(`  pin: true`);
  if (st.markers) options.push(`  markers: true`);
  if (st.toggleActions) options.push(`  toggleActions: "${st.toggleActions}"`);

  return `ScrollTrigger.create({\n${options.join(',\n')}\n})`;
}

/**
 * Format properties object for code string
 */
function formatProperties(props: Record<string, any>): string {
  return Object.entries(props)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(', ');
}

/**
 * Format a value for code output
 */
function formatValue(value: any): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Get CSS selector for an element
 */
function getSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body && path.length < 3) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);
      const meaningfulClass = classes.find(c => !c.match(/^(w-|h-|p-|m-|flex|grid|text-|bg-|border)/));
      if (meaningfulClass) {
        selector += `.${meaningfulClass}`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Control GSAP playback
 */
export function controlGSAP(action: 'play' | 'pause' | 'restart' | 'seek', value?: number): void {
  const gsap = (window as any).gsap;
  if (!gsap?.globalTimeline) return;

  switch (action) {
    case 'play':
      gsap.globalTimeline.play();
      break;
    case 'pause':
      gsap.globalTimeline.pause();
      break;
    case 'restart':
      gsap.globalTimeline.restart();
      break;
    case 'seek':
      if (value !== undefined) {
        gsap.globalTimeline.seek(value / 1000); // Convert ms to seconds
      }
      break;
  }
}

/**
 * Get current GSAP playback state
 */
export function getGSAPState(): { isPlaying: boolean; currentTime: number; totalDuration: number } | null {
  const gsap = (window as any).gsap;
  if (!gsap?.globalTimeline) return null;

  const tl = gsap.globalTimeline;
  return {
    isPlaying: !tl.paused(),
    currentTime: (tl.time() || 0) * 1000,
    totalDuration: (tl.totalDuration() || 0) * 1000,
  };
}
