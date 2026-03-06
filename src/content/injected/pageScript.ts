/**
 * CSS Weaver - Page Context Script
 *
 * This script runs in the PAGE'S JavaScript context (not the content script's isolated world).
 * This gives us access to the real window.gsap, window.framer, etc.
 *
 * Communication flow:
 * 1. This script detects animations in page context
 * 2. Dispatches CustomEvent with animation data
 * 3. Content script listens for these events
 * 4. Content script processes and displays the data
 */

// Namespace to avoid polluting global scope
(function() {
  'use strict';

  const DEBUG = false;
  const log = (...args: any[]) => DEBUG && console.log('🎨 [CSS Weaver Page]', ...args);

  // Store for detected animations (to avoid duplicates)
  const detectedAnimations = new Map<string, any>();

  /**
   * Generate a unique ID for an animation
   */
  function generateId(): string {
    return `gsap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get a CSS selector for an element
   */
  function getSelector(element: Element): string {
    if (element.id) return `#${element.id}`;

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body && path.length < 4) {
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
   * Send animation data to content script via CustomEvent
   */
  function sendAnimationToContentScript(animationData: any) {
    const event = new CustomEvent('css-weaver-animation-detected', {
      detail: animationData
    });
    document.dispatchEvent(event);
    log('Sent animation:', animationData.name);
  }

  /**
   * Extract animation data from a GSAP tween
   */
  function extractTweenData(tween: any, type: 'to' | 'from' | 'fromTo' | 'set'): any[] {
    const animations: any[] = [];

    try {
      // Get targets - GSAP can animate multiple elements at once
      const targets = tween.targets ? tween.targets() : [];
      if (!targets || targets.length === 0) return animations;

      // Get timing
      const duration = (tween.duration?.() || 0) * 1000; // Convert to ms
      const delay = (tween.delay?.() || 0) * 1000;

      // Get vars (the properties being animated)
      const vars = tween.vars || {};

      // Extract animated properties (filter out GSAP-specific keys)
      const gsapKeys = ['ease', 'duration', 'delay', 'onComplete', 'onStart', 'onUpdate',
                        'repeat', 'yoyo', 'stagger', 'scrollTrigger', 'id', 'paused',
                        'immediateRender', 'lazy', 'autoAlpha', 'overwrite'];

      const animatedProps: Record<string, string> = {};
      for (const [key, value] of Object.entries(vars)) {
        if (!gsapKeys.includes(key) && value !== undefined) {
          animatedProps[key] = String(value);
        }
      }

      // Create animation entry for each target
      targets.forEach((target: any) => {
        if (!(target instanceof HTMLElement)) return;

        const id = generateId();
        const rect = target.getBoundingClientRect();

        // Build a descriptive name
        const propNames = Object.keys(animatedProps).slice(0, 3).join(', ');
        const name = propNames ? `gsap.${type}: ${propNames}` : `gsap.${type}`;

        const animationData = {
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
          shorthand: `gsap.${type}(element, { ${Object.entries(animatedProps).map(([k, v]) => `${k}: ${v}`).join(', ')} })`,
          position: {
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
            height: rect.height,
          },
          // Store reference to element via data attribute
          elementMarker: id,
        };

        // Mark the element so content script can find it
        target.setAttribute('data-css-weaver-gsap', id);

        animations.push(animationData);
        detectedAnimations.set(id, animationData);
      });
    } catch (error) {
      log('Error extracting tween data:', error);
    }

    return animations;
  }

  /**
   * Monkey-patch GSAP methods to intercept animations
   *
   * "Monkey-patching" means we replace the original function with our own
   * that does something extra (logging) then calls the original.
   */
  function patchGSAP(gsap: any) {
    log('Patching GSAP methods...');

    // Store original methods
    const originalTo = gsap.to;
    const originalFrom = gsap.from;
    const originalFromTo = gsap.fromTo;
    const originalSet = gsap.set;
    const originalTimeline = gsap.timeline;

    // Patch gsap.to()
    gsap.to = function(targets: any, vars: any) {
      const tween = originalTo.call(this, targets, vars);

      // Extract and send animation data
      setTimeout(() => {
        const animations = extractTweenData(tween, 'to');
        animations.forEach(sendAnimationToContentScript);
      }, 0);

      return tween;
    };

    // Patch gsap.from()
    gsap.from = function(targets: any, vars: any) {
      const tween = originalFrom.call(this, targets, vars);

      setTimeout(() => {
        const animations = extractTweenData(tween, 'from');
        animations.forEach(sendAnimationToContentScript);
      }, 0);

      return tween;
    };

    // Patch gsap.fromTo()
    gsap.fromTo = function(targets: any, fromVars: any, toVars: any) {
      const tween = originalFromTo.call(this, targets, fromVars, toVars);

      setTimeout(() => {
        const animations = extractTweenData(tween, 'fromTo');
        animations.forEach(sendAnimationToContentScript);
      }, 0);

      return tween;
    };

    // Patch gsap.set() - instant property setting
    gsap.set = function(targets: any, vars: any) {
      const tween = originalSet.call(this, targets, vars);

      setTimeout(() => {
        const animations = extractTweenData(tween, 'set');
        animations.forEach(sendAnimationToContentScript);
      }, 0);

      return tween;
    };

    // Patch gsap.timeline() to catch timeline-based animations
    gsap.timeline = function(vars?: any) {
      const timeline = originalTimeline.call(this, vars);

      // Store original timeline methods
      const originalTimelineTo = timeline.to;
      const originalTimelineFrom = timeline.from;
      const originalTimelineFromTo = timeline.fromTo;

      // Patch timeline.to()
      timeline.to = function(targets: any, vars: any, position?: any) {
        const tween = originalTimelineTo.call(this, targets, vars, position);

        setTimeout(() => {
          const animations = extractTweenData(tween, 'to');
          animations.forEach(anim => {
            anim.name = `timeline.${anim.name}`;
            sendAnimationToContentScript(anim);
          });
        }, 0);

        return this; // Timeline methods return the timeline for chaining
      };

      // Patch timeline.from()
      timeline.from = function(targets: any, vars: any, position?: any) {
        const tween = originalTimelineFrom.call(this, targets, vars, position);

        setTimeout(() => {
          const animations = extractTweenData(tween, 'from');
          animations.forEach(anim => {
            anim.name = `timeline.${anim.name}`;
            sendAnimationToContentScript(anim);
          });
        }, 0);

        return this;
      };

      // Patch timeline.fromTo()
      timeline.fromTo = function(targets: any, fromVars: any, toVars: any, position?: any) {
        const tween = originalTimelineFromTo.call(this, targets, fromVars, toVars, position);

        setTimeout(() => {
          const animations = extractTweenData(tween, 'fromTo');
          animations.forEach(anim => {
            anim.name = `timeline.${anim.name}`;
            sendAnimationToContentScript(anim);
          });
        }, 0);

        return this;
      };

      return timeline;
    };

    log('GSAP methods patched successfully!');
  }

  /**
   * Scan for existing GSAP animations (ones created before we patched)
   */
  function scanExistingGSAPAnimations(gsap: any) {
    log('Scanning for existing GSAP animations...');

    try {
      const globalTimeline = gsap.globalTimeline;
      if (!globalTimeline) return;

      const children = globalTimeline.getChildren(true, true, true);
      log(`Found ${children.length} existing tweens`);

      children.forEach((tween: any) => {
        const animations = extractTweenData(tween, 'to');
        animations.forEach(sendAnimationToContentScript);
      });
    } catch (error) {
      log('Error scanning existing animations:', error);
    }
  }

  /**
   * Check for GSAP and patch it
   */
  function initGSAPDetection() {
    // Check if GSAP is already loaded
    const gsap = (window as any).gsap || (window as any).GreenSock;

    if (gsap) {
      log('GSAP found immediately!');
      patchGSAP(gsap);
      scanExistingGSAPAnimations(gsap);
      return;
    }

    // GSAP might load later - watch for it
    log('GSAP not found yet, watching for it...');

    // Method 1: Watch for gsap to be added to window
    let checkCount = 0;
    const maxChecks = 50; // Check for 5 seconds

    const checkInterval = setInterval(() => {
      checkCount++;
      const gsap = (window as any).gsap || (window as any).GreenSock;

      if (gsap) {
        clearInterval(checkInterval);
        log('GSAP detected after page load!');
        patchGSAP(gsap);
        scanExistingGSAPAnimations(gsap);
      } else if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        log('GSAP not detected after 5 seconds');
      }
    }, 100);

    // Method 2: Use Object.defineProperty to intercept when gsap is set
    // This catches cases where gsap is added to window later
    try {
      let _gsap: any = undefined;
      Object.defineProperty(window, 'gsap', {
        get() { return _gsap; },
        set(value) {
          _gsap = value;
          if (value) {
            log('GSAP intercepted via defineProperty!');
            clearInterval(checkInterval);
            setTimeout(() => {
              patchGSAP(value);
              scanExistingGSAPAnimations(value);
            }, 100);
          }
        },
        configurable: true,
      });
    } catch (e) {
      // defineProperty might fail if gsap is already defined
      log('Could not set up defineProperty watcher');
    }
  }

  /**
   * Listen for scan requests from content script
   */
  function setupMessageListener() {
    document.addEventListener('css-weaver-scan-request', () => {
      log('Received scan request from content script');

      const gsap = (window as any).gsap || (window as any).GreenSock;
      if (gsap) {
        scanExistingGSAPAnimations(gsap);
      }

      // Send acknowledgment
      document.dispatchEvent(new CustomEvent('css-weaver-scan-complete', {
        detail: {
          gsapDetected: !!gsap,
          animationCount: detectedAnimations.size
        }
      }));
    });
  }

  // Initialize
  log('Page script initializing...');
  setupMessageListener();
  initGSAPDetection();

  // Notify content script that we're ready
  document.dispatchEvent(new CustomEvent('css-weaver-page-script-ready'));
  log('Page script ready!');

})();
