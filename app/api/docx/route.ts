import { NextRequest, NextResponse } from 'next/server';
import { buildDocx } from '@/lib/docx';
import type { TZForm } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { summary, title, form } = body || {};
  if (!summary) return NextResponse.json({ error: 'No summary' }, { status: 400 });
  if (!form) return NextResponse.json({ error: 'No form data' }, { status: 400 });

  try {
    const buffer = await buildDocx(summary, form as TZForm, title ?? 'Краткое ТЗ');
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="brief.docx"`,
      },
    });
  } catch (e: any) {
    console.error('Error building docx:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to build docx', stack: e?.stack },
      { status: 500 }
    );
  }
}
