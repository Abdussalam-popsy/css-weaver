/**
 * Manages element highlighting on the page
 */

const HIGHLIGHT_ID = 'css-weaver-highlight-overlay';

let highlightOverlay: HTMLDivElement | null = null;

/**
 * Find an element by animation ID (supports comma-separated IDs in data attribute)
 */
function findElementByWeaverId(animationId: string): HTMLElement | null {
  // First try exact match (for single-ID elements)
  let element = document.querySelector(
    `[data-css-weaver-id="${animationId}"]`
  ) as HTMLElement | null;

  if (element) return element;

  // Search through all elements with weaver IDs for comma-separated matches
  const allElements = document.querySelectorAll('[data-css-weaver-id]');
  for (const el of allElements) {
    const ids = (el as HTMLElement).dataset.cssWeaverId?.split(',') || [];
    if (ids.includes(animationId)) {
      return el as HTMLElement;
    }
  }

  // Try GSAP marker (page-injected animations)
  element = document.querySelector(
    `[data-css-weaver-gsap="${animationId}"]`
  ) as HTMLElement | null;

  return element;
}

/**
 * Create the highlight overlay element if it doesn't exist
 */
function ensureOverlay(): HTMLDivElement {
  if (highlightOverlay && document.body.contains(highlightOverlay)) {
    return highlightOverlay;
  }

  highlightOverlay = document.createElement('div');
  highlightOverlay.id = HIGHLIGHT_ID;
  highlightOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    border: 2px solid #22c55e;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 4px;
    transition: all 0.15s ease-out;
    opacity: 0;
  `;

  document.body.appendChild(highlightOverlay);
  return highlightOverlay;
}

/**
 * Highlight an element by its CSS Weaver ID (supports comma-separated IDs and GSAP markers)
 */
export function highlightElement(animationId: string): void {
  const element = findElementByWeaverId(animationId);

  if (!element) {
    clearHighlight();
    return;
  }

  const overlay = ensureOverlay();
  const rect = element.getBoundingClientRect();

  // Position and size the overlay
  overlay.style.top = `${rect.top - 2}px`;
  overlay.style.left = `${rect.left - 2}px`;
  overlay.style.width = `${rect.width + 4}px`;
  overlay.style.height = `${rect.height + 4}px`;
  overlay.style.opacity = '1';

  // Also add a temporary outline to the element itself for extra visibility
  element.style.outline = '2px solid #22c55e';
  element.style.outlineOffset = '2px';
}

/**
 * Clear any active highlight
 */
export function clearHighlight(): void {
  if (highlightOverlay) {
    highlightOverlay.style.opacity = '0';
  }

  // Remove outlines from all previously highlighted elements (both CSS and GSAP markers)
  document.querySelectorAll('[data-css-weaver-id], [data-css-weaver-gsap]').forEach((el) => {
    (el as HTMLElement).style.outline = '';
    (el as HTMLElement).style.outlineOffset = '';
  });
}

/**
 * Scroll an element into view
 */
export function scrollToElement(animationId: string): void {
  const element = findElementByWeaverId(animationId);

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }
}

/**
 * Clean up all CSS Weaver artifacts
 */
export function cleanup(): void {
  clearHighlight();

  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }

  // Remove data attributes (both CSS and GSAP markers)
  document.querySelectorAll('[data-css-weaver-id]').forEach((el) => {
    delete (el as HTMLElement).dataset.cssWeaverId;
  });
  document.querySelectorAll('[data-css-weaver-gsap]').forEach((el) => {
    delete (el as HTMLElement).dataset.cssWeaverGsap;
  });
}
