interface ScrollPlayheadProps {
  scrollPercentage: number;
  timelineWidth: number;
}

export default function ScrollPlayhead({ scrollPercentage, timelineWidth }: ScrollPlayheadProps) {
  const position = (scrollPercentage / 100) * timelineWidth;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
      style={{ left: `${position + 120}px` }} // 120px offset for labels
    >
      {/* Top handle */}
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-lg" />

      {/* Percentage label */}
      <div className="absolute -top-8 -left-10 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
        Page: {scrollPercentage}%
      </div>

      {/* Bottom handle */}
      <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-lg" />
    </div>
  );
}
