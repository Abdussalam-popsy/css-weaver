interface TimelineRulerProps {
  totalDuration: number;
  width: number;
}

export default function TimelineRuler({ totalDuration, width }: TimelineRulerProps) {
  // Generate tick marks
  const ticks = generateTicks(totalDuration);
  const scale = width / Math.max(totalDuration, 1);

  return (
    <div
      className="h-6 bg-weaver-panel border-b border-weaver-border relative"
      style={{ marginLeft: '120px' }} // Match the offset of bars
    >
      {ticks.map((tick) => (
        <div
          key={tick.time}
          className="absolute top-0 h-full flex flex-col justify-end"
          style={{ left: `${tick.time * scale}px` }}
        >
          {/* Tick mark */}
          <div
            className={`w-px ${tick.major ? 'h-3 bg-gray-500' : 'h-2 bg-gray-600'}`}
          />
          {/* Label (only for major ticks) */}
          {tick.major && (
            <span
              className="absolute bottom-0 text-[10px] text-gray-500 transform -translate-x-1/2"
              style={{ left: 0 }}
            >
              {formatTickLabel(tick.time)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

interface Tick {
  time: number;
  major: boolean;
}

function generateTicks(totalDuration: number): Tick[] {
  const ticks: Tick[] = [];

  // Determine appropriate interval based on total duration
  let majorInterval: number;
  let minorInterval: number;

  if (totalDuration <= 500) {
    majorInterval = 100;
    minorInterval = 50;
  } else if (totalDuration <= 1000) {
    majorInterval = 200;
    minorInterval = 100;
  } else if (totalDuration <= 2000) {
    majorInterval = 500;
    minorInterval = 100;
  } else if (totalDuration <= 5000) {
    majorInterval = 1000;
    minorInterval = 200;
  } else {
    majorInterval = 2000;
    minorInterval = 500;
  }

  // Generate ticks up to and slightly beyond total duration
  const maxTime = Math.ceil(totalDuration / majorInterval) * majorInterval + majorInterval;

  for (let time = 0; time <= maxTime; time += minorInterval) {
    ticks.push({
      time,
      major: time % majorInterval === 0,
    });
  }

  return ticks;
}

function formatTickLabel(ms: number): string {
  if (ms === 0) return '0';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds === Math.floor(seconds)) {
    return `${seconds}s`;
  }
  return `${seconds.toFixed(1)}s`;
}
