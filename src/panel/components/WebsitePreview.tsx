import { useState } from 'react';
import { useAnimationStore } from '../store/animationStore';

export default function WebsitePreview() {
  const { sourceUrl, focusTargetTab } = useAnimationStore();
  const [hasError, setHasError] = useState(false);

  const handleIframeError = () => {
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="flex-1 border-b border-weaver-border bg-weaver-panel flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-yellow-400 text-sm mb-3">
            ⚠️ This website blocks embedding in iframes
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Many websites prevent being displayed in iframes for security.
          </p>
          <button
            onClick={focusTargetTab}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
          >
            Open Target Tab to View Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 border-b border-weaver-border bg-black min-h-0">
      {sourceUrl ? (
        <iframe
          src={sourceUrl}
          className="w-full h-full border-0"
          title="Website Preview"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          onError={handleIframeError}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p className="text-sm">Loading website preview...</p>
        </div>
      )}
    </div>
  );
}
