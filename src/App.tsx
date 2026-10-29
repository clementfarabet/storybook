import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BookSpread } from './components/BookSpread';
import { NarrationStudio } from './components/NarrationStudio';
import { PageThumbnailStrip } from './components/PageThumbnailStrip';
import { Sidebar } from './components/Sidebar';
import { PdfExportModal } from './components/PdfExportModal';
import { StoryBook, Theme, AgeGroup, StoryPage } from './types';
import { DEFAULT_THEME, DEFAULT_AGE_GROUP, STORAGE_KEY, AGE_GROUPS, INITIAL_STARTER_BOOK } from './constants';
import { Sparkles, BookOpen, Mic, Edit3, ArrowLeft } from 'lucide-react';
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
      if (param === 'narrate') return 'narrate';
    } catch (_) {}
    return 'read';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isNewStoryConfirmOpen, setIsNewStoryConfirmOpen] = useState(false);
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
    } catch (_) {}
  }, [themeMode]);

  // Load initial book from IndexedDB (or fallback) (SC2)
  useEffect(() => {
    loadBookFromStorage().then((stored) => {
      if (stored && Array.isArray(stored.pages)) {
        setBook(stored);
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
          previousPages: book.pages.slice(-3),
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
          pages: book.pages,
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
          previousPages: book.pages.slice(0, pageIndex),
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
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
                className="font-medium text-[var(--ink)] bg-transparent border-b border-transparent hover:border-[var(--rule)] focus:border-[var(--accent)] focus:outline-hidden py-1 px-1.5 min-h-[44px] min-w-[120px] max-w-[200px] cursor-pointer"
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-between">
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
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <BookSpread
              book={book}
              currentPageIndex={book.currentPageIndex}
              onPageChange={handlePageChange}
              onOpenNarrationStudio={() => setViewMode('narrate')}
              onUpdatePageText={handleUpdatePageText}
              onRegeneratePageImage={handleRegeneratePageImage}
              isRegeneratingImage={isRegeneratingImage}
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
          <div className="bg-[var(--paper)] rounded-2xl border border-[var(--rule)] p-6 max-w-md w-full shadow-xl space-y-4">
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
          <div className="text-xs italic" style={{ color: 'var(--ink-3)' }}>
            Powered by Gemini AI · Ready to print, share, or bind.
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs font-medium shadow-lg backdrop-blur-md animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
