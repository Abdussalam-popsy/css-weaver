import { useAnimationStore } from '../../store/animationStore';
import HTMLTreeNode from './HTMLTreeNode';

export default function HTMLStructure() {
  const { domTree, loading, fetchDOMTree } = useAnimationStore();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!domTree) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2 border-b border-weaver-border">
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            HTML Structure
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
          <p className="text-sm mb-2 text-center">No structure available</p>
          <button
            onClick={fetchDOMTree}
            className="text-xs text-weaver-accent hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-weaver-border shrink-0">
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          HTML Structure
        </span>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <HTMLTreeNode node={domTree} />
      </div>
    </div>
  );
}
