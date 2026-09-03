import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Zap, 
  Check, 
  CheckCircle2, 
  Clock, 
  Play, 
  Pause, 
  Award, 
  Star, 
  Calendar, 
  AlertCircle, 
  RotateCcw, 
  TrendingUp, 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  Target, 
  Timer, 
  ChevronRight,
  Info,
  BookOpen
} from 'lucide-react';
import { StudySession } from '../types';

export interface AttendanceTrackerProps {
  user: any;
  activeSecondsToday: number;
  setActiveSecondsToday: React.Dispatch<React.SetStateAction<number>>;
  isTimerRunning: boolean;
  setIsTimerRunning: React.Dispatch<React.SetStateAction<boolean>>;
  wasAutoPaused: boolean;
  setWasAutoPaused: (val: boolean) => void;
  studySessions: StudySession[];
  calculateStudyStreak: (sessions: StudySession[], activeSecsToday: number) => number;
  getDailyHistoryData: () => Array<{
    date: string;
    duration: number;
    label: string;
    dayOfWeek: string;
    isGoalMet: boolean;
  }>;
  onSaveDurationNow?: () => Promise<void>;
  onNavigateToLearn?: () => void;
}

export const DAILY_GOAL_SECONDS = 1800; // 30 minutes
export const EXCELLENCE_GOAL_SECONDS = 2700; // 45 minutes

export function formatTimeHoursMinsSecs(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => String(n).padStart(2, '0');
  
  let formatted = '';
  if (hours > 0) {
    formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    formatted = `${pad(minutes)}:${pad(seconds)}`;
  }

  return { hours, minutes, seconds, formatted };
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  user,
  activeSecondsToday,
  setActiveSecondsToday,
  isTimerRunning,
  setIsTimerRunning,
  wasAutoPaused,
  setWasAutoPaused,
  studySessions,
  calculateStudyStreak,
  getDailyHistoryData,
  onSaveDurationNow,
  onNavigateToLearn
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const streak = calculateStudyStreak(studySessions, activeSecondsToday);
  const historyData = getDailyHistoryData();

  const { hours, minutes, seconds, formatted } = formatTimeHoursMinsSecs(activeSecondsToday);
  const progressPercent = Math.min(100, Math.round((activeSecondsToday / DAILY_GOAL_SECONDS) * 100));
  const remainingSeconds = Math.max(0, DAILY_GOAL_SECONDS - activeSecondsToday);
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  // Total historical study time
  const totalHistoricalSeconds = studySessions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalAllTimeSeconds = totalHistoricalSeconds + (studySessions.some(s => s.date === historyData[historyData.length - 1]?.date) ? 0 : activeSecondsToday);
  const totalAllTimeHours = (totalAllTimeSeconds / 3600).toFixed(1);

  // Best streak calculation
  const maxStreak = React.useMemo(() => {
    if (!studySessions || studySessions.length === 0) return streak;
    const sorted = [...studySessions].sort((a, b) => a.date.localeCompare(b.date));
    let max = 0;
    let curr = 0;
    let prevDate: Date | null = null;

    for (const session of sorted) {
      if (session.duration >= DAILY_GOAL_SECONDS) {
        const d = new Date(session.date);
        if (!prevDate) {
          curr = 1;
        } else {
          const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            curr++;
          } else if (diffDays > 1) {
            curr = 1;
          }
        }
        prevDate = d;
        if (curr > max) max = curr;
      }
    }
    return Math.max(max, streak);
  }, [studySessions, streak]);

  // Daily evaluation tier
  const dailyEvaluation = React.useMemo(() => {
    if (activeSecondsToday >= EXCELLENCE_GOAL_SECONDS) {
      return {
        level: 'Xuất sắc',
        stars: 5,
        badgeBg: 'bg-emerald-500 text-white',
        cardBg: 'bg-emerald-50/70 border-emerald-200',
        titleColor: 'text-emerald-800',
        description: 'Đẳng cấp chuyên cần cao nhất! Bạn đã vượt xa mục tiêu 30 phút, việc học tập trung sâu này giúp khả năng ghi nhớ từ vựng và cấu trúc ngữ pháp đạt hiệu quả tối đa.',
        recommendation: 'Hãy tiếp tục giữ vững phong độ này trong các buổi học tiếp theo.'
      };
    }
    if (activeSecondsToday >= DAILY_GOAL_SECONDS) {
      return {
        level: 'Đạt chuẩn',
        stars: 4,
        badgeBg: 'bg-indigo-600 text-white',
        cardBg: 'bg-indigo-50/70 border-indigo-200',
        titleColor: 'text-indigo-900',
        description: 'Tuyệt vời! Bạn đã hoàn thành trọn vẹn chỉ tiêu 30 phút chuyên cần hôm nay. Chuỗi ngày học tập liên tục của bạn đã được bảo toàn vững chắc.',
        recommendation: 'Nếu có thời gian, bạn có thể luyện thêm một số câu khó hoặc bài kiểm tra trật tự từ.'
      };
    }
    if (activeSecondsToday >= 900) {
      return {
        level: 'Khởi động tốt',
        stars: 3,
        badgeBg: 'bg-amber-500 text-white',
        cardBg: 'bg-amber-50/70 border-amber-200',
        titleColor: 'text-amber-900',
        description: `Bạn đã học được hơn 15 phút (${Math.floor(activeSecondsToday / 60)} phút). Chỉ còn thiếu khoảng ${remainingMinutes} phút nữa là đạt chuẩn chuyên cần hôm nay!`,
        recommendation: 'Hãy bật tiếp đồng hồ và luyện thêm 1-2 bài học ngắn để kích hoạt chuỗi chuyên cần.'
      };
    }
    if (activeSecondsToday > 0) {
      return {
        level: 'Mới bắt đầu',
        stars: 2,
        badgeBg: 'bg-slate-700 text-white',
        cardBg: 'bg-slate-50 border-slate-200',
        titleColor: 'text-slate-800',
        description: `Bạn đã bắt đầu phiên học (${Math.floor(activeSecondsToday / 60)} phút). Hệ thống đang ghi nhận thời gian thực tế mỗi khi đồng hồ hoạt động.`,
        recommendation: 'Hãy duy trì sự tập trung, nhấn bắt đầu học để tiếp tục tích lũy thời gian.'
      };
    }
    return {
      level: 'Chưa học',
      stars: 1,
      badgeBg: 'bg-slate-200 text-slate-600',
      cardBg: 'bg-slate-50 border-slate-200',
      titleColor: 'text-slate-700',
      description: 'Hôm nay bạn chưa bật đồng hồ tính giờ học. Nhấn nút "Bắt đầu học" ngay dưới mặt đồng hồ để hệ thống bắt đầu tự động tính giờ cho bạn.',
      recommendation: 'Dành ra ít nhất 30 phút mỗi ngày để tạo thói quen học tiếng Trung bền vững.'
    };
  }, [activeSecondsToday, remainingMinutes]);

  // Overall Attendance Rank
  const attendanceRank = React.useMemo(() => {
    if (streak >= 30 || totalAllTimeSeconds >= 3600 * 30) {
      return { name: 'Bậc Thầy Chuyên Cần', tier: 'Kim Cương', color: 'text-sky-600 bg-sky-50 border-sky-200', icon: Award };
    }
    if (streak >= 14 || totalAllTimeSeconds >= 3600 * 15) {
      return { name: 'Chiến Binh Kiên Trì', tier: 'Hoàng Kim', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Star };
    }
    if (streak >= 7 || totalAllTimeSeconds >= 3600 * 7) {
      return { name: 'Người Học Bền Bỉ', tier: 'Bạc', color: 'text-slate-700 bg-slate-100 border-slate-300', icon: ShieldCheck };
    }
    if (streak >= 3 || totalAllTimeSeconds >= 3600 * 3) {
      return { name: 'Tập Sự Chăm Chỉ', tier: 'Đồng', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: Sparkles };
    }
    return { name: 'Mới Nhập Môn', tier: 'Khởi Đầu', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: Target };
  }, [streak, totalAllTimeSeconds]);

  const handleToggleTimer = () => {
    if (!user) return;
    if (wasAutoPaused) {
      setWasAutoPaused(false);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const handleManualSave = async () => {
    if (!onSaveDurationNow) return;
    try {
      setIsSaving(true);
      await onSaveDurationNow();
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3000);
    } catch (err) {
      console.error("Manual save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm max-w-xl mx-auto space-y-5 p-8">
        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Lock size={30} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Yêu cầu đăng nhập</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            Vui lòng đăng nhập tài khoản của bạn để bật đồng hồ chuyên cần, tự động đếm giờ học và tích lũy chuỗi ngày rèn luyện.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Header */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-orange-50 text-orange-500 rounded-xl">
              <Flame className="fill-orange-500/20" size={26} />
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Đồng hồ & Theo dõi Chuyên cần
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base font-medium">
            Bật đồng hồ khi bắt đầu học. Hệ thống tự động ngưng đếm khi bạn thoát app và lấy thời gian thực tế để đánh giá.
          </p>
        </div>

        {/* Current streak badge */}
        <div className="flex items-center gap-3.5 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 px-5 py-3.5 rounded-2xl border border-orange-200/60 shadow-xs shrink-0">
          <div className="p-2 bg-white rounded-xl shadow-xs text-orange-500">
            <Zap className="fill-orange-500 shrink-0" size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-orange-500/80">Chuỗi chuyên cần</div>
            <div className="text-xl font-black text-orange-700">
              {streak} ngày liên tiếp
            </div>
          </div>
        </div>
      </div>

      {/* Auto-pause Alert Notification */}
      <AnimatePresence>
        {wasAutoPaused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Đồng hồ đã tự động tạm ngưng khi bạn rời ứng dụng
                </h4>
                <p className="text-xs text-amber-800">
                  Thời gian học trước đó đã được lưu lại an toàn. Bấm <strong>Tiếp tục học</strong> khi bạn sẵn sàng quay lại bài học!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setWasAutoPaused(false);
                setIsTimerRunning(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Play size={14} className="fill-white" />
              Tiếp tục học ngay
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Clock & Daily Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* LEFT / CENTER (Col 1-7): The Interactive Study Clock */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-150 p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Timer size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Đồng hồ học tập hôm nay
              </h2>
            </div>

            {/* Live indicator badge */}
            <div className="flex items-center gap-2">
              {isTimerRunning ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                  Đang tính giờ học...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Pause size={12} />
                  Đang tạm dừng
                </span>
              )}
            </div>
          </div>

          {/* Big Clock Dial Face */}
          <div className="flex flex-col items-center justify-center py-4 sm:py-6">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {/* Circular SVG Progress Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="text-slate-100"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className={activeSecondsToday >= DAILY_GOAL_SECONDS ? "text-emerald-500" : "text-indigo-600"}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <div className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Clock size={13} /> Thời gian học
                </div>

                {/* Big Digital Readout */}
                <div className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight font-mono select-none">
                  {formatted}
                </div>

                <div className="mt-2 text-xs font-bold text-slate-500">
                  {hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút ${seconds} giây`}
                </div>

                {/* Status pill under time */}
                <div className="mt-2">
                  {activeSecondsToday >= DAILY_GOAL_SECONDS ? (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Check size={12} /> Đã đạt 30p chuyên cần
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">
                      Mục tiêu: 30 phút/ngày
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress summary bar */}
            <div className="w-full max-w-sm mt-4 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Tiến trình hôm nay</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    activeSecondsToday >= DAILY_GOAL_SECONDS ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-center text-[11px] text-slate-400 font-medium pt-1">
                {activeSecondsToday >= DAILY_GOAL_SECONDS ? (
                  <span className="text-emerald-700 font-bold">🎉 Bạn đã hoàn thành xuất sắc mục tiêu học của ngày hôm nay!</span>
                ) : (
                  <span>Cần học thêm khoảng <strong className="text-slate-700">{remainingMinutes} phút</strong> nữa để đạt mốc chuyên cần.</span>
                )}
              </p>
            </div>
          </div>

          {/* Clock Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleToggleTimer}
              className={`w-full sm:flex-1 py-4 px-6 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer active:scale-95 ${
                isTimerRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause size={20} className="fill-white" />
                  <span>Tạm dừng đồng hồ</span>
                </>
              ) : (
                <>
                  <Play size={20} className="fill-white" />
                  <span>{activeSecondsToday > 0 ? 'Tiếp tục tính giờ học' : 'Bắt đầu học ngay'}</span>
                </>
              )}
            </button>

            {onSaveDurationNow && (
              <button
                type="button"
                onClick={handleManualSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Đồng bộ tiến độ lên máy chủ ngay bây giờ"
              >
                <RotateCcw size={15} className={isSaving ? "animate-spin" : ""} />
                <span>{isSaving ? "Đang lưu..." : "Lưu vào máy chủ"}</span>
              </button>
            )}

            {onNavigateToLearn && (
              <button
                type="button"
                onClick={onNavigateToLearn}
                className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen size={16} />
                <span>Vào trang Học tập</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {saveSuccessNotice && (
            <div className="text-center text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
              Đã cập nhật dữ liệu chuyên cần lên hệ thống thành công!
            </div>
          )}
        </div>

        {/* RIGHT (Col 8-12): Evaluation & System Assessment Card */}
        <div className="lg:col-span-5 space-y-6">
          {/* Daily Evaluation Card */}
          <div className={`p-6 md:p-7 rounded-[2.5rem] border shadow-sm transition-all ${dailyEvaluation.cardBg}`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-xl shadow-xs text-amber-500">
                  <Award size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Căn cứ đánh giá hôm nay
                  </div>
                  <h3 className={`text-lg font-black ${dailyEvaluation.titleColor}`}>
                    {dailyEvaluation.level}
                  </h3>
                </div>
              </div>

              {/* Star rating */}
              <div className="flex items-center gap-0.5 bg-white px-2.5 py-1 rounded-full shadow-xs">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < dailyEvaluation.stars ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                  />
                ))}
              </div>
            </div>

            <p className="text-sm font-medium text-slate-700 leading-relaxed mb-4">
              {dailyEvaluation.description}
            </p>

            <div className="p-3.5 bg-white/80 rounded-2xl border border-slate-200/60 text-xs font-semibold text-slate-600 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Info size={12} /> Lời khuyên học tập:
              </div>
              <p>{dailyEvaluation.recommendation}</p>
            </div>
          </div>

          {/* User Attendance Rank Badge */}
          <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl border ${attendanceRank.color}`}>
                  <attendanceRank.icon size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Danh hiệu chuyên cần</div>
                  <h4 className="text-base font-black text-slate-800">{attendanceRank.name}</h4>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black border ${attendanceRank.color}`}>
                Hạng {attendanceRank.tier}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-2xl text-center border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Kỷ lục chuỗi</span>
                <div className="text-lg font-black text-slate-800">{maxStreak} ngày</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-center border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng tích lũy</span>
                <div className="text-lg font-black text-slate-800">{totalAllTimeHours} giờ</div>
              </div>
            </div>
          </div>

          {/* Transparent System Rules */}
          <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200/70 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-600" />
              Quy chế ghi nhận & Đánh giá công bằng:
            </div>
            <ul className="space-y-1.5 list-disc pl-4 text-slate-500 font-medium text-[11px]">
              <li>Hệ thống chỉ tính giờ khi bạn mở app và bấm <strong>Bắt đầu học</strong>.</li>
              <li>Khi bạn thoát ra ngoài, chuyển tab hoặc khóa màn hình, đồng hồ sẽ <strong>tự động ngưng</strong> để phản ánh đúng thời gian bạn thực sự học.</li>
              <li>Đạt từ <strong>30 phút/ngày</strong> được công nhận 1 ngày chuyên cần và giữ chuỗi.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section: 7-Day History */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" /> Nhật ký chuyên cần 7 ngày gần đây
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Kiểm tra mức độ đều đặn của bạn trong tuần qua để tự điều chỉnh lịch học.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Đạt chuẩn (≥30p)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Có học (&lt;30p)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" /> Nghỉ
            </span>
          </div>
        </div>

        {/* 7 Days boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
          {historyData.map((day, idx) => {
            const isToday = idx === historyData.length - 1;
            const minutesTrained = Math.floor(day.duration / 60);

            let cardStyle = "bg-slate-50 border-slate-200/60 text-slate-500";
            if (day.duration >= DAILY_GOAL_SECONDS) {
              cardStyle = "bg-emerald-500 text-white border-emerald-600 shadow-sm";
            } else if (day.duration > 0) {
              cardStyle = "bg-amber-50 text-amber-900 border-amber-200";
            }

            return (
              <div
                key={day.date}
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-between text-center transition-all hover:scale-102 ${cardStyle} ${
                  isToday ? 'ring-2 ring-indigo-500/50' : ''
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-wider opacity-80">
                  {day.dayOfWeek} {isToday ? '(Hôm nay)' : ''}
                </div>
                <div className="my-2 text-base font-black">
                  {day.label.split('/')[0]}
                </div>
                <div className="text-xs font-bold mt-1">
                  {minutesTrained} phút
                </div>
                <div className="mt-2">
                  {day.duration >= DAILY_GOAL_SECONDS ? (
                    <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-black">
                      Đạt chuẩn ✓
                    </span>
                  ) : day.duration > 0 ? (
                    <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      Khởi động
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Chưa học
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export interface HeaderStudyClockProps {
  user: any;
  activeSecondsToday: number;
  isTimerRunning: boolean;
  setIsTimerRunning: React.Dispatch<React.SetStateAction<boolean>>;
  wasAutoPaused: boolean;
  setWasAutoPaused: (val: boolean) => void;
  onOpenProgressView: () => void;
}

export const HeaderStudyClock: React.FC<HeaderStudyClockProps> = ({
  user,
  activeSecondsToday,
  isTimerRunning,
  setIsTimerRunning,
  wasAutoPaused,
  setWasAutoPaused,
  onOpenProgressView
}) => {
  if (!user) return null;
  const { formatted } = formatTimeHoursMinsSecs(activeSecondsToday);
  const isGoalMet = activeSecondsToday >= DAILY_GOAL_SECONDS;

  return (
    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-slate-200/90 rounded-full pl-2.5 pr-1.5 py-1 shadow-xs hover:border-slate-300 transition-all">
      <button
        type="button"
        onClick={onOpenProgressView}
        className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer select-none"
        title="Xem chi tiết đồng hồ & đánh giá chuyên cần"
      >
        <span className="relative flex h-2 w-2">
          {isTimerRunning && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isTimerRunning 
              ? 'bg-emerald-500' 
              : wasAutoPaused 
              ? 'bg-amber-400' 
              : isGoalMet 
              ? 'bg-emerald-500' 
              : 'bg-slate-300'
          }`} />
        </span>
        <span>{formatted}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (wasAutoPaused) setWasAutoPaused(false);
          setIsTimerRunning(!isTimerRunning);
        }}
        className={`p-1 rounded-full transition-colors cursor-pointer ${
          isTimerRunning
            ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
        }`}
        title={isTimerRunning ? "Tạm dừng tính giờ học" : "Bắt đầu tính giờ học"}
      >
        {isTimerRunning ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
      </button>
    </div>
  );
};
