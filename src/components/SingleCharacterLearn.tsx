import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Trash2, 
  Volume2, 
  Sparkles, 
  RefreshCw, 
  BookOpen, 
  Layers, 
  Activity, 
  Info, 
  Eraser, 
  Grid,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Video,
  Award
} from 'lucide-react';
import HanziWriter from 'hanzi-writer';
import { analyzeSingleCharacter, CharacterAnalysisResult } from '../services/geminiService';

const SUGGESTED_CHARS = [
  { char: "好", meaning: "Tốt, đẹp", pinyin: "hǎo", sinoViet: "Hảo" },
  { char: "家", meaning: "Nhà, gia đình", pinyin: "jiā", sinoViet: "Gia" },
  { char: "学", meaning: "Học, học tập", pinyin: "xué", sinoViet: "Học" },
  { char: "国", meaning: "Nước, quốc gia", pinyin: "guó", sinoViet: "Quốc" },
  { char: "想", meaning: "Nghĩ, nhớ, muốn", pinyin: "xiǎng", sinoViet: "Tưởng" },
  { char: "美", meaning: "Đẹp, mỹ lệ", pinyin: "měi", sinoViet: "Mỹ" },
  { char: "明", meaning: "Sáng, rõ ràng", pinyin: "míng", sinoViet: "Minh" },
  { char: "安", meaning: "An toàn, yên ổn", pinyin: "ān", sinoViet: "An" },
  { char: "爱", meaning: "Yêu, tình yêu", pinyin: "ài", sinoViet: "Ái" },
  { char: "德", meaning: "Đạo đức, ơn nghĩa", pinyin: "dé", sinoViet: "Đức" },
  { char: "你", meaning: "Bạn, anh, chị", pinyin: "nǐ", sinoViet: "Nhĩ" },
  { char: "我", meaning: "Tôi, bản thân", pinyin: "wǒ", sinoViet: "Ngã" },
];

const BRUSH_COLORS = [
  { name: 'Mực tàu (Đen)', value: '#1e293b' },
  { name: 'Đỏ son', value: '#dc2626' },
  { name: 'Ngọc bích', value: '#059669' },
  { name: 'Xanh lam', value: '#2563eb' }
];

export default function SingleCharacterLearn() {
  const [charInput, setCharInput] = useState('');
  const [selectedChar, setSelectedChar] = useState('好');
  const [analysis, setAnalysis] = useState<CharacterAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab mode for stroke section: 'video' | 'quiz' | 'freehand'
  const [strokeMode, setStrokeMode] = useState<'video' | 'quiz' | 'freehand'>('video');

  // HanziWriter state & refs
  const writerContainerRef = useRef<HTMLDivElement | null>(null);
  const writerInstanceRef = useRef<any>(null);
  const [isWriterLoading, setIsWriterLoading] = useState(false);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [strokeSpeed, setStrokeSpeed] = useState<number>(1);
  const [showOutline, setShowOutline] = useState(true);
  const [highlightRadical, setHighlightRadical] = useState(true);

  // Quiz state
  const [quizStatus, setQuizStatus] = useState<'idle' | 'active' | 'success'>('idle');
  const [quizFeedback, setQuizFeedback] = useState<string>('Hãy dùng chuột hoặc tay để vẽ theo nét hướng dẫn.');
  const [mistakesCount, setMistakesCount] = useState<number>(0);

  // Freehand Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#1e293b');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [charOpacity, setCharOpacity] = useState(30);
  const [showGrid, setShowGrid] = useState(true);

  // Fetch character analysis on selected character change
  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await analyzeSingleCharacter(selectedChar);
        setAnalysis(result);
      } catch (err: any) {
        console.error("Lỗi phân tích chữ đơn:", err);
        setError("Không thể tải thông tin phân tích từ AI. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [selectedChar]);

  // Initialize or update HanziWriter when selectedChar, strokeMode, strokeSpeed, showOutline changes
  useEffect(() => {
    if (strokeMode === 'freehand') return;
    if (!writerContainerRef.current) return;

    let isMounted = true;
    setIsWriterLoading(true);
    setQuizStatus('idle');
    setMistakesCount(0);
    setIsPlayingAnimation(false);

    // Clear previous SVG contents
    writerContainerRef.current.innerHTML = '';

    try {
      const writer = HanziWriter.create(writerContainerRef.current, selectedChar, {
        width: 300,
        height: 300,
        padding: 16,
        showOutline: showOutline,
        strokeAnimationSpeed: strokeSpeed,
        delayBetweenStrokes: 220,
        strokeColor: '#1e293b',
        radicalColor: highlightRadical ? '#e11d48' : '#1e293b',
        outlineColor: '#e2e8f0',
        drawingColor: '#2563eb',
        drawingWidth: 16,
        showCharacter: strokeMode !== 'quiz',
        onLoadCharDataSuccess: () => {
          if (!isMounted) return;
          setIsWriterLoading(false);
          if (strokeMode === 'video') {
            // Automatically play once on load for a lively experience
            writer.animateCharacter({
              onComplete: () => {
                if (isMounted) setIsPlayingAnimation(false);
              }
            });
            setIsPlayingAnimation(true);
          } else if (strokeMode === 'quiz') {
            startQuizMode(writer);
          }
        },
        onLoadCharDataError: () => {
          if (!isMounted) return;
          setIsWriterLoading(false);
          console.warn(`Could not load stroke data for ${selectedChar}`);
        }
      });

      writerInstanceRef.current = writer;
    } catch (e) {
      console.error("HanziWriter initialization error:", e);
      setIsWriterLoading(false);
    }

    return () => {
      isMounted = false;
      if (writerInstanceRef.current) {
        try {
          writerInstanceRef.current.cancelQuiz();
        } catch (err) {
          // ignore
        }
      }
    };
  }, [selectedChar, strokeMode, showOutline, highlightRadical]);

  // Handle speed change
  useEffect(() => {
    if (writerInstanceRef.current) {
      writerInstanceRef.current.strokeAnimationSpeed = strokeSpeed;
    }
  }, [strokeSpeed]);

  // Video Animation Controls
  const handlePlayAnimation = () => {
    if (!writerInstanceRef.current) return;
    setIsPlayingAnimation(true);
    if (isLooping) {
      writerInstanceRef.current.loopCharacterAnimation();
    } else {
      writerInstanceRef.current.animateCharacter({
        onComplete: () => {
          setIsPlayingAnimation(false);
        }
      });
    }
  };

  const handlePauseAnimation = () => {
    if (!writerInstanceRef.current) return;
    writerInstanceRef.current.pauseAnimation();
    setIsPlayingAnimation(false);
  };

  const handleResetAnimation = () => {
    if (!writerInstanceRef.current) return;
    writerInstanceRef.current.showOutline = showOutline;
    writerInstanceRef.current.showCharacter = true;
    writerInstanceRef.current.animateCharacter({
      onComplete: () => {
        setIsPlayingAnimation(false);
      }
    });
    setIsPlayingAnimation(true);
  };

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (!writerInstanceRef.current) return;

    if (nextLoop) {
      setIsPlayingAnimation(true);
      writerInstanceRef.current.loopCharacterAnimation();
    } else {
      writerInstanceRef.current.pauseAnimation();
      setIsPlayingAnimation(false);
    }
  };

  // Quiz Controller
  const startQuizMode = (writerObj?: any) => {
    const writer = writerObj || writerInstanceRef.current;
    if (!writer) return;

    setQuizStatus('active');
    setMistakesCount(0);
    setQuizFeedback('Hãy viết nét đầu tiên theo hướng dẫn...');

    writer.quiz({
      onMistake: (strokeData: any) => {
        setMistakesCount(prev => prev + 1);
        setQuizFeedback(`Chưa chính xác! Nét thứ ${strokeData.strokeNum + 1} cần viết lại.`);
      },
      onCorrectStroke: (strokeData: any) => {
        setQuizFeedback(`Chính xác! Tiếp tục nét thứ ${strokeData.strokeNum + 2}...`);
      },
      onComplete: (summaryData: any) => {
        setQuizStatus('success');
        setQuizFeedback(`🎉 Xuất sắc! Bạn đã viết hoàn chỉnh chữ "${selectedChar}" với ${summaryData.totalMistakes} lỗi!`);
      }
    });
  };

  // Freehand Canvas Helpers
  useEffect(() => {
    if (strokeMode === 'freehand') {
      drawGridAndBackground();
    }
  }, [analysis, showGrid, charOpacity, selectedChar, strokeMode]);

  const drawGridAndBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calligraphy Grid (米字格 - Mi Zi Ge)
    if (showGrid) {
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
      ctx.setLineDash([4, 4]);

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(4, canvas.height / 2);
      ctx.lineTo(canvas.width - 4, canvas.height / 2);
      ctx.stroke();

      // Vertical
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 4);
      ctx.lineTo(canvas.width / 2, canvas.height - 4);
      ctx.stroke();

      // Diagonals
      ctx.beginPath();
      ctx.moveTo(4, 4);
      ctx.lineTo(canvas.width - 4, canvas.height - 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(canvas.width - 4, 4);
      ctx.lineTo(4, canvas.height - 4);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Soft Reference Character
    if (charOpacity > 0) {
      ctx.font = '240px "Kaiti", "STKaiti", "SimSun", "Noto Sans SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(148, 163, 184, ${charOpacity / 100})`;
      ctx.fillText(selectedChar, canvas.width / 2, canvas.height / 2 + 10);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#ffffff' : brushColor;
    ctx.lineWidth = isEraser ? brushSize * 2 : brushSize;
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    drawGridAndBackground();
  };

  const speakChinese = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) {
        utterance.voice = zhVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = charInput.trim();
    if (!trimmed) return;
    const singleChar = trimmed.charAt(0);
    setSelectedChar(singleChar);
    setCharInput('');
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-8 rounded-3xl border border-indigo-100/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
                <Sparkles size={20} className="animate-pulse" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-indigo-500">Phân tích & Video Nét Bút Thuận</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
              Học Chữ Hán Đơn & Thứ Tự Nét Viết
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-medium">
              Xem video hoạt họa từng nét chữ, tập viết tương tác, phân tích cấu tạo bộ thủ và âm Hán-Việt.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto max-w-md">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Nhập bất kỳ chữ Hán nào (vd: 你, 好, 学)..."
                value={charInput}
                onChange={(e) => setCharInput(e.target.value)}
                maxLength={5}
                className="w-full pl-10 pr-4 py-3 bg-white text-slate-800 text-sm font-semibold rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold text-sm rounded-2xl shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              Phân tích
            </button>
          </form>
        </div>

        {/* Suggested Characters Selection */}
        <div className="mt-6 pt-4 border-t border-indigo-100/60">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Chữ gợi ý phổ biến:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_CHARS.map((sc) => (
              <button
                key={sc.char}
                onClick={() => setSelectedChar(sc.char)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedChar === sc.char
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg font-black">{sc.char}</span>
                <span className="text-[10px] opacity-80">({sc.sinoViet})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-indigo-600">
              {selectedChar}
            </div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-extrabold text-slate-800 text-lg">Đang phân tích cấu trúc chữ "{selectedChar}"</h3>
            <p className="text-xs text-slate-400 font-bold">Đang tải nét bút thuận và phân tích bộ thủ...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 text-center space-y-3 max-w-xl mx-auto">
          <p className="text-red-700 font-bold text-base">{error}</p>
          <button
            onClick={() => setSelectedChar(selectedChar)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : analysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* LEFT PANEL: Stroke Writing Video & Practice (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-4">
              
              {/* Header with Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Video className="text-indigo-600" size={18} />
                  <h2 className="font-black text-slate-800 text-base md:text-lg">Thứ Tự Nét Bút Thuận</h2>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setStrokeMode('video')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      strokeMode === 'video' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Play size={12} /> Video nét
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrokeMode('quiz')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      strokeMode === 'quiz' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Award size={12} /> Tập viết
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrokeMode('freehand')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      strokeMode === 'freehand' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <PenTool size={12} /> Vẽ tự do
                  </button>
                </div>
              </div>

              {/* STROKE ANIMATION / QUIZ DISPLAY CONTAINER */}
              {strokeMode !== 'freehand' ? (
                <div className="space-y-4">
                  {/* HanziWriter Stage with Mi Zi Ge Grid Background */}
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-[300px] aspect-square bg-white border-2 border-rose-100/80 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                      
                      {/* Calligraphy Guide Grid Background (米字格) */}
                      <div className="absolute inset-0 pointer-events-none opacity-40">
                        <svg width="100%" height="100%" viewBox="0 0 300 300">
                          <line x1="0" y1="150" x2="300" y2="150" stroke="#f43f5e" strokeWidth="1" strokeDasharray="5,5" />
                          <line x1="150" y1="0" x2="150" y2="300" stroke="#f43f5e" strokeWidth="1" strokeDasharray="5,5" />
                          <line x1="0" y1="0" x2="300" y2="300" stroke="#f43f5e" strokeWidth="1" strokeDasharray="5,5" />
                          <line x1="300" y1="0" x2="0" y2="300" stroke="#f43f5e" strokeWidth="1" strokeDasharray="5,5" />
                          <rect x="2" y="2" width="296" height="296" fill="none" stroke="#f43f5e" strokeWidth="1" />
                        </svg>
                      </div>

                      {/* HanziWriter Target DOM */}
                      <div 
                        ref={writerContainerRef} 
                        className="w-[300px] h-[300px] flex items-center justify-center relative z-10 select-none cursor-pointer"
                      />

                      {isWriterLoading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-20">
                          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                            <RefreshCw className="animate-spin" size={16} /> Đang tải nét...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mode 1: Video Animated Player Controls */}
                  {strokeMode === 'video' && (
                    <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                      
                      {/* Playback action bar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={isPlayingAnimation ? handlePauseAnimation : handlePlayAnimation}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {isPlayingAnimation ? <Pause size={14} /> : <Play size={14} />}
                            {isPlayingAnimation ? 'Tạm dừng' : 'Phát nét'}
                          </button>

                          <button
                            type="button"
                            onClick={handleResetAnimation}
                            className="p-2 text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
                            title="Phát lại từ đầu"
                          >
                            <RotateCcw size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={toggleLoop}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isLooping 
                                ? 'bg-rose-50 border-rose-200 text-rose-600' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Lặp lại liên tục như video"
                          >
                            <RefreshCw size={13} className={isLooping ? "animate-spin" : ""} />
                            Lặp {isLooping ? 'Bật' : 'Tắt'}
                          </button>
                        </div>

                        {/* Speed Selector */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                          {([0.5, 1, 1.5, 2] as const).map(speed => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => setStrokeSpeed(speed)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                strokeSpeed === speed ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display Toggles */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3 text-xs">
                        <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={showOutline}
                            onChange={(e) => setShowOutline(e.target.checked)}
                            className="accent-indigo-600 rounded"
                          />
                          Hiện khung nét mờ
                        </label>

                        <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={highlightRadical}
                            onChange={(e) => setHighlightRadical(e.target.checked)}
                            className="accent-rose-600 rounded"
                          />
                          Tô màu bộ thủ (<span className="text-rose-600 font-bold">đỏ</span>)
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Interactive Quiz Practice */}
                  {strokeMode === 'quiz' && (
                    <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-center">
                      <div className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        quizStatus === 'success' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : quizStatus === 'active' 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        {quizStatus === 'success' ? (
                          <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                        ) : (
                          <Sparkles className="text-indigo-600 shrink-0" size={18} />
                        )}
                        <p className="text-xs font-bold">{quizFeedback}</p>
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => startQuizMode()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={14} /> Viết lại từ đầu
                        </button>
                        
                        <span className="text-xs text-slate-500 font-medium">
                          Số lần viết sai: <strong className={mistakesCount > 0 ? "text-rose-600" : "text-emerald-600"}>{mistakesCount}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* Mode 3: Freehand Canvas */
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-[300px] aspect-square bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={400}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-full cursor-crosshair touch-none"
                      />
                    </div>
                  </div>

                  {/* Freehand Controls */}
                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEraser(false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            !isEraser
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <PenTool size={13} /> Bút lông
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEraser(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isEraser
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Eraser size={13} /> Tẩy
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowGrid(!showGrid)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            showGrid
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Bật/Tắt Ô Chữ Thập"
                        >
                          <Grid size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-all cursor-pointer"
                          title="Xóa trắng bảng vẽ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {!isEraser && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu mực:</span>
                        <div className="flex gap-2">
                          {BRUSH_COLORS.map((col) => (
                            <button
                              key={col.value}
                              type="button"
                              onClick={() => setBrushColor(col.value)}
                              style={{ backgroundColor: col.value }}
                              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                                brushColor === col.value ? 'border-white ring-2 ring-indigo-500 scale-110 shadow' : 'border-transparent'
                              }`}
                              title={col.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Stroke sequence instructions list */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Activity className="text-emerald-500" size={18} />
                <h3 className="font-black text-slate-800 text-sm md:text-base">Thứ Tự Nét Chi Tiết ({analysis.totalStrokes} nét)</h3>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {analysis.strokeSequenceInstructions.map((instruction, idx) => (
                  <div key={idx} className="flex gap-3 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black flex items-center justify-center border border-indigo-100">
                      {idx + 1}
                    </span>
                    <p className="text-xs md:text-sm font-semibold text-slate-700 leading-relaxed">
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Character Info & Radical Breakdown (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Details Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-6">
                {/* Oversized Character Graphic */}
                <div className="relative group select-none flex-shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-5xl md:text-7xl font-black text-slate-800 shadow-sm">
                    {analysis.character}
                  </div>
                  <button
                    onClick={() => speakChinese(analysis.character)}
                    className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-md transition-all cursor-pointer"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>

                {/* Character Core Properties */}
                <div className="space-y-2 md:space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md">
                      Pinyin: {analysis.pinyin}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-md">
                      Hán-Việt: {analysis.sinoVietnamese}
                    </span>
                  </div>
                  
                  <h2 className="text-lg md:text-2xl font-black text-slate-800 leading-tight">
                    Nghĩa: {analysis.vietnameseMeaning}
                  </h2>

                  <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-bold">
                    <span>Tổng số nét: <span className="text-slate-700 font-black">{analysis.totalStrokes}</span></span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>Cấu trúc: <span className="text-indigo-600 font-black">Hán tự đơn</span></span>
                  </div>
                </div>
              </div>

              {/* Character Composition Explanation */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <Info size={14} className="text-indigo-500" />
                  <span>Cấu tạo & Triết lý chữ</span>
                </div>
                <p className="text-xs md:text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {analysis.composition}
                </p>
              </div>
            </div>

            {/* Radicals analysis ("Bộ thủ") */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="text-indigo-500" size={18} />
                <h3 className="font-black text-slate-800 text-sm md:text-base">Các Bộ Thủ Cấu Thành ({analysis.radicals.length})</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.radicals.map((rad, idx) => (
                  <div key={idx} className="bg-white hover:bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 shadow-sm transition-all space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-indigo-50/70 border border-indigo-100/50 flex items-center justify-center text-xl font-black text-indigo-900 select-none">
                          {rad.radical}
                        </span>
                        <div>
                          <h4 className="font-black text-slate-800 text-xs md:text-sm">
                            Bộ {rad.sinoVietnamese} ({rad.meaning})
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold block">
                            Pinyin: {rad.pinyin}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed border-t border-slate-100 pt-2">
                      <span className="font-black text-slate-600">Ý nghĩa trong chữ:</span> {rad.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Examples list */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <BookOpen className="text-purple-500" size={18} />
                <h3 className="font-black text-slate-800 text-sm md:text-base">Từ Ghép Căn Bản</h3>
              </div>

              <div className="space-y-3">
                {analysis.examples.map((ex, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/50 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-2xl font-black text-slate-800 select-none shrink-0 tracking-wide">
                        {ex.word}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs md:text-sm font-black text-indigo-600 truncate">
                          {ex.pinyin}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                          {ex.meaning}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => speakChinese(ex.word)}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Nghe từ"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          Vui lòng nhập chữ hoặc chọn chữ gợi ý để bắt đầu phân tích.
        </div>
      )}
    </div>
  );
}
