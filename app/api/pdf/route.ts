import { NextRequest, NextResponse } from 'next/server';
import { buildPdf } from '@/lib/pdf';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { summary, title } = body || {};
  if (!summary) return NextResponse.json({ error: 'No summary' }, { status: 400 });
  try {
    const buffer = await buildPdf(summary, title ?? 'Краткое ТЗ');
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="brief.pdf"`,
      },
    });
  } catch (e: any) {
    console.error('Error building pdf:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to build pdf', stack: e?.stack },
      { status: 500 }
    );
  }
}
