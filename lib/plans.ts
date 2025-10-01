import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import sharp from 'sharp';
import type { UploadedPlanRecord } from './types';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const META_FILE = path.join(UPLOAD_DIR, 'plans.json');

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function readMeta(): Promise<UploadedPlanRecord[]> {
  try {
    const raw = await readFile(META_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeMeta(records: UploadedPlanRecord[]) {
  await ensureUploadDir();
  await writeFile(META_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export async function storePlanMeta(record: UploadedPlanRecord) {
  const records = await readMeta();
  const filtered = records.filter((item) => item.id !== record.id);
  filtered.push(record);
  await writeMeta(filtered);
}

export async function getPlanMeta(id: string) {
  const records = await readMeta();
  return records.find((record) => record.id === id);
}

export async function resolvePlanPath(id: string) {
  await ensureUploadDir();
  return path.join(UPLOAD_DIR, id);
}

export async function readPlanAsBase64(id: string) {
  const filePath = await resolvePlanPath(id);
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

export async function readPlanBuffer(id: string) {
  const filePath = await resolvePlanPath(id);
  return readFile(filePath);
}

export async function getPlanBinary(id: string) {
  const meta = await getPlanMeta(id);
  if (!meta) return null;
  const buffer = await readPlanBuffer(id);
  return { buffer, mimeType: meta.mimeType };
}

export async function getPlanStats(id: string) {
  const filePath = await resolvePlanPath(id);
  const fileStat = await stat(filePath);
  return { filePath, size: fileStat.size };
}

export function streamPlan(id: string) {
  return createReadStream(path.join(UPLOAD_DIR, id));
}

export async function preprocessPlanForGenAI(
  input: Buffer,
): Promise<{ base64: string; mimeType: string; bytes: number }> {
  let img = sharp(input, { limitInputPixels: 268402689 });
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (Math.max(w, h) > 2048) {
    img = img.resize({
      width: w >= h ? 2048 : undefined,
      height: h > w ? 2048 : undefined,
      fit: 'inside',
    });
  }
  const out = await img.png({ compressionLevel: 9 }).toBuffer();
  return { base64: out.toString('base64'), mimeType: 'image/png', bytes: out.length };
}
