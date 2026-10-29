import React, { useState } from 'react';
import { BookOpen, Download, Plus, Moon, Sun, Mic, Menu, X, Sparkles } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--rule)] transition-colors w-full">
      <div className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
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
        <div className="flex justify-center shrink-0">
          <nav
            role="group"
            aria-label="View selector"
            className="inline-flex items-center rounded-full p-1 border border-[var(--rule)] bg-[var(--paper-2)]"
          >
            <button
              type="button"
              onClick={() => onSelectViewMode('read')}
              aria-pressed={viewMode === 'read'}
              className="min-h-[44px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
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
              className="min-h-[44px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              style={
                viewMode === 'narrate'
                  ? { backgroundColor: 'var(--ink)', color: 'var(--paper)' }
                  : { color: 'var(--ink-2)' }
              }
            >
              <Mic className="w-3.5 h-3.5" />
              <span style={{ color: viewMode === 'narrate' ? 'var(--paper)' : 'inherit' }}>
                {book.pages.length === 0 ? 'Create' : 'Add Page'}
              </span>
            </button>
          </nav>
        </div>

        {/* Right Desktop: Pill Actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Theme & Age pill button */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className={`min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isSidebarOpen
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
                : 'bg-[var(--paper-2)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--paper-3)]'
            }`}
            title="Book theme and age group settings"
            aria-label="Theme and age settings"
          >
            <span className="text-sm">{book.theme.badgeEmoji}</span>
            <span className="font-sans">Theme & Age</span>
          </button>

          {/* Export PDF pill button */}
          <button
            type="button"
            onClick={onOpenExportModal}
            disabled={book.pages.length === 0}
            className="btn-accent min-h-[44px] min-w-[44px] px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            title="Export as Print-Ready PDF"
            aria-label="Export as Print-Ready PDF"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent-contrast)]" />
            <span className="text-[var(--accent-contrast)]">Export PDF</span>
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

          {/* Theme Switcher Pill */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-full text-xs font-medium border border-[var(--rule)] bg-[var(--paper-2)] hover:bg-[var(--paper-3)] text-[var(--ink-2)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light Paper' : 'Dark Ink'}`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light Paper' : 'Dark Ink'}`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="font-sans">
              {theme === 'dark' ? 'Paper' : 'Ink'}
            </span>
          </button>
        </div>

        {/* Right Mobile: Menu Button */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-full border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink)] hover:bg-[var(--paper-3)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            aria-label={isMobileMenuOpen ? 'Close story options menu' : 'Open story options menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="text-xs font-semibold">{book.theme.badgeEmoji}</span>
          </button>
        </div>
      </div>

      {/* Mobile Options Drawer Panel */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-label="Storybook Options Menu"
          className="md:hidden border-t border-[var(--rule)] bg-[var(--paper)] px-4 py-4 space-y-3 shadow-xl transition-all"
        >
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-3)] block">
              Story Actions
            </span>

            {/* Theme & Age Settings */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSidebar();
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] hover:bg-[var(--paper-3)] text-[var(--ink)] text-xs font-semibold flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{book.theme.badgeEmoji}</span>
                <span>Theme: {book.theme.name}</span>
              </div>
              <span className="text-[11px] text-[var(--accent)] font-medium">Change &rarr;</span>
            </button>

            {/* Export PDF */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenExportModal();
              }}
              disabled={book.pages.length === 0}
              className="btn-accent w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-[var(--accent-contrast)]" />
              <span className="text-[var(--accent-contrast)]">
                {book.pages.length === 0 ? 'Export PDF (Add a page first)' : `Export PDF (${book.pages.length} pages)`}
              </span>
            </button>

            {/* Start New Story */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNewStory();
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] hover:bg-[var(--paper-3)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Blank Story</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[var(--rule)] flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleTheme}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink)] text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              <span>{theme === 'dark' ? 'Switch to Light Paper' : 'Switch to Dark Ink'}</span>
            </button>

            <a
              href="/"
              className="text-xs text-[var(--ink-3)] hover:text-[var(--ink)] underline min-h-[44px] inline-flex items-center px-2"
            >
              learnandplay.ai &rarr;
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
