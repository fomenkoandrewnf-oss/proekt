import { GoogleGenerativeAI } from '@google/genai';

const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-1.5-flash';

type GeminiInstance = InstanceType<typeof GoogleGenerativeAI>;

type GeminiCtor = new (config: unknown) => GeminiInstance;

function createClient(apiKey: string) {
  const Ctor = GoogleGenerativeAI as unknown as GeminiCtor;

  try {
    const client = new Ctor({ apiKey });
    if (typeof client.getGenerativeModel === 'function') {
      return client;
    }
  } catch (error) {
    // fall back to legacy constructor signature accepting the raw key string
  }

  return new Ctor(apiKey);
}

function getModel(apiKeyOverride?: string | null) {
  const apiKey = (apiKeyOverride ?? process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const client = createClient(apiKey);
  const modelCandidates = Array.from(new Set([
    DEFAULT_IMAGE_MODEL,
    DEFAULT_IMAGE_MODEL.startsWith('models/')
      ? DEFAULT_IMAGE_MODEL.replace(/^models\//, '')
      : `models/${DEFAULT_IMAGE_MODEL}`,
  ]));

  let lastError: unknown;
  for (const modelName of modelCandidates) {
    try {
      return client.getGenerativeModel({ model: modelName });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini API: не удалось инициализировать модель');
}

async function generateSingleImage(model: ReturnType<typeof getModel>, prompt: string) {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }]}],
    generationConfig: { responseMimeType: 'image/png' },
  });

  const candidates = result.response.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? [];
    for (const part of parts) {
      const data = (part as any)?.inlineData?.data as string | undefined;
      if (data) {
        return data;
      }
    }
  }

  throw new Error('Gemini did not return image data');
}

export async function generateRoomRefs(prompt: string, count = 4, apiKeyOverride?: string | null) {
  const limitedCount = Math.min(Math.max(count, 1), 4);
  const model = getModel(apiKeyOverride);

  const results: string[] = [];
  for (let i = 0; i < limitedCount; i += 1) {
    // Gemini currently возвращает одно изображение за запрос, поэтому вызываем модель несколько раз
    const image = await generateSingleImage(model, prompt);
    results.push(image);
  }

  return results;
}
