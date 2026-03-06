import { useRef, useEffect } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import type { DOMTreeNode } from '../../../shared/types';

interface HTMLTreeNodeProps {
  node: DOMTreeNode;
}

export default function HTMLTreeNode({ node }: HTMLTreeNodeProps) {
  const {
    expandedNodeIds,
    toggleNodeExpanded,
    selectNodeAnimations,
    selectedAnimationId,
    highlightElement,
    clearHighlight,
  } = useAnimationStore();

  const nodeRef = useRef<HTMLDivElement>(null);

  const isExpanded = expandedNodeIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const hasAnimations = node.animationIds.length > 0;

  // Check if any of this node's animations are selected
  const isSelected = node.animationIds.includes(selectedAnimationId || '');

  // Scroll into view when selected (e.g., from timeline click)
  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };

  const handleSelect = () => {
    if (hasAnimations) {
      selectNodeAnimations(node.id);
    }
  };

  const handleMouseEnter = () => {
    if (hasAnimations && node.animationIds[0]) {
      highlightElement(node.animationIds[0]);
    }
  };

  const handleMouseLeave = () => {
    clearHighlight();
  };

  // Build display label
  const displayClass = node.classList.length > 0 ? `.${node.classList[0]}` : '';
  const label = `${node.tagName}${displayClass}`;

  return (
    <div>
      <div
        ref={nodeRef}
        className={`
          flex items-center gap-1 py-1 px-2 rounded cursor-pointer text-sm
          ${isSelected ? 'bg-weaver-accent/20 text-weaver-accent' : 'hover:bg-weaver-panel'}
          ${hasAnimations ? 'text-white' : 'text-gray-500'}
        `}
        style={{ paddingLeft: `${node.depth * 12 + 8}px` }}
        onClick={handleSelect}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Expand/collapse arrow */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6 6L14 10L6 14V6Z" />
            </svg>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Tag name */}
        <span className="font-mono text-xs truncate">
          {label}
        </span>

        {/* Animation indicator */}
        {hasAnimations && (
          <span className="ml-auto text-xs bg-weaver-accent/30 text-weaver-accent px-1.5 rounded shrink-0">
            {node.animationIds.length}
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <HTMLTreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
