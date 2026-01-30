import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Resource } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartResourceRecommendations = async (userQuery: string, currentResources: Resource[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User is searching for: "${userQuery}". Available library resources: ${JSON.stringify(currentResources)}. 
      Identify top 3 matches and return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  resourceId: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["resourceId", "reason"]
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"recommendations": []}');
  } catch (error) {
    console.error("Gemini recommendation error:", error);
    return { recommendations: [] };
  }
};

export const researchWithGrounding = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Provide a detailed academic answer to: ${query}. Use search to find current external resources.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No response generated.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
  } catch (error) {
    console.error("Grounding error:", error);
    return { text: "Error fetching external research nodes.", sources: [] };
  }
};

export const synthesizeSpeech = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read clearly and professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Decode and play using standard Web Audio API logic
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
    return source;
  } catch (error) {
    console.error("TTS error:", error);
    return null;
  }
};