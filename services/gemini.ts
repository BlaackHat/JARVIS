
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

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: JARVIS_SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.95,
        tools: [{ googleSearch: {} }]
      },
    });

    let fullText = "";
    let links: { title: string; uri: string }[] = [];

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
      
      // Extract grounding metadata if available in any chunk
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        const newLinks = groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
            title: c.web.title || "Reference Source",
            uri: c.web.uri
          }));
        links = [...links, ...newLinks];
      }
    }
    
    // Deduplicate links
    const uniqueLinks = Array.from(new Map(links.map(item => [item.uri, item])).values());
    
    return { text: fullText, links: uniqueLinks };
  } catch (error) {
    console.error("Gemini Intel Error:", error);
    return { 
      text: "I'm afraid the connection to the global mainframe is currently unstable, Sir Rezwan. Let's try again.", 
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

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData || null;
  } catch (err) {
    console.error("J.A.R.V.I.S. Vocal Processor Error:", err);
    return null;
  }
};
