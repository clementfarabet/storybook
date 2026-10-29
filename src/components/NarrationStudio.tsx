import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Volume2, Edit3, AlertCircle } from 'lucide-react';
import { LiveAudioRecorder } from '../utils/audio';
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

export const NarrationStudio: React.FC<NarrationStudioProps> = ({
  pageNumber,
  theme,
  ageGroup,
  storyTitle,
  onGeneratePage,
  isGenerating,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioPayload, setAudioPayload] = useState<{ base64: string; mime: string } | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  const recorderRef = useRef<LiveAudioRecorder | null>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.isRecording) {
        recorderRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      if (recorderRef.current) {
        try {
          const result = await recorderRef.current.stop();
          setAudioPayload(result.base64Audio ? { base64: result.base64Audio, mime: result.mimeType } : null);
        } catch (e) {
          console.error('Stop recording error:', e);
        }
      }
      setIsRecording(false);
      setVolumeLevel(0);
    } else {
      setErrorMessage(null);
      try {
        const recorder = new LiveAudioRecorder();
        recorderRef.current = recorder;
        await recorder.start({
          onTranscript: (liveText: string) => {
            setTranscript(liveText);
          },
          onAudioLevel: (vol: number) => {
            setVolumeLevel(vol);
          },
          onError: (err: Error) => {
            setErrorMessage(err.message);
            setIsRecording(false);
          },
        });
        setIsRecording(true);
      } catch (err: any) {
        console.error('Microphone start error:', err);
        setErrorMessage(
          err.message || 'Microphone access is required to speak your story. Please allow access.'
        );
        setIsRecording(false);
      }
    }
  };

  const handleCreatePage = async () => {
    if (isSubmittingRef.current || isGenerating) return;
    const trimmed = transcript.trim();
    if (!trimmed && !audioPayload) {
      setErrorMessage('Please narrate or type a chunk of your story first!');
      return;
    }

    setErrorMessage(null);
    isSubmittingRef.current = true;
    try {
      // SC4: Only send raw audio when text narration is absent
      await onGeneratePage(
        trimmed,
        trimmed ? undefined : audioPayload?.base64,
        trimmed ? undefined : audioPayload?.mime
      );
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="bg-[var(--paper)] rounded-2xl border border-[var(--rule)] p-5 sm:p-6 shadow-xs space-y-6">
      {/* Studio Header */}
      <div className="flex items-center justify-between border-b border-[var(--rule)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-3)]">
            Page {pageNumber} · Voice Studio
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-[var(--ink)] tracking-tight mt-0.5">
            {pageNumber === 1 ? 'Start Your Adventure' : `Narrate Page ${pageNumber}`}
          </h2>
        </div>

        {theme?.name && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--paper-2)] border border-[var(--rule)] text-xs text-[var(--ink-2)]">
            <span className="font-sans font-medium">{theme.name} Style</span>
          </div>
        )}
      </div>

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
              opacity: Math.min(0.25, volumeLevel * 0.4),
              filter: 'blur(20px)',
            }}
          />
        )}

        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isGenerating}
            className={`btn-accent relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center shadow-md transition-transform duration-200 transform active:scale-95 cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white'
                : 'bg-[var(--accent)] hover:opacity-95 text-[var(--accent-contrast)]'
            }`}
            title={isRecording ? 'Click to stop narrating' : 'Click to start narrating'}
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
          >
            {isRecording ? (
              <>
                <MicOff className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse text-white" />
                <span className="text-xs font-semibold mt-1 uppercase tracking-wide text-white">
                  Listening…
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

          <p className="text-xs text-[var(--ink-2)] mt-4 max-w-sm">
            {isRecording
              ? 'Tell what happens next! Describe characters, animals, and surprises.'
              : transcript
              ? 'Great narration! You can tap above to add more, or edit your words below.'
              : 'Tap the purple microphone and tell your story chunk out loud.'}
          </p>
        </div>
      </div>

      {/* Spoken Narration Transcript & Direct Text Input Fallback */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            Your Story Words
          </label>
          {transcript && !isRecording && (
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

        {isEditingTranscript ? (
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-xl bg-[var(--paper-2)] border border-[var(--rule)] text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-hidden resize-none font-serif leading-relaxed"
            placeholder="Edit your story narration here..."
            aria-label="Story narration text"
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Edit spoken narration"
            onClick={() => !isRecording && setIsEditingTranscript(true)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isRecording) {
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
            {transcript ? (
              <p className="font-serif text-sm sm:text-base leading-relaxed text-[var(--ink)]">
                "{transcript}"
              </p>
            ) : (
              <p className="text-xs italic text-[var(--ink-3)]">
                {isRecording
                  ? 'Listening for your voice… words will appear here as you speak!'
                  : 'Or tap here to type your story directly if you prefer typing over voice.'}
              </p>
            )}
          </div>
        )}

        {errorMessage && (
          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </p>
        )}

        {/* Privacy Note (SC6 & SC8) */}
        <p className="text-xs text-[var(--ink-3)] italic">
          Tip: Voice recognition runs securely in your browser. Use first names or playful pen names to keep your child's identity private.
        </p>
      </div>

      {/* Primary Action Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleCreatePage}
          disabled={(!transcript.trim() && !audioPayload) || isRecording || isGenerating}
          className="btn-accent w-full sm:flex-1 min-h-[44px] py-3 px-5 rounded-full font-semibold text-xs sm:text-sm bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Gemini is painting & writing Page {pageNumber}…</span>
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
            disabled={isGenerating}
            className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-full text-xs font-medium border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink-2)] hover:bg-[var(--paper-3)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
