/**
 * Shared animation cache for content script
 * This module holds cached animations that can be accessed by both
 * the main content script (index.ts) and the floating panel (FloatingApp.tsx)
 */

import type { Animation } from '../shared/types';

// Cached animations from the last scan (CSS + GSAP + Framer Motion, etc.)
let cachedAnimations: Animation[] = [];

// Page-detected animations (from page script CustomEvents)
const pageDetectedAnimations: Animation[] = [];

/**
 * Get all cached animations (CSS + library animations merged)
 */
export function getCachedAnimations(): Animation[] {
  return [...cachedAnimations];
}

/**
 * Set cached animations (called by content script after scan)
 */
export function setCachedAnimations(animations: Animation[]): void {
  cachedAnimations = animations;
}

/**
 * Get page-detected animations (GSAP, Framer, etc. from page script)
 */
export function getPageDetectedAnimations(): Animation[] {
  return pageDetectedAnimations;
}

/**
 * Add a page-detected animation (called when receiving CustomEvent from page script)
 * Also marks the DOM element with data-css-weaver-id for highlighting and scroll-to-element
 */
export function addPageDetectedAnimation(animation: Animation): boolean {
  const exists = pageDetectedAnimations.some(a => a.id === animation.id);
  if (!exists) {
    // Mark the DOM element with data attribute for lookup
    // This is critical for scroll-to-element and highlighting to work
    markElementWithAnimationId(animation.selector, animation.id);

    pageDetectedAnimations.push(animation);
    return true;
  }
  return false;
}

/**
 * Mark a DOM element with the animation ID for lookup
 * Uses comma-separated list to support multiple animations on same element
 */
function markElementWithAnimationId(selector: string, animationId: string): void {
  try {
    // Try to find the element using the selector
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      const existingIds = element.dataset.cssWeaverId || '';
      const ids = existingIds ? existingIds.split(',') : [];
      if (!ids.includes(animationId)) {
        ids.push(animationId);
        element.dataset.cssWeaverId = ids.join(',');
        console.log('🎨 CSS Weaver: Marked element with animation ID:', animationId, selector);
      }
    } else {
      console.debug('🎨 CSS Weaver: Could not find element for selector:', selector);
    }
  } catch (error) {
    console.debug('🎨 CSS Weaver: Error marking element:', error);
  }
}

/**
 * Clear all page-detected animations (for rescan)
 */
export function clearPageDetectedAnimations(): void {
  pageDetectedAnimations.length = 0;
}

/**
 * Check if we have any cached animations
 */
export function hasCachedAnimations(): boolean {
  return cachedAnimations.length > 0;
}
