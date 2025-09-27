import { NextRequest, NextResponse } from 'next/server';
import { generateRoomRefs, type InlineImage } from '@/lib/gemini';
import { getPlanBinary } from '@/lib/plans';
import type { RoomRefRequest } from '@/lib/types';

const MAX_VARIANTS = 4;
const VARIANT_HINTS = [
  'Сделай акцент на естественном освещении и мягкой палитре.',
  'Добавь выразительный акцентный цвет и арт-детали.',
  'Сфокусируйся на функциональности, хранении и проходах.',
  'Предложи смелую композицию со светом и мебелью.',
];

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
  const total = Math.min(Math.max(Math.floor(count) || 1, 1), MAX_VARIANTS);
  return Array.from({ length: total }, (_, index) => {
    const hint = VARIANT_HINTS[index] ?? 'Предложи альтернативное решение в том же стиле.';
    const label = String.fromCharCode(65 + index);
    return `${base}\n\nВариант ${label}: ${hint}`;
  });
}

function stripDataUrl(image: string) {
  if (typeof image !== 'string') return '';
  const trimmed = image.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('data:image')) return trimmed;
  const [, base64] = trimmed.split(',', 2);
  return base64 || '';
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
    const prompts = generateRoomRefPrompts(promptBase, MAX_VARIANTS);

    let planImage: InlineImage | undefined;
    if (payload.planFileId) {
      const planBinary = await getPlanBinary(payload.planFileId);
      if (!planBinary) {
        throw new Error('Файл планировки не найден');
      }
      planImage = {
        mimeType: planBinary.mimeType || 'image/png',
        base64: planBinary.buffer.toString('base64'),
      };
    }

    const images = await generateRoomRefs({
      prompts,
      planImage,
      area: normalizedPayload.room.area,
    });

    const normalizedImages = images.map(stripDataUrl).filter(Boolean).slice(0, MAX_VARIANTS);
    if (!normalizedImages.length) {
      throw new Error('Gemini не вернул изображения');
    }

    const via = planImage ? 'vision' : 'text';
    const model = (planImage ? process.env.GEMINI_VISION_MODEL : process.env.GEMINI_IMAGE_MODEL) || 'gemini-2.0-flash';

    return NextResponse.json({
      images: normalizedImages,
      meta: {
        via,
        model: model.trim(),
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
