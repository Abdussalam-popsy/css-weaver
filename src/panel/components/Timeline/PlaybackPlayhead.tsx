interface PlaybackPlayheadProps {
  position: number;      // Current playback position in ms
  totalDuration: number; // Total timeline duration in ms
  timelineWidth: number; // Width of the timeline in pixels
}

/**
 * Vertical playhead line that shows the current playback position
 * Rendered as a green/accent line that moves with playback
 */
export default function PlaybackPlayhead({
  position,
  totalDuration,
  timelineWidth,
}: PlaybackPlayheadProps) {
  if (totalDuration <= 0) return null;

  // Calculate position as percentage of timeline
  const leftPosition = (position / totalDuration) * timelineWidth;
  // Add offset for the left padding in timeline (px-4 = 16px)
  const leftWithOffset = leftPosition + 16;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-weaver-accent z-20 pointer-events-none"
      style={{
        left: `${leftWithOffset}px`,
        transition: 'left 50ms linear',
      }}
    >
      {/* Playhead handle at top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-weaver-accent rounded-full" />
    </div>
  );
}
