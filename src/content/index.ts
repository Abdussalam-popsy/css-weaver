/**
 * CSS Weaver Content Script
 * Injected into all pages to scan for CSS animations and handle highlighting
 */

console.log('🎨 CSS Weaver: Content script starting...');

import { scanAnimations, buildDOMTree, findElementByAnimationId } from './scanner';
import { highlightElement, clearHighlight, cleanup } from './highlighter';
import { toggleFloatingPanel, destroyFloatingPanel } from './floating/inject';
import { injectPageScript, setupAnimationListener, requestPageScan } from './injected/inject';
import {
  initializeAnimationControl,
  pauseAllAnimations,
  playAllAnimations,
  seekAllAnimations,
  seekAnimation,
  setPlaybackSpeed,
  restartAllAnimations,
  getPlaybackState,
  cleanup as cleanupAnimationController,
} from './animationController';
// GSAP control removed - gsapInspector.ts tried to access window.gsap from isolated world (won't work)
// GSAP detection now happens entirely through pageScript.js → CustomEvent → animationCache.ts
import type { Animation } from '../shared/types';
import type { ContentScriptMessage, ContentScriptResponse } from '../shared/messages';
import {
  getCachedAnimations,
  setCachedAnimations,
  getPageDetectedAnimations,
  addPageDetectedAnimation,
} from './animationCache';

console.log('🎨 CSS Weaver: Imports loaded successfully');

/**
 * Initialize page script injection for GSAP/library detection
 */
function initPageScriptInjection() {
  console.log('🎨 CSS Weaver: Initializing page script injection...');

  // Inject the page script
  injectPageScript();

  // Listen for animations detected by the page script
  setupAnimationListener((animData) => {
    console.log('🎨 CSS Weaver: Received animation from page script:', animData.name);

    // Convert to full Animation type
    const animation: Animation = {
      id: animData.id || `page-${Date.now()}`,
      selector: animData.selector || 'unknown',
      tagName: animData.tagName || 'DIV',
      name: animData.name || 'Unknown Animation',
      duration: animData.duration || 0,
      delay: animData.delay || 0,
      timingFunction: animData.timingFunction || 'ease',
      iterationCount: animData.iterationCount || 1,
      direction: (animData.direction as Animation['direction']) || 'normal',
      fillMode: (animData.fillMode as Animation['fillMode']) || 'none',
      type: (animData.type as Animation['type']) || 'gsap',
      keyframes: null,
      keyframesData: null,
      animationShorthand: (animData as any).shorthand || '',
      animationLonghand: null,
      startTime: animData.delay || 0,
      endTime: (animData.delay || 0) + (animData.duration || 0),
      position: animData.position || { top: 0, bottom: 0, height: 0 },
      // Store GSAP-specific properties for code display
      properties: (animData as any).properties || {},
      // Element context from page script (HTML structure + computed styles)
      elementContext: (animData as any).elementContext || null,
    };

    // Add to shared cache (handles deduplication internally)
    if (addPageDetectedAnimation(animation)) {
      console.log('🎨 CSS Weaver: Added page animation, total:', getPageDetectedAnimations().length);
    }
  });

  console.log('🎨 CSS Weaver: Page script injection complete');
}

// Initialize page script injection immediately
initPageScriptInjection();

// Scroll tracking state
let isTrackingScroll = false;
let scrollThrottleTimer: number | null = null;

// Playback sync state
let playbackSyncInterval: number | null = null;

/**
 * Throttled scroll handler - sends scroll position updates to panel
 */
function handleScroll() {
  if (!isTrackingScroll) return;

  if (scrollThrottleTimer) return; // Skip if already throttled

  scrollThrottleTimer = window.setTimeout(() => {
    scrollThrottleTimer = null;

    // Send scroll update to background script (which forwards to panel)
    chrome.runtime.sendMessage({
      type: 'SCROLL_UPDATE',
      payload: {
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
      },
    });
  }, 100); // Throttle to 100ms
}

/**
 * Start syncing playback state with panel
 */
function startPlaybackSync() {
  if (playbackSyncInterval) return;

  playbackSyncInterval = window.setInterval(() => {
    const state = getPlaybackState();

    chrome.runtime.sendMessage({
      type: 'PLAYBACK_STATE_UPDATE',
      payload: state,
    }).catch(() => {
      // Panel might not be listening
    });
  }, 100);
}

/**
 * Stop syncing playback state
 */
function stopPlaybackSync() {
  if (playbackSyncInterval) {
    clearInterval(playbackSyncInterval);
    playbackSyncInterval = null;
  }
}

/**
 * Handle messages from the panel/background
 */
console.log('🎨 CSS Weaver: Setting up message listener...');

chrome.runtime.onMessage.addListener(
  (
    message: ContentScriptMessage,
    _sender,
    sendResponse: (response: ContentScriptResponse) => void
  ) => {
    console.log('🎨 CSS Weaver: Received message:', message.type);

    switch (message.type) {
      case 'PING':
        // Respond to readiness check
        console.log('🎨 CSS Weaver: Responding to PING');
        sendResponse({ type: 'PONG' });
        break;

      case 'SCAN_ANIMATIONS':
        try {
          // First, request a scan from the page script to get any existing GSAP animations
          requestPageScan().then(() => {
            // Scan CSS animations and Web Animations API
            const cssAnimations = scanAnimations();

            // Wait 200ms for any pending CustomEvents from GSAP patches to arrive
            setTimeout(() => {
              // Get page-detected animations from shared cache
              const pageDetectedAnims = getPageDetectedAnimations();

              // Merge with page-detected animations (GSAP, etc.)
              // CRITICAL FIX: Use ID-based deduplication instead of selector-based
              // This allows elements to have both CSS and GSAP animations
              const pageAnims = pageDetectedAnims.filter(pageAnim => {
                // Only filter out if it's the exact same animation (same ID)
                // NOT if it's just the same element (same selector)
                return !cssAnimations.some(cssAnim => cssAnim.id === pageAnim.id);
              });

              const allAnimations = [...cssAnimations, ...pageAnims];

              // Store in shared cache
              setCachedAnimations(allAnimations);

              // Initialize animation control
              initializeAnimationControl();

              // Enhanced debugging to verify GSAP animations are included
              console.log('🎨 CSS Weaver: Animation arrays', {
                css: cssAnimations.length,
                cssList: cssAnimations.map(a => ({ name: a.name, selector: a.selector, type: a.type })),
                page: pageDetectedAnims.length,
                pageList: pageDetectedAnims.map(a => ({ name: a.name, selector: a.selector, type: a.type })),
                filtered: pageAnims.length,
                total: allAnimations.length
              });

              console.log('🎨 CSS Weaver: Scan complete', {
                cssAnimations: cssAnimations.length,
                pageDetected: pageAnims.length,
                total: allAnimations.length,
              });

              sendResponse({
                type: 'ANIMATIONS_FOUND',
                payload: allAnimations,
              });
            }, 200); // 200ms buffer for CustomEvents to arrive
          });
        } catch (error) {
          sendResponse({
            type: 'SCAN_ERROR',
            payload: { error: String(error) },
          });
        }
        break;

      case 'HIGHLIGHT_ELEMENT':
        highlightElement(message.payload.id);
        break;

      case 'CLEAR_HIGHLIGHT':
        clearHighlight();
        break;

      case 'START_SCROLL_TRACKING':
        console.log('🎨 CSS Weaver: Starting scroll tracking');
        isTrackingScroll = true;
        window.addEventListener('scroll', handleScroll, { passive: true });
        // Send initial position immediately
        handleScroll();
        break;

      case 'STOP_SCROLL_TRACKING':
        console.log('🎨 CSS Weaver: Stopping scroll tracking');
        isTrackingScroll = false;
        window.removeEventListener('scroll', handleScroll);
        if (scrollThrottleTimer) {
          clearTimeout(scrollThrottleTimer);
          scrollThrottleTimer = null;
        }
        break;

      case 'GET_DOM_TREE':
        try {
          const tree = buildDOMTree(getCachedAnimations());
          sendResponse({
            type: 'DOM_TREE_RESULT',
            payload: tree,
          });
        } catch (error) {
          sendResponse({
            type: 'SCAN_ERROR',
            payload: { error: String(error) },
          });
        }
        break;

      case 'SCROLL_TO_POSITION':
        window.scrollTo({
          top: message.payload.scrollY,
          behavior: 'smooth',
        });
        break;

      case 'SCROLL_TO_ELEMENT': {
        // Find element by animation ID and scroll to it (checks multiple data attributes)
        const element = findElementByAnimationId(message.payload.animationId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }

      case 'TOGGLE_FLOATING_PANEL':
        console.log('🎨 CSS Weaver: Toggling floating panel');
        toggleFloatingPanel();
        sendResponse({ type: 'PONG' });
        break;

      // Animation playback control messages
      case 'PLAYBACK_CONTROL': {
        const { action, value } = (message as any).payload;
        console.log('🎮 CSS Weaver: Playback control:', action, value);

        switch (action) {
          case 'play':
            playAllAnimations();
            startPlaybackSync();
            break;
          case 'pause':
            pauseAllAnimations();
            stopPlaybackSync();
            break;
          case 'restart':
            restartAllAnimations();
            startPlaybackSync();
            break;
          case 'seek':
            if (value !== undefined) {
              seekAllAnimations(value);
            }
            break;
          case 'speed':
            if (value !== undefined) {
              setPlaybackSpeed(value);
            }
            break;
          case 'seekAnimation':
            if (value?.id && value?.progress !== undefined) {
              seekAnimation(value.id, value.progress);
            }
            break;
        }
        sendResponse({ type: 'PONG' });
        break;
      }

      // Get current playback state
      case 'GET_PLAYBACK_STATE': {
        const state = getPlaybackState();

        sendResponse({
          type: 'PLAYBACK_STATE_RESULT',
          payload: state,
        } as any);
        break;
      }

      default:
        // Unknown message type
        break;
    }

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
);

// Clean up when the page is about to unload
window.addEventListener('beforeunload', () => {
  // Stop scroll tracking
  isTrackingScroll = false;
  window.removeEventListener('scroll', handleScroll);
  if (scrollThrottleTimer) {
    clearTimeout(scrollThrottleTimer);
  }

  // Stop playback sync
  stopPlaybackSync();

  // Clean up animation controller
  cleanupAnimationController();

  // Clean up highlights
  cleanup();

  // Clean up floating panel
  destroyFloatingPanel();
});

// Log that content script is fully loaded and ready
console.log('✅ CSS Weaver: Content script loaded and ready!');
console.log('🎨 CSS Weaver: You should now be able to use the extension.');
