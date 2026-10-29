import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  Edit2,
  Check,
  RotateCcw,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { StoryBook, StoryPage, AgeGroup } from '../types';
import { AGE_GROUPS } from '../constants';
import { speakText } from '../utils/audio';

interface BookSpreadProps {
  book: StoryBook;
  currentPageIndex: number;
  onPageChange: (newIndex: number) => void;
  onOpenNarrationStudio: () => void;
  onUpdatePageText: (pageIndex: number, newText: string) => void;
  onRegeneratePageImage: (pageIndex: number) => Promise<void>;
  isRegeneratingImage: boolean;
  onDeletePage?: (pageIndex: number) => void;
}

export const BookSpread: React.FC<BookSpreadProps> = ({
  book,
  currentPageIndex,
  onPageChange,
  onOpenNarrationStudio,
  onUpdatePageText,
  onRegeneratePageImage,
  isRegeneratingImage,
  onDeletePage,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const stopAudioRef = React.useRef<(() => void) | null>(null);
  const playSessionRef = React.useRef(0);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState('');

  const currentPage: StoryPage | undefined = book.pages[currentPageIndex];
  const totalPages = book.pages.length;

  const currentAgeConfig =
    AGE_GROUPS.find((a) => a.id === book.ageGroup) || AGE_GROUPS[1];

  // Stop audio on unmount or page change (WH6, WH9)
  React.useEffect(() => {
    return () => {
      playSessionRef.current++;
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      setIsPlayingAudio(false);
      setIsLoadingAudio(false);
    };
  }, [currentPageIndex]);

  const handleToggleReadAloud = async () => {
    if (!currentPage) return;
    const currentSession = ++playSessionRef.current;

    if (isPlayingAudio || isLoadingAudio) {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      setIsPlayingAudio(false);
      setIsLoadingAudio(false);
    } else {
      setIsLoadingAudio(true);
      const textToSpeak = `${currentPage.pageTitle}. ${currentPage.storyText}`;

      try {
        const stop = await speakText(textToSpeak, book.ageGroup, () => {
          if (playSessionRef.current === currentSession) {
            setIsPlayingAudio(false);
            setIsLoadingAudio(false);
            stopAudioRef.current = null;
          }
        });

        if (playSessionRef.current !== currentSession) {
          stop();
          return;
        }

        stopAudioRef.current = stop;
        setIsLoadingAudio(false);
        setIsPlayingAudio(true);
      } catch (err) {
        if (playSessionRef.current === currentSession) {
          setIsLoadingAudio(false);
          setIsPlayingAudio(false);
          stopAudioRef.current = null;
        }
      }
    }
  };

  const handleStartEditText = () => {
    if (!currentPage) return;
    setEditedText(currentPage.storyText);
    setIsEditingText(true);
  };

  const handleSaveText = () => {
    if (currentPage && editedText.trim()) {
      onUpdatePageText(currentPageIndex, editedText.trim());
    }
    setIsEditingText(false);
  };

  if (totalPages === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--rule)] bg-[var(--paper)] max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shadow-xs">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-2xl font-medium text-[var(--ink)]">
          Your Storybook is Empty
        </h3>
        <p className="text-sm text-[var(--ink-2)] max-w-sm">
          Tap the microphone button to narrate your very first page! Gemini will write the story and paint the illustration.
        </p>
        <button
          type="button"
          onClick={onOpenNarrationStudio}
          className="mt-2 py-3 px-6 rounded-xl font-medium text-sm bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-95 shadow-xs transition-opacity flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Narrate First Page</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-[1420px] mx-auto">
      {/* Top page status bar */}
      <div className="flex items-center justify-between px-2 text-xs text-[var(--ink-3)] font-mono">
        <span>
          PAGE {currentPageIndex + 1} OF {totalPages}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleReadAloud}
            className={`min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
              isPlayingAudio || isLoadingAudio
                ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)] font-medium'
                : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
            title="Read this page aloud"
          >
            {isLoadingAudio ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span className="text-xs">Loading Voice…</span>
              </>
            ) : isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4 animate-pulse" />
                <span className="text-xs">Stop Reading</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span className="text-xs">Read Aloud</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleStartEditText}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--rule)] bg-[var(--paper)] hover:text-[var(--ink)] transition-colors text-xs"
            title="Edit page prose"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Text</span>
          </button>

          {onDeletePage && (
            <button
              type="button"
              onClick={() => onDeletePage(currentPageIndex)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-2)] hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-900/50 transition-colors text-xs cursor-pointer"
              title="Delete this page"
              aria-label={`Delete Page ${currentPageIndex + 1}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500/80" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Realistic Storybook Hardcover Spread */}
      <div className="bg-[var(--paper)] rounded-2xl sm:rounded-3xl border border-[var(--rule)] shadow-2xl overflow-hidden w-full transition-shadow">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] xl:min-h-[700px]">
          {/* Left Spread: Illustration on Paper Ground with Gutter Shadow */}
          <div className="relative bg-[var(--paper)] p-4 sm:p-8 lg:p-10 xl:p-12 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[var(--rule)] lg:shadow-[inset_-24px_0_32px_-16px_rgba(0,0,0,0.09)]">
            {currentPage?.imageData ? (
              <div className="relative group w-full max-w-[560px] xl:max-w-[620px] aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-md border border-[var(--rule)] bg-[var(--paper)]">
                <img
                  src={currentPage.imageData}
                  alt={currentPage.pageTitle || 'Page Illustration'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                />

                {/* Floating Re-roll button */}
                <button
                  type="button"
                  onClick={() => onRegeneratePageImage(currentPageIndex)}
                  disabled={isRegeneratingImage}
                  className="absolute bottom-3 right-3 min-h-[44px] min-w-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--paper)]/90 backdrop-blur-md text-[var(--ink)] hover:text-[var(--accent)] border border-[var(--rule)] shadow-xs opacity-90 hover:opacity-100 transition-colors flex items-center justify-center gap-1.5 text-xs font-sans"
                  title="Repaint this illustration"
                >
                  <RotateCcw className={`w-4 h-4 ${isRegeneratingImage ? 'animate-spin text-[var(--accent)]' : ''}`} />
                  <span className="text-xs font-medium hidden sm:inline">Repaint</span>
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[560px] xl:max-w-[620px] aspect-square rounded-2xl border-2 border-dashed border-[var(--rule)] flex flex-col items-center justify-center text-center p-6 text-[var(--ink-3)]">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs mb-3">No illustration cached</p>
                <button
                  type="button"
                  onClick={() => onRegeneratePageImage(currentPageIndex)}
                  disabled={isRegeneratingImage}
                  className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[var(--rule)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-2)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin text-[var(--accent)]' : ''}`} />
                  <span>Generate Illustration</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Spread: Story Words on Paper Ground with Gutter Shadow */}
          <div className="p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-between space-y-6 bg-[var(--paper)] lg:shadow-[inset_24px_0_32px_-16px_rgba(0,0,0,0.09)]">
            <div className="space-y-4">
              {/* Chapter / Page Kicker */}
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-3)]">
                  {currentPage?.pageTitle || `Chapter ${currentPageIndex + 1}`}
                </span>
                <span className="text-xs text-[var(--ink-3)]">
                  {book.theme.badgeEmoji} {book.theme.name}
                </span>
              </div>

              {/* Prose Content */}
              {isEditingText ? (
                <div className="space-y-3 pt-2">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={6}
                    className="w-full p-3 rounded-xl bg-[var(--paper-2)] border border-[var(--accent)] text-base font-serif text-[var(--ink)] focus:outline-hidden leading-relaxed"
                    aria-label="Edit story page words"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveText}
                      className="btn-accent min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-[var(--accent-contrast)]" />
                      <span>Save Words</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingText(false)}
                      className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--paper-2)] border border-[var(--rule)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 sm:pt-4 max-w-2xl">
                  <p
                    className={`font-serif text-[var(--ink)] tracking-normal leading-relaxed ${currentAgeConfig.fontSizeClass}`}
                    style={{ fontFeatureSettings: '"pnum", "onum"' }}
                  >
                    {currentPage?.storyText}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Page Number & Leaf Navigation */}
            <div className="pt-4 border-t border-[var(--rule)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => onPageChange(currentPageIndex - 1)}
                disabled={currentPageIndex === 0}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--rule)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="font-serif italic text-xs sm:text-sm text-[var(--ink-3)]">
                — Page {currentPageIndex + 1} —
              </span>

              {currentPageIndex === totalPages - 1 ? (
                <button
                  type="button"
                  onClick={onOpenNarrationStudio}
                  className="btn-accent min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Narrate next page"
                >
                  <Plus className="w-4 h-4 text-[var(--accent-contrast)]" />
                  <span className="text-[var(--accent-contrast)]">Next Page</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onPageChange(currentPageIndex + 1)}
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--rule)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition-colors flex items-center justify-center"
                  title="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
