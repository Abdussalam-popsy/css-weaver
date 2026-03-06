/**
 * CSS Property Category Mapping
 * Maps CSS properties to categories for organized display
 */

import type { CSSCategory } from '../shared/types';

/**
 * Map of CSS properties to their categories
 */
const CSS_PROPERTY_CATEGORIES: Record<string, CSSCategory> = {
  // Layout
  'display': 'layout',
  'position': 'layout',
  'top': 'layout',
  'right': 'layout',
  'bottom': 'layout',
  'left': 'layout',
  'float': 'layout',
  'clear': 'layout',
  'z-index': 'layout',
  'isolation': 'layout',
  'contain': 'layout',
  'content-visibility': 'layout',

  // Box Model
  'margin': 'box',
  'margin-top': 'box',
  'margin-right': 'box',
  'margin-bottom': 'box',
  'margin-left': 'box',
  'margin-block': 'box',
  'margin-block-start': 'box',
  'margin-block-end': 'box',
  'margin-inline': 'box',
  'margin-inline-start': 'box',
  'margin-inline-end': 'box',
  'padding': 'box',
  'padding-top': 'box',
  'padding-right': 'box',
  'padding-bottom': 'box',
  'padding-left': 'box',
  'padding-block': 'box',
  'padding-block-start': 'box',
  'padding-block-end': 'box',
  'padding-inline': 'box',
  'padding-inline-start': 'box',
  'padding-inline-end': 'box',
  'border': 'box',
  'border-width': 'box',
  'border-style': 'box',
  'border-color': 'box',
  'border-radius': 'box',
  'border-top': 'box',
  'border-right': 'box',
  'border-bottom': 'box',
  'border-left': 'box',
  'border-top-width': 'box',
  'border-right-width': 'box',
  'border-bottom-width': 'box',
  'border-left-width': 'box',
  'border-top-style': 'box',
  'border-right-style': 'box',
  'border-bottom-style': 'box',
  'border-left-style': 'box',
  'border-top-color': 'box',
  'border-right-color': 'box',
  'border-bottom-color': 'box',
  'border-left-color': 'box',
  'border-top-left-radius': 'box',
  'border-top-right-radius': 'box',
  'border-bottom-left-radius': 'box',
  'border-bottom-right-radius': 'box',
  'outline': 'box',
  'outline-width': 'box',
  'outline-style': 'box',
  'outline-color': 'box',
  'outline-offset': 'box',

  // Sizing
  'width': 'sizing',
  'height': 'sizing',
  'min-width': 'sizing',
  'max-width': 'sizing',
  'min-height': 'sizing',
  'max-height': 'sizing',
  'box-sizing': 'sizing',
  'aspect-ratio': 'sizing',
  'inline-size': 'sizing',
  'block-size': 'sizing',
  'min-inline-size': 'sizing',
  'max-inline-size': 'sizing',
  'min-block-size': 'sizing',
  'max-block-size': 'sizing',

  // Flexbox
  'flex': 'flexbox',
  'flex-direction': 'flexbox',
  'flex-wrap': 'flexbox',
  'flex-flow': 'flexbox',
  'flex-grow': 'flexbox',
  'flex-shrink': 'flexbox',
  'flex-basis': 'flexbox',
  'align-items': 'flexbox',
  'align-self': 'flexbox',
  'align-content': 'flexbox',
  'justify-content': 'flexbox',
  'justify-items': 'flexbox',
  'justify-self': 'flexbox',
  'gap': 'flexbox',
  'row-gap': 'flexbox',
  'column-gap': 'flexbox',
  'order': 'flexbox',

  // Grid
  'grid': 'grid',
  'grid-template': 'grid',
  'grid-template-columns': 'grid',
  'grid-template-rows': 'grid',
  'grid-template-areas': 'grid',
  'grid-column': 'grid',
  'grid-row': 'grid',
  'grid-area': 'grid',
  'grid-auto-columns': 'grid',
  'grid-auto-rows': 'grid',
  'grid-auto-flow': 'grid',
  'grid-column-start': 'grid',
  'grid-column-end': 'grid',
  'grid-row-start': 'grid',
  'grid-row-end': 'grid',
  'place-content': 'grid',
  'place-items': 'grid',
  'place-self': 'grid',

  // Typography
  'font': 'typography',
  'font-family': 'typography',
  'font-size': 'typography',
  'font-weight': 'typography',
  'font-style': 'typography',
  'font-variant': 'typography',
  'font-stretch': 'typography',
  'font-feature-settings': 'typography',
  'font-optical-sizing': 'typography',
  'line-height': 'typography',
  'letter-spacing': 'typography',
  'word-spacing': 'typography',
  'text-align': 'typography',
  'text-decoration': 'typography',
  'text-decoration-line': 'typography',
  'text-decoration-color': 'typography',
  'text-decoration-style': 'typography',
  'text-decoration-thickness': 'typography',
  'text-transform': 'typography',
  'text-indent': 'typography',
  'text-shadow': 'typography',
  'text-overflow': 'typography',
  'text-underline-offset': 'typography',
  'white-space': 'typography',
  'word-break': 'typography',
  'word-wrap': 'typography',
  'overflow-wrap': 'typography',
  'vertical-align': 'typography',
  'color': 'typography',
  'hyphens': 'typography',
  'writing-mode': 'typography',
  'direction': 'typography',

  // Visual
  'background': 'visual',
  'background-color': 'visual',
  'background-image': 'visual',
  'background-position': 'visual',
  'background-position-x': 'visual',
  'background-position-y': 'visual',
  'background-size': 'visual',
  'background-repeat': 'visual',
  'background-attachment': 'visual',
  'background-clip': 'visual',
  'background-origin': 'visual',
  'background-blend-mode': 'visual',
  'opacity': 'visual',
  'visibility': 'visual',
  'overflow': 'visual',
  'overflow-x': 'visual',
  'overflow-y': 'visual',
  'overflow-anchor': 'visual',
  'cursor': 'visual',
  'pointer-events': 'visual',
  'box-shadow': 'visual',
  'filter': 'visual',
  'backdrop-filter': 'visual',
  'mix-blend-mode': 'visual',
  'clip-path': 'visual',
  'mask': 'visual',
  'mask-image': 'visual',
  'mask-size': 'visual',
  'mask-position': 'visual',
  'mask-repeat': 'visual',
  'object-fit': 'visual',
  'object-position': 'visual',
  'image-rendering': 'visual',

  // Transform
  'transform': 'transform',
  'transform-origin': 'transform',
  'transform-style': 'transform',
  'perspective': 'transform',
  'perspective-origin': 'transform',
  'backface-visibility': 'transform',
  'rotate': 'transform',
  'scale': 'transform',
  'translate': 'transform',

  // Animation
  'animation': 'animation',
  'animation-name': 'animation',
  'animation-duration': 'animation',
  'animation-timing-function': 'animation',
  'animation-delay': 'animation',
  'animation-iteration-count': 'animation',
  'animation-direction': 'animation',
  'animation-fill-mode': 'animation',
  'animation-play-state': 'animation',
  'animation-timeline': 'animation',
  'transition': 'animation',
  'transition-property': 'animation',
  'transition-duration': 'animation',
  'transition-timing-function': 'animation',
  'transition-delay': 'animation',
  'will-change': 'animation',
};

/**
 * Prefixes to filter out (browser vendor prefixes)
 */
const HIDDEN_PREFIXES = ['-webkit-', '-moz-', '-ms-', '-o-', 'webkit'];

/**
 * Get the category for a CSS property
 */
export function categorizeProperty(propertyName: string): CSSCategory {
  // Check direct mapping
  if (CSS_PROPERTY_CATEGORIES[propertyName]) {
    return CSS_PROPERTY_CATEGORIES[propertyName];
  }

  // Check prefix patterns
  if (propertyName.startsWith('margin-') || propertyName.startsWith('padding-')) {
    return 'box';
  }
  if (propertyName.startsWith('border-')) {
    return 'box';
  }
  if (propertyName.startsWith('font-') || propertyName.startsWith('text-')) {
    return 'typography';
  }
  if (propertyName.startsWith('background-')) {
    return 'visual';
  }
  if (propertyName.startsWith('grid-')) {
    return 'grid';
  }
  if (propertyName.startsWith('flex-') || propertyName.startsWith('align-') || propertyName.startsWith('justify-')) {
    return 'flexbox';
  }
  if (propertyName.startsWith('animation-') || propertyName.startsWith('transition-')) {
    return 'animation';
  }
  if (propertyName.startsWith('transform') || propertyName.startsWith('perspective')) {
    return 'transform';
  }
  if (propertyName.startsWith('overflow-') || propertyName.startsWith('mask-')) {
    return 'visual';
  }

  return 'other';
}

/**
 * Check if a property should be hidden (browser prefixes)
 */
export function shouldHideProperty(propertyName: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => propertyName.startsWith(prefix));
}

/**
 * Check if a value is the browser default for that property
 */
export function isDefaultValue(property: string, value: string): boolean {
  // Common default values to filter
  const defaultValues = ['0px', '0', '0s', 'none', 'normal', 'auto', 'visible', 'static', 'transparent', 'medium none', 'rgb(0, 0, 0)', 'rgba(0, 0, 0, 0)'];

  if (defaultValues.includes(value)) {
    return true;
  }

  // Property-specific defaults
  const propertyDefaults: Record<string, string[]> = {
    'display': ['inline', 'block'], // Context-dependent
    'position': ['static'],
    'visibility': ['visible'],
    'opacity': ['1'],
    'z-index': ['auto'],
    'overflow': ['visible'],
    'float': ['none'],
    'clear': ['none'],
    'transform': ['none'],
    'filter': ['none'],
    'will-change': ['auto'],
    'flex-grow': ['0'],
    'flex-shrink': ['1'],
    'order': ['0'],
    'font-weight': ['400', 'normal'],
    'font-style': ['normal'],
    'text-decoration': ['none'],
    'text-transform': ['none'],
    'background-color': ['rgba(0, 0, 0, 0)', 'transparent'],
    'background-image': ['none'],
    'box-shadow': ['none'],
    'border-style': ['none'],
  };

  if (propertyDefaults[property]?.includes(value)) {
    return true;
  }

  return false;
}

/**
 * Category display labels
 */
export const CATEGORY_LABELS: Record<CSSCategory, string> = {
  layout: 'Layout',
  box: 'Box Model',
  sizing: 'Sizing',
  flexbox: 'Flexbox',
  grid: 'Grid',
  typography: 'Typography',
  visual: 'Visual',
  transform: 'Transform',
  animation: 'Animation',
  other: 'Other',
};

/**
 * Order for displaying categories
 */
export const CATEGORY_ORDER: CSSCategory[] = [
  'layout',
  'sizing',
  'box',
  'flexbox',
  'grid',
  'typography',
  'visual',
  'transform',
  'animation',
  'other',
];
