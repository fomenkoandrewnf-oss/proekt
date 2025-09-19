import OpenAI from 'openai';

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

export async function summarizeBrief(answers: any) {
  const system = `Ты — опытный дизайнер интерьеров и менеджер проектов. Сожми ответы клиента в краткое, структурированное ТЗ (макс. 1–2 страницы) с разделами: Общие данные, Стиль и атмосфера, Зонирование, Кухня‑гостиная, Спальня/детские/кабинет, Санузлы, Отделка, Технические требования, Ограничения/нельзя, Бюджет, Референсы. Пиши по делу, списками, без воды. Ответ не длиннее 1000 символов.`;

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

  return (res.choices[0]?.message?.content ?? '').trim();
}
