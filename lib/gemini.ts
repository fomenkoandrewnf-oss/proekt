// lib/gemini.ts — @google/genai (image-preview, inlineData, ретраи)
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
});

const IMAGE_MODEL = (process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview").trim();
const VISION_MODEL = (process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash-image-preview").trim();

const MAX_IMAGE_COUNT = 4;

type InlineImage = { mimeType: string; base64: string };

function clamp(n: number) {
  const v = Number.isFinite(n) ? Math.floor(n) : 1;
  return Math.min(Math.max(v, 1), MAX_IMAGE_COUNT);
}

function extractInlineImages(resp: any): string[] {
  const out: string[] = [];
  const candidates = Array.isArray(resp?.candidates) ? resp.candidates : [];
  for (const c of candidates) {
    const parts = c?.content?.parts || c?.parts || [];
    for (const p of parts) {
      const b64 = p?.inlineData?.data;
      const mt = p?.inlineData?.mimeType || "image/png";
      if (typeof b64 === "string" && b64.trim()) {
        out.push(`data:${mt};base64,${b64}`);
      }
    }
  }
  return [...new Set(out)];
}

function explainNoImage(resp: any): string {
  const fb = resp?.promptFeedback;
  const block = fb?.blockReason;
  const text = resp?.candidates?.[0]?.content?.parts
    ?.map?.((p: any) => p?.text)
    ?.filter(Boolean)
    ?.join("\n");
  return [block ? `blockReason=${block}` : "", text ? `text="${text.slice(0, 160)}..."` : ""]
    .filter(Boolean)
    .join(" | ");
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3, backoff = 600) {
  let err: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      err = e;
      const msg = String(e?.message || "");
      const retriable =
        /UND_ERR_SOCKET|terminated|ECONNRESET|ETIMEDOUT|fetch failed|5\d{2}/i.test(msg) ||
        (e?.status && e.status >= 500);
      if (!retriable || i === tries - 1) break;
      await new Promise((resolve) => setTimeout(resolve, backoff * (i + 1)));
    }
  }
  throw err;
}

function buildImageOnlyPrompt(userPrompt: string) {
  return [
    "You are an image renderer.",
    "TASK: Generate ONE photorealistic reference IMAGE only.",
    "FORMAT: Return only an IMAGE (inlineData), no text, no captions.",
    "SIZE: square aspect (around 1024).",
    "CONTENT:",
    userPrompt,
  ].join("\n");
}

/** Текст → изображения (image-preview выдаёт inlineData без доп. конфигов) */
export async function generateTextOnlyImages(prompts: string[]) {
  const selected = prompts.slice(0, clamp(prompts.length));
  const images: string[] = [];

  for (const original of selected) {
    const tries = [
      buildImageOnlyPrompt(original),
      buildImageOnlyPrompt(`Return an image file only. No text. ${original}`),
    ];

    let got: string | null = null;
    let lastDiag = "";

    for (const p of tries) {
      const res = await withRetry(() =>
        ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: [{ role: "user", parts: [{ text: p }] }],
        }),
      );

      const arr = extractInlineImages(res);
      if (arr.length) {
        got = arr[0];
        break;
      }

      const txt = res?.candidates?.[0]?.content?.parts
        ?.map?.((pp: any) => pp?.text)
        ?.filter(Boolean)
        ?.join("\n");
      const block = res?.promptFeedback?.blockReason;
      lastDiag = [block ? `block=${block}` : "", txt ? `text="${txt.slice(0, 160)}..."` : ""]
        .filter(Boolean)
        .join(" | ");
    }

    if (!got) {
      throw new Error(`Gemini не вернул изображение: ${lastDiag || "no inlineData"}`);
    }
    images.push(got);
  }
  return images;
}

/** Планировка + площадь → изображения */
export async function generateFromPlanAndArea(opts: {
  prompt: string;
  plan?: InlineImage;
  area?: number;
  variants?: number;
}) {
  const { prompt, plan, area, variants = 4 } = opts;

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
    "",
    "ТЗ:",
    prompt,
  ]
    .filter(Boolean)
    .join("\n");
  parts.push({ text: visionPrompt });

  const res = await withRetry(() =>
    ai.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: "user", parts }],
    }),
  );

  const urls = extractInlineImages(res);
  if (!urls.length) {
    throw new Error(`Gemini vision не вернул изображение: ${explainNoImage(res) || "no inlineData"}`);
  }
  return { images: urls, raw: res };
}

/** Универсальная обёртка для /api/refs */
export async function generateRoomRefs(options: {
  prompts: string[];
  planImage?: InlineImage;
  area?: number;
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
