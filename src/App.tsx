import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2,
  ChevronRight,
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
  List
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { translateAndExplain, TranslationResult } from './services/geminiService';
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
  const [activeView, setActiveView] = useState<'home' | 'admin' | 'tests' | 'learn'>('home');
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
  const [expandedSentence, setExpandedSentence] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editableExplanation, setEditableExplanation] = useState('');
  
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

  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [selectedFilterSection, setSelectedFilterSection] = useState<string>('all');
  const [learnSelectedCategory, setLearnSelectedCategory] = useState<string>('all');
  const [currentSentenceCategoryId, setCurrentSentenceCategoryId] = useState<string>('');
  const [currentSentenceSectionId, setCurrentSentenceSectionId] = useState<string>('');

  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ top: number, left: number } | null>(null);

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
          createdAt: serverTimestamp()
        });
        sentenceId = docRef.id;
        setResult({ ...result, id: sentenceId, originalText: inputText } as SavedSentence);
      }

      await addDoc(collection(db, 'vocabulary'), {
        word: selectedText,
        type: type,
        userId: user.uid,
        sentenceId: sentenceId,
        createdAt: serverTimestamp()
      });
      setSelectedText('');
      setSelectionRange(null);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vocabulary');
    }
  };

  const renderHighlightedChinese = (text: string) => {
    if (!vocabulary || vocabulary.length === 0) return text;
    
    // Sort by length descending to handle overlapping highlights (longest first)
    const sortedVocab = [...vocabulary].sort((a, b) => b.word.length - a.word.length);
    
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

  const startQuiz = (mode: 'vi2zh' | 'zh2vi' = quizMode) => {
    const pool = savedSentences.length > 0 ? savedSentences : [];
    if (pool.length === 0) {
      setError("Bạn cần lưu ít nhất 1 câu vào sổ tay để làm bài test!");
      return;
    }
    const random = pool[Math.floor(Math.random() * pool.length)];
    setQuizMode(mode);
    setQuizSentence(random);
    setQuizTimer(15);
    setQuizStage('running');
    setTestType('grammar');
    setActiveView('tests');
    setResult(null); 
  };

  const startVocabQuiz = () => {
    if (vocabulary.length === 0) {
      setError("Bạn cần lưu ít nhất 1 từ vựng trong sổ tay để làm bài test!");
      return;
    }
    const random = vocabulary[Math.floor(Math.random() * vocabulary.length)];
    setQuizWord(random);
    setQuizTimer(15);
    setQuizStage('running');
    setTestType('vocabulary');
    setActiveView('tests');
    setResult(null);
  };

  const startWordOrderQuiz = (sentence?: SavedSentence) => {
    if (savedSentences.length === 0) {
      setError("Bạn cần lưu ít nhất 1 câu vào sổ tay để luyện tập sắp xếp từ!");
      return;
    }
    
    // Pick specific or random sentence based on category filter
    let pool = savedSentences;
    if (!sentence && wordOrderSelectedCategory !== 'all') {
      const filtered = savedSentences.filter(s => s.categoryId === wordOrderSelectedCategory);
      if (filtered.length > 0) {
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

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setError("Trình duyệt của bạn không hỗ trợ tính năng phát âm.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    
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
        variations: result.variations || [],
        createdAt: serverTimestamp()
      };
      
      if (currentSentenceCategoryId) {
        data.categoryId = currentSentenceCategoryId;
      }
      if (currentSentenceSectionId) {
        data.sectionId = currentSentenceSectionId;
      }

      await addDoc(collection(db, 'saved_sentences'), data);
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
    <div className="min-h-screen bg-sleek-bg text-sleek-text flex flex-col font-sans mb-20 lg:mb-0">
      {/* Top Navigation Bar */}
      <nav className="h-16 bg-white border-b border-sleek-border px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none">Z</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Zhongwen AI</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex flex-1 justify-center px-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => { setActiveView('home'); setTestType(null); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'home' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Library size={16} /> Thư viện
              </button>
              <button 
                onClick={() => { setActiveView('learn'); setTestType(null); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'learn' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BookOpen size={16} /> Học tập
              </button>
              <button 
                onClick={() => { setActiveView('admin'); setTestType(null); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Settings size={16} /> Quản trị
              </button>
              <button 
                onClick={() => { setActiveView('tests'); setTestType(null); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'tests' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Zap size={16} /> Luyện tập
              </button>
            </div>
        </div>

        <div className="flex items-center gap-2 md:gap-8">
          <div className="hidden md:flex items-center gap-3">
            <div className="w-24 lg:w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000" 
                style={{ width: user ? '75%' : '0%' }}
              ></div>
            </div>
            <span className="text-[10px] font-black text-sleek-muted uppercase tracking-tighter">{user ? 'Lv. 12' : 'Guest'}</span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-1 font-bold text-orange-500 text-sm md:text-base">
                  <Flame size={16} className="md:w-5 md:h-5" fill="currentColor" /> 124
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer group relative">
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
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors text-xs md:text-sm"
              >
                <LogIn size={16} /> <span className="hidden xs:inline">Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-sleek-border flex items-center justify-around px-2 z-50 pb-safe">
        <button 
          onClick={() => { setActiveView('home'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${activeView === 'home' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Library size={20} className={activeView === 'home' ? 'fill-primary/10' : ''} />
          <span className="text-[10px] font-bold">Thư viện</span>
        </button>
        <button 
          onClick={() => { setActiveView('learn'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${activeView === 'learn' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <BookOpen size={20} className={activeView === 'learn' ? 'fill-emerald-50' : ''} />
          <span className="text-[10px] font-bold">Học tập</span>
        </button>
        <button 
          onClick={() => { setActiveView('admin'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${activeView === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Plus size={20} className={activeView === 'admin' ? 'fill-indigo-50/50' : ''} />
          <span className="text-[10px] font-bold">Thêm mới</span>
        </button>
        <button 
          onClick={() => { setActiveView('tests'); setTestType(null); }}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${activeView === 'tests' ? 'text-orange-500' : 'text-slate-400'}`}
        >
          <Zap size={20} className={activeView === 'tests' ? 'fill-orange-50' : ''} />
          <span className="text-[10px] font-bold">Luyện tập</span>
        </button>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 p-4 md:p-8 max-w-[1440px] mx-auto w-full">
        {activeView === 'home' ? (
          /* HOME: Library View */
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
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

            {selectedFilterCategory !== 'all' && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
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
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg">
                           {sections.find(s => s.id === sentence.sectionId)?.name || 'Mặc định'}
                         </span>
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl md:text-2xl font-bold text-slate-800 mb-2 transition-colors duration-200 leading-tight tracking-[0.08em] ${theme.activeText}`}>
                          {sentence.chinese}
                        </h3>
                        <p className="text-sm md:text-base text-slate-400 italic mb-3 font-medium">{sentence.pinyin}</p>
                        <p className="text-sm md:text-base text-slate-600 font-medium line-clamp-3 leading-relaxed">{sentence.meaning}</p>
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
            {/* Quick Topic Switch Menu */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-500 animate-pulse" /> 
                    Chọn chủ đề muốn học:
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {categories.length} chủ đề có sẵn
                  </span>
                </div>
                
                {/* Scrollable category pill menu */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => {
                      setLearnSelectedCategory('all');
                      const filtered = savedSentences;
                      if (result) {
                        if (filtered.length > 0) {
                          setResult(filtered[0]);
                        } else {
                          setResult(null);
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      learnSelectedCategory === 'all'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100/50'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    Tất cả chủ đề ({savedSentences.length})
                  </button>
                  {categories.map((c) => {
                    const count = savedSentences.filter(s => s.categoryId === c.id).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setLearnSelectedCategory(c.id);
                          const filtered = savedSentences.filter((s) => s.categoryId === c.id);
                          if (result) {
                            if (filtered.length > 0) {
                              setResult(filtered[0]);
                            } else {
                              setResult(null);
                            }
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          learnSelectedCategory === c.id
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100/50'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        {c.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {!result ? (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-2xl mx-auto px-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                  <BookOpen size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Chưa chọn bài học</h3>
                <p className="text-slate-500 mb-8 font-medium">Chọn một câu từ danh sách bài học dưới đây để bắt đầu phân tích chi tiết:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-h-[350px] overflow-y-auto p-2 rounded-2xl bg-slate-50 border border-slate-100">
                  {savedSentences
                    .filter(s => learnSelectedCategory === 'all' ? true : s.categoryId === learnSelectedCategory)
                    .map(s => (
                      <div 
                        key={s.id}
                        onClick={() => setResult(s)}
                        className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all"
                      >
                        <p className="font-bold text-slate-800 text-base mb-1 truncate tracking-[0.08em]">{s.chinese}</p>
                        <p className="text-xs text-slate-400 truncate">{s.meaning}</p>
                      </div>
                    ))}
                  {savedSentences.filter(s => learnSelectedCategory === 'all' ? true : s.categoryId === learnSelectedCategory).length === 0 && (
                    <p className="col-span-full text-center text-slate-400 py-6 text-sm">Chưa có bài học nào được tạo trong chủ đề này. Hãy sang phần "Quản trị" để tạo!</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                {(() => {
                  const learnSentences = learnSelectedCategory === 'all' 
                    ? savedSentences 
                    : savedSentences.filter(s => s.categoryId === learnSelectedCategory);
                  const currentIndex = learnSentences.findIndex(s => s.id === (result as SavedSentence).id);
                  const currentNo = currentIndex !== -1 ? currentIndex + 1 : 0;
                  const totalCount = learnSentences.length;
                  
                  return (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      {/* Left Block: List & Index Counter */}
                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                        <button 
                          onClick={() => setResult(null)}
                          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          <List size={14} /> Danh sách câu khác
                        </button>
                        
                        <div className="flex items-center gap-1.5 font-extrabold text-sm text-slate-400 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                          <span className="text-slate-800">{currentNo}</span>
                          <span className="text-slate-300">/</span>
                          <span>{totalCount}</span>
                        </div>
                      </div>

                      {/* Middle Block: Prev / Next Navigation Buttons */}
                      <div className="flex items-center gap-3 w-full md:w-auto justify-center">
                        <button
                          onClick={() => {
                            if (totalCount === 0) return;
                            const prevIndex = (currentIndex - 1 + totalCount) % totalCount;
                            setResult(learnSentences[prevIndex]);
                          }}
                          disabled={totalCount <= 1}
                          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none px-5 py-2.5 rounded-xl transition-all duration-200 border border-emerald-100/50 hover:border-emerald-600 shadow-sm flex-1 md:flex-initial text-center justify-center cursor-pointer"
                        >
                          ← Câu trước
                        </button>
                        
                        <button
                          onClick={() => {
                            if (totalCount === 0) return;
                            const nextIndex = (currentIndex + 1) % totalCount;
                            setResult(learnSentences[nextIndex]);
                          }}
                          disabled={totalCount <= 1}
                          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 disabled:opacity-40 disabled:pointer-events-none px-5 py-2.5 rounded-xl transition-all duration-200 border border-emerald-100/50 hover:border-emerald-600 shadow-sm flex-1 md:flex-initial text-center justify-center cursor-pointer"
                        >
                          Câu kế tiếp →
                        </button>
                      </div>

                      {/* Right Block: Active Topic Badge */}
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl uppercase tracking-wider w-full md:w-auto text-center border border-emerald-100/30">
                        Chủ đề: {categories.find(c => c.id === (result as any).categoryId)?.name || 'Chung'}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Chữ tiếng Trung, Pinyin, và Dịch nghĩa */}
                  <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">
                    <div className="sleek-card bg-white relative overflow-hidden transition-all shadow-md">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                          Văn bản học tập
                        </span>
                        <button onClick={() => handleSpeak(result.chinese)} className="p-3 bg-primary/5 text-primary rounded-2xl hover:bg-primary/10 transition-colors">
                          <Volume2 size={32}/>
                        </button>
                      </div>
                      
                      <div className="mb-6 md:mb-8">
                        <p className="text-4xl md:text-6xl font-bold text-slate-800 tracking-[0.12em] mb-3 md:mb-4 leading-normal break-words">{result.chinese}</p>
                        <p className="text-base md:text-xl text-slate-500 font-medium italic break-words">{result.pinyin}</p>
                      </div>

                      <div className="space-y-3 md:space-y-4 pt-6 md:pt-8 border-t border-slate-50">
                        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Dịch nghĩa</p>
                        <p className="text-base md:text-lg font-bold text-slate-700 leading-relaxed">{result.meaning}</p>
                        {('originalText' in result) && (
                          <p className="text-xs md:text-sm text-slate-400 italic">Văn bản gốc: {(result as any).originalText}</p>
                        )}
                      </div>
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
                                <button onClick={() => handleSpeak(v.chinese)} className="text-indigo-300 hover:text-indigo-600 transition-colors">
                                  <Volume2 size={16} />
                                </button>
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
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại & Đoạn văn</label>
                          {!isCreatingCategory ? (
                            <button onClick={() => setIsCreatingCategory(true)} className="text-[10px] font-bold text-primary hover:underline">+ Mới</button>
                          ) : (
                            <form onSubmit={createCategory} className="flex gap-2">
                              <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="text-[10px] border border-slate-200 rounded px-2 outline-none w-20" />
                              <button type="submit" className="text-primary"><Check size={12}/></button>
                            </form>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <select 
                            value={currentSentenceCategoryId} 
                            onChange={(e) => { setCurrentSentenceCategoryId(e.target.value); setCurrentSentenceSectionId(''); }}
                            className="flex-1 text-xs font-bold text-primary bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 outline-none"
                          >
                            <option value="">Chọn chủ đề</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select 
                            value={currentSentenceSectionId} 
                            onChange={(e) => setCurrentSentenceSectionId(e.target.value)}
                            disabled={!currentSentenceCategoryId}
                            className="flex-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 outline-none disabled:opacity-50"
                          >
                            <option value="">Chọn đoạn</option>
                            {sections.filter(s => s.categoryId === currentSentenceCategoryId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                          <p className="text-xs font-bold text-slate-700 truncate tracking-[0.08em]">{s.chinese}</p>
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
                       <div className="flex justify-between items-start mb-6">
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
                               <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Đã lưu trong thư viện</div>
                             )}
                          </div>
                          <button onClick={() => handleSpeak(result.chinese)} className="p-3 bg-primary/5 text-primary rounded-2xl hover:bg-primary/10 transition-colors"><Volume2 size={32}/></button>
                       </div>
                       
                        <div className="mb-6 md:mb-8 relative" onMouseUp={handleSelection}>
                          <p className="text-4xl md:text-6xl font-bold text-slate-800 tracking-[0.12em] mb-3 md:mb-4 leading-normal break-words">{result.chinese}</p>
                          <p className="text-base md:text-xl text-slate-500 font-medium italic break-words">{result.pinyin}</p>
                          
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
                          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Nghĩa bài học</p>
                          <p className="text-base md:text-lg font-bold text-slate-700 leading-relaxed">{result.meaning}</p>
                          {('originalText' in result) && (
                            <p className="text-xs md:text-sm text-slate-400 italic">Văn bản gốc: {(result as any).originalText}</p>
                          )}
                       </div>
                    </div>

                    <div className="sleek-card">
                       <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BookOpen className="text-primary" /> Phân tích Bài học</h3>
                       <div className="markdown-body">
                          <ReactMarkdown>{result.grammarExplanation}</ReactMarkdown>
                       </div>
                    </div>

                    {result.variations && result.variations.length > 0 && (
                      <div className="sleek-card bg-gradient-to-br from-indigo-50/50 to-white">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Sparkles className="text-indigo-600" /> Câu phát triển
                        </h3>
                        <div className="space-y-4">
                          {result.variations.map((v, idx) => (
                            <div key={idx} className="p-5 bg-white rounded-2xl border border-indigo-100/50 hover:border-indigo-300 transition-all group">
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-2xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-[0.1em]">{v.chinese}</p>
                                <button onClick={() => handleSpeak(v.chinese)} className="text-indigo-300 hover:text-indigo-600 transition-colors">
                                  <Volume2 size={16} />
                                </button>
                              </div>
                              <p className="text-sm text-slate-400 italic mb-2">{v.pinyin}</p>
                              <p className="text-sm text-slate-600 font-medium">{v.meaning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                 </motion.div>
               )}
            </div>
          </div>
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
                  onClick={startVocabQuiz}
                  className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-orange-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Bookmark size={28} className="text-orange-500 fill-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Kiểm tra Từ vựng</h3>
                    <p className="text-slate-500 text-xs md:text-sm mb-6 leading-relaxed">Ôn tập các từ vựng và cấu trúc bạn đã lưu trong quá trình học. Thử thách trí nhớ với flashcards.</p>
                  </div>
                  <div className="flex items-center gap-2 text-orange-500 font-bold text-sm group-hover:gap-4 transition-all">
                    Bắt đầu ngay <ChevronRight size={16} />
                  </div>
                </motion.div>

                {/* Grammar Test Card */}
                <motion.div 
                  whileHover={{ y: -8 }}
                  onClick={() => startQuiz()}
                  className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-primary/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Zap size={28} className="text-primary fill-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Thử thách Ngôn ngữ</h3>
                    <p className="text-slate-500 text-xs md:text-sm mb-6 leading-relaxed">Dịch câu trong 15 giây. Luyện tập phản xạ nhanh giữa Tiếng Việt và Tiếng Trung.</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-4 transition-all">
                    Bắt đầu ngay <ChevronRight size={16} />
                  </div>
                </motion.div>

                {/* Word Order Test Card */}
                <motion.div 
                  whileHover={{ y: -8 }}
                  onClick={() => startWordOrderQuiz()}
                  className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/50 cursor-pointer group hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Sparkles size={28} className="text-indigo-600 fill-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Sắp xếp Trật tự Từ</h3>
                    <p className="text-slate-500 text-xs md:text-sm mb-6 leading-relaxed">Sắp xếp các mảnh từ, chữ Hán thành câu hoàn chỉnh dựa trên câu dịch nghĩa tiếng Việt.</p>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm group-hover:gap-4 transition-all">
                    Bắt đầu ngay <ChevronRight size={16} />
                  </div>
                </motion.div>
              </div>

              {savedSentences.length === 0 && vocabulary.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl text-center">
                  <p className="text-amber-700 font-bold">Bạn chưa có dữ liệu học tập!</p>
                  <p className="text-amber-600/80 text-sm">Hãy ra trang "Bài học" và lưu một vài câu hoặc từ vựng để bắt đầu kiểm tra.</p>
                </div>
              )}
            </div>
          ) : (
            /* Active Test Interface */
            <div className={`${testType === 'word-order' ? 'max-w-6xl' : 'max-w-2xl'} mx-auto w-full py-6`}>
              <button 
                onClick={() => setTestType(null)}
                className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold transition-colors"
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
                    className="sleek-card min-h-[500px] flex flex-col items-center justify-center text-center relative overflow-hidden bg-white"
                  >
                    {/* Question Section */}
                    <div className="mb-8 md:mb-12 w-full px-4 md:px-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {quizMode === 'zh2vi' ? 'Dịch sang Tiếng Việt' : 'Dịch sang Tiếng Trung'}
                      </p>
                      <h3 className={`text-4xl md:text-7xl font-bold text-primary leading-tight flex flex-wrap items-center justify-center gap-3 ${quizMode === 'zh2vi' ? 'tracking-[0.1em]' : ''}`}>
                        {quizMode === 'zh2vi' ? quizSentence?.chinese : quizSentence?.originalText}
                        {quizMode === 'zh2vi' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSpeak(quizSentence?.chinese || ''); }}
                            className="p-1.5 md:p-2 bg-indigo-50 text-indigo-500 rounded-full hover:bg-indigo-100 transition-colors"
                          >
                            <Volume2 size={24} className="md:w-8 md:h-8" />
                          </button>
                        )}
                      </h3>
                    </div>

                    {quizStage === 'running' ? (
                      <div className="flex flex-col items-center">
                        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
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
                          <span className="text-5xl font-black text-orange-500">{quizTimer}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-500">
                          {quizTimer > 0 ? (quizMode === 'zh2vi' ? 'Hãy nhớ nghĩa câu này!' : 'Dịch câu này sang tiếng Trung!') : 'Hết giờ! Đang hiển thị kết quả...'}
                        </p>
                        <button 
                          onClick={() => {
                            setQuizTimer(0);
                            setQuizStage('revealed');
                          }}
                          className="mt-8 px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                        >
                          Hiện đáp án sớm
                        </button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 w-full px-6"
                      >
                        <div className={`p-8 rounded-[2rem] border-2 ${quizMode === 'zh2vi' ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
                          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Đáp án chính xác</p>
                          {quizMode === 'zh2vi' ? (
                            <h3 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight">
                              {quizSentence?.originalText}
                            </h3>
                          ) : (
                            <>
                              <div className="flex items-center justify-center gap-3 mb-4">
                                <h3 className="text-5xl md:text-7xl font-bold text-slate-800 tracking-[0.12em]">{quizSentence?.chinese}</h3>
                                <button 
                                  onClick={() => handleSpeak(quizSentence?.chinese || '')}
                                  className="p-3 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors"
                                >
                                  <Volume2 size={32} />
                                </button>
                              </div>
                              <p className="text-2xl text-slate-500 italic font-medium">{quizSentence?.pinyin}</p>
                            </>
                          )}
                        </div>
                        
                        <div className="flex gap-4 max-w-md mx-auto w-full">
                          <button 
                            onClick={() => startQuiz()}
                            className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-[0_4px_0_#065f46] hover:bg-primary-dark active:translate-y-1 active:shadow-none transition-all"
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
                    className="sleek-card min-h-[500px] flex flex-col items-center justify-center text-center bg-white"
                  >
                    <div className="mb-8 md:mb-12 w-full px-4 md:px-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Bạn có nhớ từ này không?</p>
                      <div className="flex flex-wrap items-center justify-center gap-4">
                        <h3 className={`text-6xl md:text-9xl font-black leading-tight tracking-[0.1em] ${quizWord?.type === 'grammar' ? 'text-indigo-600' : 'text-orange-600'}`}>
                          {quizWord?.word}
                        </h3>
                        <button 
                          onClick={() => handleSpeak(quizWord?.word || '')}
                          className={`p-3 md:p-4 rounded-full transition-colors ${quizWord?.type === 'grammar' ? 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100' : 'bg-orange-50 text-orange-500 hover:bg-orange-100'}`}
                        >
                          <Volume2 size={32} className="md:w-10 md:h-10" />
                        </button>
                      </div>
                      <div className="mt-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${quizWord?.type === 'grammar' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                          {quizWord?.type === 'grammar' ? 'Cấu trúc Ngữ pháp' : 'Từ vựng'}
                        </span>
                      </div>
                    </div>

                    {quizStage === 'running' ? (
                      <div className="space-y-12 w-full px-8">
                        <div className="flex flex-col items-center">
                          <button 
                            onClick={() => {
                              const sentence = savedSentences.find(s => s.id === quizWord?.sentenceId);
                              if (sentence) {
                                alert(`Gợi ý ngữ cảnh:\n${quizMode === 'zh2vi' ? sentence.originalText : sentence.chinese}`);
                              } else {
                                alert("Không tìm thấy ngữ cảnh câu ví dụ.");
                              }
                            }}
                            className="bg-slate-50 text-slate-500 font-bold px-6 py-2 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-2 mb-8"
                          >
                            <Lightbulb size={18} className="text-amber-500" /> Xem gợi ý ngữ cảnh
                          </button>
                          
                          <button 
                            onClick={() => setQuizStage('revealed')}
                            className="w-full max-w-md py-6 bg-slate-800 text-white rounded-3xl font-black text-2xl shadow-xl shadow-slate-200 hover:bg-slate-900 transition-all active:scale-[0.98]"
                          >
                            XEM ĐÁP ÁN
                          </button>
                        </div>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8 w-full px-6"
                      >
                        <div className={`p-8 rounded-[3rem] border-2 ${quizWord?.type === 'grammar' ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Ngữ cảnh & Ý nghĩa</p>
                          {savedSentences.find(s => s.id === quizWord?.sentenceId) ? (
                            <div className="space-y-4">
                              <p className="text-3xl md:text-4xl font-bold text-slate-800 leading-relaxed tracking-[0.12em]">
                                {savedSentences.find(s => s.id === quizWord?.sentenceId)?.chinese}
                              </p>
                              <p className="text-xl text-slate-500 italic">
                                {savedSentences.find(s => s.id === quizWord?.sentenceId)?.originalText}
                              </p>
                            </div>
                          ) : (
                            <p className="text-slate-500 italic">Dữ liệu câu ví dụ đã bị xóa hoặc không tồn tại.</p>
                          )}
                        </div>

                        <button 
                          onClick={startVocabQuiz}
                          className="w-full max-w-md py-5 bg-primary text-white rounded-[2rem] font-bold text-xl shadow-lg hover:bg-primary-dark transition-all"
                        >
                          Từ tiếp theo
                        </button>
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
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full"
                  >
                    {/* Left Sidebar: List of available sentences */}
                    <div className="lg:col-span-4 order-2 lg:order-1 space-y-4 w-full">
                      <div className="sleek-card bg-white p-5 border border-slate-100 flex flex-col h-[525px]">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={16} className="text-indigo-500" />
                            Danh sách câu hỏi ({
                              wordOrderSelectedCategory === 'all'
                                ? savedSentences.length
                                : savedSentences.filter(s => s.categoryId === wordOrderSelectedCategory).length
                            })
                          </h4>
                        </div>

                        {/* Category Filter Tabs for Word Order */}
                        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 scrollbar-none snap-x cursor-pointer max-w-full">
                          <button
                            type="button"
                            onClick={() => setWordOrderSelectedCategory('all')}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 transition-all duration-150 cursor-pointer ${
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
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 transition-all duration-150 cursor-pointer ${
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
                        
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                          {savedSentences
                            .filter(s => wordOrderSelectedCategory === 'all' ? true : s.categoryId === wordOrderSelectedCategory)
                            .map((s, idx) => {
                              const isCurrent = quizSentence?.id === s.id;
                              const category = categories.find(c => c.id === s.categoryId);
                              return (
                                <button
                                  key={`select-sentence-${s.id}`}
                                  onClick={() => startWordOrderQuiz(s)}
                                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 flex flex-col gap-1.5 focus:outline-none cursor-pointer ${
                                    isCurrent
                                      ? 'border-indigo-500 bg-indigo-50/40 shadow-sm border-2'
                                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[10px] font-bold text-slate-400">
                                      Câu {idx + 1}
                                    </span>
                                    {category && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-50 border border-indigo-100 text-indigo-600">
                                        {category.name}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-sm font-extrabold ${isCurrent ? 'text-indigo-950 font-black' : 'text-slate-800'} line-clamp-2 leading-snug`}>
                                    {s.originalText || s.meaning}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-medium truncate tracking-[0.08em]">
                                    {s.chinese}
                                  </p>
                                </button>
                              );
                            })}
                          
                          {savedSentences.filter(s => wordOrderSelectedCategory === 'all' ? true : s.categoryId === wordOrderSelectedCategory).length === 0 && (
                            <div className="text-center py-12 text-slate-400 font-medium text-xs">
                              Chưa có câu nào trong chủ đề này.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right column: Main Word Order Quiz UI Card */}
                    <div className="lg:col-span-8 order-1 lg:order-2 w-full">
                      <div className="sleek-card min-h-[525px] flex flex-col justify-between bg-white p-6 md:p-8">
                    {/* Header of Quiz */}
                    <div className="w-full text-center space-y-3 mb-4">
                      <span className="inline-block text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100/50">
                        Sắp xếp trật tự từ
                      </span>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Ghép thành câu tiếng Trung chính xác cho ý nghĩa dưới đây:
                      </p>
                      <h4 className="text-xl md:text-2xl font-black text-slate-800 leading-normal max-w-xl mx-auto px-4">
                        “ {quizSentence?.originalText || quizSentence?.meaning} ”
                      </h4>
                    </div>

                    {/* Result and Canvas area */}
                    <div className="w-full space-y-6">
                      {/* Selected Area */}
                      <div className="w-full min-h-[90px] border-2 border-dashed border-slate-200 rounded-[2rem] p-4 flex flex-wrap items-center justify-center gap-2 bg-slate-50/50">
                        {selectedSegmentIndices.length === 0 ? (
                          <p className="text-xs md:text-sm font-semibold text-slate-400 italic text-center">
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
                                  className={`h-[42px] px-4 flex items-center justify-center rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer ${
                                    isFocused
                                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-750 shadow-md scale-105 animate-pulse font-bold'
                                      : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-400 text-xs font-semibold'
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
                              buttonClass = 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-100 cursor-default';
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
                                className={`px-4 py-2 font-extrabold text-lg md:text-xl rounded-xl border shadow-sm transition-all animate-in zoom-in duration-100 ${buttonClass}`}
                              >
                                {segment.text}
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Choices Area */}
                      {wordOrderResultState === 'playing' ? (
                        <div className="w-full flex flex-wrap items-center justify-center gap-2.5 pt-2">
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
                                className={`px-4.5 py-2.5 font-extrabold text-lg md:text-xl rounded-xl border transition-all duration-150 cursor-pointer ${
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
                          className={`p-6 rounded-[2rem] border-2 text-center space-y-3 ${
                            wordOrderResultState === 'correct' 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-950' 
                              : 'bg-rose-50 border-rose-100 text-rose-950'
                          }`}
                        >
                          {wordOrderResultState === 'correct' ? (
                            <div className="space-y-3">
                              <span className="text-[11px] font-black uppercase tracking-widest text-[#047857] bg-emerald-100/70 border border-emerald-200 px-3 py-1 rounded-lg">
                                Đáp án chính xác! 🎉
                              </span>
                              
                              <div className="flex items-center justify-center gap-2 pt-1">
                                <h3 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-[0.12em]">
                                  {quizSentence?.chinese}
                                </h3>
                                <button 
                                  onClick={() => handleSpeak(quizSentence?.chinese || '')}
                                  className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors cursor-pointer"
                                >
                                  <Volume2 size={20} />
                                </button>
                              </div>
                              <p className="text-base text-slate-500 font-bold italic">
                                {quizSentence?.pinyin}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="text-[11px] font-black uppercase tracking-widest text-rose-700 bg-rose-100/70 border border-rose-200 px-3 py-1 rounded-lg">
                                Chưa chính xác rồi 😢
                              </span>
                              <p className="text-sm font-semibold text-rose-600/90 leading-relaxed pt-1">
                                Hãy kiểm tra lại trật tự sắp xếp từ của bạn và thử lại nhé!
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Bottom Action Area */}
                    <div className="w-full flex gap-3 pt-6 border-t border-slate-50 mt-4">
                      {wordOrderResultState === 'playing' ? (
                        <>
                          <button
                            type="button"
                            disabled={!selectedSegmentIndices.some(idx => idx !== null)}
                            onClick={() => {
                              setSelectedSegmentIndices(Array(wordOrderSegments.length).fill(null));
                              setFocusedSlotIndex(null);
                            }}
                            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl transition-all text-sm uppercase tracking-wide cursor-pointer disabled:opacity-50"
                          >
                            Xóa hết
                          </button>
                          
                          <button
                            type="button"
                            disabled={!selectedSegmentIndices.some(idx => idx !== null)}
                            onClick={checkWordOrderAnswer}
                            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all text-sm uppercase tracking-wide shadow-md shadow-indigo-100 cursor-pointer disabled:opacity-50"
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
                                className="flex-1 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-extrabold rounded-xl transition-all text-xs md:text-sm uppercase tracking-wide cursor-pointer animate-in fade-in"
                              >
                                Sửa câu hiện tại
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSegmentIndices(Array(wordOrderSegments.length).fill(null));
                                  setFocusedSlotIndex(null);
                                  setWordOrderResultState('playing');
                                }}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl transition-all text-xs md:text-sm uppercase tracking-wide cursor-pointer animate-in fade-in"
                              >
                                Thử lại từ đầu
                              </button>
                            </>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => startWordOrderQuiz()}
                            className="flex-1 py-3.5 bg-primary text-white font-extrabold rounded-xl transition-all text-sm uppercase tracking-wide shadow-lg shadow-emerald-100 hover:bg-primary-dark cursor-pointer animate-in fade-in"
                          >
                            Câu tiếp theo
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
    </div>
  );
}
