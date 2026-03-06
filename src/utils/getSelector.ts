/**
 * Consolidated getSelector utility
 * Generates a unique CSS selector for an element
 *
 * Note: This is the canonical implementation for the content script.
 * pageScript.js has its own copy (can't share code across execution contexts)
 * but should follow the same logic.
 */

/**
 * Tailwind utility class patterns to filter out
 * These are not meaningful for selector generation
 */
const UTILITY_CLASS_PATTERNS = /^(w-|h-|p-|m-|flex|grid|text-|bg-|border|rounded|shadow|transition|duration|ease|transform|scale|rotate|translate|opacity|overflow|z-|gap-|space-|font-|leading|tracking|items-|justify-|self-|place-|col-|row-|hidden|block|inline|absolute|relative|fixed|sticky|top-|right-|bottom-|left-|inset-)/;

/**
 * Generate a unique CSS selector for an element
 *
 * Strategy:
 * 1. If element has an ID, return '#id'
 * 2. Build a path from element up to body (max depth 3-4)
 * 3. Each segment: tagName + up to 2 meaningful classes (filter Tailwind utilities)
 * 4. Use nth-child if needed for uniqueness
 */
export function getSelector(element: HTMLElement): string {
  // 1. If element has an ID, use it
  if (element.id) {
    return `#${element.id}`;
  }

  // 2. Build a path
  const path: string[] = [];
  let current: HTMLElement | null = element;
  const maxDepth = 4;

  while (current && current !== document.body && path.length < maxDepth) {
    let selector = current.tagName.toLowerCase();

    // Add meaningful class if available
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);

      if (classes.length > 0) {
        // Find first meaningful class (not a utility class)
        const meaningfulClass = classes.find(
          (c) => !UTILITY_CLASS_PATTERNS.test(c)
        );

        if (meaningfulClass) {
          selector += `.${meaningfulClass}`;
        } else if (classes[0]) {
          // Fallback to first class if no meaningful one found
          selector += `.${classes[0]}`;
        }
      }
    }

    // Add nth-child if needed for uniqueness among siblings with same tag
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        (el) => el.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ') || 'body';
}

/**
 * Get meaningful classes from an element (filtered, limited)
 * Useful for display in the UI
 */
export function getMeaningfulClasses(element: HTMLElement, maxClasses = 3): string[] {
  if (!element.className || typeof element.className !== 'string') {
    return [];
  }

  return element.className
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => !UTILITY_CLASS_PATTERNS.test(c))
    .slice(0, maxClasses);
}
