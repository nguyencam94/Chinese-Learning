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

export interface TranslationResult {
  chinese: string;
  pinyin: string;
  meaning: string;
  grammarExplanation: string;
}

export const translateAndExplain = async (text: string): Promise<TranslationResult> => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error("Chưa cấu hình API Key cho AI. Vui lòng kiểm tra cài đặt môi trường.");
  }
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following sentence into Chinese (Simplified). 
    Provide the Chinese characters, Pinyin, English meaning, and a DETAILED grammar explanation in Vietnamese (since I am a Vietnamese speaker).
    
    Sentence: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chinese: { type: Type.STRING, description: "The Chinese characters (Simplified)" },
          pinyin: { type: Type.STRING, description: "The Pinyin pronunciation" },
          meaning: { type: Type.STRING, description: "The English meaning of the sentence" },
          grammarExplanation: { type: Type.STRING, description: "A detailed grammar explanation in Vietnamese (Markdown format)" },
        },
        required: ["chinese", "pinyin", "meaning", "grammarExplanation"],
      },
    },
  });

  const content = response.text;
  if (!content) throw new Error("No response from AI");
  
  return JSON.parse(content) as TranslationResult;
};
