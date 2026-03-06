/**
 * Injects the page script into the actual page context
 *
 * WHY WE NEED THIS:
 * Content scripts run in an "isolated world" - they share the DOM with the page
 * but have a completely separate JavaScript execution context. This means:
 *
 * - Content script's `window` ≠ Page's `window`
 * - We can't access `window.gsap` from the content script
 * - We can't monkey-patch page functions from the content script
 *
 * SOLUTION:
 * We inject a <script> tag into the page using an external file URL.
 * This bypasses CSP restrictions that block inline scripts.
 * The script is loaded from the extension's web_accessible_resources.
 *
 * COMMUNICATION:
 * Since the injected script and content script are in different worlds,
 * they communicate via CustomEvents on the document (which both can access).
 */

import type { Animation } from '../../shared/types';

// Note: Animation storage now handled by animationCache.ts (single source of truth)

/**
 * Inject the page script into the document
 * Uses an external file to bypass CSP restrictions
 */
export function injectPageScript(): void {
  // Check if already injected
  if (document.getElementById('css-weaver-page-script')) {
    console.log('🎨 CSS Weaver: Page script already injected');
    return;
  }

  console.log('🎨 CSS Weaver: Injecting page script...');

  // Create script element with external src (bypasses CSP)
  const script = document.createElement('script');
  script.id = 'css-weaver-page-script';
  script.src = chrome.runtime.getURL('public/pageScript.js');
  script.type = 'text/javascript';

  // Handle load events
  script.onload = () => {
    console.log('🎨 CSS Weaver: Page script loaded successfully!');
  };

  script.onerror = (error) => {
    console.error('🎨 CSS Weaver: Failed to load page script:', error);
    // Fallback: try inline injection (will fail on strict CSP sites)
    console.log('🎨 CSS Weaver: Attempting fallback inline injection...');
    injectPageScriptInline();
  };

  // Inject into page (at the very beginning)
  const target = document.head || document.documentElement;
  target.insertBefore(script, target.firstChild);

  console.log('🎨 CSS Weaver: Page script injected!');
}

/**
 * Fallback: Inject page script inline (for sites without strict CSP)
 * This will be blocked on sites with strict CSP, but works on most sites
 */
function injectPageScriptInline(): void {
  // Minimal inline script that loads the external file
  const script = document.createElement('script');
  script.id = 'css-weaver-page-script-fallback';
  script.textContent = `
    (function() {
      const script = document.createElement('script');
      script.src = '${chrome.runtime.getURL('public/pageScript.js')}';
      document.head.appendChild(script);
    })();
  `;

  try {
    const target = document.head || document.documentElement;
    target.insertBefore(script, target.firstChild);
  } catch (e) {
    console.error('🎨 CSS Weaver: Fallback injection also failed:', e);
  }
}

/**
 * Listen for animation events from the page script
 */
export function setupAnimationListener(
  onAnimation: (animation: Partial<Animation>) => void
): void {
  document.addEventListener('css-weaver-animation', ((event: CustomEvent) => {
    const animData = event.detail;
    console.log('🎨 CSS Weaver: Received animation from page:', animData.name);
    onAnimation(animData);
  }) as EventListener);
}

/**
 * Request a scan from the page script
 */
export function requestPageScan(): Promise<{ gsapFound: boolean }> {
  return new Promise((resolve) => {
    const handler = ((event: CustomEvent) => {
      document.removeEventListener('css-weaver-scan-complete', handler as EventListener);
      resolve(event.detail);
    }) as EventListener;

    document.addEventListener('css-weaver-scan-complete', handler);
    document.dispatchEvent(new CustomEvent('css-weaver-scan-request'));

    // Timeout after 2 seconds
    setTimeout(() => {
      document.removeEventListener('css-weaver-scan-complete', handler as EventListener);
      resolve({ gsapFound: false });
    }, 2000);
  });
}

// Note: getPageDetectedAnimations and clearPageDetectedAnimations removed
// Animation storage now handled by animationCache.ts
