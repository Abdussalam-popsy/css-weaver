import { createRoot, Root } from 'react-dom/client';
import FloatingPanel from './FloatingPanel';
import FloatingApp from './FloatingApp';

let container: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let root: Root | null = null;
let isVisible = false;

// Design tokens matching v1
const colors = {
  bg: '#1a1a1a',
  panel: '#242424',
  border: '#333333',
  accent: '#22c55e',
  accentHover: '#16a34a',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
};

/**
 * Open the full timeline panel in a new tab
 */
function openTimelinePanel(): void {
  // Get the current page URL to pass to the panel
  const currentUrl = window.location.href;

  // Send message to background to open panel tab
  chrome.runtime.sendMessage({
    type: 'OPEN_TIMELINE_PANEL',
    payload: { sourceUrl: currentUrl },
  });

  console.log('🎨 CSS Weaver: Opening timeline panel for', currentUrl);
}

/**
 * Create or get the Shadow DOM container for the floating panel
 */
function getOrCreateContainer(): { container: HTMLDivElement; shadow: ShadowRoot } {
  if (container && shadowRoot) {
    return { container, shadow: shadowRoot };
  }

  // Create container element
  container = document.createElement('div');
  container.id = 'css-weaver-floating-root';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;

  // Attach shadow DOM for CSS isolation
  shadowRoot = container.attachShadow({ mode: 'closed' });

  // Add reset styles to shadow DOM with v1 design system
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :host {
      all: initial;
    }

    .css-weaver-root {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: ${colors.text};
      pointer-events: auto;
    }

    /* Custom scrollbar - matching v1 */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: ${colors.bg};
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: ${colors.border};
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${colors.textDim};
    }

    /* Focus styles - green accent */
    button:focus-visible, input:focus-visible, select:focus-visible {
      outline: 2px solid ${colors.accent};
      outline-offset: 2px;
    }

    /* Button hover states */
    button {
      transition: all 0.15s ease;
    }
    button:hover {
      opacity: 0.9;
    }
    button:active {
      transform: scale(0.98);
    }

    /* Input placeholder */
    input::placeholder {
      color: ${colors.textDim};
    }

    /* Select styling */
    select option {
      background: ${colors.bg};
      color: ${colors.text};
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }

    .animate-slide-up {
      animation: slideUp 0.2s ease-out;
    }

    /* Selection color */
    ::selection {
      background: rgba(34, 197, 94, 0.3);
      color: ${colors.text};
    }
  `;
  shadowRoot.appendChild(styleSheet);

  // Create React mount point
  const mountPoint = document.createElement('div');
  mountPoint.className = 'css-weaver-root';
  shadowRoot.appendChild(mountPoint);

  // Append to document
  document.body.appendChild(container);

  return { container, shadow: shadowRoot };
}

/**
 * Show the floating panel
 */
export function showFloatingPanel(): void {
  if (isVisible) return;

  const { shadow } = getOrCreateContainer();
  const mountPoint = shadow.querySelector('.css-weaver-root');

  if (!mountPoint) {
    console.error('CSS Weaver: Mount point not found');
    return;
  }

  // Create React root and render
  root = createRoot(mountPoint);
  root.render(
    <FloatingPanel onClose={hideFloatingPanel} onOpenTimeline={openTimelinePanel}>
      <FloatingApp onClose={hideFloatingPanel} onOpenTimeline={openTimelinePanel} />
    </FloatingPanel>
  );

  isVisible = true;
  console.log('🎨 CSS Weaver: Floating panel shown');
}

/**
 * Hide the floating panel
 */
export function hideFloatingPanel(): void {
  if (!isVisible || !root) return;

  // Unmount React
  root.unmount();
  root = null;
  isVisible = false;

  console.log('🎨 CSS Weaver: Floating panel hidden');
}

/**
 * Toggle the floating panel visibility
 */
export function toggleFloatingPanel(): void {
  if (isVisible) {
    hideFloatingPanel();
  } else {
    showFloatingPanel();
  }
}

/**
 * Check if the floating panel is currently visible
 */
export function isFloatingPanelVisible(): boolean {
  return isVisible;
}

/**
 * Clean up the floating panel completely
 */
export function destroyFloatingPanel(): void {
  hideFloatingPanel();

  if (container) {
    container.remove();
    container = null;
    shadowRoot = null;
  }
}
