import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUpDown, 
  X, 
  Check, 
  ChevronUp, 
  ChevronDown, 
  Star, 
  Sparkles, 
  Volume2, 
  Loader2, 
  BookOpen, 
  Layers,
  RotateCcw,
  Eye,
  FileText
} from 'lucide-react';
import { Section, SavedSentence, Category } from '../types';
import { sortSectionSentences } from '../utils/sentenceSort';

interface ReorderSectionSentencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section | null;
  category?: Category | null;
  sentences: SavedSentence[];
  onSaveOrder: (sectionId: string, orderedSentenceIds: string[]) => Promise<void>;
  onSpeak?: (text: string, lang?: string) => void;
}

export const ReorderSectionSentencesModal: React.FC<ReorderSectionSentencesModalProps> = ({
  isOpen,
  onClose,
  section,
  category,
  sentences,
  onSaveOrder,
  onSpeak
}) => {
  const [orderedList, setOrderedList] = useState<SavedSentence[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && section) {
      const sectionSentences = sentences.filter(s => s.sectionId === section.id);
      const sorted = sortSectionSentences(sectionSentences);
      setOrderedList(sorted);
      setHasChanges(false);
    }
  }, [isOpen, section, sentences]);

  if (!isOpen || !section) return null;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === orderedList.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...orderedList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setOrderedList(updated);
    setHasChanges(true);
  };

  const moveToTop = (index: number) => {
    if (index === 0) return;
    const updated = [...orderedList];
    const [moved] = updated.splice(index, 1);
    updated.unshift(moved);
    setOrderedList(updated);
    setHasChanges(true);
  };

  const moveToPosition = (currentIndex: number, newPos1Based: number) => {
    const targetIndex = Math.max(0, Math.min(orderedList.length - 1, newPos1Based - 1));
    if (currentIndex === targetIndex) return;

    const updated = [...orderedList];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setOrderedList(updated);
    setHasChanges(true);
  };

  const handleSortOldestFirst = () => {
    const sorted = [...orderedList].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeA - timeB;
    });
    setOrderedList(sorted);
    setHasChanges(true);
  };

  const handleSortNewestFirst = () => {
    const sorted = [...orderedList].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
    setOrderedList(sorted);
    setHasChanges(true);
  };

  const handleReverseOrder = () => {
    setOrderedList([...orderedList].reverse());
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (isSaving || !section) return;
    setIsSaving(true);
    try {
      const orderedIds = orderedList.map(s => s.id);
      await onSaveOrder(section.id, orderedIds);
      setHasChanges(false);
      onClose();
    } catch (err) {
      console.error("Error saving sentence order:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Connected text preview
  const combinedChinese = orderedList.map(s => s.chinese).join(' ');
  const combinedMeaning = orderedList.map(s => s.meaning).join(' ');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
          className="relative bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                <ArrowUpDown size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
                    {category ? category.name : 'Đoạn văn'}
                  </span>
                  <span className="bg-indigo-100/70 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {orderedList.length} câu
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span>Sắp xếp thứ tự:</span>
                  <span className="text-indigo-600 font-extrabold">{section.name}</span>
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all border border-slate-200/60 cursor-pointer shadow-xs"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Subheader Toolbar / Preset Sorting */}
          <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Sparkles size={13} className="text-amber-500" />
              <span>Kéo hoặc bấm mũi tên để chỉnh thứ tự:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all border cursor-pointer ${
                  isPreviewOpen
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Xem văn bản nối liền của cả đoạn"
              >
                <Eye size={12} />
                <span>{isPreviewOpen ? 'Ẩn xem trước' : 'Xem đoạn văn'}</span>
              </button>

              <button
                type="button"
                onClick={handleSortOldestFirst}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg font-bold text-[11px] border border-slate-200 transition-all cursor-pointer"
                title="Sắp xếp theo thứ tự thêm vào từ cũ đến mới"
              >
                Cũ ➔ Mới
              </button>

              <button
                type="button"
                onClick={handleReverseOrder}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg font-bold text-[11px] border border-slate-200 transition-all cursor-pointer"
                title="Đảo ngược thứ tự hiện tại"
              >
                <RotateCcw size={11} className="inline mr-1" />
                Đảo ngược
              </button>
            </div>
          </div>

          {/* Optional Connected Paragraph Preview Banner */}
          <AnimatePresence>
            {isPreviewOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white border-b border-indigo-100 space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                    <FileText size={12} /> Xem trước đoạn văn hoàn chỉnh theo thứ tự này:
                  </span>
                  {onSpeak && combinedChinese && (
                    <button
                      type="button"
                      onClick={() => onSpeak(combinedChinese, 'zh-CN')}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white/90 px-2 py-0.5 rounded-md border border-indigo-200 shadow-xs cursor-pointer"
                    >
                      <Volume2 size={12} /> Đọc cả đoạn
                    </button>
                  )}
                </div>
                <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed tracking-wide">
                  {combinedChinese || 'Chưa có câu nào trong đoạn.'}
                </p>
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  {combinedMeaning}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List of Sentences */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
            {orderedList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Layers className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm font-bold text-slate-600">Đoạn văn này hiện chưa có câu thoại nào.</p>
                <p className="text-xs text-slate-400 mt-1">Hãy dùng nút "Gán đoạn" từ thư viện hoặc bài học để thêm câu vào.</p>
              </div>
            ) : (
              orderedList.map((sentence, index) => {
                const isFirst = index === 0;
                const isLast = index === orderedList.length - 1;

                return (
                  <motion.div
                    key={sentence.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-white border-amber-300 shadow-sm'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200/80'
                    }`}
                  >
                    {/* Position Badge & Content */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Number Badge */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-xs ${
                          isFirst
                            ? 'bg-amber-500 text-white shadow-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {index + 1}
                        </span>
                        {isFirst && (
                          <span className="text-[9px] font-black text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-md mt-1 whitespace-nowrap flex items-center gap-0.5">
                            <Star size={9} className="fill-amber-500 text-amber-500" />
                            Chủ đề
                          </span>
                        )}
                      </div>

                      {/* Text content */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm sm:text-base font-bold text-slate-800 leading-snug tracking-wide">
                            {sentence.chinese}
                          </p>
                          {onSpeak && (
                            <button
                              type="button"
                              onClick={() => onSpeak(sentence.chinese, 'zh-CN')}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Nghe câu"
                            >
                              <Volume2 size={13} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 italic font-medium">
                          {sentence.pinyin}
                        </p>
                        <p className="text-xs text-slate-600 font-medium line-clamp-2">
                          {sentence.meaning}
                        </p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {/* Make Topic (Move to top) */}
                      {!isFirst && (
                        <button
                          type="button"
                          onClick={() => moveToTop(index)}
                          className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl border border-amber-200/80 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Đặt câu này làm câu mở đầu / câu chủ đề của đoạn (Vị trí #1)"
                        >
                          <Star size={11} className="fill-amber-500 text-amber-500" />
                          <span className="hidden sm:inline">Lên đầu</span>
                        </button>
                      )}

                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={isFirst}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Di chuyển lên trên một bậc"
                      >
                        <ChevronUp size={16} />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={isLast}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Di chuyển xuống dưới một bậc"
                      >
                        <ChevronDown size={16} />
                      </button>

                      {/* Direct Position Selector */}
                      {orderedList.length > 2 && (
                        <select
                          value={index + 1}
                          onChange={(e) => moveToPosition(index, parseInt(e.target.value, 10))}
                          className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none cursor-pointer ml-1"
                          title="Chuyển trực tiếp đến vị trí số"
                        >
                          {orderedList.map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              #{i + 1}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500">
              {hasChanges ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <Sparkles size={13} /> Có thay đổi thứ tự chưa lưu
                </span>
              ) : (
                <span className="text-slate-400">Thứ tự hiện tại đã sẵn sàng</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || orderedList.length === 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang lưu thứ tự...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Lưu thứ tự câu ({orderedList.length} câu)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
