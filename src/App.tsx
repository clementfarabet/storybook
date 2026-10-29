import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BookSpread } from './components/BookSpread';
import { NarrationStudio } from './components/NarrationStudio';
import { PageThumbnailStrip } from './components/PageThumbnailStrip';
import { Sidebar } from './components/Sidebar';
import { PdfExportModal } from './components/PdfExportModal';
import { StoryBook, Theme, AgeGroup, StoryPage } from './types';
import { DEFAULT_THEME, DEFAULT_AGE_GROUP, STORAGE_KEY, AGE_GROUPS, INITIAL_STARTER_BOOK } from './constants';
import { Sparkles, BookOpen, Mic, Edit3, ArrowLeft, Trash2 } from 'lucide-react';
import { saveBookToStorage, loadBookFromStorage, sanitizeStoryBook } from './utils/storage';

export const App: React.FC = () => {
  // Theme (light / dark) unified with learnx and polisatlas using lp_theme
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('lp_theme') || localStorage.getItem('storybook_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (_) {
      return 'light';
    }
  });

  // Active StoryBook
  const [book, setBook] = useState<StoryBook>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return sanitizeStoryBook(parsed, INITIAL_STARTER_BOOK);
        }
      }
    } catch (_) {}
    return INITIAL_STARTER_BOOK;
  });

  // View state: 'read' (storybook spread) or 'narrate' (voice recording studio)
  const [viewMode, setViewMode] = useState<'read' | 'narrate'>(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('view');
      if (param === 'read') return 'read';
      if (param === 'narrate') return 'narrate';
    } catch (_) {}
    return 'narrate';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNewStoryConfirmOpen, setIsNewStoryConfirmOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetheming, setIsRetheming] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync theme attribute to document and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    try {
      localStorage.setItem('lp_theme', themeMode);
      localStorage.setItem('storybook_theme', themeMode);
      const bg = themeMode === 'light' ? '#fbfaf7' : '#121211';
      const meta = document.getElementById('theme-color-meta');
      if (meta) {
        meta.setAttribute('content', bg);
      }
    } catch (_) {}
  }, [themeMode]);

  // Load initial book from IndexedDB (or fallback) (SC2)
  // Always start from a blank book if fresh or if previously on mock starter book
  useEffect(() => {
    loadBookFromStorage().then((stored) => {
      if (stored && Array.isArray(stored.pages)) {
        if (stored.id === 'starter-book-01') {
          // Reset mock starter to a clean blank book
          setBook(INITIAL_STARTER_BOOK);
          setViewMode('narrate');
        } else {
          setBook(stored);
          if (stored.pages.length > 0) {
            setViewMode('read');
          } else {
            setViewMode('narrate');
          }
        }
      } else {
        setViewMode('narrate');
      }
    });
  }, []);

  // Persist book changes to IndexedDB safely (SC2)
  useEffect(() => {
    saveBookToStorage(book);
  }, [book]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleUpdateTitle = (title: string) => {
    setBook((prev) => ({ ...prev, title, updatedAt: new Date().toISOString() }));
  };

  const handleUpdateAuthor = (author: string) => {
    setBook((prev) => ({ ...prev, author, updatedAt: new Date().toISOString() }));
  };

  const handleSelectTheme = (newTheme: Theme) => {
    setBook((prev) => ({ ...prev, theme: newTheme, updatedAt: new Date().toISOString() }));
    showToast(`Theme updated to ${newTheme.name}`);
  };

  const handleSelectAgeGroup = (newAge: AgeGroup) => {
    setBook((prev) => ({ ...prev, ageGroup: newAge, updatedAt: new Date().toISOString() }));
    showToast(`Age group set to ${newAge.toUpperCase()}`);
  };

  const handlePageChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < book.pages.length) {
      setBook((prev) => ({ ...prev, currentPageIndex: newIndex }));
    }
  };

  // Generate Page from Voice Narration via Gemini Server
  const handleGeneratePage = async (
    narration: string,
    audioBase64?: string,
    audioMime?: string
  ) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const nextPageNumber = book.pages.length + 1;
      const res = await fetch('/storybook/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narration,
          audioBase64,
          audioMimeType: audioMime,
          ageGroup: book.ageGroup,
          theme: book.theme,
          pageNumber: nextPageNumber,
          storyTitle: book.title,
          previousPages: book.pages.slice(-3).map((p) => ({
            pageNumber: p.pageNumber,
            pageTitle: p.pageTitle,
            storyText: p.storyText,
            illustrationPrompt: p.illustrationPrompt,
          })),
          characterBible: book.characterBible,
        }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch (_) {
          try {
            const rawText = await res.text();
            if (rawText) errMsg = rawText.slice(0, 100);
          } catch (_) {}
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const newPage: StoryPage = data.page;

      setBook((prev) => ({
        ...prev,
        title: data.storyTitle || prev.title,
        characterBible: newPage.characterBible || prev.characterBible,
        pages: [...prev.pages, newPage],
        currentPageIndex: prev.pages.length,
        updatedAt: new Date().toISOString(),
      }));

      setViewMode('read');
      showToast(`Page ${nextPageNumber} created! ✨`);
    } catch (err: any) {
      console.error('Error generating page:', err);
      showToast(`Could not create page: ${err.message || 'Network error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Retheme Entire Book via Gemini Server
  const handleRethemeBook = async (newTheme: Theme) => {
    if (isRetheming) return;
    setIsRetheming(true);
    try {
      const res = await fetch('/storybook/api/retheme-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: book.pages.map((p) => ({
            pageNumber: p.pageNumber,
            pageTitle: p.pageTitle,
            storyText: p.storyText,
            illustrationPrompt: p.illustrationPrompt,
            originalNarration: p.originalNarration,
            characterBible: p.characterBible,
          })),
          newTheme,
          ageGroup: book.ageGroup,
        }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch (_) {
          try {
            const rawText = await res.text();
            if (rawText) errMsg = rawText.slice(0, 100);
          } catch (_) {}
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      setBook((prev) => ({
        ...prev,
        theme: newTheme,
        pages: data.pages,
        updatedAt: new Date().toISOString(),
      }));

      showToast(`Entire book rethemed to ${newTheme.name}!`);
    } catch (err: any) {
      console.error('Retheme error:', err);
      showToast(`Could not retheme book: ${err.message || 'Network error'}`);
    } finally {
      setIsRetheming(false);
    }
  };

  // Regenerate individual page illustration
  const handleRegeneratePageImage = async (pageIndex: number) => {
    if (isRegeneratingImage) return;
    const targetPage = book.pages[pageIndex];
    if (!targetPage) return;

    setIsRegeneratingImage(true);
    try {
      const res = await fetch('/storybook/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narration: targetPage.originalNarration || targetPage.storyText,
          ageGroup: book.ageGroup,
          theme: book.theme,
          pageNumber: targetPage.pageNumber,
          storyTitle: book.title,
          previousPages: book.pages.slice(0, pageIndex).map((p) => ({
            pageNumber: p.pageNumber,
            pageTitle: p.pageTitle,
            storyText: p.storyText,
            illustrationPrompt: p.illustrationPrompt,
          })),
          characterBible: book.characterBible,
        }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await res.json();

      setBook((prev) => {
        const updated = [...prev.pages];
        updated[pageIndex] = {
          ...updated[pageIndex],
          imageData: data.page.imageData,
          illustrationPrompt: data.page.illustrationPrompt,
        };
        return { ...prev, pages: updated, updatedAt: new Date().toISOString() };
      });
      showToast('Illustration repainted!');
    } catch (e: any) {
      showToast(`Could not repaint image: ${e.message || 'Network error'}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleUpdatePageText = (pageIndex: number, newText: string) => {
    setBook((prev) => {
      const updated = [...prev.pages];
      if (updated[pageIndex]) {
        updated[pageIndex] = { ...updated[pageIndex], storyText: newText };
      }
      return { ...prev, pages: updated, updatedAt: new Date().toISOString() };
    });
    showToast('Page prose saved.');
  };

  const handleOpenNewStory = () => {
    if (book.pages.length === 0) {
      startFreshStory();
    } else {
      setIsNewStoryConfirmOpen(true);
    }
  };

  const startFreshStory = () => {
    const freshBook: StoryBook = {
      id: `book-${Date.now()}`,
      title: 'A New Adventure',
      author: book.author || 'Young Storyteller',
      ageGroup: book.ageGroup,
      theme: book.theme,
      pages: [],
      currentPageIndex: 0,
      characterBible: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBook(freshBook);
    setViewMode('narrate');
    setIsNewStoryConfirmOpen(false);
    showToast('Ready for a brand new adventure!');
  };

  const handleConfirmDeletePage = () => {
    if (pageToDelete === null) return;
    const deletedNum = pageToDelete + 1;

    setBook((prev) => {
      const remainingPages = prev.pages
        .filter((_, idx) => idx !== pageToDelete)
        .map((p, idx) => ({
          ...p,
          pageNumber: idx + 1,
          pageTitle: p.pageTitle.startsWith('Page ') ? `Page ${idx + 1}` : p.pageTitle,
        }));

      const newIndex = Math.min(
        Math.max(0, pageToDelete <= prev.currentPageIndex ? prev.currentPageIndex - 1 : prev.currentPageIndex),
        Math.max(0, remainingPages.length - 1)
      );

      return {
        ...prev,
        pages: remainingPages,
        currentPageIndex: newIndex,
        updatedAt: new Date().toISOString(),
      };
    });

    if (book.pages.length <= 1) {
      setViewMode('narrate');
    }

    setPageToDelete(null);
    showToast(`Page ${deletedNum} deleted`);
  };

  const currentAgeConfig =
    AGE_GROUPS.find((a) => a.id === book.ageGroup) || AGE_GROUPS[1];

  return (
    <div
      className="min-h-screen flex flex-col antialiased transition-colors w-full overflow-x-hidden"
      style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
    >
      {/* Top Header matching LearnX and PolisAtlas masthead */}
      <Header
        book={book}
        viewMode={viewMode}
        onSelectViewMode={setViewMode}
        onNewStory={handleOpenNewStory}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        theme={themeMode}
        onToggleTheme={handleToggleTheme}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Hero Title & Status Banner */}
      <section className="border-b" style={{ borderColor: 'var(--rule)' }}>
        <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3 transition-[max-width] duration-300 ${viewMode === 'read' ? 'max-w-[1480px]' : 'max-w-6xl'}`}>
          <div className="space-y-1">
            <span
              className="text-xs font-mono uppercase tracking-wider block"
              style={{ color: 'var(--ink-3)' }}
            >
              CHILDREN'S STORYBOOK MAKER · {book.theme.name.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight m-0 w-full max-w-xl">
                <input
                  type="text"
                  value={book.title}
                  onChange={(e) => handleUpdateTitle(e.target.value)}
                  placeholder="Name your story..."
                  aria-label="Story book title"
                  className="w-full min-h-[44px] bg-transparent border-b border-transparent hover:border-[var(--rule)] focus:border-[var(--accent)] focus:outline-hidden py-1 text-[var(--ink)] cursor-pointer"
                  title="Click to edit story title"
                />
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-serif" style={{ color: 'var(--ink-2)' }}>
              <span>Narrated by</span>
              <input
                type="text"
                value={book.author}
                onChange={(e) => handleUpdateAuthor(e.target.value)}
                placeholder="Child's Name"
                aria-label="Story narrator or author name"
                className="font-medium text-[var(--ink)] bg-transparent border-b border-transparent hover:border-[var(--rule)] focus:border-[var(--accent)] focus:outline-hidden py-1 px-1.5 min-h-[44px] min-w-[120px] max-w-[200px] cursor-pointer text-base sm:text-sm"
                title="Click to edit narrator name"
              />
              <span>· Calibrated for {currentAgeConfig.label} ({currentAgeConfig.ageRange})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full text-xs font-semibold border transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--rule)',
                backgroundColor: 'var(--paper-2)',
                color: 'var(--ink-2)',
              }}
            >
              <span>{book.theme.badgeEmoji}</span>
              <span>{book.theme.name}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full text-xs font-semibold border transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--rule)',
                backgroundColor: 'var(--paper-2)',
                color: 'var(--ink-2)',
              }}
            >
              <span>{currentAgeConfig.icon}</span>
              <span>{currentAgeConfig.label}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-between transition-[max-width] duration-300 ${viewMode === 'read' ? 'max-w-[1480px]' : 'max-w-6xl'}`}>
        {viewMode === 'narrate' ? (
          <div className="max-w-xl mx-auto w-full my-auto">
            <NarrationStudio
              pageNumber={book.pages.length + 1}
              theme={book.theme}
              ageGroup={book.ageGroup}
              storyTitle={book.title}
              onGeneratePage={handleGeneratePage}
              isGenerating={isGenerating}
              onCancel={book.pages.length > 0 ? () => setViewMode('read') : undefined}
            />
          </div>
        ) : (
          <div className="space-y-6 flex-1 flex flex-col justify-center w-full">
            <BookSpread
              book={book}
              currentPageIndex={book.currentPageIndex}
              onPageChange={handlePageChange}
              onOpenNarrationStudio={() => setViewMode('narrate')}
              onUpdatePageText={handleUpdatePageText}
              onRegeneratePageImage={handleRegeneratePageImage}
              isRegeneratingImage={isRegeneratingImage}
              onDeletePage={(idx) => setPageToDelete(idx)}
            />

            {/* Bottom Page Thumbnails Carousel */}
            {book.pages.length > 0 && (
              <div className="pt-4 border-t border-[var(--rule)]">
                <PageThumbnailStrip
                  pages={book.pages}
                  currentPageIndex={book.currentPageIndex}
                  onSelectPage={handlePageChange}
                  onAddNewPage={() => setViewMode('narrate')}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Gentle In-App New Story Confirmation Modal (FR4) */}
      {isNewStoryConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--scrim)] backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--paper)] rounded-2xl border border-[var(--rule)] p-6 max-w-md w-full shadow-xl space-y-4 animate-modal-card">
            <h3 className="font-serif text-xl font-medium text-[var(--ink)]">
              Start a Brand New Adventure?
            </h3>
            <p className="text-xs sm:text-sm font-serif text-[var(--ink-2)] leading-relaxed">
              Your current story ({book.title}) is saved safely in this browser. Ready to begin a fresh, blank book?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewStoryConfirmOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink-2)] hover:bg-[var(--paper-3)] cursor-pointer"
              >
                Keep Reading
              </button>
              <button
                type="button"
                onClick={startFreshStory}
                className="btn-accent min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 cursor-pointer"
              >
                Start New Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gentle In-App Page Deletion Confirmation Modal */}
      {pageToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--scrim)] backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--paper)] rounded-2xl border border-[var(--rule)] p-6 max-w-sm w-full shadow-xl space-y-4 text-center animate-modal-card">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-rose-500/10 text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-medium text-[var(--ink)]">
                Delete Page {pageToDelete + 1}?
              </h3>
              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                This will permanently remove this page and its illustration. The remaining pages will be renumbered.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-full border border-[var(--rule)] bg-[var(--paper-2)] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--paper-3)] transition-colors cursor-pointer"
              >
                Keep Page
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePage}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side drawer for Theme & Age */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTheme={book.theme}
        onSelectTheme={handleSelectTheme}
        currentAgeGroup={book.ageGroup}
        onSelectAgeGroup={handleSelectAgeGroup}
        pageCount={book.pages.length}
        onRethemeBook={handleRethemeBook}
        isRetheming={isRetheming}
      />

      {/* PDF Export Modal */}
      {isExportModalOpen && (
        <PdfExportModal
          book={book}
          onClose={() => setIsExportModalOpen(false)}
          onUpdateAuthor={handleUpdateAuthor}
        />
      )}

      {/* Footer matching LearnX & PolisAtlas */}
      <footer
        className="border-t py-6 mt-12 text-xs"
        style={{ borderColor: 'var(--rule)', color: 'var(--ink-3)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>Storybook · Voice-First AI Children's Book Creator</div>
            <div className="flex items-center gap-3">
              <a href="/" className="hover:underline">
                learnandplay.ai
              </a>
            </div>
          </div>
          <div
            className="text-xs italic"
            style={{ color: 'var(--ink-3)' }}
          >
            Disclaimer: These projects are built for fun — take all AI-generated results and syntheses with a grain of salt.
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 z-50 px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs font-medium shadow-lg backdrop-blur-md animate-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
