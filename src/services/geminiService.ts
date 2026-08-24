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
    Provide the Chinese characters, Pinyin, a detailed explanation in Vietnamese, and an exquisitely detailed, rich, multi-gradient SVG illustration depicting the realistic scene or meaning of the sentence.
    
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
            description: "A rich, highly detailed, responsive raw SVG illustration representing the realistic scene of the sentence in 16:9 widescreen proportion. It must start with <svg> and end with </svg>, viewBox '0 0 800 450', width='100%', height='100%', preserveAspectRatio='xMidYMid slice', with <defs> gradients, depth, realistic lighting, and layered elements. No markdown wrapper." 
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

export type IllustrationStyle = 'photorealistic' | '3d-cinematic' | 'chinese-art' | 'detailed-vector';

export const compressDataUrl = async (dataUrl: string, maxDimension = 960, quality = 0.88): Promise<string> => {
  if (typeof window === 'undefined' || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressed = canvas.toDataURL('image/webp', quality);
        if (compressed && compressed.startsWith('data:image/webp') && compressed.length < dataUrl.length) {
          resolve(compressed);
          return;
        }
      } catch {}
      const jpeg = canvas.toDataURL('image/jpeg', quality);
      resolve(jpeg.length < dataUrl.length ? jpeg : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const generateRealisticIllustration = async (
  chinese: string,
  meaning: string,
  style: IllustrationStyle = 'photorealistic'
): Promise<string> => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error("Chưa cấu hình API Key cho AI.");
  }

  let styleDesc = "";
  if (style === 'photorealistic') {
    styleDesc = "A hyper-realistic, vivid, ultra-detailed 8k photograph portraying the real-life setting or action of the sentence. Cinematic widescreen framing, soft ambient lighting, shallow depth of field, authentic environment, highly realistic textures, vivid true-to-life colors, award-winning photography.";
  } else if (style === '3d-cinematic') {
    styleDesc = "Breathtaking 3D digital art masterpiece, Pixar and Unreal Engine 5 aesthetic, cinematic 16:9 framing, volumetric lighting, rich material shaders, realistic 3D depth, ray-traced shadows, highly detailed and vibrant.";
  } else if (style === 'chinese-art') {
    styleDesc = "Traditional high-end Chinese watercolor and ink wash painting (Guohua) in widescreen panoramic format, delicate artistic brush strokes, misty mountains, poetic atmosphere, elegant classical Asian cultural aesthetics.";
  } else {
    styleDesc = "Highly detailed editorial vector illustration in 16:9 widescreen ratio with rich multi-stop gradients, ambient lighting, volumetric depth, and intricate background elements.";
  }

  // 1. Try direct AI Image Generation (gemini-3.1-flash-image)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: {
        parts: [
          {
            text: `Generate a stunning, highly realistic and visually rich 16:9 widescreen illustration for the Chinese sentence: "${chinese}" (Meaning: "${meaning}"). ${styleDesc} Expansive 16:9 widescreen composition, rich background detail, high clarity, no borders.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K",
        },
      },
    });

    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || "image/png";
          const rawDataUrl = `data:${mime};base64,${part.inlineData.data}`;
          return await compressDataUrl(rawDataUrl, 960, 0.88);
        }
      }
    }
  } catch (imgError) {
    console.warn("Direct image model generation returned fallback:", imgError);

    // 2. Try gemini-3.1-flash-lite-image
    try {
      const responseLite = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            {
              text: `Generate a realistic visual scene in 16:9 widescreen format representing "${chinese}" (${meaning}). ${styleDesc}`,
            },
          ],
        },
      });
      if (responseLite?.candidates?.[0]?.content?.parts) {
        for (const part of responseLite.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || "image/png";
            const rawDataUrl = `data:${mime};base64,${part.inlineData.data}`;
            return await compressDataUrl(rawDataUrl, 960, 0.88);
          }
        }
      }
    } catch (liteError) {
      console.warn("Lite image generation fallback:", liteError);
    }
  }

  // 3. Fallback: Ultra-detailed, realistic multi-gradient SVG with atmospheric depth in 16:9 ratio
  const svgPrompt = `Create a rich, multi-layered, visually detailed inline SVG illustration for the Chinese sentence: "${chinese}" (Meaning: "${meaning}").
  
  REALISM & DETAIL REQUIREMENTS:
  - Do NOT draw flat or childish stick figures or simple single-color shapes.
  - Create rich visual depth using <defs> with multiple <linearGradient> and <radialGradient> definitions to model realistic lighting, soft highlights, cast shadows, and depth of field.
  - Include realistic context details (such as detailed scenery, architectural elements, textures, sunlight/moonlight glares, natural foliage, or realistic props).
  - The SVG MUST have viewBox="0 0 800 450", width="100%", height="100%", preserveAspectRatio="xMidYMid slice" to fit a 16:9 widescreen layout perfectly.
  - Return ONLY raw SVG markup starting with "<svg" and ending with "</svg>". No markdown wrappers.`;

  const svgResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: svgPrompt,
  });

  let svg = svgResponse.text || "";
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

export const generateIllustrationSvg = async (chinese: string, meaning: string): Promise<string> => {
  return generateRealisticIllustration(chinese, meaning, 'photorealistic');
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


