import { NextRequest, NextResponse } from 'next/server';
import { summarizeBrief } from '@/lib/openai';
import { saveSubmission } from '@/lib/storage';
import type { BriefFormData } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const form = body?.form as BriefFormData | undefined;
  if (!form) return NextResponse.json({ error: 'No form data' }, { status: 400 });

  try {
    const summary = await summarizeBrief(form);
    await saveSubmission(form, summary, form.plan ?? undefined);
    return NextResponse.json({ summary });
  } catch (e: any) {
    console.error('Error summarizing brief:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to summarize', stack: e?.stack },
      { status: 500 }
    );
  }
}
