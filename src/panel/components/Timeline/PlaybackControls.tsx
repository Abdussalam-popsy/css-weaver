import { useAnimationStore } from '../../store/animationStore';

/**
 * Play icon SVG
 */
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * Pause icon SVG
 */
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

/**
 * Stop icon SVG
 */
function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  );
}

/**
 * Skip to start icon
 */
function SkipStartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="3" height="12" />
      <path d="M18 6v12l-9-6z" />
    </svg>
  );
}

/**
 * Step forward icon
 */
function StepForwardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6v12l8-6z" />
      <rect x="15" y="6" width="3" height="12" />
    </svg>
  );
}

const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Playback controls for the timeline
 * Includes play/pause, stop, speed selector, and time display
 */
export default function PlaybackControls() {
  const {
    playbackState,
    totalDuration,
    startPlayback,
    pausePlayback,
    stopPlayback,
    setPlaybackSpeed,
    setPlaybackPosition,
  } = useAnimationStore();

  const handlePlayPause = () => {
    if (playbackState.isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const handleStop = () => {
    stopPlayback();
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlaybackSpeed(parseFloat(e.target.value));
  };

  const handleSkipToStart = () => {
    setPlaybackPosition(0);
  };

  const handleStepForward = () => {
    // Step forward by 100ms
    const newPosition = Math.min(playbackState.playbackPosition + 100, totalDuration);
    setPlaybackPosition(newPosition);
  };

  const progress = totalDuration > 0 ? (playbackState.playbackPosition / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Transport controls */}
      <div className="flex items-center gap-1">
        {/* Skip to start */}
        <button
          onClick={handleSkipToStart}
          className="w-7 h-7 rounded flex items-center justify-center bg-weaver-panel hover:bg-weaver-border text-gray-400 hover:text-white transition-colors"
          title="Skip to start"
        >
          <SkipStartIcon />
        </button>

        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            playbackState.isPlaying
              ? 'bg-weaver-accent text-white shadow-lg shadow-weaver-accent/30'
              : 'bg-weaver-accent/80 hover:bg-weaver-accent text-white'
          }`}
          title={playbackState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {playbackState.isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Stop button */}
        <button
          onClick={handleStop}
          className="w-7 h-7 rounded flex items-center justify-center bg-weaver-panel hover:bg-weaver-border text-gray-400 hover:text-white transition-colors"
          title="Stop and reset"
        >
          <StopIcon />
        </button>

        {/* Step forward */}
        <button
          onClick={handleStepForward}
          className="w-7 h-7 rounded flex items-center justify-center bg-weaver-panel hover:bg-weaver-border text-gray-400 hover:text-white transition-colors"
          title="Step forward 100ms"
        >
          <StepForwardIcon />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-weaver-border" />

      {/* Time display */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-weaver-accent min-w-[50px]">
          {formatTime(playbackState.playbackPosition)}
        </span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400 min-w-[50px]">
          {formatTime(totalDuration)}
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="w-24 h-1.5 bg-weaver-panel rounded-full overflow-hidden">
        <div
          className="h-full bg-weaver-accent transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Speed selector */}
      <select
        value={playbackState.playbackSpeed}
        onChange={handleSpeedChange}
        className="bg-weaver-panel border border-weaver-border rounded px-2 py-1 text-xs text-gray-300 hover:border-gray-500 focus:outline-none focus:border-weaver-accent cursor-pointer"
        title="Playback speed"
      >
        {SPEED_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Live indicator when playing */}
      {playbackState.isPlaying && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-weaver-accent animate-pulse" />
          <span className="text-xs text-weaver-accent">LIVE</span>
        </div>
      )}
    </div>
  );
}
