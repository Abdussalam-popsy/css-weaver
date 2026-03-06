import { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-css';
import { useAnimationStore } from '../store/animationStore';
import type { Animation } from '../../shared/types';
import {
  formatAnimationProperty,
  getKeyframesCss,
  getCompleteCss,
} from '../utils/cssFormatting';
import {
  interpolateKeyframeValues,
  findSurroundingKeyframes,
} from '../utils/interpolation';

/**
 * Copy icon component
 */
function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
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
      width="14"
      height="14"
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
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M15 5L5 15M5 5L15 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-weaver-panel/50">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {title}
        </span>
        <button
          onClick={onCopy}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
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

      {/* Code */}
      <pre className="p-3 overflow-x-auto text-sm leading-relaxed m-0 bg-weaver-bg">
        <code ref={codeRef} className="language-css">
          {code}
        </code>
      </pre>
    </div>
  );
}

/**
 * Current frame display when scrubbing
 */
interface CurrentFrameProps {
  animation: Animation;
  position: number;
}

function CurrentFrameDisplay({ animation, position }: CurrentFrameProps) {
  if (!animation.keyframes || animation.keyframes.length === 0) {
    return null;
  }

  const percentage = Math.round(position * 100);
  const interpolatedValues = interpolateKeyframeValues(
    animation.keyframes,
    position
  );
  const { prevKeyframe, nextKeyframe } = findSurroundingKeyframes(
    animation.keyframes,
    position
  );

  return (
    <div className="border-b border-weaver-border">
      <div className="flex items-center justify-between px-3 py-2 bg-yellow-400/10">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Scrub Position:{' '}
          <span className="text-yellow-400 font-medium">{percentage}%</span>
        </span>
        {prevKeyframe && nextKeyframe && (
          <span className="text-xs text-gray-500">
            Between {Math.round(prevKeyframe.offset * 100)}% and{' '}
            {Math.round(nextKeyframe.offset * 100)}%
          </span>
        )}
      </div>

      <div className="p-3 bg-weaver-bg/50 space-y-1 max-h-32 overflow-auto">
        {Object.entries(interpolatedValues).map(([prop, value]) => (
          <div key={prop} className="flex items-center text-sm font-mono">
            <span className="text-blue-400">{prop}</span>
            <span className="text-gray-500 mx-2">:</span>
            <span className="text-gray-300">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main AnimationDetails component
 */
export default function AnimationDetails() {
  const {
    animations,
    selectedAnimationId,
    setSelectedAnimation,
    scrubPosition,
    scrubAnimationId,
  } = useAnimationStore();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const animation = animations.find((a) => a.id === selectedAnimationId);

  if (!animation) return null;

  const isBeingScrubbed = scrubAnimationId === animation.id;

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const animationPropertyCss = formatAnimationProperty(animation);
  const keyframesCss = getKeyframesCss(animation);
  const completeCss = getCompleteCss(animation);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-weaver-panel border-t border-weaver-border shadow-2xl animate-slide-up max-h-[60vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-weaver-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-weaver-accent font-semibold">
            {animation.name}
          </span>
          <span className="text-gray-500 text-sm">on</span>
          <code className="text-gray-300 text-sm bg-weaver-bg px-2 py-0.5 rounded">
            {animation.selector}
          </code>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              animation.type === 'animation'
                ? 'bg-weaver-accent/20 text-weaver-accent'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {animation.type}
          </span>
        </div>
        <button
          onClick={() => setSelectedAnimation(null)}
          className="text-gray-400 hover:text-white p-1 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-auto">
        {/* Current frame display when scrubbing */}
        {isBeingScrubbed && (
          <CurrentFrameDisplay animation={animation} position={scrubPosition} />
        )}

        {/* Animation Property Section */}
        <CodeSection
          title={
            animation.type === 'animation'
              ? 'Animation Property'
              : 'Transition Property'
          }
          code={animationPropertyCss}
          onCopy={() =>
            copyToClipboard(animationPropertyCss, 'property')
          }
          copied={copiedSection === 'property'}
        />

        {/* Keyframes Section - only for CSS animations */}
        {animation.type === 'animation' && animation.keyframes && (
          <CodeSection
            title={`@keyframes ${animation.name}`}
            code={keyframesCss}
            onCopy={() => copyToClipboard(keyframesCss, 'keyframes')}
            copied={copiedSection === 'keyframes'}
          />
        )}

        {/* Quick info section */}
        <div className="p-3 border-b border-weaver-border bg-weaver-bg/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500 block">Duration</span>
              <span className="text-gray-300">{animation.duration}ms</span>
            </div>
            <div>
              <span className="text-gray-500 block">Delay</span>
              <span className="text-gray-300">{animation.delay}ms</span>
            </div>
            <div>
              <span className="text-gray-500 block">Timing</span>
              <span className="text-gray-300">{animation.timingFunction}</span>
            </div>
            {animation.type === 'animation' && (
              <div>
                <span className="text-gray-500 block">Iterations</span>
                <span className="text-gray-300">
                  {animation.iterationCount === 'infinite'
                    ? 'infinite'
                    : animation.iterationCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy All Button */}
      <div className="p-3 border-t border-weaver-border shrink-0">
        <button
          onClick={() => copyToClipboard(completeCss, 'all')}
          className="w-full py-2.5 bg-weaver-accent hover:bg-weaver-accent/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {copiedSection === 'all' ? (
            <>
              <CheckIcon /> Copied to Clipboard
            </>
          ) : (
            <>
              <CopyIcon /> Copy All CSS
            </>
          )}
        </button>
      </div>
    </div>
  );
}
