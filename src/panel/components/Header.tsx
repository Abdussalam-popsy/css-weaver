import { useState } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { exportAllAsCSS, downloadFile, generateFilename } from '../utils/export';

/**
 * Download icon component
 */
function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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

export default function Header() {
  const { sourceUrl, animations, scanAnimations, loading } = useAnimationStore();
  const [exported, setExported] = useState(false);

  return (
    <header className="bg-weaver-panel border-b border-weaver-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Logo - staggered bars */}
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-weaver-accent">
            <rect x="2" y="6" width="8" height="3" rx="1.5" fill="currentColor" />
            <rect x="5" y="11" width="10" height="3" rx="1.5" fill="currentColor" />
            <rect x="8" y="16" width="8" height="3" rx="1.5" fill="currentColor" />
          </svg>
          <span className="font-semibold text-white">CSS Weaver</span>
        </div>

        {sourceUrl && (
          <>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400 text-sm truncate max-w-md">
              {sourceUrl}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-gray-400 text-sm">
          {animations.length} animation{animations.length !== 1 ? 's' : ''} found
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const css = exportAllAsCSS(animations);
              const filename = generateFilename(sourceUrl);
              downloadFile(css, filename);
              setExported(true);
              setTimeout(() => setExported(false), 2000);
            }}
            disabled={animations.length === 0}
            className="px-3 py-1.5 text-sm bg-weaver-panel border border-weaver-border hover:border-weaver-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1.5"
            title="Export all animations as CSS file"
          >
            {exported ? (
              <>
                <CheckIcon /> Exported
              </>
            ) : (
              <>
                <DownloadIcon /> Export CSS
              </>
            )}
          </button>

          <button
            onClick={() => scanAnimations()}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-weaver-accent hover:bg-weaver-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {loading ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
      </div>
    </header>
  );
}
