import { GoogleGenerativeAI } from '@google/genai';

const IMAGE_MODEL = (process.env.GEMINI_IMAGE_MODEL || 'imagen-3.0').trim();
const VISION_MODEL = (process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash').trim();
const MAX_VARIANTS = 4;

let cachedClient: GoogleGenerativeAI | null = null;
let cachedKey: string | null = null;

function resolveClient() {
  const key = (process.env.GOOGLE_API_KEY || '').trim();
  if (!key) {
    throw new Error('Missing GOOGLE_API_KEY');
  }
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new GoogleGenerativeAI({ apiKey: key });
    cachedKey = key;
  }
  return cachedClient;
}

function clampCount(n?: number) {
  const numeric = Number.isFinite(n) ? Math.floor(n as number) : MAX_VARIANTS;
  return Math.min(Math.max(numeric || 1, 1), MAX_VARIANTS);
}

function normalizeModelId(id: string) {
  const trimmed = id.trim();
  if (!trimmed) return id;
  return trimmed.startsWith('models/') ? trimmed.slice('models/'.length) : trimmed;
}

type GenerateRefsInput = {
  prompt: string;
  n?: number;
};

type GenerateFromPlanInput = {
  planBytes?: Buffer;
  planMime?: string;
  area?: number;
  prompt: string;
  n?: number;
};

export async function generateImages({ prompt, n = MAX_VARIANTS }: GenerateRefsInput) {
  const client = resolveClient();
  const modelName = normalizeModelId(IMAGE_MODEL);
  const model = client.getGenerativeModel({ model: modelName });
  const count = clampCount(n);

  // @google/genai exposes generateImage for Imagen 3
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- generateImage is available for Imagen models at runtime
  const response = await model.generateImage({ prompt, n: count, size: '1024x1024' });
  const images = Array.isArray(response?.images) ? response.images : Array.isArray(response) ? response : [];

  return { model: modelName, images };
}

export async function generateFromPlan({
  planBytes,
  planMime = 'image/png',
  area,
  prompt,
  n = MAX_VARIANTS,
}: GenerateFromPlanInput) {
  const client = resolveClient();
  const modelId = normalizeModelId(VISION_MODEL);
  const model = client.getGenerativeModel({ model: modelId });
  const count = clampCount(n);

  const parts: any[] = [];

  if (planBytes?.length) {
    parts.push({
      inlineData: {
        data: planBytes.toString('base64'),
        mimeType: planMime,
      },
    });
  }

  const visionPrompt = [
    'Роль: Senior interior concept artist.',
    count ? `Верни ${count} варианта (A–D).` : 'Верни 4 варианта (A–D).',
    area ? `Целевая площадь помещения: ~${area} м² (допуск ±10%).` : '',
    'Используй вложенную планировку для пропорций и расстановки мебели.',
    'Соблюдай масштаб, ширину проходов и размещение дверных/оконных проёмов.',
    'После изображения верни краткий layout JSON (позиции ключевых предметов).',
    '',
    'ТЗ:',
    prompt,
  ]
    .filter(Boolean)
    .join('\n');

  parts.push({ text: visionPrompt });

  const response = await model.generateContent(parts);

  return { model: modelId, response: response.response ?? response };
}

export type GenerateImagesResult = Awaited<ReturnType<typeof generateImages>>;
export type GenerateFromPlanResult = Awaited<ReturnType<typeof generateFromPlan>>;
