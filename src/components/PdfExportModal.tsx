import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Check, Loader2, Sparkles } from 'lucide-react';
import { StoryBook } from '../types';
import { exportStoryBookToPdf } from '../utils/pdfExport';

interface PdfExportModalProps {
  book: StoryBook;
  onClose: () => void;
  onUpdateAuthor: (author: string) => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  book,
  onClose,
  onUpdateAuthor,
}) => {
  const [authorName, setAuthorName] = useState(book.author || 'Young Storyteller');
  const [format, setFormat] = useState<'square' | 'portrait'>('square');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleExport = async () => {
    setIsExporting(true);
    setDownloadUrl(null);
    setExportError(null);
    try {
      onUpdateAuthor(authorName);
      const blob = await exportStoryBookToPdf(book, {
        format,
        authorName,
        includeCover: true,
        includeBackCover: true,
      });

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Trigger instant download
      const cleanTitle =
        (book.title || 'Storybook')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'my-storybook';
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cleanTitle}-storybook.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setExportError(err?.message || 'Could not generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--scrim)] flex items-center justify-center p-4">
      <div className="bg-[var(--paper)] max-w-md w-full rounded-3xl border border-[var(--rule)] shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium text-[var(--ink)]">
                Export Print-Ready PDF
              </h3>
              <p className="text-xs text-[var(--ink-2)] mt-0.5">
                Ready to share, read offline, or print at home.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Book Details Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] block mb-1.5">
              Story Title
            </label>
            <p className="font-serif text-base text-[var(--ink)] font-medium">
              {book.title || 'Untitled Story'}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] block mb-1.5">
              Author / Narrator Name
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Child's Name (e.g. Leo & Mom)"
              className="w-full text-base sm:text-sm px-3.5 py-2.5 rounded-xl bg-[var(--paper-2)] border border-[var(--rule)] text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] block mb-1.5">
              Book Page Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('square')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  format === 'square'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink-3)]'
                }`}
              >
                <div className="font-medium text-xs text-[var(--ink)] flex items-center justify-between">
                  <span>Square Picture Book</span>
                  {format === 'square' && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                </div>
                <p className="text-xs text-[var(--ink-3)] mt-0.5">8.5" × 8.5" (Classic Picture Book)</p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('portrait')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  format === 'portrait'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink-3)]'
                }`}
              >
                <div className="font-medium text-xs text-[var(--ink)] flex items-center justify-between">
                  <span>Letter / A4 Portrait</span>
                  {format === 'portrait' && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                </div>
                <p className="text-xs text-[var(--ink-3)] mt-0.5">Standard Home Printer Page</p>
              </button>
            </div>
          </div>

          {exportError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-400">
              {exportError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-[var(--paper-2)] border border-[var(--rule)] flex items-center justify-between text-xs">
            <span className="text-[var(--ink-2)]">Total pages included:</span>
            <span className="font-mono font-medium text-[var(--ink)]">
              {book.pages.length} Pages + Cover + Back
            </span>
          </div>
        </div>

        {/* Download Action */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-xs flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling High-Res PDF…</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Print-Ready PDF</span>
              </>
            )}
          </button>

          {downloadUrl && (
            <div className="space-y-2 pt-1 text-center">
              <a
                href={downloadUrl}
                download={`${(book.title || 'storybook').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-storybook.pdf`}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Click here if download didn't start automatically</span>
              </a>
              <p className="text-xs text-[var(--ink-2)]">
                ✓ Ready! Check your downloads folder or tap above to save.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
