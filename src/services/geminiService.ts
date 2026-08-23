import { GoogleGenAI, Type } from "@google/genai";

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    // Ưu tiên VITE_ prefix (chuẩn Vite cho Client) sau đó đến process.env (AI Studio)
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("LỖI: Thiếu GEMINI_API_KEY. Nếu bạn đang chạy trên Netlify/Vercel, hãy thêm VITE_GEMINI_API_KEY vào Environment Variables.");
      return null;
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export interface Variation {
  chinese: string;
  pinyin: string;
  meaning: string;
}

export interface TranslationResult {
  chinese: string;
  pinyin: string;
  meaning: string;
  grammarExplanation: string;
  illustrationSvg?: string;
  variations?: Variation[];
}

export const translateAndExplain = async (text: string): Promise<TranslationResult> => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error("Chưa cấu hình API Key cho AI. Vui lòng kiểm tra cài đặt môi trường.");
  }
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following Vietnamese sentence into Chinese (Simplified). 
    Provide the Chinese characters, Pinyin, a detailed explanation in Vietnamese, and a beautiful vector inline SVG illustration of the sentence.
    
    Additionally, provide 3 variations of the same sentence (e.g., negative, question, or adding emphasis) with their pinyin and meaning.
    
    IMPORTANT for "grammarExplanation":
    - Break down each word or grammar structure into its own distinct bullet point.
    - DO NOT lump everything into one paragraph.
    - Each bullet point MUST be followed by a double line break for maximum readability.
    - Use Markdown for bolding key terms.
    - Explain the usage and role of each component in the sentence.
    
    Sentence: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chinese: { type: Type.STRING, description: "The Chinese characters (Simplified)" },
          pinyin: { type: Type.STRING, description: "The Pinyin pronunciation" },
          meaning: { type: Type.STRING, description: "The meaning in Vietnamese" },
          grammarExplanation: { type: Type.STRING, description: "A detailed grammar and vocabulary breakdown in Vietnamese (Markdown format, one point per line)" },
          illustrationSvg: { 
            type: Type.STRING, 
            description: "A beautiful, self-contained responsive raw SVG illustration representing the sentence. It must start with <svg> and end with </svg>, viewBox '0 0 200 200', use flat minimalist 2D shapes with modern elegant pastel colors. No markdown wrapper like ```xml." 
          },
          variations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                chinese: { type: Type.STRING },
                pinyin: { type: Type.STRING },
                meaning: { type: Type.STRING },
              },
              required: ["chinese", "pinyin", "meaning"],
            },
            description: "3 variations of the original sentence",
          },
        },
        required: ["chinese", "pinyin", "meaning", "grammarExplanation", "illustrationSvg", "variations"],
      },
    },
  });

  const content = response.text;
  if (!content) throw new Error("No response from AI");
  
  const parsed = JSON.parse(content) as TranslationResult;
  // Clean markdown wrappers if any leaked in
  if (parsed.illustrationSvg) {
    let svg = parsed.illustrationSvg.trim();
    if (svg.startsWith("```xml")) {
      svg = svg.replace(/^```xml/, "").replace(/```$/, "");
    } else if (svg.startsWith("```svg")) {
      svg = svg.replace(/^```svg/, "").replace(/```$/, "");
    } else if (svg.startsWith("```")) {
      svg = svg.replace(/^```/, "").replace(/```$/, "");
    }
    parsed.illustrationSvg = svg.trim();
  }
  return parsed;
};

export const generateIllustrationSvg = async (chinese: string, meaning: string): Promise<string> => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error("Chưa cấu hình API Key cho AI.");
  }
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Write an inline SVG illustration for the Chinese sentence: "${chinese}" (Meaning: "${meaning}").
    
    GUIDELINES:
    - Draw a complete, beautiful self-contained SVG illustration representing the main literal or symbolic subject of the sentence (e.g. coffee cup for tea/coffee, sun/umbrella for weather, cute minimalist cartoon scenes, travel icons, books, etc.).
    - Keep it modern, clean, flat minimalist flat 2D style. Use soft pastel colors with gorgeous curves and nice shadows or gradient fills.
    - The SVG MUST have dimensions of a square viewBox (viewBox="0 0 200 200").
    - The SVG MUST be responsive (width="100%" height="100%").
    - Do NOT include any markdown code blocks, XML declarations, or html comments.
    - Start immediately with "<svg" and end with "</svg>".
    - Avoid complex shapes to keep the token size reasonable. Max size around 2000-3000 characters.`,
  });

  let svg = response.text || "";
  svg = svg.trim();
  if (svg.startsWith("```xml")) {
    svg = svg.replace(/^```xml/, "").replace(/```$/, "");
  } else if (svg.startsWith("```svg")) {
    svg = svg.replace(/^```svg/, "").replace(/```$/, "");
  } else if (svg.startsWith("```")) {
    svg = svg.replace(/^```/, "").replace(/```$/, "");
  }
  return svg.trim();
};

export const censorTargetWordTranslation = async (
  chineseSentence: string,
  vietnameseSentence: string,
  targetWord: string
): Promise<string> => {
  const ai = getGenAI();
  if (!ai) return vietnameseSentence;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Trong câu tiếng Trung: "${chineseSentence}"
Với bản dịch tiếng Việt tương ứng: "${vietnameseSentence}"
Hãy tìm phần nghĩa tiếng Việt tương ứng chính xác của từ hoặc cấu trúc ngữ pháp sau: "${targetWord}" trong câu dịch trên.
Sau đó, hãy che/ẩn phần nghĩa tiếng Việt đó đi bằng cách thay thế nó bằng cụm từ "[ ẩn ]" hoặc "[ ___ ]" trong câu tiếng Việt.
Chỉ trả về DUY NHẤT một câu tiếng Việt mới đã che nghĩa đó đi. Không viết thêm bất kỳ lời giải thích, tiêu đề hay ký tự đặc biệt nào khác.`,
    });
    return response.text?.trim() || vietnameseSentence;
  } catch (error) {
    console.error("Lỗi khi che nghĩa của từ:", error);
    return vietnameseSentence;
  }
};

export interface RadicalInfo {
  radical: string;
  pinyin: string;
  sinoVietnamese: string;
  meaning: string;
  description: string;
}

export interface CharacterAnalysisResult {
  character: string;
  pinyin: string;
  sinoVietnamese: string;
  vietnameseMeaning: string;
  totalStrokes: number;
  strokeSequenceInstructions: string[];
  radicals: RadicalInfo[];
  composition: string;
  examples: {
    word: string;
    pinyin: string;
    meaning: string;
  }[];
}

export const analyzeSingleCharacter = async (char: string): Promise<CharacterAnalysisResult> => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error("Chưa cấu hình API Key cho AI. Vui lòng kiểm tra cài đặt môi trường.");
  }
  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: `Hãy phân tích chi tiết chữ Hán đơn sau: "${char}".
    Yêu cầu trả về cấu trúc JSON chính xác theo mô tả sau:
    - character: Chữ Hán đó.
    - pinyin: Phiên âm Pinyin (có dấu giọng).
    - sinoVietnamese: Phiên âm Hán-Việt tương ứng.
    - vietnameseMeaning: Nghĩa tiếng Việt cốt lõi của chữ này.
    - totalStrokes: Tổng số nét viết của chữ.
    - strokeSequenceInstructions: Mảng các chuỗi mô tả từng nét viết theo thứ tự đúng quy tắc bút thuận (ví dụ: ["Nét 1: Phẩy từ trên xuống", "Nét 2: Ngang gập móc", ...]).
    - radicals: Mảng các bộ thủ cấu thành chữ này, mỗi phần tử gồm:
      - radical: Bộ thủ (ký tự chữ Hán).
      - pinyin: Pinyin của bộ thủ.
      - sinoVietnamese: Âm Hán-Việt của bộ thủ.
      - meaning: Nghĩa tiếng Việt của bộ thủ.
      - description: Mô tả vai trò, ý nghĩa biểu thị của bộ thủ đó trong chữ được phân tích.
    - composition: Giải nghĩa cấu tạo chữ (ví dụ: Chữ hội ý, gồm bộ Nhân đứng biểu thị người và bộ Thổ biểu thị đất..., cấu trúc Trái-Phải hay Trên-Dưới, mối quan hệ tượng hình/hội ý/hình thanh).
    - examples: 3 từ ghép thông dụng chứa chữ này cùng Pinyin và nghĩa tiếng Việt.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          character: { type: Type.STRING },
          pinyin: { type: Type.STRING },
          sinoVietnamese: { type: Type.STRING },
          vietnameseMeaning: { type: Type.STRING },
          totalStrokes: { type: Type.INTEGER },
          strokeSequenceInstructions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          radicals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                radical: { type: Type.STRING },
                pinyin: { type: Type.STRING },
                sinoVietnamese: { type: Type.STRING },
                meaning: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["radical", "pinyin", "sinoVietnamese", "meaning", "description"]
            }
          },
          composition: { type: Type.STRING },
          examples: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                pinyin: { type: Type.STRING },
                meaning: { type: Type.STRING }
              },
              required: ["word", "pinyin", "meaning"]
            }
          }
        },
        required: ["character", "pinyin", "sinoVietnamese", "vietnameseMeaning", "totalStrokes", "strokeSequenceInstructions", "radicals", "composition", "examples"]
      }
    }
  });

  const content = response.text;
  if (!content) throw new Error("Không nhận được phản hồi từ AI");
  return JSON.parse(content) as CharacterAnalysisResult;
};


