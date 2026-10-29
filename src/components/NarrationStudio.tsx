import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Volume2, Edit3, AlertCircle, PenLine, Lightbulb, Zap, X } from 'lucide-react';
import { LiveAudioRecorder, transcribeAudioWithServer } from '../utils/audio';
import { Theme, AgeGroup } from '../types';

interface NarrationStudioProps {
  pageNumber: number;
  theme: Theme;
  ageGroup?: AgeGroup;
  storyTitle?: string;
  onGeneratePage: (narration: string, audioBase64?: string, audioMime?: string) => Promise<void>;
  isGenerating: boolean;
  onCancel?: () => void;
}

const AGE_PLACEHOLDERS: Record<string, string> = {
  toddler: 'E.g. A tiny puppy found a big blue ball and bounced happily across the soft green grass!',
  'early-reader': 'E.g. Oliver the hedgehog discovered a glowing acorn that chimed like bells whenever he whispered a secret.',
  'middle-grade': 'E.g. Behind the waterfall lay a secret library carved from amethyst crystal, where clockwork owls guarded ancient maps.',
  'ya-adult': 'E.g. The lantern flared with violet flame as the celestial tide began to rise across the salt flats of Oakhaven.',
};

const STORY_STARTERS = [
  'Once upon a time',
  'Deep in the enchanted woods',
  'High above the clouds',
  'Suddenly, a mysterious sound',
  'Down by the sparkling river',
];

export const NarrationStudio: React.FC<NarrationStudioProps> = ({
  pageNumber,
  theme: _theme,
  ageGroup,
  storyTitle: _storyTitle,
  onGeneratePage,
  isGenerating,
  onCancel,
}) => {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioPayload, setAudioPayload] = useState<{ base64: string; mime: string } | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  const recorderRef = useRef<LiveAudioRecorder | null>(null);
  const isSubmittingRef = useRef(false);
  const latestTranscriptRef = useRef('');

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.isRecording) {
        recorderRef.current.stop();
      }
    };
  }, []);

  // Stop recording and generate the page immediately as soon as the button is hit
  const handleStopAndGenerate = async () => {
    if (isSubmittingRef.current || isGenerating) return;
    setIsRecording(false);
    setIsFinishing(true);
    setVolumeLevel(0);
    setErrorMessage(null);

    let recordedText = latestTranscriptRef.current.trim();
    let audioBase64: string | undefined = undefined;
    let audioMime: string | undefined = undefined;

    if (recorderRef.current) {
      try {
        const result = await recorderRef.current.stop();
        if (result.transcript?.trim()) {
          recordedText = result.transcript.trim();
          setTranscript(recordedText);
        }
        if (result.base64Audio) {
          setAudioPayload({ base64: result.base64Audio, mime: result.mimeType });
          audioBase64 = result.base64Audio;
          audioMime = result.mimeType;
        }
      } catch (stopErr) {
        console.warn('[NarrationStudio] Stop recorder warning:', stopErr);
      }
    }

    // Check if we captured spoken words
    if (!recordedText && !audioBase64) {
      setIsFinishing(false);
      setErrorMessage('No words were detected. Tap to speak your story, then tap again to generate!');
      return;
    }

    // Generate page immediately
    isSubmittingRef.current = true;
    try {
      await onGeneratePage(recordedText, audioBase64, audioMime);
    } catch (genErr: any) {
      console.error('[NarrationStudio] Generate page error:', genErr);
      setErrorMessage(genErr.message || 'Page generation failed. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsFinishing(false);
    }
  };

  // Start live voice recording with Gemini Live API transcription
  const handleStartRecording = async () => {
    if (isGenerating || isFinishing) return;
    setErrorMessage(null);
    try {
      const recorder = new LiveAudioRecorder();
      recorderRef.current = recorder;
      const started = await recorder.start({
        initialText: transcript.trim(),
        onTranscript: (liveText: string) => {
          setTranscript(liveText);
          latestTranscriptRef.current = liveText;
        },
        onAudioLevel: (vol: number) => {
          setVolumeLevel(vol);
        },
        onError: (err: Error) => {
          console.warn('Live audio recorder error callback:', err);
          if (!recorder.isRecording) {
            setErrorMessage(err.message || 'Microphone error. You can type directly.');
            setIsRecording(false);
          }
        },
      });

      if (started) {
        setIsRecording(true);
      }
    } catch (err: any) {
      console.error('Microphone start error:', err);
      setErrorMessage(
        err.message || 'Microphone access is required to speak your story. Please allow access.'
      );
      setIsRecording(false);
    }
  };

  // Main voice button handler:
  // - If idle: start recording with Gemini Live API transcription
  // - If listening: immediately stop and generate page
  const handleVoiceButtonClick = () => {
    if (isRecording) {
      handleStopAndGenerate();
    } else {
      handleStartRecording();
    }
  };

  // Cancel active recording without generating
  const handleCancelRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setVolumeLevel(0);
    if (recorderRef.current) {
      try {
        await recorderRef.current.stop();
      } catch (_) {}
    }
  };

  const handleTranscribeAudioWithAI = async () => {
    if (!audioPayload?.base64 || isTranscribing) return;
    setIsTranscribing(true);
    setErrorMessage(null);
    try {
      const aiText = await transcribeAudioWithServer(audioPayload.base64, audioPayload.mime);
      if (aiText) {
        setTranscript(aiText);
      } else {
        setErrorMessage('Could not detect clear words. Please try recording again or edit text directly.');
      }
    } catch (e) {
      console.warn('Manual transcribe error:', e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAddStarter = (starterText: string) => {
    setTranscript((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${starterText}` : `${starterText}, `;
    });
  };

  const handleCreatePage = async () => {
    if (isSubmittingRef.current || isGenerating || isFinishing) return;

    // If currently recording, stopping and generating handles everything
    if (isRecording) {
      await handleStopAndGenerate();
      return;
    }

    const trimmed = transcript.trim();
    if (!trimmed && !audioPayload) {
      setErrorMessage(
        inputMode === 'voice'
          ? 'Please speak your story or switch to typing!'
          : 'Please write a sentence or two for your story page!'
      );
      return;
    }

    setErrorMessage(null);
    isSubmittingRef.current = true;
    try {
      await onGeneratePage(
        trimmed,
        trimmed ? undefined : audioPayload?.base64,
        trimmed ? undefined : audioPayload?.mime
      );
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const isBusy = isGenerating || isFinishing;

  return (
    <div className="bg-[var(--paper)] rounded-2xl border border-[var(--rule)] p-5 sm:p-6 shadow-xs space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--rule)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-3)]">
              Page {pageNumber} · Creative Studio
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium font-sans px-2 py-0.5 rounded-full border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink-2)]">
              <Zap className="w-3 h-3 text-[var(--accent)]" />
              Gemini Live Transcribe
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-[var(--ink)] tracking-tight mt-0.5">
            {pageNumber === 1 ? 'Start Your Adventure' : `Create Page ${pageNumber}`}
          </h2>
        </div>

        {/* Input Mode Selector: Voice vs Typed */}
        <nav
          role="tablist"
          aria-label="Story input method"
          className="inline-flex items-center rounded-full p-1 border border-[var(--rule)] bg-[var(--paper-2)] shrink-0 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === 'voice'}
            onClick={() => setInputMode('voice')}
            disabled={isRecording || isBusy}
            className="min-h-[44px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: inputMode === 'voice' ? 'var(--ink)' : 'transparent',
              color: inputMode === 'voice' ? 'var(--paper)' : 'var(--ink-2)',
            }}
          >
            <Mic className="w-3.5 h-3.5" />
            <span style={{ color: inputMode === 'voice' ? 'var(--paper)' : 'inherit' }}>Voice</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={inputMode === 'text'}
            onClick={() => setInputMode('text')}
            disabled={isRecording || isBusy}
            className="min-h-[44px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: inputMode === 'text' ? 'var(--ink)' : 'transparent',
              color: inputMode === 'text' ? 'var(--paper)' : 'var(--ink-2)',
            }}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span style={{ color: inputMode === 'text' ? 'var(--paper)' : 'inherit' }}>Type Text</span>
          </button>
        </nav>
      </div>

      {/* Mode A: Voice Studio */}
      {inputMode === 'voice' ? (
        <>
          {/* Main Recording Interactive Arena */}
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 bg-[var(--paper-2)]/60 rounded-xl border border-[var(--rule)] relative overflow-hidden">
            {/* Pulsing Visualizer Rings */}
            {isRecording && (
              <div
                className="absolute rounded-full pointer-events-none transition-all duration-75"
                style={{
                  width: `${120 + volumeLevel * 180}px`,
                  height: `${120 + volumeLevel * 180}px`,
                  background: 'var(--accent)',
                  opacity: Math.min(0.3, 0.1 + volumeLevel * 0.4),
                  filter: 'blur(20px)',
                }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center text-center px-4">
              <button
                type="button"
                onClick={handleVoiceButtonClick}
                disabled={isBusy}
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-200 transform active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
                  isBusy
                    ? 'bg-[var(--paper-3)] text-[var(--ink-3)] cursor-wait'
                    : isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/30 animate-pulse'
                    : 'bg-[var(--accent)] hover:opacity-95 text-[var(--accent-contrast)] hover:scale-105'
                }`}
                title={
                  isRecording
                    ? 'Done speaking? Click to generate Page immediately!'
                    : 'Click to start speaking with Gemini Live API'
                }
                aria-label={
                  isRecording
                    ? `Done speaking. Generate Page ${pageNumber} now`
                    : 'Start voice recording with Gemini Live API'
                }
              >
                {isBusy ? (
                  <>
                    <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin text-[var(--accent)]" />
                    <span className="text-[11px] font-semibold mt-1.5 uppercase tracking-wide text-[var(--ink-2)]">
                      Creating…
                    </span>
                  </>
                ) : isRecording ? (
                  <>
                    <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin" />
                    <span className="text-xs font-bold mt-1 uppercase tracking-wide text-white leading-tight">
                      Create Page {pageNumber}!
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-rose-100 opacity-90 mt-0.5">
                      Tap when done
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent-contrast)]" />
                    <span className="text-xs font-semibold mt-1 uppercase tracking-wide text-[var(--accent-contrast)]">
                      {transcript ? 'Speak More' : 'Tap to Speak'}
                    </span>
                  </>
                )}
              </button>

              {isRecording ? (
                <div className="mt-3 flex flex-col items-center">
                  <p className="text-xs font-semibold text-[var(--ink)]">
                    Listening live… Speak your story, then tap the button to create Page {pageNumber}!
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelRecording}
                    className="min-h-[44px] inline-flex items-center gap-1 text-xs text-[var(--ink-3)] hover:text-rose-500 transition-colors mt-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel recording</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--ink-2)] mt-4 max-w-sm">
                  {transcript
                    ? 'Great narration! Tap above to add more, or tap "Create Page" below.'
                    : 'Tap the purple microphone and tell your story chunk out loud. Real-time words stream with Gemini Live API!'}
                </p>
              )}
            </div>
          </div>

          {/* Spoken Narration Transcript & Direct Text Input Fallback */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Spoken Words</span>
                {isRecording && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                    ● Live
                  </span>
                )}
              </label>

              <div className="flex items-center gap-1.5">
                {audioPayload && !isRecording && !isTranscribing && !isBusy && (
                  <button
                    type="button"
                    onClick={handleTranscribeAudioWithAI}
                    className="min-h-[44px] px-2.5 py-1 text-xs text-[var(--ink-2)] hover:text-[var(--accent)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Re-transcribe audio with Gemini AI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>AI Re-transcribe</span>
                  </button>
                )}
                {transcript && !isRecording && !isTranscribing && !isBusy && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                    className="min-h-[44px] px-2.5 py-1 text-xs text-[var(--ink-2)] hover:text-[var(--accent)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingTranscript ? 'Done Editing' : 'Edit Words'}</span>
                  </button>
                )}
              </div>
            </div>

            {isEditingTranscript ? (
              <textarea
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  latestTranscriptRef.current = e.target.value;
                }}
                rows={3}
                className="w-full p-3 rounded-xl bg-[var(--paper-2)] border border-[var(--rule)] text-base sm:text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-hidden resize-none font-serif leading-relaxed"
                placeholder="Edit your story narration here..."
                aria-label="Story narration text"
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="Edit spoken narration"
                onClick={() => !isRecording && !isTranscribing && !isBusy && setIsEditingTranscript(true)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isRecording && !isTranscribing && !isBusy) {
                    e.preventDefault();
                    setIsEditingTranscript(true);
                  }
                }}
                className={`min-h-[4.5rem] p-3 rounded-xl border transition-colors cursor-pointer ${
                  transcript
                    ? 'bg-[var(--paper-2)] border-[var(--rule)] text-[var(--ink)]'
                    : 'bg-[var(--paper-2)]/50 border-dashed border-[var(--rule)] text-[var(--ink-3)]'
                }`}
              >
                {isTranscribing ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--accent)] font-medium py-2">
                    <Sparkles className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span>Transcribing your narration with Gemini Live API...</span>
                  </div>
                ) : transcript ? (
                  <p className="font-serif text-sm sm:text-base leading-relaxed text-[var(--ink)]">
                    "{transcript}"
                    {isRecording && (
                      <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--accent)] animate-pulse align-middle" />
                    )}
                  </p>
                ) : (
                  <p className="text-xs italic text-[var(--ink-3)]">
                    {isRecording
                      ? 'Listening for your voice… words appear here as you speak via Gemini Live API!'
                      : 'Words you speak appear here. You can also switch to "Type Text" above to write directly.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Mode B: Direct Text Studio */
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="story-text-input"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] flex items-center gap-1.5"
              >
                <PenLine className="w-3.5 h-3.5 text-[var(--accent)]" />
                Write Your Story
              </label>
              <span className="text-xs font-mono text-[var(--ink-3)]">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
            </div>

            <textarea
              id="story-text-input"
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                latestTranscriptRef.current = e.target.value;
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleCreatePage();
                }
              }}
              rows={5}
              placeholder={AGE_PLACEHOLDERS[ageGroup || 'early-reader'] || AGE_PLACEHOLDERS['early-reader']}
              className="w-full p-4 rounded-xl bg-[var(--paper-2)] border border-[var(--rule)] text-base font-serif text-[var(--ink)] placeholder:text-[var(--ink-3)]/60 focus:border-[var(--accent)] focus:outline-hidden leading-relaxed resize-y transition-colors"
              aria-label="Story page written text"
            />
          </div>

          {/* Quick Idea Starters */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-[var(--ink-3)]">
              <Lightbulb className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Need an idea to get started?</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STORY_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => handleAddStarter(starter)}
                  className="min-h-[44px] sm:min-h-0 px-3 py-1.5 rounded-full text-xs bg-[var(--paper-2)] hover:bg-[var(--paper-3)] border border-[var(--rule)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                >
                  + {starter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </p>
      )}

      {/* Privacy & Child Safety Note */}
      <p className="text-xs text-[var(--ink-3)] italic">
        Tip: As soon as you hit the button, Gemini Live transcribes your words and creates a hardcover storybook page with custom artwork.
      </p>

      {/* Primary Action Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleCreatePage}
          disabled={(!transcript.trim() && !audioPayload && !isRecording) || isBusy || isTranscribing}
          className={`btn-accent w-full sm:flex-1 min-h-[44px] py-3 px-5 rounded-full font-semibold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
              : 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {isBusy ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Gemini is painting & writing Page {pageNumber}…</span>
            </>
          ) : isRecording ? (
            <>
              <Sparkles className="w-4 h-4 text-white animate-spin" />
              <span>Done Speaking · Create Page {pageNumber} Now!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[var(--accent-contrast)]" />
              <span>Turn into Book Page {pageNumber}</span>
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy || isRecording}
            className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-full text-xs font-medium border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink-2)] hover:bg-[var(--paper-3)] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
