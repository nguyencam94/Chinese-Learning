import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderPlus, 
  Folder, 
  X, 
  Check, 
  Sparkles, 
  Layers, 
  Plus, 
  Loader2, 
  BookOpen, 
  FileText,
  Star,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowUpDown,
  ListOrdered
} from 'lucide-react';
import { Category, Section, SavedSentence } from '../types';
import { sortSectionSentences } from '../utils/sentenceSort';

interface AssignSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentence: SavedSentence | null;
  categories: Category[];
  sections: Section[];
  savedSentences: SavedSentence[];
  onAssignSection: (sentenceId: string, categoryId: string, sectionId: string, targetPosition?: 'top' | 'bottom' | number) => Promise<void>;
  onCreateSection: (name: string, categoryId: string) => Promise<string | null>;
  onOpenReorderSection?: (section: Section) => void;
}

export const AssignSectionModal: React.FC<AssignSectionModalProps> = ({
  isOpen,
  onClose,
  sentence,
  categories,
  sections,
  savedSentences,
  onAssignSection,
  onCreateSection,
  onOpenReorderSection
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [targetPosition, setTargetPosition] = useState<'top' | 'bottom' | number>('bottom');
  const [isCreatingNewSection, setIsCreatingNewSection] = useState<boolean>(false);
  const [newSectionName, setNewSectionName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCreatingSectionLoading, setIsCreatingSectionLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (sentence && isOpen) {
      const initialCatId = sentence.categoryId || (categories.length > 0 ? categories[0].id : '');
      setSelectedCategoryId(initialCatId);
      setSelectedSectionId(sentence.sectionId || '');
      // If already has orderIndex 1, default to 'top' or keep order
      setTargetPosition(sentence.orderIndex === 1 ? 'top' : 'bottom');
      setIsCreatingNewSection(false);
      setNewSectionName('');
      setSearchQuery('');
    }
  }, [sentence, isOpen, categories]);

  if (!isOpen || !sentence) return null;

  // Filter sections belonging to the selected category
  const availableSections = sections.filter(s => s.categoryId === selectedCategoryId);
  const filteredSections = searchQuery.trim()
    ? availableSections.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableSections;

  const currentCategory = categories.find(c => c.id === sentence.categoryId);
  const currentSection = sections.find(s => s.id === sentence.sectionId);
  const selectedSectionObj = sections.find(s => s.id === selectedSectionId);

  // Sentences in selected section (excluding the current sentence itself to avoid duplicate counts)
  const existingSectionSentences = selectedSectionId
    ? sortSectionSentences(savedSentences.filter(s => s.sectionId === selectedSectionId && s.id !== sentence.id))
    : [];

  const handleCreateAndSelectSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim() || !selectedCategoryId) return;

    setIsCreatingSectionLoading(true);
    try {
      const createdId = await onCreateSection(newSectionName.trim(), selectedCategoryId);
      if (createdId) {
        setSelectedSectionId(createdId);
        setTargetPosition('top'); // Default first sentence in new section as topic sentence
      }
      setNewSectionName('');
      setIsCreatingNewSection(false);
    } catch (err) {
      console.error("Error creating section in modal:", err);
    } finally {
      setIsCreatingSectionLoading(false);
    }
  };

  const handleConfirmAssign = async () => {
    if (!sentence || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAssignSection(sentence.id, selectedCategoryId, selectedSectionId, targetPosition);
      onClose();
    } catch (err) {
      console.error("Error assigning section:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
          className="relative bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100">
                <FolderPlus size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
                  Cấu trúc & Thứ tự đoạn văn
                </span>
                <h2 className="text-lg md:text-xl font-bold text-slate-800">
                  Gán câu vào Đoạn văn
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all border border-slate-200/60 cursor-pointer shadow-xs"
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* Target Sentence Preview Card */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/60 via-slate-50/40 to-white rounded-2xl border border-indigo-100/70 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <FileText size={12} /> Câu thoại đang chọn
                </span>
                <span className="bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/50">
                  Hiện tại: <strong className="text-slate-700">{currentSection ? currentSection.name : 'Chưa có đoạn'}</strong>
                </span>
              </div>
              <p className="text-base md:text-lg font-bold text-slate-800 tracking-[0.05em] leading-snug">
                {sentence.chinese}
              </p>
              <p className="text-xs text-slate-500 italic font-medium">
                {sentence.pinyin}
              </p>
              <p className="text-xs text-slate-600 font-semibold pt-1 border-t border-indigo-100/40">
                Dịch nghĩa: {sentence.meaning}
              </p>
            </div>

            {/* Step 1: Chọn Chủ đề (Category) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-emerald-500" />
                  1. Chọn Chủ đề học tập:
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {categories.length} chủ đề
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const countInCat = savedSentences.filter(s => s.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        const validSection = sections.find(s => s.categoryId === cat.id && s.id === selectedSectionId);
                        if (!validSection) {
                          setSelectedSectionId('');
                        }
                      }}
                      className={`p-2.5 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200/70 hover:bg-slate-100/80'
                      }`}
                    >
                      <span className="truncate block font-black">{cat.name}</span>
                      <span className={`text-[9px] mt-0.5 block ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {countInCat} câu
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Chọn hoặc Tạo Đoạn văn (Section) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder size={13} className="text-indigo-600" />
                  2. Chọn Đoạn văn:
                </label>
                
                {!isCreatingNewSection && selectedCategoryId && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewSection(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    <Plus size={13} /> Tạo đoạn văn mới
                  </button>
                )}
              </div>

              {/* Inline Form to create a new section */}
              <AnimatePresence>
                {isCreatingNewSection && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCreateAndSelectSection}
                    className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                        <Sparkles size={11} /> Tạo đoạn văn mới (VD: Mẹ tôi nấu ăn, Đi siêu thị...)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNewSection(false);
                          setNewSectionName('');
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="Nhập tên đoạn văn (ví dụ: Mẹ tôi nấu ăn)..."
                        className="flex-1 text-xs font-bold text-slate-800 bg-white border border-indigo-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isCreatingSectionLoading || !newSectionName.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        {isCreatingSectionLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                        <span>Tạo & Chọn</span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Search filter for sections if > 4 sections */}
              {availableSections.length > 4 && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm đoạn văn theo tên..."
                  className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:bg-white focus:border-indigo-500 placeholder-slate-400"
                />
              )}

              {/* Sections list */}
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
                {/* Option 0: No section (Mặc định / Chưa gán) */}
                <div
                  onClick={() => setSelectedSectionId('')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedSectionId === ''
                      ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/70 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                      selectedSectionId === '' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <BookOpen size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Chưa gán đoạn cụ thể (Chung)</p>
                      <p className="text-[10px] text-slate-400 font-medium">Câu thuộc chủ đề chung</p>
                    </div>
                  </div>
                  {selectedSectionId === '' && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                      <Check size={12} />
                    </span>
                  )}
                </div>

                {/* List of sections for selected category */}
                {filteredSections.map((sec) => {
                  const isSelected = selectedSectionId === sec.id;
                  const sentencesCount = savedSentences.filter(s => s.sectionId === sec.id).length;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 font-bold shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Folder size={12} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold leading-tight truncate">{sec.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Đang có <strong className="text-indigo-600 font-bold">{sentencesCount} câu</strong> trong đoạn
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Chọn Thứ Tự / Vị Trí Câu trong Đoạn Văn (Khi đã chọn Section) */}
            {selectedSectionId !== '' && (
              <div className="space-y-3 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ListOrdered size={14} className="text-amber-500" />
                    3. Thứ tự xuất hiện trong đoạn:
                  </label>
                  
                  {selectedSectionObj && existingSectionSentences.length > 0 && onOpenReorderSection && (
                    <button
                      type="button"
                      onClick={() => onOpenReorderSection(selectedSectionObj)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                      title="Mở bảng sắp xếp toàn bộ câu trong đoạn"
                    >
                      <ArrowUpDown size={12} /> Sắp xếp toàn đoạn
                    </button>
                  )}
                </div>

                {/* Placement Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option: Top / Topic Sentence */}
                  <div
                    onClick={() => setTargetPosition('top')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      targetPosition === 'top'
                        ? 'bg-amber-50/80 border-amber-400 text-amber-950 shadow-sm'
                        : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      targetPosition === 'top' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-400 border border-slate-200'
                    }`}>
                      <Star size={16} className={targetPosition === 'top' ? 'fill-white' : ''} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black flex items-center gap-1">
                        <span>Lên đầu (Câu chủ đề)</span>
                        <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-bold">#1</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                        Câu mở đầu / chủ đề của đoạn, các câu khác sẽ lùi lại sau.
                      </p>
                    </div>
                  </div>

                  {/* Option: Bottom / Next in Flow */}
                  <div
                    onClick={() => setTargetPosition('bottom')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      targetPosition === 'bottom'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 shadow-sm'
                        : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      targetPosition === 'bottom' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-400 border border-slate-200'
                    }`}>
                      <ArrowDownToLine size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black flex items-center gap-1">
                        <span>Nối tiếp ở cuối đoạn</span>
                        <span className="text-[9px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.2 rounded font-bold">
                          #{existingSectionSentences.length + 1}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                        Xếp sau câu cuối cùng hiện tại trong đoạn văn này.
                      </p>
                    </div>
                  </div>
                </div>

                {/* List preview of existing sentences in section */}
                {existingSectionSentences.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Các câu đã có trong đoạn này ({existingSectionSentences.length} câu):
                    </span>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                      {existingSectionSentences.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200/60 text-xs"
                        >
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate flex-1">{s.chinese}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{s.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-none">
              {selectedSectionId ? (
                <span>
                  Gán vào: <strong className="text-indigo-700 font-black">{sections.find(s => s.id === selectedSectionId)?.name}</strong>
                  {targetPosition === 'top' && <span className="text-amber-600 font-bold ml-1">(⭐ Vị trí #1)</span>}
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Gán vào chủ đề chung</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200/80 transition-all cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Xác nhận gán đoạn</span>
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
