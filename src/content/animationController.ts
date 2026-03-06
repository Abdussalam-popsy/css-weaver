/**
 * Animation Controller
 *
 * Controls CSS animations on the page - pause, play, seek, scrub.
 * Uses the Web Animations API to control CSS animations.
 */

/**
 * Helper to convert CSSNumberish to number
 */
function toNumber(value: CSSNumberish | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // CSSNumericValue - try to get the value
  return Number(value) || 0;
}

// Store original animation states for reset
const originalStates = new Map<string, {
  playState: string;
  currentTime: number;
}>();

// Track controlled animations
const controlledAnimations = new Map<string, globalThis.Animation[]>();

/**
 * Get all Web Animations for an element by weaver ID
 */
function getAnimationsForElement(weaverId: string): globalThis.Animation[] {
  const element = document.querySelector(`[data-css-weaver-id*="${weaverId}"]`);
  if (!element) return [];

  return element.getAnimations();
}

/**
 * Initialize control over all animations on the page
 */
export function initializeAnimationControl(): void {
  console.log('🎮 CSS Weaver: Initializing animation control...');

  // Find all elements with weaver IDs
  const elements = document.querySelectorAll('[data-css-weaver-id]');

  elements.forEach((element) => {
    const weaverIds = element.getAttribute('data-css-weaver-id')?.split(',') || [];
    const animations = (element as HTMLElement).getAnimations();

    weaverIds.forEach((id) => {
      // Store original state
      animations.forEach((anim) => {
        if (!originalStates.has(id)) {
          originalStates.set(id, {
            playState: anim.playState,
            currentTime: toNumber(anim.currentTime),
          });
        }
      });

      controlledAnimations.set(id, animations);
    });
  });

  console.log(`🎮 CSS Weaver: Controlling ${controlledAnimations.size} animation groups`);
}

/**
 * Pause all animations on the page
 */
export function pauseAllAnimations(): void {
  const allAnimations = document.getAnimations();
  allAnimations.forEach((anim) => {
    try {
      anim.pause();
    } catch (e) {
      // Some animations may not be pausable
    }
  });

  // Also pause GSAP if available
  const gsap = (window as any).gsap;
  if (gsap?.globalTimeline) {
    gsap.globalTimeline.pause();
  }
}

/**
 * Play all animations on the page
 */
export function playAllAnimations(): void {
  const allAnimations = document.getAnimations();
  allAnimations.forEach((anim) => {
    try {
      anim.play();
    } catch (e) {
      // Some animations may not be playable
    }
  });

  // Also play GSAP if available
  const gsap = (window as any).gsap;
  if (gsap?.globalTimeline) {
    gsap.globalTimeline.play();
  }
}

/**
 * Seek all animations to a specific time (in milliseconds)
 */
export function seekAllAnimations(timeMs: number): void {
  const allAnimations = document.getAnimations();

  allAnimations.forEach((anim) => {
    try {
      const effect = anim.effect as KeyframeEffect;
      if (!effect) return;

      const timing = effect.getTiming();
      const duration = typeof timing.duration === 'number' ? timing.duration : 0;
      const delay = timing.delay || 0;

      // Calculate the time relative to this animation
      const animStartTime = delay;
      const animEndTime = delay + duration;

      if (timeMs < animStartTime) {
        // Before animation starts - set to start
        anim.currentTime = 0;
      } else if (timeMs > animEndTime) {
        // After animation ends - set to end
        anim.currentTime = duration;
      } else {
        // During animation
        anim.currentTime = timeMs - delay;
      }
    } catch (e) {
      // Some animations may not be seekable
    }
  });

  // Also seek GSAP if available
  const gsap = (window as any).gsap;
  if (gsap?.globalTimeline) {
    gsap.globalTimeline.seek(timeMs / 1000); // GSAP uses seconds
  }
}

/**
 * Seek a specific animation to a position (0-1)
 */
export function seekAnimation(weaverId: string, progress: number): void {
  const animations = controlledAnimations.get(weaverId) || getAnimationsForElement(weaverId);

  animations.forEach((anim) => {
    try {
      const effect = anim.effect as KeyframeEffect;
      if (!effect) return;

      const timing = effect.getTiming();
      const duration = typeof timing.duration === 'number' ? timing.duration : 0;

      anim.currentTime = duration * Math.max(0, Math.min(1, progress));
    } catch (e) {
      // Animation may not be seekable
    }
  });
}

/**
 * Pause a specific animation
 */
export function pauseAnimation(weaverId: string): void {
  const animations = controlledAnimations.get(weaverId) || getAnimationsForElement(weaverId);
  animations.forEach((anim) => {
    try {
      anim.pause();
    } catch (e) {}
  });
}

/**
 * Play a specific animation
 */
export function playAnimation(weaverId: string): void {
  const animations = controlledAnimations.get(weaverId) || getAnimationsForElement(weaverId);
  animations.forEach((anim) => {
    try {
      anim.play();
    } catch (e) {}
  });
}

/**
 * Reset all animations to their original state
 */
export function resetAllAnimations(): void {
  const allAnimations = document.getAnimations();

  allAnimations.forEach((anim) => {
    try {
      anim.currentTime = 0;
      anim.play();
    } catch (e) {}
  });

  // Also reset GSAP if available
  const gsap = (window as any).gsap;
  if (gsap?.globalTimeline) {
    gsap.globalTimeline.seek(0);
    gsap.globalTimeline.play();
  }
}

/**
 * Get the current playback state
 */
export function getPlaybackState(): {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
} {
  const allAnimations = document.getAnimations();

  let maxDuration = 0;
  let currentTime = 0;
  let anyPlaying = false;

  allAnimations.forEach((anim) => {
    try {
      const effect = anim.effect as KeyframeEffect;
      if (!effect) return;

      const timing = effect.getTiming();
      const duration = typeof timing.duration === 'number' ? timing.duration : 0;
      const delay = timing.delay || 0;

      maxDuration = Math.max(maxDuration, delay + duration);

      const animCurrentTime = toNumber(anim.currentTime);
      if (animCurrentTime > 0) {
        currentTime = Math.max(currentTime, delay + animCurrentTime);
      }

      if (anim.playState === 'running') {
        anyPlaying = true;
      }
    } catch (e) {}
  });

  return {
    isPlaying: anyPlaying,
    currentTime,
    totalDuration: maxDuration,
  };
}

/**
 * Set playback speed for all animations
 */
export function setPlaybackSpeed(speed: number): void {
  const allAnimations = document.getAnimations();

  allAnimations.forEach((anim) => {
    try {
      anim.playbackRate = speed;
    } catch (e) {}
  });

  // Also set GSAP speed if available
  const gsap = (window as any).gsap;
  if (gsap?.globalTimeline) {
    gsap.globalTimeline.timeScale(speed);
  }
}

/**
 * Restart all animations from the beginning
 */
export function restartAllAnimations(): void {
  pauseAllAnimations();
  seekAllAnimations(0);

  // Small delay to ensure state is set before playing
  setTimeout(() => {
    playAllAnimations();
  }, 50);
}

/**
 * Get animation progress for a specific element
 */
export function getAnimationProgress(weaverId: string): number {
  const animations = controlledAnimations.get(weaverId) || getAnimationsForElement(weaverId);

  if (animations.length === 0) return 0;

  const anim = animations[0];
  try {
    const effect = anim.effect as KeyframeEffect;
    if (!effect) return 0;

    const timing = effect.getTiming();
    const duration = typeof timing.duration === 'number' ? timing.duration : 1;

    return toNumber(anim.currentTime) / duration;
  } catch (e) {
    return 0;
  }
}

/**
 * Cleanup - restore all animations to original state
 */
export function cleanup(): void {
  resetAllAnimations();
  originalStates.clear();
  controlledAnimations.clear();
}
