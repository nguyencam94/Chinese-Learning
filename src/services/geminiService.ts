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
