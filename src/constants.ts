import { AgeGroupConfig, Theme, StoryBook } from './types';

export const AGE_GROUPS: AgeGroupConfig[] = [
  {
    id: 'toddler',
    label: 'Toddler',
    ageRange: 'Ages 2–4',
    description: '1–2 short, lyrical sentences per page with joyful repetition and simple words.',
    icon: '🐣',
    fontSizeClass: 'text-2xl sm:text-3xl leading-relaxed',
  },
  {
    id: 'early-reader',
    label: 'Early Reader',
    ageRange: 'Ages 5–7',
    description: '2–4 sentences per page with lively action, clear vocabulary, and engaging dialogue.',
    icon: '🦊',
    fontSizeClass: 'text-xl sm:text-2xl leading-relaxed',
  },
  {
    id: 'middle-grade',
    label: 'Middle Grade',
    ageRange: 'Ages 8–12',
    description: '1–2 descriptive paragraphs with witty character interactions and world mystery.',
    icon: '🚀',
    fontSizeClass: 'text-lg sm:text-xl leading-relaxed',
  },
  {
    id: 'ya-adult',
    label: 'YA & Adult',
    ageRange: 'Ages 13+',
    description: 'Evocative, poetic prose with atmospheric worldbuilding and emotional depth.',
    icon: '🦉',
    fontSizeClass: 'text-base sm:text-lg leading-relaxed',
  },
];

export const PRESET_THEMES: Theme[] = [
  {
    id: 'watercolor-fable',
    name: 'Classic Watercolor Fable',
    description: 'Warm pastel washes, delicate ink outlines, cozy Beatrix Potter style.',
    visualStylePrompt: 'Gentle storybook watercolor and ink illustration, soft warm washes, textured cream parchment paper, delicate botanical details, golden hour lighting.',
    tonePrompt: 'Gentle, comforting, heartwarming, and timeless bedtime story.',
    badgeEmoji: '🎨',
  },
  {
    id: 'fairytale-classic',
    name: 'Golden Age Fairytale',
    description: 'Lush gouache, gold foil highlights, enchanting folklore mystery.',
    visualStylePrompt: 'Lush golden age fairytale illustration in gouache, deep emeralds and midnight velvet blues, shimmering magical highlights, ornate storybook borders.',
    tonePrompt: 'Wondrous, adventurous, magical, filled with royal mysteries and secret woods.',
    badgeEmoji: '🏰',
  },
  {
    id: 'claymation-play',
    name: 'Claymation & Felt',
    description: 'Hand-sculpted clay figurines, warm tactile textures, stop-motion charm.',
    visualStylePrompt: 'Charming stop-motion claymation miniature figurine, hand-sculpted clay textures, soft studio lighting, tilt-shift macro lens depth of field.',
    tonePrompt: 'Playful, tactile, goofy, warm and humorous.',
    badgeEmoji: '🧸',
  },
  {
    id: 'comic-retro',
    name: 'Vintage Comic Book',
    description: '1960s retro comic art, bold ink outlines, halftone Ben-Day dots.',
    visualStylePrompt: 'Classic 1960s comic book pop art, bold black contour lines, halftone dot shading, warm primary ink colors, dynamic action framing.',
    tonePrompt: 'Energetic, punchy, heroic, full of excitement and daring feats.',
    badgeEmoji: '💥',
  },
  {
    id: 'pixel-quest',
    name: 'Retro Pixel Quest',
    description: 'Cozy 16-bit pixel adventure, nostalgic color palettes.',
    visualStylePrompt: 'Charming 16-bit isometric pixel art, warm vibrant video game palette, cozy nostalgic lighting, clean pixel grid details.',
    tonePrompt: 'Heroic, exploratory, nostalgic, full of fun treasure hunts.',
    badgeEmoji: '👾',
  },
  {
    id: 'japanese-woodblock',
    name: 'Edo Woodblock Folk',
    description: 'Traditional Ukiyo-e style, handcrafted washi textures, peaceful nature.',
    visualStylePrompt: 'Traditional Japanese woodblock print style (ukiyo-e), delicate black ink outlines, textured washi paper, misty mountains and cherry blossoms, Ghibli atmosphere.',
    tonePrompt: 'Poetic, contemplative, nature-loving, gentle and serene.',
    badgeEmoji: '🌊',
  },
  {
    id: 'starlight-cosmic',
    name: 'Starlight Astro-Explorer',
    description: 'Luminous nebulae, friendly starships, retro space-age wonder.',
    visualStylePrompt: 'Retro-futuristic gouache space art, glowing cosmic nebulae, starry constellations, cute rounded spacecraft, warm 1970s sci-fi picture book illustration.',
    tonePrompt: 'Curious, cosmic, scientific wonder and friendly interstellar discoveries.',
    badgeEmoji: '🚀',
  },
];

export const DEFAULT_THEME = PRESET_THEMES[0];
export const DEFAULT_AGE_GROUP = 'early-reader';
export const STORAGE_KEY = 'storybook_active_book_v1';
export const LIBRARY_STORAGE_KEY = 'storybook_saved_library_v1';

export const INITIAL_STARTER_BOOK: StoryBook = {
  id: 'storybook-blank-01',
  title: 'My Story',
  author: 'Young Storyteller',
  ageGroup: DEFAULT_AGE_GROUP,
  theme: DEFAULT_THEME,
  pages: [],
  currentPageIndex: 0,
  characterBible: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
