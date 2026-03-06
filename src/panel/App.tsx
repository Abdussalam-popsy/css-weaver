import { useEffect } from "react";
import { useAnimationStore } from "./store/animationStore";
import Header from "./components/Header";
import Timeline from "./components/Timeline/Timeline";
import PreviewControls from "./components/PreviewControls";
import WebsitePreview from "./components/WebsitePreview";
import HTMLStructure from "./components/HTMLStructure";
import DetailsSidebar from "./components/DetailsSidebar";
import { usePlayback } from "./hooks/usePlayback";

function App() {
  const { loading, error, initializeFromSourceTab, fetchDOMTree, detailsPanelOpen } =
    useAnimationStore();

  // Initialize playback hook
  usePlayback();

  useEffect(() => {
    const init = async () => {
      await initializeFromSourceTab();
      // Fetch DOM tree after animations are loaded
      await fetchDOMTree();
    };
    init();
  }, [initializeFromSourceTab, fetchDOMTree]);

  return (
    <div className="h-screen bg-weaver-bg flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col min-h-0">
        {/* Top section: Left sidebar + Website Preview */}
        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar - HTML Structure (220px fixed) */}
          <aside
            className="border-r border-weaver-border bg-weaver-panel shrink-0"
            style={{ width: 220 }}
          >
            <HTMLStructure />
          </aside>

          {/* Center - Website Preview (full remaining width) */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Preview controls */}
            <PreviewControls />

            {/* Website preview area - now gets full center width */}
            <WebsitePreview />
          </div>
        </div>

        {/* Bottom section: Timeline + Animation Details side by side */}
        <div className="h-[250px] flex border-t border-weaver-border shrink-0">
          {/* Timeline (flexible width) */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Scanning for animations...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-red-400">{error}</div>
              </div>
            ) : (
              <Timeline />
            )}
          </div>

          {/* Animation Details Panel (collapsible, 350px when open) */}
          {detailsPanelOpen && (
            <aside
              className="border-l border-weaver-border bg-weaver-panel shrink-0"
              style={{ width: 350 }}
            >
              <DetailsSidebar />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
