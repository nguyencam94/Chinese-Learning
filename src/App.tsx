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
  Zap
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

interface SavedSentence extends TranslationResult {
  id: string;
  originalText: string;
  categoryId?: string;
  createdAt: any;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizSentence, setQuizSentence] = useState<SavedSentence | null>(null);
  const [quizTimer, setQuizTimer] = useState(15);
  const [quizStage, setQuizStage] = useState<'idle' | 'running' | 'revealed'>('idle');
  const [expandedSentence, setExpandedSentence] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [currentSentenceCategoryId, setCurrentSentenceCategoryId] = useState<string>('');

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

  const startQuiz = () => {
    const pool = savedSentences.length > 0 ? savedSentences : [];
    if (pool.length === 0) {
      setError("Bạn cần lưu ít nhất 1 câu vào sổ tay để làm bài test!");
      return;
    }
    const random = pool[Math.floor(Math.random() * pool.length)];
    setQuizSentence(random);
    setQuizTimer(15);
    setQuizStage('running');
    setShowQuiz(true);
    setResult(null); // Clear main view result
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

  const handleSubmit = async (e?: React.FormEvent) => {
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
        createdAt: serverTimestamp()
      };
      
      if (currentSentenceCategoryId) {
        data.categoryId = currentSentenceCategoryId;
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

  const handleUpdateCategory = async (sentenceId: string, categoryId: string) => {
    try {
      await updateDoc(doc(db, 'saved_sentences', sentenceId), {
        categoryId: categoryId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'saved_sentences');
    }
  };

  const handleDeleteSentence = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu này khỏi sổ tay?")) return;
    
    try {
      await deleteDoc(doc(db, 'saved_sentences', id));
      if (result && (result as SavedSentence).id === id) {
        setResult(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'saved_sentences');
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Xóa danh mục này? Các câu trong danh mục sẽ không bị xóa nhưng sẽ mất nhãn phân loại.")) return;

    try {
      // Logic for deleting categories:
      // 1. All sentences in this category should have categoryId removed
      const sentencesToUpdate = savedSentences.filter(s => s.categoryId === id);
      const updatePromises = sentencesToUpdate.map(s => 
        updateDoc(doc(db, 'saved_sentences', s.id), { categoryId: '' })
      );
      await Promise.all(updatePromises);
      
      // 2. Delete the category itself
      await deleteDoc(doc(db, 'categories', id));
      if (selectedFilterCategory === id) {
        setSelectedFilterCategory('all');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'categories');
    }
  };

  const filteredSentences = selectedFilterCategory === 'all' 
    ? savedSentences 
    : savedSentences.filter(s => s.categoryId === selectedFilterCategory);

  return (
    <div className="min-h-screen bg-sleek-bg text-sleek-text flex flex-col font-sans mb-20 lg:mb-0">
      {/* Navigation Bar */}
      <nav className="h-16 bg-white border-b border-sleek-border px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none">Z</span>
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Zhongwen AI</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-3">
            <div className="w-48 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000" 
                style={{ width: user ? '75%' : '0%' }}
              ></div>
            </div>
            <span className="text-sm font-bold text-sleek-muted">{user ? '75%' : '0%'}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-1.5 font-bold text-orange-500">
                  <Flame size={20} fill="currentColor" /> 124
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer group relative">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Avatar" />
                  <div className="absolute top-12 right-0 hidden group-hover:block bg-white border border-sleek-border rounded-xl p-2 shadow-xl min-w-[120px]">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors text-sm"
              >
                <LogIn size={18} /> Đăng nhập
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1440px] mx-auto w-full items-start">
        
        {/* Left Panel: Input & History Toggle */}
        <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
          
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
              {showHistory ? <History className="text-primary" /> : showQuiz ? <Zap className="text-orange-500" /> : <Sparkles className="text-primary" />}
              {showHistory ? 'Lịch sử học tập' : showQuiz ? 'Thử thách 10s' : 'Bài học mới'}
            </h2>
            <div className="flex gap-4">
              {!showQuiz && (
                <button 
                  onClick={startQuiz}
                  className="text-sm font-bold text-orange-500 hover:underline flex items-center gap-1"
                >
                  <Zap size={16} /> Làm Test
                </button>
              )}
              <button 
                onClick={() => {
                  setShowHistory(!showHistory);
                  setShowQuiz(false);
                }}
                className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
              >
                {showHistory ? 'Về trang học' : 'Xem lịch sử'}
              </button>
            </div>
          </div>

          {!showHistory && !showQuiz ? (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="sleek-card flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                  <label className="sleek-label mb-0">Ý tưởng của bạn</label>
                  {user && (
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Phân loại:</span>
                       <select 
                        value={currentSentenceCategoryId}
                        onChange={(e) => setCurrentSentenceCategoryId(e.target.value)}
                        className="text-xs font-bold text-primary bg-primary/5 border border-primary/20 rounded-lg px-2 py-1 outline-none"
                       >
                         <option value="">Chưa phân loại</option>
                         {categories.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                         ))}
                       </select>
                    </div>
                  )}
                </div>
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập một câu tiếng Việt bạn muốn học..."
                  className="flex-1 w-full text-2xl leading-relaxed resize-none border-none focus:ring-0 p-0 placeholder-slate-300 font-medium bg-transparent outline-none"
                />
                
                <div className="mt-4 p-4 bg-emerald-50 rounded-2xl flex items-start gap-3 border border-emerald-100">
                  <Lightbulb className="text-primary shrink-0" size={20} />
                  <p className="text-sm text-emerald-800 leading-snug">
                    Gợi ý: Thử dán một câu bài hát hoặc hội thoại phim bạn vừa nghe thấy!
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => handleSubmit()}
                disabled={isLoading || !inputText.trim()}
                className="sleek-button flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                {isLoading ? 'Đang xử lý...' : 'Học với AI Assistant'}
              </button>
              
              {error && <p className="text-rose-500 font-bold text-center text-sm">{error}</p>}
            </motion.div>
          ) : showQuiz ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="sleek-card min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden bg-white">
                {/* Static Vietnamese text */}
                <div className="mb-12 w-full px-6">
                  <h3 className="text-3xl md:text-4xl font-extrabold text-primary leading-tight">
                    {quizSentence?.originalText}
                  </h3>
                </div>

                {quizStage === 'running' ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                          cx="64" cy="64" r="60"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="64" cy="64" r="60"
                          fill="transparent"
                          stroke="#f97316"
                          strokeWidth="8"
                          strokeDasharray={377}
                          animate={{ strokeDashoffset: 377 * (1 - quizTimer / 15) }}
                          transition={{ duration: 1, ease: "linear" }}
                        />
                      </svg>
                      <span className="text-5xl font-black text-orange-500">{quizTimer}</span>
                    </div>
                    <p className="text-xl font-bold text-slate-500">Dịch câu trên sang tiếng Trung!</p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 w-full px-4"
                  >
                    <div className="p-8 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100">
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Đáp án chính xác</p>
                      <h3 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">{quizSentence?.chinese}</h3>
                      <p className="text-2xl text-slate-500 italic font-medium">{quizSentence?.pinyin}</p>
                    </div>
                    
                    <div className="flex gap-4 max-w-md mx-auto w-full">
                      <button 
                        onClick={startQuiz}
                        className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-[0_4px_0_#065f46] hover:bg-primary-dark active:translate-y-1 active:shadow-none transition-all"
                      >
                        Câu tiếp theo
                      </button>
                      <button 
                        onClick={() => {
                          setShowQuiz(false);
                          setResult(quizSentence);
                        }}
                        className="px-6 py-4 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        Giải thích
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Category Management */}
              <div className="bg-white border border-sleek-border rounded-2xl p-4 space-y-4">
                <form onSubmit={createCategory} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Tên danh mục mới..."
                    className="flex-1 text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {isCreatingCategory ? <Loader2 className="animate-spin" size={16} /> : 'Thêm'}
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setSelectedFilterCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors
                      ${selectedFilterCategory === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                    `}
                  >
                    Tất cả
                  </button>
                  {categories.map(c => (
                    <div key={c.id} className="relative group">
                      <button 
                        onClick={() => setSelectedFilterCategory(c.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors pr-8
                          ${selectedFilterCategory === c.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                        `}
                      >
                        {c.name}
                      </button>
                      <button 
                        onClick={(e) => handleDeleteCategory(e, c.id)}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
                          ${selectedFilterCategory === c.id ? 'text-white/70 hover:text-white' : 'text-slate-300 hover:text-rose-500'}
                        `}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vocabulary Management Section */}
              {vocabulary.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Bookmark size={10} className="fill-orange-400 text-orange-400" />
                    Từ vựng đã lưu ({vocabulary.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {vocabulary.map(v => (
                      <div 
                        key={v.id} 
                        className={`${v.type === 'grammar' ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'} border px-3 py-1.5 rounded-xl flex items-center gap-2 group hover:shadow-sm transition-all`}
                        title={v.type === 'grammar' ? 'Cấu trúc ngữ pháp' : 'Từ vựng'}
                      >
                        <span className={`text-sm font-bold ${v.type === 'grammar' ? 'text-indigo-600' : 'text-orange-600'}`}>{v.word}</span>
                        <button 
                          onClick={async () => {
                            if(window.confirm(`Xóa "${v.word}"?`)) {
                              try {
                                await deleteDoc(doc(db, 'vocabulary', v.id));
                              } catch (err) {
                                handleFirestoreError(err, OperationType.DELETE, 'vocabulary');
                              }
                            }
                          }}
                          className={`${v.type === 'grammar' ? 'text-indigo-300' : 'text-orange-300'} hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredSentences.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 opacity-50">
                  <Bookmark size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="font-bold text-slate-400">Chưa có câu nào trong danh mục này.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
                  {filteredSentences.map((sentence) => (
                    <div 
                      key={sentence.id} 
                      className="bg-white border border-sleek-border rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => {
                        setResult(sentence);
                        setInputText(sentence.originalText);
                        setShowHistory(false);
                        setCurrentSentenceCategoryId(sentence.categoryId || '');
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                            {new Date(sentence.createdAt?.toDate?.() || Date.now()).toLocaleDateString('vi-VN')}
                          </p>
                          {sentence.categoryId ? (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <select 
                                value={sentence.categoryId}
                                onChange={(e) => handleUpdateCategory(sentence.id, e.target.value)}
                                className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase appearance-none cursor-pointer outline-none"
                              >
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                                <option value="">Bỏ nhãn</option>
                              </select>
                            </div>
                          ) : (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                               <select 
                                value=""
                                onChange={(e) => handleUpdateCategory(sentence.id, e.target.value)}
                                className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md font-bold uppercase appearance-none cursor-pointer outline-none hover:bg-slate-200"
                              >
                                <option value="" disabled>Gắn nhãn</option>
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Bookmark size={14} className="text-primary fill-primary" />
                          <button 
                            onClick={(e) => handleDeleteSentence(e, sentence.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div 
                        onMouseUp={(e) => handleSelection(e)}
                        className="group relative"
                      >
                        <h4 className="font-bold text-slate-800 mb-1">
                          {renderHighlightedChinese(sentence.chinese)}
                        </h4>
                        
                        {selectionRange && selectedText && expandedSentence === sentence.id && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="absolute z-[100] bg-slate-800 text-white rounded-lg shadow-xl cursor-pointer flex items-center overflow-hidden divide-x divide-slate-700 whitespace-nowrap"
                            style={{ 
                              top: `${selectionRange.top}px`, 
                              left: `${selectionRange.left}px`,
                              transform: 'translateX(-50%)' 
                            }}
                          >
                            <button 
                              onMouseDown={(e) => { e.preventDefault(); saveWord('word'); }}
                              className="px-3 py-2 hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                              <Bookmark size={10} className="fill-orange-400 text-orange-400" />
                              <span>Từ vựng</span>
                            </button>
                            <button 
                              onMouseDown={(e) => { e.preventDefault(); saveWord('grammar'); }}
                              className="px-3 py-2 hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                              <Bookmark size={10} className="fill-indigo-400 text-indigo-400" />
                              <span>Ngữ pháp</span>
                            </button>
                          </motion.div>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 italic mb-2">{sentence.pinyin}</p>
                      <p className="text-sm text-slate-400 font-medium line-clamp-1">{sentence.originalText}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Panel: AI Output */}
        <div className="lg:col-span-7 flex flex-col gap-8 min-h-[500px]">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={result.chinese}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Translation Card */}
                <div className="sleek-card relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="sleek-label">Bản dịch AI</h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={saveToHistory}
                        disabled={isSaving}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm
                          ${isSaving ? 'bg-slate-50 text-slate-300' : 'hover:bg-primary/10 text-primary'}
                        `}
                        title="Lưu vào sổ tay"
                      >
                        {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Bookmark size={24} />}
                        <span className="hidden sm:inline">Lưu câu này</span>
                      </button>
                      <button 
                        onClick={() => handleSpeak(result.chinese)}
                        className={`p-2 rounded-lg transition-colors text-sleek-muted ${isSpeaking ? 'text-primary bg-primary/10' : 'hover:bg-slate-50'}`}
                        title="Nghe phát âm"
                      >
                        {isSpeaking ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={24} />}
                      </button>
                      
                      {('id' in result) && filteredSentences.length > 1 && (
                        <button 
                          onClick={goToNextSentence}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors flex items-center gap-1 font-bold text-sm bg-primary/5"
                          title="Câu tiếp theo"
                        >
                          <span className="hidden sm:inline">Tiếp theo</span>
                          <ChevronRight size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                    <div 
                      onMouseUp={(e) => handleSelection(e)}
                      className="relative mb-4 group"
                    >
                      <p className="text-4xl md:text-5xl font-bold text-slate-800 tracking-wide leading-tight">
                        {renderHighlightedChinese(result.chinese)}
                      </p>

                      {selectionRange && selectedText && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="absolute z-[100] bg-slate-800 text-white rounded-lg shadow-xl cursor-pointer flex items-center overflow-hidden divide-x divide-slate-700 whitespace-nowrap"
                          style={{ 
                            top: `${selectionRange.top}px`, 
                            left: `${selectionRange.left}px`,
                            transform: 'translateX(-50%)' 
                          }}
                        >
                          <button 
                            onMouseDown={(e) => { e.preventDefault(); saveWord('word'); }}
                            className="px-3 py-2 hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs font-bold"
                          >
                            <Bookmark size={12} className="fill-orange-400 text-orange-400" />
                            <span>Lưu từ vựng</span>
                          </button>
                          <button 
                            onMouseDown={(e) => { e.preventDefault(); saveWord('grammar'); }}
                            className="px-3 py-2 hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs font-bold"
                          >
                            <Bookmark size={12} className="fill-indigo-400 text-indigo-400" />
                            <span>Lưu ngữ pháp</span>
                          </button>
                        </motion.div>
                      )}
                    </div>
                  <p className="text-xl text-slate-500 font-medium italic">
                    {result.pinyin}
                  </p>
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-1">
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nghĩa tiếng Việt (Yêu cầu)</p>
                     <p className="text-xl font-bold text-slate-600">{inputText}</p>
                     <p className="text-sm text-slate-400 mt-2 font-medium italic">Tiếng Anh: {result.meaning}</p>
                  </div>
                </div>

                {/* Grammar Explanation */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="sleek-card"
                >
                  <h2 className="sleek-label">Phân tích ngữ pháp chi tiết</h2>
                  <div className="markdown-body">
                    <ReactMarkdown>{result.grammarExplanation}</ReactMarkdown>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 md:p-12 border-4 border-dashed border-slate-200 rounded-[2rem] opacity-40">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <Search size={48} className="text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-400">Hãy bắt đầu hành trình!</h3>
                <p className="text-slate-400 mt-2">Nhập một câu tiếng Việt bạn muốn nói sang tiếng Trung</p>
                {!user && (
                  <button 
                    onClick={handleLogin}
                    className="mt-6 font-bold text-primary hover:underline"
                  >
                    Đăng nhập để lưu lịch sử học tập
                  </button>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
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
    </div>
  );
}
