import React from 'react';
import { Users, Check } from 'lucide-react';
import { AgeGroup } from '../types';
import { AGE_GROUPS } from '../constants';

interface AgeSelectorProps {
  currentAgeGroup: AgeGroup;
  onSelectAgeGroup: (ageGroup: AgeGroup) => void;
}

export const AgeSelector: React.FC<AgeSelectorProps> = ({
  currentAgeGroup,
  onSelectAgeGroup,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
          Audience & Age Group
        </label>
      </div>
      <p className="text-xs text-[var(--ink-2)]">
        Calibrates the sentence complexity, word choice, and story rhythm.
      </p>

      <div className="space-y-2">
        {AGE_GROUPS.map((group) => {
          const isSelected = currentAgeGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectAgeGroup(group.id)}
              className={`w-full p-2.5 rounded-xl border text-left transition-colors flex items-start justify-between gap-3 ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-xs'
                  : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink-3)]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none mt-0.5">{group.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-[var(--ink)]">
                      {group.label}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-[var(--paper-2)] text-[var(--ink-2)] font-mono">
                      {group.ageRange}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-2)] mt-0.5 leading-snug">
                    {group.description}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
