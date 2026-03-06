import { useEffect } from 'react';
import { useAnimationStore } from '../store/animationStore';

export default function PreviewControls() {
  const {
    targetPageScroll,
    visibilityFilterMode,
    setVisibilityFilterMode,
    startScrollTracking,
    stopScrollTracking,
    focusTargetTab,
  } = useAnimationStore();

  // Auto start/stop scroll tracking
  useEffect(() => {
    startScrollTracking();
    return () => stopScrollTracking();
  }, [startScrollTracking, stopScrollTracking]);

  return (
    <div className="bg-weaver-panel border-b border-weaver-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={focusTargetTab}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Focus Target Tab
          </button>

          {targetPageScroll && (
            <span className="text-gray-400 text-sm">
              Scroll: {Math.round(targetPageScroll.scrollY)}px
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Visibility:</span>
          <select
            value={visibilityFilterMode}
            onChange={(e) =>
              setVisibilityFilterMode(
                e.target.value as 'all' | 'visible-only' | 'dim-hidden'
              )
            }
            className="bg-weaver-bg text-white border border-weaver-border rounded px-2 py-1 text-sm focus:outline-none focus:border-weaver-accent"
          >
            <option value="all">Show All</option>
            <option value="dim-hidden">Dim Hidden</option>
            <option value="visible-only">Visible Only</option>
          </select>
        </div>
      </div>
    </div>
  );
}
