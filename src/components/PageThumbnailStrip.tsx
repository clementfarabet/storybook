import React from 'react';
import { Plus } from 'lucide-react';
import { StoryPage } from '../types';

interface PageThumbnailStripProps {
  pages: StoryPage[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddNewPage: () => void;
}

export const PageThumbnailStrip: React.FC<PageThumbnailStripProps> = ({
  pages,
  currentPageIndex,
  onSelectPage,
  onAddNewPage,
}) => {
  return (
    <div className="py-2 flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
      {pages.map((page, idx) => {
        const isCurrent = idx === currentPageIndex;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPage(idx)}
            className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-transform group ${
              isCurrent
                ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 scale-105 shadow-md'
                : 'border-[var(--rule)] opacity-75 hover:opacity-100 hover:border-[var(--ink-3)]'
            }`}
          >
            {page.imageData ? (
              <img
                src={page.imageData}
                alt={page.pageTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[var(--paper-2)] flex items-center justify-center font-mono text-xs text-[var(--ink-3)]">
                P.{idx + 1}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent py-0.5 px-1 text-center">
              <span className="text-xs font-mono font-semibold text-white">
                {idx + 1}
              </span>
            </div>
          </button>
        );
      })}

      {/* Add Page Button */}
      <button
        type="button"
        onClick={onAddNewPage}
        className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-[var(--rule)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/50 text-[var(--ink-3)] hover:text-[var(--accent)] flex flex-col items-center justify-center gap-1 transition-colors"
        title="Add new page"
      >
        <Plus className="w-5 h-5" />
        <span className="text-xs font-sans font-medium">Add Page</span>
      </button>
    </div>
  );
};
