import { NextRequest, NextResponse } from 'next/server';
import { buildDocx } from '@/lib/docx';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { summary, title } = body || {};
  if (!summary) return NextResponse.json({ error: 'No summary' }, { status: 400 });
  const buffer = await buildDocx(summary, title ?? 'Краткое ТЗ');
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': ` + "`" + `attachment; filename="brief.docx"` + "`" + `,
    },
  });
}

