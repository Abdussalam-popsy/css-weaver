/**
 * Represents a single element in the HTML structure context
 */
export interface ElementNode {
  tagName: string;
  id: string | null;
  classList: string[];
  attributes: Record<string, string>; // data-*, aria-*, role, href, src, etc.
  textContent: string | null; // First 50 chars of direct text
}

/**
 * CSS property categories for organized display
 */
export type CSSCategory =
  | 'layout'
  | 'box'
  | 'sizing'
  | 'flexbox'
  | 'grid'
  | 'typography'
  | 'visual'
  | 'transform'
  | 'animation'
  | 'other';

/**
 * A CSS property with its computed value
 */
export interface ComputedProperty {
  name: string;
  value: string;
  isDefault: boolean;
}

/**
 * Grouped computed styles by category
 */
export interface CategorizedStyles {
  layout: ComputedProperty[];
  box: ComputedProperty[];
  sizing: ComputedProperty[];
  flexbox: ComputedProperty[];
  grid: ComputedProperty[];
  typography: ComputedProperty[];
  visual: ComputedProperty[];
  transform: ComputedProperty[];
  animation: ComputedProperty[];
  other: ComputedProperty[];
}

/**
 * Complete element context for HTML/Styles tabs
 */
export interface ElementContext {
  element: ElementNode;
  parent: ElementNode | null;
  grandparent: ElementNode | null;
  computedStyles: CategorizedStyles;
  dimensions: {
    width: number;
    height: number;
    offsetTop: number;
    offsetLeft: number;
  };
}

/**
 * Represents a single keyframe step in an animation
 */
export interface KeyframeStep {
  offset: number; // 0-1 (0% = 0, 100% = 1)
  properties: Record<string, string>; // { opacity: '0', transform: '...' }
  rawCssText: string; // Raw CSS text for this step, e.g., "0% { opacity: 0; }"
}

/**
 * Represents the complete @keyframes rule data
 */
export interface KeyframesData {
  name: string; // @keyframes name
  steps: KeyframeStep[]; // Parsed steps
  rawCssText: string; // Complete @keyframes block as CSS text
}

/**
 * Represents a node in the DOM tree structure for the HTML sidebar
 */
export interface DOMTreeNode {
  id: string; // Unique identifier for the node
  tagName: string; // HTML tag name (e.g., "div", "h1")
  selector: string; // CSS selector for this element
  classList: string[]; // CSS classes on the element
  children: DOMTreeNode[]; // Child nodes (animated or ancestors of animated)
  depth: number; // Nesting depth from root
  animationIds: string[]; // IDs of animations on this element
  hasAnimatedDescendants: boolean; // True if has animated children/grandchildren
  isExpanded?: boolean; // Whether node is expanded in tree view
}

/**
 * Playback state for auto-scroll timeline feature
 */
export interface PlaybackState {
  isPlaying: boolean;
  playbackPosition: number; // Current position in ms
  playbackSpeed: number; // 0.5, 1, 2x multiplier
}

/**
 * Individual animation property values (longhand form)
 */
export interface AnimationLonghand {
  name: string;
  duration: string;
  timingFunction: string;
  delay: string;
  iterationCount: string;
  direction: string;
  fillMode: string;
}

/**
 * Represents a CSS animation detected on an element
 */
export interface Animation {
  id: string;
  selector: string; // CSS selector for the element (e.g., ".hero h1")
  tagName: string; // "h1", "div", etc.

  // Animation properties
  name: string; // animation-name or transition-property
  duration: number; // in milliseconds
  delay: number; // in milliseconds
  timingFunction: string;
  iterationCount: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';

  // Type of animation
  // - 'animation': CSS @keyframes animation
  // - 'transition': CSS transition
  // - 'web-animation': Web Animations API (element.animate(), or library-created)
  // - 'scroll-driven': Scroll-linked animation (animation-timeline: scroll/view)
  // - 'gsap': GSAP animation
  type: 'animation' | 'transition' | 'web-animation' | 'scroll-driven' | 'gsap';

  // Scroll-driven animation data (only for scroll-driven type)
  scrollTimeline?: {
    source: 'scroll' | 'view'; // scroll() or view() timeline
    axis: 'block' | 'inline' | 'x' | 'y';
  };

  // Parsed keyframes (if available)
  keyframes: KeyframeStep[] | null;

  // Complete keyframes data with raw CSS
  keyframesData: KeyframesData | null;

  // Animation property as shorthand string
  animationShorthand: string; // e.g., "fadeIn 0.5s ease-in-out forwards"

  // Individual animation property values
  animationLonghand: AnimationLonghand | null;

  // Animated properties for GSAP/Web Animation/Framer Motion
  // e.g., { opacity: "0.5", x: "100", scale: "1.2" }
  properties?: Record<string, string>;

  // For timeline visualization
  startTime: number; // = delay
  endTime: number; // = delay + duration

  // Element position on page (for scroll-based filtering)
  position: {
    top: number; // Distance from document top
    bottom: number; // top + height
    height: number; // Element height
  };

  // Element context for HTML/Styles tabs (element + 2 parents + computed styles)
  elementContext: ElementContext | null;
}

/**
 * Store state for the panel UI
 */
export interface AnimationStore {
  // Source info
  sourceTabId: number | null;
  sourceUrl: string;

  // Animation data
  animations: Animation[];
  totalDuration: number; // max endTime across all animations

  // UI state
  loading: boolean;
  error: string | null;
  selectedAnimationId: string | null;
  hoveredAnimationId: string | null;

  // Scroll tracking state
  targetPageScroll: {
    scrollY: number;
    viewportHeight: number;
  } | null;
  visibilityFilterMode: 'all' | 'visible-only' | 'dim-hidden';

  // Scrubbing/playhead state
  scrubPosition: number; // 0-1, current position on timeline
  scrubAnimationId: string | null; // Which animation is being scrubbed
  currentKeyframeIndex: number | null; // Index of keyframe at current position

  // DOM tree state for HTML structure sidebar
  domTree: DOMTreeNode | null;
  expandedNodeIds: Set<string>;

  // Playback state for auto-scroll feature
  playbackState: PlaybackState;

  // Details panel visibility (collapsible panel beside timeline)
  detailsPanelOpen: boolean;
}
