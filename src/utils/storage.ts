import { StoryBook } from '../types';
import { DEFAULT_THEME, DEFAULT_AGE_GROUP, STORAGE_KEY, INITIAL_STARTER_BOOK } from '../constants';

const DB_NAME = 'storybook_db';
const DB_VERSION = 1;
const STORE_NAME = 'books';
const ACTIVE_BOOK_KEY = 'active_book';
const FALLBACK_STORAGE_KEY = STORAGE_KEY;

/**
 * Validates and self-heals a raw StoryBook object from storage.
 * Guarantees all required fields (theme, pages, ageGroup, title, author) exist and never cause runtime TypeError.
 */
export function sanitizeStoryBook(raw: any, fallback: StoryBook = INITIAL_STARTER_BOOK): StoryBook {
  if (!raw || typeof raw !== 'object') return fallback;

  const validAgeGroups = ['toddler', 'early-reader', 'middle-grade', 'ya-adult'];
  const safeAgeGroup = validAgeGroups.includes(raw.ageGroup) ? raw.ageGroup : DEFAULT_AGE_GROUP;

  const safeTheme =
    raw.theme && typeof raw.theme.name === 'string' && typeof raw.theme.visualStylePrompt === 'string'
      ? {
          id: typeof raw.theme.id === 'string' ? raw.theme.id : 'custom-restored',
          name: raw.theme.name,
          description: typeof raw.theme.description === 'string' ? raw.theme.description : '',
          visualStylePrompt: raw.theme.visualStylePrompt,
          tonePrompt: typeof raw.theme.tonePrompt === 'string' ? raw.theme.tonePrompt : 'Warm and friendly',
          previewColor: typeof raw.theme.previewColor === 'string' ? raw.theme.previewColor : '#6d28d9',
          badgeEmoji: typeof raw.theme.badgeEmoji === 'string' ? raw.theme.badgeEmoji : '✨',
          isCustom: Boolean(raw.theme.isCustom),
        }
      : DEFAULT_THEME;

  const safePages = Array.isArray(raw.pages)
    ? raw.pages.map((p: any, i: number) => ({
        pageNumber: typeof p?.pageNumber === 'number' ? p.pageNumber : i + 1,
        pageTitle: typeof p?.pageTitle === 'string' ? p.pageTitle : `Page ${i + 1}`,
        storyText: typeof p?.storyText === 'string' ? p.storyText : '',
        illustrationPrompt: typeof p?.illustrationPrompt === 'string' ? p.illustrationPrompt : '',
        imageData: typeof p?.imageData === 'string' ? p.imageData : '',
        imageMimeType: typeof p?.imageMimeType === 'string' ? p.imageMimeType : 'image/png',
        originalNarration: typeof p?.originalNarration === 'string' ? p.originalNarration : '',
        characterBible: typeof p?.characterBible === 'string' ? p.characterBible : '',
      }))
    : fallback.pages;

  const safeIndex =
    typeof raw.currentPageIndex === 'number' &&
    raw.currentPageIndex >= 0 &&
    (safePages.length === 0 || raw.currentPageIndex < safePages.length)
      ? raw.currentPageIndex
      : 0;

  return {
    id: typeof raw.id === 'string' ? raw.id : fallback.id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'My Magical Story',
    author: typeof raw.author === 'string' && raw.author.trim() ? raw.author : 'Young Storyteller',
    ageGroup: safeAgeGroup,
    theme: safeTheme,
    pages: safePages,
    currentPageIndex: safeIndex,
    characterBible: typeof raw.characterBible === 'string' ? raw.characterBible : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Persists full StoryBook with high-res illustrations to IndexedDB.
 * Handles unlimited multi-megabyte illustrations safely without QuotaExceededError.
 */
export async function saveBookToStorage(book: StoryBook): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(book, ACTIVE_BOOK_KEY);

      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (err) {
    console.warn('[Storage] IndexedDB save failed, falling back to localStorage:', err);
    try {
      // Lightweight fallback without crashing
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(book));
    } catch (lsErr) {
      console.warn('[Storage] localStorage quota reached. Saving text without images:', lsErr);
      const textOnly = {
        ...book,
        pages: book.pages.map(p => ({ ...p, imageData: '' })),
      };
      try {
        localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(textOnly));
      } catch (_) {}
    }
  }
}

/**
 * Loads the active StoryBook from IndexedDB (or fallback localStorage).
 */
export async function loadBookFromStorage(): Promise<StoryBook | null> {
  try {
    const db = await openDatabase();
    const book = await new Promise<StoryBook | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(ACTIVE_BOOK_KEY);

      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });

    if (book) return sanitizeStoryBook(book);
  } catch (err) {
    console.warn('[Storage] IndexedDB read failed, falling back to localStorage:', err);
  }

  // Fallback to localStorage if IndexedDB has no record yet
  try {
    const saved = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (saved) return sanitizeStoryBook(JSON.parse(saved));
  } catch (_) {}

  return null;
}
