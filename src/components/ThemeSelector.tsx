import React, { useState } from 'react';
import { Palette, Sparkles, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Theme } from '../types';
import { PRESET_THEMES } from '../constants';

interface ThemeSelectorProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  pageCount: number;
  onRethemeBook: (newTheme: Theme) => Promise<void>;
  isRetheming: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
  pageCount,
  onRethemeBook,
  isRetheming,
}) => {
  const [customStyle, setCustomStyle] = useState('');
  const [customName, setCustomName] = useState('');
  const [showRethemeModal, setShowRethemeModal] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);

  const handleApplyTheme = (theme: Theme) => {
    if (pageCount > 0 && theme.id !== currentTheme.id) {
      setPendingTheme(theme);
      setShowRethemeModal(true);
    } else {
      onSelectTheme(theme);
    }
  };

  const handleCreateCustomTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStyle.trim()) return;

    const prohibited = /\b(horror|gore|blood|weapon|gun|knife|kill|murder|death|dead|zombie|demon|scary|terrifying|violent|nudity|erotic|drug)\b/i;
    if (prohibited.test(customStyle) || prohibited.test(customName)) {
      alert('Please use child-friendly, gentle words for your story theme!');
      return;
    }

    const newCustomTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: customName.trim() || 'Custom Freeform Style',
      description: customStyle.slice(0, 80),
      visualStylePrompt: customStyle.trim(),
      tonePrompt: 'Imaginative and matched to the custom theme style.',
      badgeEmoji: '✨',
      isCustom: true,
    };

    handleApplyTheme(newCustomTheme);
    setCustomStyle('');
    setCustomName('');
  };

  const confirmRetheme = async () => {
    if (!pendingTheme) return;
    setShowRethemeModal(false);
    await onRethemeBook(pendingTheme);
    setPendingTheme(null);
  };

  const applyOnlyForFuturePages = () => {
    if (pendingTheme) {
      onSelectTheme(pendingTheme);
      setPendingTheme(null);
      setShowRethemeModal(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
            Book Art Style & Theme
          </label>
        </div>
        <p className="text-xs text-[var(--ink-2)] mb-3">
          Sets the visual tone and illustration style for the entire book.
        </p>

        {/* Preset Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_THEMES.map((theme) => {
            const isSelected = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleApplyTheme(theme)}
                className={`p-2.5 rounded-xl border text-left transition-colors relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-xs'
                    : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink-3)]'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{theme.badgeEmoji}</span>
                    <span className="font-medium text-xs text-[var(--ink)] leading-snug">
                      {theme.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--ink-2)] line-clamp-2">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Freeform Custom Theme Creator */}
      <div className="pt-3 border-t border-[var(--rule)]">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          Create Freeform Custom Theme
        </label>
        <form onSubmit={handleCreateCustomTheme} className="space-y-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Theme Name (e.g. Neon Cyberpunk Kittens)"
            className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--paper-2)] border border-[var(--rule)] text-[var(--ink)] placeholder-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none"
          />
          <textarea
            value={customStyle}
            onChange={(e) => setCustomStyle(e.target.value)}
            rows={2}
            placeholder="Describe the art style (e.g., Chalk drawing on dark pavement, neon glows, cute cartoon characters, friendly atmosphere...)"
            className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--paper-2)] border border-[var(--rule)] text-[var(--ink)] placeholder-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={!customStyle.trim()}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-[var(--paper-3)] hover:bg-[var(--accent)] hover:text-white text-[var(--ink)] border border-[var(--rule)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply Custom Theme
          </button>
        </form>
      </div>

      {/* Retheme Confirmation Modal */}
      {showRethemeModal && pendingTheme && (
        <div className="fixed inset-0 z-50 bg-[var(--scrim)] flex items-center justify-center p-4">
          <div className="bg-[var(--paper)] max-w-sm w-full rounded-2xl p-5 border border-[var(--rule)] shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-medium text-[var(--ink)]">
                  Retheme Entire Book?
                </h3>
                <p className="text-xs text-[var(--ink-2)] mt-1">
                  You already have <strong className="text-[var(--ink)]">{pageCount} page{pageCount > 1 ? 's' : ''}</strong> in this book.
                  Would you like Gemini to re-illustrate all existing pages to match{' '}
                  <strong className="text-[var(--accent)]">{pendingTheme.name}</strong>?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={confirmRetheme}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retheme All {pageCount} Pages
              </button>
              <button
                type="button"
                onClick={applyOnlyForFuturePages}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium bg-[var(--paper-2)] text-[var(--ink)] hover:bg-[var(--paper-3)] border border-[var(--rule)] transition-colors"
              >
                Apply Only to Future Pages
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRethemeModal(false);
                  setPendingTheme(null);
                }}
                className="w-full py-1.5 text-xs text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retheming in progress overlay */}
      {isRetheming && (
        <div className="fixed inset-0 z-50 bg-[var(--scrim)] flex items-center justify-center p-4">
          <div className="bg-[var(--paper)] max-w-sm w-full rounded-2xl p-6 border border-[var(--rule)] shadow-2xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
            <h4 className="font-serif text-lg font-medium text-[var(--ink)]">
              Retheming Your Entire Book…
            </h4>
            <p className="text-xs text-[var(--ink-2)]">
              Gemini is repainting each page's illustration to harmonize with your new visual style.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
