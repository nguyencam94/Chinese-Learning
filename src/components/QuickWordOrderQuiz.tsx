import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  ArrowRight, 
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { SavedSentence, Vocabulary } from '../types';
import { 
  segmentChineseSentence, 
  createShuffledSegments, 
  SegmentItem 
} from '../utils/sentenceSegmenter';

interface QuickWordOrderQuizProps {
  sentence: SavedSentence;
  vocabulary?: Vocabulary[];
  onJumpToPractice?: (sentence: SavedSentence) => void;
  onSpeak?: (text: string, slow?: boolean) => void;
}

export default function QuickWordOrderQuiz({
  sentence,
  vocabulary = [],
  onJumpToPractice,
  onSpeak
}: QuickWordOrderQuizProps) {
  // Correct segments in order
  const correctSegments = useMemo(() => {
    return segmentChineseSentence(sentence.chinese, sentence.id, vocabulary, sentence.pinyin);
  }, [sentence.chinese, sentence.id, vocabulary, sentence.pinyin]);

  // Shuffled choices
  const [shuffledSegments, setShuffledSegments] = useState<SegmentItem[]>([]);
  // Indices of shuffled segments placed in each slot [slot0_shuffledIdx, slot1_shuffledIdx, ...]
  const [selectedIndices, setSelectedIndices] = useState<(number | null)[]>([]);
  // Current active/focused slot
  const [focusedSlotIdx, setFocusedSlotIdx] = useState<number | null>(null);
  // Result state: 'idle' | 'checking' | 'correct' | 'incorrect'
  const [quizStatus, setQuizStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  // Optional hint state (reveals pinyin / meaning)
  const [showHint, setShowHint] = useState(false);

  // Initialize or reset when sentence changes
  const initQuiz = () => {
    if (correctSegments.length === 0) return;
    const shuffled = createShuffledSegments(correctSegments);
    setShuffledSegments(shuffled);
    setSelectedIndices(Array(correctSegments.length).fill(null));
    setFocusedSlotIdx(null);
    setQuizStatus('idle');
    setShowHint(false);
  };

  useEffect(() => {
    initQuiz();
  }, [sentence.id, sentence.chinese, correctSegments]);

  // Handle clicking a choice from available words
  const handleSelectWord = (shuffledIdx: number) => {
    if (quizStatus === 'correct') return;

    setSelectedIndices(prev => {
      const next = [...prev];
      // If a specific slot is manually focused and empty, place it there
      if (focusedSlotIdx !== null && focusedSlotIdx < next.length && next[focusedSlotIdx] === null) {
        next[focusedSlotIdx] = shuffledIdx;
        const nextNull = next.indexOf(null);
        setFocusedSlotIdx(nextNull !== -1 ? nextNull : null);
        return next;
      }

      // Otherwise, fill the first available null slot
      const firstNull = next.indexOf(null);
      if (firstNull !== -1) {
        next[firstNull] = shuffledIdx;
        const nextNull = next.indexOf(null);
        setFocusedSlotIdx(nextNull !== -1 ? nextNull : null);
      }
      return next;
    });

    if (quizStatus === 'incorrect') {
      setQuizStatus('idle');
    }
  };

  // Handle removing a word from a slot
  const handleRemoveFromSlot = (slotIdx: number) => {
    if (quizStatus === 'correct') return;

    setSelectedIndices(prev => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setFocusedSlotIdx(slotIdx);
    if (quizStatus === 'incorrect') {
      setQuizStatus('idle');
    }
  };

  // Check the answer
  const handleCheckAnswer = () => {
    const isFilled = selectedIndices.every(idx => idx !== null);
    if (!isFilled) return;

    const userSentence = selectedIndices
      .map(idx => (idx !== null ? shuffledSegments[idx]?.text : ''))
      .join('');
    
    const targetSentence = correctSegments.join('');

    if (userSentence === targetSentence) {
      setQuizStatus('correct');
      if (onSpeak) {
        // Pronounce when correct
        onSpeak(sentence.chinese, false);
      }
    } else {
      setQuizStatus('incorrect');
    }
  };

  const isFilled = selectedIndices.length > 0 && selectedIndices.every(idx => idx !== null);

  return (
    <div className="sleek-card bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 border-2 border-indigo-100/80 shadow-md relative overflow-hidden transition-all">
      {/* Subtle decorative background glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 pb-3 border-b border-indigo-100/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Zap size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                Kiểm tra nhanh trí nhớ
              </h4>
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md">
                Điền trật tự từ
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Sắp xếp các mảnh từ bên dưới theo đúng ngữ pháp câu vừa học
            </p>
          </div>
        </div>

        {/* Quick link button to the Practice Center */}
        {onJumpToPractice && (
          <button
            type="button"
            onClick={() => onJumpToPractice(sentence)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer group shrink-0"
            title="Mở câu này trong phần Luyện tập sắp xếp trật tự từ toàn màn hình"
          >
            <span>Luyện ở Trung tâm</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Meaning reference */}
      <div className="mb-4 p-3 rounded-xl bg-white/80 border border-slate-200/70 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 shrink-0">
            Nghĩa:
          </span>
          <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
            “{sentence.originalText || sentence.meaning}”
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          title={showHint ? "Ẩn gợi ý" : "Xem gợi ý Pinyin"}
        >
          {showHint ? <EyeOff size={11} /> : <Eye size={11} />}
          <span>{showHint ? "Ẩn Pinyin" : "Gợi ý Pinyin"}</span>
        </button>
      </div>

      {showHint && sentence.pinyin && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 px-3 py-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs font-semibold text-amber-900 italic flex items-center gap-2"
        >
          <HelpCircle size={13} className="text-amber-600 shrink-0" />
          <span>Phiên âm Pinyin tham khảo: {sentence.pinyin}</span>
        </motion.div>
      )}

      {/* Answer Slots Area */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
          <span>Khung sắp xếp câu:</span>
          <span className="text-slate-500 font-semibold">
            {selectedIndices.filter(x => x !== null).length}/{correctSegments.length} từ
          </span>
        </div>

        <div className="min-h-[58px] p-2 sm:p-3 rounded-2xl bg-white border-2 border-dashed border-indigo-200/80 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 shadow-inner">
          {selectedIndices.map((shuffledIdx, slotIdx) => {
            if (shuffledIdx === null) {
              const isFocused = focusedSlotIdx === slotIdx;
              return (
                <button
                  key={`slot-${slotIdx}`}
                  type="button"
                  onClick={() => setFocusedSlotIdx(slotIdx)}
                  className={`h-9 sm:h-11 px-2.5 sm:px-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-xs font-bold flex items-center justify-center ${
                    isFocused 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm scale-105' 
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 text-slate-400'
                  }`}
                >
                  {isFocused ? `Ô ${slotIdx + 1} ✎` : `Ô ${slotIdx + 1}`}
                </button>
              );
            }

            const item = shuffledSegments[shuffledIdx];
            const isCorrectSegment = correctSegments[slotIdx] === item?.text;
            let slotColorClass = 'bg-indigo-50/90 text-indigo-950 border-indigo-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700';

            if (quizStatus === 'correct') {
              slotColorClass = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
            } else if (quizStatus === 'incorrect') {
              slotColorClass = isCorrectSegment
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse';
            }

            return (
              <button
                key={`placed-${slotIdx}`}
                type="button"
                onClick={() => handleRemoveFromSlot(slotIdx)}
                title="Bấm để gỡ từ này"
                className={`h-9 sm:h-11 px-2.5 sm:px-4 font-black text-sm sm:text-base md:text-lg rounded-xl border shadow-xs transition-all cursor-pointer flex items-center justify-center active:scale-95 ${slotColorClass}`}
              >
                {item?.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Word Choices */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          Chọn từ bên dưới:
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-slate-50/70 border border-slate-100">
          {shuffledSegments.map((item, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return (
              <button
                key={`choice-${item.id}`}
                type="button"
                disabled={isSelected || quizStatus === 'correct'}
                onClick={() => handleSelectWord(idx)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm md:text-base font-extrabold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 text-slate-300 border-slate-200 opacity-40 select-none cursor-default'
                    : 'bg-white text-slate-800 border-slate-200 shadow-xs hover:border-indigo-500 hover:text-indigo-700 hover:shadow-sm hover:scale-105 active:scale-95'
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {quizStatus === 'correct' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-black text-emerald-900">
                  Xuất sắc! Bạn đã nhớ chuẩn xác trật tự câu 🎉
                </p>
                <p className="text-[11px] text-emerald-700 font-bold">
                  {sentence.chinese}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(sentence.chinese, false)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Volume2 size={13} />
                  <span>Nghe câu</span>
                </button>
              )}
              <button
                type="button"
                onClick={initQuiz}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <RotateCcw size={12} />
                <span>Thử lại</span>
              </button>
            </div>
          </motion.div>
        )}

        {quizStatus === 'incorrect' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <p className="text-xs font-bold text-rose-900">
                Chưa đúng trật tự từ! Các từ nhấp nháy đỏ đang đặt sai vị trí. Bấm vào từ để gỡ và xếp lại nhé.
              </p>
            </div>

            <button
              type="button"
              onClick={initQuiz}
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline shrink-0 cursor-pointer"
            >
              Làm lại từ đầu
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={initQuiz}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={12} />
          <span>Làm mới bài tập</span>
        </button>

        <div className="flex items-center gap-2">
          {quizStatus !== 'correct' && (
            <button
              type="button"
              disabled={!isFilled}
              onClick={handleCheckAnswer}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Kiểm tra kết quả</span>
            </button>
          )}

          {onJumpToPractice && (
            <button
              type="button"
              onClick={() => onJumpToPractice(sentence)}
              className="px-3 py-1.5 bg-white hover:bg-indigo-50 active:scale-95 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Chuyển sang làm bài tập sắp xếp trật tự câu trong Trung tâm kiểm tra & luyện tập"
            >
              <ExternalLink size={12} />
              <span className="hidden sm:inline">Phần Luyện tập</span>
              <span>Trật tự câu ➔</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
