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
  Check,
  Bookmark,
  BookmarkCheck,
  Star,
  Clock,
  FolderHeart,
  WifiOff,
  CloudOff,
  Cloud,
  CloudCheck,
  CloudUpload
} from 'lucide-react';
import HanziWriter from 'hanzi-writer';
import { analyzeSingleCharacter, CharacterAnalysisResult } from '../services/geminiService';
import { DEFAULT_OFFLINE_CHARACTERS } from '../data/defaultCharacters';
import { cachedCharDataLoader } from '../utils/hanziLoader';
import { 
  recordStrokeVideo, 
  generateHandwritingWorksheet, 
  VideoExportResult 
} from '../utils/strokeVideoExporter';
import { exportSingleCharacterToDocx } from '../utils/docxExporter';
import { 
  db, 
  auth, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  handleFirestoreError, 
  OperationType,
  User 
} from '../lib/firebase';
import { SavedCharacter } from '../types';

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

const LOCAL_STORAGE_SAVED_CHARS = 'tiengtrung_saved_characters_v1';
const LOCAL_STORAGE_AUTOSAVE = 'tiengtrung_autosave_characters_enabled';

interface SingleCharacterLearnProps {
  user?: User | null;
}

export default function SingleCharacterLearn({ user }: SingleCharacterLearnProps) {
  const [charInput, setCharInput] = useState('');
  const [selectedChar, setSelectedChar] = useState('好');
  const [analysis, setAnalysis] = useState<CharacterAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved Characters Persistence State
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_CHARS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(() => {
    return localStorage.getItem(LOCAL_STORAGE_AUTOSAVE) !== 'false';
  });

  const [activeTab, setActiveTab] = useState<'suggested' | 'saved'>('suggested');
  const [savedCharsFilter, setSavedCharsFilter] = useState('');
  const [isSavingChar, setIsSavingChar] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

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

  // Sync with Firestore when user logs in
  useEffect(() => {
    const currentUid = user?.uid || auth.currentUser?.uid;
    if (!currentUid) return;

    try {
      const q = query(
        collection(db, 'saved_characters'),
        where('userId', '==', currentUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const remoteChars: SavedCharacter[] = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<SavedCharacter, 'id'>)
        }));

        remoteChars.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt).getTime() || 0);
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt).getTime() || 0);
          return timeB - timeA;
        });

        setSavedCharacters(prev => {
          const map = new Map<string, SavedCharacter>();
          remoteChars.forEach(rc => map.set(rc.character, rc));
          prev.forEach(lc => {
            if (!map.has(lc.character)) {
              map.set(lc.character, lc);
            }
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(LOCAL_STORAGE_SAVED_CHARS, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }, (error) => {
        console.error("Firestore onSnapshot error for saved_characters:", error);
        handleFirestoreError(error, OperationType.GET, 'saved_characters');
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Lỗi khởi tạo listener Firestore:", err);
    }
  }, [user]);

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Sync any offline/local characters up to Firebase Cloud
  const handleSyncToCloud = async () => {
    const currentUid = user?.uid || auth.currentUser?.uid;
    if (!currentUid) {
      alert("Vui lòng đăng nhập tài khoản Google của bạn ở góc trên cùng để đồng bộ chữ lên Firebase Cloud!");
      return;
    }

    const unsynced = savedCharacters.filter(c => !c.userId || c.id?.startsWith('local_'));
    if (unsynced.length === 0) {
      setSaveSuccessMsg("☁️ Tất cả chữ trong Thư viện đã được đồng bộ vĩnh viễn trên Firebase Cloud!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }

    setIsSyncingCloud(true);
    try {
      let count = 0;
      for (const item of unsynced) {
        const docRef = await addDoc(collection(db, 'saved_characters'), {
          character: item.character,
          pinyin: item.pinyin,
          sinoVietnamese: item.sinoVietnamese,
          vietnameseMeaning: item.vietnameseMeaning,
          totalStrokes: item.totalStrokes,
          strokeSequenceInstructions: item.strokeSequenceInstructions || [],
          radicals: item.radicals || [],
          composition: item.composition,
          examples: item.examples || [],
          userId: currentUid,
          createdAt: serverTimestamp()
        });
        item.id = docRef.id;
        item.userId = currentUid;
        count++;
      }
      const updated = [...savedCharacters];
      setSavedCharacters(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_SAVED_CHARS, JSON.stringify(updated));
      } catch (e) {}

      setSaveSuccessMsg(`☁️ Đã đồng bộ thành công ${count} chữ từ máy lên Firebase Cloud an toàn!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      console.error("Lỗi đồng bộ Firestore:", err);
      setSaveSuccessMsg("Không thể đồng bộ lên Firebase lúc này. Vui lòng thử lại sau.");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Save Character Data (to Firestore & LocalStorage)
  const handleSaveCharacter = async (dataToSave?: CharacterAnalysisResult, silent = false) => {
    const target = dataToSave || analysis;
    if (!target) return;

    const exists = savedCharacters.some(sc => sc.character === target.character);
    if (exists && !dataToSave) {
      setSaveSuccessMsg(`Chữ "${target.character}" đã có sẵn trong Thư viện của bạn!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }

    setIsSavingChar(true);
    const currentUid = user?.uid || auth.currentUser?.uid;

    const newChar: SavedCharacter = {
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      character: target.character,
      pinyin: target.pinyin,
      sinoVietnamese: target.sinoVietnamese,
      vietnameseMeaning: target.vietnameseMeaning,
      totalStrokes: target.totalStrokes,
      strokeSequenceInstructions: target.strokeSequenceInstructions || [],
      radicals: target.radicals || [],
      composition: target.composition,
      examples: target.examples || [],
      createdAt: new Date().toISOString()
    };

    if (currentUid) {
      newChar.userId = currentUid;
    }

    try {
      if (currentUid) {
        const docRef = await addDoc(collection(db, 'saved_characters'), {
          character: target.character,
          pinyin: target.pinyin,
          sinoVietnamese: target.sinoVietnamese,
          vietnameseMeaning: target.vietnameseMeaning,
          totalStrokes: target.totalStrokes,
          strokeSequenceInstructions: target.strokeSequenceInstructions || [],
          radicals: target.radicals || [],
          composition: target.composition,
          examples: target.examples || [],
          userId: currentUid,
          createdAt: serverTimestamp()
        });
        newChar.id = docRef.id;
      }

      setSavedCharacters(prev => {
        const filtered = prev.filter(c => c.character !== target.character);
        const updated = [newChar, ...filtered];
        try {
          localStorage.setItem(LOCAL_STORAGE_SAVED_CHARS, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (!silent) {
        if (currentUid) {
          setSaveSuccessMsg(`☁️ Đã lưu chữ "${target.character}" (${target.sinoVietnamese}) lên Firebase Cloud & thiết bị!`);
        } else {
          setSaveSuccessMsg(`💾 Đã lưu chữ "${target.character}" (${target.sinoVietnamese}) vào máy (Đăng nhập để đồng bộ Firebase Cloud)!`);
        }
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      console.error("Lỗi khi lưu chữ Hán vào Firestore:", err);
      // Fallback local persistence
      setSavedCharacters(prev => {
        const filtered = prev.filter(c => c.character !== target.character);
        const updated = [newChar, ...filtered];
        try {
          localStorage.setItem(LOCAL_STORAGE_SAVED_CHARS, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      if (!silent) {
        setSaveSuccessMsg(`💾 Đã lưu chữ "${target.character}" vào bộ nhớ máy (sẽ tự động đồng bộ lên Firebase khi có mạng).`);
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      }
    } finally {
      setIsSavingChar(false);
    }
  };

  // Delete saved character
  const handleDeleteSavedCharacter = async (charRecord: SavedCharacter, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`Bạn có chắc muốn xóa chữ "${charRecord.character}" (${charRecord.sinoVietnamese}) khỏi thư viện đã lưu?`);
    if (!confirmed) return;

    const currentUid = user?.uid || auth.currentUser?.uid;

    try {
      if (currentUid && charRecord.id && !charRecord.id.startsWith('local_')) {
        await deleteDoc(doc(db, 'saved_characters', charRecord.id));
      }
      setSavedCharacters(prev => {
        const updated = prev.filter(c => c.character !== charRecord.character && c.id !== charRecord.id);
        try {
          localStorage.setItem(LOCAL_STORAGE_SAVED_CHARS, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      setSaveSuccessMsg(`Đã xóa chữ "${charRecord.character}" khỏi thư viện.`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    } catch (err: any) {
      console.error("Lỗi xóa chữ đã lưu:", err);
      handleFirestoreError(err, OperationType.DELETE, 'saved_characters');
    }
  };

  const handleSelectCharacter = (char: string, cachedRecord?: SavedCharacter | CharacterAnalysisResult) => {
    setSelectedChar(char);
    if (cachedRecord) {
      setAnalysis(cachedRecord);
      setLoadedFromCache(true);
      setError(null);
      setSaveSuccessMsg(`✨ Đã nạp chữ "${cachedRecord.character}" (${cachedRecord.sinoVietnamese}) từ Thư viện lưu trữ offline!`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  // Fetch character analysis on selected character change
  useEffect(() => {
    // If analysis is already populated for this character, no need to re-fetch
    if (analysis && analysis.character === selectedChar) {
      return;
    }

    // 1. Check if it already exists in savedCharacters
    const existing = savedCharacters.find(sc => sc.character === selectedChar);
    if (existing) {
      setAnalysis(existing);
      setLoadedFromCache(true);
      setLoading(false);
      setError(null);
      return;
    }

    // 2. Check if it exists in pre-baked offline dictionary
    if (DEFAULT_OFFLINE_CHARACTERS[selectedChar]) {
      setAnalysis(DEFAULT_OFFLINE_CHARACTERS[selectedChar]);
      setLoadedFromCache(true);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      setLoadedFromCache(false);
      try {
        const result = await analyzeSingleCharacter(selectedChar);
        setAnalysis(result);
        if (isAutoSaveEnabled) {
          handleSaveCharacter(result, true);
        }
      } catch (err: any) {
        console.error("Lỗi phân tích chữ đơn:", err);
        setError("Không thể kết nối đến máy chủ AI lúc này (có thể do mất mạng hoặc dịch vụ AI gián đoạn). Bạn vẫn có thể mở các chữ đã lưu trong Thư viện hoặc chọn 12 chữ mẫu phổ biến có sẵn để học và luyện viết hoàn toàn offline!");
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
        charDataLoader: cachedCharDataLoader,
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
    
    // Check if character already exists in savedCharacters or offline dictionary
    const existing = savedCharacters.find(sc => sc.character === singleChar);
    if (existing) {
      handleSelectCharacter(singleChar, existing);
    } else if (DEFAULT_OFFLINE_CHARACTERS[singleChar]) {
      handleSelectCharacter(singleChar, DEFAULT_OFFLINE_CHARACTERS[singleChar]);
    } else {
      setSelectedChar(singleChar);
    }
    setCharInput('');
  };

  const filteredSavedChars = savedCharacters.filter(sc => {
    if (!savedCharsFilter.trim()) return true;
    const q = savedCharsFilter.toLowerCase().trim();
    return (
      sc.character.includes(q) ||
      (sc.pinyin && sc.pinyin.toLowerCase().includes(q)) ||
      (sc.sinoVietnamese && sc.sinoVietnamese.toLowerCase().includes(q)) ||
      (sc.vietnameseMeaning && sc.vietnameseMeaning.toLowerCase().includes(q))
    );
  });

  const currentSavedRecord = savedCharacters.find(sc => sc.character === selectedChar);
  const isCurrentCharSaved = Boolean(currentSavedRecord);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold backdrop-blur-xs"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

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

          {/* Search Box & Auto-Save Toggle */}
          <div className="flex flex-col gap-2 w-full md:w-auto max-w-md">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
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

            {/* Auto Save Toggle */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-600 font-bold">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAutoSaveEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsAutoSaveEnabled(checked);
                    try {
                      localStorage.setItem(LOCAL_STORAGE_AUTOSAVE, String(checked));
                    } catch (err) {}
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-slate-600">Tự động lưu vào Thư viện chữ khi tìm kiếm AI</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tab Selection: Suggested vs Saved Characters */}
        <div className="mt-6 pt-4 border-t border-indigo-100/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('suggested')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'suggested'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
                }`}
              >
                <span>Chữ gợi ý phổ biến</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/40">{SUGGESTED_CHARS.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'saved'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/80 hover:bg-white text-indigo-700 border border-indigo-200/80'
                }`}
              >
                <Bookmark size={13} />
                <span>Thư viện chữ đã lưu</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'saved' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                  {savedCharacters.length}
                </span>
              </button>
            </div>

            {activeTab === 'saved' && (
              <div className="flex flex-wrap items-center gap-2">
                {user ? (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                    <Cloud size={13} className="text-emerald-600 shrink-0" />
                    <span className="hidden sm:inline">Firebase Cloud:</span>
                    <span className="truncate max-w-[140px]">{user.email || 'Đã đồng bộ'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl" title="Đăng nhập ở góc trên để tự động sao lưu Cloud vĩnh viễn">
                    <Clock size={12} className="text-amber-600 shrink-0" />
                    <span>Lưu máy này</span>
                  </div>
                )}

                {user && savedCharacters.some(c => !c.userId || c.id?.startsWith('local_')) && (
                  <button
                    type="button"
                    onClick={handleSyncToCloud}
                    disabled={isSyncingCloud}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-xl border border-indigo-200 cursor-pointer transition-all shadow-xs"
                    title="Đồng bộ các chữ đang lưu offline lên Firebase Cloud"
                  >
                    <CloudUpload size={12} />
                    <span>{isSyncingCloud ? 'Đang đồng bộ...' : 'Đồng bộ Cloud'}</span>
                  </button>
                )}

                {savedCharacters.length > 0 && (
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Lọc chữ, pinyin, nghĩa..."
                      value={savedCharsFilter}
                      onChange={(e) => setSavedCharsFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                    />
                    {savedCharsFilter && (
                      <button
                        type="button"
                        onClick={() => setSavedCharsFilter('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tab 1: Suggested Characters Content */}
          {activeTab === 'suggested' && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {SUGGESTED_CHARS.map((sc) => {
                const isSaved = savedCharacters.some(c => c.character === sc.char);
                const offlineData = savedCharacters.find(c => c.character === sc.char) || DEFAULT_OFFLINE_CHARACTERS[sc.char];
                return (
                  <button
                    key={sc.char}
                    onClick={() => handleSelectCharacter(sc.char, offlineData)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedChar === sc.char
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                        : 'bg-white text-slate-700 border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg font-black">{sc.char}</span>
                    <span className="text-[10px] opacity-80">({sc.sinoViet})</span>
                    {isSaved && (
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedChar === sc.char ? 'bg-amber-300' : 'bg-indigo-500'}`} title="Đã lưu"></span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Saved Characters Content */}
          {activeTab === 'saved' && (
            <div className="animate-fade-in">
              {savedCharacters.length === 0 ? (
                <div className="bg-white/90 border border-dashed border-indigo-200 rounded-2xl p-6 text-center space-y-2">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                    <Bookmark size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Chưa có chữ nào trong Thư viện đã lưu</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Khi bạn tìm kiếm bất kỳ chữ Hán nào và bấm <span className="font-bold text-amber-600">"Lưu chữ vào Thư viện"</span> (hoặc bật Tự động lưu ở trên), toàn bộ thông tin, bộ thủ, nét viết và từ ghép sẽ được lưu vĩnh viễn để bạn ôn tập bất cứ lúc nào mà không cần tìm lại.
                  </p>
                </div>
              ) : filteredSavedChars.length === 0 ? (
                <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-500">
                  Không tìm thấy chữ nào khớp với từ khóa "{savedCharsFilter}".
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredSavedChars.map((sc) => {
                    const isSelected = selectedChar === sc.character;
                    return (
                      <div
                        key={sc.id || sc.character}
                        onClick={() => handleSelectCharacter(sc.character, sc)}
                        className={`group relative p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl font-black shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-900 border border-indigo-100'
                          }`}>
                            {sc.character}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-black text-xs truncate">
                                {sc.sinoVietnamese}
                              </span>
                              <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                ({sc.pinyin})
                              </span>
                            </div>
                            <p className={`text-[10px] font-medium truncate max-w-[130px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {sc.vietnameseMeaning}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {sc.userId ? (
                            <span title="Đã lưu trên Firebase Cloud" className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                              isSelected ? 'bg-white/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              <Cloud size={10} />
                              <span className="hidden sm:inline">Cloud</span>
                            </span>
                          ) : (
                            <span title="Lưu tạm trên máy (Offline)" className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <Clock size={10} />
                              <span className="hidden sm:inline">Máy</span>
                            </span>
                          )}
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {sc.totalStrokes} nét
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedCharacter(sc, e)}
                            className={`p-1.5 rounded-lg opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${
                              isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-50 text-slate-300 hover:text-rose-600'
                            }`}
                            title="Xóa chữ này khỏi thư viện"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
        <div className="bg-amber-50/90 border-2 border-amber-200/90 rounded-3xl p-6 md:p-8 text-center space-y-4 max-w-xl mx-auto shadow-sm animate-fade-in">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <WifiOff size={28} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-black text-amber-950 text-base md:text-lg">Không thể kết nối máy chủ AI lúc này</h3>
            <p className="text-xs text-amber-800 leading-relaxed font-medium max-w-md mx-auto">
              {error}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Bookmark size={14} />
              <span>Mở Thư viện đã lưu ({savedCharacters.length} chữ)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectCharacter('好', DEFAULT_OFFLINE_CHARACTERS['好'])}
              className="px-4 py-2.5 bg-white hover:bg-amber-100/60 active:scale-95 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Học chữ mẫu "好" có sẵn
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSelectedChar(selectedChar);
              }}
              className="px-3.5 py-2.5 bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Thử lại kết nối
            </button>
          </div>
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
              {/* Cache hit indicator banner */}
              {loadedFromCache && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles size={18} className="text-emerald-600 shrink-0 animate-pulse" />
                    <span className="truncate">
                      Dữ liệu chữ "{analysis.character}" đã được nạp từ Thư viện lưu trữ — Đầy đủ thông tin, bộ thủ, nét bút và từ ghép.
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md shrink-0">
                    Tải Tức Thì
                  </span>
                </div>
              )}

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
                      {isCurrentCharSaved && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          {currentSavedRecord?.userId ? <Cloud size={11} className="text-emerald-600" /> : <CheckCircle2 size={11} className="text-emerald-600" />}
                          {currentSavedRecord?.userId ? 'Đã lưu Cloud Firebase' : 'Đã lưu Thư viện'}
                        </span>
                      )}
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

                {/* Quick Action Buttons: Save character, Video, Worksheet */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {/* Save to Library Button */}
                  {isCurrentCharSaved ? (
                    <button
                      type="button"
                      onClick={() => currentSavedRecord && handleDeleteSavedCharacter(currentSavedRecord)}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-600 font-bold text-xs rounded-xl border border-emerald-200 hover:border-rose-200 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
                      title="Nhấn để bỏ lưu chữ này khỏi Thư viện"
                    >
                      <CheckCircle2 size={14} className="group-hover:hidden text-emerald-600" />
                      <Trash2 size={14} className="hidden group-hover:inline text-rose-500" />
                      <span className="group-hover:hidden flex items-center gap-1">
                        {currentSavedRecord?.userId ? <Cloud size={13} className="text-emerald-600" /> : null}
                        <span>{currentSavedRecord?.userId ? 'Đã lưu Cloud' : 'Đã lưu Thư viện'}</span>
                      </span>
                      <span className="hidden group-hover:inline">Bỏ lưu chữ này</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSaveCharacter()}
                      disabled={isSavingChar}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Lưu toàn bộ thông tin chữ, bộ thủ và từ ghép lên Firebase Cloud & thiết bị để học bất cứ lúc nào"
                    >
                      {isSavingChar ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload size={14} />
                          <span>{user ? 'Lưu Cloud' : 'Lưu chữ này'}</span>
                        </>
                      )}
                    </button>
                  )}

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
