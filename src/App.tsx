import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2,
  ChevronRight,
  ChevronLeft,
  Flame,
  Heart,
  Volume2,
  Lightbulb,
  Sparkles,
  Search,
  Bookmark,
  LogOut,
  LogIn,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Plus,
  Library,
  Settings,
  BookOpen,
  Check,
  List,
  Lock,
  X,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Menu,
  Maximize2,
  Palette
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  translateAndExplain, 
  TranslationResult, 
  generateIllustrationSvg, 
  generateRealisticIllustration, 
  IllustrationStyle, 
  censorTargetWordTranslation 
} from './services/geminiService';
import SingleCharacterLearn from './components/SingleCharacterLearn';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  handleFirestoreError,
  OperationType
} from './lib/firebase';

interface Category {
  id: string;
  name: string;
  userId: string;
  createdAt: any;
}

interface Vocabulary {
  id: string;
  word: string;
  type: 'word' | 'grammar';
  userId: string;
  sentenceId: string;
  createdAt: any;
}

interface Section {
  id: string;
  name: string;
  categoryId: string;
  userId: string;
  createdAt: any;
}

interface SavedSentence extends TranslationResult {
  id: string;
  originalText: string;
  categoryId?: string;
  sectionId?: string;
  createdAt: any;
  note?: string;
  difficulty?: 'basic' | 'easy' | 'medium' | 'hard';
}

interface StudySession {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  duration: number; // in seconds
  createdAt: any;
  updatedAt: any;
}

const getCategoryTheme = (categoryId?: string, categoriesList: Category[] = []) => {
  const themes = [
    {
      border: 'border-emerald-200 bg-emerald-50/5 hover:border-emerald-500 hover:shadow-emerald-100/35',
      badge: 'bg-emerald-50 text-emerald-800 border border-emerald-100/70',
      activeText: 'group-hover:text-emerald-700',
      iconColor: 'text-emerald-500 group-hover:text-emerald-600',
    },
    {
      border: 'border-indigo-200 bg-indigo-50/5 hover:border-indigo-500 hover:shadow-indigo-100/35',
      badge: 'bg-indigo-50 text-indigo-800 border border-indigo-100/70',
      activeText: 'group-hover:text-indigo-700',
      iconColor: 'text-indigo-500 group-hover:text-indigo-600',
    },
    {
      border: 'border-amber-200 bg-amber-50/5 hover:border-amber-500 hover:shadow-amber-100/35',
      badge: 'bg-amber-50 text-amber-800 border border-amber-100/70',
      activeText: 'group-hover:text-amber-700',
      iconColor: 'text-amber-500 group-hover:text-amber-600',
    },
    {
      border: 'border-rose-200 bg-rose-50/5 hover:border-rose-500 hover:shadow-rose-100/35',
      badge: 'bg-rose-50 text-rose-800 border border-rose-100/70',
      activeText: 'group-hover:text-rose-700',
      iconColor: 'text-rose-500 group-hover:text-rose-600',
    },
    {
      border: 'border-violet-200 bg-violet-50/5 hover:border-violet-500 hover:shadow-violet-100/35',
      badge: 'bg-violet-50 text-violet-800 border border-violet-100/70',
      activeText: 'group-hover:text-violet-700',
      iconColor: 'text-violet-500 group-hover:text-violet-600',
    },
    {
      border: 'border-sky-200 bg-sky-50/5 hover:border-sky-500 hover:shadow-sky-100/35',
      badge: 'bg-sky-50 text-sky-800 border border-sky-100/70',
      activeText: 'group-hover:text-sky-700',
      iconColor: 'text-sky-500 group-hover:text-sky-600',
    },
    {
      border: 'border-fuchsia-200 bg-fuchsia-50/5 hover:border-fuchsia-500 hover:shadow-fuchsia-100/35',
      badge: 'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-100/70',
      activeText: 'group-hover:text-fuchsia-700',
      iconColor: 'text-fuchsia-500 group-hover:text-fuchsia-600',
    },
    {
      border: 'border-teal-200 bg-teal-50/5 hover:border-teal-500 hover:shadow-teal-100/35',
      badge: 'bg-teal-50 text-teal-800 border border-teal-100/70',
      activeText: 'group-hover:text-teal-700',
      iconColor: 'text-teal-500 group-hover:text-teal-600',
    }
  ];

  if (!categoryId) {
    return themes[0];
  }
  
  const index = categoriesList.findIndex(c => c.id === categoryId);
  if (index === -1) {
    return themes[0];
  }
  
  return themes[index % themes.length];
};

const getDifficultyTranslation = (difficulty?: string) => {
  switch (difficulty) {
    case 'basic': return { label: 'Cơ bản', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' };
    case 'easy': return { label: 'Dễ', color: 'bg-sky-50 text-sky-800 border-sky-200/60' };
    case 'medium': return { label: 'Trung bình', color: 'bg-amber-50 text-amber-800 border-amber-200/60' };
    case 'hard': return { label: 'Khó', color: 'bg-rose-50 text-rose-800 border-rose-200/60' };
    default: return { label: 'Cơ bản', color: 'bg-slate-100 text-slate-800 border-slate-200/60' };
  }
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'admin' | 'tests' | 'learn' | 'progress' | 'single-char'>('home');
  const [testType, setTestType] = useState<'vocabulary' | 'grammar' | 'word-order' | null>(null);
  const [quizWord, setQuizWord] = useState<Vocabulary | null>(null);
  const [quizSentence, setQuizSentence] = useState<SavedSentence | null>(null);
  const [quizTimer, setQuizTimer] = useState(15);
  const [quizStage, setQuizStage] = useState<'idle' | 'running' | 'revealed'>('idle');
  const [quizMode, setQuizMode] = useState<'vi2zh' | 'zh2vi'>('zh2vi');

  // Word Order test states
  const [wordOrderSegments, setWordOrderSegments] = useState<string[]>([]);
  const [shuffledSegments, setShuffledSegments] = useState<{ id: number; text: string }[]>([]);
  const [selectedSegmentIndices, setSelectedSegmentIndices] = useState<(number | null)[]>([]);
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null);
  const [wordOrderResultState, setWordOrderResultState] = useState<'playing' | 'correct' | 'incorrect'>('playing');
  const [wordOrderSelectedCategory, setWordOrderSelectedCategory] = useState<string>('all');
  const [grammarSelectedCategory, setGrammarSelectedCategory] = useState<string>('all');
  const [vocabSelectedCategory, setVocabSelectedCategory] = useState<string>('all');
  const [wordOrderSelectedDifficulty, setWordOrderSelectedDifficulty] = useState<string>('all');
  const [grammarSelectedDifficulty, setGrammarSelectedDifficulty] = useState<string>('all');
  const [vocabSelectedDifficulty, setVocabSelectedDifficulty] = useState<string>('all');
  const [expandedSentence, setExpandedSentence] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakSlowGlobal, setSpeakSlowGlobal] = useState(false);
  const [vocabQuizList, setVocabQuizList] = useState<Vocabulary[]>([]);
  const [vocabQuizIndex, setVocabQuizIndex] = useState<number>(0);
  const [showQuizHint, setShowQuizHint] = useState(false);
  const [hideVocabMeaning, setHideVocabMeaning] = useState(true);
  const [censoredContextText, setCensoredContextText] = useState('');
  const [isCensoring, setIsCensoring] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setIsNavMenuOpen(false);
      }
    };
    if (isNavMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNavMenuOpen]);

  useEffect(() => {
    let active = true;
    if (!quizWord) {
      setCensoredContextText('');
      return;
    }

    const sentence = savedSentences.find(s => s.id === quizWord.sentenceId);
    if (!sentence) {
      setCensoredContextText('');
      return;
    }

    const fetchCensored = async () => {
      setIsCensoring(true);
      try {
        const censored = await censorTargetWordTranslation(
          sentence.chinese,
          sentence.originalText,
          quizWord.word
        );
        if (active) {
          setCensoredContextText(censored);
        }
      } catch (err) {
        console.error("Lỗi khi ẩn nghĩa tiếng Việt:", err);
        if (active) {
          setCensoredContextText(sentence.originalText);
        }
      } finally {
        if (active) {
          setIsCensoring(false);
        }
      }
    };

    fetchCensored();

    return () => {
      active = false;
    };
  }, [quizWord, savedSentences]);

  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editableExplanation, setEditableExplanation] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isLearnSettingsOpen, setIsLearnSettingsOpen] = useState(false);
  const [isGeneratingIllustration, setIsGeneratingIllustration] = useState(false);
  const [chosenIllustrationStyle, setChosenIllustrationStyle] = useState<IllustrationStyle>('photorealistic');
  const [showIllustrationStyleDropdown, setShowIllustrationStyleDropdown] = useState(false);
  const [selectedIllustrationModal, setSelectedIllustrationModal] = useState<TranslationResult | null>(null);
  const [hidePinyin, setHidePinyin] = useState(true);
  const [hideMeaning, setHideMeaning] = useState(true);
  
  // Study tracking state
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [activeSecondsToday, setActiveSecondsToday] = useState(0);
  const lastSavedDurationRef = useRef(0);
  const todaySessionExistsRef = useRef(false);

  useEffect(() => {
    todaySessionExistsRef.current = studySessions.some(s => s.date === getLocalDateString());
  }, [studySessions]);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateStudyStreak = (sessions: StudySession[], activeSecsToday: number) => {
    const todayStr = getLocalDateString();
    const qualifiedDatesSet = new Set<string>();
    
    sessions.forEach(s => {
      if (s.date === todayStr) {
        if (Math.max(s.duration, activeSecsToday) >= 1800) {
          qualifiedDatesSet.add(todayStr);
        }
      } else if (s.duration >= 1800) {
        qualifiedDatesSet.add(s.date);
      }
    });
    
    if (activeSecsToday >= 1800) {
      qualifiedDatesSet.add(todayStr);
    }
    
    const qualifiedDates = Array.from(qualifiedDatesSet).sort((a, b) => b.localeCompare(a));
    
    if (qualifiedDates.length === 0) return 0;
    
    const yesterdayStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${dy}`;
    })();
    
    let startIdx = 0;
    if (qualifiedDates[0] === todayStr) {
      startIdx = 0;
    } else if (qualifiedDates[0] === yesterdayStr) {
      startIdx = 0;
    } else {
      return 0; // Streak is broken
    }
    
    let streak = 0;
    const cursorDate = new Date(qualifiedDates[startIdx]);
    
    while (true) {
      const cursorStr = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, '0')}-${String(cursorDate.getDate()).padStart(2, '0')}`;
      if (qualifiedDatesSet.has(cursorStr)) {
        streak++;
        cursorDate.setDate(cursorDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getDailyHistoryData = () => {
    const resultList = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${dy}`;
      
      let duration = 0;
      if (dateStr === getLocalDateString()) {
        duration = activeSecondsToday;
      } else {
        const match = studySessions.find(s => s.date === dateStr);
        if (match) {
          duration = match.duration;
        }
      }
      
      let label = `${dy}/${mo}`;
      if (i === 0) label = "Hôm nay";
      else if (i === 1) label = "Hôm qua";
      
      const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const dayOfWeek = dayNames[d.getDay()];

      resultList.push({
        date: dateStr,
        duration,
        label,
        dayOfWeek,
        isGoalMet: duration >= 1800
      });
    }
    return resultList;
  };
  
  // Main sentence editing states
  const [isEditingMainSentence, setIsEditingMainSentence] = useState(false);
  const [editMainChinese, setEditMainChinese] = useState('');
  const [editMainPinyin, setEditMainPinyin] = useState('');
  const [editMainMeaning, setEditMainMeaning] = useState('');
  const [editMainOriginal, setEditMainOriginal] = useState('');

  // Variations editing states
  const [isAddingVariation, setIsAddingVariation] = useState(false);
  const [newVarChinese, setNewVarChinese] = useState('');
  const [newVarPinyin, setNewVarPinyin] = useState('');
  const [newVarMeaning, setNewVarMeaning] = useState('');
  const [editingVarIdx, setEditingVarIdx] = useState<number | null>(null);
  const [editVarChinese, setEditVarChinese] = useState('');
  const [editVarPinyin, setEditVarPinyin] = useState('');
  const [editVarMeaning, setEditVarMeaning] = useState('');
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        await onConfirm();
        closeConfirm();
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      },
      isLoading: false
    });
  };

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isCreatingSection, setIsCreatingSection] = useState(false);

  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [selectedFilterSection, setSelectedFilterSection] = useState<string>('all');
  const [learnSelectedCategory, setLearnSelectedCategory] = useState<string>('all');
  const [learnSelectedDifficulty, setLearnSelectedDifficulty] = useState<string>('all');
  const [homeSelectedDifficulty, setHomeSelectedDifficulty] = useState<string>('all');
  const [inputDifficulty, setInputDifficulty] = useState<'basic' | 'easy' | 'medium' | 'hard'>('basic');
  const [currentSentenceCategoryId, setCurrentSentenceCategoryId] = useState<string>('');
  const [currentSentenceSectionId, setCurrentSentenceSectionId] = useState<string>('');
  
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [vocabFilterType, setVocabFilterType] = useState<'all' | 'word' | 'grammar'>('all');
  const [expandedVocabId, setExpandedVocabId] = useState<string | null>(null);

  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ top: number, left: number } | null>(null);
  const [saveNotification, setSaveNotification] = useState<{
    show: boolean;
    text: string;
    type: 'word' | 'grammar';
    isDuplicate: boolean;
  } | null>(null);

  const handleSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = e.currentTarget.getBoundingClientRect();
      
      setSelectedText(text);
      setSelectionRange({
        top: rect.top - containerRect.top - 45,
        left: rect.left - containerRect.left + rect.width / 2
      });
    } else {
      setSelectedText('');
      setSelectionRange(null);
    }
  };

  const saveWord = async (type: 'word' | 'grammar') => {
    if (!user || !selectedText || !result) return;
    try {
      // Check if already exists to avoid duplicates with same type
      const existing = vocabulary.find(v => v.word === selectedText && v.type === type);
      if (existing) {
        setSaveNotification({
          show: true,
          text: selectedText,
          type: type,
          isDuplicate: true
        });
        setSelectedText('');
        setSelectionRange(null);
        window.getSelection()?.removeAllRanges();
        return;
      }

      let sentenceId = '';
      if ('id' in (result as any)) {
        sentenceId = (result as SavedSentence).id;
      } else {
        // Auto-save the sentence if context word/grammar is saved
        const docRef = await addDoc(collection(db, 'saved_sentences'), {
          ...result,
          originalText: inputText,
          userId: user.uid,
          categoryId: currentSentenceCategoryId || '',
          variations: result.variations || [],
          difficulty: inputDifficulty,
          createdAt: serverTimestamp()
        });
        sentenceId = docRef.id;
        setResult({ ...result, id: sentenceId, originalText: inputText, difficulty: inputDifficulty } as SavedSentence);
      }

      await addDoc(collection(db, 'vocabulary'), {
        word: selectedText,
        type: type,
        userId: user.uid,
        sentenceId: sentenceId,
        createdAt: serverTimestamp()
      });

      setSaveNotification({
        show: true,
        text: selectedText,
        type: type,
        isDuplicate: false
      });

      setSelectedText('');
      setSelectionRange(null);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vocabulary');
    }
  };

  const renderHighlightedChinese = (text: string, sentenceId?: string) => {
    if (!text) return '';
    if (!vocabulary || vocabulary.length === 0) return text;
    
    // Filter to only vocab for this sentence if sentenceId is provided
    const relevantVocab = sentenceId 
      ? vocabulary.filter(v => v.sentenceId === sentenceId)
      : [];
      
    if (relevantVocab.length === 0) return text;
    
    // Sort by length descending to handle overlapping highlights (longest first)
    const sortedVocab = [...relevantVocab].sort((a, b) => b.word.length - a.word.length);
    
    // We only take unique words per type for replacement logic to avoid double-processing same string
    // But since different types might have same word (unlikely but possible), we just map it
    const uniqueVocabStrings = Array.from(new Set(sortedVocab.map(v => v.word)));
    
    let parts: (string | React.ReactNode)[] = [text];
    
    uniqueVocabStrings.forEach(wordStr => {
      const vInfo = sortedVocab.find(v => v.word === wordStr);
      if (!vInfo) return;

      let newParts: (string | React.ReactNode)[] = [];
      parts.forEach(p => {
        if (typeof p === 'string') {
          const split = p.split(new RegExp(`(${wordStr})`, 'g'));
          split.forEach((s, i) => {
            if (s === wordStr) {
              const colorClass = vInfo.type === 'grammar' 
                ? "text-indigo-600 font-bold bg-indigo-100/50 px-0.5 rounded cursor-pointer border-b border-indigo-200"
                : "text-orange-500 font-bold bg-orange-100/50 px-0.5 rounded cursor-pointer";
              newParts.push(<span key={`${wordStr}-${i}`} className={colorClass}>{s}</span>);
            } else if (s !== "") {
              newParts.push(s);
            }
          });
        } else {
          newParts.push(p);
        }
      });
      parts = newParts;
    });
    
    return parts;
  };

  const startQuiz = (mode: 'vi2zh' | 'zh2vi' = quizMode, sentence?: SavedSentence) => {
    let pool = savedSentences;
    if (!sentence) {
      if (grammarSelectedCategory !== 'all') {
        pool = pool.filter(s => s.categoryId === grammarSelectedCategory);
      }
      if (grammarSelectedDifficulty !== 'all') {
        pool = pool.filter(s => (s.difficulty || 'basic') === grammarSelectedDifficulty);
      }
    }
    
    if (pool.length === 0) {
      setError("Bạn chưa lưu câu nào thuộc chủ đề hoặc mức độ khó đã chọn để làm bài test!");
      return;
    }
    const random = sentence || pool[Math.floor(Math.random() * pool.length)];
    setQuizMode(mode);
    setQuizSentence(random);
    setQuizTimer(15);
    setQuizStage('running');
    setTestType('grammar');
    setActiveView('tests');
    setResult(null); 
    setShowQuizHint(false);
  };

  const startVocabQuiz = (targetIdx?: number) => {
    let pool = vocabulary;
    if (vocabSelectedCategory !== 'all' || vocabSelectedDifficulty !== 'all') {
      pool = vocabulary.filter(v => {
        const sentence = savedSentences.find(s => s.id === v.sentenceId);
        if (!sentence) return false;
        const matchesCategory = vocabSelectedCategory === 'all' || sentence.categoryId === vocabSelectedCategory;
        const matchesDiff = vocabSelectedDifficulty === 'all' || (sentence.difficulty || 'basic') === vocabSelectedDifficulty;
        return matchesCategory && matchesDiff;
      });
    }

    if (pool.length === 0) {
      setError("Bạn chưa lưu từ vựng nào thuộc chủ đề hoặc mức độ khó đã chọn để ôn tập!");
      return;
    }

    setVocabQuizList(pool);
    const validIdx = targetIdx !== undefined 
      ? ((targetIdx % pool.length) + pool.length) % pool.length
      : 0;

    setVocabQuizIndex(validIdx);
    setQuizWord(pool[validIdx]);
    setQuizTimer(15);
    setQuizStage('running');
    setTestType('vocabulary');
    setActiveView('tests');
    setResult(null);
    setShowQuizHint(false);
    setHideVocabMeaning(true);
  };

  const nextVocabWord = () => {
    let pool = vocabQuizList;
    if (pool.length === 0) {
      startVocabQuiz(0);
      return;
    }
    const nextIdx = (vocabQuizIndex + 1) % pool.length;
    setVocabQuizIndex(nextIdx);
    setQuizWord(pool[nextIdx]);
    setQuizTimer(15);
    setQuizStage('running');
    setShowQuizHint(false);
    setHideVocabMeaning(true);
  };

  const prevVocabWord = () => {
    let pool = vocabQuizList;
    if (pool.length === 0) return;
    const prevIdx = (vocabQuizIndex - 1 + pool.length) % pool.length;
    setVocabQuizIndex(prevIdx);
    setQuizWord(pool[prevIdx]);
    setQuizTimer(15);
    setQuizStage('running');
    setShowQuizHint(false);
    setHideVocabMeaning(true);
  };

  const startWordOrderQuiz = (sentence?: SavedSentence) => {
    if (savedSentences.length === 0) {
      setError("Bạn cần lưu ít nhất 1 câu vào sổ tay để luyện tập sắp xếp từ!");
      return;
    }
    
    // Pick specific or random sentence based on category filter
    let pool = savedSentences;
    if (!sentence) {
      if (wordOrderSelectedCategory !== 'all' || wordOrderSelectedDifficulty !== 'all') {
        const filtered = savedSentences.filter(s => {
          const matchesCategory = wordOrderSelectedCategory === 'all' || s.categoryId === wordOrderSelectedCategory;
          const matchesDiff = wordOrderSelectedDifficulty === 'all' || (s.difficulty || 'basic') === wordOrderSelectedDifficulty;
          return matchesCategory && matchesDiff;
        });
        if (filtered.length === 0) {
          setError("Chủ đề hoặc mức độ khó đã chọn chưa có câu nào được lưu để sắp xếp trật tự từ!");
          return;
        }
        pool = filtered;
      }
    }
    const randomSentence = sentence || pool[Math.floor(Math.random() * pool.length)];
    setQuizSentence(randomSentence);
    
    // Segment using vocab where possible
    const sentenceVocab = vocabulary
      .filter(v => v.sentenceId === randomSentence.id && v.type === 'word')
      .map(v => v.word.trim())
      .filter(word => word && randomSentence.chinese.includes(word));
    
    // Sort longer words first
    sentenceVocab.sort((a, b) => b.length - a.length);
    
    // Clean punctuation
    const puncs = /[。，！？、；：“”（）.,!? ]/g;
    const cleanText = randomSentence.chinese.replace(puncs, '');
    
    if (cleanText.length === 0) {
      setError("Câu đã chọn không hợp lệ hoặc chỉ chứa dấu câu.");
      return;
    }
    
    const segments: string[] = [];
    let i = 0;
    while (i < cleanText.length) {
      let matched = false;
      for (const word of sentenceVocab) {
        if (cleanText.substring(i, i + word.length) === word) {
          segments.push(word);
          i += word.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        segments.push(cleanText[i]);
        i++;
      }
    }
    
    setWordOrderSegments(segments);
    
    const items = segments.map((text, idx) => ({ id: idx, text }));
    let shuffled = [...items];
    let attempts = 0;
    while (attempts < 5) {
      shuffled.sort(() => Math.random() - 0.5);
      const isSame = shuffled.every((item, idx) => item.id === idx);
      if (shuffled.length <= 1 || !isSame) {
        break;
      }
      attempts++;
    }
    
    setShuffledSegments(shuffled);
    setSelectedSegmentIndices(Array(segments.length).fill(null));
    setFocusedSlotIndex(null);
    setWordOrderResultState('playing');
    setTestType('word-order');
    setActiveView('tests');
    setResult(null);
  };

  const checkWordOrderAnswer = () => {
    const submittedText = selectedSegmentIndices
      .map(idx => (idx !== null && shuffledSegments[idx] ? shuffledSegments[idx].text : ''))
      .join('');
    const correctCleanText = wordOrderSegments.join('');
    
    if (submittedText === correctCleanText) {
      setWordOrderResultState('correct');
      if (quizSentence) handleSpeak(quizSentence.chinese);
    } else {
      setWordOrderResultState('incorrect');
    }
  };

  useEffect(() => {
    let interval: any;
    if (quizStage === 'running' && quizTimer > 0) {
      interval = setInterval(() => {
        setQuizTimer(prev => prev - 1);
      }, 1000);
    } else if (quizTimer === 0 && quizStage === 'running') {
      setQuizStage('revealed');
      if (quizSentence) handleSpeak(quizSentence.chinese);
    }
    return () => clearInterval(interval);
  }, [quizStage, quizTimer, quizSentence]);

  const goToNextSentence = () => {
    if (!result || !('id' in result)) return;
    
    const currentIndex = filteredSentences.findIndex(s => s.id === (result as SavedSentence).id);
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % filteredSentences.length;
    const nextSentence = filteredSentences[nextIndex];
    
    setResult(nextSentence);
    setInputText(nextSentence.originalText);
    setCurrentSentenceCategoryId(nextSentence.categoryId || '');
  };

   const handleSpeak = (text: string, forceSlow?: boolean) => {
     if (!('speechSynthesis' in window)) {
       setError("Trình duyệt của bạn không hỗ trợ tính năng phát âm.");
       return;
     }
 
     window.speechSynthesis.cancel();
 
     const utterance = new SpeechSynthesisUtterance(text);
     utterance.lang = 'zh-CN';
     
     // Set speech rate: normal is 1.0, slow is 0.5
     const isSlow = forceSlow !== undefined ? forceSlow : speakSlowGlobal;
     utterance.rate = isSlow ? 0.5 : 1.0;
     
     try {
       const voices = window.speechSynthesis.getVoices();
       const zhVoice = voices.find(v => 
         v.lang.startsWith('zh') || 
         v.lang.includes('CN') || 
         v.lang.includes('HK') || 
         v.lang.includes('TW')
       );
       if (zhVoice) {
         utterance.voice = zhVoice;
       }
     } catch (e) {
       console.error("Error setting speech voice:", e);
     }
     
     utterance.onstart = () => setIsSpeaking(true);
     utterance.onend = () => setIsSpeaking(false);
     utterance.onerror = () => setIsSpeaking(false);
 
     window.speechSynthesis.speak(utterance);
   };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener for Saved Sentences
  useEffect(() => {
    if (!user) {
      setSavedSentences([]);
      return;
    }

    const q = query(
      collection(db, 'saved_sentences'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedSentence[];
      setSavedSentences(docs);
    }, (err) => {
      console.error("Firestore Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Listener for Categories
  useEffect(() => {
    if (!user) {
      setCategories([]);
      return;
    }

    const q = query(
      collection(db, 'categories'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(docs);
    }, (err) => {
      console.error("Categories Listener Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Listener for Vocabulary
  useEffect(() => {
    if (!user) {
      setVocabulary([]);
      return;
    }

    const q = query(
      collection(db, 'vocabulary'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vocabulary[];
      setVocabulary(docs);
    }, (err) => {
      console.error("Vocabulary Listener Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Listener for Sections
  useEffect(() => {
    if (!user) {
      setSections([]);
      return;
    }

    const q = query(
      collection(db, 'sections'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Section[];
      setSections(docs);
    }, (err) => {
      console.error("Sections Listener Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Firestore Listener for Study Sessions
  useEffect(() => {
    if (!user) {
      setStudySessions([]);
      setActiveSecondsToday(0);
      lastSavedDurationRef.current = 0;
      return;
    }

    const q = query(
      collection(db, 'study_sessions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudySession[];
      
      // Sort client-side by date descending to prevent index issues
      docs.sort((a, b) => b.date.localeCompare(a.date));
      setStudySessions(docs);
      
      const todayStr = getLocalDateString();
      const todaySession = docs.find(s => s.date === todayStr);
      if (todaySession) {
        setActiveSecondsToday(prev => {
          if (todaySession.duration > prev) {
            lastSavedDurationRef.current = todaySession.duration;
            return todaySession.duration;
          }
          return prev;
        });
      }
    }, (err) => {
      console.error("Study Sessions Listener Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Timer: increment study seconds locally every second
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      setActiveSecondsToday(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Sync study duration to Firestore (throttled every 15 seconds)
  useEffect(() => {
    if (!user || activeSecondsToday === 0) return;

    if (activeSecondsToday - lastSavedDurationRef.current >= 15) {
      const todayStr = getLocalDateString();
      const docId = `${user.uid}_${todayStr}`;
      
      const saveDuration = async () => {
        try {
          if (!auth.currentUser) return;
          const docRef = doc(db, 'study_sessions', docId);
          const exists = todaySessionExistsRef.current;
          
          if (exists) {
            await updateDoc(docRef, {
              duration: activeSecondsToday,
              updatedAt: serverTimestamp()
            });
          } else {
            await setDoc(docRef, {
              userId: user.uid,
              date: todayStr,
              duration: activeSecondsToday,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          lastSavedDurationRef.current = activeSecondsToday;
        } catch (err) {
          console.error("Error saving daily study activity:", err);
        }
      };

      saveDuration();
    }
  }, [user, activeSecondsToday]);

  // Save on component unmount or tab closing
  useEffect(() => {
    if (!user) return;

    return () => {
      // If user has signed out in the meantime, avoid writing to Firestore (which would fail due to lacking auth credentials)
      if (!auth.currentUser) return;

      const currentSeconds = activeSecondsToday;
      const lastSaved = lastSavedDurationRef.current;
      if (currentSeconds > lastSaved) {
        const todayStr = getLocalDateString();
        const docId = `${user.uid}_${todayStr}`;
        const docRef = doc(db, 'study_sessions', docId);
        
        const exists = todaySessionExistsRef.current;
        if (exists) {
          updateDoc(docRef, {
            duration: currentSeconds,
            updatedAt: serverTimestamp()
          }).catch(e => {
            if (e.code !== 'permission-denied') {
              console.error("Unmount update failed:", e);
            }
          });
        } else {
          setDoc(docRef, {
            userId: user.uid,
            date: todayStr,
            duration: currentSeconds,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }).catch(e => {
            if (e.code !== 'permission-denied') {
              console.error("Unmount save failed:", e);
            }
          });
        }
      }
    };
  }, [user, activeSecondsToday]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setError("Không thể đăng nhập. Vui lòng thử lại.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setResult(null);
      setInputText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTranslate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await translateAndExplain(inputText);
      setResult(data);
    } catch (err) {
      setError('Đã có lỗi xảy ra khi dịch. Vui lòng thử lại!');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToHistory = async () => {
    if (!user || !result || !inputText.trim()) {
      if (!user) setError("Bạn cần đăng nhập để lưu câu này.");
      return;
    }

    setIsSaving(true);
    try {
      const data: any = {
        userId: user.uid,
        originalText: inputText,
        chinese: result.chinese,
        pinyin: result.pinyin,
        meaning: result.meaning,
        grammarExplanation: result.grammarExplanation,
        illustrationSvg: result.illustrationSvg || '',
        variations: result.variations || [],
        createdAt: serverTimestamp(),
        difficulty: inputDifficulty
      };
      
      if (currentSentenceCategoryId) {
        data.categoryId = currentSentenceCategoryId;
      }
      if (currentSentenceSectionId) {
        data.sectionId = currentSentenceSectionId;
      }

      const docRef = await addDoc(collection(db, 'saved_sentences'), data);
      setResult({ ...result, id: docRef.id, originalText: inputText, difficulty: inputDifficulty, illustrationSvg: result.illustrationSvg || '' } as SavedSentence);
      setError(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'saved_sentences');
    } finally {
      setIsSaving(false);
    }
  };

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewCategoryName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'categories');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const createSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSectionName.trim() || !currentSentenceCategoryId) return;

    setIsCreatingSection(true);
    try {
      await addDoc(collection(db, 'sections'), {
        name: newSectionName,
        categoryId: currentSentenceCategoryId,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewSectionName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sections');
    } finally {
      setIsCreatingSection(false);
    }
  };

  const createSectionInHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSectionName.trim() || selectedFilterCategory === 'all') return;

    setIsCreatingSection(true);
    try {
      await addDoc(collection(db, 'sections'), {
        name: newSectionName,
        categoryId: selectedFilterCategory,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewSectionName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sections');
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleUpdateCategory = async (sentenceId: string, categoryId: string) => {
    try {
      await updateDoc(doc(db, 'saved_sentences', sentenceId), {
        categoryId: categoryId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
    }
  };

  const handleUpdateSection = async (sentenceId: string, sectionId: string) => {
    try {
      await updateDoc(doc(db, 'saved_sentences', sentenceId), {
        sectionId: sectionId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
    }
  };

  const handleSaveExplanation = async () => {
    if (!result) return;
    if ('id' in result) {
      const sentenceId = (result as SavedSentence).id;
      try {
        await updateDoc(doc(db, 'saved_sentences', sentenceId), {
          grammarExplanation: editableExplanation
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
        return;
      }
    }
    setResult(prev => prev ? { ...prev, grammarExplanation: editableExplanation } : null);
    setIsEditingExplanation(false);
  };

  const handleSaveNote = async () => {
    if (!result) return;
    if ('id' in result) {
      const sentenceId = (result as SavedSentence).id;
      try {
        await updateDoc(doc(db, 'saved_sentences', sentenceId), {
          note: noteText
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
        return;
      }
    }
    setResult(prev => prev ? { ...prev, note: noteText } as SavedSentence : null);
    setIsEditingNote(false);
  };

  const handleStartEditMain = () => {
    if (!result) return;
    setEditMainChinese(result.chinese);
    setEditMainPinyin(result.pinyin);
    setEditMainMeaning(result.meaning);
    setEditMainOriginal((result as any).originalText || '');
    setIsEditingMainSentence(true);
  };

  const handleSaveMainSentence = async () => {
    if (!result || !editMainChinese.trim() || !editMainMeaning.trim()) return;
    
    if ('id' in result) {
      const sentenceId = (result as SavedSentence).id;
      try {
        await updateDoc(doc(db, 'saved_sentences', sentenceId), {
          chinese: editMainChinese.trim(),
          pinyin: editMainPinyin.trim(),
          meaning: editMainMeaning.trim(),
          originalText: editMainOriginal.trim()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
        return;
      }
    }
    
    setResult(prev => prev ? {
      ...prev,
      chinese: editMainChinese.trim(),
      pinyin: editMainPinyin.trim(),
      meaning: editMainMeaning.trim(),
      originalText: editMainOriginal.trim()
    } as SavedSentence : null);
    
    setIsEditingMainSentence(false);
  };

  const handleAddVariation = async () => {
    if (!result || !newVarChinese.trim() || !newVarMeaning.trim()) return;
    
    const newVar = {
      chinese: newVarChinese.trim(),
      pinyin: newVarPinyin.trim(),
      meaning: newVarMeaning.trim()
    };
    
    const updatedVariations = [...(result.variations || []), newVar];
    
    if ('id' in result) {
      const sentenceId = (result as SavedSentence).id;
      try {
        await updateDoc(doc(db, 'saved_sentences', sentenceId), {
          variations: updatedVariations
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
        return;
      }
    }
    
    setResult(prev => prev ? { ...prev, variations: updatedVariations } as SavedSentence : null);
    setIsAddingVariation(false);
    setNewVarChinese('');
    setNewVarPinyin('');
    setNewVarMeaning('');
  };

  const handleSaveVarEdit = async (index: number) => {
    if (!result || !editVarChinese.trim() || !editVarMeaning.trim()) return;
    
    const updatedVariations = [...(result.variations || [])];
    updatedVariations[index] = {
      chinese: editVarChinese.trim(),
      pinyin: editVarPinyin.trim(),
      meaning: editVarMeaning.trim()
    };
    
    if ('id' in result) {
      const sentenceId = (result as SavedSentence).id;
      try {
        await updateDoc(doc(db, 'saved_sentences', sentenceId), {
          variations: updatedVariations
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
        return;
      }
    }
    
    setResult(prev => prev ? { ...prev, variations: updatedVariations } as SavedSentence : null);
    setEditingVarIdx(null);
  };

  const handleConfirmDeleteVar = (index: number) => {
    if (!result || !result.variations) return;
    
    openConfirm(
      "Xóa câu phát triển",
      `Bạn có chắc chắn muốn xóa câu "${result.variations[index].chinese}" khỏi danh sách phát triển?`,
      async () => {
        const updatedVariations = result.variations!.filter((_, i) => i !== index);
        
        if ('id' in result) {
          const sentenceId = (result as SavedSentence).id;
          try {
            await updateDoc(doc(db, 'saved_sentences', sentenceId), {
              variations: updatedVariations
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
            return;
          }
        }
        
        setResult(prev => prev ? { ...prev, variations: updatedVariations } as SavedSentence : null);
      }
    );
  };

  useEffect(() => {
    if (result && 'note' in result) {
      setNoteText((result as SavedSentence).note || '');
    } else {
      setNoteText('');
    }
    setIsEditingNote(false);
    
    // Reset editing states on change of active sentence
    setIsEditingMainSentence(false);
    setIsAddingVariation(false);
    setEditingVarIdx(null);
  }, [result]);

  const handleDeleteSentence = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    openConfirm(
      "Xóa câu đã lưu", 
      "Bạn có chắc chắn muốn xóa câu này khỏi sổ tay?", 
      async () => {
        try {
          await deleteDoc(doc(db, 'saved_sentences', id));
          if (result && (result as SavedSentence).id === id) {
            setResult(null);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'saved_sentences');
        }
      }
    );
  };

  const handleDeleteVocabulary = (e: React.MouseEvent, id: string, word: string) => {
    e.stopPropagation();
    openConfirm(
      "Xóa từ vựng / ngữ pháp", 
      `Bạn có chắc chắn muốn xóa "${word}" khỏi sổ tay học tập?`, 
      async () => {
        try {
          await deleteDoc(doc(db, 'vocabulary', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'vocabulary');
        }
      }
    );
  };

  const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    openConfirm(
      "Xóa chủ đề", 
      "Xóa chủ đề này? Các câu trong chủ đề sẽ không bị xóa nhưng sẽ mất nhãn phân loại.",
      async () => {
        try {
          const sentencesToUpdate = savedSentences.filter(s => s.categoryId === id);
          const updatePromises = sentencesToUpdate.map(s => 
            updateDoc(doc(db, 'saved_sentences', s.id), { categoryId: '' })
          );
          await Promise.all(updatePromises);
          
          await deleteDoc(doc(db, 'categories', id));
          if (selectedFilterCategory === id) {
            setSelectedFilterCategory('all');
          }

          const sectionsToDelete = sections.filter(sec => sec.categoryId === id);
          const sectionDeletePromises = sectionsToDelete.map(sec => deleteDoc(doc(db, 'sections', sec.id)));
          await Promise.all(sectionDeletePromises);

        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'categories');
        }
      }
    );
  };

  const handleDeleteSection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    openConfirm(
      "Xóa phân đoạn",
      "Xóa đoạn văn/hội thoại này? Các câu bên trong sẽ không bị xóa nhưng sẽ mất nhãn phân loại đoạn.",
      async () => {
        try {
          const sentencesToUpdate = savedSentences.filter(s => s.sectionId === id);
          const updatePromises = sentencesToUpdate.map(s => 
            updateDoc(doc(db, 'saved_sentences', s.id), { sectionId: '' })
          );
          await Promise.all(updatePromises);
          await deleteDoc(doc(db, 'sections', id));
          if (selectedFilterSection === id) {
            setSelectedFilterSection('all');
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'sections');
        }
      }
    );
  };

  const filteredSentences = selectedFilterCategory === 'all' 
    ? savedSentences 
    : savedSentences.filter(s => s.categoryId === selectedFilterCategory);

  const finalFilteredSentences = selectedFilterSection === 'all'
    ? filteredSentences
    : filteredSentences.filter(s => s.sectionId === selectedFilterSection);

  // Group sentences by section for display in history if "All sections" is selected but a Category is filtered
  const sentencesBySection: { [key: string]: SavedSentence[] } = {};

  if (selectedFilterCategory !== 'all' && selectedFilterSection === 'all') {
    finalFilteredSentences.forEach(s => {
      const sId = s.sectionId || 'none';
      if (!sentencesBySection[sId]) sentencesBySection[sId] = [];
      sentencesBySection[sId].push(s);
    });
  }

  return (
    <div className="min-h-screen bg-sleek-bg text-sleek-text flex flex-col font-sans mb-20 lg:mb-0 overflow-x-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-16 bg-white border-b border-sleek-border px-2 sm:px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4">
          <div 
            onClick={() => { setActiveView('home'); setTestType(null); }}
            className="flex items-center gap-1.5 sm:gap-3 cursor-pointer select-none"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-bold text-sm sm:text-lg leading-none">Z</span>
            </div>
            <span className="font-extrabold text-xs sm:text-base md:text-lg tracking-tight text-slate-900 truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none">
              Zhongwen AI
            </span>
          </div>

          {/* Compact 3-Stripe Vertical Navigation Menu Trigger (Visible on larger screens, hidden on mobile) */}
          <div className="relative hidden lg:block" ref={navMenuRef}>
            <button
              onClick={() => setIsNavMenuOpen(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                isNavMenuOpen 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
              title="Danh mục chức năng (Menu)"
            >
              <Menu size={17} className={isNavMenuOpen ? 'text-primary' : 'text-slate-600'} />
              <span className="hidden sm:inline-flex items-center gap-1.5 font-bold">
                {activeView === 'home' && <><Library size={15} className="text-primary" /> Thư viện</>}
                {activeView === 'learn' && <><BookOpen size={15} className="text-emerald-600" /> Học tập</>}
                {activeView === 'single-char' && <><Sparkles size={15} className="text-indigo-600" /> Chữ đơn</>}
                {activeView === 'progress' && <><Flame size={15} className="text-orange-500" /> Chuyên cần</>}
                {activeView === 'tests' && <><Zap size={15} className="text-amber-500" /> Luyện tập</>}
                {activeView === 'admin' && <><Settings size={15} className="text-purple-600" /> Quản trị</>}
              </span>
              <ChevronDown size={13} className={`transition-transform duration-200 text-slate-400 ${isNavMenuOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* Vertical Menu Dropdown Popover */}
            <AnimatePresence>
              {isNavMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl border border-slate-100 shadow-2xl p-2 z-50 divide-y divide-slate-100"
                >
                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Danh mục chức năng</p>
                  </div>

                  <div className="py-1 space-y-1">
                    {[
                      { id: 'home', label: 'Thư viện', desc: 'Sổ tay câu & chủ đề học', icon: Library, color: 'text-primary bg-primary/10' },
                      { id: 'learn', label: 'Học tập', desc: 'Luyện đọc, pinyin & dịch nghĩa', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
                      { id: 'single-char', label: 'Chữ đơn & Bộ thủ', desc: 'Video nét bút thuận & tập viết', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50' },
                      { id: 'progress', label: 'Chuyên cần', desc: 'Thống kê chuỗi ngày & giờ học', icon: Flame, color: 'text-orange-500 bg-orange-50' },
                      { id: 'tests', label: 'Luyện tập', desc: 'Khảo thí từ vựng & ghép từ', icon: Zap, color: 'text-amber-500 bg-amber-50' },
                      { id: 'admin', label: 'Quản trị', desc: 'Thêm câu mới & tạo chủ đề', icon: Settings, color: 'text-purple-600 bg-purple-50' },
                    ].map(item => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveView(item.id as any);
                            setTestType(null);
                            setIsNavMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                            isActive 
                              ? 'bg-slate-900 text-white shadow-md' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isActive ? 'bg-white/20 text-white' : item.color
                            }`}>
                              <Icon size={17} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                {item.label}
                              </p>
                              <p className={`text-[10px] sm:text-[11px] truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mr-1 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
          {/* Audio Speed Control Toggle */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/40 shrink-0">
            <button
              onClick={() => setSpeakSlowGlobal(false)}
              className={`px-1.5 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                !speakSlowGlobal ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tốc độ mặc định (1.0x)"
            >
              Nhanh
            </button>
            <button
              onClick={() => setSpeakSlowGlobal(true)}
              className={`px-1.5 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer ${
                speakSlowGlobal ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Tốc độ đọc chậm (0.5x)"
            >
              🐢 Chậm
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="w-24 lg:w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000" 
                style={{ width: user ? '75%' : '0%' }}
              ></div>
            </div>
            <span className="text-[10px] font-black text-sleek-muted uppercase tracking-tighter">{user ? 'Lv. 12' : 'Guest'}</span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
            {user ? (
              <>
                <div className="flex items-center gap-0.5 sm:gap-1 font-bold text-orange-500 text-xs sm:text-base">
                  <Flame size={14} className="sm:w-5 sm:h-5 shrink-0" fill="currentColor" /> <span className="text-xs sm:text-sm">124</span>
                </div>
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer group relative">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute top-full right-0 mt-2 hidden group-hover:block bg-white border border-sleek-border rounded-xl p-2 shadow-2xl min-w-[140px] z-50">
                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase truncate">{user.displayName || 'Học viên'}</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors text-xs sm:text-sm shrink-0"
              >
                <LogIn size={13} /> <span className="font-bold">Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-sleek-border flex items-center justify-around px-0.5 z-50 pb-safe">
        <button 
          onClick={() => { setActiveView('home'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-1 py-1 rounded-xl transition-all ${activeView === 'home' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Library size={18} className={activeView === 'home' ? 'fill-primary/10' : ''} />
          <span className="text-[9px] font-bold">Thư viện</span>
        </button>
        <button 
          onClick={() => { setActiveView('learn'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-1 py-1 rounded-xl transition-all ${activeView === 'learn' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <BookOpen size={18} className={activeView === 'learn' ? 'fill-emerald-50' : ''} />
          <span className="text-[9px] font-bold">Học tập</span>
        </button>
        <button 
          onClick={() => { setActiveView('single-char'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-1 py-1 rounded-xl transition-all ${activeView === 'single-char' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Sparkles size={18} className={activeView === 'single-char' ? 'fill-indigo-50' : ''} />
          <span className="text-[9px] font-bold">Chữ đơn</span>
        </button>
        <button 
          onClick={() => { setActiveView('progress'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-1 py-1 rounded-xl transition-all ${activeView === 'progress' ? 'text-orange-500' : 'text-slate-400'}`}
        >
          <Flame size={18} className={activeView === 'progress' ? 'fill-orange-50' : ''} />
          <span className="text-[9px] font-bold">Chuyên cần</span>
        </button>
        <button 
          onClick={() => { setActiveView('admin'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-1 py-1 rounded-xl transition-all ${activeView === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Plus size={18} className={activeView === 'admin' ? 'fill-indigo-50/50' : ''} />
          <span className="text-[9px] font-bold">Thêm mới</span>
        </button>
        <button 
          onClick={() => { setActiveView('tests'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-1 py-1 rounded-xl transition-all ${activeView === 'tests' ? 'text-orange-500' : 'text-slate-400'}`}
        >
          <Zap size={18} className={activeView === 'tests' ? 'fill-orange-50' : ''} />
          <span className="text-[9px] font-bold">Luyện tập</span>
        </button>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 p-4 md:p-8 max-w-[1440px] mx-auto w-full">
        {activeView === 'home' ? (
          /* HOME: Library View */
          <div className="space-y-4 md:space-y-8">
            {/* Desktop Library Header */}
            <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
               <div className="space-y-1">
                 <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                   <Library className="text-primary" size={28} /> Thư viện của tôi
                 </h1>
                 <p className="text-slate-500 text-sm md:text-base font-medium">Khám phá các chủ đề đã lưu và củng cố kiến thức của bạn.</p>
               </div>

               <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
                  <button 
                    onClick={() => { setSelectedFilterCategory('all'); setSelectedFilterSection('all'); }}
                    className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all
                      ${selectedFilterCategory === 'all' ? 'bg-primary text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                    `}
                  >
                    Tất cả
                  </button>
                  {categories.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => { setSelectedFilterCategory(c.id); setSelectedFilterSection('all'); }}
                      className={`px-4 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all
                        ${selectedFilterCategory === c.id ? 'bg-primary text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                      `}
                    >
                      {c.name}
                    </button>
                  ))}
               </div>
            </div>

            {/* Mobile Compact Library Header & Navigation */}
            <div className="block md:hidden bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Library className="text-primary animate-pulse" size={15} /> Thư viện của tôi
                </span>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  {categories.length} chủ đề
                </span>
              </div>

              {/* Scrollable category list */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none snap-x -mx-3 px-3">
                <button 
                  onClick={() => { setSelectedFilterCategory('all'); setSelectedFilterSection('all'); }}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 transition-all duration-150 cursor-pointer snap-start
                    ${selectedFilterCategory === 'all' 
                      ? 'bg-primary text-white shadow-sm font-black' 
                      : 'bg-slate-50 text-slate-500 border border-slate-100/30'}
                  `}
                >
                  Tất cả
                </button>
                {categories.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => { setSelectedFilterCategory(c.id); setSelectedFilterSection('all'); }}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 transition-all duration-150 cursor-pointer snap-start
                      ${selectedFilterCategory === c.id 
                        ? 'bg-primary text-white shadow-sm font-black' 
                        : 'bg-slate-50 text-slate-500 border border-slate-100/30'}
                    `}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Sub-sections scroll for Mobile */}
              {selectedFilterCategory !== 'all' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-3 px-3 pt-2.5 border-t border-slate-100/50">
                  <button 
                    onClick={() => setSelectedFilterSection('all')}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all cursor-pointer
                      ${selectedFilterSection === 'all' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-indigo-50 text-indigo-550'}
                    `}
                  >
                    Tất cả đoạn
                  </button>
                  {sections.filter(s => s.categoryId === selectedFilterCategory).map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setSelectedFilterSection(s.id)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all cursor-pointer
                        ${selectedFilterSection === s.id 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white text-indigo-400 border border-indigo-100/20'}
                      `}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedFilterCategory !== 'all' && (
              <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button 
                  onClick={() => setSelectedFilterSection('all')}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all
                    ${selectedFilterSection === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100'}
                  `}
                >
                  Tất cả đoạn
                </button>
                {sections.filter(s => s.categoryId === selectedFilterCategory).map(s => (
                  <button 
                    key={s.id}
                    onClick={() => setSelectedFilterSection(s.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all
                      ${selectedFilterSection === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-indigo-400 border border-indigo-100 hover:bg-indigo-50'}
                    `}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {finalFilteredSentences.length > 0 ? (
                finalFilteredSentences.map((sentence) => {
                  const theme = getCategoryTheme(sentence.categoryId, categories);
                  return (
                    <motion.div 
                      key={sentence.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setResult(sentence);
                        setActiveView('learn');
                      }}
                      className={`bg-white p-7 rounded-[2rem] border hover:shadow-2xl transition-all duration-300 cursor-pointer group flex flex-col h-full ${theme.border}`}
                    >
                      <div className="flex justify-between items-center mb-6">
                         <span className={`text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider ${theme.badge}`}>
                           {categories.find(c => c.id === sentence.categoryId)?.name || 'Chung'}
                         </span>
                         <div className="flex gap-1.5 items-center">
                           {(() => {
                             const diff = getDifficultyTranslation(sentence.difficulty);
                             return (
                               <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-wider shrink-0 ${diff.color}`}>
                                 {diff.label}
                               </span>
                             );
                           })()}
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                             {sections.find(s => s.id === sentence.sectionId)?.name || 'Mặc định'}
                           </span>
                         </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <h3 className={`text-xl md:text-2xl font-bold text-slate-800 mb-1 transition-colors duration-200 leading-tight tracking-[0.08em] ${theme.activeText}`}>
                              {renderHighlightedChinese(sentence.chinese, sentence.id)}
                            </h3>
                            <p className="text-sm md:text-base text-slate-400 italic font-medium">{sentence.pinyin}</p>
                          </div>
                          {sentence.illustrationSvg && (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-200/70 shrink-0 shadow-xs flex items-center justify-center">
                              {sentence.illustrationSvg.startsWith('data:image/') || sentence.illustrationSvg.startsWith('http') ? (
                                <img 
                                  src={sentence.illustrationSvg} 
                                  alt={sentence.chinese} 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div 
                                  className="w-full h-full p-1 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain" 
                                  dangerouslySetInnerHTML={{ __html: sentence.illustrationSvg }} 
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm md:text-base text-slate-600 font-medium line-clamp-3 leading-relaxed mt-2">{sentence.meaning}</p>
                        {sentence.note && (
                          <div className="mt-4 p-3 bg-amber-50/40 rounded-2xl border border-amber-100/60 flex gap-2 items-start text-left">
                            <Bookmark size={14} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-amber-800 line-clamp-2 leading-relaxed">{sentence.note}</p>
                          </div>
                        )}
                      </div>
                      <div className={`mt-6 pt-6 border-t border-slate-100/70 flex items-center justify-between text-slate-300 transition-colors duration-200 ${theme.activeText}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <BookOpen size={14} className={theme.iconColor} /> Chi tiết học tập
                        </span>
                        <ChevronRight size={18} />
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-50">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <History size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-400 mb-2">Chưa có nội dung nào</h3>
                  <button 
                    onClick={() => setActiveView('admin')}
                    className="mt-4 text-primary font-bold hover:underline"
                  >
                    Đến trang Quản trị để thêm bài học mới →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : activeView === 'learn' ? (
          /* LEARN View */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Elegant Header with Settings Trigger */}
            <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300 ${result ? 'hidden md:flex' : 'flex'}`}>
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <BookOpen className="text-emerald-500 shrink-0" size={24} /> Học tập chuyên sâu
                </h1>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center flex-wrap gap-2">
                  <span>Chủ đề: <strong className="text-emerald-600">{learnSelectedCategory === 'all' ? 'Tất cả chủ đề' : (categories.find(c => c.id === learnSelectedCategory)?.name || 'Chung')}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Mức độ: <strong className="text-amber-600">{
                    learnSelectedDifficulty === 'all' ? 'Tất cả mức độ' :
                    learnSelectedDifficulty === 'basic' ? '⭐ Cơ bản' :
                    learnSelectedDifficulty === 'easy' ? '⭐⭐ Dễ' :
                    learnSelectedDifficulty === 'medium' ? '⭐⭐⭐ Trung bình' : '⭐⭐⭐⭐ Khó'
                  }</strong></span>
                </p>
              </div>
              <button
                onClick={() => setIsLearnSettingsOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-55 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100/50 text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                <SlidersHorizontal size={14} /> Thay đổi chủ đề / Mức độ
              </button>
            </div>

            {/* Modal for Choose Topic & Difficulty */}
            <AnimatePresence>
              {isLearnSettingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsLearnSettingsOpen(false)}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  />
                  
                  {/* Modal Card */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="relative bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
                  >
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                          Cấu hình học tập
                        </span>
                        <h2 className="text-xl font-bold text-slate-800">Chọn chủ đề & Mức độ khó</h2>
                      </div>
                      <button 
                        onClick={() => setIsLearnSettingsOpen(false)}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-150 rounded-full transition-all cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                      {/* Topic Selector Block */}
                      <div className="space-y-3">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={14} className="text-emerald-500 animate-pulse" /> 
                          Chọn chủ đề học:
                        </span>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              setLearnSelectedCategory('all');
                              const filtered = savedSentences.filter(s => learnSelectedDifficulty === 'all' || (s.difficulty || 'basic') === learnSelectedDifficulty);
                              if (result) {
                                if (filtered.length > 0) {
                                  setResult(filtered[0]);
                                } else {
                                  setResult(null);
                                }
                              }
                            }}
                            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                              learnSelectedCategory === 'all'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100/50'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-transparent hover:border-slate-200'
                            }`}
                          >
                            <span className="block font-black truncate">Tất cả chủ đề</span>
                            <span className="text-[10px] opacity-80 mt-0.5 block font-medium">({savedSentences.length} câu)</span>
                          </button>
                          {categories.map((c) => {
                            const count = savedSentences.filter(s => s.categoryId === c.id).length;
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setLearnSelectedCategory(c.id);
                                  const filtered = savedSentences.filter((s) => s.categoryId === c.id && (learnSelectedDifficulty === 'all' || (s.difficulty || 'basic') === learnSelectedDifficulty));
                                  if (result) {
                                    if (filtered.length > 0) {
                                      setResult(filtered[0]);
                                    } else {
                                      setResult(null);
                                    }
                                  }
                                }}
                                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                                  learnSelectedCategory === c.id
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100/50'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-705 border border-transparent hover:border-slate-200'
                                }`}
                              >
                                <span className="block font-black truncate">{c.name}</span>
                                <span className="text-[10px] opacity-80 mt-0.5 block font-medium">({count} câu)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Difficulty Selector Block */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                          <Zap size={14} className="text-amber-500" />
                          Chọn mức độ khó:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'all', label: 'Tất cả mức độ' },
                            { id: 'basic', label: '⭐ Cơ bản' },
                            { id: 'easy', label: '⭐⭐ Dễ' },
                            { id: 'medium', label: '⭐⭐⭐ Trung bình' },
                            { id: 'hard', label: '⭐⭐⭐⭐ Khó' }
                          ].map((diff) => {
                            const count = savedSentences.filter(s => {
                              const matchesCategory = learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory;
                              const sDiff = s.difficulty || 'basic';
                              return matchesCategory && (diff.id === 'all' || sDiff === diff.id);
                            }).length;
                            
                            return (
                              <button
                                key={diff.id}
                                onClick={() => {
                                  setLearnSelectedDifficulty(diff.id);
                                  const filtered = savedSentences.filter(s => {
                                    const matchesCategory = learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory;
                                    const sDiff = s.difficulty || 'basic';
                                    const matchesDiff = diff.id === 'all' || sDiff === diff.id;
                                    return matchesCategory && matchesDiff;
                                  });
                                  if (result) {
                                    if (filtered.length > 0) {
                                      setResult(filtered[0]);
                                    } else {
                                      setResult(null);
                                    }
                                  }
                                }}
                                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left flex justify-between items-center ${
                                  learnSelectedDifficulty === diff.id
                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-100'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-transparent hover:border-slate-200'
                                }`}
                              >
                                <span className="font-black">{diff.label}</span>
                                <span className="text-[10px] opacity-80 font-medium">({count} câu)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                      <button 
                        onClick={() => setIsLearnSettingsOpen(false)}
                        className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-2xl hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
                      >
                        Xác nhận và Học ngay
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {!result ? (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-2xl mx-auto px-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                  <BookOpen size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Chưa chọn bài học</h3>
                <p className="text-slate-500 mb-8 font-medium">Chọn một câu từ danh sách bài học dưới đây để bắt đầu phân tích chi tiết:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-h-[350px] overflow-y-auto p-2 rounded-2xl bg-slate-50 border border-slate-100">
                  {savedSentences
                    .filter(s => {
                      const matchesCategory = learnSelectedCategory === 'all' ? true : s.categoryId === learnSelectedCategory;
                      const matchesDiff = learnSelectedDifficulty === 'all' ? true : (s.difficulty || 'basic') === learnSelectedDifficulty;
                      return matchesCategory && matchesDiff;
                    })
                    .map(s => (
                      <div 
                        key={s.id}
                        onClick={() => setResult(s)}
                        className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 justify-between">
                            <p className="font-bold text-slate-800 text-base truncate tracking-[0.08em] flex-1">{renderHighlightedChinese(s.chinese, s.id)}</p>
                            {(() => {
                              const diff = getDifficultyTranslation(s.difficulty);
                              return (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${diff.color} shrink-0`}>
                                  {diff.label}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-slate-400 truncate">{s.meaning}</p>
                        </div>
                      </div>
                    ))}
                  {savedSentences.filter(s => {
                    const matchesCategory = learnSelectedCategory === 'all' ? true : s.categoryId === learnSelectedCategory;
                    const matchesDiff = learnSelectedDifficulty === 'all' ? true : (s.difficulty || 'basic') === learnSelectedDifficulty;
                    return matchesCategory && matchesDiff;
                  }).length === 0 && (
                    <p className="col-span-full text-center text-slate-400 py-6 text-sm">Chưa có bài học nào được tạo trong chủ đề và mức độ khó này.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                {(() => {
                  const learnSentences = savedSentences.filter(s => {
                    const matchesCategory = learnSelectedCategory === 'all' ? true : s.categoryId === learnSelectedCategory;
                    const matchesDiff = learnSelectedDifficulty === 'all' ? true : (s.difficulty || 'basic') === learnSelectedDifficulty;
                    return matchesCategory && matchesDiff;
                  });
                  const currentIndex = learnSentences.findIndex(s => s.id === (result as SavedSentence).id);
                  const currentNo = currentIndex !== -1 ? currentIndex + 1 : 0;
                  const totalCount = learnSentences.length;
                  
                  return (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Chữ tiếng Trung, Pinyin, và Dịch nghĩa */}
                  <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">
                    <div className="sleek-card bg-white relative overflow-hidden transition-all shadow-md">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                      <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-50 pb-2">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">
                          Văn bản học tập
                        </span>
                        
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
                          {/* Speak Buttons */}
                          <button 
                            onClick={() => handleSpeak(result.chinese, false)} 
                            title="Nghe tốc độ thường (1.0x)"
                            className="p-1 bg-white text-primary rounded-lg hover:bg-primary/5 shadow-sm transition-colors flex items-center justify-center h-7 w-7 cursor-pointer"
                          >
                            <Volume2 size={15}/>
                          </button>
                          <button 
                            onClick={() => handleSpeak(result.chinese, true)} 
                            title="Nghe tốc độ chậm (0.5x)"
                            className="p-1 bg-white text-amber-600 rounded-lg hover:bg-amber-50 shadow-sm transition-colors flex items-center justify-center h-7 w-7 cursor-pointer text-xs"
                          >
                            🐢
                          </button>

                          <div className="w-[1px] h-3 bg-slate-200 mx-0.5"></div>

                          {/* Memory Test Toggles */}
                          <button 
                            onClick={() => setHidePinyin(!hidePinyin)} 
                            title={hidePinyin ? "Hiện Pinyin" : "Ẩn Pinyin"}
                            className={`p-1 rounded-lg transition-colors flex items-center justify-center h-7 w-7 cursor-pointer ${hidePinyin ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                          >
                            {hidePinyin ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                          <button 
                            onClick={() => setHideMeaning(!hideMeaning)} 
                            title={hideMeaning ? "Hiện Dịch nghĩa" : "Ẩn Dịch nghĩa"}
                            className={`p-1 rounded-lg transition-colors flex items-center justify-center h-7 w-7 cursor-pointer ${hideMeaning ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                          >
                            {hideMeaning ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                        </div>
                      </div>
                      
                      {/* Dynamic Realism Illustration Card */}
                      {result.illustrationSvg ? (
                        <div className="w-full flex flex-col items-center justify-center mb-4">
                          <div className="relative group">
                            <div 
                              onClick={() => setSelectedIllustrationModal(result)}
                              className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-md flex items-center justify-center relative cursor-zoom-in transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                              title="Nhấp để phóng to tranh minh họa"
                            >
                              {result.illustrationSvg.startsWith('data:image/') || result.illustrationSvg.startsWith('http') ? (
                                <img 
                                  src={result.illustrationSvg} 
                                  alt={result.chinese} 
                                  referrerPolicy="no-referrer" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div 
                                  className="w-full h-full flex items-center justify-center p-2 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                                  dangerouslySetInnerHTML={{ __html: result.illustrationSvg }}
                                />
                              )}
                              
                              {/* Overlay zoom badge */}
                              <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 size={10} /> Phóng to
                              </div>
                            </div>
                            
                            {/* Regeneration action & style picker */}
                            {user && 'id' in result && (
                              <div className="flex items-center justify-center gap-1.5 mt-2">
                                <button
                                  onClick={() => setShowIllustrationStyleDropdown(!showIllustrationStyleDropdown)}
                                  disabled={isGeneratingIllustration}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] rounded-lg border border-slate-200 transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Đổi phong cách vẽ chân thực"
                                >
                                  <Palette size={12} className="text-indigo-500" />
                                  <span>{
                                    chosenIllustrationStyle === 'photorealistic' ? '📸 Chân thực' :
                                    chosenIllustrationStyle === '3d-cinematic' ? '🎨 3D Sống động' :
                                    chosenIllustrationStyle === 'chinese-art' ? '🖌️ Thủy mặc' : '✨ Vector chi tiết'
                                  }</span>
                                  <ChevronDown size={10} />
                                </button>
                                
                                <button
                                  onClick={async () => {
                                    setIsGeneratingIllustration(true);
                                    try {
                                      const newArtwork = await generateRealisticIllustration(result.chinese, result.meaning, chosenIllustrationStyle);
                                      setResult(prev => prev ? { ...prev, illustrationSvg: newArtwork } as SavedSentence : null);
                                      if (user && 'id' in result && (result as SavedSentence).id) {
                                        try {
                                          await updateDoc(doc(db, 'saved_sentences', (result as SavedSentence).id), {
                                            illustrationSvg: newArtwork
                                          });
                                        } catch (dbErr) {
                                          console.error("Firestore sync error:", dbErr);
                                        }
                                      }
                                    } catch (err) {
                                      console.error("Lỗi vẽ tranh:", err);
                                    } finally {
                                      setIsGeneratingIllustration(false);
                                    }
                                  }}
                                  disabled={isGeneratingIllustration}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {isGeneratingIllustration ? (
                                    <>
                                      <Loader2 className="animate-spin" size={12} />
                                      <span>Đang vẽ...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={12} />
                                      <span>Vẽ lại chân thực</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Style selector dropdown */}
                            <AnimatePresence>
                              {showIllustrationStyleDropdown && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="absolute left-1/2 -translate-x-1/2 mt-1 z-30 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 space-y-1"
                                >
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2 py-1">Chọn phong cách tranh AI:</p>
                                  {[
                                    { id: 'photorealistic' as const, label: '📸 Chân thực (Nhiếp ảnh)', desc: 'Ảnh chụp đời thực, ánh sáng sống động' },
                                    { id: '3d-cinematic' as const, label: '🎨 3D Điện ảnh (Cinematic)', desc: 'Khối 3D sắc nét, phong cách điện ảnh' },
                                    { id: 'chinese-art' as const, label: '🖌️ Thủy mặc Trung Hoa', desc: 'Nghệ thuật tranh thủy mặc cổ phong' },
                                    { id: 'detailed-vector' as const, label: '✨ Vector Chi tiết Đa lớp', desc: 'Đồ họa vector ánh sáng gradient chi tiết' },
                                  ].map(item => (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        setChosenIllustrationStyle(item.id);
                                        setShowIllustrationStyleDropdown(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex flex-col transition-all cursor-pointer ${
                                        chosenIllustrationStyle === item.id 
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                          : 'text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{item.label}</span>
                                      <span className="text-[9px] font-medium text-slate-400">{item.desc}</span>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      ) : (
                        user && 'id' in result && (
                          <div className="mb-4 p-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                            {isGeneratingIllustration ? (
                              <div className="flex items-center gap-2 py-1 mx-auto">
                                <Loader2 className="text-emerald-500 animate-spin" size={18} />
                                <p className="text-xs text-emerald-800 font-bold animate-pulse">Đang tạo tranh AI chân thực & sống động...</p>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 text-left">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0">
                                    <Sparkles size={16} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">Tạo tranh minh họa chân thực AI</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Khắc họa bối cảnh câu văn chân thực sắc nét</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <select
                                    value={chosenIllustrationStyle}
                                    onChange={(e) => setChosenIllustrationStyle(e.target.value as IllustrationStyle)}
                                    className="text-[10px] font-bold py-1 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 cursor-pointer"
                                  >
                                    <option value="photorealistic">📸 Chân thực</option>
                                    <option value="3d-cinematic">🎨 3D Sống động</option>
                                    <option value="chinese-art">🖌️ Thủy mặc</option>
                                    <option value="detailed-vector">✨ Vector chi tiết</option>
                                  </select>
                                  
                                  <button
                                    onClick={async () => {
                                      setIsGeneratingIllustration(true);
                                      try {
                                        const newArtwork = await generateRealisticIllustration(result.chinese, result.meaning, chosenIllustrationStyle);
                                        setResult(prev => prev ? { ...prev, illustrationSvg: newArtwork } as SavedSentence : null);
                                        if (user && 'id' in result && (result as SavedSentence).id) {
                                          try {
                                            await updateDoc(doc(db, 'saved_sentences', (result as SavedSentence).id), {
                                              illustrationSvg: newArtwork
                                            });
                                          } catch (dbErr) {
                                            console.error("Firestore sync error:", dbErr);
                                          }
                                        }
                                      } catch (err) {
                                        console.error("Lỗi vẽ tranh:", err);
                                      } finally {
                                        setIsGeneratingIllustration(false);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1 shrink-0 cursor-pointer border-none"
                                  >
                                    🎨 Tạo tranh ngay
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      )}

                      <div className="mb-4 md:mb-5">
                        <p className="text-4xl md:text-6xl font-bold text-slate-800 tracking-[0.12em] mb-2.5 md:mb-3 leading-normal break-words">{renderHighlightedChinese(result.chinese, (result as any).id)}</p>
                        
                        <div className="flex items-center gap-2 group/pinyin min-h-[28px]">
                          {hidePinyin ? (
                            <span 
                              onClick={() => setHidePinyin(false)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold cursor-pointer select-none transition-all duration-200 border border-amber-100/60 animate-pulse"
                              title="Nhấp để hiển thị Pinyin"
                            >
                              <EyeOff size={12} /> Nhấp để hiện Pinyin (Kiểm tra đọc)
                            </span>
                          ) : (
                            <>
                              <p className="text-base md:text-xl text-slate-500 font-medium italic break-words">{result.pinyin}</p>
                              <button 
                                onClick={() => setHidePinyin(true)}
                                className="text-slate-300 hover:text-slate-600 transition-colors p-1 opacity-0 group-hover/pinyin:opacity-100 focus:opacity-100 cursor-pointer"
                                title="Ẩn Pinyin"
                              >
                                <EyeOff size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 md:space-y-4 pt-4 md:pt-5 border-t border-slate-50">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Dịch nghĩa</p>
                          {!hideMeaning && (
                            <button 
                              onClick={() => setHideMeaning(true)}
                              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer"
                              title="Ẩn dịch nghĩa tiếng Việt"
                            >
                              <EyeOff size={12} /> Ẩn nghĩa
                            </button>
                          )}
                        </div>

                        {hideMeaning ? (
                          <div 
                            onClick={() => setHideMeaning(false)}
                            className="p-4 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl border border-dashed border-emerald-100 text-emerald-800 text-center cursor-pointer select-none transition-all duration-200 font-bold text-xs flex items-center justify-center gap-2 animate-pulse"
                            title="Nhấp để hiển thị nghĩa tiếng Việt"
                          >
                            <EyeOff size={14} className="text-emerald-500" /> Nhấp để xem dịch nghĩa tiếng Việt (Kiểm tra nhớ)
                          </div>
                        ) : (
                          <p className="text-base md:text-lg font-bold text-slate-700 leading-relaxed">{result.meaning}</p>
                        )}
                        {!hideMeaning && ('originalText' in result) && (
                          <p className="text-xs md:text-sm text-slate-400 italic">Văn bản gốc: {(result as any).originalText}</p>
                        )}
                      </div>
                    </div>

                    {/* Ghi chú học tập / Mẫu câu thích */}
                    <div className="sleek-card bg-gradient-to-br from-amber-50/20 to-white transition-all shadow-md border border-amber-100/50 relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/5 rounded-full"></div>
                      <div className="flex items-center justify-between mb-4 relative z-10 w-full">
                        <h4 className="text-xs md:text-sm font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Bookmark size={15} className="text-amber-500 shrink-0" />
                          Ghi chú & Mẫu câu học tập
                        </h4>
                        {!isEditingNote ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNoteText((result as SavedSentence).note || '');
                              setIsEditingNote(true);
                            }}
                            className="text-[10px] md:text-xs font-black text-amber-800 hover:text-amber-950 bg-amber-100 border border-amber-200/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center shrink-0"
                          >
                            Chỉnh sửa
                          </button>
                        ) : (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingNote(false);
                                setNoteText((result as SavedSentence).note || '');
                              }}
                              className="text-[10px] md:text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveNote}
                              className="text-[10px] md:text-xs font-black text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer"
                            >
                              Lưu lại
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingNote ? (
                        <div className="space-y-3 relative z-10">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            rows={3}
                            placeholder="Nhập ghi chú bằng tiếng Việt: ví dụ mẫu câu thích, từ vựng hay cấu trúc ngữ pháp dùng trong câu này..."
                            className="w-full text-sm font-medium p-3.5 border border-amber-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 leading-relaxed bg-white/70"
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-slate-600 leading-relaxed min-h-[50px] flex flex-col justify-center relative z-10 w-full text-left">
                          {(result as SavedSentence).note ? (
                            <p className="whitespace-pre-line text-slate-700">{(result as SavedSentence).note}</p>
                          ) : (
                            <p className="text-slate-400 italic text-[11px] text-center py-2">Bạn chưa thêm ghi chú nào. Hãy nhấp "Chỉnh sửa" để tự do lưu lại các mẫu câu yêu thích hoặc cách dùng của cụm từ này bằng tiếng Việt nhé!</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Phân tích ngữ pháp và các câu phát triển */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="sleek-card bg-white transition-all shadow-md">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <BookOpen className="text-primary" /> Phân tích Bài học
                        </h3>
                        {!isEditingExplanation ? (
                          <button
                            onClick={() => {
                              setEditableExplanation(result.grammarExplanation);
                              setIsEditingExplanation(true);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
                          >
                            Sửa nhanh
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsEditingExplanation(false)}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={handleSaveExplanation}
                              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-sm transition-all"
                            >
                              Lưu lại
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingExplanation ? (
                        <div className="space-y-4">
                          {/* Formatting toolbar helper */}
                          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <button
                              type="button"
                              onClick={() => setEditableExplanation(prev => prev + ' **văn bản in đậm**')}
                              className="text-[11px] font-extrabold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                            >
                              In đậm (**)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditableExplanation(prev => prev + ' *in nghiêng*')}
                              className="text-[11px] font-bold italic px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                            >
                              Nghiêng (*)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditableExplanation(prev => prev + '\n\n• ')}
                              className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                            >
                              + Đầu dòng (•)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditableExplanation(prev => prev + '\n')}
                              className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                            >
                              Xuống dòng (Enter)
                            </button>
                          </div>

                          <textarea
                            value={editableExplanation}
                            onChange={(e) => setEditableExplanation(e.target.value)}
                            rows={12}
                            placeholder="Nhập phần phân tích ngữ pháp hoặc giải thích chi tiết..."
                            className="w-full text-sm font-medium p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-slate-700 leading-relaxed"
                          />
                        </div>
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown>{result.grammarExplanation}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {result.variations && result.variations.length > 0 && (
                      <div className="sleek-card bg-gradient-to-br from-indigo-50/50 to-white transition-all shadow-md">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Sparkles className="text-indigo-600" /> Câu phát triển bổ sung
                        </h3>
                        <div className="space-y-4">
                          {result.variations.map((v, idx) => (
                            <div key={idx} className="p-5 bg-white rounded-2xl border border-indigo-100/50 hover:border-indigo-300 transition-all group">
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-[0.1em]">{v.chinese}</p>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleSpeak(v.chinese, false)} title="Nghe thường" className="text-indigo-300 hover:text-indigo-600 transition-colors p-1 cursor-pointer">
                                    <Volume2 size={16} />
                                  </button>
                                  <button onClick={() => handleSpeak(v.chinese, true)} title="Nghe chậm" className="text-amber-500 hover:text-amber-600 transition-colors p-1 flex items-center gap-0.5 text-xs font-bold cursor-pointer">
                                    🐢 <span className="text-[9px] font-black">0.5x</span>
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-slate-400 italic mb-2">{v.pinyin}</p>
                              <p className="text-sm text-slate-600 font-medium">{v.meaning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Floating Bottom Pagination Panel */}
                <div className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl px-8 sm:px-12 py-3 rounded-full flex items-center gap-4 sm:gap-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
                  <button 
                    onClick={() => {
                      setResult(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    title="Quay lại danh sách"
                    className="p-2 sm:p-3 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <List size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  
                  <div className="w-px h-4 sm:h-5 bg-slate-200 shrink-0" />
                  
                  <button
                    onClick={() => {
                      if (totalCount === 0) return;
                      const prevIndex = (currentIndex - 1 + totalCount) % totalCount;
                      setResult(learnSentences[prevIndex]);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={totalCount <= 1}
                    className="flex items-center gap-1.5 px-4.5 sm:px-6.5 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-full transition-all duration-200 border border-emerald-100/50 cursor-pointer shrink-0"
                  >
                    ← Trước
                  </button>
                  
                  <div className="flex items-center gap-0.5 sm:gap-1 font-extrabold text-[10px] sm:text-xs text-slate-400 bg-slate-50/50 px-2.5 sm:px-3.5 py-1 rounded-full border border-slate-100 min-w-[45px] sm:min-w-[60px] justify-center shrink-0">
                    <span className="text-slate-800">{currentNo}</span>
                    <span className="text-slate-200">/</span>
                    <span>{totalCount}</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (totalCount === 0) return;
                      const nextIndex = (currentIndex + 1) % totalCount;
                      setResult(learnSentences[nextIndex]);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={totalCount <= 1}
                    className="flex items-center gap-1.5 px-5 sm:px-7.5 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none rounded-full transition-all duration-200 shadow-md shadow-emerald-100/50 cursor-pointer shrink-0"
                  >
                    Tiếp →
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
          </div>
        ) : activeView === 'admin' ? (
          /* ADMIN View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
              <div className="sleek-card">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                      <Settings className="text-indigo-600" /> Hệ thống Quản trị
                    </h2>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Phân loại học tập</span>
                        </div>

                        {/* CHỦ ĐỀ SECTION */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chủ đề (Category)</label>
                            {!isCreatingCategory ? (
                              <button 
                                type="button"
                                onClick={() => setIsCreatingCategory(true)} 
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                              >
                                + Thêm chủ đề mới
                              </button>
                            ) : null}
                          </div>

                          {isCreatingCategory ? (
                            <form onSubmit={createCategory} className="flex gap-2 bg-indigo-50/30 p-2 rounded-xl border border-indigo-100/50">
                              <input 
                                type="text" 
                                value={newCategoryName} 
                                onChange={(e) => setNewCategoryName(e.target.value)} 
                                placeholder="Nhập tên chủ đề mới..."
                                className="flex-1 text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-indigo-500 placeholder-slate-400" 
                              />
                              <button 
                                type="submit" 
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-bold text-xs cursor-pointer flex items-center justify-center disabled:opacity-50"
                                disabled={!newCategoryName.trim()}
                              >
                                <Check size={14}/>
                              </button>
                              <button 
                                type="button" 
                                onClick={() => { setIsCreatingCategory(false); setNewCategoryName(''); }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all text-xs font-bold cursor-pointer"
                              >
                                Hủy
                              </button>
                            </form>
                          ) : (
                            <select 
                              value={currentSentenceCategoryId} 
                              onChange={(e) => { setCurrentSentenceCategoryId(e.target.value); setCurrentSentenceSectionId(''); }}
                              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                            >
                              <option value="">-- Chọn chủ đề học --</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          )}
                        </div>

                        {/* ĐOẠN VĂN SECTION */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đoạn văn (Section)</label>
                            {currentSentenceCategoryId && !isCreatingSection ? (
                              <button 
                                type="button"
                                onClick={() => setIsCreatingSection(true)} 
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                              >
                                + Thêm đoạn mới
                              </button>
                            ) : null}
                          </div>

                          {isCreatingSection ? (
                            <form onSubmit={createSection} className="flex gap-2 bg-indigo-50/30 p-2 rounded-xl border border-indigo-100/50">
                              <input 
                                type="text" 
                                value={newSectionName} 
                                onChange={(e) => setNewSectionName(e.target.value)} 
                                placeholder="Nhập tên đoạn mới..."
                                className="flex-1 text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-indigo-500 placeholder-slate-400" 
                              />
                              <button 
                                type="submit" 
                                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-bold text-xs cursor-pointer flex items-center justify-center disabled:opacity-50"
                                disabled={!newSectionName.trim()}
                              >
                                <Check size={14}/>
                              </button>
                              <button 
                                type="button" 
                                onClick={() => { setIsCreatingSection(false); setNewSectionName(''); }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all text-xs font-bold cursor-pointer"
                              >
                                Hủy
                              </button>
                            </form>
                          ) : (
                            <select 
                              value={currentSentenceSectionId} 
                              onChange={(e) => setCurrentSentenceSectionId(e.target.value)}
                              disabled={!currentSentenceCategoryId}
                              className="w-full text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                            >
                              <option value="">{currentSentenceCategoryId ? '-- Chọn đoạn --' : '-- Hãy chọn chủ đề trước --'}</option>
                              {sections.filter(s => s.categoryId === currentSentenceCategoryId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          )}
                        </div>

                        {/* MỨC ĐỘ KHÓ */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mức độ khó</label>
                          <select 
                            value={inputDifficulty} 
                            onChange={(e) => setInputDifficulty(e.target.value as any)}
                            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                          >
                            <option value="basic">⭐ Cơ bản</option>
                            <option value="easy">⭐⭐ Dễ</option>
                            <option value="medium">⭐⭐⭐ Trung bình</option>
                            <option value="hard">⭐⭐⭐⭐ Khó</option>
                          </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Nhập văn bản học tập</label>
                       <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Nhập nội dung bạn muốn học..."
                        className="w-full h-40 bg-slate-50 rounded-2xl p-4 border-none outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-lg leading-relaxed"
                       />
                       <button 
                        onClick={() => handleTranslate()}
                        disabled={isLoading || !inputText.trim()}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-[0_4px_0_#4338ca] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                       >
                         {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                         {isLoading ? 'Đang tạo bài...' : 'Tạo bài học mới'}
                       </button>
                    </div>
                 </div>
              </div>

              <div className="sleek-card max-h-[400px] overflow-hidden flex flex-col">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Danh sách đã tạo</h4>
                 <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {savedSentences.map(s => (
                     <div 
                      key={s.id} 
                      onClick={() => {
                        setResult(s);
                        setInputText(s.originalText);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center group
                        ${result && (result as SavedSentence).id === s.id ? 'border-primary bg-primary/5' : 'border-slate-50 hover:border-slate-100'}
                      `}
                     >
                       <div className="truncate pr-4 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-bold text-slate-700 truncate tracking-[0.08em]">{renderHighlightedChinese(s.chinese, s.id)}</p>
                            {(() => {
                              const diff = getDifficultyTranslation(s.difficulty);
                              return (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${diff.color} shrink-0`}>
                                  {diff.label}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{s.meaning}</p>
                       </div>
                       <button onClick={(e) => handleDeleteSentence(e, s.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500"><Trash2 size={12}/></button>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            <div className="lg:col-span-7">
               {result && (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="sleek-card bg-white relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 border-b border-slate-50 pb-3">
                          <div className="flex gap-2">
                             {isSaving && <div className="text-xs font-bold text-primary flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Đang lưu...</div>}
                             {!('id' in result) ? (
                               <button 
                                onClick={saveToHistory}
                                disabled={isSaving}
                                className="text-xs font-bold bg-primary text-white px-4 py-1 rounded-lg hover:bg-primary-dark transition-all flex items-center gap-2"
                               >
                                 <Bookmark size={12}/> Lưu vào thư viện
                               </button>
                             ) : (
                               <div className="flex flex-wrap items-center gap-3">
                                 <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Đã lưu trong thư viện</div>
                                 <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-2 py-1">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Độ khó:</span>
                                   <select
                                     value={(result as SavedSentence).difficulty || 'basic'}
                                     onChange={async (e) => {
                                       const newDifficulty = e.target.value as 'basic' | 'easy' | 'medium' | 'hard';
                                       try {
                                         await updateDoc(doc(db, 'saved_sentences', (result as SavedSentence).id), {
                                           difficulty: newDifficulty
                                         });
                                         setResult(prev => prev ? { ...prev, difficulty: newDifficulty } as SavedSentence : null);
                                       } catch (err) {
                                         handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
                                       }
                                     }}
                                     className="text-[10px] font-bold border-none bg-transparent focus:outline-none cursor-pointer text-slate-700 p-0"
                                    >
                                      <option value="basic">⭐ Cơ bản</option>
                                      <option value="easy">⭐⭐ Dễ</option>
                                      <option value="medium">⭐⭐⭐ Trung bình</option>
                                      <option value="hard">⭐⭐⭐⭐ Khó</option>
                                   </select>
                                 </div>
                               </div>
                             )}
                          </div>
                          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
                            {/* Speak Buttons */}
                            <button 
                              onClick={() => handleSpeak(result.chinese, false)} 
                              title="Nghe tốc độ thường (1.0x)"
                              className="p-1 bg-white text-primary rounded-lg hover:bg-primary/5 shadow-sm transition-colors flex items-center justify-center h-7 w-7 cursor-pointer"
                            >
                              <Volume2 size={14}/>
                            </button>
                            <button 
                              onClick={() => handleSpeak(result.chinese, true)} 
                              title="Nghe tốc độ chậm (0.5x)"
                              className="p-1 bg-white text-amber-600 rounded-lg hover:bg-amber-50 shadow-sm transition-colors flex items-center justify-center h-7 w-7 cursor-pointer text-xs"
                            >
                              🐢
                            </button>

                            <div className="w-[1px] h-3 bg-slate-200 mx-0.5"></div>

                            {/* Memory Test Toggles */}
                            <button 
                              onClick={() => setHidePinyin(!hidePinyin)} 
                              title={hidePinyin ? "Hiện Pinyin" : "Ẩn Pinyin"}
                              className={`p-1 rounded-lg transition-colors flex items-center justify-center h-7 w-7 cursor-pointer ${hidePinyin ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                              {hidePinyin ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                            <button 
                              onClick={() => setHideMeaning(!hideMeaning)} 
                              title={hideMeaning ? "Hiện Dịch nghĩa" : "Ẩn Dịch nghĩa"}
                              className={`p-1 rounded-lg transition-colors flex items-center justify-center h-7 w-7 cursor-pointer ${hideMeaning ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                            >
                              {hideMeaning ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                          </div>
                       </div>
                       
                       {/* Dynamic Vector Illustration Card */}
                       {result.illustrationSvg ? (
                         <div className="w-full flex justify-center mb-6">
                           <div 
                             className="w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden p-3 bg-slate-50 border border-slate-100/80 flex items-center justify-center shadow-inner relative group select-none transition-transform hover:scale-105 duration-300" 
                             dangerouslySetInnerHTML={{ __html: result.illustrationSvg }} 
                           />
                         </div>
                       ) : (
                         user && 'id' in result && (
                           <div className="mb-6 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
                             {isGeneratingIllustration ? (
                               <div className="flex flex-col items-center gap-2.5 py-2">
                                 <Loader2 className="text-emerald-500 animate-spin" size={24} />
                                 <p className="text-xs text-slate-500 font-bold animate-pulse">Đang phác họa tranh vector AI...</p>
                               </div>
                             ) : (
                               <>
                                 <Sparkles className="text-emerald-500 mb-1.5 animate-bounce" size={18} />
                                 <p className="text-[11px] text-slate-500 font-semibold mb-2.5">Trực quan hóa câu nói bằng tranh minh họa Vector AI</p>
                                 <button
                                   onClick={async () => {
                                     setIsGeneratingIllustration(true);
                                     try {
                                       const svg = await generateIllustrationSvg(result.chinese, result.meaning);
                                       await updateDoc(doc(db, 'saved_sentences', (result as SavedSentence).id), {
                                         illustrationSvg: svg
                                       });
                                       setResult(prev => prev ? { ...prev, illustrationSvg: svg } as SavedSentence : null);
                                     } catch (err) {
                                       console.error("Lỗi vẽ tranh:", err);
                                     } finally {
                                       setIsGeneratingIllustration(false);
                                     }
                                   }}
                                   className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 cursor-pointer border-none"
                                 >
                                   🎨 Vẽ minh họa AI
                                 </button>
                               </>
                             )}
                           </div>
                         )
                       )}

                        <div className="mb-6 md:mb-8 relative" onMouseUp={handleSelection}>
                          <p className="text-4xl md:text-6xl font-bold text-slate-800 tracking-[0.12em] mb-3 md:mb-4 leading-normal break-words">{renderHighlightedChinese(result.chinese, (result as any).id)}</p>
                          
                          <div className="flex items-center gap-2 group/pinyin min-h-[32px]">
                            {hidePinyin ? (
                              <span 
                                onClick={() => setHidePinyin(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold cursor-pointer select-none transition-all duration-200 border border-amber-100/60 animate-pulse"
                                title="Nhấp để hiển thị Pinyin"
                              >
                                <EyeOff size={12} /> Nhấp để hiện Pinyin (Kiểm tra đọc)
                              </span>
                            ) : (
                              <>
                                <p className="text-base md:text-xl text-slate-500 font-medium italic break-words">{result.pinyin}</p>
                                <button 
                                  onClick={() => setHidePinyin(true)}
                                  className="text-slate-300 hover:text-slate-600 transition-colors p-1 opacity-0 group-hover/pinyin:opacity-100 focus:opacity-100 cursor-pointer"
                                  title="Ẩn Pinyin"
                                >
                                  <EyeOff size={14} />
                                </button>
                              </>
                            )}
                          </div>
                          
                          {/* Floating Selection Menu */}
                          {selectionRange && (
                            <div 
                              className="absolute z-50 flex bg-white rounded-xl shadow-2xl border border-slate-100 p-1 animate-in fade-in zoom-in duration-200"
                              style={{ 
                                top: selectionRange.top, 
                                left: selectionRange.left, 
                                transform: 'translateX(-50%)' 
                              }}
                            >
                              <button 
                                onClick={() => saveWord('word')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Plus size={14} /> Từ mới
                              </button>
                              <div className="w-px h-4 bg-slate-100 my-auto mx-1"></div>
                              <button 
                                onClick={() => saveWord('grammar')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Zap size={14} /> Ngữ pháp
                              </button>
                            </div>
                          )}
                       </div>

                       <div className="space-y-3 md:space-y-4 pt-6 md:pt-8 border-t border-slate-50">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Nghĩa bài học</p>
                            {!hideMeaning && (
                              <button 
                                onClick={() => setHideMeaning(true)}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer"
                                title="Ẩn dịch nghĩa tiếng Việt"
                              >
                                <EyeOff size={12} /> Ẩn nghĩa
                              </button>
                            )}
                          </div>

                          {hideMeaning ? (
                            <div 
                              onClick={() => setHideMeaning(false)}
                              className="p-4 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl border border-dashed border-emerald-100 text-emerald-800 text-center cursor-pointer select-none transition-all duration-200 font-bold text-xs flex items-center justify-center gap-2 animate-pulse mt-2"
                              title="Nhấp để hiển thị nghĩa tiếng Việt"
                            >
                              <EyeOff size={14} className="text-emerald-500" /> Nhấp để xem dịch nghĩa tiếng Việt (Kiểm tra nhớ)
                            </div>
                          ) : (
                            <p className="text-base md:text-lg font-bold text-slate-700 leading-relaxed">{result.meaning}</p>
                          )}
                          {!hideMeaning && ('originalText' in result) && (
                            <p className="text-xs md:text-sm text-slate-400 italic">Văn bản gốc: {(result as any).originalText}</p>
                          )}
                       </div>
                    </div>

                    <div className="sleek-card">
                     {/* Ghi chú học tập / Mẫu câu thích cho thư viện */}
                     <div className="sleek-card bg-gradient-to-br from-amber-50/20 to-white transition-all shadow-md border border-amber-100/50 relative overflow-hidden mb-6">
                       <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/5 rounded-full"></div>
                       <div className="flex items-center justify-between mb-4 relative z-10 w-full">
                         <h4 className="text-xs md:text-sm font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                           <Bookmark size={15} className="text-amber-500 shrink-0" />
                           Ghi chú & Mẫu câu học tập
                         </h4>
                         {('id' in result) ? (
                           !isEditingNote ? (
                             <button
                               type="button"
                               onClick={() => {
                                 setNoteText((result as SavedSentence).note || '');
                                 setIsEditingNote(true);
                               }}
                               className="text-[10px] md:text-xs font-black text-amber-800 hover:text-amber-950 bg-amber-100 border border-amber-200/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer inline-flex items-center shrink-0"
                             >
                               Chỉnh sửa
                             </button>
                           ) : (
                             <div className="flex gap-1.5 shrink-0">
                               <button
                                 type="button"
                                 onClick={() => {
                                   setIsEditingNote(false);
                                   setNoteText((result as SavedSentence).note || '');
                                 }}
                                 className="text-[10px] md:text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                               >
                                 Hủy
                               </button>
                               <button
                                 type="button"
                                 onClick={handleSaveNote}
                                 className="text-[10px] md:text-xs font-black text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer"
                               >
                                 Lưu lại
                               </button>
                             </div>
                           )
                         ) : null}
                       </div>

                       {('id' in result) ? (
                         isEditingNote ? (
                           <div className="space-y-3 relative z-10">
                             <textarea
                               value={noteText}
                               onChange={(e) => setNoteText(e.target.value)}
                               rows={3}
                               placeholder="Nhập ghi chú bằng tiếng Việt: ví dụ mẫu câu thích, từ vựng hay cấu trúc ngữ pháp dùng trong câu này..."
                               className="w-full text-sm font-medium p-3.5 border border-amber-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 leading-relaxed bg-white/70"
                             />
                           </div>
                         ) : (
                           <div className="text-sm font-medium text-slate-600 leading-relaxed min-h-[50px] flex flex-col justify-center relative z-10 w-full text-left">
                             {(result as SavedSentence).note ? (
                               <p className="whitespace-pre-line text-slate-700">{(result as SavedSentence).note}</p>
                             ) : (
                               <p className="text-slate-400 italic text-[11px] text-center py-2">Bạn chưa thêm ghi chú nào. Hãy nhấp "Chỉnh sửa" để tự do lưu lại các mẫu câu yêu thích hoặc cách dùng của cụm từ này bằng tiếng Việt nhé!</p>
                             )}
                           </div>
                         )
                       ) : (
                         <p className="text-slate-400 italic text-[11px] text-center py-2 relative z-10">
                           Hãy lưu câu này vào thư viện để tự do biên soạn ghi chú, lưu mẫu câu yêu thích và lưu giữ cách dùng nhé!
                         </p>
                       )}
                     </div>

                       <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BookOpen className="text-primary" /> Phân tích Bài học</h3>
                       <div className="markdown-body">
                          <ReactMarkdown>{result.grammarExplanation}</ReactMarkdown>
                       </div>
                    </div>

                    {result && (
                      <div className="sleek-card bg-gradient-to-br from-indigo-50/50 to-white space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Sparkles className="text-indigo-600" /> Câu phát triển bổ sung {result.variations && `(${result.variations.length})`}
                          </h3>
                          {!isAddingVariation ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNewVarChinese('');
                                setNewVarPinyin('');
                                setNewVarMeaning('');
                                setIsAddingVariation(true);
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                            >
                              + Thêm câu phát triển
                            </button>
                          ) : null}
                        </div>

                        {isAddingVariation && (
                          <div className="bg-white p-5 rounded-2xl border border-indigo-100 space-y-3 shadow-sm animate-in slide-in-from-top-4 duration-300">
                            <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">Thêm câu phát triển mới</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Chữ Hán</label>
                                <input
                                  type="text"
                                  value={newVarChinese}
                                  onChange={(e) => setNewVarChinese(e.target.value)}
                                  placeholder="Ví dụ: 我去商店。"
                                  className="w-full text-base font-bold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Phiên âm (Pinyin)</label>
                                <input
                                  type="text"
                                  value={newVarPinyin}
                                  onChange={(e) => setNewVarPinyin(e.target.value)}
                                  placeholder="Ví dụ: wǒ qù shāngdiàn."
                                  className="w-full text-base font-medium p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 italic text-slate-600"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase">Nghĩa tiếng Việt</label>
                              <input
                                type="text"
                                value={newVarMeaning}
                                onChange={(e) => setNewVarMeaning(e.target.value)}
                                placeholder="Ví dụ: Tôi đi đến cửa hàng."
                                className="w-full text-base font-medium p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700"
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setIsAddingVariation(false)}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={handleAddVariation}
                                disabled={!newVarChinese.trim() || !newVarMeaning.trim()}
                                className="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Lưu câu
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {result.variations && result.variations.length > 0 ? (
                            result.variations.map((v, idx) => {
                              const isEditingThisVar = editingVarIdx === idx;
                              return (
                                <div key={idx} className="p-5 bg-white rounded-2xl border border-indigo-100/50 hover:border-indigo-300 transition-all group">
                                  {isEditingThisVar ? (
                                    <div className="space-y-3">
                                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Chỉnh sửa câu phát triển</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black text-slate-400 uppercase">Chữ Hán</label>
                                          <input
                                            type="text"
                                            value={editVarChinese}
                                            onChange={(e) => setEditVarChinese(e.target.value)}
                                            className="w-full text-base font-bold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black text-slate-400 uppercase">Phiên âm (Pinyin)</label>
                                          <input
                                            type="text"
                                            value={editVarPinyin}
                                            onChange={(e) => setEditVarPinyin(e.target.value)}
                                            className="w-full text-base font-medium p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 italic text-slate-600"
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Dịch nghĩa</label>
                                        <input
                                          type="text"
                                          value={editVarMeaning}
                                          onChange={(e) => setEditVarMeaning(e.target.value)}
                                          className="w-full text-base font-medium p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => setEditingVarIdx(null)}
                                          className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        >
                                          Hủy
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveVarEdit(idx)}
                                          disabled={!editVarChinese.trim() || !editVarMeaning.trim()}
                                          className="px-4 py-1 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                                        >
                                          Cập nhật
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="flex justify-between items-start mb-2">
                                        <p className="text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-[0.1em]">{v.chinese}</p>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => handleSpeak(v.chinese, false)} 
                                            title="Phát âm thường (1x)"
                                            className="text-indigo-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                                          >
                                            <Volume2 size={15} />
                                          </button>
                                          <button 
                                            onClick={() => handleSpeak(v.chinese, true)} 
                                            title="Phát âm chậm (0.5x)"
                                            className="text-amber-500 hover:text-amber-600 transition-colors p-1 cursor-pointer text-xs font-bold"
                                          >
                                            🐢
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setEditingVarIdx(idx);
                                              setEditVarChinese(v.chinese);
                                              setEditVarPinyin(v.pinyin);
                                              setEditVarMeaning(v.meaning);
                                            }} 
                                            type="button"
                                            title="Sửa câu phát triển"
                                            className="text-slate-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                                          >
                                            <Settings size={14} />
                                          </button>
                                          <button 
                                            onClick={() => handleConfirmDeleteVar(idx)} 
                                            type="button"
                                            title="Xóa câu"
                                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-sm text-slate-400 italic mb-2">{v.pinyin}</p>
                                      <p className="text-sm text-slate-600 font-medium">{v.meaning}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 border border-dashed border-indigo-200/50 rounded-2xl bg-indigo-50/10">
                              <p className="text-xs text-slate-400 italic font-medium">Bản dịch này hiện chưa có câu phát triển bổ sung nào.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewVarChinese('');
                                  setNewVarPinyin('');
                                  setNewVarMeaning('');
                                  setIsAddingVariation(true);
                                }}
                                className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer opacity-80 hover:opacity-100"
                              >
                                Thêm câu phát triển ngay →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                 </motion.div>
               )}
            </div>
          </div>
        ) : activeView === 'progress' ? (
          /* Chuyên cần View */
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
             {/* Header */}
             <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="space-y-1">
                 <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                   <Flame className="text-orange-500 fill-orange-500/10" size={28} /> Theo dõi chuyên cần
                 </h1>
                 <p className="text-slate-500 text-sm md:text-base font-medium">Theo dõi thời gian học tập, giữ chuỗi ngày học liên tiếp và kiểm tra tiến trình bản thân.</p>
               </div>
               {user && (
                 <div className="flex items-center gap-3 bg-orange-50 text-orange-600 px-5 py-3 rounded-2xl border border-orange-100/50">
                    <Zap className="fill-orange-500 text-orange-500 shrink-0" size={24} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider opacity-75 font-bold">Chuỗi hiện tại</div>
                      <div className="text-lg font-black">{(() => {
                        const streak = calculateStudyStreak(studySessions, activeSecondsToday);
                        return `${streak} ngày liên tiếp`;
                      })()}</div>
                    </div>
                 </div>
               )}
             </div>

             {user ? (
               <div className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Today's Stats & Ticker */}
                 <div className="flex flex-col justify-between space-y-4">
                   <div>
                     <div className="flex items-center gap-2 mb-2">
                       <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                         <BookOpen size={20} />
                       </div>
                       <h3 className="text-lg font-bold text-slate-800 tracking-tight">Học tập hôm nay</h3>
                     </div>
                     <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Mục tiêu hằng ngày: ít nhất 30 phút</p>
                     
                     {/* Timer text */}
                     <div className="space-y-1">
                       <p className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                         {(() => {
                           const mins = Math.floor(activeSecondsToday / 60);
                           const secs = activeSecondsToday % 60;
                           return `${mins} phút ${secs} giây`;
                         })()}
                       </p>
                       <p className="text-sm font-semibold text-slate-500">
                         {activeSecondsToday >= 1800 ? (
                           <span className="text-emerald-600 flex items-center gap-1.5 font-bold">
                             <Check size={16} /> Đạt mục tiêu học tập hôm nay! 🎉
                           </span>
                         ) : (
                           <span className="text-slate-400">
                             Cần {Math.ceil((1800 - activeSecondsToday) / 60)} phút nữa để đạt mục tiêu hằng ngày.
                           </span>
                         )}
                       </p>
                     </div>
                   </div>

                   {/* Elegant Progress Bar */}
                   <div className="space-y-2 pt-2">
                     <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                       <span>Tiến trình</span>
                       <span>{Math.min(100, Math.round((activeSecondsToday / 1800) * 100))}%</span>
                     </div>
                     <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-emerald-500 transition-all duration-300"
                         style={{ width: `${Math.min(100, Math.round((activeSecondsToday / 1800) * 100))}%` }}
                       />
                     </div>
                   </div>
                 </div>

                 {/* Consistency Flame (Streak tracker) */}
                 <div className="flex flex-col justify-center items-center py-6 border-y lg:border-y-0 lg:border-x border-slate-150 border-dashed">
                   <div className="relative mb-2">
                     <div className="p-5 bg-orange-50 text-orange-500 rounded-[2rem] transition-transform hover:scale-110">
                       <Flame size={48} className="fill-orange-500/20" />
                     </div>
                     <span className="absolute -top-1 -right-1 bg-amber-400 text-white p-1 rounded-full text-[10px]">
                       <Zap size={10} className="fill-white" />
                     </span>
                   </div>
                   
                   <div className="text-center space-y-1 mt-2">
                     <h4 className="text-sm font-black uppercase text-slate-400 tracking-wider">Chuỗi chuyên cần</h4>
                     <p className="text-3xl font-black text-slate-800 tracking-tight">
                       {(() => {
                         const streak = calculateStudyStreak(studySessions, activeSecondsToday);
                         return `${streak} ngày`;
                       })()}
                     </p>
                     <p className="text-xs text-slate-400 max-w-[200px] font-medium mx-auto">Học tối thiểu 30 phút mỗi ngày để duy trì chuỗi học tập!</p>
                   </div>
                 </div>

                 {/* Attendance History (Last 7 Days calendar squares) */}
                 <div className="flex flex-col justify-between space-y-4">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <h4 className="text-sm font-bold text-slate-800 tracking-tight">Nhật ký 7 ngày gần đây</h4>
                       <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                         Duy trì đều đặn
                       </span>
                     </div>
                     <p className="text-xs text-slate-400 font-medium">Theo dõi hoạt động hằng ngày để tự đánh giá nỗ lực tự học.</p>
                   </div>

                   {/* 7 Days tracker boxes */}
                   <div className="grid grid-cols-7 gap-2 pt-2">
                     {getDailyHistoryData().map((day, idx) => {
                       let titleTip = `${day.label}: ${Math.floor(day.duration / 60)} phút học`;
                       
                       let colorClass = "bg-slate-50 border-slate-200/50 text-slate-400";
                       if (day.duration > 0 && day.duration < 1800) {
                         colorClass = "bg-amber-500/15 border-amber-300/60 text-amber-600";
                       } else if (day.duration >= 1800) {
                         colorClass = "bg-emerald-600 border-emerald-500 text-white";
                       }
                       
                       return (
                         <div 
                           key={idx} 
                           title={titleTip} 
                           className={`flex flex-col items-center p-2 rounded-2xl border text-center transition-all hover:translate-y-[-2px] hover:shadow-md cursor-help ${colorClass}`}
                         >
                           <span className="text-[10px] font-black uppercase tracking-wider">{day.dayOfWeek}</span>
                           <div className="my-1.5 font-bold text-xs">{day.label.split('/')[0]}</div>
                           
                           <div className={`w-1.5 h-1.5 rounded-full ${day.isGoalMet ? 'bg-white' : day.duration > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                           
                           <span className="text-[9px] font-semibold mt-1 opacity-85">{Math.floor(day.duration / 60)}p</span>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               </div>
             ) : (
               <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-4">
                 <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Lock size={32} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800">Yêu cầu đăng nhập</h2>
                 <p className="text-sm text-slate-500 px-8">Vui lòng đăng nhập tài khoản của bạn để bắt đầu tính thời gian học và lưu tích lũy ngày chuyên cần.</p>
               </div>
             )}
          </div>
        ) : activeView === 'single-char' ? (
          <SingleCharacterLearn />
        ) : (
          /* Test Center View */
          <div className="max-w-4xl mx-auto w-full">
            {!testType ? (
              /* Test Selection Screen */
              <div className="space-y-8 py-10">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-extrabold text-slate-800 mb-4 flex items-center justify-center gap-3">
                    <Zap className="text-orange-500" size={40} /> Trung tâm Khảo thí
                  </h2>
                  <p className="text-slate-500 text-lg max-w-xl mx-auto">Chọn chế độ luyện tập phù hợp để củng cố kiến thức của bạn ngay hôm nay!</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                  {/* Vocabulary Test Card */}
                  <motion.div 
                    whileHover={{ y: -8 }}
                    onClick={() => startVocabQuiz()}
                    className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-orange-500/30 transition-all flex flex-col justify-between"
                  >
                    <div className="w-full">
                      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Bookmark size={28} className="text-orange-500 fill-orange-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">Kiểm tra Từ vựng</h3>
                      <p className="text-slate-500 text-xs md:text-sm mb-4 leading-relaxed">Ôn tập các từ vựng và cấu trúc bạn đã lưu trong quá trình học. Thử thách trí nhớ với flashcards.</p>

                      {/* Category Selection Dropdown inside card */}
                      <div className="mt-4 text-left w-full space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Bookmark size={11} className="text-orange-500 fill-orange-50" />
                            Chọn chủ đề ôn tập:
                          </label>
                          <select
                            value={vocabSelectedCategory}
                            onChange={(e) => setVocabSelectedCategory(e.target.value)}
                            className="w-full text-xs font-bold p-3 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 bg-slate-50 text-slate-700 cursor-pointer transition-all"
                          >
                            <option value="all">Tất cả chủ đề ({vocabulary.length})</option>
                            {categories.map((c) => {
                              const count = vocabulary.filter(v => {
                                const sentence = savedSentences.find(s => s.id === v.sentenceId);
                                return sentence && sentence.categoryId === c.id;
                              }).length;
                              return (
                                <option key={c.id} value={c.id}>{c.name} ({count})</option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Zap size={11} className="text-orange-500 fill-orange-555" />
                            Chọn mức độ khó:
                          </label>
                          <select
                            value={vocabSelectedDifficulty}
                            onChange={(e) => setVocabSelectedDifficulty(e.target.value)}
                            className="w-full text-xs font-bold p-3 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 bg-slate-50 text-slate-700 cursor-pointer transition-all"
                          >
                            <option value="all">Tất cả mức độ</option>
                            <option value="basic">⭐ Cơ bản</option>
                            <option value="easy">⭐⭐ Dễ</option>
                            <option value="medium">⭐⭐⭐ Trung bình</option>
                            <option value="hard">⭐⭐⭐⭐ Khó</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-orange-500 font-bold text-sm group-hover:gap-4 transition-all mt-6">
                      Bắt đầu ngay <ChevronRight size={16} />
                    </div>
                  </motion.div>

                {/* Grammar Test Card */}
                <motion.div 
                  whileHover={{ y: -8 }}
                  onClick={() => startQuiz()}
                  className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-primary/30 transition-all flex flex-col justify-between"
                >
                  <div className="w-full">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Zap size={28} className="text-primary fill-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Thử thách Ngôn ngữ</h3>
                    <p className="text-slate-500 text-xs md:text-sm mb-4 leading-relaxed">Dịch câu trong 15 giây. Luyện tập phản xạ dịch nhanh giữa Tiếng Việt và Tiếng Trung.</p>
                    
                    {/* Category Selection Dropdown inside card */}
                    <div className="mt-4 text-left space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Bookmark size={11} className="text-emerald-500 fill-emerald-50" />
                          Chọn chủ đề học tập:
                        </label>
                        <select
                          value={grammarSelectedCategory}
                          onChange={(e) => setGrammarSelectedCategory(e.target.value)}
                          className="w-full text-xs font-bold p-3 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary bg-slate-50 text-slate-700 cursor-pointer transition-all"
                        >
                          <option value="all">Tất cả chủ đề ({savedSentences.length})</option>
                          {categories.map((c) => {
                            const count = savedSentences.filter(s => s.categoryId === c.id).length;
                            return (
                              <option key={c.id} value={c.id}>{c.name} ({count})</option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Zap size={11} className="text-emerald-500 fill-emerald-50" />
                          Chọn mức độ khó:
                        </label>
                        <select
                          value={grammarSelectedDifficulty}
                          onChange={(e) => setGrammarSelectedDifficulty(e.target.value)}
                          className="w-full text-xs font-bold p-3 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary bg-slate-50 text-slate-700 cursor-pointer transition-all"
                        >
                          <option value="all">Tất cả mức độ</option>
                          <option value="basic">⭐ Cơ bản</option>
                          <option value="easy">⭐⭐ Dễ</option>
                          <option value="medium">⭐⭐⭐ Trung bình</option>
                          <option value="hard">⭐⭐⭐⭐ Khó</option>
                        </select>
                      </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setQuizMode('zh2vi')}
                        className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                          quizMode === 'zh2vi'
                            ? 'bg-primary border-primary text-white shadow-sm shadow-emerald-200'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Trung ➔ Việt
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuizMode('vi2zh')}
                        className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                          quizMode === 'vi2zh'
                            ? 'bg-primary border-primary text-white shadow-sm shadow-emerald-200'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Việt ➔ Trung
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-4 transition-all mt-6">
                    Bắt đầu ngay <ChevronRight size={16} />
                  </div>
                </motion.div>

                {/* Word Order Test Card */}
                <motion.div 
                  whileHover={{ y: -8 }}
                  onClick={() => startWordOrderQuiz()}
                  className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                >
                  <div className="w-full">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Sparkles size={28} className="text-indigo-600 fill-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Sắp xếp Trật tự Từ</h3>
                    <p className="text-slate-500 text-xs md:text-sm mb-4 leading-relaxed">Sắp xếp các mảnh từ, chữ Hán thành câu hoàn chỉnh dựa trên câu dịch nghĩa tiếng Việt.</p>

                    {/* Category Selection Dropdown inside card */}
                    <div className="mt-4 text-left space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Bookmark size={11} className="text-indigo-500 fill-indigo-100" />
                          Chọn chủ đề học tập:
                        </label>
                        <select
                          value={wordOrderSelectedCategory}
                          onChange={(e) => setWordOrderSelectedCategory(e.target.value)}
                          className="w-full text-xs font-bold p-3 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50 text-slate-700 cursor-pointer transition-all"
                        >
                          <option value="all">Tất cả chủ đề ({savedSentences.length})</option>
                          {categories.map((c) => {
                            const count = savedSentences.filter(s => s.categoryId === c.id).length;
                            return (
                              <option key={c.id} value={c.id}>{c.name} ({count})</option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Zap size={11} className="text-indigo-500" />
                          Chọn mức độ khó:
                        </label>
                        <select
                          value={wordOrderSelectedDifficulty}
                          onChange={(e) => setWordOrderSelectedDifficulty(e.target.value)}
                          className="w-full text-xs font-bold p-3 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50 text-slate-700 cursor-pointer transition-all"
                        >
                          <option value="all">Tất cả mức độ</option>
                          <option value="basic">⭐ Cơ bản</option>
                          <option value="easy">⭐⭐ Dễ</option>
                          <option value="medium">⭐⭐⭐ Trung bình</option>
                          <option value="hard">⭐⭐⭐⭐ Khó</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm group-hover:gap-4 transition-all mt-6">
                    Bắt đầu ngay <ChevronRight size={16} />
                  </div>
                </motion.div>
              </div>

              {/* Statistics & Sổ tay từ vựng / ngữ pháp đã lưu panel */}
              {vocabulary.length > 0 && (
                <div className="bg-white p-5 md:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/30 space-y-5 md:space-y-6 mt-8">
                  {/* Panel Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1 text-left">
                      <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                        <BookOpen className="text-orange-500" size={20} /> Sổ tay học tập (Từ vựng & Ngữ pháp)
                      </h3>
                      <p className="text-[11px] md:text-xs text-slate-500 font-medium font-sans">Tổng hợp các kiến thức bạn đã bôi đen và ghi nhớ.</p>
                    </div>

                    {/* Quick filters counter badges */}
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                      <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-600 tracking-wider uppercase">
                        Tất cả: <span className="font-black text-slate-900 ml-1">{vocabulary.length}</span>
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50/50 border border-emerald-100/30 rounded-lg text-[9px] font-black text-emerald-600 tracking-wider uppercase">
                        Từ vựng: <span className="font-black text-emerald-800 ml-1">{vocabulary.filter(v => v.type === 'word').length}</span>
                      </span>
                      <span className="px-2.5 py-1 bg-indigo-50/50 border border-indigo-100/30 rounded-lg text-[9px] font-black text-indigo-600 tracking-wider uppercase">
                        Ngữ pháp: <span className="font-black text-indigo-800 ml-1">{vocabulary.filter(v => v.type === 'grammar').length}</span>
                      </span>
                    </div>
                  </div>

                  {/* Search, Filter Action Bar */}
                  <div className="flex flex-col md:flex-row gap-2.5">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        value={vocabSearchQuery}
                        onChange={(e) => setVocabSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm cụm từ đã lưu..."
                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-none placeholder:text-slate-400 text-slate-700"
                      />
                      {vocabSearchQuery && (
                        <button 
                          onClick={() => setVocabSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1 overflow-x-auto pb-0.5 md:pb-0 scrollbar-none shrink-0">
                      <button 
                        onClick={() => setVocabFilterType('all')}
                        className={`px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-150
                          ${vocabFilterType === 'all' 
                            ? 'bg-slate-800 border-slate-800 text-white shadow-sm' 
                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}
                        `}
                      >
                        Tất cả
                      </button>
                      <button 
                        onClick={() => setVocabFilterType('word')}
                        className={`px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-150
                          ${vocabFilterType === 'word' 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                            : 'bg-emerald-50/25 border-emerald-100/20 text-emerald-700 hover:bg-emerald-50'}
                        `}
                      >
                        Từ mới
                      </button>
                      <button 
                        onClick={() => setVocabFilterType('grammar')}
                        className={`px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-150
                          ${vocabFilterType === 'grammar' 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                            : 'bg-indigo-50/25 border-indigo-100/20 text-indigo-700 hover:bg-indigo-50'}
                        `}
                      >
                        Ngữ pháp
                      </button>
                    </div>
                  </div>

                  {/* List of vocabulary contents */}
                  {vocabulary.filter(v => {
                    const matchesSearch = v.word.toLowerCase().includes(vocabSearchQuery.toLowerCase());
                    const matchesType = vocabFilterType === 'all' || v.type === vocabFilterType;
                    return matchesSearch && matchesType;
                  }).length === 0 ? (
                    <div className="py-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-xs font-sans">Không tìm thấy từ học tập nào trùng khớp.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {vocabulary.filter(v => {
                        const matchesSearch = v.word.toLowerCase().includes(vocabSearchQuery.toLowerCase());
                        const matchesType = vocabFilterType === 'all' || v.type === vocabFilterType;
                        return matchesSearch && matchesType;
                      }).map((v) => {
                        const isExpanded = expandedVocabId === v.id;
                        const matchSentence = savedSentences.find(s => s.id === v.sentenceId);
                        
                        return (
                          <div 
                            key={v.id}
                            className={`border rounded-2xl p-3.5 transition-all duration-200 text-left flex flex-col justify-between ${
                              isExpanded 
                                ? 'sm:col-span-2 md:col-span-3 bg-slate-50 border-slate-200/80 shadow-md ring-4 ring-slate-100/30' 
                                : v.type === 'grammar' 
                                  ? 'bg-indigo-50/5 hover:bg-indigo-50/20 border-indigo-50 hover:border-indigo-100/60' 
                                  : 'bg-emerald-50/5 hover:bg-emerald-50/20 border-emerald-50 hover:border-emerald-100/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* Main Word or grammar click to expand */}
                              <div 
                                onClick={() => setExpandedVocabId(isExpanded ? null : v.id)}
                                className="flex-1 cursor-pointer focus:outline-none"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                    v.type === 'grammar' 
                                      ? 'bg-indigo-100 text-indigo-700' 
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {v.type === 'grammar' ? 'Ngữ pháp' : 'Từ vựng'}
                                  </span>
                                  {matchSentence && (
                                    <span className="text-[9px] font-bold text-slate-400 hover:text-slate-600 underline">
                                      {isExpanded ? 'Thu gọn' : 'Xem ngữ cảnh gốc'}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-lg md:text-xl font-black text-slate-800 mt-1 pb-1 tracking-wide">
                                  {v.word}
                                </h4>
                              </div>

                              {/* Small Quick Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleSpeak(v.word, false); }}
                                  title="Phát âm thường (1x)"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                >
                                  <Volume2 size={12} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleSpeak(v.word, true); }}
                                  title="Phát âm chậm (0.5x)"
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors cursor-pointer text-xs font-bold leading-none"
                                >
                                  🐢
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => handleDeleteVocabulary(e, v.id, v.word)}
                                  title="Xóa khỏi sổ tay"
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Context block */}
                            {isExpanded && matchSentence && (
                              <div className="mt-3 pt-3 border-t border-slate-200 w-full grid grid-cols-1 md:grid-cols-12 gap-3 animate-in fade-in duration-200">
                                <div className="md:col-span-8 space-y-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ngữ cảnh gốc bài học</p>
                                  <p className="text-base font-bold text-slate-800 tracking-[0.05em] leading-relaxed">
                                    {renderHighlightedChinese(matchSentence.chinese, matchSentence.id)}
                                  </p>
                                  <p className="text-xs text-slate-400 italic font-medium">{matchSentence.pinyin}</p>
                                  <p className="text-xs md:text-sm text-slate-600 font-semibold">{matchSentence.meaning}</p>
                                </div>

                                <div className="md:col-span-4 flex items-end justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResult(matchSentence);
                                      setActiveView('learn');
                                    }}
                                    className="w-full md:w-auto px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition duration-150 flex items-center justify-center gap-1 shadow-sm"
                                  >
                                    <BookOpen size={12} /> Chi tiết bài học
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Active Test Interface */
            <div className={`${testType === 'word-order' ? 'max-w-6xl' : 'max-w-2xl'} mx-auto w-full py-2 md:py-6 px-2 md:px-0`}>
              <button 
                onClick={() => setTestType(null)}
                className="mb-3 md:mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold transition-colors text-xs md:text-base"
              >
                <ChevronRight size={18} className="rotate-180" /> Quay lại danh sách test
              </button>

              <AnimatePresence mode="wait">
                {testType === 'grammar' ? (
                  /* Grammar Quiz UI (existing logic but refocused) */
                  <motion.div 
                    key="grammar-quiz"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="sleek-card p-4 md:p-8 min-h-[350px] md:min-h-[500px] flex flex-col items-center justify-center text-center relative overflow-hidden bg-white"
                  >
                    {/* Question Section */}
                    <div className="mb-4 md:mb-12 w-full px-2 md:px-6">
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2 md:mb-4">
                        <span className="text-[9px] md:text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100/80 px-2.5 py-0.5 md:py-1 rounded-full uppercase tracking-wider">
                          Chủ đề: {categories.find(c => c.id === quizSentence?.categoryId)?.name || 'Chưa phân loại'}
                        </span>
                        <span className="text-[9px] md:text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 md:py-1 rounded-full uppercase tracking-wider">
                          {quizMode === 'zh2vi' ? 'Trung ➔ Việt' : 'Việt ➔ Trung'}
                        </span>
                      </div>
                      <h3 className={`text-xl md:text-5xl lg:text-7xl font-bold text-primary leading-tight flex flex-wrap items-center justify-center gap-2 ${quizMode === 'zh2vi' ? 'tracking-[0.05em] md:tracking-[0.1em]' : ''}`}>
                        {quizMode === 'zh2vi' ? quizSentence?.chinese : quizSentence?.originalText}
                        {quizMode === 'zh2vi' && (
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSpeak(quizSentence?.chinese || '', false); }}
                              title="Nghe thường (1.0x)"
                              className="p-1.5 md:p-2 bg-indigo-50 text-indigo-500 rounded-full hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                              <Volume2 size={18} className="md:w-6 md:h-6" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSpeak(quizSentence?.chinese || '', true); }}
                              title="Nghe chậm (0.5x)"
                              className="p-1.5 md:p-2 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors cursor-pointer flex items-center justify-center"
                            >
                              <span className="text-sm md:text-lg">🐢</span>
                            </button>
                          </div>
                        )}
                      </h3>
                    </div>

                    {quizStage === 'running' ? (
                      <div className="flex flex-col items-center">
                        <div className="relative w-24 h-24 md:w-32 md:h-32 mb-4 md:mb-8 flex items-center justify-center">
                          <svg viewBox="0 0 128 128" className="absolute inset-0 w-full h-full -rotate-90">
                            <circle 
                              cx="64" cy="64" r="60" 
                              className="stroke-slate-100 fill-none" 
                              strokeWidth="8" 
                            />
                            <circle 
                              cx="64" cy="64" r="60" 
                              className="stroke-orange-500 fill-none transition-all duration-1000 ease-linear" 
                              strokeWidth="8"
                              strokeDasharray={`${2 * Math.PI * 60}`}
                              strokeDashoffset={`${(2 * Math.PI * 60) * (1 - quizTimer / 15)}`}
                            />
                          </svg>
                          <span className="text-3xl md:text-5xl font-black text-orange-500">{quizTimer}</span>
                        </div>
                        <p className="text-sm md:text-xl font-bold text-slate-500">
                          {quizTimer > 0 ? (quizMode === 'zh2vi' ? 'Hãy nhớ nghĩa câu này!' : 'Dịch câu này sang tiếng Trung!') : 'Hết giờ! Đang hiển thị kết quả...'}
                        </p>
                        <button 
                          onClick={() => {
                            setQuizTimer(0);
                            setQuizStage('revealed');
                          }}
                          className="mt-4 md:mt-8 px-6 py-2 bg-slate-100 text-slate-600 rounded-xl md:rounded-2xl font-bold hover:bg-slate-200 transition-all text-xs md:text-sm"
                        >
                          Hiện đáp án sớm
                        </button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 md:space-y-6 w-full px-1 md:px-6"
                      >
                        <div className={`p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 ${quizMode === 'zh2vi' ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
                          <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest mb-2 md:mb-4">Đáp án chính xác</p>
                          {quizMode === 'zh2vi' ? (
                            <h3 className="text-lg md:text-3xl lg:text-4xl font-bold text-slate-800 leading-tight">
                              {quizSentence?.originalText}
                            </h3>
                          ) : (
                            <>
                              <div className="flex items-center justify-center gap-2 mb-2 md:mb-4">
                                <h3 className="text-2xl md:text-5xl lg:text-7xl font-bold text-slate-800 tracking-[0.05em] md:tracking-[0.12em]">{quizSentence?.chinese}</h3>
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    onClick={() => handleSpeak(quizSentence?.chinese || '', false)}
                                    title="Nghe thường (1.0x)"
                                    className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors cursor-pointer flex items-center justify-center"
                                  >
                                    <Volume2 size={20} className="md:w-6 md:h-6" />
                                  </button>
                                  <button 
                                    onClick={() => handleSpeak(quizSentence?.chinese || '', true)}
                                    title="Nghe chậm (0.5x)"
                                    className="p-1.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors cursor-pointer flex items-center justify-center"
                                  >
                                    <span className="text-sm md:text-lg">🐢</span>
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm md:text-2xl text-slate-500 italic font-medium">{quizSentence?.pinyin}</p>
                            </>
                          )}
                        </div>
                        
                        <div className="flex gap-3 md:gap-4 max-w-xs md:max-w-md mx-auto w-full">
                          <button 
                            onClick={() => startQuiz()}
                            className="flex-1 py-2.5 md:py-4 bg-primary text-white rounded-xl md:rounded-2xl font-bold text-sm md:text-lg shadow-[0_3px_0_#065f46] md:shadow-[0_4px_0_#065f46] hover:bg-primary-dark active:translate-y-1 active:shadow-none transition-all"
                          >
                            Tiếp theo
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : testType === 'vocabulary' ? (
                  /* Vocabulary Quiz UI */
                  <motion.div 
                    key="vocab-quiz"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="sleek-card p-4 md:p-8 min-h-[350px] md:min-h-[500px] flex flex-col items-center justify-between text-center bg-white"
                  >
                    {/* Header with Progress Bar & Counter */}
                    <div className="w-full mb-4 md:mb-6">
                      <div className="flex items-center justify-between gap-3 mb-2 px-1">
                        <button
                          type="button"
                          onClick={prevVocabWord}
                          disabled={vocabQuizList.length <= 1}
                          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <ChevronRight size={14} className="rotate-180" /> Từ trước
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs md:text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                            Từ <span className="text-primary font-black">{vocabQuizIndex + 1}</span> / {vocabQuizList.length || 1}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={nextVocabWord}
                          disabled={vocabQuizList.length <= 1}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          Từ sau <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-primary rounded-full transition-all duration-300"
                          style={{
                            width: `${vocabQuizList.length > 0 ? Math.round(((vocabQuizIndex + 1) / vocabQuizList.length) * 100) : 100}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="my-2 md:my-6 w-full px-2 md:px-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-4">Bạn có nhớ từ này không?</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                        <h3 className={`text-4xl md:text-8xl lg:text-9xl font-black leading-tight tracking-[0.05em] md:tracking-[0.1em] ${quizWord?.type === 'grammar' ? 'text-indigo-600' : 'text-orange-600'}`}>
                          {quizWord?.word}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleSpeak(quizWord?.word || '', false)}
                            title="Nghe thường"
                            className={`p-1.5 md:p-4 rounded-full transition-colors cursor-pointer ${quizWord?.type === 'grammar' ? 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100' : 'bg-orange-50 text-orange-500 hover:bg-orange-100'}`}
                          >
                            <Volume2 size={20} className="md:w-10 md:h-10" />
                          </button>
                          <button 
                            onClick={() => handleSpeak(quizWord?.word || '', true)}
                            title="Nghe chậm"
                            className="p-1.5 md:p-4 rounded-full transition-colors bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer flex items-center justify-center border border-amber-200/50"
                          >
                            <span className="text-xl md:text-3xl">🐢</span>
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 md:mt-4">
                        <span className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${quizWord?.type === 'grammar' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                          {quizWord?.type === 'grammar' ? 'Cấu trúc Ngữ pháp' : 'Từ vựng'}
                        </span>
                      </div>
                    </div>

                    {quizStage === 'running' ? (
                      <div className="space-y-4 md:space-y-6 w-full px-4 md:px-8">
                        <div className="flex flex-col items-center">
                          <button 
                            type="button"
                            onClick={() => setShowQuizHint(!showQuizHint)}
                            className={`font-bold px-4 py-2 md:px-6 md:py-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 md:gap-2 mb-4 md:mb-6 text-xs md:text-sm cursor-pointer ${
                              showQuizHint 
                                ? 'bg-amber-100 border-amber-200 text-amber-800 shadow-sm' 
                                : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            <Lightbulb size={16} className={showQuizHint ? "text-amber-600 fill-amber-300" : "text-amber-500"} /> 
                            {showQuizHint ? 'Ẩn gợi ý ngữ cảnh' : 'Xem gợi ý ngữ cảnh'}
                          </button>

                          {showQuizHint && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="w-full max-w-sm bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-100 rounded-2xl p-4 md:p-5 mb-6 text-left shadow-md"
                            >
                              <div className="flex items-center gap-2 mb-2 text-amber-800">
                                <Lightbulb size={14} className="text-amber-600 fill-amber-300 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Ngữ cảnh gốc ví dụ</span>
                              </div>
                              {(() => {
                                const sentence = savedSentences.find(s => s.id === quizWord?.sentenceId);
                                if (sentence) {
                                  return (
                                    <div className="space-y-2">
                                      {isCensoring ? (
                                        <div className="flex items-center gap-2 text-amber-700 font-medium py-1">
                                          <div className="w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin"></div>
                                          <span className="text-xs md:text-sm italic">Đang phân tích ẩn nghĩa từ...</span>
                                        </div>
                                      ) : (
                                        <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed tracking-wide">
                                          {hideVocabMeaning && censoredContextText ? censoredContextText : sentence.originalText}
                                        </p>
                                      )}
                                      
                                      <div className="mt-2 pt-2 border-t border-amber-200/30 flex flex-wrap items-center justify-between gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setHideVocabMeaning(!hideVocabMeaning)}
                                          className="text-[9px] md:text-[10px] bg-amber-200/60 hover:bg-amber-200 text-amber-900 font-black px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-amber-300/40"
                                        >
                                          {hideVocabMeaning ? "Hiện nghĩa đầy đủ" : "Ẩn nghĩa của từ"}
                                        </button>
                                        
                                        <span className="text-[8px] md:text-[9px] text-amber-800/80 font-bold italic">
                                          {hideVocabMeaning ? "💡 Đã ẩn nghĩa từ mục tiêu" : "💡 Đang hiện nghĩa đầy đủ"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <p className="text-slate-500 italic text-xs md:text-sm">Không tìm thấy ngữ cảnh câu ví dụ.</p>
                                  );
                                }
                              })()}
                            </motion.div>
                          )}
                          
                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                            <button 
                              type="button"
                              onClick={() => {
                                setQuizStage('revealed');
                                setShowQuizHint(false); // Hide the hint once answer is revealed
                              }}
                              className="flex-1 w-full py-3.5 md:py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-base md:text-lg shadow-lg shadow-slate-200 transition-all active:scale-[0.98] cursor-pointer"
                            >
                              XEM ĐÁP ÁN
                            </button>

                            <button 
                              type="button"
                              onClick={nextVocabWord}
                              className="w-full sm:w-auto px-5 py-3.5 md:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm md:text-base shadow-md shadow-emerald-200 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                              title="Từ này đã biết, chuyển ngay sang từ tiếp theo"
                            >
                              Đã biết, từ tiếp theo <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 md:space-y-6 w-full px-2 md:px-6"
                      >
                        <div className={`p-4 md:p-8 rounded-2xl md:rounded-[3rem] border-2 ${quizWord?.type === 'grammar' ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                          <div className="flex items-center justify-between mb-3 md:mb-6 border-b border-slate-100 pb-2">
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Ngữ cảnh & Ý nghĩa</p>
                            <button
                              type="button"
                              onClick={() => setHideVocabMeaning(!hideVocabMeaning)}
                              className="text-[9px] md:text-[10px] bg-white hover:bg-slate-50 text-slate-600 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer border border-slate-200 shadow-sm"
                            >
                              {hideVocabMeaning ? "Hiện nghĩa đầy đủ" : "Ẩn nghĩa của từ"}
                            </button>
                          </div>
                          {savedSentences.find(s => s.id === quizWord?.sentenceId) ? (
                            <div className="space-y-2 md:space-y-4">
                              <p className="text-xl md:text-3xl lg:text-4xl font-bold text-slate-800 leading-relaxed tracking-[0.05em] md:tracking-[0.12em]">
                                {savedSentences.find(s => s.id === quizWord?.sentenceId)?.chinese}
                              </p>
                              {isCensoring ? (
                                <div className="flex items-center gap-2 text-slate-400 py-1 justify-center">
                                  <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
                                  <span className="text-xs md:text-sm italic">Đang phân tích ẩn nghĩa từ...</span>
                                </div>
                              ) : (
                                <p className="text-sm md:text-xl text-slate-500 italic font-medium">
                                  {hideVocabMeaning && censoredContextText ? censoredContextText : savedSentences.find(s => s.id === quizWord?.sentenceId)?.originalText}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-500 italic text-sm">Dữ liệu câu ví dụ đã bị xóa hoặc không tồn tại.</p>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
                          <button 
                            onClick={prevVocabWord}
                            disabled={vocabQuizList.length <= 1}
                            className="w-full sm:w-auto px-5 py-3 md:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl md:rounded-2xl font-bold text-sm md:text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ChevronRight size={18} className="rotate-180" /> Từ trước
                          </button>
                          <button 
                            onClick={nextVocabWord}
                            className="flex-1 w-full py-3.5 md:py-4 bg-primary text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            Từ tiếp theo <ChevronRight size={18} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  /* Word Order Quiz UI with Sentence Selection List */
                  <motion.div
                    key="word-order-quiz-container"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start w-full"
                  >
                    {/* Left Sidebar: List of available sentences */}
                    <div className="lg:col-span-4 order-2 lg:order-1 space-y-3 w-full">
                      <div className="sleek-card bg-white p-3 md:p-5 border border-slate-100 flex flex-col h-[280px] lg:h-[525px]">
                        <div className="flex items-center justify-between mb-2 md:mb-3 border-b border-slate-50 pb-2">
                          <h4 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={14} className="text-indigo-500" />
                            Danh sách câu hỏi ({
                              wordOrderSelectedCategory === 'all'
                                ? savedSentences.length
                                : savedSentences.filter(s => s.categoryId === wordOrderSelectedCategory).length
                            })
                          </h4>
                        </div>

                        {/* Category Filter Tabs for Word Order */}
                        <div className="flex gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none snap-x cursor-pointer max-w-full">
                          <button
                            type="button"
                            onClick={() => setWordOrderSelectedCategory('all')}
                            className={`px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-bold shrink-0 transition-all duration-150 cursor-pointer ${
                              wordOrderSelectedCategory === 'all'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Tất cả ({savedSentences.length})
                          </button>
                          {categories.map((c) => {
                            const count = savedSentences.filter(s => s.categoryId === c.id).length;
                            return (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => setWordOrderSelectedCategory(c.id)}
                                className={`px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-bold shrink-0 transition-all duration-150 cursor-pointer ${
                                  wordOrderSelectedCategory === c.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {c.name} ({count})
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                          {savedSentences
                            .filter(s => wordOrderSelectedCategory === 'all' ? true : s.categoryId === wordOrderSelectedCategory)
                            .map((s, idx) => {
                              const isCurrent = quizSentence?.id === s.id;
                              const category = categories.find(c => c.id === s.categoryId);
                              return (
                                <button
                                  key={`select-sentence-${s.id}`}
                                  onClick={() => startWordOrderQuiz(s)}
                                  className={`w-full text-left p-2.5 md:p-3.5 rounded-xl md:rounded-2xl border transition-all duration-150 flex flex-col gap-1 focus:outline-none cursor-pointer ${
                                    isCurrent
                                      ? 'border-indigo-500 bg-indigo-50/40 shadow-sm border-2'
                                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400">
                                      Câu {idx + 1}
                                    </span>
                                    {category && (
                                      <span className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-50 border border-indigo-100 text-indigo-600">
                                        {category.name}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs md:text-sm font-extrabold ${isCurrent ? 'text-indigo-950 font-black' : 'text-slate-800'} line-clamp-1 md:line-clamp-2 leading-snug`}>
                                    {s.originalText || s.meaning}
                                  </p>
                                  <p className="text-[10px] md:text-[11px] text-slate-500 font-medium truncate tracking-[0.05em] md:tracking-[0.08em]">
                                    {s.chinese}
                                  </p>
                                </button>
                              );
                            })}
                          
                          {savedSentences.filter(s => wordOrderSelectedCategory === 'all' ? true : s.categoryId === wordOrderSelectedCategory).length === 0 && (
                            <div className="text-center py-8 text-slate-400 font-medium text-xs">
                              Chưa có câu nào trong chủ đề này.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right column: Main Word Order Quiz UI Card */}
                    <div className="lg:col-span-8 order-1 lg:order-2 w-full">
                      <div className="sleek-card min-h-[350px] lg:min-h-[525px] flex flex-col justify-between bg-white p-4 md:p-8">
                        {/* Header of Quiz */}
                        <div className="w-full text-center mb-4 md:mb-6">
                          <h4 className="text-lg md:text-2xl lg:text-3xl font-black text-slate-800 leading-normal max-w-2xl mx-auto px-2 md:px-4">
                            “ {quizSentence?.originalText || quizSentence?.meaning} ”
                          </h4>
                        </div>

                        {/* Result and Canvas area */}
                        <div className="w-full space-y-4 md:space-y-6">
                          {/* Selected Area */}
                          <div className="w-full min-h-[60px] md:min-h-[90px] border-2 border-dashed border-slate-200 rounded-2xl md:rounded-[2rem] p-2 md:p-4 flex flex-wrap items-center justify-center gap-1.5 md:gap-2 bg-slate-50/50">
                            {selectedSegmentIndices.length === 0 ? (
                              <p className="text-[10px] md:text-sm font-semibold text-slate-400 italic text-center">
                                Bấm chọn các mảnh từ bên dưới theo thứ tự đúng...
                              </p>
                            ) : (
                              selectedSegmentIndices.map((shuffledIdx, displayIdx) => {
                                if (shuffledIdx === null) {
                                  const isFocused = focusedSlotIndex === displayIdx;
                                  return (
                                    <button
                                      key={`empty-slot-${displayIdx}`}
                                      type="button"
                                      disabled={wordOrderResultState !== 'playing'}
                                      onClick={() => setFocusedSlotIndex(displayIdx)}
                                      className={`h-[40px] sm:h-[50px] md:h-[60px] lg:h-[66px] px-3 md:px-5 flex items-center justify-center rounded-lg md:rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer text-xs sm:text-sm md:text-base ${
                                        isFocused
                                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-750 shadow-md scale-105 animate-pulse font-bold'
                                          : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-400 font-semibold'
                                      }`}
                                    >
                                      {isFocused ? `Ô ${displayIdx + 1} ✎` : `Ô ${displayIdx + 1}`}
                                    </button>
                                  );
                                }

                                const segment = shuffledSegments[shuffledIdx];
                                const isCorrectPos = wordOrderSegments[displayIdx] && segment.text === wordOrderSegments[displayIdx];
                                
                                let buttonClass = '';
                                if (wordOrderResultState === 'playing') {
                                  buttonClass = isCorrectPos
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80 hover:border-emerald-400 cursor-pointer'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-indigo-400 cursor-pointer';
                                } else if (wordOrderResultState === 'correct') {
                                  buttonClass = 'bg-emerald-505 text-white bg-emerald-500 border-emerald-600 shadow-md shadow-emerald-100 cursor-default';
                                } else { // incorrect
                                  buttonClass = isCorrectPos
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 opacity-95 cursor-default'
                                    : 'animate-blink-red border-rose-300 cursor-default';
                                }

                                return (
                                  <button
                                    key={`selected-${displayIdx}`}
                                    disabled={wordOrderResultState !== 'playing'}
                                    onClick={() => {
                                      // Clear this slot and make it focused!
                                      setSelectedSegmentIndices(prev => {
                                        const next = [...prev];
                                        next[displayIdx] = null;
                                        return next;
                                      });
                                      setFocusedSlotIndex(displayIdx);
                                    }}
                                    className={`px-3 py-1.5 md:px-5 md:py-3.5 font-extrabold text-lg sm:text-2xl md:text-3xl lg:text-4xl rounded-lg md:rounded-xl border shadow-sm transition-all animate-in zoom-in duration-100 ${buttonClass}`}
                                  >
                                    {segment.text}
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {/* Choices Area */}
                          {wordOrderResultState === 'playing' ? (
                            <div className="w-full flex flex-wrap items-center justify-center gap-1.5 md:gap-2.5 pt-1 md:pt-2">
                              {shuffledSegments.map((segment, idx) => {
                                const isSelected = selectedSegmentIndices.includes(idx);
                                return (
                                  <button
                                    key={`shuffled-${segment.id}`}
                                    disabled={isSelected}
                                    onClick={() => {
                                      setSelectedSegmentIndices(prev => {
                                        const next = [...prev];
                                        // If there is a manually focused slot and it is empty, put it there!
                                        if (focusedSlotIndex !== null && focusedSlotIndex < next.length && next[focusedSlotIndex] === null) {
                                          next[focusedSlotIndex] = idx;
                                          // Proactively focus the next empty slot
                                          const nextNull = next.indexOf(null);
                                          setFocusedSlotIndex(nextNull !== -1 ? nextNull : null);
                                          return next;
                                        }

                                        // Otherwise, fill the first available null slot
                                        const firstNull = next.indexOf(null);
                                        if (firstNull !== -1) {
                                          next[firstNull] = idx;
                                          // Focus the next empty slot
                                          const nextNull = next.indexOf(null);
                                          setFocusedSlotIndex(nextNull !== -1 ? nextNull : null);
                                        }
                                        return next;
                                      });
                                    }}
                                    className={`px-3 py-1.5 md:px-5 md:py-3.5 font-extrabold text-lg sm:text-2xl md:text-3xl lg:text-4xl rounded-lg md:rounded-xl border transition-all duration-150 cursor-pointer ${
                                      isSelected
                                        ? 'bg-slate-50 text-slate-300 border-slate-100 opacity-40 select-none cursor-default'
                                        : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-md hover:scale-105 active:scale-95'
                                    }`}
                                  >
                                    {segment.text}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            /* Correct or Incorrect Visual Feedbacks */
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 md:p-6 rounded-xl md:rounded-[2rem] border-2 text-center space-y-2 md:space-y-3 ${
                                wordOrderResultState === 'correct' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-950' 
                                  : 'bg-rose-50 border-rose-100 text-rose-950'
                              }`}
                            >
                              {wordOrderResultState === 'correct' ? (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[#047857] bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                                    Đáp án chính xác! 🎉
                                  </span>
                                  
                                  <div className="flex items-center justify-center gap-1.5 pt-1">
                                    <h3 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 tracking-[0.05em] md:tracking-[0.12em]">
                                      {quizSentence?.chinese}
                                    </h3>
                                    <div className="flex items-center gap-1">
                                      <button 
                                        onClick={() => handleSpeak(quizSentence?.chinese || '', false)}
                                        title="Nghe thường (1.0x)"
                                        className="p-1 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors cursor-pointer flex items-center justify-center animate-in zoom-in"
                                      >
                                        <Volume2 size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleSpeak(quizSentence?.chinese || '', true)}
                                        title="Nghe chậm (0.5x)"
                                        className="p-1 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors cursor-pointer text-xs flex items-center justify-center leading-none animate-in zoom-in"
                                      >
                                        🐢
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs md:text-base text-slate-500 font-bold italic">
                                    {quizSentence?.pinyin}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-100/70 border border-rose-200 px-2.5 py-0.5 rounded-lg">
                                    Chưa chính xác rồi 😢
                                  </span>
                                  <p className="text-xs font-semibold text-rose-600/90 leading-relaxed pt-1">
                                    Hãy kiểm tra lại trật tự sắp xếp từ của bạn và thử lại nhé!
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>

                        {/* Bottom Action Area */}
                        <div className="w-full flex gap-2 md:gap-3 pt-4 border-t border-slate-50 mt-3 md:mt-4">
                          {wordOrderResultState === 'playing' ? (
                            <>
                              <button
                                type="button"
                                disabled={!selectedSegmentIndices.some(idx => idx !== null)}
                                onClick={() => {
                                  setSelectedSegmentIndices(Array(wordOrderSegments.length).fill(null));
                                  setFocusedSlotIndex(null);
                                }}
                                className="flex-1 py-2.5 md:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl transition-all text-xs md:text-sm uppercase tracking-wide cursor-pointer disabled:opacity-50"
                              >
                                Xóa hết
                              </button>
                              
                              <button
                                type="button"
                                disabled={!selectedSegmentIndices.some(idx => idx !== null)}
                                onClick={checkWordOrderAnswer}
                                className="flex-1 py-2.5 md:py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all text-xs md:text-sm uppercase tracking-wide shadow-md shadow-indigo-100 cursor-pointer disabled:opacity-50"
                              >
                                Kiểm tra
                              </button>
                            </>
                          ) : (
                            <>
                              {wordOrderResultState === 'incorrect' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWordOrderResultState('playing');
                                    }}
                                    className="flex-1 py-2.5 md:py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-extrabold rounded-xl transition-all text-[11px] md:text-sm uppercase tracking-wide cursor-pointer animate-in fade-in"
                                  >
                                    Sửa câu
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSegmentIndices(Array(wordOrderSegments.length).fill(null));
                                      setFocusedSlotIndex(null);
                                      setWordOrderResultState('playing');
                                    }}
                                    className="flex-1 py-2.5 md:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl transition-all text-[11px] md:text-sm uppercase tracking-wide cursor-pointer animate-in fade-in"
                                  >
                                    Thử lại
                                  </button>
                                </>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => startWordOrderQuiz()}
                                className="flex-1 py-2.5 md:py-3.5 bg-primary text-white font-extrabold rounded-xl transition-all text-xs md:text-sm uppercase tracking-wide shadow-lg shadow-emerald-100 hover:bg-primary-dark cursor-pointer animate-in fade-in"
                              >
                                Tiếp tục
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </main>

      {/* Footer Status */}
      <footer className="h-12 bg-white border-t border-sleek-border px-4 md:px-8 flex items-center justify-between shrink-0 text-[10px] md:text-[11px] text-sleek-muted font-medium uppercase tracking-widest hidden lg:flex">
        <div>
          Trạng thái AI: Hoạt động (Gemini 3 Flash Learning Model)
        </div>
        <div className="flex gap-4 md:gap-6">
          <span 
            className="text-primary cursor-pointer hover:underline"
            onClick={() => setShowHistory(true)}
          >
            Sổ tay của tôi ({savedSentences.length})
          </span>
          <span className="hover:underline cursor-pointer">Cộng đồng</span>
        </div>
      </footer>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeConfirm}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={closeConfirm}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  disabled={confirmModal.isLoading}
                  className="flex-1 px-4 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                >
                  {confirmModal.isLoading ? <Loader2 size={18} className="animate-spin" /> : "Xác nhận xóa"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Word/Grammar Notification Modal */}
      <AnimatePresence>
        {saveNotification && saveNotification.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSaveNotification(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top colored accent line */}
              <div className={`absolute top-0 left-0 right-0 h-2 ${
                saveNotification.isDuplicate 
                  ? 'bg-amber-500' 
                  : saveNotification.type === 'grammar' 
                    ? 'bg-indigo-600' 
                    : 'bg-emerald-500'
              }`} />

              <div className="flex flex-col items-center text-center mt-2">
                {/* Visual Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  saveNotification.isDuplicate 
                    ? 'bg-amber-50 text-amber-500' 
                    : saveNotification.type === 'grammar' 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {saveNotification.isDuplicate ? (
                    <BookOpen size={28} />
                  ) : saveNotification.type === 'grammar' ? (
                    <Zap size={28} className="fill-indigo-100" />
                  ) : (
                    <Check size={28} className="text-emerald-500" />
                  )}
                </div>

                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">
                  {saveNotification.isDuplicate ? 'Đã tồn tại' : 'Đã lưu thành công'}
                </h3>
                
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
                  {saveNotification.type === 'grammar' ? 'Cấu trúc Ngữ pháp' : 'Từ vựng Tiếng Trung'}
                </p>

                {/* The saved content display */}
                <div className={`w-full p-4 rounded-2xl border-2 mb-6 ${
                  saveNotification.isDuplicate 
                    ? 'bg-amber-50/40 border-amber-100' 
                    : saveNotification.type === 'grammar' 
                      ? 'bg-indigo-50/40 border-indigo-100' 
                      : 'bg-emerald-50/40 border-emerald-100'
                }`}>
                  <p className={`text-3xl font-black mb-1 tracking-wide ${
                    saveNotification.isDuplicate 
                      ? 'text-amber-800' 
                      : saveNotification.type === 'grammar' 
                        ? 'text-indigo-800' 
                        : 'text-emerald-800'
                  }`}>
                    {saveNotification.text}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
                    {saveNotification.isDuplicate ? 'Đã có trong sổ tay' : 'Đã được lưu vào sổ tay'}
                  </p>
                </div>

                <button 
                  onClick={() => setSaveNotification(null)}
                  className={`w-full py-3 text-white font-extrabold rounded-xl transition duration-150 shadow-md ${
                    saveNotification.isDuplicate 
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' 
                      : saveNotification.type === 'grammar' 
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' 
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                  }`}
                >
                  Tuyệt vời!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Category Selector */}
      {activeView === 'home' && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsMobileCategoryOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg border border-emerald-500/30 font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            <List size={16} />
            <span>Chủ đề</span>
          </motion.button>
        </div>
      )}

      {/* Mobile Sliding Category Drawer */}
      <AnimatePresence>
        {activeView === 'home' && isMobileCategoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileCategoryOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden"
            />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-[2.5rem] shadow-2xl z-[55] lg:hidden flex flex-col overflow-hidden pb-10"
            >
              {/* Drag Handle Decoration */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />
              
              <div className="px-6 pb-4 border-b border-slate-50 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Library size={16} className="text-emerald-500" />
                  Danh mục chủ đề
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileCategoryOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 custom-scrollbar">
                {/* Tất cả */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilterCategory('all');
                    setSelectedFilterSection('all');
                    setIsMobileCategoryOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                    selectedFilterCategory === 'all'
                      ? 'bg-emerald-50/50 border-emerald-500 shadow-sm text-emerald-950 font-extrabold'
                      : 'bg-slate-50/50 border-slate-100/70 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-widest font-black text-slate-400">#</span>
                    <span className="text-sm font-bold">Tất cả chủ đề</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500">
                      {savedSentences.length}
                    </span>
                    {selectedFilterCategory === 'all' && (
                      <Check size={16} className="text-emerald-600" />
                    )}
                  </div>
                </button>
                
                {/* Dynamically mapped Categories */}
                {categories.map((c) => {
                  const count = savedSentences.filter(s => s.categoryId === c.id).length;
                  const isSelected = selectedFilterCategory === c.id;
                  return (
                    <button
                      type="button"
                      key={`mobile-filter-cat-${c.id}`}
                      onClick={() => {
                        setSelectedFilterCategory(c.id);
                        setSelectedFilterSection('all');
                        setIsMobileCategoryOpen(false);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/50 border-emerald-500 shadow-sm text-emerald-950 font-extrabold'
                          : 'bg-slate-50/50 border-slate-100/70 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-widest font-black text-emerald-500">#</span>
                        <span className="text-sm font-bold">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500">
                          {count}
                        </span>
                        {isSelected && (
                          <Check size={16} className="text-emerald-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
                
                {/* Collapsible Section list inside Drawer if a Specific Category is chosen */}
                {selectedFilterCategory !== 'all' && (
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Đoạn / Bài học trong chủ đề</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFilterSection('all');
                          setIsMobileCategoryOpen(false);
                        }}
                        className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                          selectedFilterSection === 'all'
                            ? 'border-indigo-500 bg-indigo-50/40 text-indigo-950 font-extrabold'
                            : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        Tất cả đoạn
                      </button>
                      {sections.filter(s => s.categoryId === selectedFilterCategory).map(s => (
                        <button
                          type="button"
                          key={`mobile-filter-sec-${s.id}`}
                          onClick={() => {
                            setSelectedFilterSection(s.id);
                            setIsMobileCategoryOpen(false);
                          }}
                          className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all truncate cursor-pointer ${
                            selectedFilterSection === s.id
                              ? 'border-indigo-500 bg-indigo-50/40 text-indigo-950 font-extrabold'
                              : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen Realistic Artwork Lightbox Modal */}
      <AnimatePresence>
        {selectedIllustrationModal && selectedIllustrationModal.illustrationSvg && (
          <div 
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setSelectedIllustrationModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full border border-slate-100 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-emerald-600" size={18} />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Tranh minh họa AI chân thực & sắc nét</h3>
                </div>
                <button
                  onClick={() => setSelectedIllustrationModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Large Artwork Canvas */}
              <div className="w-full aspect-square bg-slate-900 flex items-center justify-center overflow-hidden relative">
                {selectedIllustrationModal.illustrationSvg.startsWith('data:image/') || selectedIllustrationModal.illustrationSvg.startsWith('http') ? (
                  <img
                    src={selectedIllustrationModal.illustrationSvg}
                    alt={selectedIllustrationModal.chinese}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div
                    className="w-full h-full p-6 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                    dangerouslySetInnerHTML={{ __html: selectedIllustrationModal.illustrationSvg }}
                  />
                )}
              </div>

              {/* Context Information */}
              <div className="p-5 space-y-3 bg-white">
                <div className="text-center">
                  <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wider mb-1">
                    {selectedIllustrationModal.chinese}
                  </h4>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 italic mb-2">
                    {selectedIllustrationModal.pinyin}
                  </p>
                  <p className="text-sm font-bold text-emerald-800 bg-emerald-50 py-2 px-4 rounded-xl border border-emerald-100/60 inline-block max-w-full">
                    “{selectedIllustrationModal.meaning}”
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedIllustrationModal(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Compact Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 flex items-center justify-around z-40 shadow-lg">
        <button
          type="button"
          onClick={() => { setActiveView('home'); setTestType(null); }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeView === 'home' ? 'text-primary font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Library size={18} className={activeView === 'home' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] mt-1 font-bold">Thư viện</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveView('learn'); setTestType(null); }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeView === 'learn' ? 'text-emerald-600 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen size={18} className={activeView === 'learn' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] mt-1 font-bold">Học tập</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveView('single-char'); setTestType(null); }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeView === 'single-char' ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles size={18} className={activeView === 'single-char' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] mt-1 font-bold">Chữ đơn</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveView('progress'); setTestType(null); }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeView === 'progress' ? 'text-orange-500 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Flame size={18} className={activeView === 'progress' ? 'stroke-[2.5] fill-orange-500/10' : ''} />
          <span className="text-[10px] mt-1 font-bold">Chuyên cần</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveView('tests'); setTestType(null); }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeView === 'tests' ? 'text-amber-500 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Zap size={18} className={activeView === 'tests' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] mt-1 font-bold">Luyện tập</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveView('admin'); setTestType(null); }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeView === 'admin' ? 'text-purple-600 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings size={18} className={activeView === 'admin' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] mt-1 font-bold">Quản trị</span>
        </button>
      </nav>
    </div>
  );
}
