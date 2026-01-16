
import { GoogleGenAI, Modality } from "@google/genai";
import { JARVIS_SYSTEM_PROMPT } from "../constants";

export const generateJarvisResponseStream = async (
  prompt: string, 
  onChunk: (text: string) => void,
  history: { role: string; parts: { text: string }[] }[] = [],
  imageBuffer?: string
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contents: any[] = history.length > 0 ? [...history] : [];
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
      
      // Extract grounding metadata from the stream chunks
      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const newLinks = chunk.candidates[0].groundingMetadata.groundingChunks
          .filter((c: any) => c.web)
          .map((c: any) => ({
            title: c.web.title || "Reference Source",
            uri: c.web.uri
          }));
        links = [...links, ...newLinks];
      }
    }
    
    // Deduplicate links by URI
    const uniqueLinks = Array.from(new Map(links.map(item => [item.uri, item])).values());
    
    return { text: fullText, links: uniqueLinks };
  } catch (error: any) {
    console.error("Gemini Intel Error:", error);
    return { 
      text: `Sir Rezwan, it appears there is a temporary disruption in the global mainframe uplink. (Error: ${error.message || 'Unknown Protocol Failure'})`, 
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
