import OpenAI from 'openai';
import type { Room, TZForm } from './types';

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return new OpenAI({ apiKey });
}

function parseArea(area?: number) {
  if (typeof area !== 'number') return undefined;
  if (!Number.isFinite(area)) return undefined;
  const rounded = Math.round(area * 10) / 10;
  return rounded > 0 ? rounded : undefined;
}

function normalizeTotalArea(value?: number) {
  const parsed = parseArea(value);
  if (parsed === undefined) return undefined;
  if (parsed < 10 || parsed > 1000) return undefined;
  return parsed;
}

function getTopRooms(rooms: Room[]) {
  const withArea = rooms
    .map((room) => ({
      ...room,
      area: parseArea(room.area) ?? 0,
    }))
    .filter((room) => room.area > 0);

  const sorted = [...withArea].sort((a, b) => b.area - a.area);
  return sorted.slice(0, 3).map((room) => ({ name: room.name || room.kind, area: room.area }));
}

function compactStyleTags(form: TZForm) {
  const tags = Array.isArray(form.style?.tags) ? form.style.tags.filter(Boolean) : [];
  if (form.style?.extra?.trim()) tags.push(form.style.extra.trim());
  return tags.join(', ');
}

export function buildSummaryPayload(form: TZForm) {
  const totalArea = normalizeTotalArea(form.totalArea);
  const rooms = getTopRooms(Array.isArray(form.rooms) ? form.rooms : []);
  const priorities = Array.isArray(form.priorities) ? form.priorities.filter(Boolean).slice(0, 3) : [];

  return {
    housingType: form.housingType,
    finish: form.finish,
    totalArea,
    rooms,
    purpose: form.purpose,
    style: compactStyleTags(form),
    colors: form.style?.colors || undefined,
    materials: {
      walls: form.style?.walls || undefined,
      floors: form.style?.floors || undefined,
      doors: form.style?.doors || undefined,
    },
    important: form.requirements || undefined,
    antiWants: form.antiWants || undefined,
    priorities,
    budget: form.budget || undefined,
  };
}

export async function summarizeBrief(form: TZForm) {
  const systemPrompt =
    'Ты — опытный дизайнер интерьеров. Составь единый абзац до 1000 символов по данным клиента.';

  const summaryTemplate =
    'Собери краткое ТЗ до 1000 символов на основе JSON. Держи структуру:\n' +
    '[тип жилья], [общая площадь] м². Комнаты: [список с площадями].\n' +
    'Назначение: [purpose]. Стиль: [style], цвета: [colors].\n' +
    'Материалы: стены — [walls]; пол — [floors]; двери — [doors].\n' +
    'Важно: [important]; не хотим: [antiWants].\n' +
    'Приоритеты: [priorities]. Бюджет: [budget].\n' +
    'Пиши цельно, без маркированных списков.';

  const payload = buildSummaryPayload(form);
  const user = JSON.stringify({ template: summaryTemplate, data: payload }, null, 2);

  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
  });

  const text = (res.choices[0]?.message?.content ?? '').trim();
  return text.length > 1000 ? `${text.slice(0, 997)}...` : text;
}
