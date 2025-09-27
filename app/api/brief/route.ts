import { NextRequest, NextResponse } from 'next/server';
import { summarizeBrief } from '@/lib/openai';
import { saveSubmission } from '@/lib/storage';
import type { TZForm } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const form = body?.form as TZForm | undefined;

  if (!form) {
    return NextResponse.json({ error: 'Отсутствуют данные формы' }, { status: 400 });
  }

  try {
    const summary = await summarizeBrief(form);
    await saveSubmission(form, summary, form.plan ?? undefined);
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error generating brief summary:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Не удалось собрать краткое ТЗ', stack: error?.stack },
      { status: 500 }
    );
  }
}
