export type AgeGroup = 'toddler' | 'early-reader' | 'middle-grade' | 'ya-adult';

export interface AgeGroupConfig {
  id: AgeGroup;
  label: string;
  ageRange: string;
  description: string;
  icon: string;
  fontSizeClass: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  visualStylePrompt: string;
  tonePrompt: string;
  badgeEmoji: string;
  isCustom?: boolean;
}

export interface StoryPage {
  pageNumber: number;
  pageTitle: string;
  storyText: string;
  illustrationPrompt: string;
  imageData: string;
  imageMimeType?: string;
  originalNarration: string;
  characterBible?: string;
}

export interface StoryBook {
  id: string;
  title: string;
  author: string;
  ageGroup: AgeGroup;
  theme: Theme;
  pages: StoryPage[];
  currentPageIndex: number;
  characterBible: string;
  createdAt: string;
  updatedAt: string;
}
