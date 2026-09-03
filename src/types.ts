import { TranslationResult, IllustrationStyle, CharacterAnalysisResult } from './services/geminiService';

export interface Category {
  id: string;
  name: string;
  userId: string;
  createdAt: any;
}

export interface Vocabulary {
  id: string;
  word: string;
  type: 'word' | 'grammar';
  userId: string;
  sentenceId: string;
  createdAt: any;
}

export interface Section {
  id: string;
  name: string;
  categoryId: string;
  userId: string;
  createdAt: any;
}

export interface SavedSentence extends TranslationResult {
  id: string;
  originalText: string;
  categoryId?: string;
  sectionId?: string;
  orderIndex?: number;
  createdAt: any;
  note?: string;
  difficulty?: 'basic' | 'easy' | 'medium' | 'hard';
}

export interface SavedCharacter extends CharacterAnalysisResult {
  id: string;
  userId?: string;
  createdAt: any;
  note?: string;
}

export interface StudySession {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  duration: number; // in seconds
  createdAt: any;
  updatedAt: any;
}

export type ActiveViewType = 'home' | 'admin' | 'tests' | 'learn' | 'progress' | 'single-char';
export type TestType = 'vocabulary' | 'grammar' | 'word-order' | null;
