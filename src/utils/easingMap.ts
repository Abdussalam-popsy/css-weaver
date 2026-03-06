/**
 * Easing Map and Cubic Bezier Parser
 *
 * Maps common named easings and GSAP easing strings to cubic-bezier values
 * for curve rendering in the UI.
 */

export interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Map of named easings to their cubic-bezier control points
 */
export const EASING_MAP: Record<string, CubicBezier> = {
  // CSS named easings
  'linear': { x1: 0, y1: 0, x2: 1, y2: 1 },
  'ease': { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  'ease-in': { x1: 0.42, y1: 0, x2: 1, y2: 1 },
  'ease-out': { x1: 0, y1: 0, x2: 0.58, y2: 1 },
  'ease-in-out': { x1: 0.42, y1: 0, x2: 0.58, y2: 1 },

  // GSAP Power easings (common approximations)
  'power1.out': { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  'power1.in': { x1: 0.55, y1: 0.09, x2: 0.68, y2: 0.53 },
  'power1.inOut': { x1: 0.45, y1: 0.03, x2: 0.51, y2: 0.95 },

  'power2.out': { x1: 0.22, y1: 0.61, x2: 0.36, y2: 1 },
  'power2.in': { x1: 0.55, y1: 0.09, x2: 0.68, y2: 0.53 },
  'power2.inOut': { x1: 0.65, y1: 0.05, x2: 0.36, y2: 1 },

  'power3.out': { x1: 0.22, y1: 1, x2: 0.36, y2: 1 },
  'power3.in': { x1: 0.95, y1: 0.05, x2: 0.80, y2: 0.04 },
  'power3.inOut': { x1: 0.77, y1: 0, x2: 0.18, y2: 1 },

  'power4.out': { x1: 0.16, y1: 1, x2: 0.3, y2: 1 },
  'power4.in': { x1: 0.7, y1: 0, x2: 0.84, y2: 0 },
  'power4.inOut': { x1: 0.87, y1: 0, x2: 0.13, y2: 1 },

  // GSAP Back easings
  'back.out': { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
  'back.in': { x1: 0.36, y1: 0, x2: 0.66, y2: -0.56 },
  'back.inOut': { x1: 0.68, y1: -0.6, x2: 0.32, y2: 1.6 },

  // GSAP Circ easings
  'circ.out': { x1: 0.08, y1: 0.82, x2: 0.17, y2: 1 },
  'circ.in': { x1: 0.6, y1: 0.04, x2: 0.98, y2: 0.34 },
  'circ.inOut': { x1: 0.78, y1: 0.14, x2: 0.15, y2: 0.86 },

  // GSAP Expo easings
  'expo.out': { x1: 0.16, y1: 1, x2: 0.3, y2: 1 },
  'expo.in': { x1: 0.7, y1: 0, x2: 0.84, y2: 0 },
  'expo.inOut': { x1: 0.87, y1: 0, x2: 0.13, y2: 1 },

  // GSAP Sine easings
  'sine.out': { x1: 0.39, y1: 0.575, x2: 0.565, y2: 1 },
  'sine.in': { x1: 0.47, y1: 0, x2: 0.745, y2: 0.715 },
  'sine.inOut': { x1: 0.445, y1: 0.05, x2: 0.55, y2: 0.95 },

  // GSAP legacy aliases (GSAP 2.x style)
  'Expo.easeOut': { x1: 0.16, y1: 1, x2: 0.3, y2: 1 },
  'Expo.easeIn': { x1: 0.7, y1: 0, x2: 0.84, y2: 0 },
  'Expo.easeInOut': { x1: 0.87, y1: 0, x2: 0.13, y2: 1 },
  'Power1.easeOut': { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  'Power1.easeIn': { x1: 0.55, y1: 0.09, x2: 0.68, y2: 0.53 },
  'Power2.easeOut': { x1: 0.22, y1: 0.61, x2: 0.36, y2: 1 },
  'Power3.easeOut': { x1: 0.22, y1: 1, x2: 0.36, y2: 1 },
  'Power4.easeOut': { x1: 0.16, y1: 1, x2: 0.3, y2: 1 },

  // Common easing.co curves
  'easeOutQuart': { x1: 0.165, y1: 0.84, x2: 0.44, y2: 1 },
  'easeInQuart': { x1: 0.895, y1: 0.03, x2: 0.685, y2: 0.22 },
  'easeInOutQuart': { x1: 0.77, y1: 0, x2: 0.175, y2: 1 },
  'easeOutExpo': { x1: 0.19, y1: 1, x2: 0.22, y2: 1 },
  'easeInExpo': { x1: 0.95, y1: 0.05, x2: 0.795, y2: 0.035 },
  'easeInOutExpo': { x1: 1, y1: 0, x2: 0, y2: 1 },
} as const;

/**
 * Get the human-readable name for a cubic bezier if it matches a known easing
 */
export function getEasingName(easing: string): string | null {
  // Check if it's a direct match in our map
  if (EASING_MAP[easing]) {
    return formatEasingName(easing);
  }

  // Try to parse cubic-bezier and find a match
  const bezier = parseCubicBezier(easing);
  if (bezier) {
    // Check if it matches any known easing
    for (const [name, values] of Object.entries(EASING_MAP)) {
      if (
        Math.abs(values.x1 - bezier.x1) < 0.01 &&
        Math.abs(values.y1 - bezier.y1) < 0.01 &&
        Math.abs(values.x2 - bezier.x2) < 0.01 &&
        Math.abs(values.y2 - bezier.y2) < 0.01
      ) {
        return formatEasingName(name);
      }
    }
  }

  return null;
}

/**
 * Format an easing name for display
 */
function formatEasingName(name: string): string {
  // Convert power1.out -> Power1 Out, ease-in-out -> Ease In Out
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\./g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Parse a cubic-bezier string into control points
 *
 * Handles:
 * - cubic-bezier(x1, y1, x2, y2)
 * - Named easings from EASING_MAP
 *
 * Returns null for:
 * - steps() functions
 * - spring() functions
 * - Unknown named easings
 */
export function parseCubicBezier(easing: string): CubicBezier | null {
  // Normalize the string
  const normalized = easing.trim().toLowerCase();

  // Check named easings first (case-insensitive)
  for (const [name, bezier] of Object.entries(EASING_MAP)) {
    if (name.toLowerCase() === normalized) {
      return bezier;
    }
  }

  // Parse cubic-bezier(x1, y1, x2, y2)
  const match = normalized.match(
    /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/
  );
  if (match) {
    return {
      x1: parseFloat(match[1]),
      y1: parseFloat(match[2]),
      x2: parseFloat(match[3]),
      y2: parseFloat(match[4]),
    };
  }

  // Check for linear (no control points needed)
  if (normalized === 'linear') {
    return EASING_MAP['linear'];
  }

  // steps(), spring(), etc. cannot be represented as cubic-bezier
  return null;
}

/**
 * Check if an easing can be rendered as a curve
 */
export function isRenderableEasing(easing: string): boolean {
  return parseCubicBezier(easing) !== null;
}

/**
 * Get a formatted string describing the easing
 */
export function getEasingDescription(easing: string): string {
  const name = getEasingName(easing);
  if (name) {
    return name;
  }

  // Check for steps
  if (easing.includes('steps(')) {
    const match = easing.match(/steps\((\d+)/);
    if (match) {
      return `${match[1]} Steps`;
    }
    return 'Steps';
  }

  // Check for spring
  if (easing.includes('spring')) {
    return 'Spring';
  }

  // Return the raw value if nothing else matches
  return easing;
}
