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
    Provide the Chinese characters, Pinyin, and a detailed explanation in Vietnamese.
    
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
        required: ["chinese", "pinyin", "meaning", "grammarExplanation", "variations"],
      },
    },
  });

  const content = response.text;
  if (!content) throw new Error("No response from AI");
  
  return JSON.parse(content) as TranslationResult;
};
