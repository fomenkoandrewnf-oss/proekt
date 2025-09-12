import OpenAI from 'openai';

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

export async function summarizeBrief(answers: any) {
  const system = `Ты — опытный дизайнер интерьеров и менеджер проектов. Сожми ответы клиента в краткое, структурированное ТЗ (макс. 1–2 страницы) с разделами: Общие данные, Стиль и атмосфера, Зонирование, Кухня‑гостиная, Спальня/детские/кабинет, Санузлы, Отделка, Технические требования, Ограничения/нельзя, Бюджет, Референсы. Пиши по делу, списками, без воды.`;

  const user = JSON.stringify(answers);

  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.4,
  });

  return res.choices[0]?.message?.content ?? '';
}

export async function generateRoomRefs(promptBase: string, count = 4) {
  // Generate reference images via Images API (returns base64 images)
  const client = getClient();
  const images = await client.images.generate({
    model: 'gpt-image-1',
    prompt: promptBase,
    size: '1024x1024',
    n: Math.min(Math.max(count, 1), 5)
  });
  return images.data.map((d) => d.b64_json);
}
