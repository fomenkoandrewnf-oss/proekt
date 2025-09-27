// lib/gemini.ts — SDK: @google/genai
import { GoogleAI } from "@google/genai";

const API_KEY = process.env.GOOGLE_API_KEY!;
if (!API_KEY) throw new Error("Missing GOOGLE_API_KEY");

const IMAGE_MODEL = (process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash").trim();
const VISION_MODEL = (process.env.GEMINI_VISION_MODEL || IMAGE_MODEL).trim();

const MAX_IMAGE_COUNT = 4;

type InlineImage = { mimeType: string; base64: string };

const client = new GoogleAI({ apiKey: API_KEY });

// вытащить base64 PNG/JPEG из inlineData
function extractInlineImages(resp: any): string[] {
  const out: string[] = [];
  const candidates = Array.isArray(resp?.candidates) ? resp.candidates : [];
  for (const c of candidates) {
    const parts = c?.content?.parts || c?.parts || [];
    for (const p of parts) {
      const b64 = p?.inlineData?.data;
      const mt = p?.inlineData?.mimeType;
      if (typeof b64 === "string" && b64 && mt?.startsWith("image/")) {
        out.push(`data:${mt};base64,${b64}`);
      }
    }
  }
  return out;
}

function clamp(n: number) {
  const v = Number.isFinite(n) ? Math.floor(n) : 1;
  return Math.min(Math.max(v, 1), MAX_IMAGE_COUNT);
}

// --- 1) картинки по тексту (PNG через generateContent)
export async function generateTextOnlyImages(prompts: string[]) {
  const count = clamp(prompts.length);
  const selected = prompts.slice(0, count);
  const model = client.getGenerativeModel({ model: IMAGE_MODEL });

  const images: string[] = [];
  for (const prompt of selected) {
    const r = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "image/png" },
    });
    const arr = extractInlineImages(r.response ?? r);
    if (!arr.length) throw new Error("Gemini returned no image data");
    images.push(arr[0]);
  }
  return images;
}

// --- 2) план + площадь (vision)
export async function generateFromPlanAndArea(opts: {
  prompt: string; plan?: InlineImage; area?: number; variants?: number;
}) {
  const { prompt, plan, area, variants = 4 } = opts;
  const model = client.getGenerativeModel({ model: VISION_MODEL });

  const parts: any[] = [];
  if (plan?.base64) {
    parts.push({ inlineData: { mimeType: plan.mimeType || "image/png", data: plan.base64 } });
  }
  const visionPrompt = [
    "Роль: Senior interior concept artist.",
    area ? `Целевая площадь: ~${area} м² (±10%).` : "",
    "Используй вложенную планировку для пропорций и расстановки.",
    "Соблюдай проходы и масштаб.",
    `Сгенерируй ${Math.min(Math.max(variants, 1), 4)} варианта (A–D).`,
    "После изображений верни layout JSON (item, w, d, x, y, wall).",
    "",
    "ТЗ:", prompt,
  ].filter(Boolean).join("\n");
  parts.push({ text: visionPrompt });

  const r = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "image/png" },
  });

  const images = extractInlineImages(r.response ?? r);
  if (!images.length) throw new Error("Gemini vision returned no image data");
  return { images, raw: r.response };
}

// --- 3) обёртка под /api/refs ---
export async function generateRoomRefs(options: {
  prompts: string[]; planImage?: InlineImage; area?: number;
}) {
  if (options.planImage) {
    const first = await generateFromPlanAndArea({
      prompt: options.prompts[0],
      plan: options.planImage,
      area: options.area,
      variants: 1,
    });
    const restPrompts = options.prompts.slice(1);
    const rest = restPrompts.length ? await generateTextOnlyImages(restPrompts) : [];
    return [first.images[0], ...rest].slice(0, MAX_IMAGE_COUNT);
  }
  return await generateTextOnlyImages(options.prompts);
}

export type { InlineImage };
