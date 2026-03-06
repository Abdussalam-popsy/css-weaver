import { useState } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import TimelineBar from './TimelineBar';
import TimelineRuler from './TimelineRuler';
import TimelineControls from './TimelineControls';
import ScrollPlayhead from './ScrollPlayhead';
import PlaybackControls from './PlaybackControls';
import PlaybackPlayhead from './PlaybackPlayhead';

export default function Timeline() {
  const { animations, totalDuration, targetPageScroll, visibilityFilterMode, playbackState, detailsPanelOpen, toggleDetailsPanel } = useAnimationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'animation' | 'transition' | 'web-animation' | 'scroll-driven' | 'gsap' | 'framer-motion'>('all');

  // Apply filters
  const filteredAnimations = animations.filter((anim) => {
    // Type filter
    if (typeFilter !== 'all' && anim.type !== typeFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !anim.name.toLowerCase().includes(query) &&
        !anim.selector.toLowerCase().includes(query) &&
        !anim.tagName.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Visibility filter
    if (visibilityFilterMode === 'visible-only' && targetPageScroll) {
      const { scrollY, viewportHeight } = targetPageScroll;
      const isVisible = (
        anim.position.bottom >= scrollY &&
        anim.position.top <= scrollY + viewportHeight
      );
      if (!isVisible) return false;
    }

    return true;
  });

  // Calculate visibility for dimming
  const animationsWithVisibility = filteredAnimations.map((anim) => {
    if (!targetPageScroll) {
      return { ...anim, isCurrentlyVisible: true };
    }

    const { scrollY, viewportHeight } = targetPageScroll;
    const isVisible = (
      anim.position.bottom >= scrollY &&
      anim.position.top <= scrollY + viewportHeight
    );

    return { ...anim, isCurrentlyVisible: isVisible };
  });

  if (animations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No CSS animations detected</p>
          <p className="text-sm text-gray-600">
            Try visiting a page with CSS animations and click Rescan
          </p>
        </div>
      </div>
    );
  }

  // Calculate scale: pixels per millisecond
  // Leave some padding on the right
  const timelineWidth = Math.max(totalDuration * 0.5, 800); // At least 800px wide

  // Calculate scroll percentage for playhead
  const scrollPercentage = targetPageScroll
    ? Math.round((targetPageScroll.scrollY / Math.max(1, targetPageScroll.scrollY + targetPageScroll.viewportHeight)) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col bg-weaver-bg">
      {/* Timeline header with playback controls */}
      <div className="px-4 py-2 bg-weaver-panel border-b border-weaver-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <PlaybackControls />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Animation Timeline
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Total duration: {formatTime(totalDuration)}
          </span>
          {/* Toggle details panel button */}
          <button
            onClick={toggleDetailsPanel}
            className={`p-1.5 rounded transition-colors ${
              detailsPanelOpen
                ? 'bg-weaver-accent/20 text-weaver-accent'
                : 'text-gray-400 hover:text-white hover:bg-weaver-panel'
            }`}
            title={detailsPanelOpen ? 'Hide details panel' : 'Show details panel'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search and filter controls */}
      <TimelineControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        totalCount={animations.length}
        filteredCount={filteredAnimations.length}
      />

      {/* Scrollable timeline area */}
      <div className="flex-1 overflow-auto">
        {animationsWithVisibility.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No animations match your filters</p>
              <p className="text-sm text-gray-600">
                Try adjusting your search or filter settings
              </p>
            </div>
          </div>
        ) : (
          <div style={{ minWidth: timelineWidth + 200 }} className="relative">
            {/* Time ruler */}
            <TimelineRuler totalDuration={totalDuration} width={timelineWidth} />

            {/* Scroll position playhead */}
            {targetPageScroll && (
              <ScrollPlayhead
                scrollPercentage={scrollPercentage}
                timelineWidth={timelineWidth}
              />
            )}

            {/* Playback position playhead */}
            {(playbackState.isPlaying || playbackState.playbackPosition > 0) && (
              <PlaybackPlayhead
                position={playbackState.playbackPosition}
                totalDuration={totalDuration}
                timelineWidth={timelineWidth}
              />
            )}

            {/* Animation bars */}
            <div className="px-4 py-2">
              {animationsWithVisibility.map((animation) => (
                <TimelineBar
                  key={animation.id}
                  animation={animation}
                  totalDuration={totalDuration}
                  timelineWidth={timelineWidth}
                  isCurrentlyVisible={animation.isCurrentlyVisible}
                  shouldDimHidden={visibilityFilterMode === 'dim-hidden'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
