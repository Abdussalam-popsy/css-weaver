import { create } from 'zustand';
import type { Animation, AnimationStore, DOMTreeNode } from '../../shared/types';
import { findKeyframeIndexAtPosition } from '../utils/interpolation';

// Helper function to find a node by ID in the tree
function findNodeById(node: DOMTreeNode | null, nodeId: string): DOMTreeNode | null {
  if (!node) return null;
  if (node.id === nodeId) return node;
  for (const child of node.children) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }
  return null;
}

// Helper function to find the path of node IDs from root to the node containing an animation
function findNodePathByAnimationId(node: DOMTreeNode | null, animationId: string, path: string[] = []): string[] | null {
  if (!node) return null;

  const currentPath = [...path, node.id];

  // Check if this node contains the animation
  if (node.animationIds.includes(animationId)) {
    return currentPath;
  }

  // Search children
  for (const child of node.children) {
    const result = findNodePathByAnimationId(child, animationId, currentPath);
    if (result) return result;
  }

  return null;
}

interface AnimationStoreActions {
  // Setters
  setSourceTab: (tabId: number, url: string) => void;
  setAnimations: (animations: Animation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedAnimation: (id: string | null) => void;
  setHoveredAnimation: (id: string | null) => void;

  // Actions
  initializeFromSourceTab: () => Promise<void>;
  scanAnimations: () => Promise<void>;
  highlightElement: (animationId: string) => void;
  clearHighlight: () => void;

  // Scroll tracking actions
  updateScrollPosition: (scrollData: { scrollY: number; viewportHeight: number }) => void;
  setVisibilityFilterMode: (mode: 'all' | 'visible-only' | 'dim-hidden') => void;
  startScrollTracking: () => void;
  stopScrollTracking: () => void;
  focusTargetTab: () => void;

  // Scrubbing actions
  setScrubPosition: (animationId: string, position: number) => void;
  clearScrub: () => void;

  // DOM tree actions
  setDOMTree: (tree: DOMTreeNode | null) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  selectNodeAnimations: (nodeId: string) => void;
  fetchDOMTree: () => Promise<void>;

  // Selection sync actions
  selectAnimationWithSync: (animationId: string) => void;

  // Playback actions
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  setPlaybackPosition: (position: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  scrollToAnimationPosition: (position: number) => void;

  // Details panel actions
  toggleDetailsPanel: () => void;
  openDetailsPanel: () => void;
}

type Store = AnimationStore & AnimationStoreActions;

export const useAnimationStore = create<Store>((set, get) => ({
  // Initial state
  sourceTabId: null,
  sourceUrl: '',
  animations: [],
  totalDuration: 0,
  loading: true,
  error: null,
  selectedAnimationId: null,
  hoveredAnimationId: null,
  targetPageScroll: null,
  visibilityFilterMode: 'dim-hidden',

  // Scrubbing state
  scrubPosition: 0,
  scrubAnimationId: null,
  currentKeyframeIndex: null,

  // DOM tree state
  domTree: null,
  expandedNodeIds: new Set<string>(),

  // Playback state
  playbackState: {
    isPlaying: false,
    playbackPosition: 0,
    playbackSpeed: 1,
  },

  // Details panel state
  detailsPanelOpen: true,

  // Setters
  setSourceTab: (tabId, url) => set({ sourceTabId: tabId, sourceUrl: url }),

  setAnimations: (animations) => {
    const totalDuration = animations.reduce(
      (max, anim) => Math.max(max, anim.endTime),
      0
    );
    set({ animations, totalDuration, loading: false });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSelectedAnimation: (id) => set({ selectedAnimationId: id }),
  setHoveredAnimation: (id) => set({ hoveredAnimationId: id }),

  // Actions
  initializeFromSourceTab: async () => {
    try {
      // Get source tab info from URL params (set by background script)
      const params = new URLSearchParams(window.location.search);
      const tabId = params.get('tabId');
      const url = params.get('url');

      if (!tabId || !url) {
        set({ error: 'No source tab specified', loading: false });
        return;
      }

      set({
        sourceTabId: parseInt(tabId, 10),
        sourceUrl: decodeURIComponent(url),
      });

      // Give content script time to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger animation scan
      await get().scanAnimations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize';
      console.error('CSS Weaver initialization error:', err);
      set({ error: errorMsg, loading: false });
    }
  },

  scanAnimations: async () => {
    const { sourceTabId } = get();
    if (!sourceTabId) return;

    set({ loading: true, error: null });

    try {
      // Send message to background to scan the tab
      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_TAB',
        payload: { tabId: sourceTabId },
      });

      if (response.type === 'ANIMATIONS_RESULT') {
        get().setAnimations(response.payload);
      } else if (response.type === 'ERROR') {
        set({ error: response.payload.error, loading: false });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to scan animations';
      console.error('CSS Weaver scan error:', err);
      set({ error: errorMsg, loading: false });
    }
  },

  highlightElement: (animationId) => {
    const { sourceTabId } = get();
    if (!sourceTabId) return;

    chrome.runtime.sendMessage({
      type: 'HIGHLIGHT_IN_TAB',
      payload: { tabId: sourceTabId, animationId },
    });
  },

  clearHighlight: () => {
    const { sourceTabId } = get();
    if (!sourceTabId) return;

    chrome.runtime.sendMessage({
      type: 'CLEAR_HIGHLIGHT_IN_TAB',
      payload: { tabId: sourceTabId },
    });
  },

  // Scroll tracking actions
  updateScrollPosition: (scrollData) => {
    set({ targetPageScroll: scrollData });
  },

  setVisibilityFilterMode: (mode) => {
    set({ visibilityFilterMode: mode });
  },

  startScrollTracking: () => {
    const { sourceTabId } = get();
    if (!sourceTabId) return;

    chrome.runtime.sendMessage({
      type: 'START_SCROLL_TRACKING_IN_TAB',
      payload: { tabId: sourceTabId },
    });
  },

  stopScrollTracking: () => {
    const { sourceTabId } = get();
    if (!sourceTabId) return;

    chrome.runtime.sendMessage({
      type: 'STOP_SCROLL_TRACKING_IN_TAB',
      payload: { tabId: sourceTabId },
    });
  },

  focusTargetTab: () => {
    const { sourceTabId } = get();
    if (!sourceTabId) return;

    chrome.runtime.sendMessage({
      type: 'FOCUS_TAB',
      payload: { tabId: sourceTabId },
    });
  },

  // Scrubbing actions
  setScrubPosition: (animationId: string, position: number) => {
    const { animations } = get();
    const animation = animations.find((a) => a.id === animationId);

    if (!animation) return;

    // Calculate which keyframe we're at
    const keyframes = animation.keyframes || [];
    const keyframeIndex = findKeyframeIndexAtPosition(keyframes, position);

    set({
      scrubPosition: position,
      scrubAnimationId: animationId,
      currentKeyframeIndex: keyframeIndex >= 0 ? keyframeIndex : null,
    });
  },

  clearScrub: () => {
    set({
      scrubPosition: 0,
      scrubAnimationId: null,
      currentKeyframeIndex: null,
    });
  },

  // DOM tree actions
  setDOMTree: (tree) => {
    // Collect initially expanded nodes from tree
    const initiallyExpanded = new Set<string>();
    function collectExpanded(node: DOMTreeNode | null) {
      if (!node) return;
      if (node.isExpanded) {
        initiallyExpanded.add(node.id);
      }
      node.children.forEach(collectExpanded);
    }
    collectExpanded(tree);

    set({ domTree: tree, expandedNodeIds: initiallyExpanded });
  },

  toggleNodeExpanded: (nodeId) => {
    const { expandedNodeIds } = get();
    const newSet = new Set(expandedNodeIds);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    set({ expandedNodeIds: newSet });
  },

  selectNodeAnimations: (nodeId) => {
    const { domTree } = get();
    const node = findNodeById(domTree, nodeId);
    if (node && node.animationIds.length > 0) {
      set({ selectedAnimationId: node.animationIds[0] });
    }
  },

  fetchDOMTree: async () => {
    const { sourceTabId } = get();
    if (!sourceTabId) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_DOM_TREE_IN_TAB',
        payload: { tabId: sourceTabId },
      });

      if (response.type === 'DOM_TREE_RESULT') {
        get().setDOMTree(response.payload);
      }
    } catch (err) {
      console.error('CSS Weaver: Failed to fetch DOM tree:', err);
    }
  },

  // Selection sync - expands tree path, scrolls to element, opens details
  selectAnimationWithSync: (animationId: string) => {
    const { domTree, sourceTabId } = get();

    // 1. Set selection and open details panel
    set({ selectedAnimationId: animationId, detailsPanelOpen: true });

    // 2. Find node path in tree and expand all parent nodes
    const nodePath = findNodePathByAnimationId(domTree, animationId);
    if (nodePath) {
      const newExpanded = new Set(get().expandedNodeIds);
      nodePath.forEach((nodeId) => newExpanded.add(nodeId));
      set({ expandedNodeIds: newExpanded });
    }

    // 3. Highlight element on the page (green overlay)
    get().highlightElement(animationId);

    // 4. Scroll to element in target page
    if (sourceTabId) {
      chrome.runtime.sendMessage({
        type: 'SCROLL_TO_ELEMENT_IN_TAB',
        payload: { tabId: sourceTabId, animationId },
      });
    }
  },

  // Playback actions - now control animations on the source page
  startPlayback: () => {
    const { sourceTabId } = get();
    set((state) => ({
      playbackState: { ...state.playbackState, isPlaying: true },
    }));

    // Send play command to content script
    if (sourceTabId) {
      chrome.runtime.sendMessage({
        type: 'PLAYBACK_CONTROL_IN_TAB',
        payload: { tabId: sourceTabId, action: 'play' },
      });
    }
  },

  pausePlayback: () => {
    const { sourceTabId } = get();
    set((state) => ({
      playbackState: { ...state.playbackState, isPlaying: false },
    }));

    // Send pause command to content script
    if (sourceTabId) {
      chrome.runtime.sendMessage({
        type: 'PLAYBACK_CONTROL_IN_TAB',
        payload: { tabId: sourceTabId, action: 'pause' },
      });
    }
  },

  stopPlayback: () => {
    const { sourceTabId } = get();
    set({
      playbackState: {
        isPlaying: false,
        playbackPosition: 0,
        playbackSpeed: get().playbackState.playbackSpeed,
      },
    });

    // Send restart command to reset animations
    if (sourceTabId) {
      chrome.runtime.sendMessage({
        type: 'PLAYBACK_CONTROL_IN_TAB',
        payload: { tabId: sourceTabId, action: 'restart' },
      });
    }
  },

  setPlaybackPosition: (position) => {
    const { sourceTabId } = get();
    set((state) => ({
      playbackState: { ...state.playbackState, playbackPosition: position },
    }));

    // Send seek command to content script
    if (sourceTabId) {
      chrome.runtime.sendMessage({
        type: 'PLAYBACK_CONTROL_IN_TAB',
        payload: { tabId: sourceTabId, action: 'seek', value: position },
      });
    }
  },

  setPlaybackSpeed: (speed) => {
    const { sourceTabId } = get();
    set((state) => ({
      playbackState: { ...state.playbackState, playbackSpeed: speed },
    }));

    // Send speed change to content script
    if (sourceTabId) {
      chrome.runtime.sendMessage({
        type: 'PLAYBACK_CONTROL_IN_TAB',
        payload: { tabId: sourceTabId, action: 'speed', value: speed },
      });
    }
  },

  scrollToAnimationPosition: async (position) => {
    const { sourceTabId, animations } = get();
    if (!sourceTabId) return;

    // Find animation at this position and scroll to it
    const animAtPosition = animations.find(
      (anim) => anim.startTime <= position && anim.endTime >= position
    );

    if (animAtPosition) {
      await chrome.runtime.sendMessage({
        type: 'SCROLL_TO_POSITION_IN_TAB',
        payload: {
          tabId: sourceTabId,
          scrollY: animAtPosition.position.top - 100, // Offset to show element
        },
      });
    }
  },

  // Details panel actions
  toggleDetailsPanel: () => {
    set((state) => ({ detailsPanelOpen: !state.detailsPanelOpen }));
  },

  openDetailsPanel: () => {
    set({ detailsPanelOpen: true });
  },
}));

// Set up message listener for scroll and playback updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SCROLL_UPDATE') {
    useAnimationStore.getState().updateScrollPosition(message.payload);
  }

  // Handle playback state updates from content script
  if (message.type === 'PLAYBACK_STATE_UPDATE') {
    const { isPlaying, currentTime } = message.payload;
    const store = useAnimationStore.getState();

    // Update playback position from source page
    if (isPlaying !== store.playbackState.isPlaying || currentTime !== store.playbackState.playbackPosition) {
      useAnimationStore.setState((state) => ({
        playbackState: {
          ...state.playbackState,
          isPlaying,
          playbackPosition: currentTime,
        },
      }));
    }
  }
});
