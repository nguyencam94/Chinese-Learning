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
  Award,
  Download,
  FileText,
  FileDown,
  Loader2,
  X,
  Share2,
  Sliders,
  Check
} from 'lucide-react';
import HanziWriter from 'hanzi-writer';
import { analyzeSingleCharacter, CharacterAnalysisResult } from '../services/geminiService';
import { 
  recordStrokeVideo, 
  generateHandwritingWorksheet, 
  VideoExportResult 
} from '../utils/strokeVideoExporter';
import { exportSingleCharacterToDocx } from '../utils/docxExporter';

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

  // Video & Worksheet Export States
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [videoExportProgress, setVideoExportProgress] = useState(0);
  const [videoExportStatus, setVideoExportStatus] = useState('');
  const [videoExportSpeed, setVideoExportSpeed] = useState(0.9);
  const [videoExportStrokeStyle, setVideoExportStrokeStyle] = useState<'slender' | 'medium' | 'kaiti'>('slender');
  const [videoExportHighlightRadical, setVideoExportHighlightRadical] = useState(true);
  const [videoExportShowPenTip, setVideoExportShowPenTip] = useState(true);
  const [videoExportShowFaintOutline, setVideoExportShowFaintOutline] = useState(true);
  const [exportedVideo, setExportedVideo] = useState<VideoExportResult | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isExportingWorksheet, setIsExportingWorksheet] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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

  // Video Export Handler
  const handleExportVideo = async () => {
    if (!analysis) return;
    setIsExportingVideo(true);
    setVideoExportProgress(5);
    setVideoExportStatus('Chuẩn bị phòng thu video...');
    setExportError(null);

    try {
      const result = await recordStrokeVideo(selectedChar, analysis, {
        speed: videoExportSpeed,
        strokeStyle: videoExportStrokeStyle,
        highlightRadical: videoExportHighlightRadical,
        showPenTip: videoExportShowPenTip,
        showFaintOutline: videoExportShowFaintOutline,
        resolution: 720,
        onProgress: (prog, status) => {
          setVideoExportProgress(prog);
          setVideoExportStatus(status);
        }
      });

      setExportedVideo(result);
      setShowVideoModal(true);

      // Auto-trigger browser download
      const a = document.createElement('a');
      a.href = result.url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (err: any) {
      console.error("Lỗi xuất video:", err);
      setExportError(err?.message || "Không thể xuất video nét chữ. Vui lòng thử lại.");
    } finally {
      setIsExportingVideo(false);
    }
  };

  // Printable Worksheet Handler
  const handleDownloadWorksheet = async () => {
    if (!analysis) return;
    setIsExportingWorksheet(true);
    setExportError(null);

    try {
      const { url, filename } = await generateHandwritingWorksheet(selectedChar, analysis);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Lỗi xuất phiếu tập viết:", err);
      setExportError("Không thể tạo phiếu tập viết lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsExportingWorksheet(false);
    }
  };

  // Word (.docx) Document Handler
  const handleDownloadDocx = async () => {
    if (!analysis) return;
    setIsExportingDocx(true);
    setExportError(null);

    try {
      const { blob, filename } = await exportSingleCharacterToDocx(analysis);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Lỗi xuất file Word:", err);
      setExportError("Không thể xuất file Word lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsExportingDocx(false);
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

                      {/* DOWNLOAD VIDEO & WORKSHEET ACTIONS */}
                      <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Tải về học offline:</span>
                          {exportError && (
                            <span className="text-[10px] text-rose-500 font-bold">{exportError}</span>
                          )}
                        </div>

                        {/* Quick Stroke Style Selector for Video */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                            <span>Độ dày nét video:</span>
                            <span className="text-indigo-600 font-black">
                              {videoExportStrokeStyle === 'slender' ? '🖋️ Nét thanh mảnh (0.5mm)' : videoExportStrokeStyle === 'medium' ? '🖊️ Bút máy (0.7mm)' : '🖌️ Khải thư'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'slender', label: 'Thanh mảnh' },
                              { id: 'medium', label: 'Bút máy' },
                              { id: 'kaiti', label: 'Khải thư' }
                            ].map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setVideoExportStrokeStyle(s.id as any)}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  videoExportStrokeStyle === s.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={handleExportVideo}
                            disabled={isExportingVideo || !analysis}
                            className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Quay và tải video hoạt họa từng nét chữ về điện thoại/máy tính"
                          >
                            {isExportingVideo ? (
                              <>
                                <Loader2 className="animate-spin" size={14} />
                                <span className="truncate">{videoExportProgress}% {videoExportStatus || 'Đang xuất...'}</span>
                              </>
                            ) : (
                              <>
                                <Download size={14} />
                                <span>Tải Video Nét</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadWorksheet}
                            disabled={isExportingWorksheet || !analysis}
                            className="px-3 py-2.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Tải phiếu tập viết khổ A4 có ô kẻ Mễ và từng nét từng bước để in ra giấy"
                          >
                            {isExportingWorksheet ? (
                              <>
                                <Loader2 className="animate-spin text-indigo-600" size={14} />
                                <span>Đang tạo phiếu...</span>
                              </>
                            ) : (
                              <>
                                <FileText size={14} className="text-rose-500" />
                                <span>Tải Phiếu A4</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadDocx}
                            disabled={isExportingDocx || !analysis}
                            className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Tải tài liệu Word (.docx) chi tiết về chữ Hán, bộ thủ, từ ghép và ô kẻ tập viết"
                          >
                            {isExportingDocx ? (
                              <>
                                <Loader2 className="animate-spin text-blue-600" size={14} />
                                <span>Đang xuất...</span>
                              </>
                            ) : (
                              <>
                                <FileDown size={14} className="text-blue-600" />
                                <span>Tải File Word</span>
                              </>
                            )}
                          </button>
                        </div>
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
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start gap-5">
                  {/* Oversized Character Graphic */}
                  <div className="relative group select-none flex-shrink-0">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-5xl md:text-6xl font-black text-slate-800 shadow-sm">
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
                  <div className="space-y-2 flex-1 min-w-0">
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

                {/* Quick Download Buttons */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportVideo}
                    disabled={isExportingVideo}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingVideo ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                    <span>Tải Video Viết</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadWorksheet}
                    disabled={isExportingWorksheet}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingWorksheet ? <Loader2 className="animate-spin text-rose-500" size={14} /> : <FileText size={14} className="text-rose-500" />}
                    <span>Phiếu Tập Tô</span>
                  </button>
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
      {/* FLOATING RECORDING PROGRESS BANNER */}
      <AnimatePresence>
        {isExportingVideo && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-md w-[90%]"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Loader2 className="animate-spin" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs font-bold text-slate-200">Đang quay video nét chữ "{selectedChar}"...</p>
                <span className="text-xs font-black text-indigo-400">{videoExportProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 transition-all duration-300 rounded-full"
                  style={{ width: `${videoExportProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-1">{videoExportStatus}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIDEO PREVIEW & DOWNLOAD LIGHTBOX MODAL */}
      <AnimatePresence>
        {showVideoModal && exportedVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {exportedVideo.character}
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-black text-slate-800">
                      Video Thứ Tự Nét Chữ "{exportedVideo.character}"
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Đã tạo thành công • Có thể tải về hoặc lưu vào máy
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowVideoModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body with Video Player */}
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="bg-stone-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center max-h-[360px]">
                  <video
                    src={exportedVideo.url}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full max-h-[360px] object-contain rounded-2xl"
                  />
                </div>

                {/* Primary Download Buttons */}
                <div className="space-y-2">
                  <a
                    href={exportedVideo.url}
                    download={exportedVideo.filename}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download size={18} />
                    <span>Lưu / Tải Lại Video ({exportedVideo.filename.endsWith('.mp4') ? 'MP4' : 'WebM'})</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDownloadWorksheet}
                    disabled={isExportingWorksheet}
                    className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingWorksheet ? <Loader2 className="animate-spin" size={15} /> : <FileText size={15} />}
                    <span>Tải Thêm Phiếu Tập Tô A4 (In ra giấy)</span>
                  </button>
                </div>

                {/* Re-export Settings */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5">
                  <div>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                      <Sliders size={13} className="text-indigo-600" /> Kiểu nét chữ khi quay video:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'slender', label: '🖋️ Thanh mảnh', desc: 'Bút bi / Gel 0.5mm' },
                        { id: 'medium', label: '🖊️ Bút máy', desc: 'Vừa vặn 0.7mm' },
                        { id: 'kaiti', label: '🖌️ Khải thư', desc: 'Chuẩn thư pháp' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setVideoExportStrokeStyle(item.id as any)}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            videoExportStrokeStyle === item.id
                              ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-600/20 text-indigo-900 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-700 mb-1.5 block">Tốc độ viết:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { speed: 0.65, label: 'Chậm (0.7x)' },
                        { speed: 0.9, label: 'Chuẩn (1.0x)' },
                        { speed: 1.3, label: 'Nhanh (1.3x)' }
                      ].map((opt) => (
                        <button
                          key={opt.speed}
                          type="button"
                          onClick={() => setVideoExportSpeed(opt.speed)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            videoExportSpeed === opt.speed
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={videoExportHighlightRadical}
                          onChange={(e) => setVideoExportHighlightRadical(e.target.checked)}
                          className="accent-rose-600 rounded"
                        />
                        Tô màu bộ thủ đỏ
                      </label>

                      <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={videoExportShowPenTip}
                          onChange={(e) => setVideoExportShowPenTip(e.target.checked)}
                          className="accent-indigo-600 rounded"
                        />
                        Hiện đầu bút di chuyển
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={videoExportShowFaintOutline}
                          onChange={(e) => setVideoExportShowFaintOutline(e.target.checked)}
                          className="accent-indigo-600 rounded"
                        />
                        Hiện khung nét mờ
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setShowVideoModal(false);
                          handleExportVideo();
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                      >
                        Quay lại video mới
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
