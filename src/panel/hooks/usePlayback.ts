import { useEffect, useRef } from 'react';
import { useAnimationStore } from '../store/animationStore';

/**
 * Hook to manage timeline playback with animation frame loop.
 * Handles:
 * - Animation frame loop for smooth playback
 * - Updates playback position based on elapsed time and speed
 * - Triggers scroll commands to sync target page
 * - Stops at end of timeline
 */
export function usePlayback() {
  const {
    playbackState,
    totalDuration,
    setPlaybackPosition,
    stopPlayback,
    scrollToAnimationPosition,
  } = useAnimationStore();

  const lastTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScrollPositionRef = useRef<number>(0);

  useEffect(() => {
    if (!playbackState.isPlaying) {
      lastTimeRef.current = null;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Calculate new position based on speed
      const deltaMs = deltaTime * playbackState.playbackSpeed;
      const newPosition = playbackState.playbackPosition + deltaMs;

      // Check if we've reached the end
      if (newPosition >= totalDuration) {
        setPlaybackPosition(totalDuration);
        stopPlayback();
        return;
      }

      setPlaybackPosition(newPosition);

      // Trigger scroll sync every 500ms of playback time to avoid too frequent updates
      const scrollThreshold = 500;
      if (newPosition - lastScrollPositionRef.current >= scrollThreshold) {
        scrollToAnimationPosition(newPosition);
        lastScrollPositionRef.current = newPosition;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    playbackState.isPlaying,
    playbackState.playbackSpeed,
    playbackState.playbackPosition,
    totalDuration,
    setPlaybackPosition,
    stopPlayback,
    scrollToAnimationPosition,
  ]);

  // Reset scroll position when playback stops
  useEffect(() => {
    if (!playbackState.isPlaying && playbackState.playbackPosition === 0) {
      lastScrollPositionRef.current = 0;
    }
  }, [playbackState.isPlaying, playbackState.playbackPosition]);

  return {
    isPlaying: playbackState.isPlaying,
    position: playbackState.playbackPosition,
    speed: playbackState.playbackSpeed,
    progress: totalDuration > 0 ? (playbackState.playbackPosition / totalDuration) * 100 : 0,
  };
}
