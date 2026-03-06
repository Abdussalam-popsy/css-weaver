import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Animation } from '../../shared/types';
import { scanAnimations } from '../scanner';
import { highlightElement, clearHighlight } from '../highlighter';
import { getCachedAnimations, hasCachedAnimations, setCachedAnimations, getPageDetectedAnimations } from '../animationCache';
import { requestPageScan } from '../injected/inject';
import { formatAnimationProperty, getCompleteCss } from '../../panel/utils/cssFormatting';
import { colors, typography, radius, transitions, shadows, getTypeColorScheme, type TypeColorScheme } from '../../constants/designTokens';
import EasingCurve from '../../components/EasingCurve';

interface FloatingAppProps {
  onClose: () => void;
  onOpenTimeline?: () => void;
}

// Type label mapping
const TYPE_LABELS: Record<string, string> = {
  'animation': 'CSS',
  'transition': 'Trans',
  'gsap': 'GSAP',
  'web-animation': 'WAAPI',
  'framer-motion': 'Framer',
  'scroll-driven': 'Scroll',
};

function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

// Generate human-readable description of what the animation does
function getAnimationDescription(anim: Animation): string {
  const parts: string[] = [];
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
  } else if (anim.type === 'transition') {
    const prop = name.replace('transition: ', '');
    if (prop === 'all') {
      parts.push('Transitions');
    } else if (prop === 'transform') {
      parts.push('Transforms');
    } else {
      parts.push(`Animates ${prop}`);
    }
  } else {
    parts.push('Animates');
  }

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

  return parts.join(' ');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTiming(timing: string): string {
  if (timing.startsWith('cubic-bezier')) {
    return 'Custom';
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
      background: colors.bg.secondary,
      border: `1px solid ${colors.accent.border}`,
      borderRadius: radius.lg,
      padding: '10px 12px',
      zIndex: 2147483647,
      pointerEvents: 'none',
      boxShadow: `${shadows.lg}, ${shadows.glow.accent}`,
      maxWidth: '260px',
      backdropFilter: 'blur(8px)',
    }}>
      {animations.map((anim, i) => {
        const scheme = getTypeColorScheme(anim.type);
        return (
          <div key={anim.id} style={{ marginBottom: i < animations.length - 1 ? '8px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{
                padding: '2px 5px',
                borderRadius: radius.sm,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                background: scheme.bg,
                color: scheme.color,
                letterSpacing: typography.letterSpacing.wide,
                textTransform: 'uppercase',
              }}>
                {getTypeLabel(anim.type)}
              </span>
              <span style={{
                color: colors.text.primary,
                fontWeight: typography.fontWeight.medium,
                fontSize: typography.fontSize.base,
              }}>
                {anim.name.length > 24 ? anim.name.slice(0, 24) + '…' : anim.name}
              </span>
            </div>
            <div style={{
              color: colors.text.tertiary,
              fontSize: typography.fontSize.xs,
              fontFamily: typography.fontFamily.mono,
            }}>
              {anim.duration}ms · {anim.timingFunction}
            </div>
          </div>
        );
      })}
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: `1px solid ${colors.border.default}`,
        color: colors.text.tertiary,
        fontSize: typography.fontSize.xs,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 15l6 6m-11-4a7 7 0 110-14 7 7 0 010 14z" />
        </svg>
        Click to inspect
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
  const [inspectModeEnabled, setInspectModeEnabled] = useState(false);
  const [inspectTooltipAnims, setInspectTooltipAnims] = useState<Animation[]>([]);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Scan animations on mount
  useEffect(() => {
    const loadAnimations = async () => {
      if (hasCachedAnimations()) {
        setAnimations(getCachedAnimations());
        setLoading(false);
        return;
      }

      try {
        await requestPageScan();
        await new Promise(resolve => setTimeout(resolve, 250));
        const cssAnimations = scanAnimations();
        const pageDetectedAnims = getPageDetectedAnimations();
        const pageAnims = pageDetectedAnims.filter(pageAnim =>
          !cssAnimations.some(cssAnim => cssAnim.id === pageAnim.id)
        );
        const allAnimations = [...cssAnimations, ...pageAnims];
        setCachedAnimations(allAnimations);
        setAnimations(allAnimations);
      } catch (error) {
        console.error('CSS Weaver: Error loading animations', error);
        setAnimations(scanAnimations());
      }
      setLoading(false);
    };

    loadAnimations();
  }, []);

  // Inspect mode handler
  useEffect(() => {
    if (!inspectModeEnabled) {
      setInspectTooltipAnims([]);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#css-weaver-floating-root')) {
        setInspectTooltipAnims([]);
        return;
      }

      const animatedEl = target.closest('[data-css-weaver-id]') as HTMLElement;
      if (animatedEl) {
        const animIds = animatedEl.dataset.cssWeaverId?.split(',') || [];
        const matchedAnims = animations.filter(a => animIds.includes(a.id));
        if (matchedAnims.length > 0) {
          setInspectTooltipAnims(matchedAnims);
          setTooltipPosition({ x: e.clientX, y: e.clientY });
          highlightElement(matchedAnims[0].id);
        } else {
          setInspectTooltipAnims([]);
        }
      } else {
        setInspectTooltipAnims([]);
        if (!selectedId) clearHighlight();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#css-weaver-floating-root')) return;

      const animatedEl = target.closest('[data-css-weaver-id]') as HTMLElement;
      if (animatedEl) {
        const animIds = animatedEl.dataset.cssWeaverId?.split(',') || [];
        const matchedAnims = animations.filter(a => animIds.includes(a.id));
        if (matchedAnims.length > 0) {
          setSelectedId(matchedAnims[0].id);
          setExpandedDetails(true);
          highlightElement(matchedAnims[0].id);
          setInspectModeEnabled(false);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.body.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.body.style.cursor = '';
      setInspectTooltipAnims([]);
    };
  }, [inspectModeEnabled, animations, selectedId]);

  const animationTypes = useMemo(() => {
    const types = new Set(animations.map(a => a.type));
    return Array.from(types);
  }, [animations]);

  const filteredAnimations = useMemo(() => {
    return animations.filter((anim) => {
      if (typeFilter !== 'all' && anim.type !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !anim.name.toLowerCase().includes(query) &&
          !anim.selector.toLowerCase().includes(query) &&
          !anim.tagName.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [animations, typeFilter, searchQuery]);

  const timelineMetrics = useMemo(() => {
    if (filteredAnimations.length === 0) return { maxDuration: 1000, totalDuration: 1000 };
    const maxEnd = Math.max(...filteredAnimations.map(a => a.endTime));
    return { maxDuration: maxEnd, totalDuration: maxEnd };
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
      await requestPageScan();
      await new Promise(resolve => setTimeout(resolve, 250));
      const cssAnimations = scanAnimations();
      const pageDetectedAnims = getPageDetectedAnimations();
      const pageAnims = pageDetectedAnims.filter(pageAnim =>
        !cssAnimations.some(cssAnim => cssAnim.id === pageAnim.id)
      );
      const allAnimations = [...cssAnimations, ...pageAnims];
      setCachedAnimations(allAnimations);
      setAnimations(allAnimations);
    } catch (error) {
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

  // Refined styles using design tokens
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
      background: colors.bg.primary,
      color: colors.text.primary,
      fontSize: typography.fontSize.base,
      fontFamily: typography.fontFamily.sans,
      letterSpacing: typography.letterSpacing.normal,
    },
    toolbar: {
      display: 'flex',
      gap: '8px',
      padding: '10px 12px',
      borderBottom: `1px solid ${colors.border.default}`,
      background: colors.bg.secondary,
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
      color: colors.text.disabled,
      pointerEvents: 'none' as const,
    },
    input: {
      width: '100%',
      padding: '8px 10px 8px 32px',
      borderRadius: radius.lg,
      border: `1px solid ${colors.border.default}`,
      background: colors.bg.tertiary,
      color: colors.text.primary,
      fontSize: typography.fontSize.base,
      outline: 'none',
      transition: transitions.fast,
    },
    select: {
      padding: '8px 10px',
      borderRadius: radius.lg,
      border: `1px solid ${colors.border.default}`,
      background: colors.bg.tertiary,
      color: colors.text.primary,
      fontSize: typography.fontSize.base,
      outline: 'none',
      cursor: 'pointer',
      transition: transitions.fast,
    },
    button: {
      padding: '8px 12px',
      borderRadius: radius.lg,
      border: 'none',
      background: colors.accent.primary,
      color: '#ffffff',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      cursor: 'pointer',
      transition: transitions.fast,
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    },
    buttonGhost: {
      padding: '8px 12px',
      borderRadius: radius.lg,
      border: `1px solid ${colors.border.default}`,
      background: 'transparent',
      color: colors.text.secondary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      cursor: 'pointer',
      transition: transitions.fast,
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    },
    stats: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 12px',
      borderBottom: `1px solid ${colors.border.subtle}`,
      fontSize: typography.fontSize.xs,
      color: colors.text.tertiary,
    },
    list: {
      flex: 1,
      overflow: 'auto',
      padding: '6px',
    },
    item: (isSelected: boolean, scheme: TypeColorScheme) => ({
      marginBottom: '4px',
      borderRadius: radius.lg,
      background: isSelected ? scheme.bg : colors.bg.secondary,
      border: `1px solid ${isSelected ? scheme.border : colors.border.subtle}`,
      cursor: 'pointer',
      transition: transitions.fast,
      overflow: 'hidden',
    }),
    itemHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 12px',
    },
    badge: (scheme: TypeColorScheme) => ({
      padding: '2px 5px',
      borderRadius: radius.sm,
      fontSize: '9px',
      fontWeight: typography.fontWeight.semibold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      background: scheme.bg,
      color: scheme.color,
      whiteSpace: 'nowrap' as const,
    }),
    miniTimeline: {
      height: '3px',
      background: colors.bg.primary,
      borderRadius: '1.5px',
      margin: '0 12px 8px 12px',
      position: 'relative' as const,
      overflow: 'hidden',
    },
    miniTimelineBar: (start: number, width: number, color: string) => ({
      position: 'absolute' as const,
      left: `${start}%`,
      width: `${Math.max(width, 3)}%`,
      height: '100%',
      background: color,
      borderRadius: '1.5px',
    }),
    details: {
      borderTop: `1px solid ${colors.border.default}`,
      background: colors.bg.secondary,
      maxHeight: expandedDetails ? '300px' : '0',
      overflow: 'hidden',
      transition: 'max-height 0.25s ease',
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
      borderRadius: radius.md,
      border: 'none',
      background: isActive ? colors.accent.muted : 'transparent',
      color: isActive ? colors.accent.primary : colors.text.tertiary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      cursor: 'pointer',
      transition: transitions.fast,
    }),
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '6px',
    },
    detailCard: {
      padding: '8px 10px',
      borderRadius: radius.md,
      background: colors.bg.tertiary,
      border: `1px solid ${colors.border.subtle}`,
    },
    detailLabel: {
      fontSize: '9px',
      color: colors.text.disabled,
      marginBottom: '2px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      fontWeight: typography.fontWeight.medium,
    },
    detailValue: {
      fontSize: typography.fontSize.md,
      color: colors.text.primary,
      fontWeight: typography.fontWeight.semibold,
    },
    codeBlock: {
      padding: '12px',
      background: colors.bg.tertiary,
      borderRadius: radius.lg,
      border: `1px solid ${colors.border.subtle}`,
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.sm,
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-all' as const,
      maxHeight: '140px',
      overflow: 'auto',
      lineHeight: typography.lineHeight.relaxed,
      color: colors.text.secondary,
    },
    copyButton: (isCopied: boolean) => ({
      padding: '6px 10px',
      borderRadius: radius.md,
      border: `1px solid ${isCopied ? colors.success.border : colors.border.default}`,
      background: isCopied ? colors.success.muted : 'transparent',
      color: isCopied ? colors.success.primary : colors.text.tertiary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      transition: transitions.fast,
    }),
    empty: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: colors.text.tertiary,
      textAlign: 'center' as const,
      padding: '32px 24px',
    },
    emptyIcon: {
      width: '48px',
      height: '48px',
      borderRadius: radius.xl,
      background: colors.bg.tertiary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
      color: colors.text.disabled,
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={{ ...styles.emptyIcon, animation: 'pulse 2s ease-in-out infinite' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32">
                <animate attributeName="stroke-dashoffset" values="32;0" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          <div style={{ fontWeight: typography.fontWeight.medium, marginBottom: '4px', color: colors.text.secondary }}>
            Scanning animations…
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
            Analyzing CSS, transitions & libraries
          </div>
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
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.input}
            onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent.border; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = colors.border.default; }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.select}
          onFocus={(e) => { e.currentTarget.style.borderColor = colors.accent.border; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = colors.border.default; }}
        >
          <option value="all">All</option>
          {animationTypes.map(type => (
            <option key={type} value={type}>{getTypeLabel(type)}</option>
          ))}
        </select>
        <button
          onClick={handleRescan}
          style={styles.button}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Scan
        </button>
      </div>

      {/* Stats bar */}
      <div style={styles.stats}>
        <span>
          <strong style={{ color: colors.text.secondary }}>{filteredAnimations.length}</strong>
          {' '}of {animations.length} animations
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {animationTypes.slice(0, 3).map(type => {
            const count = animations.filter(a => a.type === type).length;
            const scheme = getTypeColorScheme(type);
            return (
              <span key={type} style={{ color: scheme.color }}>
                {count} {getTypeLabel(type)}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              )}
            </div>
            <div style={{ fontWeight: typography.fontWeight.medium, marginBottom: '4px', color: colors.text.secondary }}>
              {animations.length === 0 ? 'No animations found' : 'No matches'}
            </div>
            <div style={{ fontSize: typography.fontSize.sm, marginBottom: '16px' }}>
              {animations.length === 0
                ? 'This page doesn\'t have any CSS animations'
                : 'Try adjusting your search or filter'}
            </div>
            {animations.length === 0 && (
              <button
                onClick={handleRescan}
                style={styles.button}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Rescan Page
              </button>
            )}
          </div>
        ) : (
          filteredAnimations.map((anim) => {
            const scheme = getTypeColorScheme(anim.type);
            const isSelected = selectedId === anim.id;
            const timelineStart = (anim.startTime / timelineMetrics.totalDuration) * 100;
            const timelineWidth = ((anim.endTime - anim.startTime) / timelineMetrics.totalDuration) * 100;

            return (
              <div
                key={anim.id}
                style={styles.item(isSelected, scheme)}
                onClick={() => handleSelect(anim)}
                onMouseEnter={(e) => {
                  handleHover(anim);
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = colors.border.strong;
                    e.currentTarget.style.background = colors.bg.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  handleHoverEnd();
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = colors.border.subtle;
                    e.currentTarget.style.background = colors.bg.secondary;
                  }
                }}
              >
                <div style={styles.itemHeader}>
                  <span style={styles.badge(scheme)}>
                    {getTypeLabel(anim.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: typography.fontWeight.medium,
                      fontSize: typography.fontSize.base,
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: colors.text.primary,
                    }}>
                      {anim.tagName.toLowerCase()}
                      {anim.selector.includes('.') && (
                        <span style={{ color: colors.text.tertiary, fontWeight: typography.fontWeight.normal }}>
                          .{anim.selector.split('.').pop()?.split(/[\s:[\]>+~]/)[0]}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.disabled,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {getAnimationDescription(anim)}
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: typography.fontSize.sm,
                    color: colors.text.tertiary,
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                      {formatDuration(anim.duration)}
                    </div>
                    {anim.delay > 0 && (
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.disabled }}>
                        +{formatDuration(anim.delay)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.miniTimeline}>
                  <div style={styles.miniTimelineBar(timelineStart, timelineWidth, scheme.color)} />
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
                  const code = getCompleteCss(selectedAnimation);
                  handleCopy(code, selectedAnimation.id);
                }}
              >
                {copiedId === selectedAnimation.id ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {activeTab === 'overview' ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flexShrink: 0 }}>
                  <EasingCurve
                    easing={selectedAnimation.timingFunction}
                    width={80}
                    height={80}
                    showHandles={true}
                    showLinear={true}
                  />
                </div>
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
                      {selectedAnimation.iterationCount === 'infinite' ? '∞' : selectedAnimation.iterationCount}
                    </div>
                  </div>
                  <div style={styles.detailCard}>
                    <div style={styles.detailLabel}>Easing</div>
                    <div style={{ ...styles.detailValue, fontSize: typography.fontSize.sm }}>
                      {formatTiming(selectedAnimation.timingFunction)}
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

      {inspectModeEnabled && inspectTooltipAnims.length > 0 && (
        <InspectTooltip animations={inspectTooltipAnims} position={tooltipPosition} />
      )}
    </div>
  );
}
