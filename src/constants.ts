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
  id: 'starter-book-01',
  title: 'The Whispering Star Tree',
  author: 'Leo & Luna',
  ageGroup: DEFAULT_AGE_GROUP,
  theme: DEFAULT_THEME,
  pages: [
    {
      pageNumber: 1,
      pageTitle: 'Chapter 1: The Golden Acorn',
      storyText:
        'Deep inside the mossy woods, Oliver the little hedgehog found an acorn that glowed like honey. Whenever he whispered a secret to it, the acorn chimed like tiny silver bells.',
      illustrationPrompt:
        'A cute hedgehog wearing a tiny woolen scarf holding a glowing golden acorn in a warm enchanted forest, soft watercolor and ink storybook illustration, cozy lighting, delicate botanical details.',
      imageData:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="%23f2f0ea"/><circle cx="300" cy="300" r="140" fill="%23ede9fe"/><circle cx="300" cy="270" r="45" fill="%23d8b4fe"/><ellipse cx="300" cy="330" rx="65" ry="50" fill="%23a78bfa"/><circle cx="300" cy="340" r="18" fill="%23fbbf24"/><path d="M290 320 Q300 305 310 320" stroke="%234c1d95" stroke-width="3" fill="none"/><text x="300" y="470" font-family="serif" font-size="20" fill="%234f4d48" text-anchor="middle">Chapter 1: The Golden Acorn</text></svg>',
      originalNarration:
        'Once there was a little hedgehog named Oliver who found a shiny golden acorn in the woods that whispered back to him.',
      characterBible:
        'Oliver the hedgehog: small, round, wears a teal knitted scarf, big curious eyes.',
    },
    {
      pageNumber: 2,
      pageTitle: 'Chapter 2: The Starlight Owl',
      storyText:
        'Flapping down from the tallest oak came Barnaby the snowy owl. "That is no ordinary acorn," whispered Barnaby with wide golden eyes. "It belongs to the Great Star Tree!"',
      illustrationPrompt:
        'A wise snowy owl perching on a low autumn branch speaking to a little hedgehog with a glowing acorn, nighttime starlit sky, soft watercolor fable illustration, luminous stars.',
      imageData:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="%23f2f0ea"/><circle cx="300" cy="300" r="140" fill="%23ede9fe"/><circle cx="330" cy="240" r="50" fill="%23c4b5fd"/><circle cx="315" cy="235" r="10" fill="%23fbbf24"/><circle cx="345" cy="235" r="10" fill="%23fbbf24"/><path d="M330 248 L325 258 L335 258 Z" fill="%23d97706"/><circle cx="250" cy="350" r="30" fill="%23a78bfa"/><text x="300" y="470" font-family="serif" font-size="20" fill="%234f4d48" text-anchor="middle">Chapter 2: The Starlight Owl</text></svg>',
      originalNarration:
        'Then an owl flew down and told Oliver that the acorn fell from the magic star tree high up on the mountain.',
      characterBible:
        'Oliver the hedgehog in teal scarf; Barnaby the wise snowy owl with golden spectacles.',
    },
  ],
  currentPageIndex: 0,
  characterBible:
    'Oliver the hedgehog (round, teal knitted scarf); Barnaby the snowy owl (golden eyes, wise expression).',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
