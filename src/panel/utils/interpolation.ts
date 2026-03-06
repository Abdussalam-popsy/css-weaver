import type { KeyframeStep } from '../../shared/types';

/**
 * Result of finding surrounding keyframes
 */
export interface SurroundingKeyframes {
  prevKeyframe: KeyframeStep | null;
  nextKeyframe: KeyframeStep | null;
  progress: number; // 0-1 progress between prev and next
}

/**
 * Find the surrounding keyframes for a given position
 */
export function findSurroundingKeyframes(
  keyframes: KeyframeStep[],
  position: number
): SurroundingKeyframes {
  if (keyframes.length === 0) {
    return { prevKeyframe: null, nextKeyframe: null, progress: 0 };
  }

  if (keyframes.length === 1) {
    return { prevKeyframe: keyframes[0], nextKeyframe: null, progress: 1 };
  }

  let prevKeyframe: KeyframeStep | null = null;
  let nextKeyframe: KeyframeStep | null = null;

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].offset <= position) {
      prevKeyframe = keyframes[i];
      nextKeyframe = keyframes[i + 1] || null;
    }
  }

  if (!prevKeyframe) {
    return { prevKeyframe: null, nextKeyframe: keyframes[0], progress: 0 };
  }

  if (!nextKeyframe) {
    return { prevKeyframe, nextKeyframe: null, progress: 1 };
  }

  const range = nextKeyframe.offset - prevKeyframe.offset;
  const progress = range > 0 ? (position - prevKeyframe.offset) / range : 0;

  return { prevKeyframe, nextKeyframe, progress };
}

/**
 * Interpolate CSS values between keyframes at a given position
 */
export function interpolateKeyframeValues(
  keyframes: KeyframeStep[],
  position: number
): Record<string, string> {
  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].properties;

  const { prevKeyframe, nextKeyframe, progress } = findSurroundingKeyframes(
    keyframes,
    position
  );

  if (!prevKeyframe) return keyframes[0].properties;
  if (!nextKeyframe) return prevKeyframe.properties;

  // Collect all properties from both keyframes
  const allProperties = new Set([
    ...Object.keys(prevKeyframe.properties),
    ...Object.keys(nextKeyframe.properties),
  ]);

  const interpolated: Record<string, string> = {};

  for (const prop of allProperties) {
    const startValue = prevKeyframe.properties[prop];
    const endValue = nextKeyframe.properties[prop];

    if (startValue && endValue) {
      interpolated[prop] = interpolateValue(startValue, endValue, progress);
    } else {
      // Use whichever value exists
      interpolated[prop] = startValue || endValue;
    }
  }

  return interpolated;
}

/**
 * Interpolate between two CSS values
 */
function interpolateValue(start: string, end: string, progress: number): string {
  // Handle numeric values (including with units)
  const numericPattern = /^(-?[\d.]+)(px|%|em|rem|deg|turn|vh|vw|s|ms)?$/;

  const startMatch = start.match(numericPattern);
  const endMatch = end.match(numericPattern);

  if (startMatch && endMatch && startMatch[2] === endMatch[2]) {
    const startNum = parseFloat(startMatch[1]);
    const endNum = parseFloat(endMatch[1]);
    const interpolatedNum = startNum + (endNum - startNum) * progress;
    const unit = startMatch[2] || '';
    return `${interpolatedNum.toFixed(2)}${unit}`;
  }

  // Handle colors (basic RGB/RGBA interpolation)
  if (
    (start.startsWith('rgb') || start.startsWith('#')) &&
    (end.startsWith('rgb') || end.startsWith('#'))
  ) {
    return interpolateColor(start, end, progress);
  }

  // Handle transform functions
  if (start.includes('(') && end.includes('(')) {
    return interpolateTransform(start, end, progress);
  }

  // For non-interpolatable values, snap at 50%
  return progress < 0.5 ? start : end;
}

/**
 * Interpolate between two colors
 */
function interpolateColor(start: string, end: string, progress: number): string {
  const startRgb = parseColor(start);
  const endRgb = parseColor(end);

  if (!startRgb || !endRgb) {
    return progress < 0.5 ? start : end;
  }

  const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * progress);
  const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * progress);
  const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * progress);
  const a =
    startRgb.a !== undefined && endRgb.a !== undefined
      ? startRgb.a + (endRgb.a - startRgb.a) * progress
      : undefined;

  if (a !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Parse a color string to RGB values
 */
function parseColor(
  color: string
): { r: number; g: number; b: number; a?: number } | null {
  // Handle rgb/rgba
  const rgbMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : undefined,
    };
  }

  // Handle hex colors
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  return null;
}

/**
 * Interpolate transform functions
 */
function interpolateTransform(
  start: string,
  end: string,
  progress: number
): string {
  // Extract transform function name and values
  const startMatch = start.match(/(\w+)\(([^)]+)\)/);
  const endMatch = end.match(/(\w+)\(([^)]+)\)/);

  if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
    return progress < 0.5 ? start : end;
  }

  const funcName = startMatch[1];
  const startValues = startMatch[2].split(/,\s*/);
  const endValues = endMatch[2].split(/,\s*/);

  if (startValues.length !== endValues.length) {
    return progress < 0.5 ? start : end;
  }

  const interpolatedValues = startValues.map((sv, i) => {
    return interpolateValue(sv.trim(), endValues[i].trim(), progress);
  });

  return `${funcName}(${interpolatedValues.join(', ')})`;
}

/**
 * Find the keyframe index at or before a given position
 */
export function findKeyframeIndexAtPosition(
  keyframes: KeyframeStep[],
  position: number
): number {
  if (keyframes.length === 0) return -1;

  let index = 0;
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].offset <= position) {
      index = i;
    }
  }
  return index;
}
