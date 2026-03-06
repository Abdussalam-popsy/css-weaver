import { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import { useAnimationStore } from '../store/animationStore';
import {
  formatAnimationProperty,
  getKeyframesCss,
  getCompleteCss,
  getCompleteCodeWithHtml,
} from '../utils/cssFormatting';
import type { Animation } from '../../shared/types';
import { getTypeLabel, getTypeBadgeClass, getTypeFullLabel } from '../../constants/animationTypes';
import EasingCurve from '../../components/EasingCurve';

/**
 * Get the code section title based on animation type
 */
function getCodeSectionTitle(type: Animation['type']): string {
  // Use full label for code section title
  const fullLabel = getTypeFullLabel(type);
  if (type === 'animation') return 'CSS';
  if (type === 'scroll-driven') return 'Scroll-Driven CSS';
  return fullLabel;
}

/**
 * Copy icon component
 */
function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * Check icon component
 */
function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Close icon component
 */
function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Code section with syntax highlighting and copy button
 */
interface CodeSectionProps {
  title: string;
  code: string;
  onCopy: () => void;
  copied: boolean;
}

function CodeSection({ title, code, onCopy, copied }: CodeSectionProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <div className="border-b border-weaver-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-weaver-panel/50">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {title}
        </span>
        <button
          onClick={onCopy}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          {copied ? (
            <>
              <CheckIcon /> Copied
            </>
          ) : (
            <>
              <CopyIcon /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-2 overflow-x-auto text-xs leading-relaxed m-0 bg-weaver-bg max-h-32">
        <code ref={codeRef} className="language-css">
          {code}
        </code>
      </pre>
    </div>
  );
}

/**
 * Main DetailsSidebar component - collapsible panel beside timeline for animation details
 */
export default function DetailsSidebar() {
  const { animations, selectedAnimationId, toggleDetailsPanel } = useAnimationStore();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const animation = animations.find((a) => a.id === selectedAnimationId);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Empty state when no animation selected
  if (!animation) {
    return (
      <div className="h-full flex flex-col bg-weaver-panel">
        <div className="px-3 py-1.5 border-b border-weaver-border shrink-0 flex items-center justify-between">
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Animation Details
          </span>
          <button
            onClick={toggleDetailsPanel}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Close panel"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
          <p className="text-xs text-center">
            Select an animation from the timeline or tree to view details
          </p>
        </div>
      </div>
    );
  }

  const animationPropertyCss = formatAnimationProperty(animation);
  const keyframesCss = getKeyframesCss(animation);
  const completeCss = getCompleteCss(animation);
  const completeWithHtml = getCompleteCodeWithHtml(animation);

  return (
    <div className="h-full flex flex-col bg-weaver-panel">
      {/* Header with close button and animation name */}
      <div className="px-3 py-1.5 border-b border-weaver-border shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-weaver-accent font-semibold text-sm truncate">
            {animation.name}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${getTypeBadgeClass(animation.type)}`}
          >
            {getTypeLabel(animation.type)}
          </span>
        </div>
        <button
          onClick={toggleDetailsPanel}
          className="text-gray-400 hover:text-white transition-colors p-1 shrink-0"
          title="Close panel"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        {/* Quick stats with easing curve */}
        <div className="px-3 py-2 border-b border-weaver-border flex gap-3">
          {/* Easing curve visualization */}
          <div className="shrink-0">
            <EasingCurve
              easing={animation.timingFunction}
              width={64}
              height={64}
              showHandles={true}
              showLinear={true}
            />
          </div>

          {/* Timing stats */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs items-start content-start flex-1">
            <div>
              <span className="text-gray-500">Duration: </span>
              <span className="text-gray-300">{animation.duration}ms</span>
            </div>
            <div>
              <span className="text-gray-500">Delay: </span>
              <span className="text-gray-300">{animation.delay}ms</span>
            </div>
            <div>
              <span className="text-gray-500">Easing: </span>
              <span className="text-gray-300 font-mono text-[10px]">{animation.timingFunction}</span>
            </div>
            {animation.type === 'animation' && (
              <div>
                <span className="text-gray-500">Iterations: </span>
                <span className="text-gray-300">{animation.iterationCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Class/selector - compact */}
        <div className="px-3 py-1.5 border-b border-weaver-border">
          <code className="text-xs text-gray-400 block truncate" title={animation.selector}>
            {animation.selector}
          </code>
        </div>

        {/* Animation code section - type-aware title */}
        <CodeSection
          title={getCodeSectionTitle(animation.type)}
          code={animationPropertyCss}
          onCopy={() => copyToClipboard(animationPropertyCss, 'property')}
          copied={copiedSection === 'property'}
        />

        {/* Keyframes code (only for CSS animations with keyframes) */}
        {animation.type === 'animation' && animation.keyframes && (
          <CodeSection
            title={`@keyframes`}
            code={keyframesCss}
            onCopy={() => copyToClipboard(keyframesCss, 'keyframes')}
            copied={copiedSection === 'keyframes'}
          />
        )}
      </div>

      {/* Copy Buttons - compact */}
      <div className="p-2 border-t border-weaver-border shrink-0 flex gap-2">
        <button
          onClick={() => copyToClipboard(completeCss, 'all')}
          className="flex-1 py-1.5 bg-weaver-accent hover:bg-weaver-accent/90 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          {copiedSection === 'all' ? (
            <>
              <CheckIcon /> Copied
            </>
          ) : (
            <>
              <CopyIcon /> Copy Code
            </>
          )}
        </button>
        <button
          onClick={() => copyToClipboard(completeWithHtml, 'html')}
          className="flex-1 py-1.5 bg-weaver-panel border border-weaver-border hover:border-weaver-accent text-gray-300 hover:text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          {copiedSection === 'html' ? (
            <>
              <CheckIcon /> Copied
            </>
          ) : (
            <>
              <CopyIcon /> Copy with HTML
            </>
          )}
        </button>
      </div>
    </div>
  );
}
