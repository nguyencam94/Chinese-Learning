import HanziWriter from 'hanzi-writer';
import { CharacterAnalysisResult } from '../services/geminiService';
import { getCharacterStrokeData } from './hanziLoader';

export type StrokeStyleType = 'slender' | 'medium' | 'kaiti';

export interface VideoExportOptions {
  speed?: number;
  highlightRadical?: boolean;
  resolution?: number; // default 720
  strokeStyle?: StrokeStyleType; // 'slender' (thanh mảnh - bút bi/gel), 'medium' (vừa), 'kaiti' (khải thư)
  showPenTip?: boolean; // Hiển thị đầu bút đang di chuyển
  showFaintOutline?: boolean; // Hiển thị khung nét mờ để dễ theo dõi
  onProgress?: (progress: number, statusText: string) => void;
}

export interface VideoExportResult {
  blob: Blob;
  url: string;
  filename: string;
  character: string;
  durationMs: number;
}

/**
 * Renders the traditional Mi Zi Ge (米字格) calligraphy grid on Canvas
 */
function drawMiZiGeGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  borderColor = '#e11d48',
  dashColor = '#fda4af'
) {
  ctx.save();
  
  // Background inside grid
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);

  // Outer solid border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, size, size);

  // Inner double border accent (traditional calligraphy style)
  ctx.strokeStyle = `${borderColor}35`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);

  // Dashed guide lines
  ctx.strokeStyle = dashColor;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 6]);

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(x + 4, y + size / 2);
  ctx.lineTo(x + size - 4, y + size / 2);
  ctx.stroke();

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + 4);
  ctx.lineTo(x + size / 2, y + size - 4);
  ctx.stroke();

  // Diagonals
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 4);
  ctx.lineTo(x + size - 4, y + size - 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + size - 4, y + 4);
  ctx.lineTo(x + 4, y + size - 4);
  ctx.stroke();

  ctx.restore();
}

/**
 * Transforms HanziWriter / MakeMeAHanzi coordinates (1024x1024, y-up from baseline 900) to Canvas pixels
 */
function transformPoint(
  pt: [number, number],
  gridX: number,
  gridY: number,
  innerSize: number,
  padding: number
): [number, number] {
  const x = gridX + padding + (pt[0] / 1024) * innerSize;
  const y = gridY + padding + ((900 - pt[1]) / 1024) * innerSize;
  return [x, y];
}

/**
 * Calculates the total length of a polyline
 */
function getPolylineLength(points: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    len += Math.hypot(dx, dy);
  }
  return len;
}

/**
 * Interpolates a polyline up to distance `dist`
 */
function getTrimmedPolyline(
  points: [number, number][],
  dist: number
): { points: [number, number][]; tip: [number, number] | null } {
  if (points.length === 0) return { points: [], tip: null };
  if (points.length === 1 || dist <= 0) {
    return { points: [points[0]], tip: points[0] };
  }

  const result: [number, number][] = [points[0]];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);

    if (accumulated + segLen >= dist) {
      const remain = dist - accumulated;
      const ratio = segLen > 0 ? remain / segLen : 0;
      const lastPt: [number, number] = [
        p0[0] + (p1[0] - p0[0]) * ratio,
        p0[0] + (p1[1] - p0[1]) * ratio
      ];
      // Note: correct y formula
      const tipPt: [number, number] = [
        p0[0] + (p1[0] - p0[0]) * ratio,
        p0[1] + (p1[1] - p0[1]) * ratio
      ];
      result.push(tipPt);
      return { points: result, tip: tipPt };
    }

    result.push(p1);
    accumulated += segLen;
  }

  return { points: result, tip: points[points.length - 1] };
}

/**
 * Draws a smooth curved polyline through points
 */
function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  lineWidth: number,
  color: string
) {
  if (pts.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);

  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i][0] + pts[i + 1][0]) / 2;
      const yc = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws the base video layout: Background, Header Cards, Metadata, MiZiGe Grid
 */
function renderVideoFrameBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  character: string,
  analysis: CharacterAnalysisResult,
  gridX: number,
  gridY: number,
  gridSize: number,
  currentStrokeIndex: number,
  totalStrokes: number,
  strokeStyle: StrokeStyleType
) {
  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#fbfcfe');
  bgGrad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Top header background card
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(24, 20, width - 48, 140, 20);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // App & Lesson Badge
  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.roundRect(40, 34, 195, 26, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ZHONGWENGO • LUYỆN VIẾT NÉT', 137, 51);

  // Character Header: Big Char & Info
  ctx.textAlign = 'left';
  
  // Pinyin
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(analysis.pinyin || '', 40, 95);

  // Sino-Vietnamese & Meaning
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
  const sinoText = analysis.sinoVietnamese ? `Âm Hán-Việt: ${analysis.sinoVietnamese}` : '';
  ctx.fillText(sinoText, 40, 125);

  // Right side badges on header
  const radicalLabel = analysis.radicals?.[0]?.radical 
    ? `Bộ ${analysis.radicals[0].radical} (${analysis.radicals[0].sinoVietnamese})`
    : '—';

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e11d48';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Bộ thủ: ${radicalLabel}`, width - 40, 65);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Tổng số nét: ${totalStrokes} nét`, width - 40, 95);

  const meaning = analysis.vietnameseMeaning || '';
  const meaningTrunc = meaning.length > 28 ? meaning.slice(0, 26) + '...' : meaning;
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`"${meaningTrunc}"`, width - 40, 125);

  // Draw Central Mi Zi Ge Grid
  drawMiZiGeGrid(ctx, gridX, gridY, gridSize, '#e11d48', '#fecdd3');

  // Stroke Progress Pill above Grid
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(gridX, gridY - 32, gridSize, 26, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  const styleName = strokeStyle === 'slender' ? 'Nét bút bi / gel thanh mảnh' : strokeStyle === 'medium' ? 'Nét bút máy vừa vặn' : 'Nét Khải thư';
  if (currentStrokeIndex < totalStrokes) {
    ctx.fillText(`✍️ Đang viết: Nét ${currentStrokeIndex + 1}/${totalStrokes} • ${styleName}`, gridX + gridSize / 2, gridY - 15);
  } else {
    ctx.fillStyle = '#059669';
    ctx.fillText(`🎉 Hoàn thành trọn vẹn ${totalStrokes} nét chữ "${character}"!`, gridX + gridSize / 2, gridY - 15);
  }

  // Bottom footer branding & tip
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Quan sát thứ tự và hướng đưa bút để hình thành phản xạ viết chữ chuẩn', width / 2, height - 38);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ZhongWenGo - Ứng Dụng Tự Học Tiếng Trung & Luyện Viết Nét Chữ', width / 2, height - 18);
}

/**
 * Checks supported MediaRecorder mime types
 */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4'
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

/**
 * Records a real-time high-fidelity stroke order animation video of a Chinese character
 * with refined slender strokes (nét thanh mảnh) and direct Canvas rendering.
 */
export async function recordStrokeVideo(
  character: string,
  analysis: CharacterAnalysisResult,
  options: VideoExportOptions = {}
): Promise<VideoExportResult> {
  const {
    speed = 0.9,
    highlightRadical = true,
    resolution = 720,
    strokeStyle = 'slender', // Default to slender as requested!
    showPenTip = true,
    showFaintOutline = true,
    onProgress
  } = options;

  onProgress?.(5, 'Khởi tạo phòng thu nét chữ...');

  const mimeType = getSupportedMimeType();
  if (!mimeType) {
    throw new Error('Trình duyệt của bạn chưa hỗ trợ tính năng quay video MediaRecorder.');
  }

  onProgress?.(15, `Đang nạp dữ liệu bút thuận chữ "${character}"...`);

  // Load HanziWriter character data containing stroke outlines & medians (cached for offline support)
  let charData: any = null;
  try {
    charData = await getCharacterStrokeData(character);
  } catch (err: any) {
    throw new Error(`Không thể nạp dữ liệu nét chữ cho "${character}". Vui lòng kiểm tra lại kết nối.`);
  }

  if (!charData || !charData.medians || charData.medians.length === 0) {
    throw new Error(`Không tìm thấy dữ liệu nét bút cho chữ "${character}".`);
  }

  // Setup Canvas
  const canvas = document.createElement('canvas');
  const width = resolution;
  const height = Math.round(resolution * 1.22); // e.g. 720 x 878
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Không thể khởi tạo đồ họa Canvas 2D.');
  }

  const gridSize = Math.round(width * 0.72); // e.g. 518px
  const gridX = Math.round((width - gridSize) / 2);
  const gridY = 195;
  const padding = 28;
  const innerSize = gridSize - padding * 2;

  // Compute stroke width based on selected style
  // 'slender' gives beautiful ~6-7px hard-pen strokes, 'medium' ~10-12px, 'kaiti' ~18px
  let baseStrokeWidth = 7;
  if (strokeStyle === 'slender') {
    baseStrokeWidth = Math.max(5, Math.round(gridSize * 0.014)); // ~7px
  } else if (strokeStyle === 'medium') {
    baseStrokeWidth = Math.max(8, Math.round(gridSize * 0.022)); // ~11px
  } else {
    baseStrokeWidth = Math.max(12, Math.round(gridSize * 0.035)); // ~18px
  }

  const totalStrokes = charData.medians.length;
  const radStrokes: number[] = charData.radStrokes || [];

  // Pre-transform all medians to Canvas pixels
  const transformedMedians: [number, number][][] = charData.medians.map((strokeMed: number[][]) => {
    return strokeMed.map(pt => transformPoint([pt[0], pt[1]], gridX, gridY, innerSize, padding));
  });

  // Pre-calculate polyline lengths
  const strokeLengths: number[] = transformedMedians.map(pts => getPolylineLength(pts));

  // Pre-compile Path2D for faint outline if available
  const strokePath2DList: Path2D[] = [];
  if (charData.strokes && charData.strokes.length > 0) {
    for (const strokeSvg of charData.strokes) {
      try {
        strokePath2DList.push(new Path2D(strokeSvg));
      } catch {
        // ignore
      }
    }
  }

  onProgress?.(30, 'Bắt đầu ghi hình nét bút thanh mảnh...');

  return new Promise((resolve, reject) => {
    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4500000 // 4.5 Mbps high clarity
      });

      const recordedChunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      const startTime = Date.now();

      recorder.onstop = () => {
        const videoBlob = new Blob(recordedChunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        const isMp4 = mimeType.includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        const cleanPinyin = (analysis.pinyin || 'char')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '_')
          .toLowerCase();
        const filename = `ZhongWenGo_Viet_chu_${character}_${cleanPinyin}.${ext}`;

        onProgress?.(100, 'Tạo video thành công!');
        resolve({
          blob: videoBlob,
          url: videoUrl,
          filename,
          character,
          durationMs: Date.now() - startTime
        });
      };

      recorder.start(100);

      /**
       * Renders complete canvas state at a specific point in time
       */
      const drawFrame = (
        currentStrokeIdx: number,
        currentProgress: number, // 0..1
        tipPt: [number, number] | null
      ) => {
        // Base Layout & Grid
        renderVideoFrameBase(
          ctx,
          width,
          height,
          character,
          analysis,
          gridX,
          gridY,
          gridSize,
          currentStrokeIdx,
          totalStrokes,
          strokeStyle
        );

        // 1. Draw Faint Background Outline (Nét mờ hướng dẫn)
        if (showFaintOutline && strokePath2DList.length === totalStrokes) {
          ctx.save();
          ctx.translate(gridX + padding, gridY + padding + (900 / 1024) * innerSize);
          ctx.scale(innerSize / 1024, -innerSize / 1024);
          ctx.fillStyle = 'rgba(203, 213, 225, 0.35)'; // Slate-300 faint
          for (const p2d of strokePath2DList) {
            ctx.fill(p2d);
          }
          ctx.restore();
        } else if (showFaintOutline) {
          // Draw faint medians if path2d not available
          for (let s = 0; s < totalStrokes; s++) {
            drawSmoothStroke(ctx, transformedMedians[s], baseStrokeWidth, 'rgba(203, 213, 225, 0.45)');
          }
        }

        // 2. Draw All Fully Completed Strokes (0 .. currentStrokeIdx - 1)
        for (let s = 0; s < currentStrokeIdx; s++) {
          const isRadical = highlightRadical && radStrokes.includes(s);
          const color = isRadical ? '#e11d48' : '#1e293b';

          if (strokeStyle === 'kaiti' && strokePath2DList[s]) {
            // Kaiti full fill
            ctx.save();
            ctx.translate(gridX + padding, gridY + padding + (900 / 1024) * innerSize);
            ctx.scale(innerSize / 1024, -innerSize / 1024);
            ctx.fillStyle = color;
            ctx.fill(strokePath2DList[s]);
            ctx.restore();
          } else {
            // Slender / Medium smooth pen stroke
            drawSmoothStroke(ctx, transformedMedians[s], baseStrokeWidth, color);
          }
        }

        // 3. Draw Current In-Progress Stroke
        if (currentStrokeIdx < totalStrokes) {
          const isRadical = highlightRadical && radStrokes.includes(currentStrokeIdx);
          const color = isRadical ? '#e11d48' : '#1e293b';
          const maxDist = strokeLengths[currentStrokeIdx];
          const currentDist = maxDist * currentProgress;

          const trimmed = getTrimmedPolyline(transformedMedians[currentStrokeIdx], currentDist);
          drawSmoothStroke(ctx, trimmed.points, baseStrokeWidth, color);

          const activeTip = trimmed.tip || tipPt;

          // 4. Draw Animated Pen Tip Indicator (Đầu bút chỉ dẫn)
          if (showPenTip && activeTip) {
            ctx.save();
            // Outer glow ring
            ctx.beginPath();
            ctx.arc(activeTip[0], activeTip[1], baseStrokeWidth * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = isRadical ? 'rgba(225, 29, 72, 0.25)' : 'rgba(79, 70, 229, 0.25)';
            ctx.fill();

            // Inner pen tip point
            ctx.beginPath();
            ctx.arc(activeTip[0], activeTip[1], Math.max(3.5, baseStrokeWidth * 0.55), 0, Math.PI * 2);
            ctx.fillStyle = isRadical ? '#e11d48' : '#4f46e5';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
      };

      // Execution Animation Timeline
      const runAnimationTimeline = async () => {
        // Phase 1: Intro hold (0.8s)
        const introFrames = 24;
        for (let i = 0; i < introFrames; i++) {
          drawFrame(0, 0, transformedMedians[0]?.[0] || null);
          await new Promise(r => setTimeout(r, 33));
        }

        // Phase 2: Animate each stroke progressively
        // Base duration per stroke inversely scaled with speed
        const strokeDurationMs = Math.max(250, Math.round(550 / speed));
        const framesPerStroke = Math.max(12, Math.round(strokeDurationMs / 33));

        for (let s = 0; s < totalStrokes; s++) {
          const progressPercent = Math.round(30 + ((s + 1) / totalStrokes) * 55);
          onProgress?.(progressPercent, `Ghi hình nét ${s + 1}/${totalStrokes}...`);

          for (let f = 1; f <= framesPerStroke; f++) {
            // Easing: ease-in-out for realistic pen stroke acceleration and deceleration
            const t = f / framesPerStroke;
            const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            drawFrame(s, Math.min(1, Math.max(0, easeT)), null);
            await new Promise(r => setTimeout(r, 33));
          }

          // Brief pause between strokes (140ms)
          for (let p = 0; p < 4; p++) {
            drawFrame(s + 1, 0, null);
            await new Promise(r => setTimeout(r, 33));
          }
        }

        // Phase 3: Outro hold with completed character (2.2s)
        onProgress?.(90, 'Hoàn tất các nét, đang đóng gói video...');
        for (let k = 0; k < 65; k++) {
          drawFrame(totalStrokes, 1, null);
          await new Promise(r => setTimeout(r, 33));
        }

        recorder.stop();
      };

      runAnimationTimeline().catch(timelineErr => {
        reject(timelineErr);
      });

    } catch (recErr: any) {
      reject(new Error(`Lỗi quay video: ${recErr?.message || recErr}`));
    }
  });
}

/**
 * Generates a high-resolution printable handwriting practice worksheet (A4 1200x1700 PNG)
 * with refined slender strokes and clear steps.
 */
export async function generateHandwritingWorksheet(
  character: string,
  analysis: CharacterAnalysisResult
): Promise<{ blob: Blob; url: string; filename: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1680;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể khởi tạo Canvas đồ họa.');
  }

  // Load HanziWriter character data for stroke order steps (cached for offline support)
  let charData: any = null;
  try {
    charData = await getCharacterStrokeData(character);
  } catch (err) {
    console.warn("Could not load full HanziWriter stroke data:", err);
  }

  // Background Paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1200, 1680);

  // Decorative border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 1140, 1620);

  // Header Banner
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(40, 40, 1120, 85);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PHIẾU LUYỆN VIẾT VÀ TẬP TÔ CHỮ HÁN', 600, 95);

  // Profile Card
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(50, 150, 1100, 220, 16);
  ctx.fill();
  ctx.stroke();

  // Big Main Character in Mi Zi Ge
  drawMiZiGeGrid(ctx, 80, 165, 190, '#dc2626', '#fca5a5');
  ctx.font = '150px "Kaiti", "STKaiti", "SimSun", "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character, 80 + 95, 165 + 95);

  // Character Metadata Text
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${character}  (${analysis.pinyin})`, 300, 205);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Âm Hán-Việt: ${analysis.sinoVietnamese || '—'}`, 300, 245);

  ctx.fillStyle = '#475569';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Nghĩa: ${analysis.vietnameseMeaning}`, 300, 285);

  const radStr = analysis.radicals?.[0]?.radical 
    ? `Bộ ${analysis.radicals[0].radical} (${analysis.radicals[0].sinoVietnamese})`
    : '—';

  ctx.fillStyle = '#e11d48';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Bộ thủ: ${radStr}  |  Tổng số nét: ${analysis.totalStrokes || '—'} nét`, 300, 325);

  // SECTION 1: THỨ TỰ TỪNG NÉT VIẾT (STROKE ORDER STEP-BY-STEP)
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('1. THỨ TỰ CÁC NÉT VIẾT (Bút thuận từng bước)', 60, 410);

  const strokesCount = charData?.medians?.length || charData?.strokes?.length || analysis.totalStrokes || 8;
  const stepBoxesPerRow = Math.min(8, strokesCount);
  const stepBoxSize = 110;
  const startX = 60;
  let currentY = 430;

  for (let s = 0; s < strokesCount; s++) {
    const col = s % stepBoxesPerRow;
    const row = Math.floor(s / stepBoxesPerRow);
    const boxX = startX + col * (stepBoxSize + 22);
    const boxY = currentY + row * (stepBoxSize + 40);

    drawMiZiGeGrid(ctx, boxX, boxY, stepBoxSize, '#ef4444', '#fee2e2');

    // Draw cumulative strokes cleanly
    if (charData?.medians) {
      const boxPadding = 12;
      const boxInner = stepBoxSize - boxPadding * 2;
      // Faint background of all strokes
      for (let k = 0; k < strokesCount; k++) {
        const medPts = charData.medians[k].map((pt: number[]) => 
          transformPoint([pt[0], pt[1]], boxX, boxY, boxInner, boxPadding)
        );
        drawSmoothStroke(ctx, medPts, 3, 'rgba(203, 213, 225, 0.45)');
      }
      // Highlight strokes 0..s
      for (let k = 0; k <= s; k++) {
        const medPts = charData.medians[k].map((pt: number[]) => 
          transformPoint([pt[0], pt[1]], boxX, boxY, boxInner, boxPadding)
        );
        const color = k === s ? '#e11d48' : '#1e293b';
        drawSmoothStroke(ctx, medPts, k === s ? 4.5 : 3.5, color);
      }
    } else {
      ctx.font = '85px "Kaiti", "STKaiti", "SimSun", "Noto Sans SC", sans-serif';
      ctx.fillStyle = s === strokesCount - 1 ? '#1e293b' : 'rgba(30, 41, 59, 0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(character, boxX + stepBoxSize / 2, boxY + stepBoxSize / 2 + 4);
    }

    // Step label
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(`Nét ${s + 1}`, boxX + stepBoxSize / 2, boxY + stepBoxSize + 22);
  }

  const rowsUsed = Math.ceil(strokesCount / stepBoxesPerRow);
  currentY += rowsUsed * (stepBoxSize + 40) + 20;

  // SECTION 2: TẬP TÔ NÉT MỜ (TRACING PRACTICE)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('2. TẬP TÔ THEO NÉT MỜ THANH MẢNH (8 ô)', 60, currentY);
  currentY += 20;

  const traceBoxSize = 115;
  for (let t = 0; t < 8; t++) {
    const bx = startX + t * (traceBoxSize + 18);
    drawMiZiGeGrid(ctx, bx, currentY, traceBoxSize, '#ef4444', '#fee2e2');

    // Faded character
    ctx.font = '90px "Kaiti", "STKaiti", "SimSun", "Noto Sans SC", sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(character, bx + traceBoxSize / 2, currentY + traceBoxSize / 2 + 5);
  }

  currentY += traceBoxSize + 40;

  // SECTION 3: TỰ LUYỆN VIẾT TRÊN Ô KẺ MỄ (FREE PRACTICE)
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('3. TỰ LUYỆN VIẾT TRONG Ô CHỮ MỄ (米字格)', 60, currentY);
  currentY += 20;

  const freeRows = 3;
  for (let r = 0; r < freeRows; r++) {
    for (let c = 0; c < 8; c++) {
      const bx = startX + c * (traceBoxSize + 18);
      const by = currentY + r * (traceBoxSize + 16);
      drawMiZiGeGrid(ctx, bx, by, traceBoxSize, '#ef4444', '#fee2e2');
    }
  }

  // Footer Note
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ZhongWenGo • Tự học & Luyện viết chữ Hán mỗi ngày • Chúc bạn học tốt!', 600, 1640);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Lỗi xuất phiếu học tập');
      }
      const url = URL.createObjectURL(blob);
      const cleanPinyin = (analysis.pinyin || 'char')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      const filename = `Phieu_tap_viet_${character}_${cleanPinyin}.png`;
      resolve({ blob, url, filename });
    }, 'image/png');
  });
}
