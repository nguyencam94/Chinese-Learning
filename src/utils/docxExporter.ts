import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  ShadingType,
  VerticalAlign,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  convertInchesToTwip
} from 'docx';
import { TranslationResult } from '../services/geminiService';

export interface LessonDocxData extends TranslationResult {
  id?: string;
  originalText?: string;
  categoryName?: string;
  difficulty?: string;
  note?: string;
}

export interface ExportDocxOptions {
  title?: string;
  author?: string;
  topicName?: string;
  includeIllustrations?: boolean;
  includeVariations?: boolean;
  includeGrammar?: boolean;
  includePracticeGrid?: boolean;
  onProgress?: (percent: number, statusText: string) => void;
}

/**
 * Converts a data URL, SVG string, or web image URL into a Uint8Array PNG buffer for docx insertion.
 */
async function convertImageToPngBuffer(imageSource: string): Promise<Uint8Array | null> {
  if (!imageSource) return null;

  try {
    // If it's a raw SVG string, convert to data URL first
    let dataUrl = imageSource;
    if (imageSource.trim().startsWith('<svg') || imageSource.includes('<svg')) {
      const svgClean = imageSource.trim();
      const svgBase64 = btoa(unescape(encodeURIComponent(svgClean)));
      dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    }

    // Render image to canvas to ensure 16:9 PNG format
    return await new Promise<Uint8Array | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Standard 16:9 resolution for Word export (960 x 540)
        canvas.width = 960;
        canvas.height = 540;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 960, 540);

        // Draw image keeping 16:9 aspect ratio or cover
        ctx.drawImage(img, 0, 0, 960, 540);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(new Uint8Array(reader.result));
            } else {
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsArrayBuffer(blob);
        }, 'image/png');
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = dataUrl;
    });
  } catch (err) {
    console.warn("Failed to convert illustration image for docx:", err);
    return null;
  }
}

/**
 * Helper to generate a single lesson section in DOCX
 */
async function createLessonSection(
  lesson: LessonDocxData,
  index: number,
  options: ExportDocxOptions
): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [];
  const includeIllustrations = options.includeIllustrations !== false;
  const includeGrammar = options.includeGrammar !== false;
  const includeVariations = options.includeVariations !== false;
  const includePracticeGrid = options.includePracticeGrid !== false;

  // Lesson Header / Number
  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 180 },
      children: [
        new TextRun({
          text: `Bài ${index + 1}: ${lesson.meaning || lesson.chinese}`,
          bold: true,
          size: 28, // 14pt
          color: '047857', // Emerald-700
          font: 'Arial'
        }),
      ],
    })
  );

  // Big Chinese Character & Pinyin Box Table
  const pinyinText = lesson.pinyin || '';
  const chineseText = lesson.chinese || '';

  const charCardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: '10B981' },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: '10B981' },
      left: { style: BorderStyle.SINGLE, size: 24, color: '059669' }, // thick left accent
      right: { style: BorderStyle.SINGLE, size: 8, color: '10B981' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F0FDF4' }, // Emerald-50
            margins: { top: convertInchesToTwip(0.12), bottom: convertInchesToTwip(0.12), left: convertInchesToTwip(0.18), right: convertInchesToTwip(0.18) },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 60 },
                children: [
                  new TextRun({
                    text: chineseText,
                    bold: true,
                    size: 48, // 24pt
                    color: '1E293B',
                    font: 'Microsoft YaHei'
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: pinyinText ? `[ ${pinyinText} ]` : '',
                    italics: true,
                    size: 24, // 12pt
                    color: '059669',
                    font: 'Arial'
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 60 },
                children: [
                  new TextRun({
                    text: `Dịch nghĩa: ${lesson.meaning || '—'}`,
                    bold: true,
                    size: 22, // 11pt
                    color: '334155',
                    font: 'Arial'
                  }),
                ],
              }),
              ...(lesson.originalText ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [
                    new TextRun({
                      text: `(Văn bản gốc: ${lesson.originalText})`,
                      italics: true,
                      size: 18,
                      color: '64748B',
                      font: 'Arial'
                    }),
                  ],
                })
              ] : [])
            ],
          }),
        ],
      }),
    ],
  });
  elements.push(charCardTable);

  // 16:9 Illustration Image (if available & enabled)
  if (includeIllustrations && lesson.illustrationSvg) {
    const pngBuffer = await convertImageToPngBuffer(lesson.illustrationSvg);
    if (pngBuffer) {
      elements.push(
        new Paragraph({
          spacing: { before: 180, after: 80 },
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: pngBuffer,
              transformation: {
                width: 520,      // Word document content width
                height: 292.5,   // Exactly 16:9 aspect ratio! (520 * 9 / 16)
              },
              type: 'png',
            } as any),
          ],
        })
      );

      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 180 },
          children: [
            new TextRun({
              text: `Hình minh họa 16:9: Trực quan hóa bối cảnh "${chineseText}"`,
              italics: true,
              size: 18,
              color: '94A3B8',
              font: 'Arial'
            }),
          ],
        })
      );
    }
  }

  // Grammar & Vocabulary Breakdown Section
  if (includeGrammar && lesson.grammarExplanation) {
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: `Giải Thích Ngữ Pháp & Từ Vựng Chi Tiết:`,
            bold: true,
            size: 22,
            color: '1E293B',
            font: 'Arial'
          }),
        ],
      })
    );

    // Split markdown lines or bullet points
    const lines = lesson.grammarExplanation
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    for (const line of lines) {
      const cleanLine = line.replace(/^[*-•]\s*/, '').replace(/\*\*/g, '');
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({
              text: cleanLine,
              size: 20,
              color: '334155',
              font: 'Arial'
            }),
          ],
        })
      );
    }
  }

  // Variations (Mẫu câu biến thể)
  if (includeVariations && lesson.variations && lesson.variations.length > 0) {
    elements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: `Mẫu Câu Mở Rộng & Biến Thể (${lesson.variations.length} câu):`,
            bold: true,
            size: 22,
            color: '1E293B',
            font: 'Arial'
          }),
        ],
      })
    );

    const variationRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu Tiếng Trung', bold: true, size: 20, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Phiên Âm Pinyin', bold: true, size: 20, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Dịch Nghĩa Tiếng Việt', bold: true, size: 20, font: 'Arial' })] })],
          }),
        ],
      }),
      ...lesson.variations.map((v, vIdx) => {
        return new TableRow({
          children: [
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: vIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: v.chinese, bold: true, size: 20, color: '1E293B', font: 'Microsoft YaHei' })] })],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: vIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: v.pinyin, italics: true, size: 19, color: '059669', font: 'Arial' })] })],
            }),
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: vIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: v.meaning, size: 19, color: '475569', font: 'Arial' })] })],
            }),
          ],
        });
      }),
    ];

    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: variationRows,
      })
    );
  }

  // Student Practice Grid Section (Ô luyện viết tay)
  if (includePracticeGrid) {
    elements.push(
      new Paragraph({
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: `✍️ Góc Luyện Viết & Ghi Chú Của Học Viên:`,
            bold: true,
            size: 20,
            color: '64748B',
            font: 'Arial'
          }),
        ],
      })
    );

    // Empty practice lines box
    const practiceBox = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.DASHED, size: 6, color: 'CBD5E1' },
        bottom: { style: BorderStyle.DASHED, size: 6, color: 'CBD5E1' },
        left: { style: BorderStyle.DASHED, size: 6, color: 'CBD5E1' },
        right: { style: BorderStyle.DASHED, size: 6, color: 'CBD5E1' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              margins: { top: convertInchesToTwip(0.1), bottom: convertInchesToTwip(0.1), left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: lesson.note ? `Ghi chú cá nhân: ${lesson.note}` : 'Tự viết lại câu trên / Ghi nhớ ngữ pháp:',
                      italics: true,
                      size: 18,
                      color: '94A3B8',
                      font: 'Arial'
                    }),
                  ],
                }),
                new Paragraph({ text: '', spacing: { before: 120, after: 120 } }),
              ],
            }),
          ],
        }),
      ],
    });
    elements.push(practiceBox);
  }

  // Divider spacing between lessons
  elements.push(new Paragraph({ text: '', spacing: { before: 240, after: 240 } }));

  return elements;
}

/**
 * Exports single or multiple lessons as a Microsoft Word Document (.docx)
 */
export async function exportLessonsToDocx(
  lessons: LessonDocxData[],
  options: ExportDocxOptions = {}
): Promise<{ blob: Blob; filename: string }> {
  const {
    title = 'TÀI LIỆU BÀI HỌC TIẾNG TRUNG',
    author = 'ZhongWenGo - Học Tiếng Trung Chuyên Sâu',
    topicName = 'Chung',
    onProgress
  } = options;

  onProgress?.(10, 'Chuẩn bị dữ liệu bài học Word...');

  const docChildren: (Paragraph | Table)[] = [];

  // 1. Cover / Main Document Header
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 38, // 19pt
          color: '065F46', // Dark emerald
          font: 'Arial'
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({
          text: `Chủ đề: ${topicName}  |  Tổng số: ${lessons.length} bài học  |  Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
          bold: true,
          size: 20,
          color: '475569',
          font: 'Arial'
        }),
      ],
    })
  );

  // 2. Summary Table of all items
  if (lessons.length > 1) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 140, after: 100 },
        children: [
          new TextRun({
            text: 'MỤC LỤC TỔNG HỢP CÂU BÀI HỌC',
            bold: true,
            size: 24,
            color: '1E293B',
            font: 'Arial'
          }),
        ],
      })
    );

    const summaryTableRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: '059669' },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STT', bold: true, color: 'FFFFFF', size: 19, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: '059669' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Câu Tiếng Trung', bold: true, color: 'FFFFFF', size: 19, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 27, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: '059669' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Phiên Âm Pinyin', bold: true, color: 'FFFFFF', size: 19, font: 'Arial' })] })],
          }),
          new TableCell({
            width: { size: 27, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: '059669' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Dịch Nghĩa Tiếng Việt', bold: true, color: 'FFFFFF', size: 19, font: 'Arial' })] })],
          }),
        ],
      }),
      ...lessons.map((l, i) => {
        return new TableRow({
          children: [
            new TableCell({
              width: { size: 8, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${i + 1}`, bold: true, size: 18, color: '64748B', font: 'Arial' })] })],
            }),
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: l.chinese, bold: true, size: 20, color: '1E293B', font: 'Microsoft YaHei' })] })],
            }),
            new TableCell({
              width: { size: 27, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: l.pinyin, italics: true, size: 18, color: '059669', font: 'Arial' })] })],
            }),
            new TableCell({
              width: { size: 27, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? 'FFFFFF' : 'F8FAFC' },
              children: [new Paragraph({ children: [new TextRun({ text: l.meaning, size: 18, color: '334155', font: 'Arial' })] })],
            }),
          ],
        });
      }),
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: summaryTableRows,
      })
    );

    docChildren.push(new Paragraph({ text: '', spacing: { before: 240, after: 240 } }));
  }

  // 3. Process Each Lesson in Sequence
  for (let idx = 0; idx < lessons.length; idx++) {
    const progress = Math.round(20 + ((idx + 1) / lessons.length) * 70);
    onProgress?.(progress, `Đang xử lý bài ${idx + 1}/${lessons.length}: "${lessons[idx].chinese.slice(0, 10)}..."`);
    
    const lessonElements = await createLessonSection(lessons[idx], idx, options);
    docChildren.push(...lessonElements);
  }

  onProgress?.(95, 'Đang đóng gói file Word (.docx)...');

  // Build the complete Word Document
  const doc = new Document({
    title,
    creator: author,
    description: `Tài liệu bài học tiếng Trung trọn bộ gồm ${lessons.length} bài kèm hình ảnh minh họa 16:9 và giải thích ngữ pháp chi tiết.`,
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 20, // 10pt
            color: '334155',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'ZhongWenGo • Học Tiếng Trung Chuyên Sâu & Luyện Viết',
                    size: 16,
                    color: '94A3B8',
                    font: 'Arial'
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Trang ',
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    text: ' / ',
                    size: 16,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (lessons.length === 1 ? lessons[0].chinese : topicName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const filename = `ZhongWenGo_BaiHoc_${cleanTitle || 'TiengTrung'}.docx`;

  onProgress?.(100, 'Tải bài học thành công!');
  return { blob, filename };
}

/**
 * Exports a Single Character analysis into a comprehensive Word study guide (.docx)
 */
export async function exportSingleCharacterToDocx(
  analysis: any,
  options?: {
    onProgress?: (percent: number, statusText: string) => void;
  }
): Promise<{ blob: Blob; filename: string }> {
  const { onProgress } = options || {};
  onProgress?.(10, `Khởi tạo tài liệu Word cho chữ "${analysis.char}"...`);

  const docChildren: (Paragraph | Table)[] = [];

  // Header Banner
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: `TÀI LIỆU HỌC CHỮ HÁN: ${analysis.char} (${analysis.pinyin?.toUpperCase()} - ${analysis.sinoViet?.toUpperCase() || ''})`,
          bold: true,
          size: 28,
          color: '059669',
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Nghĩa: ${analysis.meaning} • Bộ thủ: ${analysis.radical?.char || ''} (${analysis.radical?.meaning || ''}) • Số nét: ${analysis.strokeCount || 0} nét`,
          color: '64748B',
          size: 20,
          italics: true,
          font: 'Arial',
        }),
      ],
    })
  );

  // Big Character Card & Info Table
  onProgress?.(30, 'Định dạng bảng thông tin chi tiết...');
  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: analysis.char,
                      size: 72, // 36pt
                      bold: true,
                      color: '065F46',
                      font: 'SimSun',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${analysis.pinyin} [${analysis.sinoViet || ''}]`,
                      bold: true,
                      size: 22,
                      color: '047857',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: '• Nghĩa gốc: ', bold: true, color: '1E293B', size: 20 }),
                    new TextRun({ text: analysis.meaning || '', size: 20, color: '334155' }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: '• Bộ thủ cấu thành: ', bold: true, color: '1E293B', size: 20 }),
                    new TextRun({ 
                      text: `${analysis.radical?.char || ''} (${analysis.radical?.pinyin || ''}) - ${analysis.radical?.meaning || ''}`, 
                      size: 20, 
                      color: '334155' 
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: '• Tổng số nét: ', bold: true, color: '1E293B', size: 20 }),
                    new TextRun({ text: `${analysis.strokeCount || 0} nét chuẩn quy tắc bút thuận`, size: 20, color: '334155' }),
                  ],
                }),
                ...(analysis.story ? [
                  new Paragraph({
                    spacing: { before: 100 },
                    children: [
                      new TextRun({ text: '• Câu chuyện / Chiết tự ghi nhớ: ', bold: true, color: 'D97706', size: 20 }),
                      new TextRun({ text: analysis.story, italics: true, size: 20, color: '4B5563' }),
                    ],
                  }),
                ] : []),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { before: 200, after: 100 } })
  );

  // Example Words Table
  if (analysis.examples && analysis.examples.length > 0) {
    onProgress?.(60, 'Định dạng từ vựng mở rộng & câu ví dụ...');
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: '📚 TỪ VỰNG GHÉP & CÂU VÍ DỤ MINH HỌA',
            bold: true,
            size: 22,
            color: '1E3A8A',
            font: 'Arial',
          }),
        ],
      })
    );

    const exampleRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Từ ghép', bold: true, color: '1E40AF', size: 20 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Pinyin & Hán Việt', bold: true, color: '1E40AF', size: 20 })] })],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Giải nghĩa & Câu ví dụ', bold: true, color: '1E40AF', size: 20 })] })],
          }),
        ],
      }),
    ];

    analysis.examples.forEach((ex: any, i: number) => {
      const isEven = i % 2 === 0;
      exampleRows.push(
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: isEven ? 'FFFFFF' : 'F8FAFC', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ex.word, bold: true, size: 24, color: '0F172A', font: 'SimSun' })],
                }),
              ],
            }),
            new TableCell({
              shading: { fill: isEven ? 'FFFFFF' : 'F8FAFC', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: ex.pinyin, bold: true, color: '0284C7', size: 18 }),
                    ...(ex.sinoViet ? [new TextRun({ text: ` [${ex.sinoViet}]`, color: '64748B', size: 18 })] : []),
                  ],
                }),
              ],
            }),
            new TableCell({
              shading: { fill: isEven ? 'FFFFFF' : 'F8FAFC', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: ex.meaning, bold: true, color: '065F46', size: 20 })],
                }),
                ...(ex.sentence ? [
                  new Paragraph({
                    spacing: { before: 60 },
                    children: [
                      new TextRun({ text: `VD: ${ex.sentence} `, font: 'SimSun', bold: true, size: 20, color: '334155' }),
                      new TextRun({ text: `(${ex.sentencePinyin || ''})`, size: 18, italics: true, color: '64748B' }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: `→ ${ex.sentenceMeaning || ''}`, size: 18, color: '475569' }),
                    ],
                  }),
                ] : []),
              ],
            }),
          ],
        })
      );
    });

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: exampleRows,
      }),
      new Paragraph({ text: '', spacing: { before: 200, after: 100 } })
    );
  }

  // Writing Practice Grid Table
  onProgress?.(80, 'Tạo khung ô kẻ tập viết...');
  docChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: `✍️ KHUNG Ô KẺ TẬP VIẾT CHỮ "${analysis.char}"`,
          bold: true,
          size: 22,
          color: '047857',
          font: 'Arial',
        }),
      ],
    })
  );

  const practiceGridRows: TableRow[] = [];
  for (let r = 0; r < 3; r++) {
    const cells: TableCell[] = [];
    for (let c = 0; c < 8; c++) {
      const isGuide = r === 0 && c < 2;
      cells.push(
        new TableCell({
          width: { size: 12.5, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.DASHED, size: 4, color: '94A3B8' },
            bottom: { style: BorderStyle.DASHED, size: 4, color: '94A3B8' },
            left: { style: BorderStyle.DASHED, size: 4, color: '94A3B8' },
            right: { style: BorderStyle.DASHED, size: 4, color: '94A3B8' },
          },
          shading: { fill: isGuide ? 'ECFDF5' : 'FFFFFF', type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
              children: [
                new TextRun({
                  text: isGuide ? analysis.char : ' ',
                  size: 36,
                  color: isGuide ? '059669' : 'E2E8F0',
                  font: 'SimSun',
                }),
              ],
            }),
          ],
        })
      );
    }
    practiceGridRows.push(new TableRow({ children: cells }));
  }

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: practiceGridRows,
    })
  );

  onProgress?.(95, 'Đang đóng gói file Word (.docx)...');

  const doc = new Document({
    title: `Học Chữ Hán - ${analysis.char}`,
    creator: 'ZhongWenGo',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `ZhongWenGo_ChuHan_${analysis.char}.docx`;
  onProgress?.(100, 'Tải tài liệu thành công!');
  return { blob, filename };
}
