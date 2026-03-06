import { useState, useRef, useEffect, useCallback } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import type { Animation } from '../../../shared/types';

interface ScrubPlayheadProps {
  animation: Animation;
}

export default function ScrubPlayhead({ animation }: ScrubPlayheadProps) {
  const { scrubPosition, scrubAnimationId, setScrubPosition, clearScrub } =
    useAnimationStore();
  const [isDragging, setIsDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const isActive = scrubAnimationId === animation.id;
  const position = isActive ? scrubPosition : 0;

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const newPosition = Math.max(0, Math.min(1, relativeX / rect.width));
      setScrubPosition(animation.id, newPosition);
    },
    [animation.id, setScrubPosition]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach global listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Clear scrub when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        barRef.current &&
        !barRef.current.contains(e.target as Node) &&
        isActive &&
        !isDragging
      ) {
        // Don't clear immediately - let user see the position
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActive, isDragging, clearScrub]);

  // Only show for animations with keyframes
  if (!animation.keyframes || animation.keyframes.length === 0) {
    return null;
  }

  return (
    <div
      ref={barRef}
      className="absolute inset-0 cursor-ew-resize z-10"
      onMouseDown={handleMouseDown}
      title="Drag to scrub through keyframes"
    >
      {/* Keyframe markers */}
      {animation.keyframes.map((kf, index) => (
        <div
          key={index}
          className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 transition-all pointer-events-none ${
            isActive && Math.abs(kf.offset - position) < 0.03
              ? 'bg-yellow-400 border-yellow-400 scale-125'
              : 'bg-transparent border-white/40 hover:border-white/60'
          }`}
          style={{ left: `${kf.offset * 100}%`, marginLeft: '-4px' }}
          title={`${Math.round(kf.offset * 100)}%`}
        />
      ))}

      {/* Playhead line - only visible when active */}
      {isActive && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 pointer-events-none"
          style={{ left: `${position * 100}%`, marginLeft: '-1px' }}
        >
          {/* Handle */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-lg" />

          {/* Percentage label */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
            {Math.round(position * 100)}%
          </div>
        </div>
      )}

      {/* Hover hint when not active */}
      {!isActive && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white/50 pointer-events-none whitespace-nowrap">
            Click & drag to scrub
          </div>
        </div>
      )}
    </div>
  );
}
