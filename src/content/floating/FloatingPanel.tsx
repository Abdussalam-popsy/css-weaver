import { useState, useRef, useEffect, useCallback, type WheelEvent as ReactWheelEvent } from 'react';

interface FloatingPanelProps {
  children: React.ReactNode;
  onClose: () => void;
  onOpenTimeline?: () => void;
  inspectModeEnabled?: boolean;
  onToggleInspectMode?: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const DEFAULT_SIZE: Size = { width: 420, height: 520 };
const MIN_SIZE: Size = { width: 320, height: 380 };
const COLLAPSED_SIZE: Size = { width: 48, height: 48 };

// Design tokens matching v1
const colors = {
  bg: '#1a1a1a',
  panel: '#242424',
  border: '#333333',
  accent: '#22c55e',
  accentHover: '#16a34a',
  accentMuted: 'rgba(34, 197, 94, 0.15)',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
};

export default function FloatingPanel({ children, onClose, onOpenTimeline, inspectModeEnabled, onToggleInspectMode }: FloatingPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('css-weaver-position');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Invalid saved position
      }
    }
    return {
      x: window.innerWidth - DEFAULT_SIZE.width - 20,
      y: window.innerHeight - DEFAULT_SIZE.height - 20,
    };
  });
  const [size, setSize] = useState<Size>(() => {
    const saved = localStorage.getItem('css-weaver-size');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Invalid saved size
      }
    }
    return DEFAULT_SIZE;
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('css-weaver-position', JSON.stringify(position));
  }, [position]);

  // Save size to localStorage
  useEffect(() => {
    localStorage.setItem('css-weaver-size', JSON.stringify(size));
  }, [size]);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('input')) return;
    if ((e.target as HTMLElement).closest('select')) return;

    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      const newX = Math.max(0, Math.min(window.innerWidth - (isCollapsed ? COLLAPSED_SIZE.width : size.width), e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - (isCollapsed ? COLLAPSED_SIZE.height : size.height), e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    }
    if (isResizing.current && !isCollapsed) {
      const newWidth = Math.max(MIN_SIZE.width, e.clientX - position.x);
      const newHeight = Math.max(MIN_SIZE.height, e.clientY - position.y);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [position, size, isCollapsed]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Prevent scroll propagation to the page using native event listener
  // This is needed because React's onWheel doesn't work with passive: false
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const preventScrollPropagation = (e: WheelEvent) => {
      // Find the scrollable element within the panel
      const scrollableElement = panel.querySelector('[data-scrollable]') as HTMLElement;
      if (!scrollableElement) {
        // If there's no scrollable element, just stop propagation
        e.stopPropagation();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight;
      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;

      // Allow scrolling within the panel, but prevent propagation to page
      // If at boundaries, prevent default to stop page scroll
      if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
        e.preventDefault();
      }

      // Always stop propagation to prevent page from receiving the event
      e.stopPropagation();
    };

    panel.addEventListener('wheel', preventScrollPropagation, { passive: false });
    return () => {
      panel.removeEventListener('wheel', preventScrollPropagation);
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Prevent scroll events from propagating to the page
   * This fixes the issue where scrolling in the floating panel scrolls the page
   */
  const handleWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    // Stop the event from propagating to the page
    e.stopPropagation();
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  // Collapsed state - show branded icon
  if (isCollapsed) {
    return (
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${COLLAPSED_SIZE.width}px`,
          height: `${COLLAPSED_SIZE.height}px`,
          zIndex: 2147483647,
          cursor: 'move',
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={toggleCollapse}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            border: `2px solid ${colors.accent}`,
            background: colors.bg,
            color: colors.accent,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 24px rgba(34, 197, 94, 0.3), 0 0 0 1px ${colors.border}`,
            transition: 'all 0.2s ease',
          }}
          title="Expand CSS Weaver"
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 4px 32px rgba(34, 197, 94, 0.5), 0 0 0 1px ${colors.accent}`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 4px 24px rgba(34, 197, 94, 0.3), 0 0 0 1px ${colors.border}`;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* CSS Weaver Logo - staggered bars */}
          <svg width="24" height="24" viewBox="0 0 24 24">
            <rect x="2" y="6" width="8" height="3" rx="1.5" fill="currentColor" />
            <rect x="5" y="11" width="10" height="3" rx="1.5" fill="currentColor" />
            <rect x="8" y="16" width="8" height="3" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      onWheel={handleWheel}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${colors.border}, 0 0 60px rgba(34, 197, 94, 0.1)`,
        background: colors.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Title bar - draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: colors.panel,
          borderBottom: `1px solid ${colors.border}`,
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Logo - staggered bars */}
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ color: colors.accent }}>
            <rect x="2" y="6" width="8" height="3" rx="1.5" fill="currentColor" />
            <rect x="5" y="11" width="10" height="3" rx="1.5" fill="currentColor" />
            <rect x="8" y="16" width="8" height="3" rx="1.5" fill="currentColor" />
          </svg>
          <span style={{ color: colors.text, fontWeight: 600, fontSize: '13px' }}>
            CSS Weaver
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Inspect Mode toggle */}
          {onToggleInspectMode && (
            <button
              onClick={onToggleInspectMode}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: `1px solid ${inspectModeEnabled ? colors.accent : colors.border}`,
                background: inspectModeEnabled ? colors.accentMuted : 'transparent',
                color: inspectModeEnabled ? colors.accent : colors.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                transition: 'all 0.15s ease',
              }}
              title={inspectModeEnabled ? 'Disable Inspect Mode' : 'Enable Inspect Mode - hover over elements to see animations'}
              onMouseEnter={(e) => {
                if (!inspectModeEnabled) {
                  e.currentTarget.style.borderColor = colors.accent;
                  e.currentTarget.style.color = colors.accent;
                }
              }}
              onMouseLeave={(e) => {
                if (!inspectModeEnabled) {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.color = colors.textMuted;
                }
              }}
            >
              {/* Crosshair/Target icon for inspect mode */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <line x1="12" y1="22" x2="12" y2="18" />
              </svg>
              Inspect
            </button>
          )}
          {/* Open Timeline button */}
          {onOpenTimeline && (
            <button
              onClick={onOpenTimeline}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                transition: 'all 0.15s ease',
              }}
              title="Open full Timeline View"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.accent;
                e.currentTarget.style.color = colors.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.textMuted;
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              Timeline
            </button>
          )}
          {/* Minimize button */}
          <button
            onClick={toggleCollapse}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.15s ease',
            }}
            title="Minimize"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.accent;
              e.currentTarget.style.color = colors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.color = colors.textMuted;
            }}
          >
            −
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.15s ease',
            }}
            title="Close"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.color = colors.textMuted;
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Resize handle */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '20px',
          height: '20px',
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.5,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill={colors.textDim}>
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="6" cy="10" r="1.5" />
          <circle cx="10" cy="6" r="1.5" />
        </svg>
      </div>
    </div>
  );
}
