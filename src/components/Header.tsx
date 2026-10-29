import React from 'react';
import { BookOpen, Download, Plus, Moon, Sun, Mic } from 'lucide-react';
import { StoryBook } from '../types';

interface HeaderProps {
  book: StoryBook;
  viewMode: 'read' | 'narrate';
  onSelectViewMode: (mode: 'read' | 'narrate') => void;
  onNewStory: () => void;
  onOpenExportModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  book,
  viewMode,
  onSelectViewMode,
  onNewStory,
  onOpenExportModal,
  theme,
  onToggleTheme,
  onOpenSidebar,
  isSidebarOpen,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--rule)] transition-colors w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Brand Identity matching LearnX and PolisAtlas */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectViewMode('read')}
            className="min-h-[44px] inline-flex items-center text-sm font-semibold tracking-tight text-[var(--ink)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            Storybook
          </button>
          <span className="text-xs text-[var(--ink-3)]">·</span>
          <a
            href="/"
            className="text-xs font-medium text-[var(--ink-3)] hover:text-[var(--ink)] hover:underline transition-colors"
          >
            learnandplay.ai
          </a>
        </div>

        {/* Center: Segmented Navigation Pill (Read Book vs Narrate Studio) */}
        <div className="order-last lg:order-none w-full lg:w-auto flex justify-center shrink-0">
          <nav
            role="group"
            aria-label="View selector"
            className="inline-flex items-center rounded-full p-1 border border-[var(--rule)] bg-[var(--paper-2)]"
          >
            <button
              type="button"
              onClick={() => onSelectViewMode('read')}
              aria-pressed={viewMode === 'read'}
              className="min-h-[44px] px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              style={
                viewMode === 'read'
                  ? { backgroundColor: 'var(--ink)', color: 'var(--paper)' }
                  : { color: 'var(--ink-2)' }
              }
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span style={{ color: viewMode === 'read' ? 'var(--paper)' : 'inherit' }}>Storybook</span>
              {book.pages.length > 0 && (
                <span
                  className="text-xs font-mono font-medium"
                  style={{ color: viewMode === 'read' ? 'var(--paper)' : 'var(--ink-2)' }}
                >
                  ({book.pages.length})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectViewMode('narrate')}
              aria-pressed={viewMode === 'narrate'}
              className="min-h-[44px] px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              style={
                viewMode === 'narrate'
                  ? { backgroundColor: 'var(--ink)', color: 'var(--paper)' }
                  : { color: 'var(--ink-2)' }
              }
            >
              <Mic className="w-3.5 h-3.5" />
              <span style={{ color: viewMode === 'narrate' ? 'var(--paper)' : 'inherit' }}>Narrate</span>
            </button>
          </nav>
        </div>

        {/* Right: Pill Actions (Theme & Age, Export, New, Theme Switcher) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-0">
          {/* Theme & Age pill button */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className={`min-h-[44px] min-w-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isSidebarOpen
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
                : 'bg-[var(--paper-2)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--paper-3)]'
            }`}
            title="Book theme and age group settings"
            aria-label="Theme and age settings"
          >
            <span className="text-sm">{book.theme.badgeEmoji}</span>
            <span className="hidden sm:inline font-sans">Theme & Age</span>
          </button>

          {/* Export PDF pill button */}
          <button
            type="button"
            onClick={onOpenExportModal}
            disabled={book.pages.length === 0}
            className="btn-accent min-h-[44px] min-w-[44px] px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            title="Export as Print-Ready PDF"
            aria-label="Export as Print-Ready PDF"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent-contrast)]" />
            <span className="hidden sm:inline text-[var(--accent-contrast)]">Export PDF</span>
          </button>

          {/* New Story (+) */}
          <button
            type="button"
            onClick={onNewStory}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-full text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] border border-[var(--rule)] transition-colors flex items-center justify-center cursor-pointer"
            title="Start a new story"
            aria-label="Start a new story"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Theme Switcher Pill matching LearnX / PolisAtlas */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-medium border border-[var(--rule)] bg-[var(--paper-2)] hover:bg-[var(--paper-3)] text-[var(--ink-2)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light Paper' : 'Dark Ink'}`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light Paper' : 'Dark Ink'}`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline font-sans">
              {theme === 'dark' ? 'Paper' : 'Ink'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
