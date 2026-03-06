/**
 * Page Script for CSS Weaver
 * This script runs in the page context (not the content script isolated world)
 * and can access window.gsap, window.ScrollTrigger, etc.
 *
 * It's loaded as an external file to bypass CSP restrictions that block inline scripts.
 */
(function() {
  'use strict';

  const DEBUG = true;
  const log = (...args) => DEBUG && console.log('🎨 [CSS Weaver Page]', ...args);

  const detectedAnimations = new Map();

  function generateId() {
    return 'gsap-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  function getSelector(element) {
    if (!element || !(element instanceof Element)) return 'unknown';
    if (element.id) return '#' + element.id;

    const path = [];
    let current = element;

    while (current && current !== document.body && path.length < 4) {
      let selector = current.tagName.toLowerCase();

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(Boolean);
        const meaningfulClass = classes.find(c => !c.match(/^(w-|h-|p-|m-|flex|grid|text-|bg-|border)/));
        if (meaningfulClass) {
          selector += '.' + meaningfulClass;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ') || 'body';
  }

  function sendAnimation(animationData) {
    document.dispatchEvent(new CustomEvent('css-weaver-animation', {
      detail: animationData
    }));
    log('Sent animation:', animationData.name);
  }

  /**
   * Capture element node data for HTML structure display
   */
  function captureElementNode(element) {
    if (!element || !(element instanceof HTMLElement)) return null;

    const attributes = {};

    // Capture meaningful attributes
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

    // Get truncated direct text content
    let textContent = null;
    const directText = Array.from(element.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent?.trim())
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
   * CSS property category mapping (simplified version)
   */
  function categorizeProperty(propName) {
    // Layout
    if (['display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear', 'z-index'].includes(propName)) {
      return 'layout';
    }
    // Box Model
    if (propName.startsWith('margin') || propName.startsWith('padding') || propName.startsWith('border') || propName.startsWith('outline')) {
      return 'box';
    }
    // Sizing
    if (['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'box-sizing', 'aspect-ratio'].includes(propName)) {
      return 'sizing';
    }
    // Flexbox
    if (propName.startsWith('flex') || propName.startsWith('align-') || propName.startsWith('justify-') || ['gap', 'row-gap', 'column-gap', 'order'].includes(propName)) {
      return 'flexbox';
    }
    // Grid
    if (propName.startsWith('grid') || propName.startsWith('place-')) {
      return 'grid';
    }
    // Typography
    if (propName.startsWith('font') || propName.startsWith('text') || ['color', 'line-height', 'letter-spacing', 'word-spacing', 'white-space', 'vertical-align'].includes(propName)) {
      return 'typography';
    }
    // Visual
    if (propName.startsWith('background') || ['opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y', 'cursor', 'pointer-events', 'box-shadow', 'filter', 'backdrop-filter', 'clip-path'].includes(propName)) {
      return 'visual';
    }
    // Transform
    if (propName.startsWith('transform') || propName.startsWith('perspective') || ['rotate', 'scale', 'translate', 'backface-visibility'].includes(propName)) {
      return 'transform';
    }
    // Animation
    if (propName.startsWith('animation') || propName.startsWith('transition') || propName === 'will-change') {
      return 'animation';
    }
    return 'other';
  }

  /**
   * Check if a value is a browser default
   */
  function isDefaultValue(propName, value) {
    const defaults = ['0px', '0', '0s', 'none', 'normal', 'auto', 'visible', 'static', 'transparent', 'rgba(0, 0, 0, 0)'];
    return defaults.includes(value);
  }

  /**
   * Capture computed styles, organized by category
   */
  function captureComputedStyles(element) {
    if (!element || !(element instanceof HTMLElement)) return null;

    const computed = getComputedStyle(element);
    const categorized = {
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

    // Iterate through all computed properties
    for (let i = 0; i < computed.length; i++) {
      const propName = computed[i];

      // Skip browser-prefixed properties
      if (propName.startsWith('-webkit-') || propName.startsWith('-moz-') || propName.startsWith('-ms-')) continue;

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
    for (const cat of Object.keys(categorized)) {
      categorized[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    return categorized;
  }

  /**
   * Capture complete element context
   */
  function captureElementContext(element) {
    if (!element || !(element instanceof HTMLElement)) return null;

    const parent = element.parentElement;
    const grandparent = parent?.parentElement;
    const rect = element.getBoundingClientRect();

    return {
      element: captureElementNode(element),
      parent: parent && parent !== document.body ? captureElementNode(parent) : null,
      grandparent: grandparent && grandparent !== document.body && grandparent !== document.documentElement
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

  function extractTweenData(tween, tweenType) {
    const animations = [];

    try {
      const targets = tween.targets ? tween.targets() : [];
      if (!targets || targets.length === 0) return animations;

      const duration = (tween.duration ? tween.duration() : 0) * 1000;
      const delay = (tween.delay ? tween.delay() : 0) * 1000;
      const vars = tween.vars || {};

      const gsapKeys = ['ease', 'duration', 'delay', 'onComplete', 'onStart', 'onUpdate',
                        'repeat', 'yoyo', 'stagger', 'scrollTrigger', 'id', 'paused',
                        'immediateRender', 'lazy', 'autoAlpha', 'overwrite', 'clearProps'];

      const animatedProps = {};
      for (const [key, value] of Object.entries(vars)) {
        if (!gsapKeys.includes(key) && value !== undefined) {
          animatedProps[key] = String(value);
        }
      }

      targets.forEach((target) => {
        if (!(target instanceof HTMLElement)) return;

        // Skip if already processed
        if (target.hasAttribute('data-css-weaver-id')) return;

        const id = generateId();
        const rect = target.getBoundingClientRect();

        const propNames = Object.keys(animatedProps).slice(0, 3).join(', ');
        const name = propNames ? 'gsap.' + tweenType + ': ' + propNames : 'gsap.' + tweenType;

        target.setAttribute('data-css-weaver-id', id);

        animations.push({
          id,
          type: 'gsap',
          selector: getSelector(target),
          tagName: target.tagName,
          name,
          duration,
          delay,
          timingFunction: vars.ease || 'power1.out',
          iterationCount: vars.repeat === -1 ? 'infinite' : (vars.repeat || 0) + 1,
          direction: vars.yoyo ? 'alternate' : 'normal',
          fillMode: 'both',
          properties: animatedProps,
          position: {
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            height: rect.height,
          },
          elementContext: captureElementContext(target),
        });
      });
    } catch (error) {
      log('Error extracting tween:', error);
    }

    return animations;
  }

  function patchGSAP(gsap) {
    if (gsap.__cssWeaverPatched) {
      log('GSAP already patched');
      return;
    }
    gsap.__cssWeaverPatched = true;
    log('Patching GSAP methods...');

    const originalTo = gsap.to.bind(gsap);
    const originalFrom = gsap.from.bind(gsap);
    const originalFromTo = gsap.fromTo.bind(gsap);
    const originalTimeline = gsap.timeline.bind(gsap);
    const originalContext = gsap.context ? gsap.context.bind(gsap) : null;

    // Patch gsap.context() to detect animations created within contexts
    if (originalContext) {
      gsap.context = function(func, scope) {
        log('gsap.context() called');
        const ctx = originalContext(func, scope);
        // After context runs, scan for new animations
        setTimeout(() => {
          log('Scanning after context...');
          scanExistingAnimations(gsap);
        }, 50);
        return ctx;
      };
    }

    gsap.to = function(targets, vars) {
      const tween = originalTo(targets, vars);
      setTimeout(() => {
        extractTweenData(tween, 'to').forEach(sendAnimation);
      }, 10);
      return tween;
    };

    gsap.from = function(targets, vars) {
      const tween = originalFrom(targets, vars);
      setTimeout(() => {
        extractTweenData(tween, 'from').forEach(sendAnimation);
      }, 10);
      return tween;
    };

    gsap.fromTo = function(targets, fromVars, toVars) {
      const tween = originalFromTo(targets, fromVars, toVars);
      setTimeout(() => {
        extractTweenData(tween, 'fromTo').forEach(sendAnimation);
      }, 10);
      return tween;
    };

    gsap.timeline = function(vars) {
      const tl = originalTimeline(vars);

      const originalTlTo = tl.to.bind(tl);
      const originalTlFrom = tl.from.bind(tl);
      const originalTlFromTo = tl.fromTo.bind(tl);

      tl.to = function(targets, vars, position) {
        const result = originalTlTo(targets, vars, position);
        setTimeout(() => {
          // Get the last tween added
          const children = tl.getChildren(false, true, false);
          const lastTween = children[children.length - 1];
          if (lastTween) {
            extractTweenData(lastTween, 'to').forEach(anim => {
              anim.name = 'timeline.' + anim.name;
              sendAnimation(anim);
            });
          }
        }, 10);
        return result;
      };

      tl.from = function(targets, vars, position) {
        const result = originalTlFrom(targets, vars, position);
        setTimeout(() => {
          const children = tl.getChildren(false, true, false);
          const lastTween = children[children.length - 1];
          if (lastTween) {
            extractTweenData(lastTween, 'from').forEach(anim => {
              anim.name = 'timeline.' + anim.name;
              sendAnimation(anim);
            });
          }
        }, 10);
        return result;
      };

      tl.fromTo = function(targets, fromVars, toVars, position) {
        const result = originalTlFromTo(targets, fromVars, toVars, position);
        setTimeout(() => {
          const children = tl.getChildren(false, true, false);
          const lastTween = children[children.length - 1];
          if (lastTween) {
            extractTweenData(lastTween, 'fromTo').forEach(anim => {
              anim.name = 'timeline.' + anim.name;
              sendAnimation(anim);
            });
          }
        }, 10);
        return result;
      };

      return tl;
    };

    // Patch ScrollTrigger if it exists
    patchScrollTrigger(gsap);

    log('GSAP patched successfully!');
  }

  function patchScrollTrigger(gsap) {
    // Check if ScrollTrigger is already available
    const ST = gsap.plugins?.scrollTrigger || window.ScrollTrigger;
    if (ST && !ST.__cssWeaverPatched) {
      ST.__cssWeaverPatched = true;
      log('Patching ScrollTrigger...');

      const originalCreate = ST.create.bind(ST);
      ST.create = function(vars) {
        const trigger = originalCreate(vars);
        // Scan after ScrollTrigger is created
        setTimeout(() => {
          if (trigger.animation) {
            const anims = extractTweenData(trigger.animation, 'scrollTrigger');
            anims.forEach(a => {
              a.name = 'scroll: ' + a.name;
              sendAnimation(a);
            });
          }
        }, 50);
        return trigger;
      };
      log('ScrollTrigger patched!');
    }

    // Also watch for ScrollTrigger to be registered later
    const originalRegisterPlugin = gsap.registerPlugin;
    if (originalRegisterPlugin) {
      gsap.registerPlugin = function(...plugins) {
        const result = originalRegisterPlugin.apply(this, plugins);
        // Check if ScrollTrigger was just registered
        plugins.forEach(plugin => {
          if (plugin && (plugin.name === 'ScrollTrigger' || plugin === window.ScrollTrigger)) {
            setTimeout(() => patchScrollTrigger(gsap), 10);
          }
        });
        return result;
      };
    }
  }

  function scanExistingAnimations(gsap) {
    log('Scanning existing GSAP animations...');
    try {
      // Scan global timeline
      if (!gsap.globalTimeline) {
        log('GSAP globalTimeline not available');
        return;
      }

      // Get all children recursively, including nested timelines
      const children = gsap.globalTimeline.getChildren(true, true, true);
      log('Found ' + children.length + ' existing tweens/timelines');

      children.forEach((tween) => {
        // Check if this is a timeline (has getChildren method) or a tween
        if (tween.getChildren && typeof tween.getChildren === 'function') {
          // It's a timeline - recursively get its children
          try {
            const nestedChildren = tween.getChildren(true, true, true);
            nestedChildren.forEach(child => {
              extractTweenData(child, 'existing').forEach(sendAnimation);
            });
          } catch (e) {
            log('Error extracting nested timeline children:', e);
          }
        } else {
          // It's a tween - extract directly
          extractTweenData(tween, 'existing').forEach(sendAnimation);
        }
      });

      // Also try to access all registered instances (GSAP 3.x)
      if (gsap.utils && gsap.utils.toArray) {
        // Scan all elements with GSAP data attributes
        const allAnimated = document.querySelectorAll('[data-gsap]');
        log('Found ' + allAnimated.length + ' elements with data-gsap');
      }

      // Scan ScrollTrigger instances if available
      const ScrollTrigger = gsap.plugins?.scrollTrigger || window.ScrollTrigger;
      if (ScrollTrigger && ScrollTrigger.getAll) {
        const triggers = ScrollTrigger.getAll();
        log('Found ' + triggers.length + ' ScrollTrigger instances');

        triggers.forEach((st) => {
          // Get the associated animation
          const anim = st.animation;
          if (anim) {
            // For scroll-driven animations, mark them specially
            const anims = extractTweenData(anim, 'scrollTrigger');
            anims.forEach(a => {
              a.name = 'scroll: ' + a.name;
              a.type = 'gsap'; // Keep as gsap type but name indicates scroll
              sendAnimation(a);
            });
          }
        });
      }
    } catch (error) {
      log('Error scanning existing:', error);
    }
  }

  function detectGSAPScript() {
    // Scan for GSAP script tags to help determine if we should keep polling
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = script.getAttribute('src') || '';
      if (src.includes('gsap') || src.includes('greensock') || src.includes('TweenMax')) {
        log('GSAP script tag detected:', src);
        return true;
      }
    }
    return false;
  }

  // Detect Barba.js page transitions
  function detectBarba() {
    // Check for Barba.js
    const barba = window.barba;
    if (!barba) return false;

    log('Barba.js detected!');

    // Try to hook into Barba transitions
    if (barba.hooks) {
      barba.hooks.after(() => {
        log('Barba transition completed, rescanning...');
        // After page transition, rescan for animations
        setTimeout(() => {
          const gsap = window.gsap || window.GreenSock || window.TweenMax || window.TweenLite;
          if (gsap) {
            scanExistingAnimations(gsap);
          }
          scanWebAnimationsAPI();
        }, 100);
      });
    }

    return true;
  }

  function initGSAP() {
    // Check multiple possible global names for better detection
    const gsap = window.gsap ||
                 window.GreenSock ||
                 window.gsapVersions?.gsap ||
                 window.TweenMax || // GSAP 2.x fallback
                 window.TweenLite;  // GSAP 2.x fallback

    if (gsap) {
      // Prevent duplicate patching
      if (window.__cssWeaverGSAPPatched) {
        log('GSAP already patched');
        return true;
      }
      window.__cssWeaverGSAPPatched = true;

      log('GSAP found!', gsap.version || 'unknown version');
      patchGSAP(gsap);
      // Delay scan to let existing animations settle
      setTimeout(() => scanExistingAnimations(gsap), 100);
      return true;
    }
    return false;
  }

  // Scan Web Animations API (catches Framer Motion, anime.js, etc.)
  function scanWebAnimationsAPI() {
    log('Scanning Web Animations API...');

    try {
      // Get all animations in the document
      const animations = document.getAnimations();
      log('Found ' + animations.length + ' Web Animations');

      animations.forEach((anim) => {
        const effect = anim.effect;
        if (!effect || !(effect instanceof KeyframeEffect)) return;

        const target = effect.target;
        if (!target || !(target instanceof HTMLElement)) return;

        // Skip if already processed
        if (target.hasAttribute('data-css-weaver-id')) return;

        // Skip CSS animations and transitions (already detected by content script)
        if (anim instanceof CSSAnimation || anim instanceof CSSTransition) return;

        const timing = effect.getTiming();
        const keyframes = effect.getKeyframes();

        // Extract animated properties from keyframes
        const animatedProps = {};
        keyframes.forEach(kf => {
          Object.keys(kf).forEach(key => {
            if (!['offset', 'easing', 'composite'].includes(key)) {
              animatedProps[key] = String(kf[key]);
            }
          });
        });

        const duration = typeof timing.duration === 'number' ? timing.duration : 0;
        const delay = typeof timing.delay === 'number' ? timing.delay : 0;

        // Build animation name from properties
        const propNames = Object.keys(animatedProps).slice(0, 3).join(', ');
        const animName = propNames ? 'Web Animation: ' + propNames : 'Web Animation';

        const id = generateId().replace('gsap-', 'waapi-');
        const rect = target.getBoundingClientRect();

        target.setAttribute('data-css-weaver-id', id);

        sendAnimation({
          id,
          type: 'web-animation',
          selector: getSelector(target),
          tagName: target.tagName,
          name: animName,
          duration,
          delay,
          timingFunction: String(timing.easing || 'linear'),
          iterationCount: timing.iterations === Infinity ? 'infinite' : (timing.iterations || 1),
          direction: timing.direction || 'normal',
          fillMode: timing.fill || 'none',
          properties: animatedProps,
          position: {
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            height: rect.height,
          },
          elementContext: captureElementContext(target),
        });
      });
    } catch (error) {
      log('Error scanning Web Animations API:', error);
    }
  }

  // Send diagnostic info for troubleshooting
  function sendDiagnostics() {
    const diagnostics = {
      gsapFound: !!(window.gsap || window.GreenSock || window.TweenMax || window.TweenLite),
      gsapVersion: window.gsap?.version || window.TweenMax?.version || 'not found',
      gsapGlobals: Object.keys(window).filter(k => k.toLowerCase().includes('gsap') || k.toLowerCase().includes('tween')),
      tweenMaxFound: !!window.TweenMax,
      tweenLiteFound: !!window.TweenLite,
      barbaFound: !!window.barba,
      barbaVersion: window.barba?.version || 'not found',
      animeFound: !!window.anime,
      scriptsWithGSAP: Array.from(document.querySelectorAll('script[src]'))
        .map(s => s.getAttribute('src'))
        .filter(src => src && (src.includes('gsap') || src.includes('greensock') || src.includes('TweenMax'))),
      globalTimelineChildren: window.gsap?.globalTimeline?.getChildren(true, true, true).length || 0,
      scrollTriggerFound: !!(window.gsap?.plugins?.scrollTrigger || window.ScrollTrigger),
      isPatched: !!window.__cssWeaverGSAPPatched,
    };

    log('GSAP Diagnostics:', diagnostics);

    document.dispatchEvent(new CustomEvent('css-weaver-gsap-diagnostics', {
      detail: diagnostics
    }));
  }

  // Listen for manual scan requests
  document.addEventListener('css-weaver-scan-request', () => {
    log('Manual scan requested');

    // Send diagnostics first
    sendDiagnostics();

    const gsap = window.gsap || window.GreenSock || window.TweenMax || window.TweenLite;
    if (gsap) {
      scanExistingAnimations(gsap);
    }
    // Scan Web Animations API (catches animations from various libraries)
    scanWebAnimationsAPI();
    document.dispatchEvent(new CustomEvent('css-weaver-scan-complete', {
      detail: { gsapFound: !!gsap }
    }));
  });

  // Try to init immediately
  if (!initGSAP()) {
    // GSAP not found, poll for it
    log('GSAP not found, polling...');
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (initGSAP()) {
        clearInterval(interval);
      } else if (attempts > 100) { // 100 * 100ms = 10 seconds
        clearInterval(interval);
        log('GSAP not found after 10 seconds');
      }
    }, 100);

    // Background polling continues checking even after initial timeout
    // This catches GSAP loaded very late (lazy-loaded modules, etc.)
    setInterval(() => {
      if (!window.__cssWeaverGSAPPatched) {
        initGSAP();
      }
    }, 1000); // Check every second
  }

  // Detect Barba.js for page transitions
  detectBarba();

  // Scan Web Animations API after page load settles
  setTimeout(() => {
    scanWebAnimationsAPI();
  }, 500);

  document.dispatchEvent(new CustomEvent('css-weaver-page-ready'));
  log('Page script initialized');
})();
