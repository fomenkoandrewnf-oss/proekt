import OpenAI from 'openai';
import type { BriefFormData } from './types';

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

function parseArea(value: number | '' | string | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

export function buildSummaryPayload(form: BriefFormData) {
  const rooms = Array.isArray(form.rooms)
    ? form.rooms
        .filter((room) => room?.name?.trim())
        .map((room) => ({
          name: room.name.trim(),
          area: parseArea(room.area) ?? undefined,
        }))
    : [];

  const styleList = Array.isArray(form.styles) ? [...form.styles] : [];
  if (form.customStyle?.trim()) {
    styleList.push(form.customStyle.trim());
  }

  return {
    housing_type: form.housingType || undefined,
    finishing: form.finishing || undefined,
    total_area: parseArea(form.totalArea) ?? undefined,
    rooms,
    purpose: form.purpose || undefined,
    family: form.family || undefined,
    guests: form.guests || undefined,
    pets: form.pets || undefined,
    requirements: form.requirements || undefined,
    replanning: form.housingType === 'новостройка' ? form.replanning || undefined : undefined,
    manufacturers: form.housingType === 'новостройка' ? form.manufacturers || undefined : undefined,
    ready_made_items: form.readyMade || undefined,
    style: styleList.length ? styleList : undefined,
    color_scheme: form.colorScheme || undefined,
    wall_finish: form.wallFinish || undefined,
    floor_finish: form.floorFinish || undefined,
    doors: form.doors || undefined,
    other_requirements: form.other || undefined,
    dont_want: form.dontWant || undefined,
    plan_file: form.plan
      ? {
          id: form.plan.id,
          name: form.plan.originalName,
          mime: form.plan.mimeType,
        }
      : undefined,
  };
}

export async function summarizeBrief(form: BriefFormData) {
  const system = `Ты — опытный дизайнер интерьеров и менеджер проектов. Получи структурированные данные клиента и подготовь краткое ТЗ до 1000 символов. Обязательно упомяни тип жилья, отделку, общую площадь, ключевые комнаты, стиль, материалы и особые требования. Пиши по делу, списками или компактными предложениями. Строго ограничь ответ 1000 символами.`;

  const payload = buildSummaryPayload(form);
  const user = JSON.stringify(payload, null, 2);

  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.4,
  });

  const text = (res.choices[0]?.message?.content ?? '').trim();
  return text.length > 1000 ? `${text.slice(0, 997)}...` : text;
}
