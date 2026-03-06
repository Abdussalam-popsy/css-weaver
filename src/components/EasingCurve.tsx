/**
 * EasingCurve Component
 *
 * Renders a cubic-bezier easing curve as an SVG visualization.
 * Used in the floating panel's detail view to show the shape of animation easing.
 *
 * NOTE: Uses inline styles only (required for Shadow DOM isolation)
 */

import { useMemo } from 'react';
import { parseCubicBezier, getEasingName, type CubicBezier } from '../utils/easingMap';
import { colors, radius } from '../constants/designTokens';

interface EasingCurveProps {
  /** The easing value (e.g., 'ease-in-out', 'cubic-bezier(0.16, 1, 0.3, 1)', 'power4.out') */
  easing: string;
  /** Width of the SVG in pixels */
  width?: number;
  /** Height of the SVG in pixels */
  height?: number;
  /** Whether to show the control point handles */
  showHandles?: boolean;
  /** Whether to show the linear reference line */
  showLinear?: boolean;
  /** Custom accent color for the curve (defaults to theme accent) */
  accentColor?: string;
}

/**
 * Calculate a point on a cubic bezier curve
 */
function bezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/**
 * Generate SVG path for the bezier curve
 */
function generateCurvePath(bezier: CubicBezier, width: number, height: number): string {
  const points: string[] = [];
  const steps = 50;

  // Start point
  points.push(`M 0 ${height}`);

  // Generate curve points
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = bezierPoint(t, 0, bezier.x1, bezier.x2, 1) * width;
    const y = height - bezierPoint(t, 0, bezier.y1, bezier.y2, 1) * height;
    points.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return points.join(' ');
}

export default function EasingCurve({
  easing,
  width = 100,
  height = 100,
  showHandles = true,
  showLinear = true,
  accentColor,
}: EasingCurveProps) {
  const bezier = useMemo(() => parseCubicBezier(easing), [easing]);
  const easingName = useMemo(() => getEasingName(easing), [easing]);

  // Use provided accent color or default to theme accent
  const curveColor = accentColor || colors.accent.primary;
  const handleColor = accentColor
    ? `${accentColor}66` // 40% opacity
    : colors.accent.muted;

  // Padding for the curve area
  const padding = 8;
  const curveWidth = width - padding * 2;
  const curveHeight = height - padding * 2;

  // If the easing can't be rendered as a bezier curve
  if (!bezier) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg.tertiary,
          borderRadius: radius.lg,
          border: `1px solid ${colors.border.default}`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '10px',
              color: colors.text.tertiary,
              marginBottom: '4px',
            }}
          >
            Non-bezier
          </div>
          <div
            style={{
              fontSize: '10px',
              color: colors.text.secondary,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            }}
          >
            {easing.length > 16 ? easing.slice(0, 14) + '...' : easing}
          </div>
        </div>
      </div>
    );
  }

  const curvePath = generateCurvePath(bezier, curveWidth, curveHeight);

  // Control point positions
  const p1 = {
    x: padding + bezier.x1 * curveWidth,
    y: padding + curveHeight - bezier.y1 * curveHeight,
  };
  const p2 = {
    x: padding + bezier.x2 * curveWidth,
    y: padding + curveHeight - bezier.y2 * curveHeight,
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          display: 'block',
          background: colors.bg.tertiary,
          borderRadius: radius.lg,
          border: `1px solid ${colors.border.default}`,
        }}
      >
        {/* Grid lines */}
        <g stroke={colors.border.subtle} strokeWidth="1">
          {/* Vertical center */}
          <line x1={width / 2} y1={padding} x2={width / 2} y2={height - padding} />
          {/* Horizontal center */}
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} />
        </g>

        {/* Linear reference line */}
        {showLinear && (
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={padding}
            stroke={colors.border.default}
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}

        {/* Control point handles */}
        {showHandles && (
          <g stroke={handleColor} strokeWidth="1">
            {/* P0 to P1 handle */}
            <line x1={padding} y1={height - padding} x2={p1.x} y2={p1.y} />
            {/* P2 to P3 handle */}
            <line x1={p2.x} y1={p2.y} x2={width - padding} y2={padding} />
          </g>
        )}

        {/* Main curve */}
        <g transform={`translate(${padding}, ${padding})`}>
          <path
            d={curvePath}
            fill="none"
            stroke={curveColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Control points */}
        {showHandles && (
          <g fill={curveColor}>
            <circle cx={p1.x} cy={p1.y} r="3" />
            <circle cx={p2.x} cy={p2.y} r="3" />
          </g>
        )}

        {/* Start and end points */}
        <g fill={colors.text.secondary}>
          <circle cx={padding} cy={height - padding} r="2" />
          <circle cx={width - padding} cy={padding} r="2" />
        </g>
      </svg>

      {/* Easing name label (if known) */}
      {easingName && (
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            fontSize: '8px',
            color: colors.text.tertiary,
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '1px 4px',
            borderRadius: radius.sm,
          }}
        >
          {easingName}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of the easing curve for inline display
 */
export function EasingCurveCompact({
  easing,
  size = 32,
  accentColor,
}: {
  easing: string;
  size?: number;
  accentColor?: string;
}) {
  const bezier = useMemo(() => parseCubicBezier(easing), [easing]);
  const curveColor = accentColor || colors.accent.primary;

  if (!bezier) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg.tertiary,
          borderRadius: radius.sm,
          fontSize: '8px',
          color: colors.text.disabled,
        }}
      >
        ?
      </div>
    );
  }

  const padding = 2;
  const curveSize = size - padding * 2;
  const curvePath = generateCurvePath(bezier, curveSize, curveSize);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        display: 'block',
        background: colors.bg.tertiary,
        borderRadius: radius.sm,
      }}
    >
      <g transform={`translate(${padding}, ${padding})`}>
        <path
          d={curvePath}
          fill="none"
          stroke={curveColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
