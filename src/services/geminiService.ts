import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface TranslationResult {
  chinese: string;
  pinyin: string;
  meaning: string;
  grammarExplanation: string;
}

export const translateAndExplain = async (text: string): Promise<TranslationResult> => {
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
