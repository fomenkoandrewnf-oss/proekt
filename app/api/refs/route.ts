import { NextRequest, NextResponse } from 'next/server';
import { generateFromPlan, generateImages } from '@/lib/gemini';
import { getPlanBinary } from '@/lib/plans';
import type { RoomRefRequest } from '@/lib/types';

const MAX_VARIANTS = 4;

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
    constraints.hasScale ? 'На плане есть масштаб, сохраняй пропорции и реальные размеры.' : 'Масштаб неизвестен — ориентируйся по площади и пропорциям.',
    constraints.scaleNote ? `Примечание к масштабу: ${constraints.scaleNote}.` : '',
    'Сгенерируй 4 фотореалистичных варианта (A–D) одного помещения. Соблюдай проходы и логику жилого интерьера.',
  ]
    .filter(Boolean)
    .join(' ');
}

function coerceBase64(value: any) {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'object') {
    if (value.inlineData?.data) return value.inlineData.data.trim() || undefined;
    if (value.image?.inlineData?.data) return value.image.inlineData.data.trim() || undefined;
    if (value.b64_json) return String(value.b64_json).trim() || undefined;
    if (value.bytesBase64Encoded) return String(value.bytesBase64Encoded).trim() || undefined;
    if (Array.isArray(value.parts)) {
      for (const part of value.parts) {
        const nested = coerceBase64(part);
        if (nested) return nested;
      }
    }
  }
  return undefined;
}

function extractFromVision(response: any) {
  const result: string[] = [];
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
      : Array.isArray(candidate?.parts)
      ? candidate.parts
      : [];
    for (const part of parts) {
      const base64 = coerceBase64(part);
      if (base64) {
        result.push(base64);
      }
    }
  }
  return result;
}

function extractFromImagen(images: any) {
  const payload = Array.isArray(images) ? images : [];
  const result: string[] = [];
  for (const item of payload) {
    const base64 = coerceBase64(item) || coerceBase64(item?.image) || coerceBase64(item?.data);
    if (base64) {
      result.push(base64);
    }
  }
  return result;
}

function uniqueNonEmpty(images: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const image of images) {
    if (!image || seen.has(image)) continue;
    seen.add(image);
    result.push(image);
    if (result.length >= MAX_VARIANTS) break;
  }
  return result;
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
    const prompt = buildPrompt(normalizedPayload);

    if (payload.planFileId) {
      const planBinary = await getPlanBinary(payload.planFileId);
      if (!planBinary) {
        throw new Error('Файл планировки не найден');
      }

      const out = await generateFromPlan({
        planBytes: planBinary.buffer,
        planMime: planBinary.mimeType || 'image/png',
        area: normalizedPayload.room.area,
        prompt,
      });
      const images = uniqueNonEmpty(extractFromVision(out.response));
      if (!images.length) {
        throw new Error('Gemini не вернул изображения (vision)');
      }
      return NextResponse.json({
        images,
        meta: {
          via: 'vision',
          model: out.model,
          planAttached: true,
        },
      });
    }

    const out = await generateImages({ prompt });
    const images = uniqueNonEmpty(extractFromImagen(out.images));
    if (!images.length) {
      throw new Error('Gemini не вернул изображения (imagen)');
    }
    return NextResponse.json({
      images,
      meta: {
        via: 'imagen',
        model: out.model,
        planAttached: false,
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
