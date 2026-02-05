import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Resource } from './types';

// @google/genai recommended decode function for base64
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// @google/genai recommended audio decoding logic for raw PCM data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const getSmartResourceRecommendations = async (userQuery: string, currentResources: Resource[]) => {
  try {
    // Fix: Instantiate GoogleGenAI right before the call to ensure it uses the latest configured API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    // Fix: Instantiate GoogleGenAI right before the call to ensure it uses the latest configured API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    // Fix: Instantiate GoogleGenAI right before the call to ensure it uses the latest configured API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    // Use mandatory audio decoding logic for raw PCM streams returned by the TTS model
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioCtx,
      24000,
      1,
    );

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    return source;
  } catch (error) {
    console.error("TTS error:", error);
    return null;
  }
};