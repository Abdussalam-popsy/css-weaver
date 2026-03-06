/**
 * CSS Weaver Background Service Worker
 * Handles extension icon clicks, tab management, and message routing
 */

import type { BackgroundMessage, BackgroundResponse } from '../shared/messages';

// Track which panel tab corresponds to which source tab
const panelToSourceMap = new Map<number, number>(); // panelTabId -> sourceTabId

/**
 * Open the full timeline panel in a new tab
 */
async function openTimelinePanel(sourceTabId: number, sourceUrl: string): Promise<void> {
  // Get panel URL from extension
  const panelUrl = chrome.runtime.getURL('src/panel/index.html');

  // Create new tab with panel
  const panelTab = await chrome.tabs.create({
    url: `${panelUrl}?tabId=${sourceTabId}&url=${encodeURIComponent(sourceUrl)}`,
    active: true,
  });

  // Track the mapping
  if (panelTab.id) {
    panelToSourceMap.set(panelTab.id, sourceTabId);
    console.log('🎨 CSS Weaver: Opened timeline panel', panelTab.id, 'for source tab', sourceTabId);
  }
}

/**
 * Handle extension icon click - toggle floating panel on the page
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) {
    console.error('CSS Weaver: No active tab');
    return;
  }

  // Don't try to scan chrome:// or other restricted URLs
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
    console.warn('CSS Weaver: Cannot scan this page type');
    return;
  }

  try {
    // Ensure content script is loaded
    await ensureContentScript(tab.id);

    // Toggle the floating panel
    await chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_FLOATING_PANEL',
    });

    console.log('🎨 CSS Weaver: Toggled floating panel on tab', tab.id);
  } catch (error) {
    console.error('CSS Weaver: Failed to toggle floating panel:', error);
  }
});

// Note: Full-page panel code is preserved but not currently used.
// The floating overlay is now the primary interface.
// This function can be re-enabled via context menu or keyboard shortcut if needed.

/**
 * Handle messages from panel
 */
chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    sender,
    sendResponse: (response: BackgroundResponse) => void
  ) => {
    handleMessage(message, sender, sendResponse);
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
);

async function handleMessage(
  message: BackgroundMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: BackgroundResponse) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'SCAN_TAB': {
        const { tabId } = message.payload;

        // Ensure content script is injected
        await ensureContentScript(tabId);

        // Send scan request to content script
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'SCAN_ANIMATIONS',
        });

        if (response.type === 'ANIMATIONS_FOUND') {
          sendResponse({
            type: 'ANIMATIONS_RESULT',
            payload: response.payload,
          });
        } else if (response.type === 'SCAN_ERROR') {
          sendResponse({
            type: 'ERROR',
            payload: { error: response.payload.error },
          });
        }
        break;
      }

      case 'HIGHLIGHT_IN_TAB': {
        const { tabId, animationId } = message.payload;
        await chrome.tabs.sendMessage(tabId, {
          type: 'HIGHLIGHT_ELEMENT',
          payload: { id: animationId },
        });
        break;
      }

      case 'CLEAR_HIGHLIGHT_IN_TAB': {
        const { tabId } = message.payload;
        await chrome.tabs.sendMessage(tabId, {
          type: 'CLEAR_HIGHLIGHT',
        });
        break;
      }

      case 'START_SCROLL_TRACKING_IN_TAB': {
        const { tabId } = message.payload;
        await chrome.tabs.sendMessage(tabId, {
          type: 'START_SCROLL_TRACKING',
        });
        break;
      }

      case 'STOP_SCROLL_TRACKING_IN_TAB': {
        const { tabId } = message.payload;
        await chrome.tabs.sendMessage(tabId, {
          type: 'STOP_SCROLL_TRACKING',
        });
        break;
      }

      case 'FOCUS_TAB': {
        const { tabId } = message.payload;
        const tab = await chrome.tabs.get(tabId);
        if (tab.id) {
          await chrome.tabs.update(tab.id, { active: true });
          if (tab.windowId) {
            await chrome.windows.update(tab.windowId, { focused: true });
          }
        }
        break;
      }

      case 'GET_DOM_TREE_IN_TAB': {
        const { tabId } = message.payload;
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'GET_DOM_TREE',
        });
        if (response.type === 'DOM_TREE_RESULT') {
          sendResponse({
            type: 'DOM_TREE_RESULT',
            payload: response.payload,
          });
        } else {
          sendResponse({
            type: 'ERROR',
            payload: { error: 'Failed to get DOM tree' },
          });
        }
        break;
      }

      case 'SCROLL_TO_POSITION_IN_TAB': {
        const { tabId, scrollY } = message.payload;
        await chrome.tabs.sendMessage(tabId, {
          type: 'SCROLL_TO_POSITION',
          payload: { scrollY },
        });
        break;
      }

      case 'SCROLL_TO_ELEMENT_IN_TAB': {
        const { tabId, animationId } = message.payload;
        await chrome.tabs.sendMessage(tabId, {
          type: 'SCROLL_TO_ELEMENT',
          payload: { animationId },
        });
        break;
      }

      case 'OPEN_TIMELINE_PANEL': {
        // Get current active tab if not specified
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        if (currentTab?.id && currentTab?.url) {
          await openTimelinePanel(currentTab.id, message.payload?.sourceUrl || currentTab.url);
        }
        break;
      }

      // Playback control messages
      case 'PLAYBACK_CONTROL_IN_TAB': {
        const { tabId, action, value } = message.payload;
        await chrome.tabs.sendMessage(tabId, {
          type: 'PLAYBACK_CONTROL',
          payload: { action, value },
        });
        break;
      }

      case 'GET_PLAYBACK_STATE_IN_TAB': {
        const { tabId } = message.payload;
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'GET_PLAYBACK_STATE',
        });
        if (response.type === 'PLAYBACK_STATE_RESULT') {
          sendResponse({
            type: 'PLAYBACK_STATE_RESULT',
            payload: response.payload,
          });
        }
        break;
      }

      case 'GET_GSAP_DATA_IN_TAB': {
        const { tabId } = message.payload;
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'GET_GSAP_DATA',
        });
        if (response.type === 'GSAP_DATA_RESULT') {
          sendResponse({
            type: 'GSAP_DATA_RESULT',
            payload: response.payload,
          });
        }
        break;
      }

      default:
        sendResponse({
          type: 'ERROR',
          payload: { error: 'Unknown message type' },
        });
    }
  } catch (error) {
    console.error('CSS Weaver background error:', error);
    sendResponse({
      type: 'ERROR',
      payload: { error: String(error) },
    });
  }
}

/**
 * Ensure content script is ready (it's auto-injected via manifest)
 */
async function ensureContentScript(tabId: number): Promise<void> {
  const maxRetries = 10; // Increased from 5
  const retryDelay = 500; // Increased from 200ms

  console.log('🔍 CSS Weaver Background: Checking if content script is ready on tab', tabId);

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try to ping the content script
      console.log(`🔍 Attempt ${i + 1}/${maxRetries}: Sending PING to tab ${tabId}...`);
      const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      console.log('✅ CSS Weaver Background: Content script responded!', response);
      return; // Success - content script is ready
    } catch (error) {
      console.warn(`⚠️ Attempt ${i + 1}/${maxRetries} failed:`, error);
      if (i === maxRetries - 1) {
        console.error('❌ CSS Weaver: Content script not ready after', maxRetries, 'attempts');
        console.error('💡 Try: 1) Reload the target page, 2) Remove and re-add the extension');
        throw new Error('Content script not ready. Please reload the page and try again.');
      }
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Forward scroll and playback updates from content script to panel
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  if ((message.type === 'SCROLL_UPDATE' || message.type === 'PLAYBACK_STATE_UPDATE') && sender.tab?.id) {
    const sourceTabId = sender.tab.id;

    // Find panel tab(s) for this source tab
    for (const [panelTabId, mappedSourceTabId] of panelToSourceMap.entries()) {
      if (mappedSourceTabId === sourceTabId) {
        // Forward update to panel
        chrome.tabs.sendMessage(panelTabId, message).catch(() => {
          // Panel tab might be closed, clean up mapping
          panelToSourceMap.delete(panelTabId);
        });
      }
    }
  }
});

/**
 * Clean up mappings when tabs are closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  // Check if it's a panel tab
  if (panelToSourceMap.has(tabId)) {
    console.debug(`CSS Weaver: Panel tab ${tabId} closed, cleaning up mapping`);
    panelToSourceMap.delete(tabId);
  }

  // Check if it's a source tab (remove any panels pointing to it)
  for (const [panelTabId, sourceTabId] of panelToSourceMap.entries()) {
    if (sourceTabId === tabId) {
      console.debug(`CSS Weaver: Source tab ${tabId} closed, cleaning up panel mapping`);
      panelToSourceMap.delete(panelTabId);
    }
  }
});

// Log service worker startup
console.debug('CSS Weaver: Service worker started');
