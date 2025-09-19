import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const MAX_IMAGE_COUNT = 4;

export function generateRoomRefPrompts(prompt: string, count: number) {
  const numericCount = Number.isFinite(count) ? Math.floor(count) : 1;
  const limitedCount = Math.min(Math.max(numericCount, 1), MAX_IMAGE_COUNT);
  return Array.from({ length: limitedCount }, () => prompt);
}

type GenerativeAIClient = InstanceType<typeof GoogleGenerativeAI>;
type GenerativeModel = ReturnType<GenerativeAIClient['getGenerativeModel']>;

function normalizeModelId(modelId?: string) {
  const trimmed = modelId?.trim();
  if (!trimmed) {
    return `models/${DEFAULT_IMAGE_MODEL}`;
  }
  return trimmed.startsWith('models/') ? trimmed : `models/${trimmed}`;
}

function resolveApiKey(apiKeyOverride?: string) {
  const key = (apiKeyOverride ?? process.env.GEMINI_API_KEY ?? '').trim();
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY');
  }
  return key;
}

function extractInlineData(response: any) {
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
      : Array.isArray(candidate?.parts)
      ? candidate.parts
      : [];
    for (const part of parts) {
      const data = part?.inlineData?.data;
      if (typeof data === 'string' && data.trim()) {
        return data;
      }
    }
  }
  return undefined;
}

async function generateImage(model: GenerativeModel, prompt: string) {
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: { responseMimeType: 'image/png' },
  });

  const response = result?.response ?? result;
  const base64 = extractInlineData(response);

  if (base64) {
    return base64;
  }

  const blockReason = response?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked the request: ${blockReason}`);
  }

  throw new Error('Gemini image generation returned no image data');
}

export async function generateRoomRefs(prompt: string, count = 4, apiKeyOverride?: string) {
  const apiKey = resolveApiKey(apiKeyOverride);
  const modelId = normalizeModelId(process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL);
  const prompts = generateRoomRefPrompts(prompt, count);

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: modelId });

  const images = await Promise.all(prompts.map((promptText) => generateImage(model, promptText)));

  return images;
}
