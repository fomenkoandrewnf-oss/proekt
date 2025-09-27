import { NextRequest, NextResponse } from 'next/server';
import { generateRoomRefs } from '@/lib/gemini';
import { getPlanMeta, readPlanAsBase64 } from '@/lib/plans';
import type { RoomRefRequest } from '@/lib/types';

const VARIANT_LABELS = ['A', 'B', 'C', 'D'];

function buildVisionPrompt(payload: RoomRefRequest, variant: string) {
  const { room, style, materials, constraints } = payload;
  const areaTarget = room.area ? `${room.area} м² (допуск ±10%)` : 'уточнить по плану';
  const styleLine = [style.tags.join(', '), style.extra?.trim()].filter(Boolean).join(', ');
  const notes = [room.notes, `Готовность: ${constraints.finish}`].filter(Boolean).join('. ');

  return [
    'Роль: Senior interior concept artist.',
    '',
    `Вариант ${variant}.`,
    'Входные данные:',
    `— Комната: ${room.kind}${room.name ? ` (${room.name})` : ''}.`,
    `— Целевая площадь: ${areaTarget}.`,
    constraints.hasScale ? '— На плане есть масштаб, использовать реальные размеры.' : '— Масштаб неизвестен, ориентируйся по площади.',
    constraints.scaleNote ? `— Масштаб/примечание: ${constraints.scaleNote}.` : null,
    `— Стиль: ${styleLine || 'как в ТЗ'}.`,
    style.colors ? `— Цвета: ${style.colors}.` : null,
    materials.walls ? `— Стены: ${materials.walls}.` : null,
    materials.floors ? `— Пол: ${materials.floors}.` : null,
    materials.doors ? `— Двери: ${materials.doors}.` : null,
    notes ? `— Особые требования: ${notes}.` : null,
    '',
    'Задача:',
    '1) Сгенерировать фотореалистичный референс комнаты, учитывая план и указанный стиль.',
    '2) Сохранять пропорции и проходы под жилой интерьер.',
    '3) Вернуть JSON-раскладку мебели и ключевых объектов.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function resolvePlanImage(planFileId?: string) {
  if (!planFileId) return undefined;
  const meta = await getPlanMeta(planFileId);
  if (!meta) return undefined;
  const base64 = await readPlanAsBase64(planFileId);
  return { mimeType: meta.mimeType, base64 };
}

export async function POST(req: NextRequest) {
  const overrideKey = req.headers.get('x-gemini-api-key') ?? undefined;
  const body = await req.json().catch(() => null);
  const payload = body as RoomRefRequest | null;

  if (!payload) {
    return NextResponse.json({ error: 'Нет данных для генерации' }, { status: 400 });
  }
  const numericArea = Number(payload.room?.area);
  if (!payload.room?.kind || !Number.isFinite(numericArea) || numericArea <= 0) {
    return NextResponse.json({ error: 'Не указаны параметры комнаты' }, { status: 400 });
  }

  try {
    const normalizedPayload: RoomRefRequest = {
      ...payload,
      room: { ...payload.room, area: numericArea },
    };
    const planImage = await resolvePlanImage(payload.planFileId);
    const prompts = VARIANT_LABELS.map((label) => buildVisionPrompt(normalizedPayload, label));
    const images = await generateRoomRefs({ prompts, planImage, apiKeyOverride: overrideKey });
    return NextResponse.json({
      images,
      meta: {
        planAttached: Boolean(planImage),
        variants: prompts.length,
      },
    });
  } catch (error: any) {
    console.error('Error generating room refs:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Не удалось сгенерировать изображения', stack: error?.stack },
      { status: 500 }
    );
  }
}
