type AnimationFilter = 'all' | 'animation' | 'transition' | 'web-animation' | 'scroll-driven' | 'gsap';

interface TimelineControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: AnimationFilter;
  onTypeFilterChange: (filter: AnimationFilter) => void;
  totalCount: number;
  filteredCount: number;
}

export default function TimelineControls({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  totalCount,
  filteredCount,
}: TimelineControlsProps) {
  return (
    <div className="px-4 py-3 bg-weaver-panel border-b border-weaver-border flex items-center gap-3">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search animations..."
        className="flex-1 bg-weaver-bg text-white border border-weaver-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-weaver-accent placeholder-gray-500"
      />

      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value as AnimationFilter)}
        className="bg-weaver-bg text-white border border-weaver-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-weaver-accent"
      >
        <option value="all">All ({totalCount})</option>
        <option value="animation">CSS Keyframes</option>
        <option value="transition">CSS Transitions</option>
        <option value="web-animation">Web Animations</option>
        <option value="scroll-driven">Scroll-driven</option>
        <option value="gsap">GSAP</option>
      </select>

      {searchQuery && (
        <span className="text-xs text-gray-400">
          {filteredCount} / {totalCount}
        </span>
      )}
    </div>
  );
}
