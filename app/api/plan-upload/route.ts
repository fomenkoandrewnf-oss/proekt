import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { storePlanMeta, UPLOAD_DIR } from '@/lib/plans';
import type { UploadedPlanRecord } from '@/lib/types';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Файл не найден в запросе' }, { status: 400 });
  }

  const uploadFile = file as File;
  const arrayBuffer = await uploadFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = path.extname(uploadFile.name) || '';
  const id = `${Date.now()}-${randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, id);

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(filePath, buffer);

  const meta: UploadedPlanRecord = {
    id,
    filePath,
    originalName: uploadFile.name,
    size: buffer.length,
    mimeType: uploadFile.type || 'application/octet-stream',
    createdAt: new Date().toISOString(),
  };

  await storePlanMeta(meta);

  const previewUrl = meta.mimeType.startsWith('image/') ? `/api/plans/${id}` : undefined;

  return NextResponse.json({
    fileId: meta.id,
    previewUrl,
    originalName: meta.originalName,
    size: meta.size,
    mimeType: meta.mimeType,
  });
}
