import type { Animation, DOMTreeNode } from './types';

/**
 * Message types for extension communication
 */

// Playback control action types
export type PlaybackAction = 'play' | 'pause' | 'restart' | 'seek' | 'speed' | 'seekAnimation';

// Messages sent TO content script
export type ContentScriptMessage =
  | { type: 'PING' }
  | { type: 'SCAN_ANIMATIONS' }
  | { type: 'HIGHLIGHT_ELEMENT'; payload: { id: string } }
  | { type: 'CLEAR_HIGHLIGHT' }
  | { type: 'START_SCROLL_TRACKING' }
  | { type: 'STOP_SCROLL_TRACKING' }
  | { type: 'GET_DOM_TREE' }
  | { type: 'SCROLL_TO_POSITION'; payload: { scrollY: number } }
  | { type: 'SCROLL_TO_ELEMENT'; payload: { animationId: string } }
  | { type: 'TOGGLE_FLOATING_PANEL' }
  // Playback control
  | { type: 'PLAYBACK_CONTROL'; payload: { action: PlaybackAction; value?: any } }
  | { type: 'GET_PLAYBACK_STATE' }
  | { type: 'GET_GSAP_DATA' };

// Messages sent FROM content script
export type ContentScriptResponse =
  | { type: 'PONG' }
  | { type: 'ANIMATIONS_FOUND'; payload: Animation[] }
  | { type: 'SCAN_ERROR'; payload: { error: string } }
  | { type: 'SCROLL_UPDATE'; payload: { scrollY: number; viewportHeight: number } }
  | { type: 'DOM_TREE_RESULT'; payload: DOMTreeNode | null }
  // Playback state
  | { type: 'PLAYBACK_STATE_UPDATE'; payload: { isPlaying: boolean; currentTime: number; totalDuration: number } }
  | { type: 'PLAYBACK_STATE_RESULT'; payload: { isPlaying: boolean; currentTime: number; totalDuration: number } }
  | { type: 'GSAP_DATA_RESULT'; payload: any[] };

// Messages sent TO background service worker
export type BackgroundMessage =
  | { type: 'OPEN_PANEL'; payload: { tabId: number; url: string } }
  | { type: 'GET_SOURCE_TAB' }
  | { type: 'SCAN_TAB'; payload: { tabId: number } }
  | { type: 'HIGHLIGHT_IN_TAB'; payload: { tabId: number; animationId: string } }
  | { type: 'CLEAR_HIGHLIGHT_IN_TAB'; payload: { tabId: number } }
  | { type: 'START_SCROLL_TRACKING_IN_TAB'; payload: { tabId: number } }
  | { type: 'STOP_SCROLL_TRACKING_IN_TAB'; payload: { tabId: number } }
  | { type: 'FOCUS_TAB'; payload: { tabId: number } }
  | { type: 'GET_DOM_TREE_IN_TAB'; payload: { tabId: number } }
  | { type: 'SCROLL_TO_POSITION_IN_TAB'; payload: { tabId: number; scrollY: number } }
  | { type: 'SCROLL_TO_ELEMENT_IN_TAB'; payload: { tabId: number; animationId: string } }
  | { type: 'OPEN_TIMELINE_PANEL'; payload?: { sourceUrl?: string } }
  // Playback control via background
  | { type: 'PLAYBACK_CONTROL_IN_TAB'; payload: { tabId: number; action: PlaybackAction; value?: any } }
  | { type: 'GET_PLAYBACK_STATE_IN_TAB'; payload: { tabId: number } }
  | { type: 'GET_GSAP_DATA_IN_TAB'; payload: { tabId: number } };

// Messages sent FROM background service worker
export type BackgroundResponse =
  | { type: 'SOURCE_TAB_INFO'; payload: { tabId: number; url: string } }
  | { type: 'ANIMATIONS_RESULT'; payload: Animation[] }
  | { type: 'ERROR'; payload: { error: string } }
  | { type: 'DOM_TREE_RESULT'; payload: DOMTreeNode | null }
  | { type: 'PLAYBACK_STATE_RESULT'; payload: { isPlaying: boolean; currentTime: number; totalDuration: number } }
  | { type: 'GSAP_DATA_RESULT'; payload: any[] };
