
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { JARVIS_SYSTEM_PROMPT } from "../constants";

export const generateJarvisResponseStream = async (
  prompt: string, 
  onChunk: (text: string) => void,
  history: { role: string; parts: { text: string }[] }[] = [],
  imageBuffer?: string
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents: any[] = history.length > 0 ? history : [];
    const currentParts: any[] = [{ text: prompt }];
    
    if (imageBuffer) {
      currentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBuffer.split(",")[1]
        }
      });
    }

    contents.push({ role: "user", parts: currentParts });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: JARVIS_SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.95,
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Reference Source",
        uri: chunk.web.uri
      }));

    if (text) {
      onChunk(text);
    }
    
    return { text: text || "Mainframe returned no data, Sir Rezwan.", links };
  } catch (error: any) {
    console.error("Gemini Intel Error:", error);
    return { 
      text: `I'm afraid the connection to the global intel network is currently unstable, Sir Rezwan. (Error: ${error.message || 'Unknown Network Interruption'})`, 
      links: [] 
    };
  }
};

export const speakJarvis = async (text: string) => {
  if (!text || text.trim().length === 0) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (err) {
    console.error("J.A.R.V.I.S. Vocal Processor Error:", err);
    return null;
  }
};
