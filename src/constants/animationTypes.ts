/**
 * Animation Type Constants
 * Consolidated mappings for animation type labels, colors, and styling
 */

export type AnimationType = 'animation' | 'transition' | 'gsap' | 'web-animation' | 'framer-motion' | 'scroll-driven';

export interface AnimationTypeConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  tailwindClass: string;
}

export const ANIMATION_TYPES: Record<AnimationType, AnimationTypeConfig> = {
  'animation': {
    label: 'CSS Keyframes',
    shortLabel: 'Keyframes',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    tailwindClass: 'bg-weaver-accent/20 text-weaver-accent',
  },
  'transition': {
    label: 'CSS Transition',
    shortLabel: 'Transition',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    tailwindClass: 'bg-blue-500/20 text-blue-400',
  },
  'gsap': {
    label: 'GSAP',
    shortLabel: 'GSAP',
    color: '#88ce02',
    bgColor: 'rgba(136, 206, 2, 0.15)',
    borderColor: 'rgba(136, 206, 2, 0.3)',
    tailwindClass: 'bg-green-600/20 text-green-400',
  },
  'web-animation': {
    label: 'Web Animation API',
    shortLabel: 'Web API',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
    tailwindClass: 'bg-yellow-500/20 text-yellow-400',
  },
  'framer-motion': {
    label: 'Framer Motion',
    shortLabel: 'Framer',
    color: '#ff0088',
    bgColor: 'rgba(255, 0, 136, 0.15)',
    borderColor: 'rgba(255, 0, 136, 0.3)',
    tailwindClass: 'bg-pink-500/20 text-pink-400',
  },
  'scroll-driven': {
    label: 'Scroll-Driven',
    shortLabel: 'Scroll',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    tailwindClass: 'bg-purple-500/20 text-purple-400',
  },
} as const;

/**
 * Get animation type configuration
 */
export function getAnimationTypeConfig(type: string): AnimationTypeConfig {
  return ANIMATION_TYPES[type as AnimationType] || ANIMATION_TYPES['animation'];
}

/**
 * Get the display label for animation type
 */
export function getTypeLabel(type: string): string {
  return getAnimationTypeConfig(type).shortLabel;
}

/**
 * Get the full label for animation type
 */
export function getTypeFullLabel(type: string): string {
  return getAnimationTypeConfig(type).label;
}

/**
 * Get Tailwind classes for animation type badge
 */
export function getTypeBadgeClass(type: string): string {
  return getAnimationTypeConfig(type).tailwindClass;
}

/**
 * Get inline style colors for animation type (for Shadow DOM / inline styles)
 */
export function getTypeColors(type: string): { bg: string; text: string; border: string } {
  const config = getAnimationTypeConfig(type);
  return {
    bg: config.bgColor,
    text: config.color,
    border: config.borderColor,
  };
}
