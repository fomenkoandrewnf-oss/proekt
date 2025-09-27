import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const MAX_IMAGE_COUNT = 4;

type InlineImage = { mimeType: string; base64: string };

type GenerateRefsOptions = {
  prompts: string[];
  planImage?: InlineImage;
  apiKeyOverride?: string;
};

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

function clampCount(count: number) {
  const numeric = Number.isFinite(count) ? Math.floor(count) : 1;
  return Math.min(Math.max(numeric, 1), MAX_IMAGE_COUNT);
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

async function generateSingleImage(model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, prompt: string, image?: InlineImage) {
  const contents: any[] = [
    {
      role: 'user',
      parts: [
        ...(image
          ? [
              {
                inlineData: {
                  mimeType: image.mimeType,
                  data: image.base64,
                },
              },
            ]
          : []),
        { text: prompt },
      ],
    },
  ];

  const result = await model.generateContent({
    contents,
    generationConfig: { responseMimeType: 'image/png' },
  });

  const response = result?.response ?? result;
  const base64 = extractInlineData(response);
  if (base64) return base64;

  const blockReason = response?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked the request: ${blockReason}`);
  }

  throw new Error('Gemini image generation returned no image data');
}

export async function generateRoomRefs(options: GenerateRefsOptions) {
  const prompts = Array.isArray(options.prompts) ? options.prompts : [];
  if (!prompts.length) {
    throw new Error('No prompts provided for Gemini');
  }

  const count = clampCount(prompts.length);
  const apiKey = resolveApiKey(options.apiKeyOverride);
  const modelId = normalizeModelId(process.env.GEMINI_IMAGE_MODEL);

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: modelId });

  const selectedPrompts = prompts.slice(0, count);
  const images = await Promise.all(selectedPrompts.map((prompt) => generateSingleImage(model, prompt, options.planImage)));

  return images;
}
