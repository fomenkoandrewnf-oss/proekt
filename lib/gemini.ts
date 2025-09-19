import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-1.5-flash';

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: DEFAULT_IMAGE_MODEL });
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

export async function generateRoomRefs(prompt: string, count = 4) {
  const limitedCount = Math.min(Math.max(count, 1), 4);
  const model = getModel();

  const results: string[] = [];
  for (let i = 0; i < limitedCount; i += 1) {
    // Gemini currently возвращает одно изображение за запрос, поэтому вызываем модель несколько раз
    const image = await generateSingleImage(model, prompt);
    results.push(image);
  }

  return results;
}
