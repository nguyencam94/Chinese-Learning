import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen, 
  Sparkles, 
  Layers, 
  Zap, 
  Volume2, 
  VolumeX, 
  SlidersHorizontal, 
  X, 
  Maximize2, 
  Palette, 
  ChevronDown, 
  Loader2, 
  FileDown, 
  List, 
  Bookmark, 
  EyeOff, 
  Check,
  ChevronRight,
  Filter,
  FolderPlus,
  Folder,
  ArrowUpDown,
  Star
} from 'lucide-react';
import { Category, Section, SavedSentence, Vocabulary } from '../types';
import { 
  TranslationResult, 
  generateRealisticIllustration, 
  IllustrationStyle 
} from '../services/geminiService';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, User } from '../lib/firebase';
import { sortSectionSentences } from '../utils/sentenceSort';
import QuickWordOrderQuiz from './QuickWordOrderQuiz';

interface LearnViewProps {
  result: TranslationResult | null;
  setResult: (res: TranslationResult | null) => void;
  savedSentences: SavedSentence[];
  categories: Category[];
  sections: Section[];
  vocabulary?: Vocabulary[];
  user: User | null;
  learnSelectedCategory: string;
  setLearnSelectedCategory: (cat: string) => void;
  learnSelectedSection: string;
  setLearnSelectedSection: (sec: string) => void;
  learnSelectedDifficulty: string;
  setLearnSelectedDifficulty: (diff: string) => void;
  isSpeaking: boolean;
  speakSlowGlobal: boolean;
  setSpeakSlowGlobal: React.Dispatch<React.SetStateAction<boolean>>;
  handleSpeak: (text: string, slow?: boolean) => void;
  setSelectedIllustrationModal: (res: TranslationResult | null) => void;
  setShowDocxExportModal: (show: boolean) => void;
  setDocxExportScope: (scope: 'current' | 'section' | 'category' | 'all') => void;
  renderHighlightedChinese: (chinese: string, sentenceId?: string) => React.ReactNode;
  getDifficultyTranslation: (difficulty?: string) => { label: string; color: string };
  getCategoryTheme: (categoryId?: string, categoriesList?: Category[]) => any;
  onOpenAssignModal?: (sentence: SavedSentence) => void;
  onOpenReorderModal?: (section: Section) => void;
  onExportSectionDocx?: (section: Section) => void;
  onStartWordOrderQuiz?: (sentence: SavedSentence) => void;
}

export default function LearnView({
  result,
  setResult,
  savedSentences,
  categories,
  sections,
  vocabulary = [],
  user,
  learnSelectedCategory,
  setLearnSelectedCategory,
  learnSelectedSection,
  setLearnSelectedSection,
  learnSelectedDifficulty,
  setLearnSelectedDifficulty,
  isSpeaking,
  speakSlowGlobal,
  setSpeakSlowGlobal,
  handleSpeak,
  setSelectedIllustrationModal,
  setShowDocxExportModal,
  setDocxExportScope,
  renderHighlightedChinese,
  getDifficultyTranslation,
  getCategoryTheme,
  onOpenAssignModal,
  onOpenReorderModal,
  onExportSectionDocx,
  onStartWordOrderQuiz,
}: LearnViewProps) {
  const [isLearnSettingsOpen, setIsLearnSettingsOpen] = useState(false);
  const [hidePinyin, setHidePinyin] = useState(true);
  const [hideMeaning, setHideMeaning] = useState(true);
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editableExplanation, setEditableExplanation] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isGeneratingIllustration, setIsGeneratingIllustration] = useState(false);
  const [chosenIllustrationStyle, setChosenIllustrationStyle] = useState<IllustrationStyle>('photorealistic');
  const [showIllustrationStyleDropdown, setShowIllustrationStyleDropdown] = useState(false);

  useEffect(() => {
    if (result && 'note' in result) {
      setNoteText((result as SavedSentence).note || '');
    } else {
      setNoteText('');
    }
    setIsEditingNote(false);
    setIsEditingExplanation(false);
  }, [result]);

  // Handle save edited grammar explanation
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
    setResult(result ? { ...result, grammarExplanation: editableExplanation } : null);
    setIsEditingExplanation(false);
  };

  // Handle save note
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
    setResult(result ? ({ ...result, note: noteText } as SavedSentence) : null);
    setIsEditingNote(false);
  };

  // Filter list of available sections for selected category
  const availableSections = sections.filter(s => 
    learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory
  );

  // Compute matched sentences based on Category, Section (đoạn văn), and Difficulty
  const rawFilteredSentences = savedSentences.filter(s => {
    const matchesCategory = learnSelectedCategory === 'all' ? true : s.categoryId === learnSelectedCategory;
    const matchesSection = learnSelectedSection === 'all' ? true : s.sectionId === learnSelectedSection;
    const matchesDiff = learnSelectedDifficulty === 'all' ? true : (s.difficulty || 'basic') === learnSelectedDifficulty;
    return matchesCategory && matchesSection && matchesDiff;
  });

  const filteredSentences = learnSelectedSection !== 'all'
    ? sortSectionSentences(rawFilteredSentences)
    : rawFilteredSentences;

  const activeCategoryName = learnSelectedCategory === 'all' 
    ? 'Tất cả chủ đề' 
    : (categories.find(c => c.id === learnSelectedCategory)?.name || 'Chung');

  const activeSectionObj = sections.find(s => s.id === learnSelectedSection);
  const activeSectionName = learnSelectedSection === 'all'
    ? 'Tất cả đoạn văn'
    : (activeSectionObj?.name || 'Đoạn văn');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Elegant Header with Settings Trigger & Active Filter Badges */}
      <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300 ${result ? 'hidden md:flex' : 'flex'}`}>
        <div className="space-y-1.5">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <BookOpen className="text-emerald-500 shrink-0" size={24} /> Học tập chuyên sâu
          </h1>
          <div className="flex items-center flex-wrap gap-2 text-xs font-semibold">
            {/* Category badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[11px]">
              <span className="opacity-70 font-normal">Chủ đề:</span>
              <strong className="font-bold">{activeCategoryName}</strong>
            </span>

            {/* Section / Đoạn văn badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200/60 text-[11px]">
              <Layers size={12} className="text-indigo-500" />
              <span className="opacity-70 font-normal">Đoạn văn:</span>
              <strong className="font-bold">{activeSectionName}</strong>
            </span>

            {/* Reorder & Export Section Buttons if a section is active */}
            {activeSectionObj && (
              <div className="inline-flex items-center gap-1.5">
                {onExportSectionDocx && (
                  <button
                    type="button"
                    onClick={() => onExportSectionDocx(activeSectionObj)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-black hover:bg-blue-100 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Tải toàn bộ đoạn văn này dạng Word (.docx) kèm ảnh minh họa 16:9 và bài đọc toàn văn"
                  >
                    <FileDown size={12} className="text-blue-600" />
                    <span>Xuất Word Cả Đoạn</span>
                  </button>
                )}

                {onOpenReorderModal && (
                  <button
                    type="button"
                    onClick={() => onOpenReorderModal(activeSectionObj)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black hover:bg-amber-100 transition-all cursor-pointer shadow-xs"
                    title="Sắp xếp thứ tự các câu trong đoạn này (đặt câu chủ đề, đổi vị trí...)"
                  >
                    <ArrowUpDown size={12} className="text-amber-600" />
                    <span>Sắp xếp câu trong đoạn</span>
                  </button>
                )}
              </div>
            )}

            {/* Difficulty badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 text-[11px]">
              <Zap size={12} className="text-amber-500" />
              <span className="opacity-70 font-normal">Mức độ:</span>
              <strong className="font-bold">{
                learnSelectedDifficulty === 'all' ? 'Tất cả mức độ' :
                learnSelectedDifficulty === 'basic' ? '⭐ Cơ bản' :
                learnSelectedDifficulty === 'easy' ? '⭐⭐ Dễ' :
                learnSelectedDifficulty === 'medium' ? '⭐⭐⭐ Trung bình' : '⭐⭐⭐⭐ Khó'
              }</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLearnSettingsOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl transition-all border border-emerald-200/60 text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 shrink-0"
        >
          <SlidersHorizontal size={14} /> Lọc Chủ đề / Đoạn văn / Độ khó
        </button>
      </div>

      {/* Modal for Choose Topic, Section & Difficulty */}
      <AnimatePresence>
        {isLearnSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLearnSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[88vh]"
            >
              {/* Header */}
              <div className="p-6 md:p-7 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50/50 via-white to-indigo-50/30">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/70 px-3 py-1 rounded-full uppercase tracking-widest">
                    Cấu hình bộ lọc học tập
                  </span>
                  <h2 className="text-xl font-bold text-slate-800">Chọn Chủ đề, Đoạn văn & Mức độ khó</h2>
                </div>
                <button 
                  onClick={() => setIsLearnSettingsOpen(false)}
                  className="p-2.5 bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* 1. TOPIC / CHỦ ĐỀ SELECTOR */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-500 animate-pulse" /> 
                    1. Chọn chủ đề học:
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLearnSelectedCategory('all');
                        setLearnSelectedSection('all');
                        const filtered = savedSentences.filter(s => 
                          (learnSelectedDifficulty === 'all' || (s.difficulty || 'basic') === learnSelectedDifficulty)
                        );
                        if (result) {
                          setResult(filtered.length > 0 ? filtered[0] : null);
                        }
                      }}
                      className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                        learnSelectedCategory === 'all'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100/50'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
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
                          type="button"
                          onClick={() => {
                            setLearnSelectedCategory(c.id);
                            setLearnSelectedSection('all');
                            const filtered = savedSentences.filter((s) => 
                              s.categoryId === c.id && 
                              (learnSelectedDifficulty === 'all' || (s.difficulty || 'basic') === learnSelectedDifficulty)
                            );
                            if (result) {
                              setResult(filtered.length > 0 ? filtered[0] : null);
                            }
                          }}
                          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                            learnSelectedCategory === c.id
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100/50'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                          }`}
                        >
                          <span className="block font-black truncate">{c.name}</span>
                          <span className="text-[10px] opacity-80 mt-0.5 block font-medium">({count} câu)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SECTION / ĐOẠN VĂN SELECTOR */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-500" />
                    2. Lọc theo đoạn văn / phân đoạn:
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLearnSelectedSection('all');
                        const filtered = savedSentences.filter(s => {
                          const matchesCat = learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory;
                          const matchesDiff = learnSelectedDifficulty === 'all' || (s.difficulty || 'basic') === learnSelectedDifficulty;
                          return matchesCat && matchesDiff;
                        });
                        if (result) {
                          setResult(filtered.length > 0 ? filtered[0] : null);
                        }
                      }}
                      className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                        learnSelectedSection === 'all'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100/50'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                      }`}
                    >
                      <span className="block font-black truncate">Tất cả đoạn</span>
                      <span className="text-[10px] opacity-80 mt-0.5 block font-medium">
                        ({savedSentences.filter(s => learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory).length} câu)
                      </span>
                    </button>

                    {availableSections.map((sec) => {
                      const count = savedSentences.filter(s => 
                        (learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory) && 
                        s.sectionId === sec.id
                      ).length;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            setLearnSelectedSection(sec.id);
                            const filtered = savedSentences.filter(s => {
                              const matchesCat = learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory;
                              const matchesSec = s.sectionId === sec.id;
                              const matchesDiff = learnSelectedDifficulty === 'all' || (s.difficulty || 'basic') === learnSelectedDifficulty;
                              return matchesCat && matchesSec && matchesDiff;
                            });
                            if (result) {
                              setResult(filtered.length > 0 ? filtered[0] : null);
                            }
                          }}
                          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                            learnSelectedSection === sec.id
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100/50'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                          }`}
                        >
                          <span className="block font-black truncate">{sec.name}</span>
                          <span className="text-[10px] opacity-80 mt-0.5 block font-medium">({count} câu)</span>
                        </button>
                      );
                    })}
                  </div>

                  {availableSections.length === 0 && learnSelectedCategory !== 'all' && (
                    <p className="text-xs text-slate-400 italic py-1">Chủ đề này chưa có phân đoạn riêng. Bạn có thể thêm đoạn mới trong tab "Quản trị".</p>
                  )}
                </div>

                {/* 3. DIFFICULTY SELECTOR */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                    <Zap size={14} className="text-amber-500" />
                    3. Chọn mức độ khó:
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
                        const matchesSection = learnSelectedSection === 'all' || s.sectionId === learnSelectedSection;
                        const sDiff = s.difficulty || 'basic';
                        return matchesCategory && matchesSection && (diff.id === 'all' || sDiff === diff.id);
                      }).length;
                      
                      return (
                        <button
                          key={diff.id}
                          type="button"
                          onClick={() => {
                            setLearnSelectedDifficulty(diff.id);
                            const filtered = savedSentences.filter(s => {
                              const matchesCategory = learnSelectedCategory === 'all' || s.categoryId === learnSelectedCategory;
                              const matchesSection = learnSelectedSection === 'all' || s.sectionId === learnSelectedSection;
                              const sDiff = s.difficulty || 'basic';
                              const matchesDiff = diff.id === 'all' || sDiff === diff.id;
                              return matchesCategory && matchesSection && matchesDiff;
                            });
                            if (result) {
                              setResult(filtered.length > 0 ? filtered[0] : null);
                            }
                          }}
                          className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left flex justify-between items-center ${
                            learnSelectedDifficulty === diff.id
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-100'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
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
              <div className="p-6 md:p-7 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button 
                  type="button"
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
          <p className="text-slate-500 mb-8 font-medium">Chọn một câu văn từ danh sách dưới đây để bắt đầu phân tích học tập:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-h-[350px] overflow-y-auto p-2 rounded-2xl bg-slate-50 border border-slate-100">
            {filteredSentences.map(s => (
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
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <p className="text-xs text-slate-400 truncate flex-1">{s.meaning}</p>
                    {onStartWordOrderQuiz && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartWordOrderQuiz(s);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-200/80 transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
                        title="Bắt đầu bài tập sắp xếp trật tự câu này ngay"
                      >
                        <Zap size={10} className="text-indigo-600 fill-indigo-600/30" />
                        <span>Xếp từ ➔</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredSentences.length === 0 && (
              <p className="col-span-full text-center text-slate-400 py-6 text-sm">Chưa có câu nào trong chủ đề, đoạn văn và mức độ khó này.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {(() => {
            const currentIndex = filteredSentences.findIndex(s => s.id === (result as SavedSentence).id);
            const currentNo = currentIndex !== -1 ? currentIndex + 1 : 0;
            const totalCount = filteredSentences.length;
            
            return (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Chữ tiếng Trung, 16:9 Illustration, Pinyin, và Dịch nghĩa */}
                  <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">
                    <div className="sleek-card bg-white relative overflow-hidden transition-all shadow-md">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
                      <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-50 pb-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">
                            Văn bản học tập
                          </span>

                          {/* Section Assignment Tag & Trigger */}
                          {user && 'id' in result && (
                            <button
                              type="button"
                              onClick={() => onOpenAssignModal && onOpenAssignModal(result as SavedSentence)}
                              className="flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-full text-[11px] border border-indigo-200/70 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                              title="Gán câu này vào đoạn văn đã tạo hoặc tạo đoạn văn mới"
                            >
                              <FolderPlus size={12} className="text-indigo-600" />
                              <span>Đoạn: {sections.find(s => s.id === (result as SavedSentence).sectionId)?.name || 'Chưa gán'}</span>
                            </button>
                          )}

                          {/* Order / Topic Sentence Badge */}
                          {user && 'id' in result && (result as SavedSentence).sectionId && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              (result as SavedSentence).orderIndex === 1
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {(result as SavedSentence).orderIndex === 1 && (
                                <Star size={10} className="fill-amber-500 text-amber-500" />
                              )}
                              <span>
                                {(result as SavedSentence).orderIndex === 1
                                  ? 'Câu chủ đề (#1)'
                                  : `Vị trí #${(result as SavedSentence).orderIndex || currentNo}`}
                              </span>
                            </span>
                          )}

                          {/* Quick link to Practice Center Word Order Quiz */}
                      {onStartWordOrderQuiz && 'id' in result && (
                        <button
                          type="button"
                          onClick={() => onStartWordOrderQuiz(result as SavedSentence)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 font-extrabold rounded-lg text-[11px] border border-indigo-200/80 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                          title="Chuyển nhanh đến bài tập sắp xếp trật tự câu này trong phần Luyện tập"
                        >
                          <Zap size={12} className="text-indigo-600 fill-indigo-600/30" />
                          <span>Luyện trật tự câu ➔</span>
                        </button>
                      )}

                      {/* Word Export Button */}
                          <button 
                            type="button"
                            onClick={() => {
                              setDocxExportScope('current');
                              setShowDocxExportModal(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] border border-blue-200/80 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                            title="Tải bài học dưới dạng file Word (.docx) kèm ảnh minh họa 16:9 và giải thích nghĩa"
                          >
                            <FileDown size={13} className="text-blue-600" />
                            <span>Tải Word (.docx)</span>
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
                          {/* Speak Buttons */}
                          <button
                            onClick={() => handleSpeak(result.chinese, false)}
                            disabled={isSpeaking}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isSpeaking && !speakSlowGlobal 
                                ? 'bg-primary text-white shadow-sm' 
                                : 'text-slate-500 hover:text-primary hover:bg-white'
                            }`}
                            title="Nghe phát âm chuẩn (tốc độ thường)"
                          >
                            <Volume2 size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleSpeak(result.chinese, true)}
                            disabled={isSpeaking}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isSpeaking && speakSlowGlobal 
                                ? 'bg-amber-500 text-white shadow-sm' 
                                : 'text-amber-700 hover:bg-amber-50'
                            }`}
                            title="Nghe phát âm chậm (dễ luyện theo từng thanh điệu)"
                          >
                            <span>🐢</span>
                            <span className="text-[10px] font-black">0.5x</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Dynamic Realism 16:9 Widescreen Illustration Card */}
                      {result.illustrationSvg ? (
                        <div className="w-full flex flex-col items-center justify-center mb-5">
                          <div className="relative group w-full">
                            <div 
                              onClick={() => setSelectedIllustrationModal(result)}
                              className="w-full aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900/5 border border-slate-200/80 shadow-md flex items-center justify-center relative cursor-zoom-in transition-all duration-300 hover:shadow-xl hover:scale-[1.008]"
                              title="Nhấp để phóng to tranh minh họa 16:9"
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
                                  className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover"
                                  dangerouslySetInnerHTML={{ __html: result.illustrationSvg }}
                                />
                              )}
                              {/* Overlay zoom & 16:9 badge */}
                              <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white/90 px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                <span>16:9</span>
                                <span className="opacity-60">•</span>
                                <span>Trực quan bối cảnh</span>
                              </div>

                              <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                <Maximize2 size={12} /> Phóng to 16:9
                              </div>
                            </div>
                            
                            {/* Actions under illustration */}
                            {user && 'id' in result && (
                              <div className="flex items-center justify-between gap-1.5 mt-2.5 px-1">
                                <button
                                  type="button"
                                  onClick={() => setShowIllustrationStyleDropdown(!showIllustrationStyleDropdown)}
                                  disabled={isGeneratingIllustration}
                                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  title="Đổi phong cách vẽ chân thực"
                                >
                                  <Palette size={13} className="text-indigo-500" />
                                  <span>{
                                    chosenIllustrationStyle === 'photorealistic' ? '📸 Chân thực 16:9' :
                                    chosenIllustrationStyle === '3d-cinematic' ? '🎨 3D Sống động 16:9' :
                                    chosenIllustrationStyle === 'chinese-art' ? '🖌️ Thủy mặc 16:9' : '✨ Vector chi tiết 16:9'
                                  }</span>
                                  <ChevronDown size={12} />
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setIsGeneratingIllustration(true);
                                    try {
                                      const newArtwork = await generateRealisticIllustration(result.chinese, result.meaning, chosenIllustrationStyle);
                                      setResult({ ...result, illustrationSvg: newArtwork } as SavedSentence);
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
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isGeneratingIllustration ? (
                                    <>
                                      <Loader2 className="animate-spin" size={13} />
                                      <span>Đang vẽ 16:9...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={13} />
                                      <span>Vẽ lại 16:9</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Dropdown choose style */}
                            <AnimatePresence>
                              {showIllustrationStyleDropdown && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="absolute top-12 left-0 z-20 bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 w-64 space-y-1"
                                >
                                  {[
                                    { id: 'photorealistic' as const, label: '📸 Chân thực (Nhiếp ảnh)', desc: 'Ảnh chụp đời thực, ánh sáng sống động' },
                                    { id: '3d-cinematic' as const, label: '🎨 3D Điện ảnh (Cinematic)', desc: 'Khối 3D sắc nét, phong cách điện ảnh' },
                                    { id: 'chinese-art' as const, label: '🖌️ Thủy mặc Trung Hoa', desc: 'Nghệ thuật tranh thủy mặc cổ phong' },
                                    { id: 'detailed-vector' as const, label: '✨ Vector Chi tiết Đa lớp', desc: 'Đồ họa vector ánh sáng gradient chi tiết' },
                                  ].map(item => (
                                    <button
                                      key={item.id}
                                      type="button"
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
                                <p className="text-xs text-emerald-800 font-bold animate-pulse">Đang tạo tranh AI 16:9 chân thực & sống động...</p>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 text-left">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-100/60 flex items-center justify-center text-emerald-600 shrink-0">
                                    <Sparkles size={16} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">Tạo tranh minh họa chân thực 16:9 AI</p>
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
                                    type="button"
                                    onClick={async () => {
                                      setIsGeneratingIllustration(true);
                                      try {
                                        const newArtwork = await generateRealisticIllustration(result.chinese, result.meaning, chosenIllustrationStyle);
                                        setResult({ ...result, illustrationSvg: newArtwork } as SavedSentence);
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
                                    🎨 Tạo tranh 16:9
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      )}

                      <div className="mb-4 md:mb-5">
                        <p className="text-4xl md:text-6xl font-bold text-slate-800 tracking-[0.12em] mb-2.5 md:mb-3 leading-normal break-words">
                          {renderHighlightedChinese(result.chinese, (result as any).id)}
                        </p>
                        
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
                                type="button"
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
                              type="button"
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

                    {/* Kiểm tra nhanh trí nhớ: Bài tập điền trật tự từ */}
                    {'id' in result && (
                      <QuickWordOrderQuiz
                        sentence={result as SavedSentence}
                        vocabulary={vocabulary}
                        onJumpToPractice={onStartWordOrderQuiz}
                        onSpeak={handleSpeak}
                      />
                    )}

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
                            type="button"
                            onClick={() => {
                              setEditableExplanation(result.grammarExplanation);
                              setIsEditingExplanation(true);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            Sửa nhanh
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingExplanation(false)}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveExplanation}
                              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer"
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
                    type="button"
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
                    type="button"
                    onClick={() => {
                      if (totalCount === 0) return;
                      const prevIndex = (currentIndex - 1 + totalCount) % totalCount;
                      setResult(filteredSentences[prevIndex]);
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
                    type="button"
                    onClick={() => {
                      if (totalCount === 0) return;
                      const nextIndex = (currentIndex + 1) % totalCount;
                      setResult(filteredSentences[nextIndex]);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={totalCount <= 1}
                    className="flex items-center gap-1.5 px-5 sm:px-7.5 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none rounded-full transition-all duration-200 shadow-md shadow-emerald-100/50 cursor-pointer shrink-0"
                  >
                    Tiếp →
                  </button>

                  {onStartWordOrderQuiz && 'id' in result && (
                    <>
                      <div className="w-px h-4 sm:h-5 bg-slate-200 shrink-0" />
                      <button
                        type="button"
                        onClick={() => onStartWordOrderQuiz(result as SavedSentence)}
                        title="Chuyển nhanh đến bài tập sắp xếp trật tự câu này trong phần Luyện tập"
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-full transition-all duration-200 border border-indigo-200/80 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Zap size={12} />
                        <span className="hidden sm:inline">Luyện trật tự từ</span>
                        <span className="sm:hidden">Xếp từ</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
