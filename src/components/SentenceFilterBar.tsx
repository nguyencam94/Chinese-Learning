import React from 'react';
import { Library, Layers, ArrowUpDown, ListOrdered, FileDown } from 'lucide-react';
import { Category, Section } from '../types';

interface SentenceFilterBarProps {
  categories: Category[];
  sections: Section[];
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  selectedSection: string;
  setSelectedSection: (secId: string) => void;
  totalSentenceCount: number;
  onOpenReorderModal?: (section: Section) => void;
  onExportSectionDocx?: (section: Section) => void;
}

export default function SentenceFilterBar({
  categories,
  sections,
  selectedCategory,
  setSelectedCategory,
  selectedSection,
  setSelectedSection,
  totalSentenceCount,
  onOpenReorderModal,
  onExportSectionDocx
}: SentenceFilterBarProps) {
  const currentSections = sections.filter(
    (s) => selectedCategory === 'all' || s.categoryId === selectedCategory
  );

  const activeSectionObj = sections.find((s) => s.id === selectedSection);

  return (
    <div className="space-y-3">
      {/* Desktop Filter Panel */}
      <div className="hidden md:flex flex-col gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Library className="text-primary" size={26} /> Thư viện & Lọc bài học
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Lọc theo chủ đề hoặc từng đoạn văn/phân đoạn để ôn tập trọng tâm ({totalSentenceCount} câu).
            </p>
          </div>

          {/* Categories Pill Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 max-w-full">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSection('all');
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white shadow-lg shadow-emerald-100'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              Tất cả chủ đề
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(c.id);
                  setSelectedSection('all');
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-primary text-white shadow-lg shadow-emerald-100'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sections / Đoạn văn Filter row (When category is selected or whenever sections exist) */}
        {currentSections.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                <Layers size={14} className="text-indigo-500" /> Đoạn văn:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSection('all')}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSection === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                Tất cả đoạn
              </button>
              {currentSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSection(sec.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSection === sec.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-white text-indigo-600 border border-indigo-200/80 hover:bg-indigo-50'
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>

            {/* Action buttons when a section is active */}
            {activeSectionObj && (
              <div className="flex items-center gap-1.5 shrink-0">
                {onExportSectionDocx && (
                  <button
                    type="button"
                    onClick={() => onExportSectionDocx(activeSectionObj)}
                    className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                    title="Tải trọn bộ đoạn văn này dưới dạng file Word (.docx) kèm ảnh minh họa và bài đọc toàn văn"
                  >
                    <FileDown size={13} className="text-blue-600" />
                    <span>Xuất Word Cả Đoạn</span>
                  </button>
                )}

                {onOpenReorderModal && (
                  <button
                    type="button"
                    onClick={() => onOpenReorderModal(activeSectionObj)}
                    className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black transition-all cursor-pointer shadow-xs hover:scale-105"
                    title="Sắp xếp thứ tự các câu trong đoạn này (đặt câu chủ đề, đổi vị trí...)"
                  >
                    <ArrowUpDown size={13} className="text-amber-600" />
                    <span>Sắp xếp thứ tự</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Filter Bar */}
      <div className="block md:hidden bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Library className="text-primary animate-pulse" size={15} /> Thư viện câu & đoạn văn
          </span>
          <div className="flex items-center gap-1.5">
            {activeSectionObj && onExportSectionDocx && (
              <button
                type="button"
                onClick={() => onExportSectionDocx(activeSectionObj)}
                className="text-[9px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md flex items-center gap-1"
                title="Tải Word cả đoạn văn"
              >
                <FileDown size={10} /> Word
              </button>
            )}
            {activeSectionObj && onOpenReorderModal && (
              <button
                type="button"
                onClick={() => onOpenReorderModal(activeSectionObj)}
                className="text-[9px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1"
                title="Sắp xếp thứ tự câu"
              >
                <ArrowUpDown size={10} /> Đổi thứ tự
              </button>
            )}
            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {categories.length} chủ đề
            </span>
          </div>
        </div>

        {/* Mobile Horizontal scroll for Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x -mx-3.5 px-3.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSection('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer snap-start ${
              selectedCategory === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 border border-slate-100'
            }`}
          >
            Tất cả chủ đề
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCategory(c.id);
                setSelectedSection('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer snap-start ${
                selectedCategory === c.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 border border-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Mobile Horizontal scroll for Sections / Đoạn văn */}
        {currentSections.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-3.5 px-3.5 pt-2 border-t border-slate-100/60">
            <span className="text-[10px] font-black text-indigo-600 shrink-0 flex items-center gap-0.5">
              <Layers size={11} /> Đoạn:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSection('all')}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                selectedSection === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              Tất cả
            </button>
            {currentSections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSection(sec.id)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                  selectedSection === sec.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-indigo-600 border border-indigo-100'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
