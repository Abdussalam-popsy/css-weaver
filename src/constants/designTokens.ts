/**
 * CSS Weaver Design System
 *
 * A refined, premium dark theme inspired by Linear, Raycast, and Vercel.
 * Focused on subtle gradients, soft shadows, and careful color harmony.
 */

// Core color palette - sophisticated dark theme
export const colors = {
  // Backgrounds - layered depth with subtle warmth
  bg: {
    primary: '#0d0d0f',      // Deepest background
    secondary: '#141417',    // Panel/card background
    tertiary: '#1a1a1f',     // Elevated surfaces
    elevated: '#222228',     // Hover states, inputs
    hover: '#2a2a32',        // Active hover
  },

  // Borders - subtle separation
  border: {
    default: 'rgba(255, 255, 255, 0.06)',
    subtle: 'rgba(255, 255, 255, 0.04)',
    strong: 'rgba(255, 255, 255, 0.1)',
    focus: 'rgba(99, 102, 241, 0.5)',
  },

  // Text hierarchy
  text: {
    primary: '#f4f4f5',      // High emphasis
    secondary: '#a1a1aa',    // Medium emphasis
    tertiary: '#71717a',     // Low emphasis
    disabled: '#52525b',     // Disabled state
  },

  // Accent - sophisticated indigo/violet gradient feel
  accent: {
    primary: '#818cf8',      // Main accent (indigo-400)
    secondary: '#a78bfa',    // Secondary accent (violet-400)
    tertiary: '#c4b5fd',     // Light accent
    muted: 'rgba(129, 140, 248, 0.12)',
    border: 'rgba(129, 140, 248, 0.25)',
    glow: 'rgba(129, 140, 248, 0.15)',
  },

  // Success/positive
  success: {
    primary: '#34d399',      // Emerald-400
    muted: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.25)',
  },

  // Warning
  warning: {
    primary: '#fbbf24',      // Amber-400
    muted: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.25)',
  },

  // Error/danger
  error: {
    primary: '#f87171',      // Red-400
    muted: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.25)',
  },
} as const;

// Animation type colors - harmonized with the new palette
export const typeColors = {
  animation: {
    color: '#34d399',        // Emerald - CSS keyframes
    bg: 'rgba(52, 211, 153, 0.1)',
    border: 'rgba(52, 211, 153, 0.2)',
    glow: 'rgba(52, 211, 153, 0.15)',
  },
  transition: {
    color: '#60a5fa',        // Blue - CSS transitions
    bg: 'rgba(96, 165, 250, 0.1)',
    border: 'rgba(96, 165, 250, 0.2)',
    glow: 'rgba(96, 165, 250, 0.15)',
  },
  gsap: {
    color: '#a3e635',        // Lime - GSAP brand
    bg: 'rgba(163, 230, 53, 0.1)',
    border: 'rgba(163, 230, 53, 0.2)',
    glow: 'rgba(163, 230, 53, 0.15)',
  },
  'web-animation': {
    color: '#fbbf24',        // Amber - Web Animation API
    bg: 'rgba(251, 191, 36, 0.1)',
    border: 'rgba(251, 191, 36, 0.2)',
    glow: 'rgba(251, 191, 36, 0.15)',
  },
  'scroll-driven': {
    color: '#c084fc',        // Purple - Scroll-driven
    bg: 'rgba(192, 132, 252, 0.1)',
    border: 'rgba(192, 132, 252, 0.2)',
    glow: 'rgba(192, 132, 252, 0.15)',
  },
} as const;

// Type color scheme - extracted type for function parameters
export type TypeColorScheme = {
  color: string;
  bg: string;
  border: string;
  glow: string;
};

// Typography
export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
  },
  fontSize: {
    xs: '10px',
    sm: '11px',
    base: '12px',
    md: '13px',
    lg: '14px',
    xl: '16px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '-0.01em',
    wide: '0.02em',
    wider: '0.05em',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// Spacing scale (in pixels)
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

// Border radius
export const radius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// Shadows - layered for depth
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
  // Glow effects
  glow: {
    accent: '0 0 20px rgba(129, 140, 248, 0.15)',
    success: '0 0 20px rgba(52, 211, 153, 0.15)',
  },
  // Panel shadow
  panel: '0 0 0 1px rgba(255, 255, 255, 0.05), 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(129, 140, 248, 0.05)',
} as const;

// Transitions
export const transitions = {
  fast: '100ms ease',
  normal: '150ms ease',
  slow: '250ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/**
 * Get type-specific colors
 */
export function getTypeColorScheme(type: string): TypeColorScheme {
  const scheme = typeColors[type as keyof typeof typeColors] || typeColors.animation;
  return {
    color: scheme.color,
    bg: scheme.bg,
    border: scheme.border,
    glow: scheme.glow,
  };
}
