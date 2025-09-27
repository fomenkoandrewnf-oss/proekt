import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getPlanMeta, resolvePlanPath } from '@/lib/plans';

function detectMime(fileName?: string, fallback?: string) {
  if (fallback) return fallback;
  if (!fileName) return 'application/octet-stream';
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'Не указан идентификатор плана' }, { status: 400 });
  }

  try {
    const meta = await getPlanMeta(id);
    const filePath = meta?.filePath ?? (await resolvePlanPath(id));
    const buffer = await readFile(filePath);
    const mimeType = detectMime(meta?.originalName ?? filePath, meta?.mimeType);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('Failed to serve plan preview:', error);
    return NextResponse.json({ error: 'Не удалось загрузить план' }, { status: 404 });
  }
}
