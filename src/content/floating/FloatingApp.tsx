import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Animation } from '../../shared/types';
import { scanAnimations } from '../scanner';
import { highlightElement, clearHighlight } from '../highlighter';
import { getCachedAnimations, hasCachedAnimations, setCachedAnimations, getPageDetectedAnimations } from '../animationCache';
import { requestPageScan } from '../injected/inject';
import { formatAnimationProperty, getCompleteCss } from '../../panel/utils/cssFormatting';
import { getTypeLabel, getTypeColors } from '../../constants/animationTypes';
import EasingCurve from '../../components/EasingCurve';

interface FloatingAppProps {
  onClose: () => void;
  onOpenTimeline?: () => void;
}

// Design tokens matching v1
const colors = {
  bg: '#1a1a1a',
  panel: '#242424',
  border: '#333333',
  accent: '#22c55e',
  accentHover: '#16a34a',
  accentMuted: 'rgba(34, 197, 94, 0.15)',
  accentBorder: 'rgba(34, 197, 94, 0.3)',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
};

// Generate human-readable description of what the animation does
function getAnimationDescription(anim: Animation): string {
  const parts: string[] = [];

  // Describe the effect based on animation name or properties
  const name = anim.name.toLowerCase();

  if (name.includes('fade') || name.includes('opacity')) {
    parts.push('Fades');
  } else if (name.includes('slide') || name.includes('translate')) {
    parts.push('Slides');
  } else if (name.includes('scale') || name.includes('zoom') || name.includes('grow')) {
    parts.push('Scales');
  } else if (name.includes('rotate') || name.includes('spin')) {
    parts.push('Rotates');
  } else if (name.includes('bounce')) {
    parts.push('Bounces');
  } else if (name.includes('shake') || name.includes('wiggle')) {
    parts.push('Shakes');
  } else if (name.includes('pulse') || name.includes('beat')) {
    parts.push('Pulses');
  } else if (name.includes('float')) {
    parts.push('Floats');
  } else if (name.includes('glow')) {
    parts.push('Glows');
  } else if (anim.type === 'transition') {
    // For transitions, describe what property changes
    const prop = name.replace('transition: ', '');
    if (prop === 'all') {
      parts.push('Smoothly transitions');
    } else if (prop === 'transform') {
      parts.push('Transforms');
    } else if (prop === 'background' || prop === 'background-color') {
      parts.push('Changes background');
    } else if (prop === 'color') {
      parts.push('Changes color');
    } else if (prop === 'opacity') {
      parts.push('Fades');
    } else {
      parts.push(`Animates ${prop}`);
    }
  } else {
    parts.push('Animates');
  }

  // Add duration in human terms
  const duration = anim.duration;
  if (duration < 200) {
    parts.push('quickly');
  } else if (duration < 500) {
    parts.push('smoothly');
  } else if (duration < 1000) {
    parts.push('gracefully');
  } else {
    parts.push('slowly');
  }

  // Add timing description
  const timing = anim.timingFunction;
  if (timing.includes('ease-in-out')) {
    parts.push('with gentle start and end');
  } else if (timing.includes('ease-out')) {
    parts.push('with soft landing');
  } else if (timing.includes('ease-in')) {
    parts.push('with gradual start');
  } else if (timing.includes('linear')) {
    parts.push('at constant speed');
  } else if (timing.includes('cubic-bezier')) {
    parts.push('with custom curve');
  }

  return parts.join(' ');
}

// Format duration for display
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Format timing function for display
function formatTiming(timing: string): string {
  if (timing.startsWith('cubic-bezier')) {
    return 'Custom curve';
  }
  return timing.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Inspect mode tooltip component
function InspectTooltip({ animations, position }: {
  animations: Animation[];
  position: { x: number; y: number };
}) {
  if (animations.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      left: position.x + 12,
      top: position.y + 12,
      background: colors.bg,
      border: `1px solid ${colors.accent}`,
      borderRadius: '8px',
      padding: '10px 14px',
      zIndex: 2147483647,
      pointerEvents: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      maxWidth: '280px',
    }}>
      {animations.map((anim, i) => {
        const typeColors = getTypeColors(anim.type);
        return (
          <div key={anim.id} style={{ marginBottom: i < animations.length - 1 ? '8px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 600,
                background: typeColors.bg,
                color: typeColors.text,
                border: `1px solid ${typeColors.border}`,
              }}>
                {getTypeLabel(anim.type)}
              </span>
              <span style={{ color: colors.text, fontWeight: 500, fontSize: '12px' }}>
                {anim.name.length > 30 ? anim.name.slice(0, 30) + '...' : anim.name}
              </span>
            </div>
            <div style={{ color: colors.textDim, fontSize: '10px' }}>
              {anim.duration}ms • {anim.timingFunction}
            </div>
          </div>
        );
      })}
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: `1px solid ${colors.border}`,
        color: colors.textMuted,
        fontSize: '10px',
      }}>
        Click to select in panel
      </div>
    </div>
  );
}

export default function FloatingApp({ onClose: _onClose }: FloatingAppProps) {
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'code'>('overview');

  // Inspect mode state
  const [inspectModeEnabled, setInspectModeEnabled] = useState(false);
  const [inspectTooltipAnims, setInspectTooltipAnims] = useState<Animation[]>([]);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Scan animations on mount - uses cached animations which includes GSAP, Framer Motion, etc.
  useEffect(() => {
    const loadAnimations = async () => {
      // Check if we already have cached animations (includes GSAP, etc.)
      if (hasCachedAnimations()) {
        setAnimations(getCachedAnimations());
        setLoading(false);
        return;
      }

      // Otherwise, trigger a fresh scan that includes page-detected animations
      try {
        // Request page script to scan for GSAP animations
        await requestPageScan();

        // Wait a bit for CustomEvents to arrive
        await new Promise(resolve => setTimeout(resolve, 250));

        // Scan CSS animations
        const cssAnimations = scanAnimations();

        // Get page-detected animations (GSAP, Framer Motion, etc.)
        const pageDetectedAnims = getPageDetectedAnimations();

        // Merge, avoiding duplicates
        const pageAnims = pageDetectedAnims.filter(pageAnim =>
          !cssAnimations.some(cssAnim => cssAnim.id === pageAnim.id)
        );

        const allAnimations = [...cssAnimations, ...pageAnims];

        // Cache for future use
        setCachedAnimations(allAnimations);

        console.log('🎨 CSS Weaver Floating: Loaded animations', {
          css: cssAnimations.length,
          page: pageAnims.length,
          total: allAnimations.length
        });

        setAnimations(allAnimations);
      } catch (error) {
        console.error('🎨 CSS Weaver Floating: Error loading animations', error);
        // Fallback to CSS-only scan
        setAnimations(scanAnimations());
      }
      setLoading(false);
    };

    loadAnimations();
  }, []);

  // Inspect mode: global hover handler
  useEffect(() => {
    if (!inspectModeEnabled) {
      setInspectTooltipAnims([]);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Skip if hovering over the floating panel itself
      if (target.closest('#css-weaver-floating-root')) {
        setInspectTooltipAnims([]);
        return;
      }

      // Find nearest element with animation data attribute
      const animatedEl = target.closest('[data-css-weaver-id]') as HTMLElement;

      if (animatedEl) {
        const animIds = animatedEl.dataset.cssWeaverId?.split(',') || [];
        const matchedAnims = animations.filter(a => animIds.includes(a.id));

        if (matchedAnims.length > 0) {
          setInspectTooltipAnims(matchedAnims);
          setTooltipPosition({ x: e.clientX, y: e.clientY });
          // Also highlight the element
          highlightElement(matchedAnims[0].id);
        } else {
          setInspectTooltipAnims([]);
        }
      } else {
        setInspectTooltipAnims([]);
        if (!selectedId) {
          clearHighlight();
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Skip if clicking the floating panel itself
      if (target.closest('#css-weaver-floating-root')) {
        return;
      }

      // Find nearest element with animation data attribute
      const animatedEl = target.closest('[data-css-weaver-id]') as HTMLElement;

      if (animatedEl) {
        const animIds = animatedEl.dataset.cssWeaverId?.split(',') || [];
        const matchedAnims = animations.filter(a => animIds.includes(a.id));

        if (matchedAnims.length > 0) {
          // Select the first animation
          setSelectedId(matchedAnims[0].id);
          setExpandedDetails(true);
          highlightElement(matchedAnims[0].id);
          // Disable inspect mode after selection
          setInspectModeEnabled(false);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);

    // Add visual cursor indicator
    document.body.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.body.style.cursor = '';
      setInspectTooltipAnims([]);
    };
  }, [inspectModeEnabled, animations, selectedId]);

  // Get unique animation types for filter
  const animationTypes = useMemo(() => {
    const types = new Set(animations.map(a => a.type));
    return Array.from(types);
  }, [animations]);

  // Filter animations
  const filteredAnimations = useMemo(() => {
    return animations.filter((anim) => {
      if (typeFilter !== 'all' && anim.type !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const description = getAnimationDescription(anim).toLowerCase();
        if (
          !anim.name.toLowerCase().includes(query) &&
          !anim.selector.toLowerCase().includes(query) &&
          !description.includes(query) &&
          !anim.tagName.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [animations, typeFilter, searchQuery]);

  // Calculate timeline metrics
  const timelineMetrics = useMemo(() => {
    if (filteredAnimations.length === 0) return { maxDuration: 1000, totalDuration: 1000 };
    const maxEnd = Math.max(...filteredAnimations.map(a => a.endTime));
    return {
      maxDuration: maxEnd,
      totalDuration: maxEnd,
    };
  }, [filteredAnimations]);

  const handleSelect = useCallback((anim: Animation) => {
    if (selectedId === anim.id) {
      setSelectedId(null);
      setExpandedDetails(false);
      clearHighlight();
    } else {
      setSelectedId(anim.id);
      setExpandedDetails(true);
      highlightElement(anim.id);
      // Scroll to element
      const element = document.querySelector(`[data-css-weaver-id="${anim.id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedId]);

  const handleHover = useCallback((anim: Animation) => {
    highlightElement(anim.id);
  }, []);

  const handleHoverEnd = useCallback(() => {
    if (!selectedId) {
      clearHighlight();
    } else {
      highlightElement(selectedId);
    }
  }, [selectedId]);

  const handleRescan = useCallback(async () => {
    setLoading(true);
    setSelectedId(null);
    setExpandedDetails(false);
    clearHighlight();

    try {
      // Request page script to scan for GSAP animations
      await requestPageScan();

      // Wait for CustomEvents to arrive
      await new Promise(resolve => setTimeout(resolve, 250));

      // Scan CSS animations
      const cssAnimations = scanAnimations();

      // Get page-detected animations (GSAP, Framer Motion, etc.)
      const pageDetectedAnims = getPageDetectedAnimations();

      // Merge, avoiding duplicates
      const pageAnims = pageDetectedAnims.filter(pageAnim =>
        !cssAnimations.some(cssAnim => cssAnim.id === pageAnim.id)
      );

      const allAnimations = [...cssAnimations, ...pageAnims];

      // Cache for future use
      setCachedAnimations(allAnimations);

      console.log('🎨 CSS Weaver Floating: Rescanned animations', {
        css: cssAnimations.length,
        page: pageAnims.length,
        total: allAnimations.length
      });

      setAnimations(allAnimations);
    } catch (error) {
      console.error('🎨 CSS Weaver Floating: Error rescanning', error);
      setAnimations(scanAnimations());
    }
    setLoading(false);
  }, []);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const selectedAnimation = animations.find((a) => a.id === selectedId);

  // Styles - refined for v2 (dark, minimal, precise)
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
      background: colors.bg,
      color: colors.text,
      fontSize: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      letterSpacing: '-0.01em',
    },
    toolbar: {
      display: 'flex',
      gap: '8px',
      padding: '10px 12px',
      borderBottom: `1px solid ${colors.border}`,
      background: colors.panel,
    },
    searchWrapper: {
      flex: 1,
      position: 'relative' as const,
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: colors.textDim,
      pointerEvents: 'none' as const,
    },
    input: {
      width: '100%',
      padding: '8px 10px 8px 32px',
      borderRadius: '8px',
      border: `1px solid ${colors.border}`,
      background: colors.bg,
      color: colors.text,
      fontSize: '12px',
      outline: 'none',
      transition: 'border-color 0.15s ease',
    },
    select: {
      padding: '8px 10px',
      borderRadius: '8px',
      border: `1px solid ${colors.border}`,
      background: colors.bg,
      color: colors.text,
      fontSize: '12px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'border-color 0.15s ease',
    },
    button: {
      padding: '8px 14px',
      borderRadius: '8px',
      border: 'none',
      background: colors.accent,
      color: colors.text,
      fontSize: '12px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    stats: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: `1px solid ${colors.border}`,
      fontSize: '11px',
      color: colors.textMuted,
    },
    list: {
      flex: 1,
      overflow: 'auto',
      padding: '8px',
    },
    item: (isSelected: boolean, typeColors: { bg: string; border: string }) => ({
      marginBottom: '6px',
      borderRadius: '10px',
      background: isSelected ? typeColors.bg : colors.panel,
      border: `1px solid ${isSelected ? typeColors.border : colors.border}`,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      overflow: 'hidden',
    }),
    itemHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
    },
    badge: (typeColors: { bg: string; text: string; border: string }) => ({
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '9px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.03em',
      background: typeColors.bg,
      color: typeColors.text,
      border: `1px solid ${typeColors.border}`,
      whiteSpace: 'nowrap' as const,
    }),
    miniTimeline: {
      height: '4px',
      background: colors.bg,
      borderRadius: '2px',
      margin: '0 12px 10px 12px',
      position: 'relative' as const,
      overflow: 'hidden',
    },
    miniTimelineBar: (start: number, width: number, color: string) => ({
      position: 'absolute' as const,
      left: `${start}%`,
      width: `${Math.max(width, 2)}%`,
      height: '100%',
      background: color,
      borderRadius: '2px',
    }),
    details: {
      borderTop: `1px solid ${colors.border}`,
      background: colors.panel,
      maxHeight: expandedDetails ? '280px' : '0',
      overflow: 'hidden',
      transition: 'max-height 0.2s ease',
    },
    detailsInner: {
      padding: '12px',
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      marginBottom: '12px',
    },
    tab: (isActive: boolean) => ({
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      background: isActive ? colors.accentMuted : 'transparent',
      color: isActive ? colors.accent : colors.textMuted,
      fontSize: '11px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }),
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
    },
    detailCard: {
      padding: '10px',
      borderRadius: '8px',
      background: colors.bg,
      border: `1px solid ${colors.border}`,
    },
    detailLabel: {
      fontSize: '9px',
      color: colors.textDim,
      marginBottom: '3px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      fontWeight: 500,
    },
    detailValue: {
      fontSize: '14px',
      color: colors.text,
      fontWeight: 600,
      lineHeight: 1.2,
    },
    codeBlock: {
      padding: '12px',
      background: colors.bg,
      borderRadius: '8px',
      border: `1px solid ${colors.border}`,
      fontFamily: '"SF Mono", "Fira Code", "Monaco", "Consolas", monospace',
      fontSize: '11px',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-all' as const,
      maxHeight: '160px',
      overflow: 'auto',
      lineHeight: 1.5,
      color: '#e5e7eb',
    },
    copyButton: (isCopied: boolean) => ({
      padding: '6px 12px',
      borderRadius: '6px',
      border: `1px solid ${isCopied ? colors.accent : colors.border}`,
      background: isCopied ? colors.accentMuted : 'transparent',
      color: isCopied ? colors.accent : colors.textMuted,
      fontSize: '11px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      transition: 'all 0.15s ease',
    }),
    empty: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: colors.textMuted,
      textAlign: 'center' as const,
      padding: '24px',
    },
    emptyIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: colors.panel,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '12px',
      color: colors.textDim,
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={{
            ...styles.emptyIcon,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32">
                <animate attributeName="stroke-dashoffset" values="32;0" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>Scanning for animations...</div>
          <div style={{ fontSize: '11px', color: colors.textDim }}>Analyzing CSS, transitions, and libraries</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <svg style={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search animations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.input}
            onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.select}
          onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
        >
          <option value="all">All types</option>
          {animationTypes.map(type => (
            <option key={type} value={type}>{getTypeLabel(type)}</option>
          ))}
        </select>
        <button
          onClick={() => setInspectModeEnabled(!inspectModeEnabled)}
          style={{
            ...styles.button,
            background: inspectModeEnabled ? colors.accent : 'transparent',
            border: `1px solid ${inspectModeEnabled ? colors.accent : colors.border}`,
            color: inspectModeEnabled ? colors.text : colors.textMuted,
          }}
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
          title={inspectModeEnabled ? 'Disable Inspect Mode' : 'Enable Inspect Mode - hover over elements to see animations'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          {inspectModeEnabled ? 'Inspecting' : 'Inspect'}
        </button>
        <button
          onClick={handleRescan}
          style={styles.button}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.accentHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = colors.accent; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Rescan
        </button>
      </div>

      {/* Stats bar */}
      <div style={styles.stats}>
        <span>
          <strong style={{ color: colors.text }}>{filteredAnimations.length}</strong>
          {' '}of {animations.length} animations
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {animationTypes.slice(0, 3).map(type => {
            const count = animations.filter(a => a.type === type).length;
            const typeColors = getTypeColors(type);
            return (
              <span key={type} style={{ color: typeColors.text }}>
                {count} {getTypeLabel(type).toLowerCase()}
              </span>
            );
          })}
        </div>
      </div>

      {/* Animation list */}
      <div style={styles.list} data-scrollable="true">
        {filteredAnimations.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              {animations.length === 0 ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 15s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              )}
            </div>
            <div style={{ fontWeight: 500, marginBottom: '4px' }}>
              {animations.length === 0 ? 'No animations found' : 'No matches'}
            </div>
            <div style={{ fontSize: '11px', color: colors.textDim, marginBottom: '12px' }}>
              {animations.length === 0
                ? 'This page doesn\'t have any CSS animations'
                : 'Try adjusting your search or filter'}
            </div>
            {animations.length === 0 && (
              <button
                onClick={handleRescan}
                style={{ ...styles.button, padding: '8px 16px' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.accentHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = colors.accent; }}
              >
                Rescan Page
              </button>
            )}
          </div>
        ) : (
          filteredAnimations.map((anim) => {
            const typeColors = getTypeColors(anim.type);
            const isSelected = selectedId === anim.id;
            const timelineStart = (anim.startTime / timelineMetrics.totalDuration) * 100;
            const timelineWidth = ((anim.endTime - anim.startTime) / timelineMetrics.totalDuration) * 100;

            return (
              <div
                key={anim.id}
                style={styles.item(isSelected, typeColors)}
                onClick={() => handleSelect(anim)}
                onMouseEnter={() => handleHover(anim)}
                onMouseLeave={handleHoverEnd}
              >
                <div style={styles.itemHeader}>
                  <span style={styles.badge(typeColors)}>
                    {getTypeLabel(anim.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 500,
                      fontSize: '12px',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {anim.tagName.toLowerCase()}
                      {anim.selector.includes('.') && (
                        <span style={{ color: colors.textMuted, fontWeight: 400 }}>
                          .{anim.selector.split('.').pop()?.split(/[\s:[\]>+~]/)[0]}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: colors.textDim,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {getAnimationDescription(anim)}
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: '11px',
                    color: colors.textMuted,
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ fontWeight: 500, color: colors.text }}>
                      {formatDuration(anim.duration)}
                    </div>
                    {anim.delay > 0 && (
                      <div style={{ fontSize: '10px' }}>
                        +{formatDuration(anim.delay)} delay
                      </div>
                    )}
                  </div>
                </div>
                {/* Mini timeline bar */}
                <div style={styles.miniTimeline}>
                  <div style={styles.miniTimelineBar(timelineStart, timelineWidth, typeColors.text)} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected animation details */}
      <div style={styles.details}>
        {selectedAnimation && (
          <div style={styles.detailsInner}>
            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                style={styles.tab(activeTab === 'overview')}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                style={styles.tab(activeTab === 'code')}
                onClick={() => setActiveTab('code')}
              >
                Code
              </button>
              <div style={{ flex: 1 }} />
              <button
                style={styles.copyButton(copiedId === selectedAnimation.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  // Use type-aware formatting for the copy
                  const code = getCompleteCss(selectedAnimation);
                  handleCopy(code, selectedAnimation.id);
                }}
              >
                {copiedId === selectedAnimation.id ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {activeTab === 'overview' ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* Easing curve visualization */}
                <div style={{ flexShrink: 0 }}>
                  <EasingCurve
                    easing={selectedAnimation.timingFunction}
                    width={90}
                    height={90}
                    showHandles={true}
                    showLinear={true}
                  />
                </div>

                {/* Timing info grid */}
                <div style={{ ...styles.detailGrid, flex: 1 }}>
                  <div style={styles.detailCard}>
                    <div style={styles.detailLabel}>Duration</div>
                    <div style={styles.detailValue}>{formatDuration(selectedAnimation.duration)}</div>
                  </div>
                  <div style={styles.detailCard}>
                    <div style={styles.detailLabel}>Delay</div>
                    <div style={styles.detailValue}>{formatDuration(selectedAnimation.delay)}</div>
                  </div>
                  <div style={styles.detailCard}>
                    <div style={styles.detailLabel}>Iterations</div>
                    <div style={styles.detailValue}>
                      {selectedAnimation.iterationCount === 'infinite' ? 'Infinite' : selectedAnimation.iterationCount}
                    </div>
                  </div>
                  <div style={styles.detailCard}>
                    <div style={styles.detailLabel}>Easing</div>
                    <div style={{
                      ...styles.detailValue,
                      fontSize: '11px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {formatTiming(selectedAnimation.timingFunction)}
                    </div>
                  </div>
                  <div style={{ ...styles.detailCard, gridColumn: '1 / -1' }}>
                    <div style={styles.detailLabel}>Element</div>
                    <div style={{
                      ...styles.detailValue,
                      fontFamily: '"Fira Code", monospace',
                      fontSize: '11px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {selectedAnimation.selector}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.codeBlock}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {formatAnimationProperty(selectedAnimation)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inspect mode tooltip - rendered outside panel but in shadow DOM */}
      {inspectModeEnabled && inspectTooltipAnims.length > 0 && (
        <InspectTooltip animations={inspectTooltipAnims} position={tooltipPosition} />
      )}
    </div>
  );
}
