import React, { useEffect } from 'react';
import { X, Palette, Users, Sparkles } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { AgeSelector } from './AgeSelector';
import { Theme, AgeGroup } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  currentAgeGroup: AgeGroup;
  onSelectAgeGroup: (age: AgeGroup) => void;
  pageCount: number;
  onRethemeBook: (newTheme: Theme) => Promise<void>;
  isRetheming: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  currentAgeGroup,
  onSelectAgeGroup,
  pageCount,
  onRethemeBook,
  isRetheming,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[var(--scrim)] transition-opacity backdrop-blur-xs"
      />

      {/* Drawer / Sidebar container */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--paper)] border-l border-[var(--rule)] shadow-2xl flex flex-col transition-transform duration-300">
        {/* Header */}
        <div className="h-16 px-6 border-b border-[var(--rule)] flex items-center justify-between shrink-0 bg-[var(--paper-2)]/60">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentTheme.badgeEmoji}</span>
            <h3 className="font-serif text-lg font-medium text-[var(--ink)]">
              Book Settings & Theme
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings drawer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--paper-3)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Theme Selector Section */}
          <section>
            <ThemeSelector
              currentTheme={currentTheme}
              onSelectTheme={onSelectTheme}
              pageCount={pageCount}
              onRethemeBook={onRethemeBook}
              isRetheming={isRetheming}
            />
          </section>

          <hr className="border-[var(--rule)]" />

          {/* Age Group Section */}
          <section>
            <AgeSelector
              currentAgeGroup={currentAgeGroup}
              onSelectAgeGroup={onSelectAgeGroup}
            />
          </section>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[var(--rule)] bg-[var(--paper-2)]/40 text-xs text-[var(--ink-3)] text-center font-mono">
          learnandplay.ai · Storybook AI
        </div>
      </aside>
    </>
  );
};
