import { NextRequest, NextResponse } from 'next/server';
import { generateRoomRefs } from '@/lib/gemini';
import { getPlanBinary, preprocessPlanForGenAI } from '@/lib/plans';
import type { RoomRefRequest } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_VARIANTS = 4;
const VARIANT_HINTS = [
  'Сделай акцент на естественном освещении и мягкой палитре.',
  'Добавь выразительный акцентный цвет и арт-детали.',
  'Сфокусируйся на функциональности, хранении и проходах.',
  'Предложи смелую композицию со светом и мебелью.',
];

function clampVariants(value: number | undefined) {
  const n = Number.isFinite(value) ? Math.floor(value as number) : 0;
  if (!n) return 1;
  return Math.min(Math.max(n, 1), MAX_VARIANTS);
}

function buildPrompt({ room, style, materials, constraints }: RoomRefRequest) {
  const styleTags = style.tags.join(', ');
  return [
    `Комната: ${room.kind}${room.name ? ` (${room.name})` : ''}. Площадь ~${room.area} м² (допуск ±10%).`,
    styleTags ? `Стиль: ${styleTags}${style.extra ? `, ${style.extra}` : ''}.` : '',
    style.colors ? `Цвета: ${style.colors}.` : '',
    materials.walls ? `Стены: ${materials.walls}.` : '',
    materials.floors ? `Пол: ${materials.floors}.` : '',
    materials.doors ? `Двери: ${materials.doors}.` : '',
    room.notes ? `Особые требования: ${room.notes}.` : '',
    constraints.housingType ? `Тип жилья: ${constraints.housingType}.` : '',
    constraints.finish ? `Отделка: ${constraints.finish}.` : '',
    constraints.hasScale
      ? 'На плане есть масштаб — соблюдай реальные пропорции и ширину проходов.'
      : 'Масштаб точный неизвестен — соблюдай площади и логичную расстановку.',
    constraints.scaleNote ? `Примечание к масштабу: ${constraints.scaleNote}.` : '',
    'Сгенерируй фотореалистичные варианты для дизайн-проекта.',
  ]
    .filter(Boolean)
    .join(' ');
}

function generateRoomRefPrompts(base: string, count: number) {
  const total = clampVariants(count);
  return Array.from({ length: total }, (_, index) => {
    const hint = VARIANT_HINTS[index] ?? 'Предложи альтернативное решение в том же стиле.';
    const label = String.fromCharCode(65 + index);
    return `${base}\n\nВариант ${label}: ${hint}`;
  });
}

export async function POST(req: NextRequest) {
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

    const promptBase = buildPrompt(normalizedPayload);
    const prompts = generateRoomRefPrompts(promptBase, payload.count ?? MAX_VARIANTS);

    let planImage: { mimeType: string; base64: string } | undefined;
    if (payload.planFileId) {
      const planBinary = await getPlanBinary(payload.planFileId);
      if (!planBinary || !planBinary.buffer?.byteLength) {
        return NextResponse.json({ error: 'Файл планировки не найден' }, { status: 400 });
      }
      const compact = await preprocessPlanForGenAI(planBinary.buffer);
      planImage = { mimeType: compact.mimeType, base64: compact.base64 };
    }

    const images = await generateRoomRefs({
      prompts,
      planImage,
      area: normalizedPayload.room.area,
    });

    if (!images.length) {
      throw new Error('Gemini не вернул изображения');
    }

    const via = planImage ? 'vision' : 'text';

    return NextResponse.json({
      images,
      meta: {
        via,
        modelImage: (process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview').trim(),
        modelVision: (process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash-image-preview').trim(),
        planAttached: Boolean(planImage),
      },
    });
  } catch (error: any) {
    console.error('Error generating room refs:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Не удалось сгенерировать изображения', stack: error?.stack },
      { status: 500 },
    );
  }
}
