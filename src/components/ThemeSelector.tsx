import React, { useState } from 'react';
import { Palette, Sparkles, Check } from 'lucide-react';
import { Theme } from '../types';
import { PRESET_THEMES } from '../constants';

interface ThemeSelectorProps {
  selectedTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  selectedTheme,
  onSelectTheme,
}) => {
  const [customStyle, setCustomStyle] = useState('');
  const [customName, setCustomName] = useState('');

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

    onSelectTheme(newCustomTheme);
    setCustomStyle('');
    setCustomName('');
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
            const isSelected = selectedTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectTheme(theme)}
                className={`p-2.5 rounded-xl border text-left transition-colors relative flex flex-col justify-between cursor-pointer ${
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
            className="w-full min-h-[44px] py-2 px-3 rounded-lg text-xs font-medium bg-[var(--paper-3)] hover:bg-[var(--accent)] hover:text-white text-[var(--ink)] border border-[var(--rule)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Stage Custom Theme
          </button>
        </form>
      </div>
    </div>
  );
};
