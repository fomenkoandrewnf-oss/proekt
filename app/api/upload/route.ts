import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const uploadFile = file as File;
  const buffer = Buffer.from(await uploadFile.arrayBuffer());
  const ext = path.extname(uploadFile.name) || '';
  const id = `${Date.now()}-${randomUUID()}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const targetPath = path.join(UPLOAD_DIR, id);

  await writeFile(targetPath, buffer);

  return NextResponse.json({
    id,
    originalName: uploadFile.name,
    size: buffer.length,
    mimeType: uploadFile.type,
    storedAt: targetPath,
  });
}
