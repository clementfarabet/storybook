import React, { useState, useEffect } from 'react';
import { X, Check, RefreshCw } from 'lucide-react';
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
  const [stagedTheme, setStagedTheme] = useState<Theme>(currentTheme);
  const [stagedAgeGroup, setStagedAgeGroup] = useState<AgeGroup>(currentAgeGroup);
  const [showRethemeModal, setShowRethemeModal] = useState(false);

  // Sync staged selections whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      setStagedTheme(currentTheme);
      setStagedAgeGroup(currentAgeGroup);
      setShowRethemeModal(false);
    }
  }, [isOpen, currentTheme, currentAgeGroup]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRetheming && !showRethemeModal) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isRetheming, showRethemeModal]);

  if (!isOpen) return null;

  const hasChanges =
    stagedTheme.id !== currentTheme.id || stagedAgeGroup !== currentAgeGroup;

  const handleApplyClick = () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    const themeChanged = stagedTheme.id !== currentTheme.id;

    if (themeChanged && pageCount > 0) {
      setShowRethemeModal(true);
      return;
    }

    // Direct apply if no existing pages or only age changed
    if (themeChanged) onSelectTheme(stagedTheme);
    if (stagedAgeGroup !== currentAgeGroup) onSelectAgeGroup(stagedAgeGroup);
    onClose();
  };

  const handleConfirmRethemeAll = async () => {
    setShowRethemeModal(false);
    if (stagedAgeGroup !== currentAgeGroup) {
      onSelectAgeGroup(stagedAgeGroup);
    }
    await onRethemeBook(stagedTheme);
    onClose();
  };

  const handleApplyForFutureOnly = () => {
    setShowRethemeModal(false);
    onSelectTheme(stagedTheme);
    if (stagedAgeGroup !== currentAgeGroup) {
      onSelectAgeGroup(stagedAgeGroup);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop scrim */}
      <div
        onClick={() => {
          if (!isRetheming) onClose();
        }}
        className="fixed inset-0 z-40 bg-[var(--scrim)] transition-opacity backdrop-blur-xs"
      />

      {/* Drawer / Sidebar container */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--paper)] border-l border-[var(--rule)] shadow-2xl flex flex-col transition-transform duration-300">
        {/* Header */}
        <div className="h-16 px-6 border-b border-[var(--rule)] flex items-center justify-between shrink-0 bg-[var(--paper-2)]/60">
          <div className="flex items-center gap-2">
            <span className="text-lg">{stagedTheme.badgeEmoji}</span>
            <h3 className="font-serif text-lg font-medium text-[var(--ink)]">
              Book Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRetheming}
            aria-label="Close settings drawer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--paper-3)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Theme Selector Section */}
          <section>
            <ThemeSelector
              selectedTheme={stagedTheme}
              onSelectTheme={setStagedTheme}
            />
          </section>

          <hr className="border-[var(--rule)]" />

          {/* Age Group Section */}
          <section>
            <AgeSelector
              currentAgeGroup={stagedAgeGroup}
              onSelectAgeGroup={setStagedAgeGroup}
            />
          </section>
        </div>

        {/* Sticky Apply Footer */}
        <div className="p-4 border-t border-[var(--rule)] bg-[var(--paper-2)]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--ink)] truncate">
              <span>{stagedTheme.badgeEmoji}</span>
              <span className="truncate">{stagedTheme.name}</span>
            </div>
            <div className="text-xs text-[var(--ink-2)] truncate capitalize">
              Target: {stagedAgeGroup.replace('-', ' ')}
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyClick}
            disabled={isRetheming}
            className="btn-accent min-h-[44px] px-6 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            {isRetheming ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Retheme Confirmation Modal */}
      {showRethemeModal && (
        <div className="fixed inset-0 z-60 bg-[var(--scrim)] flex items-center justify-center p-4">
          <div className="bg-[var(--paper)] max-w-sm w-full rounded-2xl p-5 border border-[var(--rule)] shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-medium text-[var(--ink)]">
                  Retheme Storybook?
                </h3>
                <p className="text-xs text-[var(--ink-2)] mt-1.5 leading-relaxed">
                  You selected <strong className="text-[var(--accent)]">{stagedTheme.badgeEmoji} {stagedTheme.name}</strong>.
                  Your book has <strong className="text-[var(--ink)]">{pageCount} page{pageCount > 1 ? 's' : ''}</strong>.
                  Would you like to restyle all existing pages, or apply this theme to future pages only?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmRethemeAll}
                className="w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restyle All {pageCount} Pages</span>
              </button>
              <button
                type="button"
                onClick={handleApplyForFutureOnly}
                className="w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-medium bg-[var(--paper-2)] text-[var(--ink)] hover:bg-[var(--paper-3)] border border-[var(--rule)] transition-colors cursor-pointer"
              >
                Apply for Future Pages Only
              </button>
              <button
                type="button"
                onClick={() => setShowRethemeModal(false)}
                className="w-full min-h-[44px] py-1.5 text-xs text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retheming in progress overlay */}
      {isRetheming && (
        <div className="fixed inset-0 z-70 bg-[var(--scrim)] flex items-center justify-center p-4">
          <div className="bg-[var(--paper)] max-w-sm w-full rounded-2xl p-6 border border-[var(--rule)] shadow-2xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
            <h4 className="font-serif text-lg font-medium text-[var(--ink)]">
              Retheming Your Entire Book…
            </h4>
            <p className="text-xs text-[var(--ink-2)]">
              Repainting illustrations to harmonize with your new visual theme.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
