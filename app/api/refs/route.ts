import { NextRequest, NextResponse } from 'next/server';
import { generateRoomRefs } from '@/lib/gemini';
import type { BriefFormData } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, rooms = [], count = 4, form } = body || {};
  if (!brief) return NextResponse.json({ error: 'No brief' }, { status: 400 });

  const roomsArray = Array.isArray(rooms) ? rooms : [rooms];
  const selectedRoom = roomsArray
    .map((room) => (typeof room === 'string' ? room.trim() : ''))
    .filter(Boolean)[0] ?? 'помещение';
  const details: string[] = [];
  const formData = form as BriefFormData | undefined;
  if (formData?.housingType) details.push(`Тип жилья: ${formData.housingType}`);
  if (formData?.finishing) details.push(`Отделка: ${formData.finishing}`);
  if (Array.isArray(formData?.styles) && formData.styles.length) {
    details.push(`Стиль: ${formData.styles.join(', ')}`);
  }
  if (formData?.colorScheme) details.push(`Цветовая палитра: ${formData.colorScheme}`);
  if (formData?.plan?.originalName) {
    details.push(`На сервер загружена планировка: ${formData.plan.originalName}`);
  }
  const prompt = [
    `Фотореалистичный референс интерьера (${selectedRoom}) в стиле из ТЗ. Чистый ракурс, естественный свет, продвинутая композиция, высокий уровень отделки. Детали и палитра строго по ТЗ ниже.`,
    details.join('\n').trim(),
    '',
    'ТЗ:',
    brief,
  ].join('\n');

  try {
    const images = await generateRoomRefs(prompt, count);
    return NextResponse.json({ images });
  } catch (e: any) {
    console.error('Error generating room refs:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to generate images', stack: e?.stack },
      { status: 500 }
    );
  }
}
