import { NextRequest, NextResponse } from 'next/server';
import { generateRoomRefs } from '@/lib/openai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, rooms = [], count = 4 } = body || {};
  if (!brief) return NextResponse.json({ error: 'No brief' }, { status: 400 });

  const roomList = (rooms as string[]).length ? (rooms as string[]).join(', ') : 'квартира, кухня-гостиная, спальня';
  const prompt = [
    `Фотореалистичные референсы интерьеров (${roomList}) в стиле из ТЗ. Чистые ракурсы, естественный свет, продвинутая композиция, высокий уровень отделки. Детали и палитра строго по ТЗ ниже.`,
    '',
    'ТЗ:',
    brief,
  ].join('\n');

  try {
    const images = await generateRoomRefs(prompt, count);
    return NextResponse.json({ images });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to generate images' }, { status: 500 });
  }
}
