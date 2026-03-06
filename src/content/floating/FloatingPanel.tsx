import { useState, useRef, useEffect, useCallback } from 'react';
import { colors, shadows, radius, transitions, typography } from '../../constants/designTokens';

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

const DEFAULT_SIZE: Size = { width: 400, height: 540 };
const MIN_SIZE: Size = { width: 340, height: 400 };
const COLLAPSED_SIZE: Size = { width: 44, height: 44 };

export default function FloatingPanel({ children, onClose, inspectModeEnabled, onToggleInspectMode }: FloatingPanelProps) {
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
      x: window.innerWidth - DEFAULT_SIZE.width - 24,
      y: window.innerHeight - DEFAULT_SIZE.height - 24,
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

  // Prevent scroll propagation to the page
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const preventScrollPropagation = (e: WheelEvent) => {
      const scrollableElement = panel.querySelector('[data-scrollable]') as HTMLElement;
      if (!scrollableElement) {
        e.stopPropagation();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight;
      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;

      if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
        e.preventDefault();
      }

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

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  // Collapsed state - show branded floating button
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
            borderRadius: radius.xl,
            border: `1px solid ${colors.border.strong}`,
            background: `linear-gradient(145deg, ${colors.bg.secondary}, ${colors.bg.primary})`,
            color: colors.accent.primary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `${shadows.lg}, ${shadows.glow.accent}`,
            transition: transitions.normal,
          }}
          title="Expand CSS Weaver"
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `${shadows.xl}, 0 0 30px rgba(129, 140, 248, 0.3)`;
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.borderColor = colors.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `${shadows.lg}, ${shadows.glow.accent}`;
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = colors.border.strong;
          }}
        >
          {/* CSS Weaver Logo - refined staggered bars */}
          <svg width="22" height="22" viewBox="0 0 24 24">
            <rect x="3" y="5" width="7" height="2.5" rx="1.25" fill="currentColor" opacity="0.7" />
            <rect x="6" y="10.5" width="9" height="2.5" rx="1.25" fill="currentColor" opacity="0.85" />
            <rect x="9" y="16" width="7" height="2.5" rx="1.25" fill="currentColor" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: radius['2xl'],
        overflow: 'hidden',
        boxShadow: shadows.panel,
        background: colors.bg.primary,
        fontFamily: typography.fontFamily.sans,
        border: `1px solid ${colors.border.subtle}`,
      }}
    >
      {/* Title bar - draggable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: colors.bg.secondary,
          borderBottom: `1px solid ${colors.border.default}`,
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logo - animated gradient feel */}
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: radius.md,
            background: `linear-gradient(135deg, ${colors.accent.muted}, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ color: colors.accent.primary }}>
              <rect x="3" y="5" width="7" height="2.5" rx="1.25" fill="currentColor" opacity="0.7" />
              <rect x="6" y="10.5" width="9" height="2.5" rx="1.25" fill="currentColor" opacity="0.85" />
              <rect x="9" y="16" width="7" height="2.5" rx="1.25" fill="currentColor" />
            </svg>
          </div>
          <span style={{
            color: colors.text.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.md,
            letterSpacing: typography.letterSpacing.tight,
          }}>
            CSS Weaver
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Inspect Mode toggle */}
          {onToggleInspectMode && (
            <button
              onClick={onToggleInspectMode}
              style={{
                padding: '6px 10px',
                borderRadius: radius.md,
                border: `1px solid ${inspectModeEnabled ? colors.accent.border : colors.border.default}`,
                background: inspectModeEnabled ? colors.accent.muted : 'transparent',
                color: inspectModeEnabled ? colors.accent.primary : colors.text.tertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                transition: transitions.fast,
              }}
              title={inspectModeEnabled ? 'Disable Inspect Mode' : 'Enable Inspect Mode'}
              onMouseEnter={(e) => {
                if (!inspectModeEnabled) {
                  e.currentTarget.style.borderColor = colors.accent.border;
                  e.currentTarget.style.color = colors.accent.primary;
                  e.currentTarget.style.background = colors.accent.muted;
                }
              }}
              onMouseLeave={(e) => {
                if (!inspectModeEnabled) {
                  e.currentTarget.style.borderColor = colors.border.default;
                  e.currentTarget.style.color = colors.text.tertiary;
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
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

          {/* Window controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {/* Minimize button */}
            <button
              onClick={toggleCollapse}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: radius.md,
                border: 'none',
                background: 'transparent',
                color: colors.text.tertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: transitions.fast,
              }}
              title="Minimize"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.bg.elevated;
                e.currentTarget.style.color = colors.text.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.text.tertiary;
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: radius.md,
                border: 'none',
                background: 'transparent',
                color: colors.text.tertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: transitions.fast,
              }}
              title="Close"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.error.muted;
                e.currentTarget.style.color = colors.error.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.text.tertiary;
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
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
          width: '16px',
          height: '16px',
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.3,
          transition: transitions.fast,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.3'; }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill={colors.text.disabled}>
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="4.5" cy="8" r="1.2" />
          <circle cx="8" cy="4.5" r="1.2" />
        </svg>
      </div>
    </div>
  );
}
