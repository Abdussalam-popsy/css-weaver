import { useAnimationStore } from '../../store/animationStore';
import type { Animation } from '../../../shared/types';
import ScrubPlayhead from './ScrubPlayhead';

interface TimelineBarProps {
  animation: Animation;
  totalDuration: number;
  timelineWidth: number;
  isCurrentlyVisible?: boolean;
  shouldDimHidden?: boolean;
}

export default function TimelineBar({
  animation,
  totalDuration,
  timelineWidth,
  isCurrentlyVisible = true,
  shouldDimHidden = false,
}: TimelineBarProps) {
  const {
    selectedAnimationId,
    hoveredAnimationId,
    setSelectedAnimation,
    setHoveredAnimation,
    highlightElement,
    clearHighlight,
    selectAnimationWithSync,
  } = useAnimationStore();

  const isSelected = selectedAnimationId === animation.id;
  const isHovered = hoveredAnimationId === animation.id;

  // Calculate bar position and width based on timeline scale
  const scale = timelineWidth / Math.max(totalDuration, 1);
  const left = animation.startTime * scale;
  const width = Math.max((animation.endTime - animation.startTime) * scale, 40); // Minimum 40px width

  const handleMouseEnter = () => {
    setHoveredAnimation(animation.id);
    highlightElement(animation.id);
  };

  const handleMouseLeave = () => {
    setHoveredAnimation(null);
    clearHighlight();
  };

  const handleClick = () => {
    if (isSelected) {
      setSelectedAnimation(null);
    } else {
      // Use sync action to expand tree, scroll to element, and open details
      selectAnimationWithSync(animation.id);
    }
  };

  // Generate a display label
  const label = animation.selector.length > 30
    ? animation.selector.slice(0, 27) + '...'
    : animation.selector;

  // Calculate opacity for dimming
  const opacity = shouldDimHidden && !isCurrentlyVisible ? 0.3 : 1;

  return (
    <div className="relative h-8 mb-1" style={{ opacity, transition: 'opacity 0.2s ease-out' }}>
      <div
        className={`
          absolute h-6 rounded-full cursor-pointer
          flex items-center px-3 text-xs font-medium
          transition-all duration-150 ease-out
          ${isSelected
            ? 'bg-weaver-accent ring-2 ring-weaver-accent ring-offset-2 ring-offset-weaver-bg'
            : isHovered
              ? 'bg-weaver-accent'
              : 'bg-weaver-accent/80 hover:bg-weaver-accent'
          }
        `}
        style={{
          left: `${left}px`,
          width: `${width}px`,
          marginLeft: '120px', // Space for labels on the left
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        title={`${animation.name}\n${animation.duration}ms duration, ${animation.delay}ms delay`}
      >
        <span className="truncate text-white pointer-events-none">
          {animation.tagName.toLowerCase()}
          {animation.selector.includes('.') && (
            <span className="opacity-75">
              .{animation.selector.split('.').pop()?.split(/[\s:[\]>+~]/)[0]}
            </span>
          )}
        </span>

        {/* Scrub playhead overlay for animations with keyframes */}
        {animation.type === 'animation' && <ScrubPlayhead animation={animation} />}
      </div>

      {/* Label on the left side */}
      <div
        className="absolute left-0 h-6 w-28 flex items-center text-xs text-gray-400 truncate"
        title={animation.selector}
      >
        {label}
      </div>
    </div>
  );
}
