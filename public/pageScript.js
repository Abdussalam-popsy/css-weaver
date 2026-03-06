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
          scanFramerMotionElements();
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

        // Determine animation type based on characteristics
        let animType = 'web-animation';
        let animName = 'Web Animation';

        // Check for Framer Motion characteristics
        const isFramer = window.__FRAMER_MOTION__ ||
                        target.hasAttribute('data-projection-id') ||
                        target.hasAttribute('data-framer-component-type');
        if (isFramer) {
          animType = 'framer-motion';
          animName = 'framer';
        }

        // Check for anime.js
        if (window.anime) {
          animType = 'web-animation';
          animName = 'anime.js';
        }

        // Build property names for display
        const propNames = Object.keys(animatedProps).slice(0, 3).join(', ');
        if (propNames) {
          animName += ': ' + propNames;
        }

        const id = generateId().replace('gsap-', animType === 'framer-motion' ? 'framer-' : 'waapi-');
        const rect = target.getBoundingClientRect();

        target.setAttribute('data-css-weaver-id', id);

        sendAnimation({
          id,
          type: animType,
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
        });
      });
    } catch (error) {
      log('Error scanning Web Animations API:', error);
    }
  }

  // Legacy Framer Motion scan for elements with data attributes (fallback)
  function scanFramerMotionElements() {
    const framerElements = document.querySelectorAll('[data-framer-component-type], [data-projection-id]');
    if (framerElements.length === 0) return;

    log('Found ' + framerElements.length + ' Framer elements with data attributes');

    framerElements.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.hasAttribute('data-css-weaver-id')) return;

      const id = generateId().replace('gsap-', 'framer-');
      const rect = el.getBoundingClientRect();
      const componentType = el.getAttribute('data-framer-component-type') || 'motion';

      el.setAttribute('data-css-weaver-id', id);

      sendAnimation({
        id,
        type: 'framer-motion',
        selector: getSelector(el),
        tagName: el.tagName,
        name: 'framer.' + componentType,
        duration: 300,
        delay: 0,
        timingFunction: 'spring',
        iterationCount: 1,
        direction: 'normal',
        fillMode: 'both',
        properties: {},
        position: {
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY,
          height: rect.height,
        },
      });
    });
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
    // Scan Web Animations API (catches Framer Motion, anime.js, etc.)
    scanWebAnimationsAPI();
    // Fallback: scan for Framer elements by data attributes
    scanFramerMotionElements();
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

  // Scan Web Animations API and Framer after page load settles
  setTimeout(() => {
    scanWebAnimationsAPI();
    scanFramerMotionElements();
  }, 500);

  document.dispatchEvent(new CustomEvent('css-weaver-page-ready'));
  log('Page script initialized');
})();
