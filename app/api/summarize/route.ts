import { NextRequest, NextResponse } from 'next/server';
import { summarizeBrief } from '@/lib/openai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { answers } = body;
  if (!answers) return NextResponse.json({ error: 'No answers' }, { status: 400 });

  try {
    const rawSummary = await summarizeBrief(answers);
    const trimmed = rawSummary.trim();
    const limited = trimmed.length > 1000
      ? `${trimmed.slice(0, 997).trimEnd()}...`
      : trimmed;
    return NextResponse.json({ summary: limited });
  } catch (e: any) {
    console.error('Error summarizing brief:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to summarize', stack: e?.stack },
      { status: 500 }
    );
  }
}
