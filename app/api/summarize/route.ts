import { NextRequest, NextResponse } from 'next/server';
import { summarizeBrief } from '@/lib/openai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { answers } = body;
  if (!answers) return NextResponse.json({ error: 'No answers' }, { status: 400 });

  try {
    const summary = await summarizeBrief(answers);
    return NextResponse.json({ summary });
  } catch (e: any) {
    console.error('Error summarizing brief:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to summarize', stack: e?.stack },
      { status: 500 }
    );
  }
}
